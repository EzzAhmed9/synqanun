import { ArrowLeft, Receipt } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { staffRouteAllows } from '@/components/chrome/nav-items';
import { Link } from '@/lib/i18n/navigation';
import type { Locale } from '@/lib/i18n/routing';
import { mockApi, type InvoiceDraftContext } from '@/lib/mock-api';
import { StaffTopBar } from '../../../StaffChrome';
import { RouteNotPermitted } from '../../RouteNotPermitted';
import { InvoiceBuilder } from './InvoiceBuilder';

/**
 * Raise a fee statement — BUILD_PLAN.md §3, Batch 6.
 *
 * ===========================================================================
 * THE FILE IS IN THE URL AND THE NARRATIVE IS NOT
 * ===========================================================================
 * Choosing a file re-runs this route, because its unbilled time has to be
 * fetched — the alternative is shipping every engagement's ledger to the
 * browser so that a `<select>` can filter it, which is the privilege defect
 * this codebase has refused on four screens now.
 *
 * A reference is safe to put there: it is already in the path on the matter's
 * own screen, and it names a file rather than describing work. What does NOT go
 * near the address bar is the billing narrative — that is privileged, and it is
 * posted.
 *
 * ===========================================================================
 * SAME GATE AS THE LEDGER, AND IT RUNS BEFORE THE QUERY
 * ===========================================================================
 * Partner and senior associate, `staffRouteAllows(rank, 'billing')` — the
 * allow-list the nav and /staff/billing already share, rather than a third
 * one. Deciding what a client is asked to pay is not a lesser act than reading
 * what they have been asked to pay before.
 *
 * The gate runs before anything is fetched, so unbilled time on the firm's
 * files never enters the payload for a rank that may not raise a bill. The
 * Server Action checks again; see save-draft-action.ts.
 */

export const dynamic = 'force-dynamic';

export default async function NewInvoicePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ engagement?: string }>;
}) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  setRequestLocale(locale);

  const me = await mockApi.staff.currentStaff();

  if (!staffRouteAllows(me.rank, 'billing')) {
    const t = await getTranslations('invoiceBuilder');
    const tRank = await getTranslations('ranks');
    return (
      <RouteNotPermitted
        icon={Receipt}
        pageTitle={t('title')}
        subtitle={t('subtitle')}
        title={t('notPermitted.title')}
        // The BARE category, not `holder` — it lands inside a sentence.
        body={t('notPermitted.body', { rank: tRank(me.rank) })}
      />
    );
  }

  // An unrecognised reference simply seeds nothing, rather than erroring: the
  // allow-list is the engagement index itself, inside the endpoint.
  const context = await mockApi.staff.invoiceDraftContext(query.engagement);

  return (
    <Builder
      locale={locale as Locale}
      context={context}
      engagementRef={query.engagement ?? ''}
    />
  );
}

function Builder({
  locale,
  context,
  engagementRef,
}: {
  locale: Locale;
  context: InvoiceDraftContext;
  engagementRef: string;
}) {
  const t = useTranslations('invoiceBuilder');

  return (
    <>
      <StaffTopBar title={t('title')} subtitle={t('subtitle')} />

      <main className="mx-auto flex w-full max-w-content flex-1 flex-col gap-5 px-6 py-6">
        <Link
          href="/staff/billing"
          className="inline-flex w-fit items-center gap-1.5 text-caption text-legal-navy hover:underline"
        >
          {/* A direction, so it mirrors. design.md §12. */}
          <ArrowLeft aria-hidden size={14} className="rtl:rotate-180" />
          {t('back')}
        </Link>

        <InvoiceBuilder
          locale={locale}
          // Flattened here, because this is where the locale is.
          engagements={context.engagements.map((row) => ({
            value: row.value,
            label: typeof row.label === 'object' ? (row.label[locale] || row.label.ar || row.label.en || row.value) : String(row.label || row.value),
          }))}
          engagementRef={engagementRef}
          unbilled={context.unbilled.map((entry: any) => {
            const desc =
              typeof entry.description === 'string'
                ? entry.description
                : entry.description?.[locale] ||
                  entry.description?.ar ||
                  entry.description?.en ||
                  '';
            const staff =
              typeof entry.staffName === 'string'
                ? entry.staffName
                : entry.staffName?.[locale] ||
                  entry.staffName?.ar ||
                  entry.staffName?.en ||
                  '';
            return {
              id: entry.id,
              on: entry.on,
              minutes: entry.minutes,
              description: desc,
              staffName: staff,
            };
          })}
          currency={context.currency}
          ledgerHref="/staff/billing"
        />
      </main>
    </>
  );
}
