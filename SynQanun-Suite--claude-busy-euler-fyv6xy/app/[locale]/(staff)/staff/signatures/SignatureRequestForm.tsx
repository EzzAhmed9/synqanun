'use client';

import * as React from 'react';
import { Send } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button, Card, Field, Select, Textarea } from '@/components/ui';
import type { SignatureField } from '@/fixtures/signatures';
import { useRouter } from '@/lib/i18n/navigation';
import { cn } from '@/lib/utils';
import { saveSignatureRequest } from './save-request-action';

/**
 * Prepare a signature request.
 *
 * BUILD_PLAN.md §3, Batch 6. No Stitch export for the staff side of this — the
 * one that arrived is the CLIENT's signing screen, which Batch 3 already built
 * and whose refusals are catalogued in
 * app/[locale]/(client)/documents/[id]/sign/page.tsx.
 *
 * ===========================================================================
 * WHAT SAVING ASSERTS, AND WHAT IT CAREFULLY DOES NOT
 * ===========================================================================
 * §5.1 category 1: the firm has decided who to ask and what to ask them for.
 * That is true the moment somebody decides it, and the record says so.
 *
 * It does NOT mark the document `awaitingSignature`. That status drives the
 * client's own signing screen, so setting it would put a document in front of a
 * client asking them to execute it — off the back of a form that sent nothing.
 * fixtures/signatures.ts calls that the worst false state available in this
 * product, and it is right: a fabricated invoice is a wrong number, while this
 * one is acted on BY SIGNING.
 *
 * Verified rather than asserted: a prepared request leaves the client's
 * document library and its signing screen exactly as they were.
 *
 * ===========================================================================
 * THERE IS NO FIELD PLACEMENT CANVAS
 * ===========================================================================
 * Every real e-signature tool drags signature boxes onto pages. This one cannot
 * and should not pretend to: there is no document body anywhere in this build —
 * Document Canvas argues it at length, and the client's signing screen refuses
 * to render an invented instrument for the same reason. A field placed at
 * coordinates on a document that does not exist is a coordinate on nothing, and
 * it would be the most convincing part of the screen.
 *
 * What the firm can say without the file is WHAT each person is being asked
 * for. So the fields are three checkboxes per signer, and where they go is a
 * question for the version with a provider behind it.
 *
 * ===========================================================================
 * SIGNERS COME FROM THE CLIENT'S ROSTER, NOT FROM A TEXT BOX
 * ===========================================================================
 * Only people who can already sign in to the portal the document lives in. A
 * free-text address would invent a route into a privileged file for somebody
 * nobody vetted, and it is exactly the shape the invite dialogs keep refusing.
 *
 * It has a visible consequence, deliberately left visible: four of the five
 * clients have nobody with portal access, so on their documents this screen has
 * nobody to offer and says so. That is the honest state of the fixtures rather
 * than a gap — and the fix for it is the invite flow, which is built.
 *
 * ===========================================================================
 * NOT CARRIED OVER FROM THE CLIENT-SIDE EXPORT
 * ===========================================================================
 * The staff side has no export of its own, but the client one arrived with this
 * batch and everything it claims would apply here too. None of it is here:
 * "SHA-256 Client Vault Authenticated", "Tamper-Proof Digital Seal", "SOC 2
 * Type II", a "Hash ID", an "Audit certificate #AQ-9402" that "has been
 * generated and archived", notarised copies distributed to all parties, a
 * "compliant with UAE Federal Law No. 46 of 2021" badge, and a cursive-font
 * rendering of a named person's signature on an instrument they never signed.
 *
 * The export also ships its success panel ALWAYS VISIBLE — the same screen
 * reads "Signature Pending" in the header and "Signature Verified • Signed on
 * 14 Mar 2025" in the sidebar. This form's confirmation appears only after a
 * request is actually prepared, and says what was not done.
 */

export interface SignatureRequestFormProps {
  documents: { id: string; label: string; engagementRef: string }[];
  documentId: string;
  contacts: { id: string; name: string; email: string }[];
  fields: readonly SignatureField[];
}

