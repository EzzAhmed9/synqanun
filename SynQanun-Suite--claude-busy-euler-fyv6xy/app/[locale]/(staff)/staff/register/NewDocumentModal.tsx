'use client';

import * as React from 'react';
import {
  FileCheck,
  FileSignature,
  FileText,
  Mail,
  MessageSquare,
  Scale,
  StickyNote,
  type LucideIcon,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button, Field, Input, Modal } from '@/components/ui';
import { DOCUMENT_TYPES, type DocumentType } from '@/fixtures/documents';
import { useRouter } from '@/lib/i18n/navigation';
import { cn } from '@/lib/utils';
import { createDocument } from './create-document-action';

/**
 * "New document" — the type picker, and the record it creates.
 *
 * BUILD_PLAN.md §3, Batch 6. No Stitch export was supplied for this screen; it
 * is built from §3 and design.md against the patterns the Upload modal, the
 * Book-a-call modal, New Matter and Add Client already set.
 *
 * ===========================================================================
 * IT WRITES, AND THE WRITE IS THE WHOLE OF IT
 * ===========================================================================
 * §5.1's first category, with no second half to split off. Adding a colleague
 * issues a credential nobody sent; creating an invoice invites sending it;
 * inviting a contact mails them. Starting a draft asserts only that the firm
 * has started one — and it stays true because the record lands in the firm's
 * own collection, which no client-portal endpoint reads. See
 * fixtures/documents.ts on why that is a separate collection rather than a
 * flag, and lib/mock-api.ts on what that buys.
 *
 * So there is no "share with client" control here, no notification, and no
 * cheerful confirmation that anyone has been told. The card behind the dialog
 * gains a row, which is exactly what happened.
 *
 * WHAT IT DOES NOT CREATE IS A FILE. There is no document body anywhere in
 * this product — Document Canvas's header argues that at length, and it is why
 * accepting a drafting suggestion is a permanent no-op. This records that a
 * document exists and what kind it is; it does not produce one, and the dialog
 * says so before the button rather than offering to open something that was
 * never written.
 *
 * ===========================================================================
 * NO FEATHER, NO NAVY, NO SUGGESTIONS
 * ===========================================================================
 * design.md §2 reserves legal-navy and the feather for the product speaking as
 * an agent. Nothing here is generated, inferred or drafted: a person is telling
 * the workspace what they are about to write. The icons are neutral document
 * marks in gray, the one red is the human's own Create, and there is no
 * "suggest a title from the matter" affordance — which would be a generated
 * claim about a document that does not exist yet.
 *
 * ===========================================================================
 * THE ENGAGEMENT IS CONTEXT, NOT A FIELD
 * ===========================================================================
 * The dialog opens from one file's record and is pre-filled with it, shown as a
 * read-only line rather than a selector. Re-opening the choice would let
 * somebody standing on MAT-2201 file a draft against MAT-3088 with one
 * mis-click, on a screen whose entire framing says "this matter". A draft on
 * the wrong file is not a cosmetic error: it is privileged work product
 * attached to the wrong client.
 *
 * ===========================================================================
 * NO TYPE IS PRESELECTED
 * ===========================================================================
 * The same rule the rank field earned in Add Team Member, for a smaller stake.
 * Seven cards with the first one already chosen means a distracted reader types
 * a title, presses Create, and files a court submission as a letter. Here the
 * lesser option is not obvious — there is no "least consequential" document
 * type — so none is chosen, and Create stays inert until one is.
 */

/**
 * One neutral mark per type.
 *
 * Kept beside the type list rather than inside the message bundle, because an
 * icon is not a translation — the Arabic and English cards show the same mark,
 * and a missing entry here is a compile error rather than a blank square.
 */
const TYPE_ICONS: Record<DocumentType, LucideIcon> = {
  letter: Mail,
  memo: StickyNote,
  filing: FileCheck,
  contract: FileSignature,
  correspondence: MessageSquare,
  courtSubmission: Scale,
  other: FileText,
};

export interface NewDocumentModalProps {
  /** The file this draft belongs to. Pre-filled, never re-selectable. */
  engagementRef: string;
  engagementTitle: string;
}

