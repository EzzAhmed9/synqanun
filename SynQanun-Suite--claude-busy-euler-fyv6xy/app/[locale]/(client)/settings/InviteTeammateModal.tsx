'use client';

import * as React from 'react';
import { Send, UserPlus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button, Field, Input, Modal, Select, Textarea } from '@/components/ui';
import type { ClientRole } from '@/fixtures/accounts';

/**
 * "Invite teammate" — the last of the client-side modals, and the one the Team
 * panel has carried an inert button for since Batch 2.
 *
 * ===========================================================================
 * SENDING IS A CLEAR NO-OP
 * ===========================================================================
 * Eighth time the question has been asked. WHAT DOES THE STATE ASSERT?
 *
 * A new row in the team table asserts that AN EMAIL HAS GONE TO THIS PERSON
 * GRANTING THEM ACCESS TO YOUR PRIVILEGED LEGAL FILES.
 *
 * It fails in both directions at once, which none of the earlier cases did:
 *
 *   · If the client believes it worked, they stop following up. The colleague
 *     never receives anything, never gets access, and misses whatever they were
 *     brought in for. The row on screen says otherwise indefinitely.
 *
 *   · And an invitation is a SECURITY event. A pending row that looks real
 *     trains a demo audience — and a client — to treat "I added them" as
 *     settled, when granting access to a privileged workspace is exactly the
 *     kind of act that should be verifiable rather than assumed.
 *
 * So nothing is added to the table, no invitation is minted, and the notice
 * says so and points at Messages, which is built.
 *
 * WHAT IS REAL: THE VALIDATION
 * ---------------------------------------------------------------------------
 * Two checks, both genuinely performed rather than decorative.
 *
 *   1. The address has to be a well-formed email. Checked in the browser, with
 *      a MOCK note that the server must check it again.
 *
 *   2. THE ADDRESS MUST NOT ALREADY BE ON THE TEAM. This one is worth having:
 *      it is a real error a client makes, it is detectable from data the screen
 *      already holds, and it distinguishes "already has access" from "invited
 *      and waiting" — which are different situations with different answers.
 *
 * What is NOT checked is the export's "enterprise domain verification
 * (@gulfholdings.ae)". A domain allow-list is a plausible policy and this build
 * has nowhere to configure one, so enforcing it would mean inventing the rule
 * and the tenant setting behind it. See the MOCK note below.
 *
 * MOCK: replace with POST /api/team/invitations, which must verify the caller
 * is an admin (nothing here checks who is asking), mint a single-use token with
 * an expiry, send the mail, and record who invited whom for the audit log.
 * fixtures/invites.ts already models that shape for the firm's invitation to
 * this client; the real version reuses it in the other direction. Track A.5,
 * with the mail transport a Track B integration (BUILD_PLAN.md §6).
 *
 * ---------------------------------------------------------------------------
 * NOT CARRIED OVER FROM THE STITCH EXPORT
 * ---------------------------------------------------------------------------
 *  · A PREFILLED EMAIL ADDRESS — "karim.nasser@gulfholdings.ae" hardcoded into
 *    the input's `value`. Third time an export has shipped a form pre-filled
 *    with someone's data, after the plaintext password on Accept Invite and the
 *    card number and CVV on the payment panel.
 *  · "User invitations expire after 72 hours and require enterprise domain
 *    verification" and "Active seats: 3/10". An expiry policy, a domain rule
 *    and a seat licence, none of which exist anywhere in the model.
 *  · THE PERMISSION LIST — "Can review and sign designated corporate
 *    contracts", "Can exchange secure messages with assigned partner counsel",
 *    "View-only access to invoice summaries (cannot initiate wire transfers)".
 *    There is no role enforcement in this build at all, so a list of what each
 *    role may do would be describing access control that does not run. The two
 *    roles are described by the one difference the record actually carries.
 *  · "Previewing as: Admin (Full governance)" — a role switcher with nothing
 *    behind it, on a screen with no roles to switch between.
 *  · THE "GOVERNANCE BEHAVIOR NOTE" PANEL, which renders a specification
 *    annotation into the product: a dashed box explaining, to the end user,
 *    what the Member view would look like and citing "DESIGN.md §0 &
 *    Specification Rule". Design-document commentary is not interface copy.
 *    (The behaviour it describes — controls absent rather than disabled — is
 *    right, and is what the Team panel already does.)
 *  · "Client Trust Account #ADGM-9921" in the footer and "Client Vault ID:
 *    #ADGM-9921" in the banner. The escrow account, for the FIFTH time.
 *  · "Dual-factor verification active", "Secure Enclave", "Client Enclave",
 *    "v2.4 LTS" and the green status dot. There is no authentication in Track
 *    A, let alone a second factor.
 */

