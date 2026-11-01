import { CalendarDays, Gavel, Inbox as InboxIcon, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Badge, Card } from '@/components/ui';
import type { Locale } from '@/lib/i18n/routing';
import {
  HEARINGS_WINDOW_DAYS,
  type AgendaEntry,
  type CourtWeek,
  type HearingRecord,
  type InboxItemRecord,
  type SupportedPerson,
} from '@/lib/mock-api';
import { StaffTopBar } from '../StaffChrome';
import { Bento, BentoCell, MueenTile, todayLine } from './bento';
import { CounterTile, CourtWeekTile, HoursBarsTile, HoursRingTile, WorkChecklist } from './tiles';
import { AgendaCard, CardHead, InboxCard, QuickActions } from './cards';

/**
 * Legal Secretary Dashboard — the one screen organised around people.
 *
 * ===========================================================================
 * WHY IT IS SHAPED DIFFERENTLY FROM THE OTHER FOUR
 * ===========================================================================
 * Every rank above this one is organised around ENGAGEMENTS: which files am I
 * on, what is due on them, what have I sent. A legal secretary's work is
 * organised around PEOPLE — whose day is this, whose post is this, who needs
 * answering — which is why `demoSecretaryAssignments` is a roster of staff
 * rather than a list of matters, and why there is no "your files" card here.
 *
 * That is the only structural difference in the product, and it is a real one.
 * The four cards above it are the same components the other dashboards use.
 *
 * ===========================================================================
 * NO TIMER, NO HOURS CARD, AND NO PERFORMANCE SCORE
 * ===========================================================================
 * `RANKS_THAT_BILL` in lib/ranks.ts excludes this rank, so the timer is not
 * mounted by the staff layout and `mockApi.staff.billing()` throws rather than
 * returning zeroes. A legal secretary's time is not charged to a client; an
 * hours card reading 0 beside a 40-hour target is a performance score invented
 * by a layout.
 *
 * The export reaches the same conclusion about the timer — its Legal Secretary
 * screen is the one with no timer pill — and then replaces it with something
 * worse: a "Filing Efficiency Rate" of "98.4% on-time court docketing",
 * "62/63 filings on time this month", against a "Target: 95.0%", with a
 * four-bar chart and a "Quality report" link. A productivity score for a named
 * employee, computed from filings this product cannot make, on a court
 * integration that does not exist. Absent is the right answer.
 *
 * ===========================================================================
 * "DOCUMENTS TO FILE" IS NOT BUILT — SAME REASON AS THE PARALEGAL'S
 * ===========================================================================
 * There is no document management system. fixtures/documents.ts is the
 * client-facing library, and reading it as a filing queue would show a
 * secretary the client's own shared files under a heading saying the opposite.
 * MOCK: Track B (BUILD_PLAN.md §6), along with the inbound court-filing
 * webhook the export's card cites as a source.
 *
 * ---------------------------------------------------------------------------
 * ALSO NOT CARRIED OVER FROM THE STITCH EXPORT
 * ---------------------------------------------------------------------------
 *  · PRESENCE. "In Meeting until 11:00", "Available in Chamber 4B", "In
 *    Document Review", each with a coloured status dot on the person's avatar.
 *    This product has no presence system, no calendar integration and no way to
 *    know where anybody is. What it can honestly say is how many entries are in
 *    someone's day, counted from the same function that renders their own
 *    dashboard — which is what this screen shows instead.
 *
 *  · DESK EXTENSIONS: "Ext. 4012", "Ext. 4058", "Ext. 4104". Invented internal
 *    phone numbers, in a product with no directory.
 *
 *  · "Join Link" and "eCourts Portal" buttons on calendar rows, opening a video
 *    call and a court portal that do not exist; "Send Reminder", "Reschedule",
 *    "Docket Check", "Propose Times", "Compare Calendars", "Draft Reply",
 *    "Acknowledge" — eleven action buttons across two cards, none of which can
 *    do anything, on the screen of the person whose job is doing them. This
 *    dashboard shows what is there and links nowhere it cannot go.
 *
 *  · `{{CLIENT_LOGO}}`, rendered literally into the sidebar in both locales. A
 *    template placeholder that reached the screenshot.
 *
 *  · "AL-TAMIMI & PARTNERS · DUBAI DIFC" as a breadcrumb — a real firm and the
 *    wrong jurisdiction — and "SESSION: LYS-892-SEC" in the footer.
 *
 *  · "Auto-sync with the iManage repository", naming a real commercial DMS the
 *    product is not integrated with.
 *
 *  · A LAWYER-FILTER CHIP ROW reading "All (3) · Tariq (2) · Sarah (2) ·
 *    Zaid (1)" above four rows — the counts add to five over a list of four,
 *    in both locales. Filtering three people's days is a Calendar feature
 *    (Batch 4, next), not something to half-build on a dashboard.
 */
