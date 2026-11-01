'use client';

import * as React from 'react';
import { ChevronRight, Search, X } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import {
  Badge,
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
import type { EngagementStatusTone } from '@/fixtures/engagements';
import { intlLocale } from '@/lib/format';
import { Link } from '@/lib/i18n/navigation';
import type { Locale } from '@/lib/i18n/routing';

/**
 * One engagement, flattened for display.
 *
 * The page resolves every `Record<Locale, string>` before handing rows over, so
 * nothing here has to know which language it is in — the same arrangement the
 * dashboard's <EngagementCard> uses. `lastUpdatedOn` stays as its raw
 * 'YYYY-MM-DD' calendar date purely so sorting compares dates rather than
 * localised month names; `lastUpdatedLabel` is what gets rendered.
 *
 * The three middle fields are named for what they DO, not for what a matter
 * calls them: `category` is a matter's practice area or a project's project
 * category, `venue` is a forum or a jurisdiction, `lead` is lead counsel or the
 * project lead. The column headings come from the namespace.
 */
export interface EngagementRowData {
  id: string;
  reference: string;
  href: string;
  title: string;
  category: string;
  venue: string;
  lead: string;
  status: string;
  statusTone: EngagementStatusTone;
  needsAttention: boolean;
  attentionReason: string | null;
  /** No longer live — "Closed" for a matter, "Completed" for a project. */
  inactive: boolean;
  lastUpdatedOn: string;
  lastUpdatedLabel: string;
}

export interface EngagementTableProps {
  rows: EngagementRowData[];
  /** Distinct venues or categories across the list, for the dropdown. */
  filterOptions: string[];
  /**
   * Translation namespace — 'matters' or 'projects'. Their key shapes are
   * identical, which is what lets one table serve both lists.
   */
  namespace: string;
}

type SortKey = 'title' | 'updated';

/**
 * The engagements table, with its free-text search, category filter and
 * sorting. Serves both the matters list and the projects list.
 *
 * WHY THESE THREE ARE IN THE BROWSER AND THE STATUS FILTER IS NOT
 * ---------------------------------------------------------------------------
 * The status filter lives in the URL and is applied on the server (see
 * page.tsx). These three are applied here, in the client, and the split is
 * deliberate rather than incidental:
 *
 *   · A status filter is a VIEW. "Show me what needs me" is worth being able to
 *     link to, bookmark, and reach with the back button, and it discloses
 *     nothing about the client — so it belongs in the URL.
 *
 *   · A search term is CONTENT. On a privileged legal portal it may be a
 *     counterparty's name, a matter reference, or the name of a lawyer the
 *     client is checking up on. Put it in the URL and it lands in browser
 *     history, in any shared link, and in the Referer header of every outbound
 *     request the page makes. That is the same class of problem as the Client
 *     Gateway's email-in-the-query-string, in a milder form, and it is avoided
 *     the same way: it never enters the URL.
 *
 * There is no <form> here at all, so there is nothing to submit and no
 * full-page GET to prevent — filtering happens as you type.
 *
 * MOCK: searching and forum-filtering only what is on the current page is
 * correct for six fixtures and wrong for six hundred. The real endpoint takes
 * both as parameters and filters in the database; see lib/mock-api.ts. Keeping
 * the term out of the URL stays right either way — it travels in a request
 * body, not a query string.
 */
export function EngagementTable({ rows, filterOptions, namespace }: EngagementTableProps) {
  const t = useTranslations(namespace);
  const locale = useLocale() as Locale;

  const [query, setQuery] = React.useState('');
  const [venue, setVenue] = React.useState('');
  const [sort, setSort] = React.useState<{ key: SortKey; direction: 'asc' | 'desc' }>({
    key: 'updated',
    direction: 'desc',
  });

  // Locale-aware comparison. A plain `<` sorts Arabic titles by code point,
  // which is not alphabetical order in any language that uses the script.
  const collator = React.useMemo(
    () => new Intl.Collator(intlLocale(locale), { sensitivity: 'base', numeric: true }),
    [locale]
  );

  const visible = React.useMemo(() => {
    const needle = query.trim().toLocaleLowerCase(locale);

    const filtered = rows.filter((row) => {
      if (venue && row.venue !== venue) return false;
      if (!needle) return true;
      return [row.title, row.reference, row.lead, row.category, row.venue].some((field) =>
        field.toLocaleLowerCase(locale).includes(needle)
      );
    });

    const sorted = [...filtered].sort((a, b) =>
      sort.key === 'title'
        ? collator.compare(a.title, b.title)
        : // Calendar dates are 'YYYY-MM-DD', so a plain string comparison is
          // already chronological — no Date objects, no timezone to get wrong.
          a.lastUpdatedOn.localeCompare(b.lastUpdatedOn)
    );

    return sort.direction === 'desc' ? sorted.reverse() : sorted;
  }, [rows, query, venue, sort, collator, locale]);

  function toggleSort(key: SortKey) {
    setSort((current) =>
      current.key === key
        ? { key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: key === 'updated' ? 'desc' : 'asc' }
    );
  }

  const directionFor = (key: SortKey): SortDirection =>
    sort.key === key ? sort.direction : null;

  return (
    <div className="flex flex-col gap-4">
      {/* Controls ---------------------------------------------------------- */}
      <div className="flex flex-col gap-3 tablet:flex-row tablet:items-center tablet:justify-between">
        <div className="relative w-full tablet:max-w-sm">
          <Input
            id={`${namespace}-search`}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label={t('searchLabel')}
            placeholder={t('searchPlaceholder')}
            // Room reserved on BOTH sides for the two adornments. `ps-`/`pe-`
            // are logical, and the input keeps the interface direction — a
            // search term can be Arabic, so this is NOT a `latinValue` field.
            // That is what keeps the padding and the icons resolving against
            // the same direction, which is where the Accept Invite password
            // field went wrong.
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

        <div className="w-full tablet:w-64">
          <Select
            aria-label={t('forumLabel')}
            value={venue}
            onChange={(event) => setVenue(event.target.value)}
          >
            {/* Options come from the data, so the dropdown cannot offer a
                filter that no row sits in. Both exports hardcoded their
                options and both listed more than the data could reach. */}
            <option value="">{t('allForums')}</option>
            {filterOptions.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {/* Table ------------------------------------------------------------- */}
      {visible.length === 0 ? (
        <p className="rounded-card border border-gray-200 bg-gray-100 p-6 text-body text-gray-500">
          {query.trim() ? t('emptySearch', { query: query.trim() }) : t('emptyFilter')}
        </p>
      ) : (
        <div className="overflow-hidden tablet:rounded-card tablet:border tablet:border-gray-200 tablet:bg-white">
          <Table>
            <TableHead>
              <tr>
                <TableHeaderCell
                  sortable
                  sortDirection={directionFor('title')}
                  onSort={() => toggleSort('title')}
                >
                  {t('columns.matter')}
                </TableHeaderCell>
                <TableHeaderCell>{t('columns.type')}</TableHeaderCell>
                <TableHeaderCell>{t('columns.counsel')}</TableHeaderCell>
                <TableHeaderCell>{t('columns.status')}</TableHeaderCell>
                <TableHeaderCell
                  sortable
                  sortDirection={directionFor('updated')}
                  onSort={() => toggleSort('updated')}
                >
                  {t('columns.updated')}
                </TableHeaderCell>
                <TableHeaderCell className="max-tablet:hidden">
                  <span className="sr-only">{t('columns.open')}</span>
                </TableHeaderCell>
              </tr>
            </TableHead>

            <TableBody>
              {visible.map((row) => (
                <TableRow key={row.id}>
                  {/* No `label`: this cell is the card's heading below 768px. */}
                  <TableCell className="py-3">
                    {/*
                      The row's affordance is this link, not a click handler on
                      the <tr>. A clickable table row is not focusable, is not
                      announced as a link, and cannot be opened in a new tab —
                      all of which a client working through six matters will
                      want.
                    */}
                    {/*
                      `block`, not the default inline. A matter title wraps to
                      two lines at this column width, and an INLINE link that
                      wraps has a bounding box whose middle falls in the gap
                      BETWEEN its two line boxes — measured here, a click at the
                      link's own centre hit the table cell behind it. Block
                      gives it one solid rectangle, which also makes the whole
                      width of the cell a target rather than just the glyphs.
                    */}
                    <Link
                      href={row.href}
                      className="block text-body-emphasis text-gray-700 hover:text-action hover:underline"
                    >
                      {row.title}
                    </Link>
                    <span
                      dir="ltr"
                      className="mt-0.5 block font-mono text-reference text-gray-500 [unicode-bidi:isolate]"
                    >
                      {row.reference}
                    </span>
                  </TableCell>

                  <TableCell label={t('columns.type')} className="py-3">
                    <span className="block text-gray-700">{row.category}</span>
                    <span className="mt-0.5 block text-caption text-gray-500">{row.venue}</span>
                  </TableCell>

                  <TableCell label={t('columns.counsel')} className="py-3">
                    {row.lead}
                  </TableCell>

                  <TableCell label={t('columns.status')} className="py-3">
                    <span className="flex flex-wrap items-center gap-1.5">
                      <Badge tone={row.statusTone}>{row.status}</Badge>
                      {row.needsAttention ? (
                        <Badge tone="warning">{t('needsAttention')}</Badge>
                      ) : null}
                      {row.inactive ? <Badge tone="neutral">{t('closed')}</Badge> : null}
                    </span>
                    {/* The reason sits under the badge rather than inside it:
                        the badge stays scannable, and the instruction is still
                        readable by keyboard and on touch — unlike the export's
                        English version, which hid it in a `title` tooltip. */}
                    {row.attentionReason ? (
                      <span className="mt-1 block text-caption text-gray-500">
                        {row.attentionReason}
                      </span>
                    ) : null}
                  </TableCell>

                  <TableCell label={t('columns.updated')} emphasis className="py-3">
                    <time dateTime={row.lastUpdatedOn} className="[unicode-bidi:isolate]">
                      {row.lastUpdatedLabel}
                    </time>
                  </TableCell>

                  <TableCell className="py-3 text-end max-tablet:hidden">
                    <Link
                      href={row.href}
                      aria-label={t('openMatter', { reference: row.reference })}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-sm text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                    >
                      {/* Directional icon — flips with `dir` (design.md §12). */}
                      <ChevronRight aria-hidden size={16} strokeWidth={2} className="rtl:rotate-180" />
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <p className="text-caption text-gray-500">
        {t('showing', { shown: visible.length, total: rows.length })}
      </p>
    </div>
  );
}

export default EngagementTable;
