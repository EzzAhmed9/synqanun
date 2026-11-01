/**
 * The firm's five staff ranks.
 *
 * Product structure, not tenant data — every firm on the platform uses the
 * same ladder — so this lives in lib/ rather than /fixtures. BUILD_PLAN.md
 * §"Track A.5" refers to "the 5 staff ranks" as a fixed set that role-based
 * access is built against.
 *
 * Labels are NOT here. They are keys into the `ranks` namespace of the
 * translation dictionaries, so a rank cannot be added without a label existing
 * in both languages.
 *
 * ===========================================================================
 * EVERY RANK HAS TWO LABELS, AND ARABIC IS WHY
 * ===========================================================================
 *   ranks.<rank>         the CATEGORY. Used where the label names a class
 *                        rather than a person: the onboarding rank dropdown,
 *                        the rate table, the review summary.
 *   ranks.holder.<rank>  the form that sits beside somebody's NAME — the top
 *                        bar, a matter's team, a secretary's roster, who
 *                        priced a quote.
 *
 * Arabic job titles inflect for gender. "محامٍ أول" is masculine singular, and
 * rendering it under "فاطمة الزهراء" is simply wrong — the same defect the
 * fixtures already refuse for honorifics, where fixtures/matters.ts drops
 * "Adv." / "المستشار" / "المستشارة" because the Arabic form is gendered and
 * the Stitch exports assign gender by inference.
 *
 * The fix is NOT to store each person's gender. It is to stop using a
 * category name as though it described them: `holder` prefixes the Arabic
 * with "درجة:" so the label reads as a field — the rank someone holds —
 * which agrees with nobody. English needs no such thing, so its two forms are
 * deliberately identical strings; "Rank: Senior associate" beside a name
 * would be noise.
 *
 * ONE PLACE STILL TAKES THE BARE FORM ON PURPOSE: the billing refusal, which
 * interpolates a rank mid-sentence, where "درجة: …" would read as a label
 * dropped into a clause. That sentence carries the framing itself.
 */
export const RANKS = [
  'partner',
  'seniorAssociate',
  'juniorAssociate',
  'paralegal',
  'legalSecretary',
] as const;

export type Rank = (typeof RANKS)[number];

/**
 * The ranks that record billable time.
 *
 * An ALLOW-LIST, the third in this codebase after `StaffNavEntry.ranks` and
 * `RANKS_WITH_DASHBOARD`, and for the same reason: a rank added later does not
 * silently acquire a timer.
 *
 * WHY THE LEGAL SECRETARY IS NOT IN IT
 * ---------------------------------------------------------------------------
 * A legal secretary's time is not charged to a client, so a billable-hours
 * timer on that screen is an instrument with nothing to measure. Left mounted,
 * it would have produced an hours figure of zero beside a target — a
 * performance score, on the one rank in the firm whose output the product
 * cannot count. The Stitch export takes the opposite turn and invents a
 * "Filing Efficiency Rate: 98.4%" for exactly that person.
 *
 * This gates both the timer in app/[locale]/(staff)/layout.tsx and the hours
 * card on the dashboards. fixtures/practice.ts has no hours row for stf-008 to
 * match, so a screen that ignored this would fail loudly rather than render a
 * zero.
 */
export const RANKS_THAT_BILL = [
  'partner',
  'seniorAssociate',
  'juniorAssociate',
  'paralegal',
] as const satisfies readonly Rank[];

/**
 * Who may read the firm's billing — fee statements, quotes, what is owed.
 *
 * ===========================================================================
 * HOISTED OUT OF THE NAV, BECAUSE THE NAV STOPPED BEING ITS ONLY READER
 * ===========================================================================
 * This list lived inline in components/chrome/nav-items.ts, which was right
 * while the sidebar and the billing route were the only things asking. The
 * staff-side global search made a third reader, and a search box is exactly
 * where a duplicated allow-list does its damage: reaching past a gate one row
 * at a time hands somebody the contents of a screen they were refused.
 *
 * lib/ranks.ts rather than the nav because the API layer needs it too, and a
 * module under lib/ importing a component module would pull lucide icons into
 * the server bundle to read one array.
 *
 * Not the same question as `RANKS_THAT_BILL`, which is who RECORDS billable
 * time — a paralegal does, and still may not read the firm's ledger.
 */
export const RANKS_THAT_SEE_BILLING = [
  'partner',
  'seniorAssociate',
] as const satisfies readonly Rank[];

/** Whether this rank may read the firm's billing. */
export function seesBilling(rank: Rank): boolean {
  return (RANKS_THAT_SEE_BILLING as readonly Rank[]).includes(rank);
}

/**
 * Who may be put in charge of a file.
 *
 * Narrower than `RANKS_THAT_BILL`: a paralegal and a junior associate work ON
 * matters — fixtures/practice.ts assigns both to files through
 * `demoSupportAssignments` — but being RESPONSIBLE for one is a different
 * thing, and the register's lead column means the second.
 *
 * MOCK: a firm could configure this. Track A.5, with the tenant settings.
 */
export const LEAD_ELIGIBLE_RANKS: readonly Rank[] = ['partner', 'seniorAssociate'];

/** Whether this rank records billable time. */
export function recordsTime(rank: Rank): boolean {
  return (RANKS_THAT_BILL as readonly Rank[]).includes(rank);
}

/**
 * Default hourly rates seeded into the onboarding wizard's billing step, in
 * the firm's chosen currency.
 *
 * Starting values only — the step presents them as editable. They descend by
 * seniority, which is the shape a firm expects to see rather than a row of
 * identical zeroes it has to fill in from scratch.
 *
 * MOCK: replace with the tenant's configured rate card. Track A.5.
 */
export const DEFAULT_HOURLY_RATES: Record<Rank, number> = {
  partner: 3500,
  seniorAssociate: 2200,
  juniorAssociate: 1400,
  paralegal: 800,
  legalSecretary: 500,
};

/**
 * Currencies offered for invoicing.
 *
 * Regional first — the product is built for the Egyptian and MENA market
 * (brand-guidelines.md §1) — then the two a MENA firm most often bills
 * international clients in.
 *
 * design.md §12: amounts render in Western digits in both languages, so the
 * codes stay Latin throughout and are never transliterated.
 */
export const CURRENCIES = ['EGP', 'AED', 'SAR', 'USD', 'EUR', 'GBP'] as const;

export type Currency = (typeof CURRENCIES)[number];
