import { recordsTime } from '@/lib/ranks';
import { BarChart3, Info, Scale } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { Badge, Card, tabTriggerClasses } from '@/components/ui';
import { firmName } from '@/fixtures/firm';
import { formatCalendarDate, formatClockTime, isolateRun } from '@/lib/format';
import { Link } from '@/lib/i18n/navigation';
import type { Locale } from '@/lib/i18n/routing';
import {
  mockApi,
  type AssistantEngagementFacts,
  type PracticeCounts,
  type ReportSendRecord,
} from '@/lib/mock-api';
import { cn } from '@/lib/utils';
import { StaffTopBar } from '../../../StaffChrome';
import { CardHead } from '../../cards';
import { AIDemoNotice } from '../AIDemoNotice';
import { canApproveReportSend } from './permissions';
import { SendReportPanel, type ReportPreview } from './SendReportPanel';

/**
 * AI Reports — BUILD_PLAN.md §3, Batch 5.
 *
 * ===========================================================================
 * EVERY FIGURE COMES FROM A COUNTING FUNCTION THAT ALREADY EXISTED
 * ===========================================================================
 * `practiceCounts()` counts the firm's book and is what the Partner Dashboard
 * reads; `staff.billing()` holds the hours the dashboard's chart draws;
 * `assistantFacts()` goes through `engagementDetail`, the same path the matter
 * screen takes. Nothing on this page is computed in this file, and nothing is
 * typed into it — so a report and the screen it describes cannot disagree.
 *
 * That is the whole risk with a "report": it is the one surface where a made-up
 * number looks most at home, because reports are where numbers live.
 *
 * ===========================================================================
 * FACTS, NEVER A SCORE
 * ===========================================================================
 * The Matter Risk Overview reports what is true of a file — how long since it
 * moved, what is unsigned, what is waiting on a decision — and never reduces
 * them to a risk rating. A number like "Risk: 72" would be an output of a model
 * nobody built, calibrated against outcomes nobody measured, and a litigator
 * reading it would be reading nothing.
 *
 * ===========================================================================
 * CONFLICTS ARE MODELLED NOW, AND THE ROW STILL REFUSES TO SCORE THEM
 * ===========================================================================
 * This row used to say no conflicts register existed. One does — see
 * fixtures/conflicts.ts and `conflictSearch` — so it was rewritten in the same
 * commit that built the register, rather than left to contradict a screen the
 * product now has.
 *
 * What it will still never print is "0 conflicts flagged". A conflicts search
 * runs against a PARTY, not against a matter: the question is whether the firm
 * is compromised in relation to somebody, and a file does not name everybody it
 * might be compromised against. A count here would read as a check that ran and
 * cleared — exactly the claim /staff/conflicts refuses to make about its own
 * empty results. The row says where the check lives and what a clean result
 * there does and does not mean.
 *
 * ===========================================================================
 * WHAT THE STITCH EXPORT PUT HERE
 * ===========================================================================
 * The export arrived after this screen was built. It is the clearest case in
 * the project of why a report is the most dangerous surface to fabricate on,
 * because a report is where numbers are supposed to live:
 *
 *   · THE SCORE, TWICE. "82% probability of favorable summary adjudication"
 *     and, below it, "82.4% High Confidence" on a progress bar. The Arabic
 *     adds "18% مخاطر تنفيذ عكسي". This is precisely the output the Matter
 *     Risk Overview above refuses to produce.
 *   · MONEY THAT TRACES TO NOTHING. "$48,500,000" claim value, a
 *     "$38.0M – $41.5M" settlement target, a "$1,200,000" injunction bond,
 *     "$410K Leakage Flagged", "89.4% Realization". No row anywhere sums to
 *     any of them.
 *   · AN ESCROW ACCOUNT, in the Arabic: "$1.2M حساب ضمان".
 *   · INVENTED AUTHORITIES, and the locales disagree about them: "DIFC Law
 *     No. 6 of 2004" is the Judicial Authority Law in English and "قانون
 *     المعاملات والالتزامات" in Arabic. Same instrument, two different laws.
 *   · AN INVENTED MODEL IDENTITY AND AN AUDIT CLAIM. "Model:
 *     Syn-Qanun-Legal-XL", "Engine v4.18.2", "Hash: 9a7b...4c2d", "Dual-bar
 *     audited verification protocol", "SynQanun v4.18.2 Verified".
 *   · REAL INSTITUTIONS AS THIS FIRM'S CLIENTS — Abu Dhabi Islamic Bank,
 *     Standard Chartered Bank — and a tenant that is Al-Tamimi & Partners in
 *     English and رم وشركاه in Arabic.
 *   · GST TIMESTAMPS throughout, on a firm whose clock is Africa/Cairo.
 *   · "SEND TO CLIENT" AS THE PRIMARY RED BUTTON on every row, including a
 *     draft the same screen badges "Unreviewed" — one click from a partner's
 *     desk to a client's inbox, on output no human has read.
 *
 * None of it is here. Every figure on this screen names a counting function.
 */

