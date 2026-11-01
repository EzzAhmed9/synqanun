'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Send, UserPlus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button, Field, Input, Modal, Select, Textarea } from '@/components/ui';
import type { ClientRole } from '@/fixtures/accounts';
import { inviteContactAction } from './invite-contact-action';

/**
 * "Invite a contact" — the firm's side of the client portal invitation, and the
 * last of BUILD_PLAN.md §3's Batch 6 flows.
 *
 * ===========================================================================
 * SENDING IS A CLEAR NO-OP, AND THE REAL INVITE FIXTURE IS WHY
 * ===========================================================================
 * This was flagged, before it was built, as the flow where BUILD_PLAN §5.1's
 * split would be genuinely awkward rather than obvious — because unlike every
 * other category-2 action in the product, a REAL invitation record already
 * exists here. fixtures/invites.ts carries a token and an expiry, and
 * /invite/client renders one. So the write looked available in a way it never
 * was for a signature request or an outgoing email.
 *
 * Having looked, it pushes the other way, and hard.
 *
 *   1. THE ROW IS THE ASSERTION. A new "Invited — not taken up" line does not
 *      say "the firm intends to add this person". It says AN EMAIL CARRYING A
 *      LINK TO PRIVILEGED FILES HAS GONE TO THIS ADDRESS. That is §5.1's
 *      category 2 exactly: the state asserts something left the building.
 *
 *   2. THE LINK WOULD NOT WORK, AND THAT IS THE BETTER OUTCOME. An invitation
 *      is only an invitation because of the URL in it. This build has one
 *      activation screen, reading one hard-coded token — and fixtures/invites.ts
 *      says in terms that Track A "never validates it". A session invitation
 *      would therefore be either a record with no reachable link, which is a
 *      pending row nobody can ever clear, or a reachable one — which would mean
 *      wiring an unauthenticated grant of portal access into a demo. The first
 *      is useless and the second is dangerous. Neither is worth a row.
 *
 *   3. THE PRODUCT ALREADY DECIDED THIS FROM THE OTHER DIRECTION. The client's
 *      own "Invite teammate" (app/[locale]/(client)/settings/InviteTeammateModal.tsx)
 *      is the same act seen from the other end and shipped as a clear no-op in
 *      Batch 3. Both mint the same kind of access to the same portal. If one
 *      wrote a pending row and the other did not, the product would disagree
 *      with itself about what inviting somebody does.
 *
 * NOTHING SPLITS OFF AS CATEGORY 1 EITHER. §5.1 says a flow that crosses the
 * line splits, so the obvious question is whether RECORDING the contact is an
 * internal write even if inviting them is not. It would be, if this product had
 * a directory of client contacts without portal access — but it does not, and
 * inventing one so that the button had something to write would be building a
 * feature to justify an animation. The list on this screen is "who can sign
 * in", the scope note says so, and a name on it is a login.
 *
 * ---------------------------------------------------------------------------
 * WHAT IS REAL: THE VALIDATION AND THE SCOPE
 * ---------------------------------------------------------------------------
 *   · The name must not be blank. The real endpoint needs one; an invitation
 *     addressed to nobody is not a thing the firm sends.
 *   · The address must be a well-formed email, checked loosely — see below.
 *   · THE ADDRESS MUST NOT ALREADY BE ON THIS CLIENT'S LIST. Worth having for
 *     the same reason the client-side modal gives: it is a real mistake, it is
 *     detectable from data the screen holds, and "already has access" and
 *     "invited and waiting" are different situations with different answers.
 *     `takenEmails` arrives scoped to this one client, so a person at another
 *     client is not a duplicate here.
 *
 * NOT CHECKED: the export's "Must match authorized corporate domain
 * @gulfholdings.ae". Third refusal of the same rule. A domain allow-list is a
 * plausible policy and this build has nowhere to configure one, so enforcing it
 * would mean inventing both the rule and the tenant setting behind it — and the
 * rule is wrong on its face: a client may perfectly well instruct through an
 * outside adviser or a seconded officer on another domain. The export makes the
 * point against itself — the first row of its own table is
 * elena.rostova@globalenergy.com, an address the rule it prints two panels away
 * would have refused.
 *
 * MOCK: replace with POST /api/clients/:id/contacts/invitations, which must
 * authorise the CALLER (nothing here does — ../permissions.ts draws the button
 * and the endpoint must check again), mint a single-use token with an expiry,
 * send the mail, and record who invited whom. fixtures/invites.ts already
 * models the token's shape for the firm's invitation to this client; the real
 * version issues exactly that. Track A.5, with the mail transport a Track B
 * integration (BUILD_PLAN.md §6).
 *
 * ---------------------------------------------------------------------------
 * NOT CARRIED OVER FROM THE STITCH EXPORT
 * ---------------------------------------------------------------------------
 *  · THE SIMULATED SUCCESS. `simulateInviteSubmit()` spins the button for 900ms,
 *    turns it green, says "تمت الدعوة بنجاح" / "Inviting…", and closes the
 *    dialog behind a row already sitting in the table reading "Just now · by
 *    Tariq Al-Mansoor". Second export this batch to ship a `setTimeout` success
 *    state, and the first to pre-write the result into the page beneath it.
 *  · A PREFILLED FORM — name, address and a whole personal message typed in as
 *    `value` on an empty dialog, including "please complete national identity
 *    verification and two-factor authentication to view the pleadings in case
 *    [MAT-2201]". Fourth export shipping a form pre-filled with somebody's data.
 *  · "Sends secure cryptographic onboarding invitations", "Enforces AES-256
 *    Vault Encryption & FIDO2 Dual-Factor Passkey verification", "Magic link
 *    expires in 72 hours", "تشفير كامل AES-256 • مصادقة ثنائية إلزامية",
 *    "ISO-27001". Nothing is encrypted, there is no second factor, there is no
 *    expiry policy, and no certification. The Arabic version also asks the
 *    invitee to complete "التحقق من الهوية الوطنية" — national ID verification,
 *    which this product neither performs nor is entitled to ask for.
 *  · THE PERMISSION MANIFESTS — "Full client portal administration, user
 *    invitations, invoice approval & settlement, and access to privileged
 *    filing disclosures" against "Full Governance", and a Member who "cannot
 *    sign fees or modify roster". Role enforcement does not run anywhere in
 *    Track A, so a capability list would describe access control that is not
 *    there. Each role is described by the one difference the record carries.
 *  · "Admin — recommended for directors", preselected. A dialog that defaults to
 *    the most privileged option and recommends it is how somebody fills in two
 *    fields, presses the red button, and hands over invoice authority. Same
 *    failure the Add Team Member form had until the rank default came out; here
 *    the roles are a two-item list, so `member` — the lesser — is the default.
 */

