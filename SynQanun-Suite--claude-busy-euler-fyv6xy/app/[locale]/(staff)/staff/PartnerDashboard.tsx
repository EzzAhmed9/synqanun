import { Users } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Badge, Card } from '@/components/ui';
import type { Locale } from '@/lib/i18n/routing';
import type {
  AgendaEntry,
  ApprovalRecord,
  BillingSummary,
  InboxItemRecord,
} from '@/lib/mock-api';
import type { FirmClient } from '@/fixtures/clients';
import { AlarmClock, CalendarClock, ClipboardCheck, Gavel, Inbox as InboxIcon, ListChecks } from 'lucide-react';
import { HEARINGS_WINDOW_DAYS, type CourtWeek, type HearingRecord } from '@/lib/mock-api';
import { StaffTopBar } from '../StaffChrome';
import { Bento, BentoCell, MueenTile, todayLine } from './bento';
import { CounterTile, CourtWeekTile, HoursBarsTile, HoursRingTile, WorkChecklist } from './tiles';
import { AgendaCard, BillingCard, CardHead, InboxCard, QuickActions } from './cards';
import { ApprovalsCard } from './work-cards';

/**
 * Partner Dashboard — the view of the firm as a book of work.
 *
 * THE ONE THING ONLY THIS RANK SEES
 * ---------------------------------------------------------------------------
 * Firm-wide data: every client on the roster. Every dashboard below this one shows
 * the files that person is actually on instead — see `EngagementsCard`. That is
 * the substantive difference between the ranks, and it is why the nav's
 * Approvals entry is partner-only rather than merely styled differently.
 *
 * Every number here is COUNTED from the same rows the matters list, the client
 * portal, global search and the notification feed read. See the header of
 * fixtures/practice.ts for the figures the export states instead.
 *
 * NO MATTER OR PROJECT COUNT TILES. The two practice-count cards (open /
 * waiting on the client / closed, for matters and for projects) were removed
 * at the client's request in October 2026: the Legal matters register is one
 * list with its own Active and Archive counts, and the AI reports' practice
 * summary still states the same figures in prose. The grid was rebalanced so
 * no row is left short, on desktop or tablet.
 */
export function PartnerDashboard({
  locale,
  firstName,
  hearings,
  courtWeek,
  approvals,
  inbox,
  unreadCount,
  agenda,
  clients,
  clientTotal,
  billing,
}: {
  locale: Locale;
  firstName: string;
  hearings: HearingRecord[];
  courtWeek: CourtWeek;
  approvals: ApprovalRecord[];
  inbox: InboxItemRecord[];
  unreadCount: number;
  agenda: AgendaEntry[];
  clients: FirmClient[];
  clientTotal: number;
  billing: BillingSummary;
}) {
  const t = useTranslations('staffDashboard');
  const tk = useTranslations('staffDashboard.kpi');
  const overdue = approvals.filter((row) => row.daysOverdue > 0).length;

  return (
    <>
      <StaffTopBar title={t('homeTitle')} subtitle={todayLine(locale)} />

      <main className="mx-auto flex w-full max-w-content flex-1 flex-col gap-4 px-6 py-8 max-tablet:px-4 max-tablet:py-5">
        <QuickActions />

        <Bento>
          {/* معين first: what the assistant can tell you about today. */}
          <BentoCell span={7}>
            <MueenTile name={firstName} locale={locale} matterRef={hearings[0]?.reference ?? null} facts={[
                { key: 'agendaToday', count: agenda.length },
                { key: 'decisions', count: approvals.length },
                { key: 'overdue', count: overdue },
                { key: 'unread', count: unreadCount },
              ]} />
          </BentoCell>
          <BentoCell span={5}>
            <CounterTile label={tk('label')} counters={[
                { icon: ClipboardCheck, label: tk('decisions'), value: approvals.length, href: '/staff/approvals' },
                { icon: AlarmClock, label: tk('overdue'), value: overdue, tone: 'alert', href: '/staff/approvals' },
                { icon: Gavel, label: tk('hearings'), value: hearings.length, hint: tk('hearingsHint', { days: HEARINGS_WINDOW_DAYS }), href: '/staff/calendar' },
                { icon: InboxIcon, label: tk('unread'), value: unreadCount, href: '/staff/inbox' },
              ]} />
          </BentoCell>

          {/* The dark feature tile, two rows tall, beside the court week. */}
          <BentoCell span={4} tall>
            <WorkChecklist locale={locale} agenda={agenda} approvals={approvals} />
          </BentoCell>
          <BentoCell span={8}>
            <CourtWeekTile week={courtWeek} hearings={hearings} locale={locale} />
          </BentoCell>
          <BentoCell span={3}>
            <HoursRingTile billing={billing} locale={locale} />
          </BentoCell>
          <BentoCell span={5} tabletHalf>
            <HoursBarsTile billing={billing} />
          </BentoCell>

          <BentoCell span={7}>
            <InboxCard items={inbox} unreadCount={unreadCount} locale={locale} />
          </BentoCell>
          <BentoCell span={5}>
            <ClientsCard clients={clients} total={clientTotal} locale={locale} />
          </BentoCell>

        </Bento>
      </main>
    </>
  );
}

/* ===========================================================================
 * Clients — partner only
 * ======================================================================== */

/**
 * The firm's client roster.
 *
 * NO PER-PERSON EQUIVALENT EXISTS, and the reason is in the fixtures: every
 * matter and project belongs to the one portal client, so scoping this by
 * engagement returns a list of one. The export gives an associate "My Clients
 * (5 Assigned)" and a paralegal "My Clients (3 Assigned)" — three different
 * client lists across three screens, none of which agrees with the firm's.
 */
function ClientsCard({
  clients,
  total,
  locale,
}: {
  clients: FirmClient[];
  total: number;
  locale: Locale;
}) {
  const t = useTranslations('staffDashboard.clients');

  return (
    <Card padding="none" className="flex h-full rounded-[var(--syn-tile-radius)] flex-col overflow-hidden">
      <header className="border-b border-gray-200 p-5">
        <CardHead icon={Users} heading={t('heading')} caption={t('caption', { count: total })} />
      </header>

      <ul className="divide-y divide-gray-200">
        {clients.map((client) => (
          <li key={client.id} className="flex items-start justify-between gap-3 p-4">
            <div className="min-w-0">
              <p className="text-body text-gray-700">
                <bdi>{client.name[locale]}</bdi>
              </p>
              <p className="mt-0.5 truncate text-caption text-gray-600">
                <bdi>{client.summary[locale]}</bdi>
              </p>
            </div>
            <Badge tone={client.standing === 'prospect' ? 'neutral' : 'info'}>
              {t(`standing.${client.standing}`)}
            </Badge>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export default PartnerDashboard;