export const dynamic = 'force-dynamic';

type ReportId = 'practice' | 'risk';

/** The matter the risk overview opens on when the URL names none. */
const DEFAULT_MATTER = 'MAT-2201';

export default async function AIReportsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ report?: string; ref?: string }>;
}) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  setRequestLocale(locale);

  const report: ReportId = query.report === 'risk' ? 'risk' : 'practice';

  const me = await mockApi.staff.currentStaff();

  /*
    ===========================================================================
    THE HOURS LINE IS FETCHED ONLY FOR A RANK THAT HAS HOURS
    ===========================================================================
    `staff.billing()` THROWS for a rank outside `RANKS_THAT_BILL` — it does not
    return zeroes, on purpose, because an hours card reading 0 against a 40-hour
    target is a performance score invented by a layout. lib/ranks.ts says so and
    LegalSecretaryDashboard.tsx repeats it.

    This screen called it unconditionally, and the AI Reports nav entry carries
    no rank allow-list, so a legal secretary saw the link, followed it, and got
    the error boundary. Found in the Track A close-out sweep; it was the only
    caller of `billing()` that had not already been taught this, because
    staff/page.tsx settles it by giving that rank a branch of its own.

    The screen is NOT gated. Nothing else in the practice summary is
    billing-specific, and refusing the whole report would withhold the firm's
    matter and approval counts from somebody entitled to read them. The one line
    that has no answer for this rank is simply absent — the same rule the nav
    and the dashboards follow for a control somebody cannot use.
  */
  const [counts, billing, register] = await Promise.all([
    mockApi.staff.practiceCounts(),
    recordsTime(me.rank) ? mockApi.staff.billing(me.id) : Promise.resolve(null),
    mockApi.staff.matters(me.id),
  ]);

  // Only a real reference resolves; an edited one falls back rather than
  // erroring, and the picker below only ever offers matters that exist.
  const chosen =
    register.items.find((row) => row.reference === query.ref)?.reference ?? DEFAULT_MATTER;
  const [facts, sendRecord] =
    report === 'risk'
      ? await Promise.all([mockApi.staff.assistantFacts(chosen), mockApi.staff.reportSend(chosen)])
      : [null, null];

  return (
    <Reports
      locale={locale as Locale}
      report={report}
      counts={counts}
      hours={billing}
      facts={facts}
      matters={register.items.map((row) => ({
        reference: row.reference,
        title: row.title[locale as Locale],
      }))}
      chosen={chosen}
      sendRecord={sendRecord}
      canApprove={canApproveReportSend(me.rank)}
    />
  );
}

