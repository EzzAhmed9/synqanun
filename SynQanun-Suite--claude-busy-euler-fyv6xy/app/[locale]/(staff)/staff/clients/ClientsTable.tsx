'use client';

import * as React from 'react';
import { Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui';
import { Link } from '@/lib/i18n/navigation';
import { MIN_QUERY_LENGTH, matchesQuery } from '@/lib/search';
import { cn } from '@/lib/utils';

/**
 * The client directory, searchable.
 *
 * Same split as the Unified Inbox: the standing filter is a view and lives in
 * the URL; a half-typed search string is not and lives here. Row content
 * arrives already resolved for the locale — see InboxList.tsx for why.
 */

export interface ClientRowData {
  id: string;
  name: string;
  summary: string;
  standing: string;
  standingLabel: string;
  /** "Matters · Projects", or null where the client has no engagements. */
  engagements: string | null;
  openCorrespondence: number;
  pendingApprovals: number;
  hasPortal: boolean;
  lastActivity: string;
  href: string;
}

export function ClientsTable({
  rows,
  /** The standing currently in the URL, or undefined for the whole directory. */
  standing,
}: {
  rows: ClientRowData[];
  standing?: string;
}) {
  const t = useTranslations('clients');
  const [query, setQuery] = React.useState('');

  const trimmed = query.trim();
  const searching = trimmed.length >= MIN_QUERY_LENGTH;

  const visible = React.useMemo(() => {
    if (!searching) return rows;
    return rows.filter((row) => matchesQuery([row.name, row.summary, row.standingLabel], trimmed));
  }, [rows, trimmed, searching]);

  return (
    <>
      <div className="relative">
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
          className={cn(
            'h-9 w-full max-w-md rounded-btn border border-gray-200 bg-gray-50 ps-9 pe-3',
            'text-body text-gray-700 placeholder:text-gray-500',
            'focus:border-gray-400 focus:bg-white focus:outline-none'
          )}
        />
      </div>

      {visible.length === 0 ? (
        /*
          SEARCHED AND FOUND NOTHING IS NOT THE SAME AS FILTERED TO NOTHING.
          This used to show the search message unconditionally — so a standing
          with no clients in it read "No client matches that. Try a reference,
          part of a caption, or a client name", which is advice about a search
          box nobody had typed into.

          Genuinely-empty is handled a level up, in page.tsx, because it has to
          take the standing strip with it.
        */
        <div className="rounded-card border border-dashed border-gray-200 bg-white p-10 text-center">
          <p className="text-body font-medium text-gray-700">
            {searching ? t('search.noMatches') : t('empty.filteredTitle')}
          </p>
          <p className="mt-1 text-caption text-gray-500">
            {searching ? t('search.noMatchesBody') : t('empty.filteredBody')}
          </p>

          {/* The way back, since the only thing narrowing this is the URL. */}
          {!searching && standing ? (
            <Link
              href="/staff/clients"
              className="mt-4 inline-block text-caption text-legal-navy hover:underline"
            >
              {t('empty.showAll')}
            </Link>
          ) : null}
        </div>
      ) : (
        <ul className="divide-y divide-gray-200 overflow-hidden rounded-card border border-gray-200 bg-white">
          {visible.map((row) => (
            <li key={row.id}>
              <Link
                href={row.href}
                className="flex flex-wrap items-start justify-between gap-3 p-5 transition-colors hover:bg-gray-50"
              >
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-body-emphasis text-gray-700">
                    <bdi>{row.name}</bdi>
                    <Badge tone={row.standing === 'prospect' ? 'neutral' : 'info'} icon={null}>
                      {row.standingLabel}
                    </Badge>
                  </p>
                  <p className="mt-0.5 truncate text-caption text-gray-500">
                    <bdi>{row.summary}</bdi>
                  </p>

                  <span className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-gray-500">
                    {/* Engagements, or an explicit "none" — better than an
                        unexplained dash on a row that is otherwise populated. */}
                    <span>{row.engagements ?? t('row.noEngagements')}</span>
                    {row.openCorrespondence > 0 ? (
                      <span>{t('row.correspondence', { count: row.openCorrespondence })}</span>
                    ) : null}
                    <span className="[unicode-bidi:isolate]">
                      {t('row.lastActivity', { date: row.lastActivity })}
                    </span>
                  </span>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  {row.pendingApprovals > 0 ? (
                    <Badge tone="warning">
                      {t('row.approvals', { count: row.pendingApprovals })}
                    </Badge>
                  ) : null}
                  {row.hasPortal ? (
                    <Badge tone="success" icon={null}>
                      {t('row.portal')}
                    </Badge>
                  ) : null}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <p className="text-caption text-gray-500">
        {searching
          ? t('footerFiltered', { shown: visible.length, total: rows.length })
          : t('footer', { count: rows.length })}
      </p>
    </>
  );
}

export default ClientsTable;
