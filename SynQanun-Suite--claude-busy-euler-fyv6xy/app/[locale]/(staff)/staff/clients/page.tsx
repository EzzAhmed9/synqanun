import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { EmptyState, tabTriggerClasses } from '@/components/ui';
import { formatRelativeDays } from '@/lib/format';
import { Link } from '@/lib/i18n/navigation';
import type { Locale } from '@/lib/i18n/routing';
import { mockApi, type ClientSummary } from '@/lib/mock-api';
import type { ClientStanding } from '@/fixtures/clients';
import { cn } from '@/lib/utils';
import { UserPlus, Users } from 'lucide-react';
import { Button } from '@/components/ui';
import { StaffTopBar } from '../../StaffChrome';
import { canAddClient } from './permissions';
import { ClientsTable, type ClientRowData } from './ClientsTable';

/**
 * Clients — BUILD_PLAN.md §3, Batch 4, the CRM list.
 *
 * ===========================================================================
 * THE SCREEN THAT EXPOSED THE FIXTURE'S ONE-CLIENT LIMIT
 * ===========================================================================
 * When this screen was first built, every matter, project, invoice and document
 * in /fixtures belonged to a single portal account, so a directory of five
 * clients showed four with nothing on file. That was invisible while the only
 * reader was a client portal scoped to that one account; a directory is what
 * made it visible.
 *
 * IT HAS SINCE BEEN FIXED, in the fixtures rather than here. An engagement now
 * names its client (fixtures/matters.ts, `clientId`) independently of whether
 * that client can sign in, and every client-portal read scopes on the signed-in
 * account's own client rather than returning the whole collection
 * (lib/mock-api.ts, "Client-portal scoping"). Four of the five clients have
 * real work; one is a prospect with a fee quote out and nothing instructed,
 * which is the honest empty state rather than an artefact.
 *
 * What did NOT happen is a book of work invented to fill the screen. Each new
 * engagement is the work that client's own record already described — see the
 * note over the additions in fixtures/matters.ts. That is the single easiest
 * fabrication in this product and the one the export commits hardest: "48
 * institutional accounts", "142 open matters", "$14,820,400 YTD billings", over
 * seven visible rows.
 *
 * ---------------------------------------------------------------------------
 * NOT CARRIED OVER FROM THE STITCH EXPORT
 * ---------------------------------------------------------------------------
 *  · THE ENTIRE KPI RIBBON. "Total Accounts 48", "142 / 28 Active
 *    Engagements", "$14,820,400 YTD Institutional Billings" with an AED
 *    equivalent, "Realization Rate: 94.2%", "Retention 98.4%", "Renewal SLA Met
 *    38/39". Six figures, none of which any visible row supports and none of
 *    which the fixtures record. There is no billings figure on this screen at
 *    all, because the firm's revenue per client is not something this product
 *    knows.
 *
 *  · "AI Client Health Digest: 3 key institutional accounts up for annual
 *    retainer fee adjustment", and on the detail screen an "AI Risk &
 *    Opportunity Digest" that reads a clause, prices unbilled work at
 *    "$420,000 USD" and cites "ADGM Court of Appeal ruling 2024-CFI-009". A
 *    third screen running with invented AI analysis, and the second with a
 *    fabricated case citation.
 *
 *  · A SECTOR FILTER over sectors the fixtures do not record, and a
 *    relationship-owner filter over partners who are not assigned to clients
 *    anywhere in this product. A filter for a field that does not exist returns
 *    everything and teaches a reader that it is broken.
 *
 *  · "Add client" and "Export". Both are writes or extractions; Batch 6.
 *
 *  · Commercial licence numbers (PJSC-AD-99120, CR-88291-KSA, REIT-0491-DIFC),
 *    contact email addresses, and direct phone numbers for named individuals at
 *    client organisations. None is recorded and all of it is the kind of detail
 *    that looks most like real data.
 *
 *  · "Encrypted Tenant DB Connection", "Dedicated Instance #TX-88219",
 *    "SESSION: 8a91-fe73", "ADGM Private Dedicated Vault", "TLS 1.3
 *    End-to-End Encrypted".
 *
 *  · THE ARABIC FOOTER, which prints the same sentence three times in a row —
 *    "نسخة المستأجر: رم وشركاه (ADGM Private Dedicated Vault)" — in three
 *    adjacent spans.
 */

/** Rendered per request — every date resolves against the tenant's clock. */
export const dynamic = 'force-dynamic';

const STANDINGS: ClientStanding[] = ['retainer', 'active', 'prospect'];

