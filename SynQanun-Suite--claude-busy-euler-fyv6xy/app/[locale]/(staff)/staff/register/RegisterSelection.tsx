'use client';

import * as React from 'react';
import { Download, UserCog, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button, Modal, Select } from '@/components/ui';
import { useRouter } from '@/lib/i18n/navigation';
import { reassignLead } from './reassign-lead-action';
import type { RegisterRowData } from './RegisterTable';

/**
 * The bar that appears when rows are selected, and the two things it does.
 *
 * BUILD_PLAN.md §3, Batch 7 — bulk actions.
 *
 * ===========================================================================
 * ONE ACTION IS COMPLETELY REAL AND ONE IS A SESSION WRITE
 * ===========================================================================
 * EXPORT SELECTED builds a CSV from the rows on screen and downloads it. No
 * §5.1 question arises: it reads data the reader is already looking at, writes
 * a file to their own machine, and asserts nothing about anybody. It is the
 * rare control in this product that is finished.
 *
 * REASSIGN LEAD is §5.1's first category — the firm deciding who answers for a
 * file. It writes in session, and the register behind the dialog really does
 * show the new name, because the lead is resolved in ONE place in
 * lib/mock-api.ts rather than read out of the fixture four times.
 *
 * NEITHER TELLS ANYBODY. Reassignment does not email the person who has just
 * become responsible for four matters; the confirmation says so, because that
 * is exactly the assumption a bulk action invites.
 *
 * ===========================================================================
 * WHAT THE EXPORT'S BULK BAR OFFERS THAT IS NOT HERE
 * ===========================================================================
 *   · "Download selected" on the document vault. There are no files — a
 *     document in this product is a name, a size, a status and an engagement.
 *     Downloading four of nothing is not a smaller version of downloading four
 *     files.
 *   · "Move to folder". There are no folders. The export's vault invents a
 *     six-folder hierarchy with per-folder counts and a "420 MB used of 2.0 GB"
 *     storage meter over a collection that stores no bytes.
 *   · "AI Portfolio Risk Audit" across selected matters, which is the same
 *     generated legal opinion every export asks for, applied in bulk.
 *   · A select-all checkbox in the header that ticks every row ON LOAD — the
 *     export ships with rows pre-selected and a bulk bar already open, so the
 *     screen opens claiming a selection the reader never made.
 *
 * ===========================================================================
 * THE CSV IS UTF-8 WITH A BOM, AND THAT IS NOT PEDANTRY
 * ===========================================================================
 * Half this product's data is Arabic. Excel on Windows reads a BOM-less UTF-8
 * CSV in the system codepage, which turns every Arabic field into mojibake —
 * so the one honest export in the product would produce a file the firm cannot
 * read. The BOM costs three bytes.
 */

/** RFC 4180: quote every field, double any quote inside it. */
function csvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

export interface RegisterSelectionProps {
  /** The rows currently on screen, in display order. */
  rows: RegisterRowData[];
  selected: Set<string>;
  onClear: () => void;
  /** Column headings for the CSV, already in the reader's language. */
  csvHeadings: string[];
  /** Filename stem, e.g. "matters". The tenant's date is appended. */
  fileStem: string;
  today: string;
  /** Lead options, flattened by the server. Absent for a rank that may not. */
  leadOptions: { value: string; label: string }[] | null;
}

