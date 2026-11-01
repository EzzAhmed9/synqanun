import { Info, ScrollText } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import {
  Badge,
  Card,
  EmptyState,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '@/components/ui';
import { formatCalendarDate } from '@/lib/format';
import { Link } from '@/lib/i18n/navigation';
import type { Locale } from '@/lib/i18n/routing';
import { mockApi, type ActivityLog } from '@/lib/mock-api';
import type { Rank } from '@/lib/ranks';
import { SettingsNotPermitted, SettingsShell } from '../SettingsShell';
import { settingsTabAllows } from '../tabs';
import { ActivityFilters } from './ActivityFilters';

/**
 * Settings → Activity & Audit Log — BUILD_PLAN.md §3, Batch 6.
 *
 * ===========================================================================
 * THE LOG IS DERIVED, NOT INVENTED — AND IT COVERS ONE THING
 * ===========================================================================
 * `activityLog()` builds every row from `demoApprovals`, the only collection in
 * this repo that records an actor AND a date AND a subject. Its header sets out
 * why nothing else contributes: documents have a share date and no sharer,
 * invoices have an issue date and no issuer, tasks have both people and no
 * date, and sign-in is not modelled at all because Track A has no
 * authentication.
 *
 * Attributing the unattributed would be the worst fabrication available on
 * this particular screen. An audit log exists to answer "who did this". A row
 * reading "Fatima Al-Zahra shared this document", built by guessing from the
 * engagement's lead, is a false statement about a named person's conduct — and
 * it is indistinguishable, to a reader, from a true one. So the log shows what
 * is recorded and the panel says in words what it does not cover.
 *
 * DAY PRECISION. The fixtures store day offsets, so rows carry a date and no
 * clock time. The export stamps every row "10:48:12 GST" — false precision, in
 * the wrong time zone, on the one screen whose entire value is being exact.
 *
 * ===========================================================================
 * WHAT THE EXPORT PUT HERE, AND WHY NONE OF IT SURVIVED
 * ===========================================================================
 * This is the heaviest security-theatre payload in the project so far, on the
 * screen least able to carry it: an audit log's only product is trust.
 *
 *   · CRYPTOGRAPHIC INTEGRITY CLAIMS. "Immutable Ledger", "Tamper-Proof Audit
 *     Record", "SHA-256 Block Chain Verified", a "Verify Hashes" button, a
 *     "Log Checksum: VALID" badge, and a per-row "Hash: 0x8b32f...91c4".
 *     Nothing is hashed and nothing is append-only; these are rows derived in
 *     a React component on each request.
 *   · A RETENTION AND COMPLIANCE CLAIM. "7 Years / WORM Storage", "Complies
 *     with UAE Cabinet Res. No. 4", and a footer citing DIFC Regulatory Law,
 *     ADGM Data Protection Regulations and the UAE Federal Law on Electronic
 *     Transactions — plus "Timestamps are synchronized via certified atomic
 *     clock servers". Named-regulation compliance asserted by a prototype.
 *   · A SECURITY SCORE. "Security Anomaly Score 0.00 — Nominal — No off-hours
 *     or foreign IP bursts". The same forbidden shape Batch 5 refused seven
 *     times, now claiming a monitoring system exists and has cleared the firm.
 *   · SURVEILLANCE DATA NOBODY CAPTURES. IP addresses with geolocation
 *     ("194.170.82.14 (Dubai Internet City, UAE)"), "Firm HQ Network",
 *     device strings, session IDs, and per-row expandable drawers for them.
 *   · AUTHENTICATION THAT DOES NOT EXIST. FIDO2, WebAuthn, YubiKey, TouchID
 *     biometrics, TLS 1.3, "Zero Trust verification passed", "2FA
 *     Authenticator TOTP #88912". BUILD_PLAN §6 defers 2FA to Track B.
 *   · COUNTS THAT CONTRADICT EACH OTHER ON ONE SCREEN. "418 events today"
 *     over a table showing 7; "From 28 active practitioners" beside a filter
 *     reading "All Personnel (31)"; "+12% vs avg" against a baseline nothing
 *     computes. This firm has ten people.
 *   · A CONFLICT-CHECK EVENT — "1,402 Entities scanned • 0 Severe Blockers".
 *     The firm now has a conflicts register and a screen that searches it, and
 *     this row would still be wrong twice: the register holds tens of parties
 *     rather than 1,402, and "0 Severe Blockers" is the graded verdict
 *     /staff/conflicts refuses to produce. Nothing records who ran a search
 *     either — which is the gap this log's own scope note describes.
 *   · RECORDS AND PEOPLE THAT DO NOT EXIST. MAT-2204, MAT-1809, and a roster
 *     of seven names that are not this firm's — spelled differently between
 *     the two locales, with "Senior Associate" rendered as "محامٍ أول".
 *   · GST TIMESTAMPS on a Cairo firm; `{{CLIENT_LOGO}}` rendered literally in
 *     both locales, for the sixth export running; a timer pre-loaded to
 *     01:46:18 against a matter that is not on the register.
 *
 * NO "EXPORT AUDIT TRAIL" BUTTON. There is no audit file to produce, and this
 * screen already shows every event it holds — fifteen of them, in full, with
 * no pagination. A download button would be an inert control over a document
 * that does not exist. When the log is real and long, it gets one.
 *
 * ===========================================================================
 * PARTNERS ONLY
 * ===========================================================================
 * The one Settings sub-area whose subject is other people's actions, which
 * makes it supervision. tabs.ts carries the reasoning and the allow-list that
 * both the tab strip and this route read.
 */

export const dynamic = 'force-dynamic';

export default async function ActivityLogPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ actor?: string; action?: string }>;
}) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  setRequestLocale(locale);

  const me = await mockApi.staff.currentStaff();

  // The gate runs before the query. Nothing that reaches the component below
  // has been fetched for a reader who may not see it.
  if (!settingsTabAllows(me.rank, 'activity')) {
    const tRank = await getTranslations('ranks');
    return (
      <SettingsNotPermitted
        icon={ScrollText}
        rank={me.rank}
        tab="activity"
        // The BARE rank category, not `holder` — it lands inside a sentence.
        rankLabel={tRank(me.rank)}
      />
    );
  }

  const log = await mockApi.staff.activityLog({
    actor: query.actor,
    action: query.action,
  });

  return (
    <ActivityView
      locale={locale as Locale}
      rank={me.rank}
      log={log}
      selected={{ actor: query.actor ?? '', action: query.action ?? '' }}
    />
  );
}