function Reports({
  locale,
  report,
  counts,
  hours,
  facts,
  matters,
  chosen,
  sendRecord,
  canApprove,
}: {
  locale: Locale;
  report: ReportId;
  counts: PracticeCounts;
  /** Null for a rank that records no billable time — see the fetch above. */
  hours: { total: number; targetPerWeek: number; weeks: number[] } | null;
  facts: AssistantEngagementFacts | null;
  matters: { reference: string; title: string }[];
  chosen: string;
  /** This session's send request for the chosen matter's report. */
  sendRecord: ReportSendRecord | null;
  /** A partner: sees Approve on a request waiting for one. */
  canApprove: boolean;
}) {
  const t = useTranslations('ai.reports');

  return (
    <>
      <StaffTopBar title={t('title')} subtitle={t('subtitle')} />

      <main className="mx-auto flex w-full max-w-content flex-1 flex-col gap-5 px-6 py-6">
        <AIDemoNotice />

        <nav aria-label={t('picker')} className="flex gap-1 border-b border-gray-200">
          {(['practice', 'risk'] as const).map((value) => (
            <Link
              key={value}
              href={{
                pathname: '/staff/ai/reports',
                query: value === 'practice' ? {} : { report: value },
              }}
              aria-current={value === report ? 'page' : undefined}
              className={cn(tabTriggerClasses(value === report), 'whitespace-nowrap')}
            >
              {t(`${value}.name`)}
            </Link>
          ))}
        </nav>

        {report === 'practice' ? (
          <>
            <PracticeSummary counts={counts} hours={hours} locale={locale} t={t} />
            {/* Firm-internal: there is nothing here a client should receive. */}
            <p className="text-caption text-gray-600">{t('send.practiceInternal')}</p>
          </>
        ) : (
          <>
            <RiskOverview
              facts={facts}
              matters={matters}
              chosen={chosen}
              locale={locale}
              t={t}
            />
            {facts ? (
              <SendReportPanel
                // Keyed by matter, so the channel choice resets on a switch.
                key={facts.reference}
                reference={facts.reference}
                clientName={facts.clientName[locale]}
                preview={clientPreview(facts, locale, t)}
                status={
                  sendRecord
                    ? {
                        channels: sendRecord.channels,
                        state: sendRecord.state,
                        requested: t('send.status.requested', {
                          name: isolateRun(sendRecord.requestedBy[locale]),
                          time: formatClockTime(sendRecord.requestedAt, locale),
                        }),
                        approved:
                          sendRecord.approvedBy && sendRecord.approvedAt
                            ? t('send.status.approved', {
                                name: isolateRun(sendRecord.approvedBy[locale]),
                                time: formatClockTime(sendRecord.approvedAt, locale),
                              })
                            : null,
                      }
                    : null
                }
                canApprove={canApprove}
              />
            ) : null}
          </>
        )}
      </main>
    </>
  );
}

/* ===========================================================================
 * Weekly practice summary — partner scope
 * ======================================================================== */

function PracticeSummary({
  counts,
  hours,
  locale,
  t,
}: {
  counts: PracticeCounts;
  /** Null for a rank that records no billable time — see the fetch above. */
  hours: { total: number; targetPerWeek: number; weeks: number[] } | null;
  locale: Locale;
  t: (key: string, values?: Record<string, string | number>) => string;
}) {
  /*
    Every line below names a value from `practiceCounts()` or `staff.billing()`.
    The prose is a translation; the numbers are the same ones the Partner
    Dashboard renders, read from the same call.
  */
  const lines = [
    // One register since October 2026, so former projects count as matters.
    t('practice.book', {
      matters: counts.matters.active + counts.projects.active,
    }),
    t('practice.attention', {
      matters: counts.matters.needsAttention + counts.projects.needsAttention,
    }),
    t('practice.approvals', {
      pending: counts.approvals.pending,
      overdue: counts.approvals.overdue,
    }),
    counts.approvals.filingsOverdue > 0
      ? t('practice.filings', { count: counts.approvals.filingsOverdue })
      : t('practice.noFilings'),
    counts.busiestClient
      ? t('practice.busiest', {
          client: counts.busiestClient.name[locale],
          count: counts.busiestClient.engagements,
        })
      : t('practice.noBusiest'),
    // Absent, not zeroed. See the fetch in AIReportsPage.
    hours
      ? t('practice.hours', {
          total: hours.total,
          weeks: hours.weeks.length,
          target: hours.targetPerWeek,
        })
      : null,
  ].filter((line): line is string => line !== null);

  return (
    <Card padding="none" className="overflow-hidden">
      <header className="border-b border-gray-200 p-5">
        <CardHead icon={BarChart3} heading={t('practice.name')} caption={t('practice.scope')} />
      </header>
      <ul className="divide-y divide-gray-200">
        {lines.map((line, index) => (
          <li key={index} className="p-4 text-body text-gray-700">
            <bdi>{line}</bdi>
          </li>
        ))}
      </ul>
      {/* The provenance line NAMES its sources, so it cannot go on claiming
          hours on a report that has none. */}
      <p className="border-t border-gray-200 p-4 text-caption text-gray-500">
        {hours ? t('practice.provenance') : t('practice.provenanceNoHours')}
      </p>
    </Card>
  );
}

/* ===========================================================================
 * Matter risk overview — one file
 * ======================================================================== */