export function SignatureRequestForm({
  documents,
  documentId,
  contacts,
  fields,
}: SignatureRequestFormProps) {
  const t = useTranslations('signatureRequest');
  const router = useRouter();

  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const [prepared, setPrepared] = React.useState<{ signers: number } | null>(null);
  const [sendAttempted, setSendAttempted] = React.useState(false);

  /** contactId → the marks they are asked for. Absent means not a signer. */
  const [chosen, setChosen] = React.useState<Record<string, SignatureField[]>>({});
  const [note, setNote] = React.useState('');

  // Choosing a different document is a navigation, so the signer list comes
  // from the server. Reset on the DOCUMENT, not on the contacts array — the
  // lesson the invoice builder learned the hard way.
  React.useEffect(() => {
    setChosen({});
    setNote('');
    setError(null);
    setPrepared(null);
    setSendAttempted(false);
  }, [documentId]);

  const toggleSigner = (contactId: string) => {
    setChosen((current) => {
      const next = { ...current };
      if (next[contactId]) {
        delete next[contactId];
      } else {
        /*
          A new signer starts with SIGNATURE only, not with all three ticked.
          Asking somebody to initial every page and date it are separate
          requests with separate meanings, and pre-ticking them would send
          instructions nobody chose. Signature alone is what "please sign this"
          means, which makes it the floor rather than a convenience.
        */
        next[contactId] = ['signature'];
      }
      return next;
    });
    setError(null);
    setSendAttempted(false);
  };

  const toggleField = (contactId: string, field: SignatureField) => {
    setChosen((current) => {
      const existing = current[contactId];
      if (!existing) return current;
      const next = existing.includes(field)
        ? existing.filter((value) => value !== field)
        : [...existing, field];
      return { ...current, [contactId]: next };
    });
    setError(null);
    setSendAttempted(false);
  };

  const signerIds = Object.keys(chosen);
  const someoneHasNoField = signerIds.some((id) => chosen[id].length === 0);

  const submit = (event: React.FormEvent) => {
    // No action, no method. A covering note about an instrument is privileged.
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await saveSignatureRequest({
        documentId,
        signers: signerIds.map((id) => ({ contactId: id, fields: chosen[id] })),
        note,
      });

      if (result.ok) {
        setPrepared({ signers: result.request.signers.length });
        // The engagement record shows prepared requests; it is server-rendered.
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  };

  if (prepared) {
    return (
      <Card padding="lg">
        <h2 className="font-sans text-title text-gray-900">{t('done.title')}</h2>
        <p className="mt-1 text-caption text-gray-500">
          {t('done.signers', { count: prepared.signers })}
        </p>

        {/*
          The category 2 half. The second line is the one that matters most on
          this screen and it is stated as a fact about the client's side, not as
          a caveat about this one.
        */}
        <div className="mt-4 rounded-card border border-gray-300 bg-gray-100 p-4">
          <p className="text-caption font-medium text-gray-700">{t('done.scopeTitle')}</p>
          <p className="mt-1 text-caption text-gray-600">{t('done.notSent')}</p>
          <p className="mt-2 text-caption text-gray-600">{t('done.clientUnchanged')}</p>
          <p className="mt-2 text-caption text-gray-600">{t('done.session')}</p>
        </div>

        <div className="mt-4">
          <Button variant="secondary" size="md" onClick={() => router.refresh()}>
            {t('done.another')}
          </Button>
        </div>
      </Card>
    );
  }

  /*
    Nothing to send. The signer list ten lines below has handled its own empty
    case since Batch 6 — "there are no contacts, here is where you add one" —
    and the document picker above it did not, so a file with nothing shared on
    it gave a placeholder-only dropdown and no explanation of why the rest of
    the form never appeared. Same shape as the signers' empty state, and it
    points at the flow that fixes it.
  */
  if (documents.length === 0) {
    return (
      <Card padding="lg">
        <p className="text-body font-medium text-gray-700">{t('noDocuments.title')}</p>
        <p className="mt-1 text-caption text-gray-500">{t('noDocuments.body')}</p>
      </Card>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5">
      <Card padding="lg">
        <Field htmlFor="sig-document" label={t('documentLabel')} hint={t('documentHint')}>
          <Select
            id="sig-document"
            value={documentId}
            onChange={(event) => {
              const next = new URLSearchParams();
              if (event.target.value) next.set('document', event.target.value);
              router.replace(`/staff/signatures/new?${next.toString()}`);
            }}
          >
            <option value="">{t('documentPlaceholder')}</option>
            {documents.map((document) => (
              <option key={document.id} value={document.id}>
                {document.label}
              </option>
            ))}
          </Select>
        </Field>
      </Card>

      {documentId ? (
        <Card padding="none" className="overflow-hidden">
          <header className="border-b border-gray-200 p-5">
            <h2 className="font-sans text-title text-gray-900">{t('signers.heading')}</h2>
            <p className="mt-0.5 text-caption text-gray-500">{t('signers.caption')}</p>
          </header>

          {contacts.length === 0 ? (
            <div className="p-5">
              <p className="text-body text-gray-700">{t('signers.emptyTitle')}</p>
              {/* Points at the flow that fixes it, which is built. */}
              <p className="mt-1 text-caption text-gray-500">{t('signers.emptyBody')}</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {contacts.map((contact) => {
                const selected = chosen[contact.id];

                return (
                  <li key={contact.id} className="p-4">
                    <label className="flex cursor-pointer items-start gap-3">
                      <input
                        type="checkbox"
                        checked={Boolean(selected)}
                        onChange={() => toggleSigner(contact.id)}
                        className="mt-1 h-4 w-4 shrink-0 accent-action"
                      />
                      <span className="min-w-0">
                        <span className="block text-body text-gray-900">
                          <bdi>{contact.name}</bdi>
                        </span>
                        {/* Latin in every locale — lib/format.ts's rule. */}
                        <span dir="ltr" className="block text-start text-caption text-gray-500">
                          {contact.email}
                        </span>
                      </span>
                    </label>

                    {selected ? (
                      <div className="mt-3 flex flex-wrap gap-2 ps-7">
                        {fields.map((field) => {
                          const on = selected.includes(field);
                          return (
                            <label
                              key={field}
                              className={cn(
                                'flex cursor-pointer items-center gap-2 rounded-card border px-3 py-1.5 text-caption transition-colors',
                                on
                                  ? 'border-action bg-action/5 text-gray-900'
                                  : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                              )}
                            >
                              <input
                                type="checkbox"
                                checked={on}
                                onChange={() => toggleField(contact.id, field)}
                                className="h-3.5 w-3.5 accent-action"
                              />
                              {t(`fields.${field}`)}
                            </label>
                          );
                        })}
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      ) : null}

      {documentId && contacts.length > 0 ? (
        <Card padding="lg">
          <Field htmlFor="sig-note" label={t('noteLabel')} hint={t('noteHint')}>
            <Textarea
              id="sig-note"
              rows={2}
              value={note}
              onChange={(event) => {
                setNote(event.target.value);
                setSendAttempted(false);
              }}
              placeholder={t('notePlaceholder')}
            />
          </Field>
        </Card>
      ) : null}

      {error ? (
        <p role="alert" className="text-caption text-error">
          {t(`errors.${error}`)}
        </p>
      ) : null}

      {/* The no-op, stated where it was pressed. */}
      {sendAttempted ? (
        <p role="status" className="text-caption text-gray-600">
          {t('notSent')}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-xl text-caption text-gray-500">{t('beforeYouPrepare')}</p>
        <div className="flex flex-wrap gap-2">
          {/* Does nothing, and is secondary because of it — the button that
              works outranks the button that cannot. */}
          <Button
            variant="secondary"
            size="md"
            icon={<Send aria-hidden size={15} className="rtl:rotate-180" />}
            onClick={() => setSendAttempted(true)}
            disabled={signerIds.length === 0}
          >
            {t('send')}
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="md"
            loading={pending}
            disabled={!documentId || signerIds.length === 0 || someoneHasNoField}
          >
            {t('save')}
          </Button>
        </div>
      </div>
    </form>
  );
}

export default SignatureRequestForm;