/**
 * Deliberately loose. A stricter pattern rejects addresses that are valid —
 * quoted local parts, new TLDs, plus-addressing — and the only authority on
 * whether an address works is whether mail reaches it. This catches the typo
 * ("name@", "name.example.com") and leaves the rest to the server.
 */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface InviteTeammateModalProps {
  open: boolean;
  onClose: () => void;
  /** Addresses already on the team, lower-cased — see the duplicate check. */
  existingEmails: string[];
}

export function InviteTeammateModal({ open, onClose, existingEmails }: InviteTeammateModalProps) {
  const t = useTranslations('invite');

  const [email, setEmail] = React.useState('');
  const [role, setRole] = React.useState<ClientRole>('member');
  const [note, setNote] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [attempted, setAttempted] = React.useState(false);

  // Reopening should not show the previous attempt's address or messages.
  React.useEffect(() => {
    if (open) return;
    setEmail('');
    setRole('member');
    setNote('');
    setError(null);
    setAttempted(false);
  }, [open]);

  function submit(event: React.FormEvent) {
    // preventDefault, no action, no method. Without it this is a GET that puts
    // a colleague's address — and whatever was typed in the note — into the
    // query string. Same omission the Client Gateway shipped with a password.
    event.preventDefault();

    const trimmed = email.trim();

    if (!EMAIL_PATTERN.test(trimmed)) {
      setError(t('errorEmail'));
      setAttempted(false);
      return;
    }

    if (existingEmails.includes(trimmed.toLowerCase())) {
      setError(t('errorDuplicate'));
      setAttempted(false);
      return;
    }

    setError(null);
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
            The one syn-red primary in this modal. design.md §2: red is the
            human's own action. Disabled until something has been typed — a live
            button over an empty field is an invitation to a validation message
            that did not need to exist.
          */}
          <Button
            type="submit"
            form="invite-teammate-form"
            variant="primary"
            disabled={email.trim().length === 0}
            icon={<Send aria-hidden size={15} className="rtl:rotate-180" />}
          >
            {t('submit')}
          </Button>
        </>
      }
    >
      <form id="invite-teammate-form" onSubmit={submit} className="flex flex-col gap-5" noValidate>
        <Field
          htmlFor="invite-email"
          label={t('emailLabel')}
          hint={t('emailHint')}
          error={error ?? undefined}
        >
          {/* `latinValue` forces the VALUE to LTR while the label stays in the
              interface direction — an address is Latin in both locales and must
              not reorder around its dots and @ in an RTL form. */}
          <Input
            id="invite-email"
            type="email"
            latinValue
            invalid={Boolean(error)}
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              setError(null);
              setAttempted(false);
            }}
            placeholder="name@company.com"
            autoComplete="off"
          />
        </Field>

        <Field htmlFor="invite-role" label={t('roleLabel')} hint={t(`roleHint.${role}`)}>
          <Select
            id="invite-role"
            value={role}
            onChange={(event) => {
              setRole(event.target.value as ClientRole);
              setAttempted(false);
            }}
          >
            {/*
              Two roles, described by the ONE difference the record carries:
              whether they can manage the team. The hint under the field changes
              with the selection rather than a separate permissions box listing
              capabilities this build does not enforce.
            */}
            <option value="member">{t('roles.member')}</option>
            <option value="admin">{t('roles.admin')}</option>
          </Select>
        </Field>

        <Field htmlFor="invite-note" label={t('noteLabel')} hint={t('noteHint')}>
          <Textarea
            id="invite-note"
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
            not happen and what to do instead. */}
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

export interface InviteTeammateButtonProps {
  label: string;
  existingEmails: string[];
}

/**
 * The button that opens it.
 *
 * Exists for the same reason <UploadDocumentButton> does: the settings page is
 * a Server Component, and the open state has to live on the client side of the
 * boundary. Only strings cross it.
 *
 * Secondary, not primary. The one syn-red action a client takes on the settings
 * screen is saving their own settings; adding a colleague is rarer and more
 * consequential, and design.md §4 spends red once per view.
 */
export function InviteTeammateButton({ label, existingEmails }: InviteTeammateButtonProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <Button
        variant="secondary"
        icon={<UserPlus aria-hidden size={15} />}
        onClick={() => setOpen(true)}
      >
        {label}
      </Button>

      <InviteTeammateModal
        open={open}
        onClose={() => setOpen(false)}
        existingEmails={existingEmails}
      />
    </>
  );
}

export default InviteTeammateModal;