export function LegalSecretaryDashboard({
  locale,
  firstName,
  hearings,
  courtWeek,
  supported,
  correspondence,
  unreadCount,
  agenda,
}: {
  locale: Locale;
  firstName: string;
  hearings: HearingRecord[];
  courtWeek: CourtWeek;
  supported: SupportedPerson[];
  correspondence: InboxItemRecord[];
  unreadCount: number;
  agenda: AgendaEntry[];
}) {
  const t = useTranslations('staffDashboard');
  const tc = useTranslations('staffDashboard.correspondence');
  const tk = useTranslations('staffDashboard.kpi');

  return (
    <>
      <StaffTopBar title={t('homeTitle')} subtitle={todayLine(locale)} />

      <main className="mx-auto flex w-full max-w-content flex-1 flex-col gap-4 px-6 py-8 max-tablet:px-4 max-tablet:py-5">
        <QuickActions />

        <Bento>
          <BentoCell span={7}>
            <MueenTile
              name={firstName}
              locale={locale}
              matterRef={hearings[0]?.reference ?? null}
              facts={[
                { key: 'agendaToday', count: agenda.length },
                { key: 'unread', count: unreadCount },
              ]}
            />
          </BentoCell>
          {/* No billing figure and no decisions: a secretary's numbers are the
              people they support, their day, their post and the sittings those
              people have coming — see RANKS_THAT_BILL. */}
          <BentoCell span={5}>
            <CounterTile
              label={tk('label')}
              counters={[
                { icon: Users, label: tk('supported'), value: supported.length },
                { icon: CalendarDays, label: tk('agendaToday'), value: agenda.length },
                { icon: InboxIcon, label: tk('unread'), value: unreadCount, href: '/staff/inbox' },
                {
                  icon: Gavel,
                  label: tk('hearings'),
                  value: hearings.length,
                  hint: tk('hearingsHint', { days: HEARINGS_WINDOW_DAYS }),
                  href: '/staff/calendar',
                },
              ]}
            />
          </BentoCell>

          <BentoCell span={4}>
            <WorkChecklist locale={locale} agenda={agenda} />
          </BentoCell>
          <BentoCell span={8}>
            <CourtWeekTile week={courtWeek} hearings={hearings} locale={locale} byPerson />
          </BentoCell>

          <BentoCell span={7}>
            <SupportedStaffCard people={supported} locale={locale} />
          </BentoCell>
          {/* The same <InboxCard> in triage mode: every row says whose it is. */}
          <BentoCell span={5}>
            <InboxCard
              items={correspondence}
              unreadCount={unreadCount}
              locale={locale}
              showRecipient
              heading={tc('heading')}
            />
          </BentoCell>
        </Bento>
      </main>
    </>
  );
}

/* ===========================================================================
 * The roster
 * ======================================================================== */

/**
 * The fee earners this person supports, and what today holds for each.
 *
 * ===========================================================================
 * BOTH NUMBERS ARE COUNTED, FROM THE FUNCTIONS THOSE PEOPLE'S OWN DASHBOARDS
 * READ
 * ===========================================================================
 * `entriesToday` is their meetings plus the court dates on their own files;
 * `unreadForThem` is correspondence addressed to them by name. Neither is
 * stated beside a person — which matters more here than anywhere else in the
 * product, because this is the one screen where the numbers describe SOMEBODY
 * ELSE. A figure that drifts on a partner's own dashboard misleads the partner;
 * a figure that drifts here has a secretary telling a partner something untrue
 * about their afternoon.
 *
 * The export writes "3 meetings today", "2 meetings today" and "1 meeting
 * today" beside three people whose calendars it never consults — and its own
 * schedule card, immediately above, lists four entries across those three
 * people.
 *
 * NO PRESENCE, NO EXTENSIONS, NO AVATARS WITH STATUS DOTS. See the file header.
 */
function SupportedStaffCard({
  people,
  locale,
}: {
  people: SupportedPerson[];
  locale: Locale;
}) {
  const t = useTranslations('staffDashboard.supported');
  const tRanks = useTranslations('ranks');

  return (
    <Card padding="none" className="h-full rounded-[var(--syn-tile-radius)] overflow-hidden">
      <header className="border-b border-gray-200 p-5">
        <CardHead
          icon={Users}
          tone="accent"
          heading={t('heading')}
          caption={t('caption', { count: people.length })}
        />
      </header>

      {people.length === 0 ? (
        <p className="p-5 text-body text-gray-600">{t('empty')}</p>
      ) : (
        <ul className="divide-y divide-gray-200">
          {people.map((person) => (
            <li key={person.id} className="flex flex-wrap items-start justify-between gap-3 p-5">
              <div className="min-w-0 flex-1">
                <p className="text-body-emphasis text-gray-700">
                  {/* Unknown script either way — the roster is bilingual and a
                      name may be Arabic in one locale and Latin in the other. */}
                  <bdi>{person.name[locale]}</bdi>
                </p>
                {/* The rank, from the dictionary. Not a job title invented for
                    the card, and not a presence line. `holder`, because it is
                    beside a name — see lib/ranks.ts. */}
                <p className="mt-0.5 text-caption text-gray-600">
                  {tRanks(`holder.${person.rank}`)}
                </p>
              </div>

              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <Badge tone="neutral" icon={null}>
                  {t('entriesToday', { count: person.entriesToday })}
                </Badge>
                {person.unreadForThem > 0 ? (
                  <Badge tone="warning">
                    {t('unreadForThem', { count: person.unreadForThem })}
                  </Badge>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export default LegalSecretaryDashboard;
