'use client';

import * as React from 'react';
import { Upload, X } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { Button, Field, Modal, Select } from '@/components/ui';
import { formatFileSize } from '@/lib/format';
import type { Locale } from '@/lib/i18n/routing';
import { cn } from '@/lib/utils';
import { usePortalEngagements } from './ClientPortalChrome';

/**
 * "Upload a document" — the first of Batch 3's client-side modals.
 *
 * ===========================================================================
 * THE UPLOAD DECISION: STAGING IS REAL, UPLOADING IS NOT
 * ===========================================================================
 * Same question asked of the invoice payment button, the message composer and
 * the settings Save, and answered the same way each time: WHAT DOES THE STATE
 * ASSERT?
 *
 *   · An echoed message asserts that the interface received your words. True,
 *     so Messages shows it (labelled "Not sent").
 *   · A payment receipt asserts that money moved. False, so Invoices does not.
 *   · A saved setting asserts the system will remember. False, so Settings
 *     does not.
 *   · A NEW ROW IN THE DOCUMENTS LIST asserts that THE FIRM NOW HAS YOUR FILE.
 *
 * That last one is the most consequential false state available anywhere in
 * this product. A client who believes a signed consent or a witness statement
 * reached their lawyers, when it did not, misses a filing deadline — and unlike
 * an unsent message, nothing on screen would later contradict them. So the
 * optimistic row is NOT built.
 *
 * What IS built is everything the browser genuinely does. Choosing a file is
 * real: the browser reads its name, type and size, and this modal shows all
 * three. Rejecting a 40MB file is real. Rejecting an .xlsx is real. Drag and
 * drop works. Only the final step — handing the bytes to someone — is missing,
 * and that is the step that says so.
 *
 * The line is the same one Messages drew, just in a different place: show what
 * the interface did, never what the system would have done.
 *
 * MOCK: replace with POST /api/documents (multipart), which must, server-side:
 * enforce the type and size policy again (everything below is a browser-side
 * convenience and trivially bypassed), virus-scan before the file is readable
 * by anyone, verify the engagement belongs to the authenticated client, and
 * record who uploaded it. Track A.5 for the route and the store; the scanner is
 * a Track B integration (BUILD_PLAN.md §6).
 *
 * ---------------------------------------------------------------------------
 * NOT CARRIED OVER FROM THE STITCH EXPORT
 * ---------------------------------------------------------------------------
 *  · "Client-side encrypted & protected under legal privilege (SHA-256 vault
 *    standard)" under the drop zone, and its Arabic twin "التشفير مشفر ومحمي
 *    بالحصانة المهنية للمحامين والموكلين (معيار SHA-256 المعتمد)". Nothing here
 *    is encrypted client-side, there is no vault, and privilege is a legal
 *    status rather than a file attribute. Sixth screen running for this
 *    category.
 *  · "your client vault" in the subtitle, and "جاهز للتحميل والتشفير" ("ready
 *    for upload and encryption") on the staged file.
 *  · THE DOCUMENT CATEGORY / CLASSIFICATION control — five options in English,
 *    four different ones as radio buttons in Arabic, over a fixture with no
 *    category field at all. The two languages do not even agree on the
 *    vocabulary.
 *  · "General Client Vault (Unassigned)" / "الخزينة العامة للعميل (غير مخصص)".
 *    Every document in this model belongs to an engagement; that was settled
 *    when the documents library was built and is deliberately not widened here.
 *  · "up to 50 MB" beside XLSX and TIFF support. The limit below is enforced,
 *    and the types offered are the two the model has.
 *  · A PREFILLED STAGED FILE in the markup of both versions, so the modal ships
 *    already holding a document nobody chose.
 */

/** The formats `DocumentKind` models. Enforced, not decorative. */
const ACCEPTED_EXTENSIONS = ['pdf', 'docx'] as const;

const ACCEPT_ATTRIBUTE = [
  '.pdf',
  '.docx',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
].join(',');

/**
 * Decimal megabytes, matching `formatFileSize`. Checked in the browser before a
 * file is staged, so the number in the caption is a rule rather than a claim —
 * see the MOCK note above for why the server must check it again anyway.
 */
