'use client';

import * as React from 'react';
import { PenLine, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button, Checkbox, Field, Input } from '@/components/ui';

/**
 * The signature-capture panel on the review-and-sign screen.
 *
 * ===========================================================================
 * SIGNING IS A CLEAR NO-OP, AND THIS IS THE LEAST CLOSE CALL OF ALL OF THEM
 * ===========================================================================
 * The seventh time the question has been asked, and the only one where the
 * answer was never in doubt. WHAT DOES THE STATE ASSERT?
 *
 *   · An echoed message asserts the interface received your words → shown.
 *   · A read notification asserts you have seen it → shown.
 *   · A payment receipt asserts money moved → refused.
 *   · A saved setting asserts the system will remember → refused.
 *   · A documents row asserts the firm has your file → refused.
 *   · A confirmed booking asserts a lawyer committed an hour → refused.
 *   · A SIGNATURE ASSERTS THAT YOU HAVE EXECUTED A BINDING INSTRUMENT.
 *
 * Every earlier item on that list is a claim about a fact. This one is not a
 * claim about anything — IT IS THE ACT ITSELF. A signature is not a record that
 * something happened; it is the thing that makes it happen. There is no version
 * of "optimistically show it as signed" that is merely premature, because the
 * only content of the state is the legal effect it does not have.
 *
 * And it fails further out than any of the others. A client who believes they
 * have executed a board resolution stops chasing it, holds the transaction as
 * done, and may tell a counterparty so. The firm does not know. The
 * counterparty does not know. Nothing on any screen would later contradict any
 * of them.
 *
 * So `sign()` records nothing, changes no status, and the document does not
 * appear as signed anywhere afterwards — which answers the question put to me
 * directly: no, a signed document must not show as signed in the library. That
 * row is read by the dashboard card, the notifications feed and global search,
 * and a false "signed" would propagate to all three.
 *
 * WHAT IS REAL HERE
 * ---------------------------------------------------------------------------
 * The same split the upload modal drew. Typing your name is real, and the
 * rendered preview is genuinely your input rather than a fixture. The consent
 * checkbox is real and required. The button is disabled until both are present,
 * because an enabled control over an empty form is an invitation to a
 * validation message that did not need to exist. Only the execution is absent,
 * and the notice says exactly that.
 *
 * MOCK: replace with POST /api/documents/:id/signature, which must bind the
 * signature to an authenticated identity (nothing here knows who is typing),
 * record the time from the SERVER's clock rather than the browser's, store the
 * document's hash as signed so a later edit is detectable, and produce a
 * certificate the client can keep. Route and storage are Track A.5; the
 * e-signature provider that gives the signature a legal basis is Track B
 * (BUILD_PLAN.md §6), and until it exists no screen may describe a signature as
 * binding, verified, certified or compliant with any statute.
 */

export interface SignaturePanelProps {
  /** Pre-filled from the signed-in account, and editable. */
  defaultName: string;
}

export function SignaturePanel({ defaultName }: SignaturePanelProps) {
  const t = useTranslations('sign');

  const [name, setName] = React.useState(defaultName);
  const [consented, setConsented] = React.useState(false);
  const [attempted, setAttempted] = React.useState<'sign' | 'decline' | null>(null);

  const typed = name.trim();
  const ready = typed.length > 0 && consented;

  function submit(event: React.FormEvent) {
    // preventDefault, no action, no method. Without it this is a GET that puts
    // the client's legal name in the query string of a URL naming a privileged
    // document — the Client Gateway's password mistake, on a worse field.
    event.preventDefault();
    setAttempted('sign');
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
      <Field htmlFor="signature-name" label={t('nameLabel')} hint={t('nameHint')}>
        <Input
          id="signature-name"
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            setAttempted(null);
          }}
          autoComplete="off"
        />
      </Field>

      {/* Preview ---------------------------------------------------------- */}
      <div>
        <p className="text-caption font-medium text-gray-700">{t('previewLabel')}</p>

        <div className="mt-2 flex min-h-[5rem] items-center justify-center rounded-card border border-gray-200 bg-gray-50 px-4 py-3">
          {typed ? (
            /*
              Rendered in the interface's own type, NOT a cursive "signature"
              face. Both exports load one — Dancing Script for English, Aref
              Ruqaa for Arabic — so that typing a name produces something that
              LOOKS handwritten. That is the whole screen's dishonesty in one
              detail: a script font makes a typed string resemble a wet
              signature, which is a visual claim about how the mark was made.
              What the client did was type their name, so what is shown is their
              name, typed.
            */
            <span className="text-heading text-gray-700 [overflow-wrap:anywhere]">
              <bdi>{typed}</bdi>
            </span>
          ) : (
            <span className="text-body text-gray-500">{t('previewEmpty')}</span>
          )}
        </div>
      </div>

      <Checkbox
        id="signature-consent"
        checked={consented}
        onChange={(event) => {
          setConsented(event.target.checked);
          setAttempted(null);
        }}
        label={t('consent')}
      />

      <div className="flex flex-col gap-2">
        {/* The one syn-red primary. design.md §2: red is the human's own
            action, and this is the most consequential one in the portal. */}
        <Button
          type="submit"
          variant="primary"
          fullWidth
          disabled={!ready}
          icon={<PenLine aria-hidden size={15} />}
        >
          {t('submit')}
        </Button>

        {/*
          Declining is a real decision a client may need to make, so the control
          is here — but it is not built either, and for the same reason. "I
          decline to sign" is a communication to the firm; a button that
          silently does nothing would leave a client believing they had refused
          on the record.
        */}
        <Button
          variant="secondary"
          fullWidth
          icon={<X aria-hidden size={15} />}
          onClick={() => setAttempted('decline')}
        >
          {t('decline')}
        </Button>
      </div>

      {/* The clear no-op, stated where the action was taken. It names what did
          not happen and points at Messages, which is built. */}
      {attempted ? (
        <p role="status" className="text-caption text-gray-600">
          {attempted === 'sign' ? t('notSigned') : t('notDeclined')}
        </p>
      ) : null}
    </form>
  );
}

export default SignaturePanel;
