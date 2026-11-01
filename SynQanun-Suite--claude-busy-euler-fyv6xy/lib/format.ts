import type { Locale } from '@/lib/i18n/routing';

/**
 * lib/format.ts — locale-aware formatting for dates, money and file sizes.
 *
 * WHY THIS FILE EXISTS
 * ---------------------------------------------------------------------------
 * Accept Invite shipped an expiry date that rendered a day late, because
 * `Intl` formatted the instant in whatever timezone the runtime happened to be
 * in. That was one screen with one date. The Client Dashboard has a key-dates
 * strip, invoice due dates, document share dates and message timestamps — four
 * more chances to make the same mistake four different ways.
 *
 * So the rule is centralised rather than repeated: nothing in app/ constructs
 * an `Intl.DateTimeFormat` or an `Intl.NumberFormat` directly. Every formatter
 * below pins an explicit timezone and an explicit numbering system, and every
 * screen goes through them.
 *
 * THE TWO KINDS OF TIME, AND WHY THEY ARE MODELLED DIFFERENTLY
 * ---------------------------------------------------------------------------
 * An INSTANT is a moment on the world's clock. An invitation expires at one —
 * 23:59:59+03:00 is a real point in time, and it has already passed for
 * everyone simultaneously. fixtures/invites.ts models it as an ISO string with
 * an offset, which is correct for that case.
 *
 * A CALENDAR DATE is not an instant. A hearing listed for 14 March is on 14
 * March in the court's jurisdiction; it is not "14 March 00:00 UTC" and it does
 * not become 13 March for a reader in Los Angeles. Deadlines, due dates and
 * filing dates in this product are calendar dates in the FIRM's jurisdiction,
 * and are carried as 'YYYY-MM-DD' strings with no time component at all.
 *
 * Conflating the two is what produces off-by-one dates. Keeping them as
 * separate types, with separate formatters, is what stops it.
 *
 * NUMERALS
 * ---------------------------------------------------------------------------
 * design.md §12: "use Western (0–9) digits in both languages for dates,
 * currency, and IDs — standard practice in Egyptian/GCC legal and financial
 * documents; don't switch to Arabic-Indic numerals even in full-Arabic
 * screens." The `-u-nu-latn` extension on the Arabic locale is what enforces
 * that while keeping Arabic month names and currency terms.
 *
 * ===========================================================================
 * RENDERING RULE — WHEN TO FORCE `dir="ltr"`, AND WHEN NOT TO
 * ===========================================================================
 * This is easy to get backwards, and it was got backwards once already on this
 * screen. The Client Dashboard first shipped with `dir="ltr"` on the key-dates
 * strip, on the theory that Western digits want a left-to-right run. Measured
 * in the browser, "20 سبتمبر 2026" came out as **"20 2026 سبتمبر"** — day,
 * year, month — in all four cards. Forcing the base direction pulled the year
 * out from behind the month name.
 *
 * The distinction is what the string is MADE OF, not whether it contains
 * digits:
 *
 *   · FORCE `dir="ltr"` on strings that are Latin whatever the locale, because
 *     they are identifiers rather than language: "MAT-2201", "INV-2026-089",
 *     an email address, a subdomain. These do not translate, they never
 *     contain an Arabic word, and dropping them into an Arabic paragraph
 *     unisolated lets the bidi algorithm split them around their punctuation.
 *
 *   · DO NOT force a direction on anything these formatters return. A
 *     localised date, time, money amount or file size contains Arabic words in
 *     Arabic ("20 سبتمبر 2026", "11:30 ص", "840 كيلوبايت"), and its correct
 *     visual order IS the right-to-left one. Isolate it —
 *     `[unicode-bidi:isolate]`, or `dir="auto"` for content whose script is
 *     unknown, such as a filename — and let it inherit the paragraph.
 *
 * Isolation and direction are two different things. Isolation stops a run from
 * disturbing its neighbours, which is always wanted. Setting the direction
 * overrides how the run orders internally, which is almost never wanted.
 */

