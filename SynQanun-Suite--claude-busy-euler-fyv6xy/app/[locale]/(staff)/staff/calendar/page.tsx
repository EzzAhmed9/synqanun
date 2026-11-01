import { setRequestLocale } from 'next-intl/server';
import {
  addDays,
  startOfMonth,
  startOfWeek,
  tenantToday,
  type CalendarDate,
} from '@/lib/format';
import type { Locale } from '@/lib/i18n/routing';
import { mockApi } from '@/lib/mock-api';
import { WEEK_STARTS_ON } from '@/fixtures/availability';
import { CalendarWorkspace, type CalendarView } from './CalendarWorkspace';

/**
 * Calendar — BUILD_PLAN.md §3, Batch 4, after the Unified Inbox.
 *
 * ===========================================================================
 * THE DATES ARE NOT THIS SCREEN'S
 * ===========================================================================
 * Nothing here owns a date. Meetings come from `demoFirmEvents`, which the
 * dashboard's agenda card already reads; court dates and filings come from the
 * engagements' own timelines, which fixtures/engagements.ts establishes as the
 * single source of truth for a date. `staff.calendar()` merges the two over a
 * range, so a hearing cannot show here on one day and on its matter on another.
 *
 * That is the whole reason there is no `demoCalendarEvents` collection: a
 * calendar is a VIEW of dates that already exist, and giving it its own copy is
 * how the copy starts drifting.
 *
 * ===========================================================================
 * EVERY PIECE OF STATE IS A URL
 * ===========================================================================
 * `?view=` (month/week/day), `?date=` (which period), `?event=` (what is open).
 * All three are views — you link someone to a week, you press back out of a
 * day — so none of them is client state and the screen needs no client
 * JavaScript at all. Same arrangement as the Unified Inbox, minus its search
 * box, because there is nothing here to type into.
 *
 * ---------------------------------------------------------------------------
 * NOT CARRIED OVER FROM THE STITCH EXPORT
 * ---------------------------------------------------------------------------
 *  · THE WEEKEND IS IN THE WRONG PLACE. The export starts its week on Monday
 *    and shades Saturday and Sunday. This firm is in Cairo: the weekend is
 *    Friday and Saturday and the week starts on Sunday, both of which are
 *    already tenant configuration in fixtures/availability.ts and were written
 *    there in Batch 3 for the booking picker.
 *
 *  · "GST (UTC+4)". Derived here instead, from the tenant's timezone — Cairo is
 *    GMT+3 — by the helper the booking flow already uses.
 *
 *  · "Connected to Microsoft 365 Exchange • Real-time legal docket", "Connected
 *    via Microsoft 365 Graph API", "Sovereign Cloud DXB-04", "TLS 1.3 Active".
 *    A calendar integration is Track B (BUILD_PLAN.md §6) and there is none.
 *
 *  · ZOOM, TEAMS AND GOOGLE MEET. Platform badges on every entry, a platform
 *    filter in the toolbar, "Join Zoom Meeting" with a live green pulse, and a
 *    provider picker in the new-event modal that offers to "Auto-generate link".
 *    No video integration exists, and a Join button is the most clickable lie a
 *    calendar can tell.
 *
 *  · THE AI MEETING COMPANION, and it is the worst of it. "Companion Active" on
 *    a live event, "Transcript ready", an "AI Meeting Companion • Verified
 *    Docket Summary" drawer with numbered findings, extracted action items
 *    assigned to named colleagues, and a confidence figure — "دقة 99.4%" in
 *    Arabic. There is no meeting recorder, no transcription and no assignment
 *    write. Second export running with a confidence score attached to invented
 *    AI output; design.md §5 requires sources, never a black box.
 *
 *    STILL TRUE AFTER BATCH 7, which built the transcript reader. What that
 *    screen shows is written sample minutes for two past internal meetings —
 *    BUILD_PLAN.md §5's one content exception — under a permanent label saying
 *    nobody said any of it. Everything in the paragraph above remains refused:
 *    nothing records a meeting, nothing transcribes one, nothing summarises one,
 *    nothing extracts an action item, nobody is assigned anything, and no
 *    accuracy figure is reported because there is no recording to be accurate
 *    against. The panel's link appears only where minutes exist and the reader
 *    was in the room; see CalendarWorkspace.tsx and fixtures/transcripts.ts.
 *
 *  · JUSTICE SIR JEREMY COOKE, again — a real English judge, now named in both
 *    locales, presiding over a fabricated DIFC case and setting a real-sounding
 *    filing deadline.
 *
 *  · "+ New event", and the modal behind it: participants by email, calendar
 *    invites "sent", a generated meeting link, and an AI companion toggle
 *    defaulted on. Creating an event is a write; writes are Batch 6. An inert
 *    primary button on a calendar is the eighth no-op this product has refused.
 *
 *  · A MATTER FILTER. Half the entries here are internal meetings with no
 *    engagement at all, so filtering by matter would empty the calendar of
 *    everything a person actually has to attend. Worth building when a meeting
 *    can be attached to a file — Batch 6, with the forms.
 *
 *  · `{{CLIENT_LOGO}}` rendered literally into the sidebar, in both locales,
 *    for the second export running.
 *
 *  · "Al-Tamimi & Partners" in English against "رم وشركاه" in Arabic; "Matters
 *    142"; "SynQanun Core v2.4 LTS • Live • ADGM Engine".
 *
 *  · ITS OWN INTERNAL CONTRADICTION: the left panel lists "DIFC Courts
 *    Pre-Trial Review — Today 2:00 PM" while the drawer for the same case says
 *    "Mar 11, 2025" and marks it Completed, on a screen whose header says today
 *    is Wednesday the 12th.
 */

