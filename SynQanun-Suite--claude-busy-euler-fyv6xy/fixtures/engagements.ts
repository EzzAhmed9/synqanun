import type { Locale } from '@/lib/i18n/routing';

/**
 * fixtures/engagements.ts — the shapes a matter and a project have in common.
 *
 * WHY THIS FILE EXISTS
 * ---------------------------------------------------------------------------
 * These types lived in fixtures/matters.ts, and fixtures/projects.ts imported
 * them from there. That was defensible for one shared type. It stopped being
 * defensible at three: a project is not a kind of matter, and having the
 * project fixture reach into the matter fixture for its status tones, its
 * timeline shape and its lead's contact card made one look like a subclass of
 * the other.
 *
 * Both are ENGAGEMENTS — work the firm is instructed to do for a client. A
 * matter is contentious or regulatory and has a forum; a project is
 * transactional and has a jurisdiction. Everything below is what does not
 * depend on which of the two it is, and both files import from here rather
 * than from each other.
 */

/**
 * Tone for a status label. Maps onto <Badge tone>.
 *
 * `info` covers states that are neither an achievement nor a warning —
 * "Evidence collation" is simply where the file has got to. Deliberately no
 * `error`: an engagement is not a failed operation, and design.md §2 keeps that
 * tone (and its near-syn-red hue) for validation and failed actions.
 */
export type EngagementStatusTone = 'success' | 'warning' | 'info';

/** What kind of entry a timeline event is. Drives its label, not its colour. */
export type TimelineEventKind =
  /** A court or tribunal sitting. */
  | 'hearing'
  /** Something filed to a deadline. */
  | 'submission'
  /** A meeting — a pre-trial conference, a shareholder meeting. */
  | 'conference'
  /** A document lodged with a registry or regulator. */
  | 'filing';

/**
 * One entry on an engagement's procedural record.
 *
 * THE SINGLE SOURCE OF TRUTH FOR DATES
 * ---------------------------------------------------------------------------
 * An engagement used to carry a separate `keyDate` for the dashboard strip
 * alongside whatever its detail view showed. That meant writing the same
 * hearing twice — once as the key date, once as the first timeline event — and
 * two copies of a court date is exactly the kind of thing that ends up
 * disagreeing.
 *
 * So the timeline IS the record, and the dashboard's key date is DERIVED from
 * it: the next event that has not happened yet. One date, one place it is
 * written down. lib/mock-api.ts does the deriving, for matters and projects
 * alike.
 *
 * MOCK: dates are offsets from the tenant's today rather than fixed calendar
 * dates, so a demo shown three months from now still reads as current. The real
 * schema stores the actual date on the hearing, filing or milestone record —
 * nothing in production is relative to when a page was loaded. Track A.5.
 */
export interface TimelineEventSeed {
  id: string;
  /** Days from the tenant's today. Negative is past. */
  inDays: number;
  kind: TimelineEventKind;
  /** What happens, per locale. */
  title: Record<Locale, string>;
  /** Where, or under whose deadline, per locale. */
  detail: Record<Locale, string>;
  /**
   * A closing line — what the client must do, or what was confirmed. Per
   * locale, `null` when there is nothing to add.
   *
   * WRITTEN IN THE THIRD PERSON, BECAUSE TWO AUDIENCES READ IT. Three of these
   * used to say "Your signed authorisation is needed first". That is right on
   * the client's own portal and wrong on the firm's engagement screen, which
   * renders the same record and told a partner that their signature was
   * awaited. The obligation is the fact; whose it is, is said by the
   * `awaitingClient` badge beside it.
   */
  note: Record<Locale, string> | null;
  /** Already happened and been acknowledged. */
  completed: boolean;
  /**
   * The note is something the CLIENT has to act on, rather than a status the
   * firm is reporting. Only meaningful on an uncompleted event.
   */
  awaitingClient?: boolean;
}

/**
 * The person at the firm a client deals with on an engagement.
 *
 * Lead counsel on a matter, project lead on a project. Same fields, because
 * what a client needs from either is the same: who, what they do, how to reach
 * them, and who else is on it.
 */
export interface EngagementContact {
  /**
   * Full display name, per locale.
   *
   * NO HONORIFIC. The Stitch exports prefix these with "Adv." in English and
   * with "المستشار"/"المستشارة" in Arabic — a form that is grammatically
   * gendered, so rendering it would mean storing every fee earner's gender
   * purely to decorate their name, and the exports get it right only by
   * inference. The name alone says what the column needs; the label above it
   * supplies the role.
   */
  name: Record<Locale, string>;
  /** Position and practice group, per locale. */
  role: Record<Locale, string>;
  /**
   * Direct line. Latin in both locales, so it renders under `dir="ltr"`.
   *
   * NULLABLE, because the disclosure is per engagement and a file can exist
   * before it has been made. The note below always said as much — "not a field
   * that is always shown" — but the type insisted on a string, so opening a
   * matter for a fee earner with no line recorded elsewhere would have meant
   * inventing a number. A matter opened a minute ago has not published
   * anybody's extension, and now it can say so by holding null.
   *
   * MOCK: a real portal would not publish a fee earner's direct line to every
   * client contact unless the firm chose to; this is a per-engagement
   * disclosure setting in the real system.
   */
  phone: string | null;
  /** Work email. Built from the firm's own domain — see the fixtures. */
  email: string;
  /** Second fee earner on the file, per locale. `null` when there is only one. */
  supporting: Record<Locale, string> | null;
}
