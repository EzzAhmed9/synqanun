'use client';

import * as React from 'react';
import { Send, UserRound } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button, Field, Input, Modal, Select, Textarea } from '@/components/ui';
import { usePortalEngagements } from '../ClientPortalChrome';

/**
 * "New message" — starting a conversation the firm has not started.
 *
 * The last of the client-side modals, and the only one with no Stitch export
 * behind it: the Messages export covered the thread list and the open
 * conversation, and both of its "New message" buttons led nowhere. This is
 * built from the kit and the decisions already made.
 *
 * ===========================================================================
 * A CLEAR NO-OP — AND WHY THAT IS NOT INCONSISTENT WITH SEND
 * ===========================================================================
 * This looks like a contradiction and is worth stating plainly, because the
 * composer two panes away does the OPPOSITE. Pressing Send inside an open
 * conversation appends the typed message to the stream, labelled "Not sent".
 * Pressing Send here adds nothing at all.
 *
 * The line between them is what the container is:
 *
 *   · THE COMPOSER ADDS TO SOMETHING THAT EXISTS. The thread is real, the firm
 *     really did write the messages above it, and the new bubble sits directly
 *     beneath them wearing a "Not sent" label. Its claim is scoped by a real
 *     conversation, and the qualifier is adjacent to the thing it qualifies —
 *     a reader cannot see the message without seeing that it did not go.
 *
 *   · THIS CREATES SOMETHING THAT DOES NOT EXIST. A new row in the thread list
 *     asserts that a conversation with the firm is now open about this matter.
 *     There is no real container to scope that claim, and the qualifier would
 *     have to live in two places at once — on the list row and inside the
 *     conversation — which is exactly how a caveat gets lost.
 *
 * And the failure modes are different. An unsent bubble is visibly unsent every
 * time the client looks at it. A fabricated thread is the upload failure again:
 * a client who believes they have raised something with their lawyers waits for
 * a reply that is not coming, and nothing on any screen later contradicts them.
 *
 * Same test as the other seven, same answer as five of them. The optimistic
 * echo was only ever available to the composer BECAUSE the thread was real.
 *
 * WHAT IS REAL
 * ---------------------------------------------------------------------------
 * The engagement list, and — the part worth having — WHO THE MESSAGE WOULD GO
 * TO. Selecting a matter names the fee earner who leads it, derived from the
 * record rather than fixed, exactly as the booking modal does. A client writing
 * to the firm should know which lawyer they are writing to before they type,
 * and that fact is real: it is the same `lead` the engagement detail shows.
 *
 * MOCK: replace with POST /api/threads, which must create the thread against
 * the authenticated client, route it to the engagement's assigned fee earner,
 * and notify them. Track A.5. Note the real endpoint also decides something
 * this modal cannot: whether a client may start a thread on an engagement that
 * has none, or only reply to one the firm opened. The portal assumes the former
 * because design.md gives this empty state a call to action; if the firm wants
 * the latter, this modal is where that rule lands.
 */

export interface NewMessageModalProps {
  open: boolean;
  onClose: () => void;
  /** Preselect the engagement — set when opened from a matter or project. */
  defaultEngagementRef?: string;
}

export function NewMessageModal({ open, onClose, defaultEngagementRef }: NewMessageModalProps) {
  const t = useTranslations('compose');
  const engagements = usePortalEngagements();

  const [engagement, setEngagement] = React.useState(defaultEngagementRef ?? '');
  const [subject, setSubject] = React.useState('');
  const [body, setBody] = React.useState('');
  const [engagementError, setEngagementError] = React.useState<string | null>(null);
  const [attempted, setAttempted] = React.useState(false);

  // Reopening should not show the previous attempt's text or messages. This
  // matters more here than on the other modals: what was typed is privileged
  // correspondence, and it should not survive a close.
  React.useEffect(() => {
    if (open) return;
    setEngagement(defaultEngagementRef ?? '');
    setSubject('');
    setBody('');
    setEngagementError(null);
    setAttempted(false);
  }, [open, defaultEngagementRef]);

  const selected = engagements.find((option) => option.reference === engagement);
  const ready = subject.trim().length > 0 && body.trim().length > 0;

  function submit(event: React.FormEvent) {
    // preventDefault, no action, no method. Without it this is a GET that puts
    // the subject and the body of a privileged message into the query string,
    // browser history and the next Referer header. The composer's note says the
    // same thing; it is the most important line in both files.
    event.preventDefault();

    if (!engagement) {
      setEngagementError(t('errorEngagement'));
      return;
    }

    setEngagementError(null);
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
          {/* The one syn-red primary here. design.md §2: red is the human's own
              action. Disabled until there is both a subject and something to
              say — a live button over an empty form invites a validation
              message that did not need to exist. */}
          <Button
            type="submit"
            form="new-message-form"
            variant="primary"
            disabled={!ready}
            icon={<Send aria-hidden size={15} className="rtl:rotate-180" />}
          >
            {t('submit')}
          </Button>
        </>
      }
    >
      <form id="new-message-form" onSubmit={submit} className="flex flex-col gap-5" noValidate>
        <Field
          htmlFor="compose-engagement"
          label={t('engagementLabel')}
          hint={t('engagementHint')}
          error={engagementError ?? undefined}
        >
          <Select
            id="compose-engagement"
            value={engagement}
            invalid={Boolean(engagementError)}
            onChange={(event) => {
              setEngagement(event.target.value);
              setEngagementError(null);
              setAttempted(false);
            }}
          >
            <option value="">{t('engagementPlaceholder')}</option>
            {engagements.map((option) => (
              <option key={option.reference} value={option.reference}>
                {option.reference} — {option.title}
              </option>
            ))}
          </Select>
        </Field>

        {/* Who it reaches, derived from the selection. Absent until an
            engagement is chosen rather than showing a placeholder lawyer —
            the same call the booking modal makes, and for the same reason. */}
        {selected ? (
          <div className="flex items-start gap-2.5 rounded-card border border-gray-200 bg-gray-50 p-3">
            <UserRound
              aria-hidden
              size={16}
              strokeWidth={1.8}
              className="mt-0.5 shrink-0 text-legal-navy"
            />
            <p className="text-caption text-gray-600">
              <span className="font-medium text-gray-700">{t('recipientLabel')}</span>{' '}
              {selected.lead.name} · {selected.lead.role}
            </p>
          </div>
        ) : null}

        <Field htmlFor="compose-subject" label={t('subjectLabel')}>
          <Input
            id="compose-subject"
            value={subject}
            onChange={(event) => {
              setSubject(event.target.value);
              setAttempted(false);
            }}
            placeholder={t('subjectPlaceholder')}
            autoComplete="off"
          />
        </Field>

        <Field htmlFor="compose-body" label={t('bodyLabel')}>
          <Textarea
            id="compose-body"
            rows={5}
            value={body}
            onChange={(event) => {
              setBody(event.target.value);
              setAttempted(false);
            }}
            placeholder={t('bodyPlaceholder')}
          />
        </Field>

        {/* The clear no-op, stated where the action was taken. It names what did
            not happen and what the client can do instead — and unlike the other
            modals there is no "message the firm" fallback to point at, because
            this IS that. So it points at the phone number on the engagement. */}
        {attempted ? (
          <p role="status" className="text-caption text-gray-600">
            {t('notSent')}
          </p>
        ) : null}
      </form>
    </Modal>
  );
}

export default NewMessageModal;