export default async function StaffClientsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ standing?: string }>;
}) {
  const [{ locale }, { standing: standingParam }] = await Promise.all([params, searchParams]);
  setRequestLocale(locale);

  const standing: ClientStanding | 'all' = STANDINGS.includes(standingParam as ClientStanding)
    ? (standingParam as ClientStanding)
    : 'all';

  const [{ items }, me] = await Promise.all([
    mockApi.staff.clients(),
    mockApi.staff.currentStaff(),
  ]);

  return (
    <Clients
      locale={locale as Locale}
      items={items}
      standing={standing}
      canAdd={canAddClient(me.rank)}
    />
  );
}

function Clients({
  locale,
  items,
  standing,
  canAdd,
}: {
  locale: Locale;
  items: ClientSummary[];
  standing: ClientStanding | 'all';
  canAdd: boolean;
}) {
  const t = useTranslations('clients');
  const tAdd = useTranslations('clients.add');

  // Counted over everything, not over what the filter left — a chip reporting
  // the filtered count reads "(0)" for every standing you are not looking at.
  const counts: Record<ClientStanding | 'all', number> = {
    all: items.length,
    retainer: items.filter((client) => client.standing === 'retainer').length,
    active: items.filter((client) => client.standing === 'active').length,
    prospect: items.filter((client) => client.standing === 'prospect').length,
  };

  const shown = standing === 'all' ? items : items.filter((c) => c.standing === standing);

  const rows: ClientRowData[] = shown.map((client) => ({
    id: client.id,
    name: client.name[locale],
    summary: client.summary[locale],
    standing: client.standing,
    standingLabel:
      client.standing === 'retainer' || client.standing === 'active' || client.standing === 'prospect' || client.standing === 'goodStanding'
        ? t(`standing.${client.standing}`)
        : (client.standing || t('standing.active')),
    engagements:
      client.matters + client.projects > 0
        ? // One register since October 2026: former projects count as matters.
          t('row.engagements', { matters: client.matters + client.projects })
        : null,
    openCorrespondence: client.openCorrespondence,
    pendingApprovals: client.pendingApprovals,
    hasPortal: client.hasPortal,
    lastActivity: formatRelativeDays(client.lastActivityOn, locale),
    href: `/staff/clients/${client.id}`,
  }));

  return (
    <>
      <StaffTopBar title={t('title')} subtitle={t('subtitle', { count: items.length })} />

      <main className="mx-auto flex w-full max-w-content flex-1 flex-col gap-5 px-6 py-6">
        {/*
          A DIRECTORY WITH NOBODY IN IT, WHICH IS WHERE EVERY FIRM STARTS.
          `items` is the whole directory, before the standing filter, so zero
          here means the firm has no client on file at all. The strip goes with
          it: five standings reading zero, each leading back to this screen, is
          the row of dead ends the client portal's documents screen drops its
          filter strip to avoid. The search box goes too — there is nothing to
          type into it.

          "Add client" stays, for the rank that has it. On an empty directory it
          is not one control among several, it is the only thing to do — and it
          is also what unblocks the new-matter form, which cannot open a matter
          without a client.
        */}
        {items.length === 0 ? (
          <EmptyState
            icon={Users}
            title={t('empty.noneTitle')}
            body={t('empty.noneBody')}
            action={
              canAdd ? (
                <Link href="/staff/clients/new">
                  <Button variant="primary" size="md" icon={<UserPlus aria-hidden size={15} />}>
                    {tAdd('action')}
                  </Button>
                </Link>
              ) : undefined
            }
          />
        ) : (
        <>
        {/* Absent, never disabled, for a rank that may not take on a client.
            The route and the Server Action check independently — see
            ./permissions.ts. */}
        {canAdd ? (
          <div className="flex justify-end">
            <Link href="/staff/clients/new">
              <Button variant="primary" size="md" icon={<UserPlus aria-hidden size={15} />}>
                {tAdd('action')}
              </Button>
            </Link>
          </div>
        ) : null}

        {/* Real links, so each standing is its own address. Same class string
            as every other tab strip — components/ui/tab-styles.ts. */}
        <nav aria-label={t('filters.label')} className="flex gap-1 overflow-x-auto border-b border-gray-200">
          {(['all', ...STANDINGS] as (ClientStanding | 'all')[]).map((value) => (
            <Link
              key={value}
              href={{
                pathname: '/staff/clients',
                query: value === 'all' ? {} : { standing: value },
              }}
              aria-current={value === standing ? 'page' : undefined}
              className={cn(tabTriggerClasses(value === standing), 'whitespace-nowrap')}
            >
              {value === 'all' ? t('filters.all') : t(`standing.${value}`)}
              <span className="font-mono text-reference text-gray-500 [unicode-bidi:isolate]">
                {counts[value]}
              </span>
            </Link>
          ))}
        </nav>

        <ClientsTable rows={rows} standing={standing === 'all' ? undefined : standing} />
        </>
        )}
      </main>
    </>
  );
}