export function RegisterSelection({
  rows,
  selected,
  onClear,
  csvHeadings,
  fileStem,
  today,
  leadOptions,
}: RegisterSelectionProps) {
  const t = useTranslations('registerBulk');
  const router = useRouter();

  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState<{ changed: number } | null>(null);
  // No default. Picking the first eligible partner for somebody would hand a
  // file to whoever sorts first.
  const [staffId, setStaffId] = React.useState('');

  if (selected.size === 0) return null;

  const chosen = rows.filter((row) => selected.has(row.reference));

  const exportCsv = () => {
    const body = chosen.map((row) =>
      [
        row.reference,
        row.title,
        row.typeLabel,
        row.clientName,
        row.venue,
        row.status,
        row.team.find((member) => member.isLead)?.name ?? '',
        row.lastUpdated,
        row.nextDate ? `${row.nextDate.title} — ${row.nextDate.date}` : '',
      ]
        .map(csvCell)
        .join(',')
    );
    //  is the byte-order mark, written as an ESCAPE rather than as a
    // literal: a literal BOM in source is an invisible character that does not
    // survive every editor, and this one silently did not — the first version
    // of this file shipped without it and the check below caught it.
    const csv = `\uFEFF${csvHeadings.map(csvCell).join(',')}\r\n${body.join('\r\n')}\r\n`;
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));

    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${fileStem}-${today}.csv`;
    anchor.click();
    // Released on the next tick; revoking synchronously races the download in
    // some browsers.
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await reassignLead({
        references: chosen.map((row) => row.reference),
        staffId,
      });

      if (result.ok) {
        setDone({ changed: result.changed });
        // The register is server-rendered; without this the lead column still
        // shows the previous name.
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  };

  const close = () => {
    setOpen(false);
    window.setTimeout(() => {
      setStaffId('');
      setError(null);
      setDone(null);
    }, 200);
  };

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-gray-300 bg-gray-100 p-3">
        <p className="text-caption font-medium text-gray-700">
          {t('count', { count: selected.size })}
        </p>

        <div className="flex flex-wrap items-center gap-2">
          {/* Fully real — see the header. */}
          <Button
            variant="secondary"
            size="sm"
            icon={<Download aria-hidden size={15} />}
            onClick={exportCsv}
          >
            {t('exportCsv')}
          </Button>

          {/* Absent for a rank that may not reassign, never disabled. The
              Server Action checks again; see reassign-lead-action.ts. */}
          {leadOptions ? (
            <Button
              variant="secondary"
              size="sm"
              icon={<UserCog aria-hidden size={15} />}
              onClick={() => setOpen(true)}
            >
              {t('reassign.open')}
            </Button>
          ) : null}

          <Button
            variant="secondary"
            size="sm"
            icon={<X aria-hidden size={15} />}
            onClick={onClear}
          >
            {t('clear')}
          </Button>
        </div>
      </div>

      <Modal
        open={open}
        onClose={close}
        title={done ? t('reassign.done.title') : t('reassign.title')}
        description={done ? undefined : t('reassign.description', { count: selected.size })}
      >
        {done ? (
          <div className="flex flex-col gap-4 p-6 pt-0">
            <p className="text-body text-gray-700">
              {t('reassign.done.changed', { count: done.changed })}
            </p>

            <div className="rounded-card border border-gray-300 bg-gray-100 p-4">
              <p className="text-caption font-medium text-gray-700">
                {t('reassign.done.scopeTitle')}
              </p>
              <p className="mt-1 text-caption text-gray-600">{t('reassign.done.notTold')}</p>
              <p className="mt-2 text-caption text-gray-600">{t('reassign.done.session')}</p>
            </div>

            <div className="flex justify-end">
              <Button variant="secondary" size="md" onClick={close}>
                {t('reassign.done.close')}
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} noValidate className="flex flex-col gap-4 p-6 pt-0">
            {/* What is about to move, listed rather than counted. A bulk action
                that only says "4 matters" asks somebody to trust their own
                clicking. */}
            <div className="rounded-card border border-gray-200 bg-gray-50 p-3">
              <p className="text-caption text-gray-500">{t('reassign.affected')}</p>
              <ul className="mt-1.5 flex flex-col gap-1">
                {chosen.map((row) => (
                  <li key={row.reference} className="text-caption text-gray-700">
                    <span dir="ltr" className="font-mono text-reference text-gray-500">
                      {row.reference}
                    </span>{' '}
                    <bdi>{row.title}</bdi>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <label
                htmlFor="reassign-lead"
                className="block text-caption font-medium text-gray-700"
              >
                {t('reassign.leadLabel')}
              </label>
              <div className="mt-1.5">
                <Select
                  id="reassign-lead"
                  value={staffId}
                  onChange={(event) => {
                    setStaffId(event.target.value);
                    setError(null);
                  }}
                >
                  <option value="">{t('reassign.leadPlaceholder')}</option>
                  {(leadOptions ?? []).map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </div>
              <p className="mt-1.5 text-caption text-gray-500">{t('reassign.leadHint')}</p>
            </div>

            {error ? (
              <p role="alert" className="text-caption text-error">
                {t(`reassign.errors.${error}`)}
              </p>
            ) : null}

            <p className="text-caption text-gray-500">{t('reassign.before')}</p>

            <div className="flex justify-end gap-2">
              <Button variant="secondary" size="md" onClick={close} disabled={pending}>
                {t('reassign.cancel')}
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="md"
                loading={pending}
                disabled={!staffId}
              >
                {t('reassign.submit')}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}

export default RegisterSelection;
