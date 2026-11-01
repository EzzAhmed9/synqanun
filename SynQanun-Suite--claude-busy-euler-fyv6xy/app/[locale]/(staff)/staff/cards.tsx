import {
  CalendarDays,
  FilePlus2,
  Inbox,
  Receipt,
  type LucideIcon,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { FeatherMark } from '@/components/brand/FeatherMark';
import { Badge, Button, buttonClasses, Card } from '@/components/ui';
import { Link } from '@/lib/i18n/navigation';
import { ArrowRight } from 'lucide-react';
import { formatClockTime, formatRelativeDays } from '@/lib/format';
import type { Locale } from '@/lib/i18n/routing';
import type { AgendaEntry, BillingSummary, InboxItemRecord } from '@/lib/mock-api';
import { cn } from '@/lib/utils';
import { HoursChart } from './HoursChart';
import { LogTimeModal } from './time/LogTimeModal';

/**
 * The cards more than one rank's dashboard shows.
 *
 * ===========================================================================
 * WHY THIS FILE EXISTS NOW AND NOT BEFORE
 * ===========================================================================
 * All of this lived inside the Partner Dashboard, correctly: there was one
 * staff screen, and BUILD_PLAN.md §3's rule is to extract at the SECOND real
 * instance, not the first. Four more dashboards arrived at once and every card
 * here reached its second instance in the same afternoon.
 *
 * The alternative was the export's arrangement — five standalone pages, each
 * with its own inbox card. Its five inbox cards already disagree about what an
 * unread badge looks like (a grey pill on one, a red pill on another, a red dot
 * on a third) and its five billing cards use three different layouts for the
 * same two numbers. That drift is the thing BUILD_PLAN.md §"Build order" names
 * as the reason this codebase has a component library at all.
 *
 * WHAT IS *NOT* HERE
 * ===========================================================================
 * Anything only one rank sees: the partner's firm-wide client roster and
 * practice counts, the senior associate's delegated-review split, the
 * paralegal's task list, the secretary's roster. A card shared by one screen is
 * not shared — it is a card that has been moved away from the only place that
 * explains it.
 */

/* ===========================================================================
 * Shared furniture
 * ======================================================================== */

/**
 * The header every card on the staff side wears: a square glyph, a title, and
 * one line of caption.
 *
 * The caption is ALWAYS a count of what is rendered below it or a statement
 * about it — never a target, a percentage or a service level. That constraint
 * is the reason this is a component rather than five copies of a flex row.
 */
export function CardHead({
  icon: Icon,
  heading,
  caption,
  tone = 'neutral',
  action,
}: {
  icon: LucideIcon;
  heading: string;
  caption?: string;
  /** `accent` marks the one card on a screen that is asking for a decision. */
  tone?: 'neutral' | 'accent';
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex items-start gap-3">
        <span
          className={
            tone === 'accent'
              ? 'flex h-9 w-9 shrink-0 items-center justify-center rounded-sm bg-action/10 text-action'
              : 'flex h-8 w-8 shrink-0 items-center justify-center rounded-sm bg-gray-100 text-gray-600'
          }
        >
          <Icon aria-hidden size={tone === 'accent' ? 18 : 16} strokeWidth={1.8} />
        </span>
        <div>
          <h2 className="font-sans text-title text-gray-700">{heading}</h2>
          {caption ? <p className="mt-0.5 text-caption text-gray-600">{caption}</p> : null}
        </div>
      </div>
      {action}
    </div>
  );
}

/**
 * The feather, at the size brand-guidelines.md §5 permits.
 *
 * It appears ONLY on agent surfaces — the Digest card and the "ask for a
 * report" action. It has never rendered on a client-portal screen and never
 * will: the portal has no agent in it, and spending the mark there teaches a
 * reader that the feather means "SynQanun" rather than "a machine made this".
 */
export function FeatherGlyph() {
  return <FeatherMark height={16} />;
}

/**
 * The two actions every fee earner has, in the two colours design.md §2
 * assigns.
 *
 * One syn-red, one navy, and the pairing is the point: drafting is the
 * person's own act, asking an agent for a report is the agent's. design.md §7
 * calls the inverse "the most important rule in the file".
 *
 * The export adds a third, "Search legislation", opening a legal database that
 * is Batch 5 and has no rows behind it; and on the Arabic Junior Associate
 * screen it fills the AI button with solid legal-navy while leaving the human's
 * "submit for review" as a white outline — which reads, by colour alone, as the
 * machine being the more important actor on the page.
 *
 * MOCK: both destinations are Batch 5 (Document Canvas, AI Reports). They are
 * inert buttons rather than links because neither has an address yet — unlike
 * Review on the approvals rows, which points at a route that simply is not
 * built and therefore 404s honestly.
 */
import { DashboardQuickActions } from './DashboardQuickActions';

export function QuickActions() {
  return <DashboardQuickActions />;
}

/* ===========================================================================
 * Inbox
 * ======================================================================== */

/**
 * Correspondence, newest first.
 *
 * TWO THINGS THIS CARD REFUSES TO HIDE
 * ---------------------------------------------------------------------------
 * 1. THE SOURCE. Only `portal` items are real in Track A — see the MOCK note on
 *    `demoInbox`. Presenting mail and court filings as one working stream would
 *    claim two integrations that do not exist.
 * 2. WHO IT WAS SENT TO. A unified inbox holds both practice correspondence and
 *    correspondence addressed to one person, and a reader who cannot tell them
 *    apart learns that everything in it is theirs to answer.
 *
 * `unreadCount` comes from the same pass that produced `items`, so the badge
 * and the list cannot disagree. The export's card says "4 unread" in its header
 * and "14 unread" in its own footer link, in both languages.
 */
export function InboxCard({
  items,
  unreadCount,
  locale,
  showRecipient = false,
  heading,
  limit = 4,
}: {
  items: InboxItemRecord[];
  unreadCount: number;
  locale: Locale;
  /** A secretary's triage view labels whose correspondence each row is. */
  showRecipient?: boolean;
  /** Overrides the card title. A secretary's view is not "your inbox". */
  heading?: string;
  /**
   * How many rows to PREVIEW. The caption still counts the whole scope.
   *
   * Added when the Unified Inbox landed and the same function started
   * returning eleven rows for a legal secretary: a dashboard card that lists
   * everything is not a card, it is the screen rendered twice. The count
   * above the list is deliberately NOT the preview length — it reports what
   * is in the inbox, which is what the reader needs to decide whether to
   * open it.
   */
  limit?: number;
}) {
  const shown = items.slice(0, limit);
  const t = useTranslations('staffDashboard.inbox');

  return (
    <Card padding="none" className="flex h-full rounded-[var(--syn-tile-radius)] flex-col overflow-hidden">
      <header className="border-b border-gray-200 p-5">
        <CardHead
          icon={Inbox}
          heading={heading ?? t('heading')}
          caption={t('unread', { count: unreadCount })}
        />
      </header>

      {items.length === 0 ? (
        <p className="p-5 text-body text-gray-600">{t('empty')}</p>
      ) : (
        <ul className="divide-y divide-gray-200">
          {shown.map((item) => (
            <li key={item.id} className="flex items-start gap-3 p-4">
              <span
                aria-hidden
                className={
                  item.unread
                    ? 'mt-1.5 h-2 w-2 shrink-0 rounded-pill bg-action'
                    : 'mt-1.5 h-2 w-2 shrink-0 rounded-pill bg-transparent'
                }
              />

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                  <span
                    className={
                      item.unread
                        ? 'text-body font-medium text-gray-700'
                        : 'text-body text-gray-600'
                    }
                  >
                    <bdi>{item.from[locale]}</bdi>
                  </span>
                  <span className="text-caption text-gray-600 [unicode-bidi:isolate]">
                    {formatRelativeDays(item.receivedOn, locale)}
                  </span>
                </div>

                <p className="mt-0.5 truncate text-caption text-gray-600">
                  <bdi>{item.subject[locale]}</bdi>
                </p>

                <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  <Badge tone="neutral" icon={null}>
                    {t(`sources.${item.source}`)}
                  </Badge>

                  {/* Whose it is. On a secretary's screen the name; on a fee
                      earner's, only the fact that it was addressed to them. */}
                  {showRecipient && item.forStaff ? (
                    <Badge tone="info" icon={null}>
                      {t('forStaff', { name: item.forStaff[locale] })}
                    </Badge>
                  ) : null}
                  {!showRecipient && item.personal ? (
                    <Badge tone="info" icon={null}>
                      {t('toYou')}
                    </Badge>
                  ) : null}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/*
        The way into the screen this card previews. Both read
        `staff.inboxList`, so the count above and the rows there cannot
        describe different sets — which is the only reason a preview is safe to
        show at all.
      */}
      <div className="border-t border-gray-200 p-4">
        <Link
          href="/staff/inbox"
          className="inline-flex items-center gap-1.5 text-caption text-legal-navy hover:underline"
        >
          {t('viewAll', { count: items.length })}
          {/* A direction, so it mirrors. design.md §12. */}
          <ArrowRight aria-hidden size={14} className="rtl:rotate-180" />
        </Link>
      </div>
    </Card>
  );
}

/* ===========================================================================
 * Agenda
 * ======================================================================== */

/**
 * Today: the meetings this person is in, merged with court dates from the
 * engagements they work on.
 *
 * The hearings are read from the engagements' own timelines rather than copied
 * into a calendar fixture — fixtures/engagements.ts is the single source of
 * truth for a date, so a court date cannot appear here with one date and on the
 * matter with another.
 */
export function AgendaCard({ entries, locale }: { entries: AgendaEntry[]; locale: Locale }) {
  const t = useTranslations('staffDashboard.agenda');

  return (
    <Card padding="none" className="flex h-full rounded-[var(--syn-tile-radius)] flex-col overflow-hidden">
      <header className="border-b border-gray-200 p-5">
        <CardHead
          icon={CalendarDays}
          heading={t('heading')}
          caption={t('caption', { count: entries.length })}
        />
      </header>

      {entries.length === 0 ? (
        <p className="p-5 text-body text-gray-600">{t('empty')}</p>
      ) : (
        <ul className="divide-y divide-gray-200">
          {entries.map((entry) => (
            <li key={entry.id} className="flex items-start gap-3 p-4">
              {/* A meeting has a time; a court date from a timeline does not,
                  and this does not invent one. */}
              <span className="w-16 shrink-0 font-mono text-reference text-gray-600 [unicode-bidi:isolate]">
                {entry.at ? formatClockTime(entry.at, locale) : t('allDay')}
              </span>

              <div className="min-w-0 flex-1">
                <p className="text-body text-gray-700">
                  <bdi>{entry.title[locale]}</bdi>
                </p>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-caption text-gray-600">
                  <bdi>{entry.detail[locale]}</bdi>
                  {entry.engagementRef ? (
                    <>
                      <span aria-hidden className="text-gray-300">·</span>
                      <span dir="ltr" className="font-mono text-reference">
                        {entry.engagementRef}
                      </span>
                    </>
                  ) : null}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/* ===========================================================================
 * Billing
 * ======================================================================== */

/**
 * Recorded hours, for the ranks that record time.
 *
 * NOT RENDERED AT ALL for a legal secretary — `RANKS_THAT_BILL` in lib/ranks.ts
 * gates both this and the timer, and `mockApi.staff.billing` throws rather than
 * returning zeroes for a rank with no hours row. An hours card reading 0 beside
 * a target is a performance score invented by a layout.
 *
 * `total` is summed from `weeks` in the API, never stated alongside them.
 */
export function BillingCard({ billing, locale }: { billing: BillingSummary; locale: Locale }) {
  const t = useTranslations('staffDashboard.billing');

  return (
    <Card padding="lg" className="flex h-full rounded-[var(--syn-tile-radius)] flex-col">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-200 pb-3">
        <CardHead icon={Receipt} heading={t('heading')} caption={t('caption')} />
        {/*
          Rendered wherever this card is, which is exactly the set of ranks that
          record time — the card and the dialog are gated by the same
          `RANKS_THAT_BILL` that mounts the timer. The Server Action checks it
          again; see log-time-action.ts.

          The options are flattened HERE because this is where the locale is.
        */}
        <LogTimeModal
          engagements={billing.engagements.map((row) => ({
            value: row.value,
            label: row.label[locale],
          }))}
          today={billing.today}
          weeksShown={billing.weeksShown}
        />
      </div>

      <p className="mt-4 text-caption text-gray-600">{t('recorded')}</p>
      {/* Mono and tabular — design.md §3 and §9. */}
      <p className="mt-0.5 font-mono text-display font-medium tabular-nums text-gray-900 [unicode-bidi:isolate]">
        {t('hours', { hours: billing.total })}
      </p>

      <HoursChart weeks={billing.weeks} target={billing.targetPerWeek} />

      {/*
        The same line, narrowed. It used to say the figure is not fed by
        anything, because nothing fed it. Logging time now does — the entry
        goes into the same sum — so this says what moves it and what still does
        not. The TIMER still throws its seconds away (UIStateProvider), and a
        dashboard that let someone assume otherwise would be understating their
        own hours to them.
      */}
      <p className="mt-4 text-caption text-gray-600">{t('notLive')}</p>

      {/*
        §5.1: a screen showing a session-scoped record says so. Without this the
        hours simply look different from the last time somebody looked.
      */}
      {billing.loggedThisSession.entries > 0 ? (
        <p className="mt-2 text-caption text-gray-600">
          {t('loggedThisSession', {
            entries: billing.loggedThisSession.entries,
            hours: Math.floor(billing.loggedThisSession.minutes / 60),
            minutes: billing.loggedThisSession.minutes % 60,
          })}
        </p>
      ) : null}
    </Card>
  );
}
