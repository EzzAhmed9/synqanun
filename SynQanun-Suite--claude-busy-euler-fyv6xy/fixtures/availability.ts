import type { ClockTime } from '@/lib/format';

/**
 * fixtures/availability.ts — when the firm will sit down with a client.
 *
 * Created for the book-a-call modal. Everything here is the firm's own working
 * pattern, expressed in the firm's wall clock, and every value below is one the
 * demo can state without claiming anything about a real calendar.
 *
 * ===========================================================================
 * THE WEEKEND IS DATA, NOT AN ASSUMPTION
 * ===========================================================================
 * The Stitch export offered Wed 19, Thu 20, **Fri 21**, Mon 24, Tue 25 March.
 * The demo firm is in Cairo (fixtures/firm.ts, TENANT_TIME_ZONE), where the
 * weekend is Friday and Saturday — so the export's grid put a consultation slot
 * on a day the office is shut, and skipped Sunday, which is a full working day
 * in Egypt and across the Gulf.
 *
 * This is the same error as the UAE VAT line on a Cairo firm's invoice, and the
 * UAE mobile number given to a lawyer at an Egyptian firm: a Gulf/Western
 * default applied to a jurisdiction that does not share it. A Mon–Fri working
 * week is not a safe assumption anywhere this product is sold.
 *
 * So the weekend is a list of weekday numbers, and the picker skips whatever is
 * in it. Changing jurisdiction is a data edit.
 *
 * MOCK: a tenant setting in the real system, resolved alongside the timezone —
 * a firm in Cairo, one in Riyadh and one in Casablanca do not share a working
 * week, and some firms sit on Saturday. Track A.5, with the rest of the tenant
 * configuration.
 */

/** Weekday numbers the office is closed. 0 is Sunday, 6 is Saturday. */
export const WEEKEND_DAYS: readonly number[] = [5, 6];

/**
 * Which weekday a calendar week starts on. 0 is Sunday.
 *
 * Belongs with WEEKEND_DAYS and moves with it: a Friday/Saturday weekend
 * puts the working week at Sunday through Thursday, so a week that begins on
 * Sunday shows five working days followed by the two closed ones. The Stitch
 * export starts its week on Monday and shades Saturday and Sunday, which is
 * the wrong weekend for every jurisdiction this product is built for.
 *
 * Stated rather than derived from WEEKEND_DAYS, because deriving it needs a
 * rule for non-contiguous weekends that nobody has decided yet — and a
 * guessed rule in tenant configuration is worse than a written one.
 *
 * MOCK: a tenant setting, resolved alongside the timezone and the weekend.
 * Track A.5.
 */
export const WEEK_STARTS_ON = 0;

/**
 * How long a client consultation runs, in minutes.
 *
 * The Arabic export stated this ("مدة الاستشارة: 45 دقيقة") and the English one
 * did not — one of several places the two languages disagreed about the same
 * screen. It is real, useful information, so both say it.
 */
export const CONSULTATION_MINUTES = 45;

/**
 * The firm's standing consultation hours, in the TENANT's wall clock.
 *
 * Not instants and not the reader's local time. A client in Dubai sees these
 * with the offset stated beside them — see the timezone note in
 * app/[locale]/(client)/BookCallModal.tsx for why the conversion is deliberately
 * not performed here.
 *
 * Note the gap between 12:00 and 14:00: the firm does not take consultations
 * over the middle of the day. An evenly spaced grid from 9 to 5 is what a
 * generated mock looks like, not what a practice's diary looks like.
 */
export const CONSULTATION_HOURS: readonly ClockTime[] = [
  '10:00',
  '11:30',
  '14:00',
  '15:30',
  '16:30',
];

/**
 * Slots already committed, positioned by WORKING day rather than calendar day.
 *
 * `workingDay` 0 is the first day the picker offers, 1 the next, and so on — so
 * these always land where they are meant to regardless of which day of the week
 * the demo is opened.
 *
 * That indirection is deliberate and was not the first attempt. Keyed by days
 * from today, the interesting states fell on the weekend and vanished: run the
 * demo on a Wednesday and the fully-committed day is Friday, which the picker
 * skips, so every day on screen is wide open. Run it on a Thursday and both the
 * partly-booked day and the full one disappear. The fixture would have been
 * silently correct four days a week and silently useless the other three.
 *
 * These exist so the picker has something real to remove. Without them every day
 * offers an identical five-slot row, which reads as a template rather than a
 * diary — and, more to the point, the modal would never exercise the two states
 * that actually need building: a partly-booked day, and a day with nothing left.
 *
 * MOCK: the real source is the assigned fee earner's calendar, per engagement —
 * a partner's free Thursday is not a firm-wide fact, and a real record is keyed
 * by an actual date, not by a position in a list. That is a Track B integration
 * (BUILD_PLAN.md §6, calendar). Until it exists, no screen may describe these as
 * confirmed availability.
 */
export const COMMITTED_SLOTS: readonly { workingDay: number; time: ClockTime }[] = [
  // Partly booked.
  { workingDay: 0, time: '10:00' },
  { workingDay: 0, time: '14:00' },
  // Fully committed — the picker's disabled-day state.
  { workingDay: 1, time: '10:00' },
  { workingDay: 1, time: '11:30' },
  { workingDay: 1, time: '14:00' },
  { workingDay: 1, time: '15:30' },
  { workingDay: 1, time: '16:30' },
  { workingDay: 3, time: '11:30' },
  { workingDay: 4, time: '16:30' },
];
