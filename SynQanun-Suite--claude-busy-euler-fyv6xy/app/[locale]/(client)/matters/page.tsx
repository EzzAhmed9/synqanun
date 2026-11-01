import { Scale } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { EmptyState } from '@/components/ui';
import { formatCalendarDate } from '@/lib/format';
import type { Locale } from '@/lib/i18n/routing';
import { MATTER_FILTERS, mockApi, type MatterFilter, type MatterRecord } from '@/lib/mock-api';
import { ClientTopBar } from '../ClientPortalChrome';
import { EngagementFilterNav } from '../EngagementFilterNav';
import { EngagementTable, type EngagementRowData } from '../EngagementTable';

/**
 * My Matters — the client's full list of legal files.
 *
 * The table and the filter strip are shared with the projects list; see
 * EngagementTable.tsx and EngagementFilterNav.tsx. This file fetches matters
 * and names the columns.
 *
 * ---------------------------------------------------------------------------
 * NOT CARRIED OVER FROM THE STITCH EXPORT
 * ---------------------------------------------------------------------------
 *  · THE CONTRADICTORY COUNTS — "6 active legal matters" beside "All (6) …
 *    Closed (1)". See the note in EngagementFilterNav.tsx.
 *  · THE PHANTOM DROPDOWN OPTIONS — two of the export's seven forums match no
 *    matter in the list. Options come from the data.
 *  · "Adv." / "المستشار" / "المستشارة" before counsel names — the Arabic form
 *    is gendered and the export assigns gender by inference.
 *  · THE ARABIC-ONLY EXTRAS: a red "بوابة العملاء" chip beside the title and a
 *    booking button in the top bar, neither of which exists in English.
 *  · THE PULSING RED ATTENTION DOT, the per-type colour dots, the all-caps
 *    table headers, and the whole-row click handler.
 */

/** Rendered per request, because `lastUpdatedOn` resolves against the tenant's
 *  clock. Same reasoning as the dashboard; goes away with the fixtures. */
export const dynamic = 'force-dynamic';

function isMatterFilter(value: string | undefined): value is MatterFilter {
  return value !== undefined && (MATTER_FILTERS as string[]).includes(value);
}

export default async function MattersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const [{ locale }, { status }] = await Promise.all([params, searchParams]);
  setRequestLocale(locale);

  // An unrecognised ?status= falls back to "all" rather than erroring. A filter
  // is a view preference arriving from a link someone may have edited or kept
  // from an older build; the right response is to show the list.
  const filter: MatterFilter = isMatterFilter(status) ? status : 'all';

  const [result, forums] = await Promise.all([
    mockApi.matters.list({ filter }),
    mockApi.matters.forums(),
  ]);

  return (
    <Matters
      locale={locale as Locale}
      filter={filter}
      counts={result.counts}
      matters={result.items}
      forums={forums.map((forum) => forum[locale as Locale])}
    />
  );
}

function Matters({
  locale,
  filter,
  counts,
  matters,
  forums,
}: {
  locale: Locale;
  filter: MatterFilter;
  counts: Record<MatterFilter, number>;
  matters: MatterRecord[];
  forums: string[];
}) {
  const t = useTranslations('matters');

  // Flattened here, where the locale is, so the client component never has to
  // resolve a language.
  const rows: EngagementRowData[] = matters.map((matter) => ({
    id: matter.id,
    reference: matter.reference,
    href: `/matters/${matter.reference}`,
    title: matter.title[locale],
    category: matter.matterType[locale],
    venue: matter.forum[locale],
    lead: matter.leadCounsel[locale],
    status: matter.status[locale],
    statusTone: matter.statusTone,
    needsAttention: matter.needsAttention,
    attentionReason: matter.attentionReason?.[locale] ?? null,
    inactive: !matter.active,
    lastUpdatedOn: matter.lastUpdatedOn,
    lastUpdatedLabel: formatCalendarDate(matter.lastUpdatedOn, locale),
  }));

  return (
    <>
      <ClientTopBar title={t('title')} subtitle={t('subtitle')} />

      <main className="mx-auto flex w-full max-w-content flex-1 flex-col gap-5 px-6 py-6">
        {/* No matters at all is a different state from a filter matching none
            — see components/ui/EmptyState.tsx. */}
        {counts.all === 0 ? (
          <EmptyState icon={Scale} title={t('emptyNone')} body={t('emptyNoneBody')} />
        ) : (
          <>
            <EngagementFilterNav
              values={MATTER_FILTERS}
              active={filter}
              counts={counts}
              pathname="/matters"
              namespace="matters"
            />

            <EngagementTable rows={rows} filterOptions={forums} namespace="matters" />
          </>
        )}
      </main>
    </>
  );
}