function ActivityView({
  locale,
  rank,
  log,
  selected,
}: {
  locale: Locale;
  rank: Rank;
  log: ActivityLog;
  selected: { actor: string; action: string };
}) {
  const t = useTranslations('staffSettings.activity');
  const tRank = useTranslations('ranks');

  return (
    <SettingsShell rank={rank} active="activity">
      {/*
        The most important element on the screen: what this log is, and what it
        is not. Neutral and an Info icon — a system note about the data, not the
        product speaking as an agent, and not an error.
      */}
      <div className="flex items-start gap-3 rounded-card border border-gray-300 bg-gray-100 p-4">
        <Info aria-hidden size={16} className="mt-0.5 shrink-0 text-gray-500" />
        <div className="min-w-0">
          <p className="text-caption font-medium text-gray-700">{t('scope.heading')}</p>
          <p className="mt-1 text-caption text-gray-600">{t('scope.covers')}</p>
          <p className="mt-2 text-caption text-gray-600">{t('scope.omits')}</p>
        </div>
      </div>

      <Card padding="lg">
        <ActivityFilters
          actor={selected.actor}
          action={selected.action}
          // Resolved here, because this is where the locale is.
          actors={log.actors.map((row) => ({ value: row.value, label: row.label[locale] }))}
          actions={log.actions.map((value) => ({ value, label: t(`actions.${value}`) }))}
        />
      </Card>

      <p className="text-caption text-gray-500">
        {/* Counted from what was returned against what exists — never a
            headline figure with a different number of rows beneath it. */}
        {t('count', { shown: log.items.length, total: log.total })}
      </p>

      {log.items.length === 0 ? (
        <EmptyState icon={ScrollText} title={t('empty.title')} body={t('empty.body')} />
      ) : (
        <div className="overflow-hidden rounded-card border border-gray-200 bg-white">
          <Table striped className="tablet:min-w-[48rem]">
            <TableHead>
              <TableRow>
                <TableHeaderCell>{t('columns.when')}</TableHeaderCell>
                <TableHeaderCell>{t('columns.who')}</TableHeaderCell>
                <TableHeaderCell>{t('columns.what')}</TableHeaderCell>
                <TableHeaderCell>{t('columns.record')}</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {log.items.map((event) => (
                <TableRow key={event.id}>
                  {/* A date and no hour. The fixtures store days. */}
                  <TableCell>
                    <span className="[unicode-bidi:isolate] text-caption text-gray-600">
                      {formatCalendarDate(event.on, locale, { month: 'short' })}
                    </span>
                  </TableCell>

                  <TableCell>
                    <span className="block text-body text-gray-900">
                      <bdi>{event.actorName[locale]}</bdi>
                    </span>
                    <span className="block text-caption text-gray-500">
                      {/* The rank as a CATEGORY label, not a description of the
                          person — lib/ranks.ts, and why Arabic needs the
                          prefixed form here. */}
                      {tRank(`holder.${event.actorRank}`)}
                    </span>
                  </TableCell>

                  <TableCell>
                    <Badge tone={event.action === 'approvalApproved' ? 'success' : 'neutral'}>
                      {t(`actions.${event.action}`)}
                    </Badge>
                    <span className="mt-1 block text-caption text-gray-600">
                      <bdi>{event.subject[locale]}</bdi>
                    </span>
                  </TableCell>

                  <TableCell>
                    {event.engagementRef ? (
                      <Link
                        href={`/staff/matters/${event.engagementRef}`}
                        className="hover:underline"
                      >
                        <span dir="ltr" className="font-mono text-reference text-legal-navy">
                          {event.engagementRef}
                        </span>
                      </Link>
                    ) : (
                      // A fee quote can precede an engagement. The client is
                      // still a real record, so it is still a real link.
                      <span className="text-caption text-gray-500">{t('noEngagement')}</span>
                    )}
                    <Link
                      href={`/staff/clients/${event.clientId}`}
                      className="mt-1 block text-caption text-legal-navy hover:underline"
                    >
                      <bdi>{event.clientName[locale]}</bdi>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </SettingsShell>
  );
}
