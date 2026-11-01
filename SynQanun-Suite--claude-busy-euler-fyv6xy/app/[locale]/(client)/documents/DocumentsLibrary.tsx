'use client';

import * as React from 'react';
import { Download, FileText, MessageSquare, PenLine, Search, X } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import {
  Badge,
  Button,
  Card,
  Input,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  type SortDirection,
} from '@/components/ui';
import type { DocumentKind, DocumentStatus } from '@/fixtures/documents';
import { intlLocale, type CalendarDate } from '@/lib/format';
import { Link } from '@/lib/i18n/navigation';
import type { Locale } from '@/lib/i18n/routing';
import { DOCUMENT_STATUS_TONE } from '@/lib/status-tones';
import { UploadDocumentButton } from '../UploadDocumentModal';

/**
 * The shared-document library: a filterable table with a docked detail panel.
 *
 * WHICH CONTROLS TRAVEL IN THE URL, AND WHICH DO NOT
 * ---------------------------------------------------------------------------
 * The same split the matters and projects lists already use, applied to a
 * screen with more controls than either:
 *
 *   · The STATUS filter is in the URL and applied on the server. "Show me what
 *     needs my signature" is a view worth linking, bookmarking and reaching with
 *     the back button, and it discloses nothing. See EngagementFilterNav, which
 *     this screen reuses unchanged.
 *
 *   · The SEARCH TERM is not, and must not be. On this screen a search term is
 *     very often a filename — "Witness_Statement_Draft_v1.4_Apollo" names a
 *     party, a document type and a stage of proceedings in one string. Put that
 *     in the URL and it lands in browser history, in any shared link, and in the
 *     Referer header of every outbound request the page makes. Same reasoning as
 *     the matters list, with a sharper example.
 *
 *   · The two DROPDOWNS and the SELECTED ROW are client state. A selection is
 *     transient browsing within one list; the durable address for a single
 *     document is its own route, which Batch 3 adds with the signing flow.
 *
 * There is no <form> anywhere on this screen, so there is nothing to submit and
 * no full-page GET to prevent — filtering happens as you type.
 *
 * THE DETAIL PANEL SHOWS METADATA, NOT A DOCUMENT
 * ---------------------------------------------------------------------------
 * The export's panel renders a simulated page of the actual legal instrument —
 * a board resolution, with recitals, a share count, a registration number and a
 * signature block. None of that exists: there is no document store in Track A
 * and no file behind any of these rows. Rendering invented clauses under a real
 * filename would make the prototype assert the contents of a legal document,
 * which is a worse thing to fabricate than a count. The panel states what is
 * genuinely known — which engagement, when it was shared, how big it is, where
 * it stands — and says plainly that there is no preview yet.
 */

export interface DocumentRowData {
  id: string;
  /** The real filename, untranslated. See fixtures/documents.ts. */
  name: string;
  kind: DocumentKind;
  /** Pre-formatted, because formatting needs the locale. */
  sizeLabel: string;
  engagementRef: string;
  engagementKind: 'matter' | 'project';
  /** Already resolved for the locale. */
  engagementTitle: string;
  engagementHref: string;
  /** Raw 'YYYY-MM-DD', so sorting compares dates rather than month names. */
  sharedOn: CalendarDate;
  sharedLabel: string;
  status: DocumentStatus;
}

export interface DocumentsLibraryProps {
  rows: DocumentRowData[];
  /** Engagements present across the WHOLE collection, for the dropdown. */
  engagementOptions: { reference: string; label: string }[];
  /** File types present across the whole collection. */
  kindOptions: DocumentKind[];
  /**
   * Row to open on arrival, from `?doc=` — set when a global-search hit points
   * at a specific document.
   *
   * A document has no page of its own: it is a row plus a docked panel. Rather
   * than invent a route for search to link to, the library accepts the id the
   * way the messages workspace accepts `?thread=`. Same category of value, same
   * decision: an opaque id identifies a view, and a view is linkable. The
   * document's NAME would not be — that is content, and content does not go in
   * a URL.
   */
  initialSelectedId?: string;
}

type SortKey = 'name' | 'shared';