export function NewDocumentModal({ engagementRef, engagementTitle }: NewDocumentModalProps) {
  const t = useTranslations('newDocument');
  const router = useRouter();

  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const [created, setCreated] = React.useState<{ title: string; type: DocumentType } | null>(null);

  // No default. See the header.
  const [type, setType] = React.useState<DocumentType | ''>('');
  const [title, setTitle] = React.useState('');

  const reset = () => {
    setType('');
    setTitle('');
    setError(null);
    setCreated(null);
  };

  const close = () => {
    setOpen(false);
    // Deferred so the fields do not visibly empty while the dialog animates.
    window.setTimeout(reset, 200);
  };

  const submit = (event: React.FormEvent) => {
    // Without this the browser posts the form itself and a draft title on a
    // live matter lands in the address bar. See the Server Action.
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await createDocument({ title, type, engagementRef });
      if (result.ok) {
        setCreated({ title: result.document.title, type: result.document.type });
        // The card behind the dialog is server-rendered, so it has to be
        // re-fetched for the new row to be there when this closes.
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  };

  return (
    <>
      <Button
        variant="secondary"
        size="sm"
        icon={<FileText aria-hidden size={15} />}
        onClick={() => setOpen(true)}
      >
        {t('open')}
      </Button>

      <Modal
        open={open}
        onClose={close}
        title={created ? t('done.title') : t('title')}
        description={created ? undefined : t('description')}
      >
        {created ? (
          <div className="flex flex-col gap-4 p-6 pt-0">
            {/*
              The title and its type are shown the way the row behind this
              dialog shows them, NOT interpolated into a sentence. Two reasons,
              and both have bitten this project before: a type label dropped
              into English prose reads as a capitalised noun mid-sentence, and
              a label dropped into an Arabic sentence has to agree with a
              grammatical frame it knows nothing about. A caption agrees with
              nobody.
            */}
            <div className="min-w-0">
              <p className="text-caption text-gray-500">{t('done.lead')}</p>
              <p className="mt-1 text-body font-medium text-gray-900">
                {/* A title may be in either script — isolated, not forced. */}
                <bdi>{created.title}</bdi>
              </p>
              <p className="mt-0.5 text-caption text-gray-500 [unicode-bidi:isolate]">
                {t(`types.${created.type}.label`)}
                {' · '}
                <span dir="ltr" className="font-mono text-reference text-gray-500">
                  {engagementRef}
                </span>
              </p>
            </div>

            {/*
              What did NOT happen, stated where the action was taken. Both
              lines matter: nobody outside the firm learned anything, and there
              is no file — only a record that one is being written.
            */}
            <div className="rounded-card border border-gray-300 bg-gray-100 p-4">
              <p className="text-caption font-medium text-gray-700">{t('done.scopeTitle')}</p>
              <p className="mt-1 text-caption text-gray-600">{t('done.notShared')}</p>
              <p className="mt-2 text-caption text-gray-600">{t('done.noFile')}</p>
              <p className="mt-2 text-caption text-gray-600">{t('done.session')}</p>
            </div>

            <div className="flex justify-end">
              <Button variant="secondary" size="md" onClick={close}>
                {t('done.close')}
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} noValidate className="flex flex-col gap-5 p-6 pt-0">
            {/* Step one: what kind of thing is this ---------------------- */}
            <fieldset className="min-w-0">
              <legend className="text-caption font-medium text-gray-700">{t('typeLabel')}</legend>

              <div className="mt-2 grid grid-cols-1 gap-2 tablet:grid-cols-2">
                {DOCUMENT_TYPES.map((value) => {
                  const Icon = TYPE_ICONS[value];
                  const selected = type === value;

                  return (
                    <label
                      key={value}
                      className={cn(
                        'flex cursor-pointer items-start gap-3 rounded-card border p-3 transition-colors',
                        selected
                          ? 'border-action bg-action/5'
                          : 'border-gray-200 bg-white hover:bg-gray-50'
                      )}
                    >
                      {/*
                        A real radio, visually hidden rather than replaced:
                        arrow keys move between the cards and a screen reader
                        reads a radio group, which a div with an onClick does
                        neither of.
                      */}
                      <input
                        type="radio"
                        name="document-type"
                        value={value}
                        checked={selected}
                        onChange={() => {
                          setType(value);
                          setError(null);
                        }}
                        className="sr-only"
                      />
                      <Icon
                        aria-hidden
                        size={18}
                        className={cn(
                          'mt-0.5 shrink-0',
                          // Gray, not navy. Nothing here is the product
                          // speaking — see the header.
                          selected ? 'text-action-pressed' : 'text-gray-500'
                        )}
                      />
                      <span className="min-w-0">
                        <span className="block text-body text-gray-900">
                          {t(`types.${value}.label`)}
                        </span>
                        {/*
                          One line each, and they exist to separate the pairs
                          that would otherwise overlap — a letter from
                          correspondence, a filing from a court submission.
                          Options a reader cannot tell apart are two ways of
                          recording the same thing differently.
                        */}
                        <span className="mt-0.5 block text-caption text-gray-500">
                          {t(`types.${value}.hint`)}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            {/* Step two: only once a type has been chosen ---------------- */}
            {type ? (
              <>
                <Field htmlFor="document-title" label={t('titleLabel')} hint={t('titleHint')}>
                  {/* No `latinValue`: a document title may be in either script
                      and follows the interface direction. */}
                  <Input
                    id="document-title"
                    value={title}
                    onChange={(event) => {
                      setTitle(event.target.value);
                      setError(null);
                    }}
                    placeholder={t('titlePlaceholder')}
                    autoComplete="off"
                  />
                </Field>

                {/*
                  Context, not a field. Rendered as text because it is not a
                  decision being taken here — see the header on why re-opening
                  it would be dangerous rather than merely flexible.
                */}
                <div className="rounded-card border border-gray-200 bg-gray-50 p-3">
                  <p className="text-caption text-gray-500">{t('onFile')}</p>
                  <p className="mt-1 text-body text-gray-700">
                    <span dir="ltr" className="font-mono text-reference text-legal-navy">
                      {engagementRef}
                    </span>{' '}
                    <bdi>{engagementTitle}</bdi>
                  </p>
                </div>
              </>
            ) : null}

            {error ? (
              <p role="alert" className="text-caption text-error">
                {t(`errors.${error}`)}
              </p>
            ) : null}

            {/* Said before the button, not after. Somebody deciding whether
                to create a record should know what it will and will not be. */}
            <p className="text-caption text-gray-500">{t('beforeYouCreate')}</p>

            <div className="flex justify-end gap-2">
              <Button variant="secondary" size="md" onClick={close} disabled={pending}>
                {t('cancel')}
              </Button>
              {/* Inert until a type has been chosen AND a title typed. Neither
                  is a default, so neither can be arrived at by accident. */}
              <Button
                type="submit"
                variant="primary"
                size="md"
                loading={pending}
                disabled={!type || title.trim().length === 0}
              >
                {t('submit')}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}

export default NewDocumentModal;