function RiskOverview({
  facts,
  matters,
  chosen,
  locale,
  t,
}: {
  facts: AssistantEngagementFacts | null;
  matters: { reference: string; title: string }[];
  chosen: string;
  locale: Locale;
  t: (key: string, values?: Record<string, string | number>) => string;
}) {
  return (
    <>
      {/* Only matters that exist are offered — the list comes from the
          register, so no option here can fail to resolve. */}
      <div className="flex flex-wrap gap-1">
        {matters.map((matter) => (
          <Link
            key={matter.reference}
            href={{
              pathname: '/staff/ai/reports',
              query: { report: 'risk', ref: matter.reference },
            }}
            aria-current={matter.reference === chosen ? 'page' : undefined}
            className={cn(
              tabTriggerClasses(matter.reference === chosen),
              'whitespace-nowrap font-mono text-reference'
            )}
          >
            <span dir="ltr">{matter.reference}</span>
          </Link>
        ))}
      </div>

      {facts === null ? (
        <Card padding="lg">
          <p className="text-body text-gray-600">{t('risk.gone')}</p>
        </Card>
      ) : (
        <Card padding="none" className="overflow-hidden">
          <header className="border-b border-gray-200 p-5">
            <CardHead
              icon={Scale}
              heading={t('risk.name')}
              caption={t('risk.scope', { ref: facts.reference })}
            />
          </header>

          <dl className="divide-y divide-gray-200">
            <Row label={t('risk.status')}>
              <bdi>{facts.status[locale]}</bdi>
            </Row>
            <Row label={t('risk.lastMoved')}>
              {t('risk.daysAgo', { count: facts.daysSinceActivity })}
            </Row>
            <Row label={t('risk.unsigned')}>
              {facts.awaitingSignature > 0 ? (
                <Badge tone="warning">
                  {t('risk.unsignedCount', { count: facts.awaitingSignature })}
                </Badge>
              ) : (
                t('risk.nothingUnsigned')
              )}
            </Row>
            <Row label={t('risk.waiting')}>
              {t('risk.waitingCount', { approvals: facts.approvals, tasks: facts.tasks })}
            </Row>
            <Row label={t('risk.nextStep')}>
              {facts.nextDate ? (
                <span className="[unicode-bidi:isolate]">
                  <bdi>{facts.nextDate.title[locale]}</bdi>
                  {' — '}
                  {formatCalendarDate(facts.nextDate.on, locale, { month: 'long' })}
                </span>
              ) : (
                t('risk.noNext')
              )}
            </Row>

            {/*
              Points at the check rather than scoring it. A conflicts search
              runs against a party, not a matter, so no number belongs on a
              matter's report. Neutral rather than a warning: nothing is
              missing any more — see the file header.
            */}
            <Row label={t('risk.conflicts')}>
              <span className="flex items-start gap-2 text-gray-600">
                <Info aria-hidden size={14} className="mt-1 shrink-0 text-gray-500" />
                {t('risk.conflictsScope')}
              </span>
            </Row>
          </dl>

          <p className="border-t border-gray-200 p-4 text-caption text-gray-500">
            {t('risk.provenance')}
          </p>
        </Card>
      )}
    </>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 p-4">
      <dt className="text-caption text-gray-500">{label}</dt>
      <dd className="text-body text-gray-700">{children}</dd>
    </div>
  );
}

/**
 * What the client receives — the CLIENT's version of the matter report.
 *
 * Status, next step and what is waiting on them, from the same facts the card
 * above reads. Tasks, approvals and the conflict check are the firm's own and
 * are left out; design.md §11 item 6 limits the client to matter status, and
 * a report sent in the firm's name is still the client portal's surface.
 */
function clientPreview(
  facts: AssistantEngagementFacts,
  locale: Locale,
  t: (key: string, values?: Record<string, string | number>) => string
): ReportPreview {
  const lines = [
    t('send.preview.status', { status: facts.status[locale] }),
    facts.nextDate
      ? t('send.preview.next', {
          step: facts.nextDate.title[locale],
          date: formatCalendarDate(facts.nextDate.on, locale, { month: 'long' }),
        })
      : t('send.preview.noNext'),
    facts.awaitingSignature > 0
      ? t('send.preview.waiting', { count: facts.awaitingSignature })
      : t('send.preview.nothingWaiting'),
  ];
  return {
    to: facts.clientName[locale],
    subject: t('send.preview.subjectLine', { ref: facts.reference, title: facts.title[locale] }),
    lines,
    signoff: facts.leadName
      ? t('send.preview.signoff', { lead: facts.leadName[locale], firm: firmName(locale) })
      : firmName(locale),
  };
}