export function DocumentsLibrary({
  rows,
  engagementOptions,
  kindOptions,
  initialSelectedId,
}: DocumentsLibraryProps) {
  const t = useTranslations('documents');
  const locale = useLocale() as Locale;

  const [query, setQuery] = React.useState('');
  const [engagement, setEngagement] = React.useState('');
  const [kind, setKind] = React.useState('');
  const [sort, setSort] = React.useState<{ key: SortKey; direction: 'asc' | 'desc' }>({
    key: 'shared',
    direction: 'desc',
  });
  const [selectedId, setSelectedId] = React.useState<string | null>(initialSelectedId ?? null);

  const panelRef = React.useRef<HTMLDivElement>(null);
  // Only scroll after a real click. Without this the panel would pull itself
  // into view on first paint, which on a phone means the screen opens
  // already scrolled past its own toolbar.
  const scrollOnNextRender = React.useRef(false);

  // A filename can be Arabic or Latin in either locale, so sorting by code
  // point is not alphabetical order in either language.
  const collator = React.useMemo(
    () => new Intl.Collator(intlLocale(locale), { sensitivity: 'base', numeric: true }),
    [locale]
  );

  const visible = React.useMemo(() => {
    const needle = query.trim().toLocaleLowerCase(locale);

    const filtered = rows.filter((row) => {
      if (engagement && row.engagementRef !== engagement) return false;
      if (kind && row.kind !== kind) return false;
      if (!needle) return true;
      return [row.name, row.engagementTitle, row.engagementRef].some((field) =>
        field.toLocaleLowerCase(locale).includes(needle)
      );
    });

    const sorted = [...filtered].sort((a, b) =>
      sort.key === 'name'
        ? collator.compare(a.name, b.name)
        : // 'YYYY-MM-DD' compares chronologically as a plain string — no Date
          // objects, no timezone to get wrong.
          a.sharedOn.localeCompare(b.sharedOn)
    );

    return sort.direction === 'desc' ? sorted.reverse() : sorted;
  }, [rows, query, engagement, kind, sort, collator, locale]);

  // Derived rather than stored, so filtering can never strand the panel on a row
  // that is no longer in the list. Falling back to the first visible row also
  // means the panel is never empty while the table has content.
  const selected = visible.find((row) => row.id === selectedId) ?? visible[0] ?? null;

  React.useEffect(() => {
    if (!scrollOnNextRender.current) return;
    scrollOnNextRender.current = false;
    // `block: 'nearest'` is a no-op when the panel is already on screen, which
    // it always is on desktop, where it is docked beside the table. Below
    // desktop the panel sits under the list, so this is what makes a tap on a
    // row do something visible.
    //
    // Instant, not `behavior: 'smooth'`. Smooth was tried and measured: the
    // panel sits ~3000px down a phone-width list, and the animation ended up
    // travelling 36px of that before the next render interrupted it, so the tap
    // appeared to do nothing at all. A jump that long is also better as a jump —
    // three seconds of gliding past eight cards is not an improvement on
    // arriving.
    panelRef.current?.scrollIntoView({ block: 'nearest' });
  }, [selected?.id]);

  function select(id: string) {
    scrollOnNextRender.current = true;
    setSelectedId(id);
  }

  function toggleSort(key: SortKey) {
    setSort((current) =>
      current.key === key
        ? { key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: key === 'shared' ? 'desc' : 'asc' }
    );
  }

  const directionFor = (key: SortKey): SortDirection =>
    sort.key === key ? sort.direction : null;

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar ----------------------------------------------------------- */}
      <div className="flex flex-col gap-3 desktop:flex-row desktop:items-center desktop:justify-between">
        <div className="flex flex-col gap-3 tablet:flex-row tablet:items-center">
          <div className="relative w-full tablet:max-w-xs">
            <Input
              id="documents-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              aria-label={t('searchLabel')}
              placeholder={t('searchPlaceholder')}
              // Room reserved on BOTH sides for the two adornments, with logical
              // properties. The field keeps the interface direction because a
              // filename can be Arabic — it is not a Latin-only value — so the
              // padding and the icons resolve against the same direction.
              className="ps-9 pe-9"
            />
            <Search
              aria-hidden
              size={16}
              strokeWidth={1.8}
              className="pointer-events-none absolute top-1/2 -translate-y-1/2 text-gray-500"
              style={{ insetInlineStart: '0.75rem' }}
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label={t('clearSearch')}
                className="absolute top-1/2 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-sm text-gray-500 hover:bg-gray-200 hover:text-gray-700"
                style={{ insetInlineEnd: '0.5rem' }}
              >
                <X aria-hidden size={14} strokeWidth={2} />
              </button>
            ) : null}
          </div>

          {/* Both dropdowns are filled from the data, so neither can offer a
              filter that returns nothing. See mockApi.documents.facets().
              <Select> is `w-full` inside its own relative wrapper, so the width
              is set here rather than passed down. */}
          <div className="w-full tablet:w-60">
            <Select
              aria-label={t('engagementLabel')}
              value={engagement}
              onChange={(event) => setEngagement(event.target.value)}
            >
              <option value="">{t('allEngagements')}</option>
              {engagementOptions.map((option) => (
                <option key={option.reference} value={option.reference}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>

          <div className="w-full tablet:w-36">
            <Select
              aria-label={t('typeLabel')}
              value={kind}
              onChange={(event) => setKind(event.target.value)}
            >
              <option value="">{t('allTypes')}</option>
              {kindOptions.map((option) => (
                <option key={option} value={option}>
                  {option.toUpperCase()}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {/* Secondary: the one primary on this screen is signing a document that
            is waiting, which lives in the panel. No engagement preselected —
            the library spans all of them. */}
        <div className="tablet:self-end">
          <UploadDocumentButton label={t('upload')} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 desktop:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] desktop:items-start">
        {/* Table ----------------------------------------------------------- */}
        <section className="flex min-w-0 flex-col gap-3">
          {visible.length === 0 ? (
            <p className="rounded-card border border-gray-200 bg-gray-100 p-6 text-body text-gray-500">
              {query.trim() ? t('emptySearch', { query: query.trim() }) : t('emptyFilter')}
            </p>
          ) : (
            <div className="overflow-hidden tablet:rounded-card tablet:border tablet:border-gray-200 tablet:bg-white">
              <Table>
                <TableHead>
                  <tr>
                    {/* Percentage hints, not fixed widths — the filename is the
                        column a client scans, and left to auto-layout it loses
                        the space to the engagement title and breaks mid-word on
                        every row. Ignored below 768px, where each row is a
                        card. */}
                    <TableHeaderCell
                      sortable
                      sortDirection={directionFor('name')}
                      onSort={() => toggleSort('name')}
                      className="tablet:w-[38%]"
                    >
                      {t('columns.name')}
                    </TableHeaderCell>
                    <TableHeaderCell className="tablet:w-[24%]">
                      {t('columns.engagement')}
                    </TableHeaderCell>
                    <TableHeaderCell
                      sortable
                      sortDirection={directionFor('shared')}
                      onSort={() => toggleSort('shared')}
                      className="tablet:w-[15%]"
                    >
                      {t('columns.shared')}
                    </TableHeaderCell>
                    <TableHeaderCell className="tablet:w-[17%]">
                      {t('columns.status')}
                    </TableHeaderCell>
                    <TableHeaderCell className="max-tablet:hidden">
                      <span className="sr-only">{t('columns.actions')}</span>
                    </TableHeaderCell>
                  </tr>
                </TableHead>

                <TableBody>
                  {visible.map((row) => (
                    <TableRow key={row.id} selected={row.id === selected?.id}>
                      {/* No `label`: this cell is the card's heading below 768px. */}
                      <TableCell className="py-3">
                        <div className="flex items-start gap-2.5">
                          <span className="mt-0.5 shrink-0 rounded-sm bg-gray-100 px-1.5 py-0.5 font-mono text-reference font-medium text-gray-600">
                            {row.kind.toUpperCase()}
                          </span>
                          {/*
                            A FLOOR, not `min-w-0`.

                            `overflow-wrap: anywhere` — which is what lets an
                            unbroken underscored filename wrap at all — also
                            drops the element's min-content width to a single
                            character, and `table-layout: auto` distributes
                            columns by min-content. Measured at an 800px
                            viewport, that handed the engagement column its full
                            longest word and left the FILENAME column 55px wide,
                            wrapping four characters to a line. The percentage
                            hints on the headers could not fix it: they are
                            hints, and min-content wins.

                            8rem is the floor; above it the 38% hint takes over.
                          */}
                          <div className="min-w-[8rem]">
                            {/*
                              A BUTTON, not a clickable <tr>. The export puts the
                              handler on the row, which is not focusable, is not
                              announced as anything, and cannot be reached from a
                              keyboard. `text-start` because a button centres its
                              text by default, and `block` so a filename that
                              wraps to two lines still has one solid hit
                              rectangle — an inline element that wraps has a
                              bounding-box centre falling BETWEEN its line boxes,
                              which is how the matters list first shipped a link
                              you could miss by clicking the middle of it.
                            */}
                            <button
                              type="button"
                              onClick={() => select(row.id)}
                              aria-pressed={row.id === selected?.id}
                              className="block text-start text-body-emphasis text-gray-700 [overflow-wrap:anywhere] hover:text-action hover:underline"
                            >
                              {/*
                                <bdi>, not `dir="auto"` on the button.

                                Both isolate the run and both detect its
                                direction from its own first strong character,
                                which is what a mixed-script column of filenames
                                needs. The difference is ALIGNMENT, and it was
                                visible here: `dir="auto"` sets the direction of
                                the whole block, so `text-start` then resolves
                                against the FILENAME rather than the page.
                                Measured in the Arabic list, the five Latin names
                                sat flush left at x=920 while the two Arabic ones
                                sat flush right at x≈1100 — one column with two
                                scanning edges.

                                <bdi> is inline, so the block keeps the page's
                                direction and every name shares the column's
                                start edge, while each name still orders
                                internally the way its own script requires.
                              */}
                              <bdi>{row.name}</bdi>
                            </button>
                            {/* Isolated, not forced LTR — "840 كيلوبايت" in
                                Arabic. See the rendering rule in lib/format.ts. */}
                            <span className="mt-0.5 block text-caption text-gray-500 [unicode-bidi:isolate]">
                              {row.sizeLabel}
                            </span>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell label={t('columns.engagement')} className="py-3">
                        <Link
                          href={row.engagementHref}
                          className="block text-body text-gray-700 hover:text-action hover:underline"
                        >
                          {row.engagementTitle}
                        </Link>
                        <span className="mt-0.5 flex flex-wrap items-center gap-1.5">
                          <span className="text-caption text-gray-500">
                            {t(`kind.${row.engagementKind}`)}
                          </span>
                          {/* Latin in every locale — the one thing in this row
                              that genuinely wants a forced direction. */}
                          <span
                            dir="ltr"
                            className="font-mono text-reference text-gray-500 [unicode-bidi:isolate]"
                          >
                            {row.engagementRef}
                          </span>
                        </span>
                      </TableCell>

                      <TableCell label={t('columns.shared')} emphasis className="py-3">
                        {/* `whitespace-nowrap` because "17 سبتمبر 2026" is long
                            enough to wrap in this column, and a date broken
                            across two lines is the hardest kind of string to
                            read back. Isolated but NOT direction-forced — the
                            Arabic form's correct visual order is the
                            right-to-left one (lib/format.ts). */}
                        <time
                          dateTime={row.sharedOn}
                          className="whitespace-nowrap [unicode-bidi:isolate]"
                        >
                          {row.sharedLabel}
                        </time>
                      </TableCell>

                      <TableCell label={t('columns.status')} className="py-3">
                        <Badge tone={DOCUMENT_STATUS_TONE[row.status]}>{t(`status.${row.status}`)}</Badge>
                      </TableCell>

                      <TableCell className="py-3 text-end">
                        <a
                          href={`http://127.0.0.1:8000/api/documents/${row.id}/download`}
                          download
                          aria-label={t('download', { name: row.name })}
                          className="inline-flex h-9 items-center justify-center gap-2 rounded-sm px-2 text-caption text-gray-500 hover:bg-gray-100 hover:text-action tablet:w-9 tablet:px-0 tablet:text-gray-500 transition-colors"
                        >
                          <Download aria-hidden size={16} strokeWidth={1.8} />
                          <span className="tablet:hidden">{t('panel.download')}</span>
                        </a>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* The screen's ONE statement of how many there are — over the rows
              this view was given, which the search and the two dropdowns narrow.
              The export makes three such statements from three separate
              literals. */}
          <p className="text-caption text-gray-500">
            {t('showing', { shown: visible.length, total: rows.length })}
          </p>
        </section>

        {/* Detail panel ---------------------------------------------------- */}
        <div ref={panelRef} className="min-w-0 desktop:sticky desktop:top-20">
          {selected ? <DocumentPanel row={selected} /> : null}
        </div>
      </div>
    </div>
  );
}

/* ===========================================================================
 * Detail panel
 * ======================================================================== */

function DocumentPanel({ row }: { row: DocumentRowData }) {
  const t = useTranslations('documents');
  const tp = useTranslations('documents.panel');

  const facts: { label: string; value: React.ReactNode }[] = [
    {
      label: tp('engagement'),
      value: (
        <Link href={row.engagementHref} className="text-gray-700 hover:text-action hover:underline">
          {row.engagementTitle}
        </Link>
      ),
    },
    {
      label: tp('reference'),
      value: (
        <span dir="ltr" className="font-mono text-reference text-gray-700 [unicode-bidi:isolate]">
          {row.engagementRef}
        </span>
      ),
    },
    {
      label: tp('shared'),
      value: (
        <time dateTime={row.sharedOn} className="text-gray-700 [unicode-bidi:isolate]">
          {row.sharedLabel}
        </time>
      ),
    },
    {
      label: tp('file'),
      value: (
        <span className="text-gray-700 [unicode-bidi:isolate]">
          {row.kind.toUpperCase()} · {row.sizeLabel}
        </span>
      ),
    },
  ];

  return (
    <Card padding="lg" className="flex flex-col">
      <div className="flex items-baseline justify-between gap-2 border-b border-gray-200 pb-3">
        <h2 className="font-sans text-title text-gray-700">{tp('heading')}</h2>
        <Badge tone={DOCUMENT_STATUS_TONE[row.status]}>{t(`status.${row.status}`)}</Badge>
      </div>

      {/* <bdi> for the same reason as the table's name cell — see the note
          there. */}
      <p className="mt-4 text-body-emphasis text-gray-700 [overflow-wrap:anywhere]">
        <bdi>{row.name}</bdi>
      </p>

      {row.status === 'awaitingSignature' ? (
        <div className="mt-4 rounded-card border border-warning/25 bg-warning/10 p-4">
          <p className="text-caption font-medium text-warning-text">{tp('signHeading')}</p>
          <p className="mt-1 text-caption text-gray-600">{tp('signBody')}</p>
          {/*
            The one syn-red primary on this screen. design.md §2 gives red to the
            human's own action, and signing is about as much the human's action
            as it gets.

            NOT "Sign via DocuSign / UAE PASS", which both exports name. No
            e-signature provider is integrated, and neither is UAE PASS; naming
            them would promise a legal basis for the signature that this build
            has no part of. The Arabic panel goes further still and cites UAE
            Federal Law No. 46 of 2021 for the signature's enforceability.

            The signing flow is now built — /documents/:id/sign. The provider
            integration that would give a signature a legal basis is still Track
            B (§6), and the screen says so rather than implying otherwise.
          */}
          <Link href={`/documents/${row.id}/sign`} className="mt-3 block">
            <Button
              variant="primary"
              fullWidth
              icon={<PenLine aria-hidden size={15} />}
            >
              {tp('sign')}
            </Button>
          </Link>
        </div>
      ) : null}

      <dl className="mt-4 flex flex-col gap-2.5 border-t border-gray-200 pt-4">
        {facts.map((fact) => (
          <div key={fact.label} className="flex items-baseline justify-between gap-3">
            <dt className="shrink-0 text-caption text-gray-500">{fact.label}</dt>
            <dd className="min-w-0 text-end text-caption">{fact.value}</dd>
          </div>
        ))}
      </dl>

      {/*
        An honest placeholder where the export renders an invented legal
        instrument. See the note at the top of this file.

        MOCK: the real panel renders the stored file — a PDF through a viewer, an
        Office document through a converted preview — fetched behind the same
        access check as the download. Track A.5 for the store and the route; the
        viewer itself is Batch 7 ("non-editable document preview").
      */}
      <div className="mt-4 flex flex-col items-center gap-2 rounded-card border border-dashed border-gray-300 bg-gray-100 px-4 py-8 text-center">
        <FileText aria-hidden size={22} strokeWidth={1.5} className="text-gray-500" />
        <p className="text-caption font-medium text-gray-600">{tp('previewHeading')}</p>
        <p className="text-caption text-gray-500">{tp('previewBody')}</p>
      </div>

      <div className="mt-4 flex flex-col gap-2">
        <a
          href={`http://127.0.0.1:8000/api/documents/${row.id}/download`}
          download
          className="inline-flex w-full items-center justify-center gap-2 rounded-sm border border-gray-300 bg-white py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-action transition-colors"
        >
          <Download aria-hidden size={15} />
          {tp('download')}
        </a>
        <Button variant="secondary" fullWidth icon={<MessageSquare aria-hidden size={15} />}>
          {tp('ask')}
        </Button>
      </div>
    </Card>
  );
}

export default DocumentsLibrary;