/**
 * The tenant's jurisdiction for the purposes of dates.
 *
 * MOCK: hardcoded to the demo firm's zone. In production this is a tenant
 * setting resolved alongside {{CLIENT_NAME}} in fixtures/firm.ts — a firm in
 * Riyadh and a firm in Cairo must not see each other's cut-off. Track A.5,
 * with the real tenant-configuration lookup.
 *
 * Note it is the FIRM's zone and not the reader's. A deadline shown to a client
 * has to be stated in the zone the deadline actually falls in, or the client
 * misses it by a day.
 */
export const TENANT_TIME_ZONE = 'Asia/Riyadh';

/**
 * A calendar date in the tenant's jurisdiction — 'YYYY-MM-DD', no time, no
 * offset. See the file header for why this is deliberately not an instant.
 */
export type CalendarDate = string;

/** A wall-clock time in the tenant's jurisdiction — 'HH:mm', 24-hour. */
export type ClockTime = string;

/**
 * The BCP-47 tag to format with.
 *
 * `en-GB` rather than `en-US` for day-first dates (14 March, not March 14),
 * which is the convention in both Egyptian and Gulf legal practice.
 */
export function intlLocale(locale: Locale): string {
  return locale === 'ar' ? 'ar-EG-u-nu-latn' : 'en-GB';
}

/* ===========================================================================
 * Calendar arithmetic
 *
 * All of it is done on the 'YYYY-MM-DD' string via a UTC-midnight parse. That
 * is safe precisely BECAUSE these are not instants: no zone is involved, so
 * there is no DST transition to land on and nothing to shift.
 * ======================================================================== */

/**
 * Today's date in the tenant's jurisdiction.
 *
 * `en-CA` is used purely because its short date format is already ISO
 * ('2026-09-17'); no Canadian locale reaches the interface.
 */
export function tenantToday(now: Date = new Date()): CalendarDate {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TENANT_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/**
 * The current wall-clock time in the tenant's jurisdiction, as 'HH:mm'.
 *
 * The companion to `tenantToday()`, and it exists for the same reason: a client
 * in London writing to a Cairo firm should see their message land on the FIRM's
 * clock, beside the firm's messages, rather than two hours adrift from them. The
 * browser's zone is not the relevant one on any screen in this product.
 */
export function tenantNow(now: Date = new Date()): ClockTime {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: TENANT_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(now);
}

/**
 * Day of the week for a calendar date — 0 is Sunday, 6 is Saturday.
 *
 * Exists so a jurisdiction's weekend can be expressed as numbers rather than as
 * a hardcoded assumption. The Stitch export for the booking modal offered a
 * Friday consultation slot; the demo firm is in Cairo, where Friday and Saturday
 * are the weekend. See fixtures/availability.ts.
 *
 * The UTC-noon parse is the same trick the formatters use: no zone is involved
 * in a calendar date, so nothing can shift it across a boundary.
 */
export function weekdayOf(date: CalendarDate): number {
  return new Date(`${date}T12:00:00Z`).getUTCDay();
}

export function addDays(date: CalendarDate, days: number): CalendarDate {
  const parsed = new Date(`${date}T00:00:00Z`);
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
}

/** Whole days from `from` to `to`. Negative when `to` is in the past. */
export function daysBetween(from: CalendarDate, to: CalendarDate): number {
  return Math.round(
    (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000
  );
}

/** Calendar year, for deriving reference numbers like INV-2026-089. */
export function yearOf(date: CalendarDate): number {
  return Number(date.slice(0, 4));
}

/* ===========================================================================
 * Formatters
 * ======================================================================== */

/**
 * A calendar date, e.g. "19 Sept 2026" / "19 سبتمبر 2026".
 *
 * The UTC noon parse plus `timeZone: 'UTC'` is the whole trick: it guarantees
 * the formatter reads back exactly the calendar date it was given, in every
 * runtime, on the server and in the browser. Midnight would work too; noon
 * leaves no doubt.
 */
export function formatCalendarDate(
  date: CalendarDate,
  locale: Locale,
  options: { month?: 'short' | 'long'; year?: boolean } = {}
): string {
  const { month = 'short', year = true } = options;

  return new Intl.DateTimeFormat(intlLocale(locale), {
    day: '2-digit',
    month,
    ...(year ? { year: 'numeric' as const } : {}),
    timeZone: 'UTC',
  }).format(new Date(`${date}T12:00:00Z`));
}

/**
 * A weekday name on its own, e.g. "Thu" / "الخميس".
 *
 * Separate from `formatCalendarDate` because the booking date picker stacks the
 * two — weekday above, day number below — and needs them as independent strings
 * rather than as one formatted line it would have to split.
 */
export function formatWeekday(
  date: CalendarDate,
  locale: Locale,
  width: 'short' | 'long' = 'short'
): string {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    weekday: width,
    timeZone: 'UTC',
  }).format(new Date(`${date}T12:00:00Z`));
}

