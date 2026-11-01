'use client';

import * as React from 'react';
import { Landmark, Mail, MessagesSquare, Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui';
import { Link } from '@/lib/i18n/navigation';
import { MIN_QUERY_LENGTH, matchesQuery } from '@/lib/search';
import { cn } from '@/lib/utils';
import type { InboxSource } from '@/fixtures/practice';

/**
 * The list pane: a search box over rows that are already on the page.
 *
 * ===========================================================================
 * WHY THE SEARCH IS CLIENT STATE AND THE FILTER IS NOT
 * ===========================================================================
 * The source filter is a VIEW — "show me the court notices" is a thing you
 * link someone to, bookmark, and press back out of — so it lives in the URL.
 * A half-typed search string is none of those things. That split has held
 * since the documents library and the global search overlay, and this screen
 * does not get to invent a third arrangement.
 *
 * FILTERED IN THE BROWSER, over at most a dozen rows that the server already
 * sent. That is right at this size and wrong at eight hundred, exactly as
 * `documents.listShared` records of its own free-text search; the real endpoint
 * takes the query. Track A.5.
 *
 * ===========================================================================
 * ROW CONTENT IS FLATTENED; UI LABELS ARE NOT
 * ===========================================================================
 * The server resolves each row's per-locale fields and its date label before
 * handing them over, so nothing here indexes a locale or builds an Intl
 * formatter — the arrangement MessagesWorkspace.tsx uses. The INTERFACE strings
 * come from `useTranslations` right here, like every other client component in
 * the product.
 *
 * The first attempt passed them down as callbacks instead and crashed the
 * route: functions cannot cross the server/client boundary. Caught by
 * app/[locale]/error.tsx rather than by reading the code — the second time that
 * boundary has earned itself.
 */

export interface InboxRowData {
  id: string;
  source: InboxSource;
  /** Already resolved for the locale. */
  from: string;
  subject: string;
  /** Portal rows only — see `InboxItemRecord.preview`. */
  preview: string | null;
  /** Latin in every locale, so it is not localised. */
  engagementRef: string | null;
  /** "today", "yesterday", a date — resolved on the server. */
  timeLabel: string;
  unread: boolean;
  awaitingReply: boolean;
  personal: boolean;
  /** A secretary's view: whose correspondence this is. */
  forStaff: string | null;
  /** Pre-built, because building a href needs no client logic. */
  href: { pathname: string; query: Record<string, string> };
}

const SOURCE_ICON: Record<InboxSource, typeof Mail> = {
  portal: MessagesSquare,
  email: Mail,
  court: Landmark,
};

export function InboxList({
  rows,
  activeId,
}: {
  rows: InboxRowData[];
  activeId: string | null;
}) {
  const t = useTranslations('inbox');
  const [query, setQuery] = React.useState('');

  const trimmed = query.trim();
  const searching = trimmed.length >= MIN_QUERY_LENGTH;

  const visible = React.useMemo(() => {
    if (!searching) return rows;
    return rows.filter((row) =>
      // Sender, subject, body and reference — the four things someone actually
      // remembers about a message. `matchesQuery` folds Arabic diacritics,
      // alef/ya variants and Arabic-Indic digits, so a search typed either way
      // finds either. See lib/search.ts.
      matchesQuery(
        [row.from, row.subject, row.preview ?? '', row.engagementRef ?? '', t(`sources.${row.source}`)],
        trimmed
      )
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, trimmed, searching]);

  const unreadShown = visible.filter((row) => row.unread).length;

  return (
    <>
      <div className="border-b border-gray-200 p-3">
        <div className="relative">
          {/*
            Inline-start, so it flips in Arabic — design.md §12. The arbitrary
            property is deliberate: Tailwind has no inset-inline-start-*
            scale, and the first attempt wrote one, which silently did nothing
            and left an inline style doing the actual work.
          */}
          <Search
            aria-hidden
            size={16}
            className="pointer-events-none absolute top-1/2 -translate-y-1/2 text-gray-500 [inset-inline-start:0.75rem]"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('search.placeholder')}
            aria-label={t('search.label')}
            // ps-9 leaves room for the icon at the start side in both
            // directions; a pl- here would put the text under the icon in
            // Arabic.
            className={cn(
              'h-9 w-full rounded-btn border border-gray-200 bg-gray-50 ps-9 pe-3',
              'text-body text-gray-700 placeholder:text-gray-500',
              'focus:border-gray-400 focus:bg-white focus:outline-none'
            )}
          />
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="p-6 text-center">
          <p className="text-body font-medium text-gray-700">{t('search.noMatches')}</p>
          <p className="mt-1 text-caption text-gray-500">{t('search.noMatchesBody')}</p>
        </div>
      ) : (
        <ul className="divide-y divide-gray-200">
          {visible.map((row) => {
            const Icon = SOURCE_ICON[row.source];
            const isActive = row.id === activeId;

            return (
              <li key={row.id}>
                <Link
                  href={row.href}
                  aria-current={isActive ? 'true' : undefined}
                  className={cn(
                    'flex w-full items-start gap-3 p-4 ps-[14px] text-start transition-colors',
                    // A syn-red edge on the open row, never a filled red panel
                    // — design.md §4 keeps red rare.
                    isActive
                      ? 'border-s-2 border-action bg-gray-50'
                      : 'border-s-2 border-transparent hover:bg-gray-50'
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      'mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-sm',
                      row.source === 'portal'
                        ? 'bg-legal-navy/8 text-legal-navy'
                        : 'bg-gray-100 text-gray-500'
                    )}
                  >
                    <Icon size={14} strokeWidth={1.8} />
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                      <span
                        className={
                          row.unread
                            ? 'text-body font-medium text-gray-700'
                            : 'text-body text-gray-600'
                        }
                      >
                        <bdi>{row.from}</bdi>
                      </span>
                      <span className="text-caption text-gray-500 [unicode-bidi:isolate]">
                        {row.timeLabel}
                      </span>
                    </div>

                    <p className="mt-0.5 truncate text-caption text-gray-600">
                      <bdi>{row.subject}</bdi>
                    </p>

                    {/*
                      Only a portal row has a body to preview. The other two
                      sources are notices that something arrived, and inventing
                      two lines for them is what would make the three look
                      alike. See `InboxItemRecord.preview`.
                    */}
                    {row.preview ? (
                      <p className="mt-0.5 line-clamp-2 text-caption text-gray-500">
                        <bdi>{row.preview}</bdi>
                      </p>
                    ) : null}

                    <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <Badge tone={row.source === 'portal' ? 'info' : 'neutral'} icon={null}>
                        {t(`sources.${row.source}`)}
                      </Badge>

                      {/* Latin in both locales — see lib/format.ts. Absent on
                          the sources that have no engagement recorded, which is
                          the honest form of the export's red "Unlinked Matter"
                          flag: nothing is unlinked, the message simply is not
                          in this product. */}
                      {row.engagementRef ? (
                        <span
                          dir="ltr"
                          className="rounded-sm bg-gray-100 px-1.5 py-0.5 font-mono text-reference text-gray-600"
                        >
                          {row.engagementRef}
                        </span>
                      ) : null}

                      {row.awaitingReply ? (
                        <Badge tone="warning">{t('awaitingReply')}</Badge>
                      ) : null}

                      {row.forStaff ? (
                        <Badge tone="neutral" icon={null}>
                          {t('forStaff', { name: row.forStaff })}
                        </Badge>
                      ) : null}
                      {!row.forStaff && row.personal ? (
                        <Badge tone="neutral" icon={null}>
                          {t('toYou')}
                        </Badge>
                      ) : null}
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {/* Says what is on screen, from the pass that put it there. While a
          search is running it reports the narrowing rather than the inbox, so
          the number never describes a list the reader cannot see. */}
      <p className="border-t border-gray-200 p-4 text-caption text-gray-500">
        {searching
          ? t('search.footer', { shown: visible.length, total: rows.length })
          : t('footer', { shown: visible.length, unread: unreadShown })}
      </p>
    </>
  );
}

export default InboxList;