/**
 * Deliberately loose, and the same pattern the client-side modal uses. A
 * stricter one rejects addresses that are valid — quoted local parts, new TLDs,
 * plus-addressing — and the only authority on whether an address works is
 * whether mail reaches it. This catches the typo and leaves the rest to a
 * server that does not exist yet.
 */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface InviteContactModalProps {
  open: boolean;
  onClose: () => void;
  /** Addresses already on THIS client's list, lower-cased. */
  takenEmails: string[];
  clientId?: string;
}

export function InviteContactModal({ open, onClose, takenEmails, clientId }: InviteContactModalProps) {
  const router = useRouter();
  const t = useTranslations('clients.contacts.invite');
  // The role labels come from the TABLE's namespace rather than being written a
  // second time under the dialog's. A duplicate pair is a pair free to drift,
  // and what this <select> offers has to be the same words the row it would
  // create shows. They describe the access rather than naming a kind of person
  // — see the note on the table cell for why Arabic needs that.
  const tRole = useTranslations('clients.contacts.roles');

  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  // `member`, not `admin`. See the note on the export's preselected default.
  const [role, setRole] = React.useState<ClientRole>('member');
  const [note, setNote] = React.useState('');
  const [nameError, setNameError] = React.useState<string | null>(null);
  const [emailError, setEmailError] = React.useState<string | null>(null);
  const [attempted, setAttempted] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  // Reopening should not show the previous attempt's person or messages.
  React.useEffect(() => {
    if (open) return;
    setName('');
    setEmail('');
    setRole('member');
    setNote('');
    setNameError(null);
    setEmailError(null);
    setAttempted(false);
    setSubmitting(false);
  }, [open]);

  function submit(event: React.FormEvent) {
    // preventDefault, no action, no method. Without it this is a GET that puts
    // a named person's address — and whatever was typed in the note — into the
    // query string, where it stays in history and in any proxy log.
    event.preventDefault();

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    // Both checked before returning, so a form with two problems reports two
    // rather than one at a time.
    const nextName = trimmedName.length === 0 ? t('nameError') : null;
    let nextEmail: string | null = null;
    if (!EMAIL_PATTERN.test(trimmedEmail)) {
      nextEmail = t('emailError');
    } else if (takenEmails.includes(trimmedEmail.toLowerCase())) {
      nextEmail = t('duplicateError');
    }

    setNameError(nextName);
    setEmailError(nextEmail);

    if (nextName || nextEmail) {
      setAttempted(false);
      return;
    }

    if (clientId) {
      setSubmitting(true);
      inviteContactAction(clientId, {
        name: trimmedName,
        email: trimmedEmail,
        role,
        note: note.trim() || undefined,
      }).then((res) => {
        setSubmitting(false);
        if (res.ok) {
          onClose();
          router.refresh();
        } else {
          setAttempted(true);
        }
      }).catch(() => {
        setSubmitting(false);
        setAttempted(true);
      });
      return;
    }

    setAttempted(true);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('title')}
      description={t('description')}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('cancel')}
          </Button>
          {/*
            The one syn-red primary here. design.md §2: red is the human's own
            action.

            Disabled only while the dialog is UNTOUCHED. A live button over an
            empty form is an invitation to a validation message that did not
            need to exist — but requiring BOTH fields before the button wakes up
            is the other failure: it makes "you left the name blank" unreachable
            and answers a half-filled form with a dead control and no reason.
            Once something has been typed, pressing it says what is missing.
          */}
          <Button
            type="submit"
            form="invite-contact-form"
            variant="primary"
            disabled={(name.trim().length === 0 && email.trim().length === 0) || submitting}
            icon={<Send aria-hidden size={15} className="rtl:rotate-180" />}
          >
            {submitting ? '...' : t('submit')}
          </Button>
        </>
      }
    >
      <form id="invite-contact-form" onSubmit={submit} className="flex flex-col gap-5" noValidate>
        <Field
          htmlFor="invite-contact-name"
          label={t('nameLabel')}
          hint={t('nameHint')}
          error={nameError ?? undefined}
        >
          {/* No `latinValue`: a person's name may be in either script and must
              follow the interface direction, unlike an address. */}
          <Input
            id="invite-contact-name"
            invalid={Boolean(nameError)}
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setNameError(null);
              setAttempted(false);
            }}
            autoComplete="off"
          />
        </Field>

        <Field
          htmlFor="invite-contact-email"
          label={t('emailLabel')}
          hint={t('emailHint')}
          error={emailError ?? undefined}
        >
          {/* `latinValue` forces the VALUE to LTR while the label stays in the
              interface direction — an address is Latin in both locales and must
              not reorder around its dots and @ in an RTL form. */}
          <Input
            id="invite-contact-email"
            type="email"
            latinValue
            invalid={Boolean(emailError)}
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              setEmailError(null);
              setAttempted(false);
            }}
            placeholder="name@company.com"
            autoComplete="off"
          />
        </Field>

        <Field
          htmlFor="invite-contact-role"
          label={t('roleLabel')}
          hint={t(`roleHint.${role}`)}
        >
          <Select
            id="invite-contact-role"
            value={role}
            onChange={(event) => {
              setRole(event.target.value as ClientRole);
              setAttempted(false);
            }}
          >
            {/*
              Two roles, described by the ONE difference the record carries:
              whether they can manage who else has access. The hint under the
              field changes with the selection, rather than a permissions box
              listing capabilities this build does not enforce.

              Lesser first, and it is the default.
            */}
            <option value="member">{tRole('member')}</option>
            <option value="admin">{tRole('admin')}</option>
          </Select>
        </Field>

        <Field htmlFor="invite-contact-note" label={t('noteLabel')} hint={t('noteHint')}>
          <Textarea
            id="invite-contact-note"
            rows={2}
            value={note}
            onChange={(event) => {
              setNote(event.target.value);
              setAttempted(false);
            }}
            placeholder={t('notePlaceholder')}
          />
        </Field>

        {/* The clear no-op. Stated where the action was taken, naming what did
            not happen — including that the list behind the dialog has not
            moved, because that is the thing a reader would otherwise assume. */}
        {attempted ? (
          <p role="status" className="text-caption text-gray-600">
            {t('notSent')}
          </p>
        ) : null}
      </form>
    </Modal>
  );
}

/* ===========================================================================
 * Trigger
 * ======================================================================== */

export interface InviteContactButtonProps {
  label: string;
  takenEmails: string[];
  clientId?: string;
}

/**
 * The button that opens it.
 *
 * Exists because the contacts page is a Server Component and the open state has
 * to live on the client side of the boundary. Only strings cross it.
 *
 * Primary here, where the client-side equivalent is secondary: on the client's
 * settings screen the one red action is saving their own settings, and this is
 * the only action on this screen at all. design.md §4 spends red once per view.
 *
 * It is rendered only for a rank that may use it — absent, never disabled. See
 * ../../permissions.ts.
 */
export function InviteContactButton({ label, takenEmails, clientId }: InviteContactButtonProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <Button
        variant="primary"
        icon={<UserPlus aria-hidden size={15} />}
        onClick={() => setOpen(true)}
      >
        {label}
      </Button>

      <InviteContactModal
        open={open}
        onClose={() => setOpen(false)}
        takenEmails={takenEmails}
        clientId={clientId}
      />
    </>
  );
}

export default InviteContactModal;
