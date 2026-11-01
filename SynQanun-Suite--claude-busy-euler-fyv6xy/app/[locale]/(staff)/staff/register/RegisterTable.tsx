'use client';

import * as React from 'react';
import { Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import {
  Badge,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  type BadgeTone,
} from '@/components/ui';
import { Link, useRouter } from '@/lib/i18n/navigation';
import { ReopenMatterButton } from '../matters/ReopenMatterButton';
import { RegisterSelection } from './RegisterSelection';
import { registerQuery, type RegisterSelected } from './register-query';
import { MIN_QUERY_LENGTH, matchesQuery } from '@/lib/search';
import { cn } from '@/lib/utils';

/**
 * A register's table and its narrowing controls.
 *
 * ===========================================================================
 * ONE TABLE, TWO VOCABULARIES
 * ===========================================================================
 * Matters and projects are separate registers over the same shape, so this
 * renders both and takes the words as a translation namespace. `staffMatters`
 * says "Forum" and "Closed"; `staffProjects` says "Jurisdiction" and
 * "Completed". The two namespaces carry the same keys, which is duplication —
 * and the alternative, one namespace with per-kind overrides, buries the
 * difference in lookups instead of putting it where a translator can read it.
 *
 * This is the same call the client portal already made: EngagementTable.tsx is
 * shared by the client's own matters and projects lists.
 *
 * ===========================================================================
 * WHAT LIVES IN THE URL AND WHAT DOES NOT
 * ===========================================================================
 * The same split every screen in this product makes: a VIEW goes in the URL, a
 * half-typed string does not. The segment and the three dropdowns are views —
 * worth linking to, worth keeping on a reload, worth sending to a colleague —
 * so they are query parameters and the server does the filtering. The search
 * box is a transient narrowing of what is already on screen and lives here.
 *
 * That is also why the dropdowns navigate rather than filtering in place: a
 * filter the server did not apply is a filter that only sees the page it was
 * given, which is right over nine rows and wrong over nine hundred.
 */

export interface RegisterFacetOption {
  value: string;
  label: string;
  count: number;
}

export interface RegisterRowData {
  reference: string;
  /** The kind of work, already in the reader's language — the row's badge. */
  typeLabel: string;
  /** True when this session changed who leads it. See lib/mock-api.ts. */
  leadReassigned: boolean;
  title: string;
  category: string;
  venue: string;
  status: string;
  statusTone: BadgeTone;
  registryNumber: string | null;
  clientName: string;
  clientHref: string;
  team: { name: string; role: string; isLead: boolean }[];
  lastUpdated: string;
  nextDate: { title: string; date: string; soon: boolean } | null;
  active: boolean;
  /** When it closed, formatted, or `null` for an open file. */
  closedOn: string | null;
  /** Reopened by a partner this session. §5.1: it says so. */
  reopened: boolean;
  needsAttention: boolean;
  href: string;
}

export function RegisterTable({
  namespace,
  basePath,
  rows,
  facets,
  selected,
  segment,
  canReopen,
  bulk,
}: {
  /** `staffMatters`. A prop so the table never hard-codes its words. */
  namespace: string;
  /** Every link is built from it. */
  basePath: '/staff/matters';
  rows: RegisterRowData[];
  facets: {
    types: RegisterFacetOption[];
    clients: RegisterFacetOption[];
    venues: RegisterFacetOption[];
    leads: RegisterFacetOption[];
  };
  selected: RegisterSelected;
  segment?: string;
  /** A partner reads the Archive with a Reopen control on each row. */
  canReopen: boolean;
  /** Everything the bulk bar needs. See RegisterSelection.tsx. */
  bulk: {
    csvHeadings: string[];
    fileStem: string;
    today: string;
    leadOptions: { value: string; label: string }[] | null;
  };
}) {
  const t = useTranslations(namespace);
  const router = useRouter();
  const [query, setQuery] = React.useState('');
  const archive = selected.view === 'archive';
  /*
    Said here, not in the row: a reopened matter leaves the Archive as soon as
    the register refreshes, so a message inside its row would leave with it.
  */
  const [reopenedRef, setReopenedRef] = React.useState<string | null>(null);
  /*
    Selection is CLIENT state, not URL state — the opposite call from the
    filters beside it. A filter describes what you are looking at and belongs
    in a link somebody can send; a selection is a gesture in progress, and four
    matter references in the address bar would be both noise and a privileged
    list pasted into every history and proxy log on the way.
  */
  const [picked, setPicked] = React.useState<Set<string>>(() => new Set());

  const trimmed = query.trim();
  const searching = trimmed.length >= MIN_QUERY_LENGTH;

  const visible = React.useMemo(() => {
    if (!searching) return rows;
    return rows.filter((row) =>
      matchesQuery(
        [
          row.reference,
          row.title,
          row.typeLabel,
          row.category,
          row.venue,
          row.clientName,
          row.registryNumber ?? '',
        ],
        trimmed
      )
    );
  }, [rows, trimmed, searching]);

  /** Rebuild the whole query string, so clearing one dropdown keeps the rest. */
  const go = (key: keyof RegisterSelected, value: string) => {
    router.push({
      pathname: basePath,
      query: registerQuery(segment, { ...selected, [key]: value || undefined }),
    });
  };

  const narrowed = Boolean(selected.type || selected.client || selected.venue || selected.lead);

  const columns = {
    self: t('columns.self'),
    client: t('columns.client'),
    venue: t('columns.venue'),
    status: t('columns.status'),
    team: t('columns.team'),
    next: t('columns.next'),
    updated: t('columns.updated'),
  };

  return (
    <>
      <div className="flex flex-col gap-3">
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

        {/*
          Every option is derived from the register and carries the number of
          rows it would leave — so inside a view that HAS rows, no option can
          return nothing.

          That claim used to be made unconditionally and was false the moment
          the view itself was empty: `/staff/projects?segment=mine` is zero rows
          under a Lead dropdown offering "Rami Al-Khatib (2)" and a Client
          dropdown offering "Gulf Holdings (5)", because the counts are scoped
          to the whole register rather than to what is on screen. Three
          dropdowns whose every option leads to another empty list are a row of
          dead ends, which is the thing the client portal's documents screen
          drops its filter strip to avoid.

          Gated on `rows`, not `visible`: `rows` is what the server returned for
          this view, so `rows.length === 0` is exactly "no option here can
          return anything". A search that matched nothing leaves the dropdowns
          up, because clearing the search brings their rows back.
        */}
        {rows.length === 0 ? null : (
        <div className="grid grid-cols-1 gap-3 tablet:grid-cols-2 desktop:grid-cols-4">
          {(
            [
              // The kind of work first: the client's own way into the register.
              ['type', facets.types, t('filters.allTypes'), t('filters.type')],
              ['client', facets.clients, t('filters.allClients'), t('filters.client')],
              ['venue', facets.venues, t('filters.allVenues'), t('filters.venue')],
              ['lead', facets.leads, t('filters.allLeads'), t('filters.lead')],
            ] as const
          ).map(([key, options, allLabel, label]) => (
            <label key={key} className="flex flex-col gap-1">
              <span className="text-caption text-gray-500">{label}</span>
              <Select value={selected[key] ?? ''} onChange={(event) => go(key, event.target.value)}>
                <option value="">{allLabel}</option>
                {options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {`${option.label} (${option.count})`}
                  </option>
                ))}
              </Select>
            </label>
          ))}
        </div>
        )}

        {narrowed && rows.length > 0 ? (
          <Link
            href={{ pathname: basePath, query: registerQuery(segment, { view: selected.view }) }}
            className="w-fit text-caption text-legal-navy hover:underline"
          >
            {t('filters.clear')}
          </Link>
        ) : null}
      </div>

      {/* Polite, and always in the page, so the announcement is not lost
          when the row it came from leaves the list. */}
      <p role="status" aria-live="polite" className={reopenedRef ? 'text-body text-gray-700' : 'sr-only'}>
        {reopenedRef ? t('reopen.done', { reference: reopenedRef }) : ''}
      </p>

      {visible.length === 0 ? (
        <div className="rounded-card border border-dashed border-gray-200 bg-white p-10 text-center">
          <p className="text-body font-medium text-gray-700">
            {searching
              ? t('search.noMatches')
              : archive && !narrowed
                ? t('archive.emptyTitle')
                : t('empty.title')}
          </p>
          <p className="mt-1 text-caption text-gray-500">
            {searching
              ? t('search.noMatchesBody')
              : archive && !narrowed
                ? t('archive.emptyBody')
                : t('empty.body')}
          </p>

          {/*
            A WAY OUT, BECAUSE THE OLD COPY NAMED ONE THAT WAS NOT THERE.
            The body used to read "Clear the filters to see all of it" for every
            non-search empty — including `?segment=mine` with nothing applied,
            where the Clear link above is absent because `narrowed` is false. So
            the screen told the reader to do something it did not offer.

            This link goes to the bare register: no segment, no dropdowns. It is
            the only control left on an empty view, which is why it is a link
            here rather than a fourth dead dropdown above.
          */}
          {!searching && (narrowed || segment) ? (
            <Link
              href={{ pathname: basePath, query: registerQuery(undefined, { view: selected.view }) }}
              className="mt-4 inline-block text-caption text-legal-navy hover:underline"
            >
              {t('empty.showAll')}
            </Link>
          ) : null}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {/* Above the table, not floating over it: a bar that covers rows is a
              bar that hides what was selected. */}
          <RegisterSelection
            rows={visible}
            selected={picked}
            onClear={() => setPicked(new Set())}
            csvHeadings={bulk.csvHeadings}
            fileStem={bulk.fileStem}
            today={bulk.today}
            leadOptions={bulk.leadOptions}
          />

        <div className="overflow-hidden rounded-card border border-gray-200 bg-white">
          {/* Seven columns of text. Below 1088px the register scrolls inside
              its own container rather than compressing every caption to one
              word per line; below 768px <Table> stacks it into cards, which is
              why the floor is only applied from tablet up. */}
          <Table striped className="tablet:min-w-[68rem]">
            <TableHead>
              <TableRow>
                <TableHeaderCell className="w-10">
                  {/*
                    Selects what is VISIBLE, not what exists. With a filter or a
                    search applied those are different sets, and a control that
                    silently reached past the filter would hand somebody rows
                    they cannot see. Unchecked on load, always — the export
                    ships this ticked.
                  */}
                  <input
                    type="checkbox"
                    aria-label={t('bulkSelectAll')}
                    className="h-4 w-4 accent-action"
                    checked={visible.length > 0 && visible.every((row) => picked.has(row.reference))}
                    onChange={(event) =>
                      setPicked(
                        event.target.checked
                          ? new Set(visible.map((row) => row.reference))
                          : new Set()
                      )
                    }
                  />
                </TableHeaderCell>
                <TableHeaderCell>{columns.self}</TableHeaderCell>
                <TableHeaderCell>{columns.client}</TableHeaderCell>
                <TableHeaderCell>{columns.venue}</TableHeaderCell>
                <TableHeaderCell>{columns.status}</TableHeaderCell>
                <TableHeaderCell>{columns.team}</TableHeaderCell>
                {/* The Archive answers when a file closed, not what is next on it. */}
                <TableHeaderCell>{archive ? t('archive.closed') : columns.next}</TableHeaderCell>
                {archive ? null : <TableHeaderCell>{columns.updated}</TableHeaderCell>}
                {archive && canReopen ? (
                  <TableHeaderCell>
                    <span className="sr-only">{t('reopen.action')}</span>
                  </TableHeaderCell>
                ) : null}
              </TableRow>
            </TableHead>
            <TableBody>
              {visible.map((row) => (
                <TableRow key={row.reference} className="h-auto align-top">
                  <TableCell className="py-3">
                    <input
                      type="checkbox"
                      aria-label={row.reference}
                      className="h-4 w-4 accent-action"
                      checked={picked.has(row.reference)}
                      onChange={(event) =>
                        setPicked((current) => {
                          const next = new Set(current);
                          if (event.target.checked) next.add(row.reference);
                          else next.delete(row.reference);
                          return next;
                        })
                      }
                    />
                  </TableCell>
                  {/* The row's identity — no `label`, so it reads as the card's
                      heading below 768px. See components/ui/Table.tsx. */}
                  <TableCell className="py-3">
                    <Link href={row.href} className="group block">
                      <span className="flex flex-wrap items-center gap-2">
                        {/* Latin in every locale — lib/format.ts. */}
                        <span dir="ltr" className="font-mono text-reference text-legal-navy">
                          {row.reference}
                        </span>
                        <Badge tone="neutral" icon={null}>
                          {row.typeLabel}
                        </Badge>
                      </span>
                      <span className="mt-0.5 block text-body-emphasis text-gray-700 group-hover:underline">
                        <bdi>{row.title}</bdi>
                      </span>
                      {row.reopened ? (
                        <span className="mt-0.5 block text-caption text-gray-600">
                          {t('reopen.thisSession')}
                        </span>
                      ) : null}
                      <span className="mt-0.5 block text-caption text-gray-500">
                        <bdi>{row.category}</bdi>
                        {row.registryNumber ? (
                          <>
                            {' · '}
                            <span dir="ltr" className="font-mono text-reference">
                              {row.registryNumber}
                            </span>
                          </>
                        ) : null}
                      </span>
                    </Link>
                  </TableCell>

                  <TableCell label={columns.client} className="py-3">
                    {/* The client's own record is one click away — a register is
                        the only screen that joins the two directories. */}
                    <Link href={row.clientHref} className="text-gray-700 hover:underline">
                      <bdi>{row.clientName}</bdi>
                    </Link>
                  </TableCell>

                  <TableCell label={columns.venue} className="py-3">
                    <bdi>{row.venue}</bdi>
                  </TableCell>

                  <TableCell label={columns.status} className="py-3">
                    <span className="flex flex-wrap items-center gap-1.5">
                      <Badge tone={row.statusTone} icon={null}>
                        {row.status}
                      </Badge>
                      {/* `needsAttention` means the CLIENT owes something. The
                          exports badge these "PRIORITY HIGH" and "Urgent
                          Injunction"; there is no priority field, and this is
                          not one. */}
                      {row.active && row.needsAttention ? (
                        <Badge tone="warning">{t('waitingOnClient')}</Badge>
                      ) : null}
                    </span>
                  </TableCell>

                  <TableCell label={columns.team} className="py-3">
                    <span className="block text-gray-700">
                      <bdi>{row.team.find((member) => member.isLead)?.name ?? t('team.none')}</bdi>
                    </span>
                    {/* §5.1: a session-scoped change says so. Without it the
                        lead column simply reads a different name than it did,
                        with nothing marking it as this session's doing. */}
                    {row.leadReassigned ? (
                      <span className="mt-0.5 block text-caption text-gray-500">
                        {t('leadReassigned')}
                      </span>
                    ) : null}
                    {row.team.length > 1 ? (
                      <span className="mt-0.5 block text-caption text-gray-500">
                        {row.team
                          .filter((member) => !member.isLead)
                          .map((member) => `${member.name} · ${member.role}`)
                          .join(' — ')}
                      </span>
                    ) : null}
                  </TableCell>

                  {archive ? (
                    <TableCell label={t('archive.closed')} className="py-3 [unicode-bidi:isolate]">
                      {row.closedOn}
                    </TableCell>
                  ) : (
                  <TableCell label={columns.next} className="py-3">
                    {row.nextDate ? (
                      <>
                        <span className="block [unicode-bidi:isolate]">
                          {row.nextDate.date}
                          {row.nextDate.soon ? (
                            <span className="ms-1.5 text-action-pressed">{t('soon')}</span>
                          ) : null}
                        </span>
                        <span className="mt-0.5 block text-caption text-gray-500">
                          <bdi>{row.nextDate.title}</bdi>
                        </span>
                      </>
                    ) : (
                      <span className="text-gray-500">{t('noNextDate')}</span>
                    )}
                  </TableCell>
                  )}

                  {archive ? null : (
                    <TableCell label={columns.updated} className="py-3 [unicode-bidi:isolate]">
                      {row.lastUpdated}
                    </TableCell>
                  )}

                  {archive && canReopen ? (
                    <TableCell className="py-3">
                      <ReopenMatterButton reference={row.reference} onReopened={setReopenedRef} />
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        </div>
      )}

      {/* The order is stated, not offered as a control. */}
      <p className="text-caption text-gray-500">
        {searching
          ? t('footerFiltered', { shown: visible.length, total: rows.length })
          : archive
            ? t('archive.footer', { count: rows.length })
            : t('footer', { count: rows.length })}
        {' · '}
        {/* Most recently moved first; on a closed file its last movement is
            its closing, so in the Archive that reads as most recently closed. */}
        {archive ? t('archive.sortedBy') : t('sortedBy')}
      </p>
    </>
  );
}

export default RegisterTable;