/** Rendered per request — every date resolves against the tenant's clock. */
export const dynamic = 'force-dynamic';

const VIEWS: CalendarView[] = ['month', 'week', 'day'];

/** A `YYYY-MM-DD` that `Date` actually accepts, or null. */
function parseDate(value: string | undefined): CalendarDate | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = new Date(`${value}T12:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? null : value;
}

/**
 * The days a view covers.
 *
 * Month is padded out to whole weeks so the grid is rectangular — the leading
 * and trailing days belong to the neighbouring months and are dimmed, not
 * hidden, because a hearing on the 1st is still a hearing you need to see while
 * looking at the end of the previous month.
 */
function rangeFor(view: CalendarView, anchor: CalendarDate): CalendarDate[] {
  if (view === 'day') return [anchor];

  if (view === 'week') {
    const first = startOfWeek(anchor, WEEK_STARTS_ON);
    return Array.from({ length: 7 }, (_, index) => addDays(first, index));
  }

  const first = startOfWeek(startOfMonth(anchor), WEEK_STARTS_ON);
  // Six weeks always: a month can span six, and a grid that changed height
  // between months would move the toolbar under the reader's cursor.
  return Array.from({ length: 42 }, (_, index) => addDays(first, index));
}

export default async function StaffCalendarPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ view?: string; date?: string; event?: string }>;
}) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  setRequestLocale(locale);

  const today = tenantToday();
  // An unrecognised value falls back rather than erroring: both arrive from a
  // link someone may have kept, and the right answer to a stale one is this
  // week.
  const view: CalendarView = VIEWS.includes(query.view as CalendarView)
    ? (query.view as CalendarView)
    : 'week';
  const anchor = parseDate(query.date) ?? today;

  const days = rangeFor(view, anchor);
  const from = days[0];
  const to = days[days.length - 1];

  // MOCK: the session resolves this in production, and whose calendar this is
  // follows from it. Track A.5.
  const person = await mockApi.staff.currentStaff();
  const entries = await mockApi.staff.calendar(person.id, from, to);

  const selected = entries.find((entry) => entry.id === query.event) ?? null;

  return (
    <CalendarWorkspace
      locale={locale as Locale}
      view={view}
      anchor={anchor}
      today={today}
      days={days}
      entries={entries}
      selected={selected}
      // `startOfMonth(anchor)` rather than the first rendered day: the grid is
      // padded into the neighbouring months and those days must dim.
      month={startOfMonth(anchor).slice(0, 7)}
    />
  );
}
