import type { LucideIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { EmptyState, tabTriggerClasses } from '@/components/ui';
import { formatCalendarDate, formatRelativeDays } from '@/lib/format';
import { Link } from '@/lib/i18n/navigation';
import type { Locale } from '@/lib/i18n/routing';
import {
  REGISTER_SOON_DAYS,
  STAFF_REGISTER_FILTERS,
  type StaffRegisterFilter,
  type StaffRegisterList,
} from '@/lib/mock-api';
import { cn } from '@/lib/utils';
import { StaffTopBar } from '../../StaffChrome';
import { RegisterTable, type RegisterRowData } from './RegisterTable';
import { registerQuery, type RegisterSelected } from './register-query';

/**
 * A register screen: the segment strip, and the table under it.
 *
 * Server-side, because this is where the locale is — every row arrives at
 * RegisterTable already resolved to one language, the same rule InboxList.tsx
 * and ClientsTable.tsx follow. Functions cannot cross the boundary into a
 * Client Component, and neither can a `Record<Locale, string>` that still needs
 * deciding.
 *
 * Both routes render this. What differs between them is the collection the
 * server read, the words (`namespace`) and the links (`basePath`).
 */
export function RegisterView({
  locale,
  namespace,
  basePath,
  icon,
  filter,
  result,
  selected,
  canReopen,
  bulk,
  action,
}: {
  locale: Locale;
  namespace: 'staffMatters';
  basePath: '/staff/matters';
  /** The nav's own icon for this register, for the empty state. */
  icon: LucideIcon;
  filter: StaffRegisterFilter;
  result: StaffRegisterList;
  selected: RegisterSelected;
  /** Whether the reader may reopen an archived matter — a partner. */
  canReopen: boolean;
  /** Everything the bulk bar needs — see RegisterSelection.tsx. */
  bulk: {
    csvHeadings: string[];
    fileStem: string;
    today: string;
    leadOptions: { value: string; label: string }[] | null;
  };
  /**
   * Optional control above the segment strip — today the matters register's
   * "New matter" link, rendered only for a rank that may use it.
   *
   * A slot rather than a flag: projects has no equivalent yet, and giving this
   * shared component a `showNewMatter` boolean would make one register know
   * about the other's actions.
   */
  action?: React.ReactNode;
}) {
  const t = useTranslations(namespace);
  const tType = useTranslations('staffMatters.types');
  const tTypes = useTranslations('staffMatters.typesPlural');
  const tRole = useTranslations('staffDashboard.engagements.role');

  const rows: RegisterRowData[] = result.items.map((row) => ({
    reference: row.reference,
    typeLabel: tType(row.workType),
    leadReassigned: row.leadReassignedThisSession,
    title: row.title[locale],
    category: row.category[locale],
    venue: row.venue[locale],
    status: row.status[locale],
    statusTone: row.statusTone,
    registryNumber: row.registryNumber,
    clientName: row.clientName[locale],
    clientHref: `/staff/clients/${row.clientId}`,
    team: row.team.map((member) => ({
      name: member.name[locale],
      role: member.role === 'lead' ? t('team.lead') : tRole(member.role),
      isLead: member.role === 'lead',
    })),
    lastUpdated: formatRelativeDays(row.lastUpdatedOn, locale),
    nextDate: row.nextDate
      ? {
          title: row.nextDate.title[locale],
          date: formatCalendarDate(row.nextDate.on, locale, { month: 'short' }),
          // The same threshold the "due within a fortnight" segment uses, from
          // the same constant — so a row can never be badged soon while the
          // segment that counts soon rows leaves it out.
          soon: row.nextDate.inDays <= REGISTER_SOON_DAYS,
        }
      : null,
    active: row.active,
    closedOn: row.closedOn ? formatCalendarDate(row.closedOn, locale, { month: 'short' }) : null,
    reopened: row.reopenedThisSession,
    needsAttention: row.needsAttention,
    href: `${basePath}/${row.reference}`,
  }));

  const facets = {
    // Plural in the dropdown ("Contracts"), singular on the row ("Contract"),
    // the way the client's mockup uses the two forms.
    types: result.types.map((f) => ({ value: f.value, label: tTypes(f.value), count: f.count })),
    clients: result.clients.map((f) => ({ ...f, label: f.label[locale] })),
    venues: result.venues.map((f) => ({ ...f, label: f.label[locale] })),
    leads: result.leads.map((f) => ({ ...f, label: f.label[locale] })),
  };

  return (
    <>
      {/* The whole register, open and archived: it is the firm's book. */}
      <StaffTopBar title={t('title')} subtitle={t('subtitle', { count: result.counts.register })} />

      <main className="mx-auto flex w-full max-w-content flex-1 flex-col gap-5 px-6 py-6">
        {/*
          ===================================================================
          A REGISTER WITH NOTHING ON IT IS NOT A VIEW THAT MATCHED NOTHING
          ===================================================================
          `counts.all` is the whole register, before the segment and before the
          dropdowns — so zero here means no matter has ever been opened, not
          that the reader has narrowed their way to an empty screen. They are
          different facts and they were getting the same sentence, which told
          somebody with nothing selected to clear their filters.

          The segment strip goes with it. All five counts would read zero and
          every one of them leads back here, which is the same reasoning the
          client portal's documents screen uses to drop its filter strip rather
          than render a row of dead ends.

          `action` survives as the empty state's own action, because on a
          register with nothing on it "New matter" stops being one control
          among several and becomes the only thing to do. Projects has no
          equivalent yet and correctly gets no button.
        */}
        {result.counts.register === 0 ? (
          <EmptyState
            icon={icon}
            title={t('empty.noneTitle')}
            body={t('empty.noneBody')}
            action={action}
          />
        ) : (
        <>
        {/*
          Five questions about one register, not a status partition — so no
          total is claimed for them. See `StaffRegisterFilter`.
        */}
        {/*
          ACTIVE | ARCHIVE. The client's own control (the mockup's "القائمة |
          الأرشيف" pill over each register): closed matters leave the main list
          and are read here instead. Links, not buttons, because each half is a
          view worth linking to. The dropdowns reset on a switch: options
          counted over one half are not options over the other.
        */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <nav
            aria-label={t('views.label')}
            className="inline-flex gap-1 rounded-pill border border-gray-200 bg-white p-1"
          >
            {(['active', 'archive'] as const).map((value) => {
              const current = (selected.view ?? 'active') === value;
              return (
                <Link
                  key={value}
                  href={{ pathname: basePath, query: value === 'archive' ? { view: 'archive' } : {} }}
                  aria-current={current ? 'page' : undefined}
                  className={cn(
                    'inline-flex min-h-9 items-center gap-2 rounded-pill px-4 text-caption font-medium transition-colors max-tablet:min-h-11',
                    current ? 'bg-action text-white' : 'text-gray-700 hover:bg-gray-100'
                  )}
                >
                  {t(`views.${value}`)}
                  <span
                    className={cn(
                      'font-mono text-reference [unicode-bidi:isolate]',
                      current ? 'text-white' : 'text-gray-500'
                    )}
                  >
                    {value === 'archive' ? result.counts.archived : result.counts.all}
                  </span>
                </Link>
              );
            })}
          </nav>
          {action}
        </div>

        {selected.view === 'archive' ? (
          <p className="text-body text-gray-600">{t('archive.intro')}</p>
        ) : (
        <nav
          aria-label={t('segments.label')}
          className="flex gap-1 overflow-x-auto border-b border-gray-200"
        >
          {STAFF_REGISTER_FILTERS.map((value) => (
            <Link
              key={value}
              href={{
                pathname: basePath,
                // The dropdowns survive a segment change; they narrow the
                // register, not the segment.
                query: registerQuery(value === 'all' ? undefined : value, selected),
              }}
              aria-current={value === filter ? 'page' : undefined}
              className={cn(tabTriggerClasses(value === filter), 'whitespace-nowrap')}
            >
              {t(`segments.${value}`)}
              <span className="font-mono text-reference text-gray-500 [unicode-bidi:isolate]">
                {result.counts[value]}
              </span>
            </Link>
          ))}
        </nav>
        )}

        <RegisterTable
          namespace={namespace}
          basePath={basePath}
          rows={rows}
          facets={facets}
          selected={selected}
          segment={filter === 'all' || selected.view === 'archive' ? undefined : filter}
          canReopen={canReopen}
          bulk={bulk}
        />
        </>
        )}
      </main>
    </>
  );
}

/** An unrecognised `?segment=` falls back to the whole register, never an error. */
export function toRegisterFilter(value: string | undefined): StaffRegisterFilter {
  return value !== undefined && (STAFF_REGISTER_FILTERS as string[]).includes(value)
    ? (value as StaffRegisterFilter)
    : 'all';
}