const MAX_BYTES = 25_000_000;
const MAX_MEGABYTES = MAX_BYTES / 1_000_000;

export interface UploadDocumentModalProps {
  open: boolean;
  onClose: () => void;
  /** Preselect the engagement — set when opened from a matter or project. */
  defaultEngagementRef?: string;
}

export function UploadDocumentModal({
  open,
  onClose,
  defaultEngagementRef,
}: UploadDocumentModalProps) {
  const t = useTranslations('upload');
  const locale = useLocale() as Locale;
  const engagements = usePortalEngagements();

  const inputRef = React.useRef<HTMLInputElement>(null);

  const [engagement, setEngagement] = React.useState(defaultEngagementRef ?? '');
  const [file, setFile] = React.useState<File | null>(null);
  const [fileError, setFileError] = React.useState<string | null>(null);
  const [engagementError, setEngagementError] = React.useState<string | null>(null);
  const [dragging, setDragging] = React.useState(false);
  const [attempted, setAttempted] = React.useState(false);

  // Reopening should not show the previous attempt's file or messages.
  React.useEffect(() => {
    if (open) return;
    setEngagement(defaultEngagementRef ?? '');
    setFile(null);
    setFileError(null);
    setEngagementError(null);
    setAttempted(false);
    if (inputRef.current) inputRef.current.value = '';
  }, [open, defaultEngagementRef]);

  function accept(candidate: File | undefined) {
    setAttempted(false);
    if (!candidate) return;

    const extension = candidate.name.split('.').pop()?.toLowerCase() ?? '';

    if (!(ACCEPTED_EXTENSIONS as readonly string[]).includes(extension)) {
      setFile(null);
      setFileError(t('errorType'));
      return;
    }

    if (candidate.size > MAX_BYTES) {
      setFile(null);
      setFileError(t('errorSize', { max: MAX_MEGABYTES }));
      return;
    }

    setFileError(null);
    setFile(candidate);
  }

  function submit(event: React.FormEvent) {
    // No `action`, no `method`, and preventDefault here. A form containing a
    // file input that falls back to a GET does not send the file — it navigates
    // and drops it — and the engagement reference would land in the query
    // string. Same omission the Client Gateway shipped with a password.
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
          {/*
            The one syn-red primary in this modal. design.md §2: red is the
            human's own action. Disabled until a file is staged — there is
            nothing to upload before that, and a live button over an empty form
            is an invitation to a validation message that did not need to exist.
          */}
          <Button
            type="submit"
            form="upload-document-form"
            variant="primary"
            disabled={file === null}
            icon={<Upload aria-hidden size={15} />}
          >
            {t('submit')}
          </Button>
        </>
      }
    >
      <form id="upload-document-form" onSubmit={submit} className="flex flex-col gap-5" noValidate>
        <Field
          htmlFor="upload-engagement"
          label={t('engagementLabel')}
          hint={t('engagementHint')}
          error={engagementError ?? undefined}
        >
          <Select
            id="upload-engagement"
            value={engagement}
            invalid={Boolean(engagementError)}
            onChange={(event) => {
              setEngagement(event.target.value);
              setEngagementError(null);
              setAttempted(false);
            }}
          >
            <option value="">{t('engagementPlaceholder')}</option>
            {/* Active matters and projects, from the portal context — see the
                note on mockApi.engagements.selectable(). The reference leads so
                the list sorts and scans by it. */}
            {engagements.map((option) => (
              <option key={option.reference} value={option.reference}>
                {option.reference} — {option.title}
              </option>
            ))}
          </Select>
        </Field>

        {/* Drop zone ---------------------------------------------------- */}
        <div>
          <input
            ref={inputRef}
            id="upload-file"
            type="file"
            accept={ACCEPT_ATTRIBUTE}
            className="sr-only"
            onChange={(event) => accept(event.target.files?.[0])}
          />

          {/*
            A real <button>, not a bare div with a click handler. It opens the
            file picker from the keyboard as well as the mouse, and it is
            labelled by the same text a sighted user reads. The drag handlers
            sit on the same element, which is why `onDragOver` preventDefaults —
            without it the browser navigates away to open the dropped file.
          */}
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              accept(event.dataTransfer.files?.[0]);
            }}
            className={cn(
              'flex w-full flex-col items-center gap-2 rounded-card border-2 border-dashed px-6 py-8 text-center transition-colors',
              dragging
                ? 'border-legal-navy bg-legal-navy/5'
                : 'border-gray-300 bg-gray-50 hover:bg-gray-100'
            )}
          >
            {/* An upload glyph, NOT the feather. brand-guidelines.md §5 keeps
                the feather exclusively the AI's mark, and the client portal has
                no AI surfaces at all. */}
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-pill border border-gray-200 bg-white text-legal-navy">
              <Upload aria-hidden size={20} strokeWidth={1.8} />
            </span>

            <span className="text-body text-gray-700">{t('dropHeading')}</span>
            <span className="text-caption text-gray-500">
              {t('accepted', { max: MAX_MEGABYTES })}
            </span>
          </button>

          {fileError ? (
            <p role="alert" className="mt-2 text-caption text-error">
              {fileError}
            </p>
          ) : null}
        </div>

        {/* Staged file -------------------------------------------------- */}
        {file ? (
          <div>
            <p className="text-caption font-medium text-gray-700">{t('staged')}</p>

            <div className="mt-2 flex items-center gap-3 rounded-card border border-gray-200 bg-gray-50 p-3">
              <span className="shrink-0 rounded-sm bg-gray-100 px-1.5 py-0.5 font-mono text-reference font-medium text-gray-600">
                {(file.name.split('.').pop() ?? '').toUpperCase()}
              </span>

              <div className="min-w-0 flex-1">
                {/* <bdi> — a filename is not translated, so it orders by its own
                    first strong character while the row keeps the page's
                    direction. Same call as the documents library. */}
                <p className="text-body text-gray-700 [overflow-wrap:anywhere]">
                  <bdi>{file.name}</bdi>
                </p>
                {/* Isolated, not direction-forced: "2.4 م.ب" in Arabic. */}
                <p className="text-caption text-gray-500 [unicode-bidi:isolate]">
                  {formatFileSize(file.size, locale)}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setFile(null);
                  setAttempted(false);
                  if (inputRef.current) inputRef.current.value = '';
                }}
                aria-label={t('remove', { name: file.name })}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-sm text-gray-500 hover:bg-gray-200 hover:text-gray-700"
              >
                <X aria-hidden size={15} strokeWidth={2} />
              </button>
            </div>
          </div>
        ) : null}

        {/* The clear no-op. Stated where the action was taken, naming what did
            not happen and where it lands. */}
        {attempted ? (
          <p role="status" className="text-caption text-gray-600">
            {t('notUploaded')}
          </p>
        ) : null}
      </form>
    </Modal>
  );
}

/* ===========================================================================
 * Trigger
 * ======================================================================== */

export interface UploadDocumentButtonProps {
  label: string;
  /** Preselect the engagement — set when opened from a matter or project. */
  defaultEngagementRef?: string;
  variant?: 'secondary' | 'primary';
  size?: 'sm' | 'md';
}

/**
 * A <Button> that opens the modal, for the screens whose trigger is an ordinary
 * kit button and whose page is a Server Component (the engagement detail, the
 * documents library).
 *
 * The dashboard's quick-action pill uses <UploadDocumentModal> directly instead:
 * it has its own bespoke styling, and wrapping <Button> just to override all of
 * it would be worse than owning the two lines of open state.
 */
export function UploadDocumentButton({
  label,
  defaultEngagementRef,
  variant = 'secondary',
  size = 'sm',
}: UploadDocumentButtonProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <Button
        variant={variant}
        size={size}
        icon={<Upload aria-hidden size={15} />}
        onClick={() => setOpen(true)}
      >
        {label}
      </Button>

      <UploadDocumentModal
        open={open}
        onClose={() => setOpen(false)}
        defaultEngagementRef={defaultEngagementRef}
      />
    </>
  );
}

export default UploadDocumentModal;