/**
 * The day of the month alone, e.g. "20". For the same picker.
 *
 * Goes through `Intl` rather than `date.slice(8)` so the numbering system stays
 * under the one rule in this file, and so a leading zero is dropped the way the
 * locale would drop it.
 */
export function formatDayOfMonth(date: CalendarDate, locale: Locale): string {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${date}T12:00:00Z`));
}


/**
 * "March 2026" / "مارس 2026" — the label a calendar puts over a month.
 *
 * Formatted from the calendar date at noon UTC, the same way every other
 * date in this file is — the anchor is what stops a month flipping either side
 * of midnight. A CalendarDate is already a date in the tenant's jurisdiction;
 * it has no instant to convert.
 */
export function formatMonthYear(date: CalendarDate, locale: Locale): string {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    timeZone: 'UTC',
    month: 'long',
    year: 'numeric',
    
  }).format(new Date(`${date}T12:00:00Z`));
}

/**
 * The first day of the calendar week `date` falls in.
 *
 * Takes the week start rather than assuming one: a Cairo firm’s week begins
 * on Sunday, and hardcoding Monday here would put its weekend in the middle
 * of the grid. See WEEK_STARTS_ON in fixtures/availability.ts.
 */
export function startOfWeek(date: CalendarDate, weekStartsOn: number): CalendarDate {
  const shift = (weekdayOf(date) - weekStartsOn + 7) % 7;
  return addDays(date, -shift);
}

/**
 * The first working day on or after `date`.
 *
 * The demo fixtures place meetings at an offset from today, and today moves:
 * the same fixture opened on a Tuesday and on a Thursday puts its "+2 days"
 * entry on different weekdays, and two days a week that lands on a closed
 * office. fixtures/availability.ts found the same defect in Batch 3, where
 * the booking picker’s committed slots kept falling on the weekend and
 * vanishing.
 *
 * Court dates are NOT pushed through this. They come off an engagement’s
 * timeline, which is the single source of truth for them and is read by the
 * key-dates strip, the matter detail and the client portal — moving one here
 * would move it on this screen only.
 */
export function nextWorkingDay(date: CalendarDate, weekendDays: readonly number[]): CalendarDate {
  let cursor = date;
  // At most a full week: a weekend cannot be seven days long.
  for (let guard = 0; guard < 7 && weekendDays.includes(weekdayOf(cursor)); guard += 1) {
    cursor = addDays(cursor, 1);
  }
  return cursor;
}

/**
 * The last working day on or before `date`.
 *
 * THE MIRROR OF THE ABOVE, AND IT EXISTS BECAUSE THE ABOVE WAS BEING USED FOR
 * BOTH DIRECTIONS
 * ---------------------------------------------------------------------------
 * `nextWorkingDay` is correct for an offset into the future: a meeting the
 * fixture puts two days out, landing on a closed Friday, happens on the Sunday.
 * Applied to an offset into the PAST it says the opposite of what it means — a
 * meeting the fixture puts yesterday, landing on a closed Friday, gets pushed
 * to the Sunday and is now reported as happening tomorrow.
 *
 * That was live. Opened on a Saturday — a closed day in this tenant's
 * jurisdiction — the calendar showed `inDays: -1` as a future date while the
 * entry was still flagged as past, so a meeting that had already happened sat
 * on tomorrow's column. Found while giving a past meeting a transcript, where
 * a future date makes the record incoherent rather than merely misplaced.
 *
 * So direction is now chosen by the sign of the offset; see `meetingDate` in
 * lib/mock-api.ts, which is the only caller of either.
 */
export function previousWorkingDay(
  date: CalendarDate,
  weekendDays: readonly number[]
): CalendarDate {
  let cursor = date;
  for (let guard = 0; guard < 7 && weekendDays.includes(weekdayOf(cursor)); guard += 1) {
    cursor = addDays(cursor, -1);
  }
  return cursor;
}
/** The first day of the month `date` falls in. */
export function startOfMonth(date: CalendarDate): CalendarDate {
  return `${date.slice(0, 7)}-01`;
}

/** Minutes from midnight — how a timed entry is placed on a day grid. */
export function minutesOfDay(time: ClockTime): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}
/**
 * The tenant's current UTC offset, e.g. "GMT+3".
 *
 * DERIVED, never written down. Cairo is GMT+2 in winter and GMT+3 in summer, so
 * a hardcoded label in a translation string would be wrong for half the year —
 * and the Stitch export hardcoded the wrong zone entirely (see the header of
 * app/[locale]/(client)/BookCallModal.tsx). Asking `Intl` for the offset of a
 * specific instant is the only form of this that cannot rot.
 *
 * The caller supplies the surrounding words, which say "the firm's local time"
 * rather than naming a city — the city is tenant configuration and does not
 * belong in a dictionary.
 */
export function tenantZoneOffset(locale: Locale, now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat(intlLocale(locale), {
    timeZone: TENANT_TIME_ZONE,
    timeZoneName: 'shortOffset',
  }).formatToParts(now);

  return parts.find((part) => part.type === 'timeZoneName')?.value ?? '';
}

/**
 * A wall-clock time already expressed in the tenant's zone.
 *
 * No conversion happens here, and that is intentional — the string arrives as
 * the time the firm recorded, and re-projecting it into the reader's zone would
 * be the Accept Invite bug in a different costume. The arbitrary UTC date is a
 * carrier for the formatter and never rendered.
 */
export function formatClockTime(time: ClockTime, locale: Locale): string {
  const [hours, minutes] = time.split(':').map(Number);

  return new Intl.DateTimeFormat(intlLocale(locale), {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(2000, 0, 1, hours, minutes)));
}

/**
 * A duration as `m:ss`, or `h:mm:ss` once it passes an hour.
 *
 * NOT `formatClockTime`, AND THE DIFFERENCE MATTERS. That one takes a time of
 * day and projects it through a locale's clock — 14:00 becomes "2:00 pm". This
 * takes an ELAPSED count, which is not a time of day and has no am/pm, no
 * timezone and no 12-hour form. Putting a transcript offset through the clock
 * formatter would render four minutes into a meeting as "12:04 am".
 *
 * No locale formatting at all, therefore, and none is missing: `intlLocale` puts
 * Arabic on Latin digits (`-u-nu-latn`), so a bare `4:12` already matches every
 * other number in the Arabic interface. The colon is a separator inside a single
 * token, which is why callers render it isolated rather than letting it sit loose
 * in a right-to-left line.
 */
export function formatElapsed(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = seconds % 60;

  const pad = (value: number) => String(value).padStart(2, '0');

  return hours > 0
    ? `${hours}:${pad(minutes)}:${pad(rest)}`
    : `${minutes}:${pad(rest)}`;
}

/**
 * Wrap a run of unknown script so it cannot reorder the sentence around it.
 *
 * This is exactly what `<bdi>` does, done with characters instead of markup:
 * U+2068 FIRST STRONG ISOLATE opens a run whose direction is taken from its own
 * first strong character, and U+2069 POP DIRECTIONAL ISOLATE closes it.
 *
 * It exists because markup is not always available. A notification's sentence
 * lives in the dictionaries as "{subject} is waiting for your signature", and
 * the subject is a filename that may be Latin inside an Arabic sentence.
 * next-intl's `t.rich` only accepts tag FUNCTIONS as values, not elements, so
 * there is no way to pass a `<bdi>` through a placeholder — and an empty
 * `<subject></subject>` tag pair in every message just to hang an element off
 * would be a worse thing to hand a translator.
 *
 * Prefer the `<bdi>` element wherever you are already writing JSX. Reach for
 * this only when the value has to travel through a translated string.
 */
export function isolateRun(value: string): string {
  return `⁨${value}⁩`;
}

/**
 * How long ago a calendar date was, e.g. "3 days ago" / "منذ 3 أيام", and
 * "yesterday" / "أمس" and "today" / "اليوم" for the two nearest days.
 *
 * DAY GRANULARITY, DELIBERATELY. The Stitch export's notification panel shows
 * "10m ago", "2h ago", "3h ago" — minute and hour precision over records that
 * only ever knew a date. Inventing a time of day to make a feed look live is
 * the same class of thing as inventing an amount: it is a detail the system
 * does not have, rendered as though it did. `numeric: 'auto'` is what produces
 * the idiomatic word for ±1 rather than "1 day ago".
 *
 * `daysBetween` does the arithmetic on the calendar-date string, so this cannot
 * drift across a timezone the way `Date.now() - timestamp` would.
 */
export function formatRelativeDays(
  date: CalendarDate,
  locale: Locale,
  today: CalendarDate = tenantToday()
): string {
  return new Intl.RelativeTimeFormat(intlLocale(locale), { numeric: 'auto' }).format(
    daysBetween(today, date),
    'day'
  );
}

/**
 * A money amount, e.g. "USD 24,500.00" / "‏24,500.00 USD".
 *
 * `currencyDisplay: 'code'` rather than a symbol, deliberately. "$12,000" is
 * ambiguous across USD/AED/SAR-denominated engagements, and a fee statement is
 * the wrong place to make a client guess which dollar. The ISO code is also
 * what invoices in the region actually print.
 *
 * The Arabic form places the code after the number and carries a leading
 * RIGHT-TO-LEFT MARK from CLDR. Render it inside `unicode-bidi: isolate` but do
 * NOT force `dir="ltr"` on it — unlike an email address, this string is meant
 * to reorder with the surrounding Arabic text.
 *
 * MOCK: `amount` is a JS number in major units, which is fine for fixtures and
 * wrong for a ledger. The real schema stores minor units as an integer (or a
 * decimal column); floating-point money and legal billing do not belong in the
 * same sentence. Track A.5.
 */
export function formatMoney(amount: number, currency: string, locale: Locale): string {
  return new Intl.NumberFormat(intlLocale(locale), {
    style: 'currency',
    currency,
    // Narrow symbol, not the code: a Saudi firm's statements read ر.س
    // in Arabic. English still falls back to 'SAR', because that IS the
    // narrow symbol in en-GB — the setting is not a per-locale branch.
    currencyDisplay: 'narrowSymbol',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/** A file size, e.g. "1.4 MB" / "840 kB". Decimal units, as file managers show. */
export function formatFileSize(bytes: number, locale: Locale): string {
  const megabytes = bytes / 1_000_000;
  const useMegabytes = megabytes >= 1;

  return new Intl.NumberFormat(intlLocale(locale), {
    style: 'unit',
    unit: useMegabytes ? 'megabyte' : 'kilobyte',
    unitDisplay: 'short',
    maximumFractionDigits: useMegabytes ? 1 : 0,
  }).format(useMegabytes ? megabytes : bytes / 1000);
}

/** A plain integer, for counts rendered inside prose. */
export function formatCount(value: number, locale: Locale): string {
  return new Intl.NumberFormat(intlLocale(locale)).format(value);
}
