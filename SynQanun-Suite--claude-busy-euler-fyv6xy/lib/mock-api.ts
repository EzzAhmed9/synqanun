/**
 * lib/mock-api.ts — the Track A ↔ Track A.5 seam.
 *
 * BUILD_PLAN.md is explicit about why this file exists (§"Who's building
 * what"):
 *
 *   "Every faked piece of data or behavior lives behind the lib/mock-api.ts
 *    layer (or its i18n/fixture equivalents) — never inline fake data
 *    scattered inside components. One file (or one clearly-named folder) is
 *    what the dev team replaces; nothing else should need to change."
 *
 * And §6: "lib/mock-api.ts → real API routes hitting a real Postgres
 * database." That is TRACK A.5 — still solo, not the dev team. Track B is
 * only the third-party integrations and the security hardening pass; almost
 * nothing in this file is theirs.
 *
 * ---------------------------------------------------------------------------
 * THE CONVENTION  (this is Batch 0 — the pattern, not the data)
 * ---------------------------------------------------------------------------
 * Batch 0 deliberately ships this file with no entity endpoints. Its job right
 * now is to fix the shape that every later batch follows, so the dev team gets
 * one uniform surface instead of 64 screens' worth of ad-hoc fetching.
 *
 * Four rules, applied to every function added here:
 *
 *   1. ASYNC, ALWAYS. Even when the data is a synchronous import. A screen
 *      written against a synchronous getter will need rewriting when the call
 *      becomes a network round-trip; one written against a Promise will not.
 *
 *   2. GO THROUGH `latency()`. Real endpoints are not instant. Artificial
 *      delay is what surfaces the missing loading states now, while they are
 *      cheap to add, rather than at integration time.
 *
 *   3. READ FROM /fixtures. Never inline a literal in this file, and never
 *      inline one in a component. fixtures/firm.ts is the canonical example:
 *      the demo firm's name is defined once and imported everywhere.
 *
 *   4. CARRY A `// MOCK:` COMMENT saying what the real version must do. The
 *      handoff checklist (BUILD_PLAN.md §7) is literally "a project-wide
 *      search for MOCK: should surface the complete list of what the dev team
 *      needs to build for real" — so the comment is the deliverable, not
 *      decoration.
 *
 * A worked example of all four is `getFirm()` at the bottom of this file. It is
 * the only implemented endpoint in Batch 0, and it exists to demonstrate the
 * pattern rather than because a screen needs it yet.
 */

import {
  demoClientAccount,
  demoClientTeam,
  demoStaffAccount,
  type ClientAccessStatus,
  type ClientRole,
  type ClientTeamMember,
  type PortalAccount,
} from '@/fixtures/accounts';
import {
  demoNotificationPreferences,
  type NotificationPreference,
} from '@/fixtures/settings';
import {
  DOCUMENT_TYPES,
  demoFirmDocuments,
  demoSharedDocuments,
  type DocumentKind,
  type DocumentStatus,
  type DocumentType,
  type FirmDocument,
  type SharedDocument,
} from '@/fixtures/documents';
import {
  demoLegalDatabase,
  type LegalDatabaseEntry,
  type LegalSourceKind,
} from '@/fixtures/legal-database';
import {
  demoIntegrations,
  INTEGRATION_CATEGORIES,
  type IntegrationCategory,
  type IntegrationRecord,
} from '@/fixtures/integrations';
import {
  demoDeclinedEngagements,
  demoRelatedParties,
  type RelatedPartyKind,
} from '@/fixtures/conflicts';
import type {
  EngagementStatusTone,
  TimelineEventKind,
  TimelineEventSeed,
} from '@/fixtures/engagements';
import {
  PORTAL_CLIENT_ID,
  CLIENT_STANDINGS,
  demoClients,
  NEW_CLIENT_SUMMARY,
  type ClientStanding,
  type FirmClient,
} from '@/fixtures/clients';
import { backendBridge } from '@/lib/backend-bridge';
import { demoFirm, type FirmIdentity } from '@/fixtures/firm';
import { demoClientInvite, type Invite } from '@/fixtures/invites';
import {
  SIGNATURE_FIELDS,
  type SignatureField,
  type SignatureRequest,
} from '@/fixtures/signatures';
import {
  demoInvoices,
  type Invoice,
  type InvoiceDraft,
  type InvoiceDraftLine,
  type InvoiceStatus,
} from '@/fixtures/invoices';
import {
  demoMatters,
  MATTER_WORK_TYPES,
  NEW_MATTER_PHASE,
  NEW_MATTER_SCOPE,
  NEW_MATTER_STATUS,
  type Matter,
  type MatterWorkType,
} from '@/fixtures/matters';
import { demoMessageThreads, type Message, type MessageThread } from '@/fixtures/messages';
import { transcriptFor } from '@/fixtures/transcripts';
import { demoProjects, type Project } from '@/fixtures/projects';
import {
  SIGNED_IN_STAFF_ID,
  WEEKLY_HOURS_TARGET,
  demoApprovals,
  demoFirmEvents,
  demoInbox,
  demoSecretaryAssignments,
  demoStaff,
  demoSupportAssignments,
  demoTasks,
  demoWeeklyHours,
  type TimeEntry,
  type ApprovalKind,
  type StaffAccountStatus,
  type ApprovalState,
  type FirmEventKind,
  type InboxSource,
  type StaffMember,
  type SupportRole,
  type TaskState,
} from '@/fixtures/practice';
import { LEAD_ELIGIBLE_RANKS, RANKS, recordsTime, seesBilling, type Rank } from '@/lib/ranks';
import {
  COMMITTED_SLOTS,
  CONSULTATION_HOURS,
  CONSULTATION_MINUTES,
  WEEKEND_DAYS,
} from '@/fixtures/availability';
import {
  addDays,
  daysBetween,
  formatElapsed,
  tenantNow,
  tenantToday,
  nextWorkingDay,
  previousWorkingDay,
  weekdayOf,
  yearOf,
  type CalendarDate,
  type ClockTime,
} from '@/lib/format';
import type { Locale } from '@/lib/i18n/routing';
import { MIN_QUERY_LENGTH, matchesQuery, normaliseForSearch } from '@/lib/search';
import { DOCUMENT_STATUS_TONE, INVOICE_STATUS_TONE } from '@/lib/status-tones';
import type { BadgeTone } from '@/components/ui/Badge';
import { passwordReset } from './password-reset';
import { latency } from './latency';
import { viewerStaffId } from './demo-viewer';

/* ===========================================================================
 * Latency
 * ======================================================================== */

/* Moved to lib/latency.ts so lib/password-reset.ts can share it without
 * importing this server-only module. */
export { MOCK_LATENCY_MS, latency } from './latency';

/* ===========================================================================
 * Result shape
 * ======================================================================== */

/**
 * Paged list envelope. Real endpoints will page; screens built against a bare
 * array would have to be rewritten when they do, so list endpoints return this
 * from day one even though fixtures fit in memory.
 */
export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export function paged<T>(items: T[], page = 1, pageSize = 25): Paged<T> {
  const start = (page - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    total: items.length,
    page,
    pageSize,
  };
}

/**
 * Deliberate failure, for building and demoing error states.
 *
 * design.md §2 and brand-guidelines.md §3.4 both require that an error is
 * shown as icon + text label and never by the `error` red alone — this class
 * carries a message precisely so no call site is tempted to render a bare red
 * box with nothing in it.
 */
export class MockApiError extends Error {
  constructor(
    message: string,
    readonly code: 'not_found' | 'forbidden' | 'conflict' | 'server_error' = 'server_error'
  ) {
    super(message);
    this.name = 'MockApiError';
  }
}

/* ===========================================================================
 * Endpoints
 *
 * Add one namespace per entity as its batch lands, e.g.
 *
 *   export const clients = {
 *     // MOCK: replace with GET /api/clients — server-side pagination,
 *     // tenant-scoped, sorted by last activity.
 *     async list(page = 1): Promise<Paged<Client>> {
 *       await latency();
 *       return paged(clientFixtures, page);
 *     },
 *   };
 *
 * Per BUILD_PLAN.md §3, the entities to come are: clients, matters, projects,
 * invoices, messages, users/ranks.
 * ======================================================================== */

export const firm = {
  /**
   * The current tenant's identity and white-label configuration.
   *
   * MOCK: replace with the real tenant-configuration lookup — resolve the
   * tenant from the request subdomain or the authenticated session's tenant
   * claim, then fetch {{CLIENT_NAME}}, {{CLIENT_LOGO_LIGHT}},
   * {{CLIENT_LOGO_DARK}}, {{CLIENT_ACCENT}} and {{CLIENT_DOMAIN}} from the
   * tenants table. Track A.5.
   *
   * Must be tenant-isolated server-side: a client-side-only check is not
   * access control. Getting that isolation right is Track A.5's job; Track B
   * reviews it in the hardening pass (BUILD_PLAN.md §6) — the review does not
   * substitute for building it correctly the first time.
   */
  async get(): Promise<FirmIdentity> {
    await latency();
    return demoFirm;
  },
};

/**
 * Client portal invitations.
 *
 * CLIENT-SIDE ONLY — there is no staff equivalent. BUILD_PLAN.md §3.1
 * provisions staff by temporary password instead, so there is no staff
 * invitation to look up and no `audience` to branch on.
 */
export const invites = {
  /**
   * Resolve a pending invitation.
   *
   * MOCK: replace with GET /api/invites/:token. The real implementation must
   * verify the token's signature, check it has not expired and has not already
   * been redeemed, and scope the response to the invited tenant — BEFORE any
   * invitee name or email reaches the browser. An unverified lookup lets an
   * attacker enumerate who a firm is onboarding. Track A performs none of
   * these checks and returns a fixture regardless of the token passed.
   */
  async getByToken(_token: string): Promise<Invite> {
    await latency();
    return demoClientInvite;
  },

  /**
   * Redeem an invitation by setting the account's first password.
   *
   * MOCK: replace with POST /api/invites/:token/accept — server-side password
   * policy enforcement (the client-side strength meter is guidance, never the
   * control), credential hashing, single-use token burn, session issue, and
   * recording the terms acceptance with a timestamp and version. Track A.5,
   * with real authentication. Today this resolves and changes nothing.
   */
  async accept(_token: string, _password: string): Promise<{ ok: true }> {
    await latency();
    return { ok: true };
  },
};


/* ===========================================================================
 * Client portal entities — Batch 2
 *
 * RESOLUTION, AND WHY IT HAPPENS HERE
 * ---------------------------------------------------------------------------
 * The entity fixtures carry dates as offsets (`inDays`, `sharedDaysAgo`,
 * `dueInDays`) rather than as fixed calendar dates. Turning those into real
 * dates is this layer's job, not a component's: a screen must never see a
 * relative offset, because the moment one does, every screen is one careless
 * `new Date()` away from the off-by-one bug the Accept Invite expiry already
 * shipped once.
 *
 * So everything below hands screens the same shapes a real endpoint would —
 * concrete 'YYYY-MM-DD' calendar dates in the tenant's jurisdiction, references
 * already assembled, aggregates already summed. When these become real routes,
 * the resolution disappears rather than moving: the database stores the actual
 * dates.
 *
 * MOCK: a real client dashboard should be ONE endpoint — GET
 * /api/client/dashboard — not six. Six round-trips to paint one screen is a bad
 * API, and the aggregates below (balance due, unread count, date counts) must
 * be computed server-side regardless, since a client that can ask for line
 * items can ask for a total it should not see. They are split per entity here
 * because the rest of Batch 2 — Matters, Projects, Documents, Invoices,
 * Messages — each needs one of them on its own. Track A.5 collapses the
 * dashboard's six into one and keeps the per-entity routes for their own
 * screens.
 * ======================================================================== */

/**
 * An engagement date resolved onto the tenant's calendar.
 *
 * Shared by the dashboard's key-dates strip and the matter detail's timeline —
 * the same card renders both, so they are the same shape. `note`, `completed`
 * and `awaitingClient` are only populated from a matter's timeline; the
 * dashboard strip leaves them empty and renders exactly as before.
 */
export interface KeyDate {
  id: string;
  kind: 'matter' | 'project';
  /** Reference of the matter or project it belongs to. */
  sourceRef: string;
  date: CalendarDate;
  title: Record<Locale, string>;
  detail: Record<Locale, string>;
  /** Closing line — what is required, or what was confirmed. */
  note?: Record<Locale, string> | null;
  /** Already happened and acknowledged. */
  completed?: boolean;
  /** The note is something the client must act on, not a firm status. */
  awaitingClient?: boolean;
  /** What kind of event: a hearing, a conference (a meeting), a filing… */
  eventKind?: TimelineEventKind;
}

/**
 * The next thing due on an engagement: the earliest timeline event still ahead.
 *
 * This is the single place the dashboard's key date comes from, for matters and
 * projects alike, now that both keep their dates on a timeline rather than in a
 * separate `keyDate` field. One date, written down once. See
 * fixtures/engagements.ts.
 */
function nextTimelineEvent(engagement: { timeline: TimelineEventSeed[] }) {
  return (
    engagement.timeline
      .filter((event) => !event.completed && event.inDays >= 0)
      .sort((a, b) => a.inDays - b.inDays)[0] ?? null
  );
}

/**
 * Resolve an engagement's timeline onto the tenant's calendar, earliest first.
 * A procedural record reads forwards.
 */
function resolveTimeline(
  timeline: TimelineEventSeed[],
  reference: string,
  kind: KeyDate['kind'],
  today: CalendarDate
): KeyDate[] {
  return [...timeline]
    .sort((a, b) => a.inDays - b.inDays)
    .map((event) => ({
      id: event.id,
      kind,
      sourceRef: reference,
      date: addDays(today, event.inDays),
      title: event.title,
      detail: event.detail,
      note: event.note,
      completed: event.completed,
      awaitingClient: event.awaitingClient ?? false,
      eventKind: event.kind,
    }));
}

/**
 * The next uncompleted event across a set of engagements, as key dates.
 *
 * Shared by matters and projects so the dashboard strip cannot treat one kind
 * differently from the other.
 */
function upcomingKeyDates(
  engagements: { active: boolean; reference: string; timeline: TimelineEventSeed[] }[],
  kind: KeyDate['kind'],
  today: CalendarDate,
  withinDays: number
): KeyDate[] {
  return engagements.flatMap((engagement) => {
    if (!engagement.active) return [];
    const event = nextTimelineEvent(engagement);
    // Already-passed dates are not "upcoming", and the strip is not a history.
    // A date outside the window belongs on the engagement's own screen.
    if (!event || event.inDays < 0 || event.inDays > withinDays) return [];

    return [
      {
        id: event.id,
        kind,
        sourceRef: engagement.reference,
        date: addDays(today, event.inDays),
        title: event.title,
        detail: event.detail,
      },
    ];
  });
}

/**
 * A shared document with its share date resolved and its engagement joined on.
 *
 * `needsSignature` is DERIVED from `status`, not stored beside it. It used to be
 * its own field on the fixture, and keeping both would be the duplicate-key-date
 * mistake again in a different place: two ways of saying the same thing, free to
 * drift the moment one of them is edited alone. The dashboard card and the
 * engagement detail's Documents tab still read `needsSignature` and neither
 * needed changing.
 */
export interface SharedDocumentRecord extends SharedDocument {
  sharedOn: CalendarDate;
  /** `status === 'awaitingSignature'`. Derived — see above. */
  needsSignature: boolean;
  /** Whether `engagementRef` names a matter or a project. */
  engagementKind: 'matter' | 'project';
  /** Title of that matter or project, so a row can name what it belongs to. */
  engagementTitle: Record<Locale, string>;
}

/**
 * The documents library's filter strip.
 *
 * One value per `DocumentStatus` plus `all`, so the three partition the
 * collection exactly and their counts always sum to the total — the same
 * arrangement as MatterFilter, and for the same reason.
 */
export type DocumentFilter = 'all' | DocumentStatus;

export const DOCUMENT_FILTERS: DocumentFilter[] = [
  'all',
  'awaitingSignature',
  'draft',
  'final',
];

export interface DocumentListResult extends Paged<SharedDocumentRecord> {
  /** Row count per filter, over the WHOLE collection — not just this page. */
  counts: Record<DocumentFilter, number>;
}

/** What the library's two dropdowns can offer, derived from the rows. */
export interface DocumentFacets {
  engagements: { reference: string; kind: 'matter' | 'project'; title: Record<Locale, string> }[];
  kinds: DocumentKind[];
}

/**
 * An invoice with its reference assembled, its dates resolved, its total summed
 * and its status worked out.
 *
 * `amount` and `status` are DERIVED here, not stored on the fixture — see the
 * header of fixtures/invoices.ts. A stated total that disagreed with its own
 * line items would be the worst defect available on a fee statement, and a
 * stored status could say "due" over a date that had already passed.
 */
export interface InvoiceRecord extends Invoice {
  /** "INV-2026-089" — built from the issue year. See fixtures/invoices.ts. */
  reference: string;
  /** Sum of `lineItems`. */
  amount: number;
  /** Settled / past due / not yet due, from `paidDaysAgo` and `dueInDays`. */
  status: InvoiceStatus;
  issuedOn: CalendarDate;
  dueOn: CalendarDate;
  /** When it was settled. `null` while unpaid — never the due date. */
  paidOn: CalendarDate | null;
  /** Whether `engagementRef` names a matter or a project. */
  engagementKind: 'matter' | 'project';
  /** Title of that matter or project, so a row can name what it belongs to. */
  engagementTitle: Record<Locale, string>;
}

/** What a client owes, as a whole. */
export interface InvoiceSummary {
  /** Sum of everything not yet paid. */
  balanceDue: number;
  currency: string;
  outstandingCount: number;
  /** Sum of the unpaid invoices that are ALSO past their due date. */
  overdueTotal: number;
  overdueCount: number;
  /** Sum of everything already settled. */
  paidTotal: number;
  paidCount: number;
}

/**
 * The invoices list's filter strip.
 *
 * One value per `InvoiceStatus` plus `all`. The three partition the ledger
 * exactly — an invoice is settled, or it is past due, or it is not yet due —
 * so the counts always sum to the total.
 */
export type InvoiceFilter = 'all' | InvoiceStatus;

export const INVOICE_FILTERS: InvoiceFilter[] = ['all', 'overdue', 'due', 'paid'];

export interface InvoiceListResult extends Paged<InvoiceRecord> {
  /** Row count per filter, over the WHOLE ledger — not just this page. */
  counts: Record<InvoiceFilter, number>;
}

/** One message with its date resolved onto the tenant's calendar. */
export interface MessageRecord extends Message {
  sentOn: CalendarDate;
}

/**
 * A thread with its messages resolved, its engagement joined on, and its
 * summary line derived.
 *
 * `preview`, `sentOn` and `sentAt` used to be stored on the fixture, because
 * the dashboard card only ever needed the latest line. They are the LAST
 * MESSAGE's, computed here — a summary stored beside the thing it summarises is
 * a summary free to disagree with it, which is the same call already made for an
 * engagement's key date, a document's `needsSignature`, and an invoice's total.
 */
export interface MessageThreadRecord extends MessageThread {
  messages: MessageRecord[];
  /** Body of the most recent message. */
  preview: Record<Locale, string>;
  sentOn: CalendarDate;
  sentAt: ClockTime;
  engagementKind: 'matter' | 'project';
  engagementTitle: Record<Locale, string>;
}

/* ===========================================================================
 * Client-portal scoping
 * ===========================================================================
 * EVERY CLIENT-PORTAL READ GOES THROUGH ONE OF THESE.
 *
 * Until the `clientId` split, it did not have to: every matter, project,
 * invoice, document and thread in /fixtures belonged to the single account
 * that could sign in, so returning the whole collection and returning the
 * client's own collection were the same answer. They are not any more. The
 * firm now has files for four clients who have no portal login, and a portal
 * read that forgets to scope hands one client another's litigation.
 *
 * The scope is taken from the SESSION — `PortalAccount.clientId` — never from
 * anything a caller passes in, because a scope the caller chooses is not a
 * scope. Everything else follows from the two functions below.
 *
 * MOCK: in production this is a WHERE clause on every query, enforced
 * server-side, plus the tenant predicate that already has to be there. Doing
 * it in the process, after loading the collection, is exactly the shape that
 * leaks when someone adds a new endpoint and forgets — which is why the
 * portal's three join-based resolvers (`resolveDocuments`,
 * `resolveMessageThreads`, `resolveInvoices`) are left to inherit their scope
 * from `engagementIndex()` rather than each filtering for themselves. Track
 * A.5, and the Track B hardening pass reviews that the real queries do it.
 */

/**
 * The client the signed-in portal account acts for.
 *
 * Fails CLOSED. An account with no `clientId` sees nothing rather than
 * everything — the opposite default is how a missing field becomes a
 * disclosure.
 *
 * MOCK: resolved from the authenticated session. Track A.5.
 */
function signedInClientId(): string | null {
  return demoClientAccount.clientId ?? null;
}

/** The signed-in client's matters. Not the firm's. */
function clientMatters(): Matter[] {
  const clientId = signedInClientId();
  if (!clientId) return [];
  return allMatters().filter((matter) => matter.clientId === clientId);
}

/** The signed-in client's projects. Not the firm's. */
function clientProjects(): Project[] {
  const clientId = signedInClientId();
  if (!clientId) return [];
  return allProjects().filter((project) => project.clientId === clientId);
}

/**
 * The engagement references the signed-in client may see.
 *
 * Everything in the portal that is not itself an engagement hangs off one —
 * a document, a fee statement, a conversation — so this set is the whole of
 * the client scope for those three collections.
 */
function clientEngagementRefs(): Set<string> {
  return new Set([...clientMatters(), ...clientProjects()].map((row) => row.reference));
}

/** Narrow anything that hangs off an engagement to the signed-in client's. */
function ownedByClient<T extends { engagementRef: string }>(rows: T[]): T[] {
  const refs = clientEngagementRefs();
  return rows.filter((row) => refs.has(row.engagementRef));
}

/*
 * The three portal collections, scoped.
 *
 * Named rather than defaulted. A `clientDocuments()` that quietly returned
 * one client's files would read identically at a firm-side call site and at
 * a portal one, and this file has both. Calling the scoped thing by its
 * scoped name is what makes the wrong one visible in review.
 */
function clientDocuments(): SharedDocumentRecord[] {
  return ownedByClient(resolveDocuments());
}

function clientInvoices(): InvoiceRecord[] {
  return ownedByClient(resolveInvoices());
}

function clientThreads(): MessageThreadRecord[] {
  return ownedByClient(resolveMessageThreads());
}

/**
 * FIRM-WIDE, deliberately. It was briefly scoped to the signed-in client,
 * which scoped the three resolvers built on it for free — and also scoped
 * the STAFF inbox, whose portal rows are derived through
 * `resolveMessageThreads`. A firm-side screen filtered by a client session
 * is a bug waiting for a second client to have a conversation. The client
 * scope is applied by name at each portal call site instead: see
 * `clientDocuments`, `clientInvoices` and `clientThreads`.
 *
 * Reference → the engagement it names. Matters and projects in one index,
 * because a document's `engagementRef` can be either and the row has to say
 * which.
 */
type EngagementIndexEntry = {
  kind: 'matter' | 'project';
  title: Record<Locale, string>;
  /**
   * Whose file it is.
   *
   * Added with the time ledger, which has to answer 'which client is this hour
   * chargeable to' without a second join in every caller. Both collections
   * have carried a client id since engagements stopped pointing at portal
   * accounts, so this is a widening of the index rather than new data.
   */
  clientId: string;
};

function engagementIndex(): Map<string, EngagementIndexEntry> {
  const index = new Map<string, EngagementIndexEntry>();

  for (const matter of allMatters()) {
    index.set(matter.reference, {
      kind: 'matter',
      title: matter.title,
      clientId: matter.clientId,
    });
  }
  for (const project of allProjects()) {
    index.set(project.reference, {
      kind: 'project',
      title: project.title,
      clientId: project.clientId,
    });
  }

  return index;
}

/**
 * Resolve shared documents onto the tenant's calendar, newest first.
 *
 * Used by the documents library AND by both engagement detail views, so the
 * three cannot produce three slightly different shapes of the same row. The
 * detail views pass a pre-filtered slice; the library passes the lot.
 *
 * A document whose `engagementRef` matches nothing is DROPPED rather than
 * rendered with a blank engagement. The real version of this is a join, and a
 * join drops orphans; showing a client a file that belongs to no engagement of
 * theirs is the wrong failure mode for a privileged collection.
 */
function resolveDocuments(source: SharedDocument[] = demoSharedDocuments): SharedDocumentRecord[] {
  const today = tenantToday();
  const engagements = engagementIndex();

  return source
    .flatMap((document) => {
      const engagement = engagements.get(document.engagementRef);
      if (!engagement) return [];

      return [
        {
          ...document,
          sharedOn: addDays(today, -document.sharedDaysAgo),
          needsSignature: document.status === 'awaitingSignature',
          engagementKind: engagement.kind,
          engagementTitle: engagement.title,
        },
      ];
    })
    .sort((a, b) => b.sharedOn.localeCompare(a.sharedOn));
}

/* ===========================================================================
 * The firm's own drafts
 * ===========================================================================
 * A SECOND COLLECTION, AND THE CLIENT PORTAL CANNOT REACH IT. fixtures/
 * documents.ts sets out why this is not a flag on `SharedDocument`. The
 * practical consequence is the one that matters: no endpoint under `documents`,
 * `invoices`, `matters` or `projects` — the four the portal reads — names
 * `allFirmDocuments()`. Creating a draft here puts nothing in front of anybody.
 * ======================================================================== */

/**
 * Drafts created this session, pinned to the PROCESS.
 *
 * Same reason as the roster, the matters and the clients before it: a Server
 * Action and the page that re-renders after it compile into different server
 * bundles, each of which evaluates this module separately. A plain
 * module-level array is therefore two arrays, and the write lands in the one
 * nobody reads — silently, because nothing throws.
 */
const SESSION_FIRM_DOCS_KEY = Symbol.for('synqanun.mock.sessionFirmDocuments');
const sessionFirmDocuments: FirmDocument[] = ((globalThis as Record<symbol, unknown>)[
  SESSION_FIRM_DOCS_KEY
] ??= []) as FirmDocument[];

function allFirmDocuments(): FirmDocument[] {
  return [...demoFirmDocuments, ...sessionFirmDocuments];
}

/* ===========================================================================
 * Prepared signature requests
 * ===========================================================================
 * NOTHING HERE TOUCHES `DocumentStatus`, AND THAT IS THE WHOLE DESIGN.
 * fixtures/signatures.ts sets out why: flipping a document to
 * `awaitingSignature` would put it in front of the client, in their own portal,
 * asking them to execute it — off the back of a form that sent nothing. The
 * client's signing screen reads `demoSharedDocuments` through
 * `resolveDocuments`, which does not know this collection exists.
 * ======================================================================== */

const SESSION_SIGREQ_KEY = Symbol.for('synqanun.mock.sessionSignatureRequests');
const sessionSignatureRequests: SignatureRequest[] = ((globalThis as Record<symbol, unknown>)[
  SESSION_SIGREQ_KEY
] ??= []) as SignatureRequest[];

/** One prepared request, with its document and signers resolved. */
export interface SignatureRequestRecord {
  id: string;
  documentId: string;
  documentName: string;
  engagementRef: string;
  signers: { contactId: string; name: Record<Locale, string>; fields: SignatureField[] }[];
  note: string;
  preparedBy: Record<Locale, string>;
  preparedOn: CalendarDate;
}

function resolveSignatureRequests(source: SignatureRequest[]): SignatureRequestRecord[] {
  const documents = new Map(demoSharedDocuments.map((row) => [row.id, row]));
  const contacts = new Map(demoClientTeam.map((row) => [row.id, row]));
  const people = staffIndex();

  return source
    .flatMap((request) => {
      const document = documents.get(request.documentId);
      if (!document) return [];

      return [
        {
          id: request.id,
          documentId: request.documentId,
          documentName: document.name,
          engagementRef: document.engagementRef,
          signers: request.signers.map((signer) => ({
            contactId: signer.contactId,
            name: contacts.get(signer.contactId)?.name ?? UNKNOWN_NAME,
            fields: signer.fields,
          })),
          note: request.note,
          preparedBy: people.get(request.preparedById)?.name ?? UNKNOWN_NAME,
          preparedOn: request.preparedOn,
        },
      ];
    })
    .sort((a, b) => b.preparedOn.localeCompare(a.preparedOn) || a.id.localeCompare(b.id));
}

/* ===========================================================================
 * Who leads an engagement
 * ===========================================================================
 * ONE FUNCTION, FOUR CALLERS, AND THAT IS THE WHOLE POINT. The lead is read in
 * four places — the register rows, a person's own "files you lead", the client
 * record, and the search index — and before this existed each of them reached
 * into the fixture separately. Any write that changed one would have left the
 * other three saying something else, and the disagreement would show up as a
 * dashboard that lists a matter the register says belongs to somebody else.
 *
 * So reassignment writes HERE, and the four callers read through `leadNameOf`.
 * ======================================================================== */

const SESSION_LEADS_KEY = Symbol.for('synqanun.mock.sessionEngagementLeads');
const sessionEngagementLeads: Map<string, string> = ((
  globalThis as Record<symbol, unknown>
)[SESSION_LEADS_KEY] ??= new Map<string, string>()) as Map<string, string>;

/**
 * The lead's name for an engagement, honouring a reassignment made this
 * session.
 *
 * MOCK: the fixtures join on a display NAME — fixtures/matters.ts says
 * production stores a `leadCounselId` — so this resolves an override to a name
 * rather than the other way round. At Track A.5 the id is the stored value and
 * this function collapses to a lookup.
 */
function leadNameOf(source: Matter | Project): Record<Locale, string> {
  const reassigned = sessionEngagementLeads.get(source.reference);
  if (reassigned) {
    const person = staffIndex().get(reassigned);
    if (person) return person.name;
  }
  return 'opposingParty' in source ? source.leadCounsel : source.lead.name;
}

/** Reassigned this session, so a screen can say so. */
function leadWasReassigned(reference: string): boolean {
  return sessionEngagementLeads.has(reference);
}

/* ===========================================================================
 * The time ledger
 * ===========================================================================
 * SESSION ONLY, AND EMPTY UNTIL SOMEBODY LOGS SOMETHING. fixtures/practice.ts
 * argues over `TimeEntry` why there is no seeded array: the weekly figures
 * above are stated totals, and itemising the same hours underneath them would
 * put every one of them in the product twice.
 * ======================================================================== */

/** How many weeks the dashboard's hours chart covers. Stated, never implied. */
const HOURS_CHART_WEEKS = 4;

const SESSION_TIME_KEY = Symbol.for('synqanun.mock.sessionTimeEntries');
const sessionTimeEntries: TimeEntry[] = ((globalThis as Record<symbol, unknown>)[
  SESSION_TIME_KEY
] ??= []) as TimeEntry[];

function allTimeEntries(): TimeEntry[] {
  return sessionTimeEntries;
}

/**
 * Every engagement as a pickable option.
 *
 * Shared by the time modal and the invoice builder rather than written out
 * twice, so neither can offer a file the other does not.
 */
function engagementRefsAndTitles(): { value: string; label: Record<Locale, string> }[] {
  return [...engagementIndex().entries()]
    .map(([reference, engagement]) => ({ value: reference, label: engagement.title }))
    .sort((a, b) => a.value.localeCompare(b.value));
}

/**
 * Join each entry to its engagement, its client and the person who did it.
 *
 * Orphans are dropped, the same rule the two document resolvers follow: an
 * entry on an engagement that does not exist is a defect, and rendering it
 * against a blank file would hide it.
 */
function resolveTimeEntries(source: TimeEntry[]): TimeEntryRecord[] {
  const engagements = engagementIndex();
  const people = staffIndex();

  return source
    .flatMap((entry) => {
      const engagement = engagements.get(entry.engagementRef);
      if (!engagement) return [];

      return [
        {
          id: entry.id,
          staffId: entry.staffId,
          staffName: people.get(entry.staffId)?.name ?? UNKNOWN_NAME,
          engagementRef: entry.engagementRef,
          engagementKind: engagement.kind,
          engagementTitle: engagement.title,
          clientId: engagement.clientId,
          on: entry.on,
          minutes: entry.minutes,
          description: entry.description,
          billable: entry.billable,
          billed: entry.billed,
        },
      ];
    })
    .sort((a, b) => b.on.localeCompare(a.on) || a.id.localeCompare(b.id));
}

/** A firm draft with its date resolved and its engagement joined. */
export interface FirmDocumentRecord {
  id: string;
  title: string;
  type: DocumentType;
  engagementRef: string;
  engagementKind: 'matter' | 'project';
  engagementTitle: Record<Locale, string>;
  createdOn: CalendarDate;
  /** True for a draft created in this session. The card labels it. */
  addedThisSession: boolean;
}

/**
 * The same join `resolveDocuments` performs, over the firm's own drafts.
 *
 * Orphans are dropped for the same reason: a draft pointing at an engagement
 * that does not exist is a fixture defect, and rendering it with a blank file
 * reference would hide that.
 */
function resolveFirmDocuments(source: FirmDocument[]): FirmDocumentRecord[] {
  const today = tenantToday();
  const engagements = engagementIndex();
  const sessionIds = new Set(sessionFirmDocuments.map((row) => row.id));

  return source
    .flatMap((document) => {
      const engagement = engagements.get(document.engagementRef);
      if (!engagement) return [];

      return [
        {
          id: document.id,
          title: document.title,
          type: document.type,
          engagementRef: document.engagementRef,
          engagementKind: engagement.kind,
          engagementTitle: engagement.title,
          createdOn: addDays(today, -document.createdDaysAgo),
          addedThisSession: sessionIds.has(document.id),
        },
      ];
    })
    .sort((a, b) => b.createdOn.localeCompare(a.createdOn) || a.id.localeCompare(b.id));
}

export const session = {
  /**
   * Who is signed in to the client portal.
   *
   * MOCK: replace with the authenticated session — the account resolved from a
   * verified session cookie, server-side, on every request. Track A has no
   * authentication at all and returns the demo account to anyone who loads the
   * page; Track A.5 introduces real sessions (BUILD_PLAN.md §6).
   *
   * This exists as an endpoint rather than as a fixture import in the page so
   * that the screens never reach for `demoClientAccount` directly. A component
   * that imports the signed-in user from a file is a component that will still
   * compile after real auth lands, and quietly show the wrong person.
   */
  async currentClient(): Promise<PortalAccount> {
    await latency();
    return demoClientAccount;
  },
};

/**
 * The matters list's filter strip.
 *
 * Derived from `active` and `needsAttention` rather than stored — see the note
 * on `Matter.active` in fixtures/matters.ts. The three non-`all` values
 * partition the list exactly, so their counts always sum to the total.
 */
export type MatterFilter = 'all' | 'needsAttention' | 'inProgress' | 'closed';

export const MATTER_FILTERS: MatterFilter[] = ['all', 'needsAttention', 'inProgress', 'closed'];

/** A matter with its last-updated date resolved onto the tenant's calendar. */
export interface MatterRecord extends Matter {
  lastUpdatedOn: CalendarDate;
}

export interface MatterListResult extends Paged<MatterRecord> {
  /** Row count per filter, over the WHOLE list — not just this page. */
  counts: Record<MatterFilter, number>;
}

/** Everything the matter detail view renders, in one payload. */
export interface MatterDetail {
  matter: MatterRecord;
  /** When the firm was instructed, on the tenant's calendar. */
  openedOn: CalendarDate;
  /** The procedural record, earliest first. */
  timeline: KeyDate[];
  /** Shared documents on this matter, newest first. */
  documents: SharedDocumentRecord[];
  /** Fee statements on this matter, newest first. */
  invoices: InvoiceRecord[];
}

function matchesFilter(matter: Matter, filter: MatterFilter): boolean {
  switch (filter) {
    case 'needsAttention':
      return matter.active && matter.needsAttention;
    case 'inProgress':
      return matter.active && !matter.needsAttention;
    case 'closed':
      return !matter.active;
    case 'all':
      return true;
  }
}

function resolveMatters(source: Matter[]): MatterRecord[] {
  const today = tenantToday();

  return source
    .map((matter) => ({
      ...matter,
      lastUpdatedOn: addDays(today, -matter.lastUpdatedDaysAgo),
    }))
    .sort((a, b) => b.lastUpdatedOn.localeCompare(a.lastUpdatedOn));
}

export const matters = {
  /**
   * The client's open legal files. Used by the dashboard card.
   *
   * MOCK: replace with GET /api/matters?status=active. Must be scoped to the
   * tenant AND to the authenticated client account server-side — design.md §11
   * item 6 limits the portal to matter status and excludes internal firm data,
   * and that limit is only real if the query enforces it. Track A.5.
   */
  async listActive(page = 1): Promise<Paged<MatterRecord>> {
    await latency();
    return paged(resolveMatters(clientMatters().filter((matter) => matter.active)), page);
  },

  /**
   * The full matters list, filtered, with the counts behind every filter.
   *
   * The counts come back with the rows on purpose. Fetching them separately is
   * how a filter strip ends up reading "Closed (1)" above an empty table, and
   * the Stitch export shows the failure mode already: its count chip claimed
   * "6 active legal matters" directly beside tabs reading "All (6) … Closed
   * (1)", which cannot both be true. Counting once, here, makes the
   * contradiction unrepresentable.
   *
   * MOCK: replace with GET /api/matters?status=&page=. The real endpoint takes
   * the free-text query and the forum filter too — both are applied in the
   * browser today, which is fine over six rows and wrong over six hundred, since
   * a client-side filter can only ever search the page it was given. It must
   * also compute the counts in the database rather than loading every matter to
   * count them. Track A.5.
   */
  async list(
    { filter = 'all', page = 1, pageSize = 25 }: { filter?: MatterFilter; page?: number; pageSize?: number } = {}
  ): Promise<MatterListResult> {
    const backendData = await backendBridge.clientMatters.list({ filter, page, pageSize });
    if (backendData && Array.isArray(backendData.items) && backendData.counts) {
      return backendData as MatterListResult;
    }

    await latency();

    const rows = resolveMatters(clientMatters().filter((matter) => matchesFilter(matter, filter)));

    return {
      ...paged(rows, page, pageSize),
      counts: {
        all: clientMatters().length,
        needsAttention: clientMatters().filter((m) => matchesFilter(m, 'needsAttention')).length,
        inProgress: clientMatters().filter((m) => matchesFilter(m, 'inProgress')).length,
        closed: clientMatters().filter((m) => matchesFilter(m, 'closed')).length,
      },
    };
  },

  /**
   * One matter, with everything its detail view shows.
   *
   * Deliberately ONE call rather than four. The detail view's tabs are four
   * views of the same file, and its header states counts for all of them at
   * once — "Documents 3", "Invoices 1 overdue" — so the header would be
   * describing a different fetch from the panel underneath it if they arrived
   * separately. The documents and invoices here are the SAME shared fixtures
   * the dashboard reads, filtered by `engagementRef`; there is no per-matter
   * copy of either.
   *
   * MOCK: replace with GET /api/matters/:reference. The reference must be
   * resolved server-side against the authenticated client's own matters — a
   * lookup that trusts the URL is how one client reads another's file. Track A
   * performs no such check and will return the fixture to anyone. Track A.5.
   */
  async getByReference(reference: string): Promise<MatterDetail | null> {
    const backendData = await backendBridge.clientMatters.get(reference);
    if (backendData && backendData.matter) {
      return backendData as MatterDetail;
    }

    await latency();

    const matter = clientMatters().find(
      (candidate) => candidate.reference.toLowerCase() === reference.toLowerCase()
    );
    if (!matter) return null;

    const today = tenantToday();

    return {
      matter: { ...matter, lastUpdatedOn: addDays(today, -matter.lastUpdatedDaysAgo) },
      openedOn: addDays(today, -matter.openedDaysAgo),
      timeline: resolveTimeline(matter.timeline, matter.reference, 'matter', today),
      documents: resolveDocuments(
        demoSharedDocuments.filter((document) => document.engagementRef === matter.reference)
      ),
      invoices: clientInvoices().filter(
        (invoice) => invoice.engagementRef === matter.reference
      ),
    };
  },

  /**
   * The distinct forums across the client's matters, for the filter dropdown.
   *
   * Derived from the data rather than written out as a list of options. The
   * export hardcoded "All jurisdictions (DIFC, DIAC, ADGM, KSA Commercial)"
   * into the label and then listed seven forums beneath it, two of which no
   * matter in the list actually sits in — a dropdown offering filters that can
   * only ever return nothing.
   *
   * MOCK: replace with a facet query, or with the firm's forum vocabulary once
   * `matterType`/`forum` become controlled lists. Track A.5.
   */
  async forums(): Promise<Record<Locale, string>[]> {
    const backendData = await backendBridge.clientMatters.forums();
    if (backendData && Array.isArray(backendData) && backendData.length > 0) {
      return backendData;
    }

    await latency();

    const seen = new Set<string>();
    return clientMatters().filter((matter) => {
      if (seen.has(matter.forum.en)) return false;
      seen.add(matter.forum.en);
      return true;
    }).map((matter) => matter.forum);
  },
};

/**
 * The projects list's filter strip.
 *
 * Deliberately the same three predicates as `MatterFilter`, with one label
 * changed downstream: a project COMPLETES where a matter closes. Same data,
 * different word for it, so the value stays `completed` here and the
 * translation does the rest.
 */
export type ProjectFilter = 'all' | 'needsAttention' | 'inProgress' | 'completed';

export const PROJECT_FILTERS: ProjectFilter[] = ['all', 'needsAttention', 'inProgress', 'completed'];

/** A project with its last-updated date resolved onto the tenant's calendar. */
export interface ProjectRecord extends Project {
  lastUpdatedOn: CalendarDate;
}

export interface ProjectListResult extends Paged<ProjectRecord> {
  /** Row count per filter, over the WHOLE list — not just this page. */
  counts: Record<ProjectFilter, number>;
}

/** Everything the project detail view renders, in one payload. */
export interface ProjectDetail {
  project: ProjectRecord;
  /** When the firm was instructed, on the tenant's calendar. */
  openedOn: CalendarDate;
  timeline: KeyDate[];
  documents: SharedDocumentRecord[];
  invoices: InvoiceRecord[];
}

function matchesProjectFilter(project: Project, filter: ProjectFilter): boolean {
  switch (filter) {
    case 'needsAttention':
      return project.active && project.needsAttention;
    case 'inProgress':
      return project.active && !project.needsAttention;
    case 'completed':
      return !project.active;
    case 'all':
      return true;
  }
}

function resolveProjects(source: Project[]): ProjectRecord[] {
  const today = tenantToday();

  return source
    .map((project) => ({
      ...project,
      lastUpdatedOn: addDays(today, -project.lastUpdatedDaysAgo),
    }))
    .sort((a, b) => b.lastUpdatedOn.localeCompare(a.lastUpdatedOn));
}

export const projects = {
  /**
   * The client's live transactional engagements. Used by the dashboard card.
   *
   * MOCK: replace with GET /api/projects?status=active — same tenant and
   * client scoping as matters. Track A.5.
   */
  async listActive(page = 1): Promise<Paged<ProjectRecord>> {
    await latency();
    return paged(resolveProjects(clientProjects().filter((project) => project.active)), page);
  },

  /**
   * The full projects list, filtered, with the counts behind every filter.
   *
   * Counts come back with the rows for the same reason they do on matters: a
   * filter strip whose numbers are fetched separately is how you end up with
   * "Completed (1)" above an empty table.
   *
   * MOCK: replace with GET /api/projects?status=&page=. The real endpoint takes
   * the free-text query and the category filter too — both are applied in the
   * browser today, which is fine over five rows and wrong over five hundred.
   * Track A.5.
   */
  async list(
    { filter = 'all', page = 1, pageSize = 25 }: { filter?: ProjectFilter; page?: number; pageSize?: number } = {}
  ): Promise<ProjectListResult> {
    await latency();

    const rows = resolveProjects(clientProjects().filter((project) => matchesProjectFilter(project, filter)));

    return {
      ...paged(rows, page, pageSize),
      counts: {
        all: clientProjects().length,
        needsAttention: clientProjects().filter((p) => matchesProjectFilter(p, 'needsAttention')).length,
        inProgress: clientProjects().filter((p) => matchesProjectFilter(p, 'inProgress')).length,
        completed: clientProjects().filter((p) => matchesProjectFilter(p, 'completed')).length,
      },
    };
  },

  /**
   * One project, with everything its detail view shows.
   *
   * MOCK: replace with GET /api/projects/:reference. The reference must be
   * resolved server-side against the authenticated client's own engagements —
   * a lookup that trusts the URL is how one client reads another's file. Track
   * A performs no such check. Track A.5.
   */
  async getByReference(reference: string): Promise<ProjectDetail | null> {
    await latency();

    const project = clientProjects().find(
      (candidate) => candidate.reference.toLowerCase() === reference.toLowerCase()
    );
    if (!project) return null;

    const today = tenantToday();

    return {
      project: { ...project, lastUpdatedOn: addDays(today, -project.lastUpdatedDaysAgo) },
      openedOn: addDays(today, -project.openedDaysAgo),
      timeline: resolveTimeline(project.timeline, project.reference, 'project', today),
      // The SAME shared collections the dashboard and the matter detail read,
      // filtered by reference. No per-project copy of either.
      documents: resolveDocuments(
        demoSharedDocuments.filter((document) => document.engagementRef === project.reference)
      ),
      invoices: clientInvoices().filter((invoice) => invoice.engagementRef === project.reference),
    };
  },

  /**
   * The distinct categories across the client's projects, for the filter
   * dropdown. Derived from the data, so the dropdown cannot offer a category no
   * project sits in — the export listed five and only four were reachable.
   *
   * MOCK: replace with a facet query once `category` is a controlled list.
   * Track A.5.
   */
  async categories(): Promise<Record<Locale, string>[]> {
    await latency();

    const seen = new Set<string>();
    return clientProjects()
      .filter((project) => {
        if (seen.has(project.category.en)) return false;
        seen.add(project.category.en);
        return true;
      })
      .map((project) => project.category);
  },
};

/** A matter or project a client can file something against. */
export interface SelectableEngagement {
  reference: string;
  kind: 'matter' | 'project';
  title: Record<Locale, string>;
  /**
   * The fee earner who leads it — lead counsel on a matter, project lead on a
   * project.
   *
   * Here so the booking modal can say WHO a client would be meeting without
   * inventing anyone. The Stitch export hardcoded one name ("Adv. R. Al-Khatib,
   * Senior Partner") across every engagement in the dropdown, so choosing a
   * different matter changed the file and not the lawyer. This is the same
   * derive-rather-than-restate rule the key dates, the invoice totals and the
   * thread previews already follow: the lead is a property OF the engagement, so
   * it travels with it.
   *
   * No honorific — see the note on `EngagementContact.name`.
   */
  lead: { name: Record<Locale, string>; role: Record<Locale, string> };
}

export const engagements = {
  /**
   * Every engagement a client can attach something to — used by the upload
   * modal, which can be opened from anywhere in the portal.
   *
   * Distinct from `documents.facets()` and `invoices.engagements()`, and the
   * difference matters: those answer "which engagements HAVE documents /
   * invoices", so their options can only ever return rows. This one answers
   * "which engagements can RECEIVE one", which necessarily includes engagements
   * with nothing on them yet.
   *
   * ACTIVE ONLY. Uploading to a matter the firm has closed is not a thing a
   * client portal should quietly allow — the file would land somewhere nobody
   * is watching. If a closed engagement genuinely needs a late filing, that is a
   * conversation with the firm, not a dropdown.
   *
   * MOCK: replace with GET /api/engagements?status=active, scoped server-side to
   * the authenticated client. Track A.5.
   */
  async selectable(): Promise<SelectableEngagement[]> {
    await latency();

    return [
      ...clientMatters()
        .filter((matter) => matter.active)
        .map((matter) => ({
          reference: matter.reference,
          kind: 'matter' as const,
          title: matter.title,
          lead: { name: matter.counsel.name, role: matter.counsel.role },
        })),
      ...clientProjects()
        .filter((project) => project.active)
        .map((project) => ({
          reference: project.reference,
          kind: 'project' as const,
          title: project.title,
          lead: { name: project.lead.name, role: project.lead.role },
        })),
    ].sort((a, b) => a.reference.localeCompare(b.reference));
  },
};

/* ===========================================================================
 * Consultations
 * ======================================================================== */

/** One bookable day, with whatever the firm has left on it. */
export interface ConsultationDay {
  date: CalendarDate;
  /** Wall-clock times in the TENANT's zone. May be empty — see below. */
  slots: ClockTime[];
}

export interface ConsultationAvailability {
  days: ConsultationDay[];
  /** How long one consultation runs. */
  durationMinutes: number;
}

export const consultations = {
  /**
   * The next `days` working days, with the firm's remaining consultation hours
   * on each.
   *
   * A DAY WITH NO SLOTS IS STILL RETURNED. It would be easy to filter empty days
   * out and hand the picker a tidy list, and it would be wrong: "Wednesday is
   * full" and "Wednesday does not exist" are different facts, and a client who
   * sees Tuesday followed by Thursday has no way to tell which one they are
   * looking at. The picker renders the day disabled and says why.
   *
   * Closed days are a different case and ARE skipped — the office being shut on
   * a Friday is not information a client needs in a list of appointment times,
   * and fixtures/availability.ts explains why that list is data rather than a
   * Mon–Fri assumption.
   *
   * MOCK: replace with GET /api/consultations/availability?engagement=…, which
   * must read the assigned fee earner's real calendar rather than a firm-wide
   * pattern, exclude public holidays for the tenant's jurisdiction, and hold a
   * slot briefly while the client confirms so two clients cannot take the same
   * one. The calendar itself is a Track B integration (BUILD_PLAN.md §6); the
   * route and the holding logic are Track A.5.
   */
  async availability(days = 5): Promise<ConsultationAvailability> {
    await latency();

    const today = tenantToday();

    const open: ConsultationDay[] = [];
    // Tomorrow onwards. Same-day booking is not offered: a consultation the
    // firm has not seen yet is not a consultation it can commit to, and the
    // export's grid started on a day that was already half over.
    for (let offset = 1; open.length < days; offset += 1) {
      const date = addDays(today, offset);
      if (WEEKEND_DAYS.includes(weekdayOf(date))) continue;

      // Committed slots are positioned by working day, not calendar day — see
      // fixtures/availability.ts for why that indirection is there.
      const workingDay = open.length;
      const committed = new Set(
        COMMITTED_SLOTS.filter((slot) => slot.workingDay === workingDay).map((slot) => slot.time)
      );

      open.push({
        date,
        slots: CONSULTATION_HOURS.filter((time) => !committed.has(time)),
      });
    }

    return { days: open, durationMinutes: CONSULTATION_MINUTES };
  },
};

/* ===========================================================================
 * Global search
 * ======================================================================== */

/** Which collection a hit came from. Drives its icon, its group and its route. */
export type SearchKind = 'matter' | 'project' | 'document' | 'invoice' | 'message';

/** The order groups appear in. Matters first: it is what a client comes for. */
export const SEARCH_KINDS: SearchKind[] = [
  'matter',
  'project',
  'document',
  'invoice',
  'message',
];

export interface SearchHit {
  id: string;
  kind: SearchKind;
  /**
   * The client-facing identifier — "MAT-2201", "INV-2026-089". Latin in both
   * locales, so a row renders it under `dir="ltr"`.
   *
   * `null` for the two collections that have no such thing: a document is known
   * by its filename and a message thread by who sent it.
   */
  reference: string | null;
  title: Record<Locale, string>;
  /** One supporting line — forum, engagement, amount, sender. */
  meta: Record<Locale, string>;
  /** Locale-agnostic path. See the note on `documents` below. */
  href: string;
  /**
   * The status pill, in one of two forms — and the split is not incidental.
   *
   * A matter's or project's status is per-locale DATA written by the firm about
   * that specific file ("Draft disclosure pending your approval"), so it travels
   * with the record. A document's, invoice's or thread's is one of a fixed set,
   * so it travels as a key and the component translates it. Flattening both into
   * strings here would mean this file inventing product copy, which it must not
   * do; flattening both into keys would mean losing the firm's own wording.
   */
  status: SearchHitStatus | null;
}

export type SearchHitStatus =
  | { form: 'text'; label: Record<Locale, string>; tone: BadgeTone }
  | { form: 'key'; key: string; tone: BadgeTone };

export interface SearchGroup {
  kind: SearchKind;
  hits: SearchHit[];
}

export interface SearchResults {
  /** Echoed so a stale response can be discarded — see GlobalSearch.tsx. */
  query: string;
  /** Only groups with at least one hit. */
  groups: SearchGroup[];
  total: number;
}

export const search = {
  /**
   * Everything in this client's portal matching `query`.
   *
   * ==========================================================================
   * THIS RUNS ON THE SERVER, AND THAT IS THE WHOLE POINT
   * ==========================================================================
   * The obvious way to build a search overlay in a prototype is to hand the
   * fixtures to the browser and filter them in a `useMemo`. It would be less
   * code and it would be the wrong shape to leave behind.
   *
   * Filtering client-side means SHIPPING EVERY RECORD to the browser so that the
   * search box can hide most of them — every matter, every invoice, and every
   * message body, which is the most sensitive content in the product. The
   * filtering would be cosmetic; the disclosure would be real, and it would sit
   * in the bundle whether or not anyone opened the search. A legal portal cannot
   * work that way, and the shape the dev team inherits is the shape they will
   * keep.
   *
   * So the overlay calls a Server Action, which calls this. Nothing but the
   * matching rows crosses to the browser, and the query travels in a POST body
   * rather than a URL — see the header of GlobalSearch.tsx for why that second
   * part matters just as much.
   *
   * NO PER-GROUP CAP, DELIBERATELY. The export shows three matters over a "View
   * all 4 matters matching 'Restructuring' →" link, which cannot be built: the
   * destination would have to carry the query in its URL, and the query is
   * privileged. Everything that matches is listed, the group counts are the
   * number of rows under them, and there is nothing to disagree with.
   *
   * MOCK: replace with GET /api/search (or a POST, per the above) scoped
   * server-side to the authenticated client — the scoping must be in the query,
   * not in what this function happens to read. Real search also needs paging,
   * relevance ranking rather than fixture order, and the database's own text
   * search instead of lib/search.ts's folding. When it pages, the cursor goes in
   * the request body for the same reason the query does. Track A.5.
   */
  async query(term: string): Promise<SearchResults> {
    await latency();

    const query = term.trim();
    if (normaliseForSearch(query).length < MIN_QUERY_LENGTH) {
      return { query, groups: [], total: 0 };
    }

    const hit = (candidate: SearchHit, haystacks: (string | null)[]): SearchHit[] =>
      matchesQuery(haystacks, query) ? [candidate] : [];

    const matterHits = clientMatters().flatMap((matter) =>
      hit(
        {
          id: matter.id,
          kind: 'matter',
          reference: matter.reference,
          title: matter.title,
          meta: matter.forum,
          href: `/matters/${matter.reference}`,
          status: { form: 'text', label: matter.status, tone: matter.statusTone },
        },
        [
          matter.reference,
          matter.title.en,
          matter.title.ar,
          matter.matterType.en,
          matter.matterType.ar,
          matter.forum.en,
          matter.forum.ar,
          matter.status.en,
          matter.status.ar,
          leadNameOf(matter).en,
          leadNameOf(matter).ar,
          matter.courtFileNumber,
          matter.opposingParty?.en ?? null,
          matter.opposingParty?.ar ?? null,
        ]
      )
    );

    const projectHits = clientProjects().flatMap((project) =>
      hit(
        {
          id: project.id,
          kind: 'project',
          reference: project.reference,
          title: project.title,
          meta: project.jurisdiction,
          href: `/projects/${project.reference}`,
          status: { form: 'text', label: project.status, tone: project.statusTone },
        },
        [
          project.reference,
          project.title.en,
          project.title.ar,
          project.category.en,
          project.category.ar,
          project.jurisdiction.en,
          project.jurisdiction.ar,
          project.status.en,
          project.status.ar,
          project.manager.en,
          project.manager.ar,
        ]
      )
    );

    const documentHits = clientDocuments().flatMap((document) =>
      hit(
        {
          id: document.id,
          kind: 'document',
          reference: null,
          // A filename is not translated — the same string in both locales, and
          // rendered inside <bdi>. fixtures/documents.ts settled this.
          title: { en: document.name, ar: document.name },
          meta: {
            en: `${document.engagementRef} — ${document.engagementTitle.en}`,
            ar: `${document.engagementRef} — ${document.engagementTitle.ar}`,
          },
          // The library selects from ?doc=. A document has no page of its own —
          // it is a row plus a docked panel — so this opens the library with
          // that row selected rather than inventing a route.
          href: `/documents?doc=${document.id}`,
          status: { form: 'key', key: document.status, tone: DOCUMENT_STATUS_TONE[document.status] },
        },
        [
          document.name,
          document.engagementRef,
          document.engagementTitle.en,
          document.engagementTitle.ar,
        ]
      )
    );

    const invoiceHits = clientInvoices().flatMap((invoice) =>
      hit(
        {
          id: invoice.id,
          kind: 'invoice',
          reference: invoice.reference,
          title: invoice.description,
          meta: {
            en: `${invoice.engagementRef} — ${invoice.engagementTitle.en}`,
            ar: `${invoice.engagementRef} — ${invoice.engagementTitle.ar}`,
          },
          href: `/invoices/${invoice.reference}`,
          status: { form: 'key', key: invoice.status, tone: INVOICE_STATUS_TONE[invoice.status] },
        },
        [
          invoice.reference,
          invoice.description.en,
          invoice.description.ar,
          invoice.engagementRef,
          invoice.engagementTitle.en,
          invoice.engagementTitle.ar,
          // Line items are searched too: a client looking for what they were
          // charged for is looking for the narrative, not the invoice number.
          ...invoice.lineItems.flatMap((line) => [
            line.description.en,
            line.description.ar,
            line.detail.en,
            line.detail.ar,
          ]),
        ]
      )
    );

    const messageHits = clientThreads().flatMap((thread) =>
      hit(
        {
          id: thread.id,
          kind: 'message',
          reference: null,
          title: thread.subject,
          meta: {
            en: `${thread.senderName.en} — ${thread.engagementRef}`,
            ar: `${thread.senderName.ar} — ${thread.engagementRef}`,
          },
          href: `/messages?thread=${thread.id}`,
          status: thread.unread ? { form: 'key', key: 'unread', tone: 'info' } : null,
        },
        [
          thread.subject.en,
          thread.subject.ar,
          thread.senderName.en,
          thread.senderName.ar,
          thread.engagementRef,
          ...thread.messages.flatMap((message) => [message.body.en, message.body.ar]),
        ]
      )
    );

    const byKind: Record<SearchKind, SearchHit[]> = {
      matter: matterHits,
      project: projectHits,
      document: documentHits,
      invoice: invoiceHits,
      message: messageHits,
    };

    const groups = SEARCH_KINDS.filter((kind) => byKind[kind].length > 0).map((kind) => ({
      kind,
      hits: byKind[kind],
    }));

    return {
      query,
      // Counted from the rows in the same pass that produced them, never stated
      // separately. The export's own header claimed "14 total matches" over
      // sections whose chips summed to 11.
      total: groups.reduce((running, group) => running + group.hits.length, 0),
      groups,
    };
  },
};

/* ===========================================================================
 * Notifications
 * ======================================================================== */

export type NotificationKind =
  /** A file arrived and is waiting for the client to sign it. */
  | 'documentAwaitingSignature'
  /** A file arrived. */
  | 'documentShared'
  /** An invoice is past its due date. */
  | 'invoiceOverdue'
  /** A thread has a message the client has not opened. */
  | 'messageReceived';

export interface NotificationRecord {
  id: string;
  kind: NotificationKind;
  /**
   * What it is about, per locale — a filename, an invoice's description, a
   * sender's name. The sentence around it lives in the dictionaries.
   */
  subject: Record<Locale, string>;
  /** The engagement or invoice it belongs to. Latin in both locales. */
  reference: string;
  /** When it happened. A calendar date — see `formatRelativeDays`. */
  on: CalendarDate;
  /** Days past due. Only on `invoiceOverdue`. */
  daysOverdue?: number;
  href: string;
  tone: BadgeTone;
}

/** How far back the feed reaches. Stated once; the panel's caption reads it. */
export const NOTIFICATION_WINDOW_DAYS = 21;

export const notifications = {
  /**
   * Everything worth telling the client about, newest first.
   *
   * ==========================================================================
   * DERIVED FROM THE RECORDS, NOT STORED BESIDE THEM
   * ==========================================================================
   * The sixth application of the rule that has already settled the engagement
   * key date, a document's `needsSignature`, an invoice's total and status, and
   * a thread's preview — and the one where getting it wrong would be most
   * visible. A notification is a claim ABOUT a record. Written down separately,
   * it is free to drift from the thing it describes, and a feed saying "invoice
   * overdue" over a ledger saying "paid" is worse than no feed.
   *
   * The Stitch export demonstrates the failure. Its panel announces
   * "INV-2025-092 ($18,500.00) settlement is 13 days past due" — an invoice that
   * appears nowhere else in the export, at an amount that appears nowhere else,
   * in a year the ledger does not use — while the invoices card two panels below
   * lists INV-2025-089 and INV-2025-104 at different figures. It also tags five
   * of its six notifications PRJ-4410, including ones whose own text is about a
   * DIFC matter.
   *
   * Nothing below can do that: every notification is produced from the record it
   * names, in the same pass, so the feed and the screen it links to are the same
   * data twice.
   *
   * WHAT THIS MODEL CANNOT DO, AND WHY IT IS STILL RIGHT HERE
   * --------------------------------------------------------------------------
   * Derivation has a real limit: it cannot represent a notification whose
   * underlying record has since changed — "your invoice was paid" stops being
   * derivable the moment the invoice is settled, because nothing distinguishes
   * "was overdue, now paid" from "never overdue". A real feed is an append-only
   * log of events that happened, not a view over current state.
   *
   * MOCK: replace with GET /api/notifications over that log. The real record
   * carries its own id, an event type, the entity it points at, the moment it
   * fired, and — the part this prototype genuinely has nowhere to put — a
   * per-user READ STATE, which is why the panel's read state is session-only.
   * Track A.5.
   */
  async list(withinDays = NOTIFICATION_WINDOW_DAYS): Promise<NotificationRecord[]> {
    await latency();

    const today = tenantToday();
    const items: NotificationRecord[] = [];

    for (const document of clientDocuments()) {
      if (daysBetween(document.sharedOn, today) > withinDays) continue;

      items.push({
        id: `ntf-doc-${document.id}`,
        kind: document.needsSignature ? 'documentAwaitingSignature' : 'documentShared',
        // A filename is not translated — see fixtures/documents.ts.
        subject: { en: document.name, ar: document.name },
        reference: document.engagementRef,
        on: document.sharedOn,
        href: `/documents?doc=${document.id}`,
        tone: document.needsSignature ? 'warning' : 'info',
      });
    }

    for (const invoice of clientInvoices()) {
      if (invoice.status !== 'overdue') continue;

      items.push({
        id: `ntf-inv-${invoice.id}`,
        kind: 'invoiceOverdue',
        subject: invoice.description,
        reference: invoice.reference,
        on: invoice.dueOn,
        // Counted from the due date, not asserted. The export said "13 days
        // past due" beside a date that did not support it.
        daysOverdue: daysBetween(invoice.dueOn, today),
        href: `/invoices/${invoice.reference}`,
        tone: 'error',
      });
    }

    for (const thread of clientThreads()) {
      // Only threads the client has not opened. A read thread is not news.
      if (!thread.unread) continue;

      items.push({
        id: `ntf-msg-${thread.id}`,
        kind: 'messageReceived',
        subject: thread.senderName,
        reference: thread.engagementRef,
        on: thread.sentOn,
        href: `/messages?thread=${thread.id}`,
        tone: 'info',
      });
    }

    // Newest first. Ties broken by id so the order is stable across requests
    // rather than depending on how the collections happened to be walked.
    return items.sort((a, b) => (a.on === b.on ? a.id.localeCompare(b.id) : (a.on < b.on ? 1 : -1)));
  },
};

/* ===========================================================================
 * Staff — the firm's own side
 * ======================================================================== */

export interface ApprovalRecord {
  id: string;
  kind: ApprovalKind;
  title: Record<Locale, string>;
  /** Resolved from `submittedById` — one place the name is written down. */
  submittedBy: Record<Locale, string>;
  submittedByRank: Rank;
  clientName: Record<Locale, string>;
  engagementRef: string | null;
  dueOn: CalendarDate;
  /** Days past due. 0 or less means it is not overdue. Derived from `dueOn`. */
  daysOverdue: number;
  dueToday: boolean;
}

/**
 * The same approval row, seen by the person who RAISED it.
 *
 * A separate shape rather than the one above with extra fields, because the two
 * views answer different questions and share almost no useful column. A
 * reviewer needs to know who sent it and how late it is; a submitter needs to
 * know who has it and what they decided. `daysOverdue` in particular is
 * meaningless once something is approved, and shipping it anyway is how a
 * screen ends up captioning a signed-off document "2 days late".
 */
export interface SubmissionRecord {
  id: string;
  kind: ApprovalKind;
  title: Record<Locale, string>;
  /** Who is holding it now. Resolved from `assignedToId`. */
  assignedTo: Record<Locale, string>;
  assignedToRank: Rank;
  clientName: Record<Locale, string>;
  engagementRef: string | null;
  state: ApprovalState;
  /** When it was last due to move. */
  dueOn: CalendarDate;
}

export interface InboxItemRecord {
  id: string;
  source: InboxSource;
  from: Record<Locale, string>;
  subject: Record<Locale, string>;
  receivedOn: CalendarDate;
  unread: boolean;
  /**
   * Addressed to this reader by name, rather than to the practice.
   *
   * Carried through so the screen can say which it is. A unified inbox that
   * silently mixes the two teaches a reader that everything in it is theirs to
   * answer.
   */
  personal: boolean;
  /** Present on a secretary's view: whose correspondence this is. */
  forStaff: Record<Locale, string> | null;
  /**
   * The portal thread behind this row, when there is one.
   *
   * Only `portal` items have one, because only they are real — the id is a
   * thread in fixtures/messages.ts, the same conversation the client sees on
   * their own Messages screen. `email` and `court` rows have nothing to open
   * and this is null for them, which is what stops the reading pane from
   * inventing a body for a mailbox that is not connected.
   */
  threadId: string | null;
  /** The engagement it hangs off, when known. Portal threads always have one. */
  engagementRef: string | null;
  /**
   * The opening of the most recent message — PORTAL ROWS ONLY.
   *
   * The export shows two lines of body under every row regardless of source.
   * Two of our three sources have no body to show: an unconnected mailbox
   * delivers the fact that mail arrived, not the mail. Rendering a preview
   * for them would mean inventing one, so this is null there and the row
   * carries its subject alone — which makes the difference between a real
   * source and a placeholder visible at a glance, before anyone opens
   * anything.
   */
  preview: Record<Locale, string> | null;
  /**
   * The client spoke last and nobody has answered.
   *
   * DERIVED, and the only read-state the firm side can honestly produce: this
   * product has no per-user read cursor for staff (fixtures/messages.ts says
   * so of the client side too). Portal rows only; false everywhere else,
   * because an unconnected mailbox cannot tell you whether anyone replied.
   */
  awaitingReply: boolean;
}

/**
 * One entry on the calendar, from either of the two places dates live.
 *
 * ===========================================================================
 * TIMED AND ALL-DAY ARE DIFFERENT THINGS, AND THE DIFFERENCE IS REAL
 * ===========================================================================
 * A firm meeting has a wall-clock start and a length. A court date does not:
 * fixtures/engagements.ts carries the day a hearing is listed and deliberately
 * no hour, because the product is not told one — so `at` and `minutes` are null
 * for everything that comes off a timeline, and the calendar shows those in an
 * all-day row rather than inventing a start.
 *
 * The Stitch export gives every entry a precise range — "09:30 – 11:30" on a
 * DIFC oral submissions hearing — which is the same fabrication as its
 * pre-loaded timer, just harder to notice.
 */
export interface CalendarEntry {
  id: string;
  /** `meeting` has a time; `engagement` is all-day and came off a timeline. */
  source: 'meeting' | 'engagement';
  kind: FirmEventKind | TimelineEventKind;
  on: CalendarDate;
  /** Null for an all-day entry. */
  at: ClockTime | null;
  /** Null for an all-day entry. */
  minutes: number | null;
  title: Record<Locale, string>;
  detail: Record<Locale, string>;
  engagementRef: string | null;
  engagementKind: 'matter' | 'project' | null;
  /** Already happened, for a timeline entry that is marked completed. */
  past: boolean;
  /**
   * There are minutes of this meeting to read.
   *
   * DERIVED, and false for everything that is not a past internal meeting the
   * reader was in. fixtures/transcripts.ts explains why those three conditions
   * are conditions rather than an accident; the point of the flag living here is
   * that the detail panel offers a link only where the link resolves.
   */
  hasTranscript: boolean;
}

/* ---------------------------------------------------------------------------
 * Meeting minutes
 * ------------------------------------------------------------------------ */

/** One thing one person said, with the speaker resolved. */
export interface TranscriptTurnRecord {
  /** Seconds from the start of the meeting, as the fixture states it. */
  atSeconds: number;
  /**
   * The same offset as `m:ss` or `h:mm:ss`.
   *
   * Formatted HERE rather than in the component, because two readers of the same
   * transcript formatting it themselves is how one of them starts dropping the
   * leading zero. It is a counter, not a clock time — `formatClockTime` would
   * project it into a time of day, which is a different thing and the meeting's
   * own start already says that.
   */
  elapsed: string;
  speakerId: string;
  speakerName: Record<Locale, string>;
  /** Resolved from the roster, so a promotion does not leave this stale. */
  speakerRank: Rank;
  /** Consecutive turns by the same person, so the reader can group them. */
  continues: boolean;
  text: Record<Locale, string>;
}

/**
 * Minutes of one meeting, with everything around them resolved.
 *
 * The meeting is not restated by the fixture — see fixtures/transcripts.ts,
 * which carries an event id and the turns and nothing else. Title, place, time
 * and length all come from `demoFirmEvents`, so the transcript and the calendar
 * cannot disagree about which meeting this is.
 */
export interface MeetingTranscriptRecord {
  eventId: string;
  kind: FirmEventKind;
  title: Record<Locale, string>;
  location: Record<Locale, string>;
  /** Resolved onto the tenant's calendar, through the same `meetingDate`. */
  on: CalendarDate;
  at: ClockTime;
  minutes: number;
  /**
   * Everyone who was in the room, with whether they appear in the minutes.
   *
   * TWO DIFFERENT LISTS, DELIBERATELY NOT COLLAPSED. `attendeeIds` says who was
   * there; the turns say who spoke. A reader shown only the speakers concludes
   * that the person who sat through it in silence was not present — which on a
   * privileged internal meeting is the wrong conclusion to hand somebody.
   */
  attendees: {
    id: string;
    name: Record<Locale, string>;
    rank: Rank;
    spoke: boolean;
    isYou: boolean;
  }[];
  turns: TranscriptTurnRecord[];
  /** Counted off the turns. Never stated by a fixture. */
  speakerCount: number;
  /**
   * Where the last turn falls, in seconds.
   *
   * Surfaced so the screen can say the sample covers the opening of the meeting
   * rather than all of it — which is true, and is the kind of thing a reader
   * works out for themselves and mistrusts if the screen does not say it first.
   */
  lastTurnAtSeconds: number;
}

/** One entry on a fee earner's day — an internal meeting or a real court date. */
export interface AgendaEntry {
  id: string;
  kind: FirmEventKind | 'hearing';
  at: ClockTime | null;
  title: Record<Locale, string>;
  detail: Record<Locale, string>;
  /** Present when the entry came from an engagement's timeline. */
  engagementRef: string | null;
}

export interface PracticeCounts {
  matters: { total: number; active: number; needsAttention: number; closed: number };
  projects: { total: number; active: number; needsAttention: number; completed: number };
  /**
   * Approvals across the firm, not one reviewer's queue.
   *
   * `staff.approvalQueue` answers "what is waiting on ME"; this answers "what
   * is outstanding here", which is the question a practice summary asks.
   * `filingsOverdue` is counted rather than estimated: pending, kind
   * `filing`, and past its due date.
   */
  approvals: { pending: number; overdue: number; filingsOverdue: number };
  /**
   * The client with the most OPEN engagements, and how many.
   *
   * "Most active" needs a definition or it is a vibe. This one is countable
   * and stated: open matters plus open projects, highest wins, ties broken by
   * the most recent activity already recorded on the client. `null` when no
   * client has any open work.
   */
  busiestClient: { id: string; name: Record<Locale, string>; engagements: number } | null;
}

export interface BillingSummary {
  /**
   * Hours per week, oldest first, INCLUDING anything logged this session.
   *
   * The stated baseline plus session minutes, bucketed by the day each entry
   * falls on. So logging an hour moves the last bar by an hour — which is the
   * point of the ledger existing at all, and the thing the card's old "not
   * live" line had to stop saying.
   */
  weeks: number[];
  /** Sum of `weeks`. Derived, never stated. */
  total: number;
  targetPerWeek: number;
  /**
   * What this session added, so the card can label it.
   *
   * §5.1 requires a screen showing a session-scoped record to say so. Without
   * this the hours simply look different from yesterday's.
   */
  loggedThisSession: { entries: number; minutes: number };
  /** How many weeks back the chart reaches. Drives the date field's floor. */
  weeksShown: number;
  /** Today in the TENANT's zone — the date field's ceiling. See `logTime`. */
  today: CalendarDate;
  /** Files this person could log against. Every engagement, not just theirs. */
  engagements: { value: string; label: Record<Locale, string> }[];
}

/** One line of the time ledger, resolved for display. */
export interface TimeEntryRecord {
  id: string;
  staffId: string;
  staffName: Record<Locale, string>;
  engagementRef: string;
  engagementKind: 'matter' | 'project';
  engagementTitle: Record<Locale, string>;
  clientId: string;
  on: CalendarDate;
  minutes: number;
  description: string;
  billable: boolean;
  billed: boolean;
}

/**
 * What `logTime` answers with. A key, never a sentence.
 */
export type LogTimeResult =
  | { ok: true; entry: TimeEntryRecord }
  | {
      ok: false;
      error:
        | 'engagementInvalid'
        | 'dateRequired'
        | 'dateFuture'
        | 'dateTooOld'
        | 'durationRequired'
        | 'descriptionRequired'
        | 'billableRequired'
        | 'notPermitted';
    };

/** An engagement this person works on, and what they do on it. */
export interface EngagementAssignment {
  reference: string;
  kind: 'matter' | 'project';
  title: Record<Locale, string>;
  /** The engagement's own status line — the same one the client is shown. */
  status: Record<Locale, string>;
  statusTone: EngagementStatusTone;
  /**
   * The READER's part in it. `lead` is derived from the engagement itself; the
   * rest are assignments.
   *
   * Optional, because there are places where the reader has no part in it. A
   * client's record lists that client's engagements, and answering "your role"
   * there would be answering a question nobody asked — the CRM sends
   * `leadName` instead, which is the thing a reader actually wants to know
   * about someone else's file.
   */
  role?: 'lead' | SupportRole;
  /** Who at the firm runs it. Set where `role` would be meaningless. */
  leadName?: Record<Locale, string>;
  active: boolean;
  needsAttention: boolean;
}

export interface TaskRecord {
  id: string;
  title: Record<Locale, string>;
  engagementRef: string;
  /** Resolved from `assignedById`. */
  assignedBy: Record<Locale, string>;
  assignedByRank: Rank;
  /**
   * Resolved from `assignedToId`.
   *
   * Redundant on a person's own task card, where the assignee is the
   * reader. Not redundant on a matter, which lists the tasks of everyone on
   * the file — and one shape both screens read is what keeps them agreeing.
   */
  assignedTo: Record<Locale, string>;
  dueOn: CalendarDate;
  daysOverdue: number;
  dueToday: boolean;
  state: TaskState;
}

/** A fee earner a legal secretary supports, with what their day holds. */
export interface SupportedPerson {
  id: string;
  name: Record<Locale, string>;
  rank: Rank;
  /** Counted from the agenda, not stated beside it. */
  entriesToday: number;
  /** Unread correspondence addressed to them by name. */
  unreadForThem: number;
}

/* --------------------------------------------------------------------------
 * Resolvers shared by the five dashboards
 * ----------------------------------------------------------------------- */

/**
 * When a firm meeting actually happens.
 *
 * `inDays` is an offset from the tenant’s today, so it drifts across the week
 * as the demo is opened on different days — and twice a week it lands on the
 * closed weekend. Every reader resolves the date through here so the agenda
 * card, the calendar and the secretary’s roster agree about which day a
 * meeting is on, including after it has been pushed.
 *
 * THE PUSH HAS TO GO THE WAY THE OFFSET POINTS. A meeting two days out that
 * lands on the closed Friday happens on the Sunday — forward. A meeting
 * yesterday that lands on the closed Friday happened on the Thursday, and
 * pushing THAT one forward reported an already-finished meeting as happening
 * tomorrow. See `previousWorkingDay` in lib/format.ts for what that looked like
 * on screen; a fixture of relative offsets hides it four days out of seven.
 *
 * Today itself pushes forward, not back: `inDays: 0` means "on today's agenda",
 * and when today is a closed day the next open one is where that belongs.
 *
 * MOCK: production stores an actual date and this function does not exist.
 * Track A.5.
 */
function meetingDate(inDays: number, today: CalendarDate): CalendarDate {
  const raw = addDays(today, inDays);
  return inDays < 0
    ? previousWorkingDay(raw, WEEKEND_DAYS)
    : nextWorkingDay(raw, WEEKEND_DAYS);
}
/**
 * Everyone, by English display name.
 *
 * A join on a display string, which the fixtures' own MOCK notes say
 * production replaces with a `leadCounselId`. It is the same join
 * `leadEngagementsFor` makes, extracted so the register and a person's own
 * dashboard resolve a lead the same way rather than twice.
 */
function staffByDisplayName(): Map<string, StaffMember> {
  return new Map(demoStaff.map((member) => [member.name.en, member]));
}

/** Everyone, by id. Built once per call rather than scanned repeatedly. */
/* ===========================================================================
 * SESSION WRITES — the first of them. See BUILD_PLAN.md §5.1.
 * ===========================================================================
 * §5.1 settles what a submitted form does, and splits it by what the action
 * ASSERTS rather than by who performs it. Adding a colleague to the firm's own
 * roster asserts nothing about anyone outside the product, so it writes; the
 * array below is where it writes to.
 *
 * WHAT "SESSION" MEANS HERE, EXACTLY
 * ---------------------------------------------------------------------------
 * Module state in the Next.js server process. It survives navigation and a
 * browser refresh, and it does NOT survive a server restart, a redeploy, or a
 * second person opening the same demo — they get their own process, or share
 * this one, depending on where it is running.
 *
 * That is acceptable for a single-presenter prototype and unacceptable to
 * leave unstated, which is why every screen that shows a row from here labels
 * it. A demo that quietly loses a record is worse than one that says up front
 * the record is temporary.
 *
 * WHAT DOES NOT HAPPEN
 * ---------------------------------------------------------------------------
 * No mail. §3.1 provisions staff with a temporary password generated when they
 * are added, and this generates none — a credential that is neither stored,
 * shown, nor sent is not a credential. The row appears with
 * `temporaryPasswordIssued` because that is the state a new account is in; the
 * screen says plainly that nothing was sent and that somebody has to hand the
 * password over another way. Sending is category 2 in §5.1 and outlives this.
 *
 * MOCK: Track A.5 replaces this with POST /api/staff against Postgres, which
 * must also enforce the tenant scope, generate the credential, and hash it.
 * ======================================================================== */
/*
 * PINNED TO THE PROCESS, NOT TO THIS MODULE.
 *
 * A plain `const sessionStaff = []` here does not work, and the way it fails
 * is quiet: the row is created, the action reports success, and the roster
 * comes back without it.
 *
 * The reason is that a Server Action and the page that renders afterwards are
 * compiled into different server bundles. Both import this file, but each gets
 * its OWN evaluation of it — so the action pushes onto one array and the page
 * reads another, and nothing anywhere throws. Module-level mutable state is
 * per module instance; there can be several.
 *
 * `Symbol.for` looks up the global symbol registry, which is per PROCESS, so
 * every evaluation resolves the same array. It is the same singleton trick a
 * database client uses in Next, and for the same reason.
 *
 * This does not change what §5.1 promises: still one process, still gone on
 * restart, still not shared with a second viewer. It only makes the store
 * survive the round trip it was already supposed to survive.
 */
const SESSION_STAFF_KEY = Symbol.for('synqanun.mock.sessionStaff');
const sessionStaff: StaffMember[] = ((globalThis as Record<symbol, unknown>)[
  SESSION_STAFF_KEY
] ??= []) as StaffMember[];

/** Seeded staff plus anyone added in this session, with this session's access changes. */
function allStaff(): StaffMember[] {
  return [...demoStaff, ...sessionStaff].map(withAccessChange);
}

/*
 * ===========================================================================
 * Team access changed this session
 * ===========================================================================
 * The client asked (October 2026) for a partner to be able to add and remove
 * a colleague's access to the workspace from Settings, with a visible audit
 * line. Demo state, like every write here: pinned to the process, gone on
 * restart, and never sent anywhere — no account is locked and no sign-in is
 * refused because of it.
 *
 * An overlay on `status`, applied inside `allStaff()`, so a person whose
 * access was removed reads as deactivated everywhere the roster is read (the
 * Team tab, the lead pickers) rather than only on the screen that removed it.
 * The log is the audit line; it is append-only and newest last.
 *
 * MOCK: at Track A.5 this is a call to the identity provider plus a durable
 * audit record with the actor's verified identity. Track B reviews it.
 */
export interface AccessChange {
  id: string;
  staffId: string;
  change: 'removed' | 'granted';
  byStaffId: string;
  on: CalendarDate;
  at: ClockTime;
}

const SESSION_ACCESS_KEY = Symbol.for('synqanun.mock.sessionAccessLog');
const sessionAccessLog: AccessChange[] = ((globalThis as Record<symbol, unknown>)[
  SESSION_ACCESS_KEY
] ??= []) as AccessChange[];

/** The latest change to one person's access this session, if any. */
function lastAccessChange(staffId: string): AccessChange | undefined {
  for (let i = sessionAccessLog.length - 1; i >= 0; i -= 1) {
    if (sessionAccessLog[i].staffId === staffId) return sessionAccessLog[i];
  }
  return undefined;
}

function withAccessChange(member: StaffMember): StaffMember {
  const change = lastAccessChange(member.id);
  if (!change) return member;
  if (change.change === 'removed') return { ...member, status: 'deactivated' };
  // Granted back: active again. A temporary password stays as it was.
  return member.status === 'deactivated' ? { ...member, status: 'active' } : member;
}

/*
 * Matters opened in this session. Same store, same caveats, same reason for
 * the global symbol — see the session-staff note above.
 *
 * WHY THIS MERGES AT THE SOURCE RATHER THAN ON ONE SCREEN
 * ---------------------------------------------------------------------------
 * `allMatters()` is read in eighteen places in this file: the registers, the
 * calendar, the agenda, the CRM's per-client counts, the practice counts, the
 * activity log, the assistant, the document context. A matter that existed
 * only on the register it was created from would be a matter the firm's own
 * dashboard had never heard of — the counts would disagree with the list, which
 * is the exact failure every Stitch export in this project ships.
 *
 * So `allMatters()` replaces `allMatters()` at every read, and a matter opened
 * a minute ago is on the books everywhere a seeded one is.
 */
const SESSION_MATTERS_KEY = Symbol.for('synqanun.mock.sessionMatters');
const sessionMatters: Matter[] = ((globalThis as Record<symbol, unknown>)[
  SESSION_MATTERS_KEY
] ??= []) as Matter[];

/** Seeded matters plus any opened in this session, with this session's reopenings. */
function allMatters(): Matter[] {
  return [...demoMatters, ...sessionMatters].map(withReopening);
}

/**
 * The seeded projects, with this session's reopenings. Every read goes through
 * here rather than `demoProjects`, for the reason `allMatters()` gives: a file
 * reopened on the register must be open on the dashboard, the calendar and the
 * client's portal too.
 */
function allProjects(): Project[] {
  return demoProjects.map(withReopening);
}

/** Everything on the staff register of legal matters: matters and former projects. */
function registerFiles(): (Matter | Project)[] {
  return [...allMatters(), ...allProjects()];
}

/*
 * ===========================================================================
 * Files reopened this session
 * ===========================================================================
 * The client asked (October 2026) for closed matters to leave the main
 * register for an Archive, and for a partner to be able to reopen one. A
 * reopening is a session write like every other in this product: kept on
 * globalThis, gone on restart, and SAID on screen wherever it shows (§5.1).
 *
 * It is an overlay, not an edit. The seeded record still reads closed; the
 * overlay flips `active` and replaces the status line with one that states
 * what happened, rather than leaving "Settled" on a file that is open again.
 * MOCK: a real reopening is a dated lifecycle event with an author, recorded
 * against the file. Track A.5.
 */
const SESSION_REOPENED_KEY = Symbol.for('synqanun.mock.sessionReopened');
const sessionReopened: Map<string, string> = ((globalThis as Record<symbol, unknown>)[
  SESSION_REOPENED_KEY
] ??= new Map<string, string>()) as Map<string, string>;

/*
 * ===========================================================================
 * Client reports queued this session
 * ===========================================================================
 * The client asked (October 2026) for an AI report to be sendable to the
 * client — on the platform, by email or by WhatsApp — with a preview and a
 * partner's approval first. No channel is connected and nothing leaves this
 * process: a request waits for a partner, an approval moves it to `queued`,
 * and that is where it stays. Keyed by matter reference; a new request on the
 * same matter replaces the last. MOCK: Track A.5 sends through the portal's
 * message store and connected mail and WhatsApp accounts.
 */
interface ReportSendSeed {
  reference: string;
  channels: ReportChannel[];
  state: ReportSendRecord['state'];
  requestedById: string;
  requestedAt: ClockTime;
  approvedById: string | null;
  approvedAt: ClockTime | null;
}

const SESSION_REPORT_SENDS_KEY = Symbol.for('synqanun.mock.sessionReportSends');
const sessionReportSends: Map<string, ReportSendSeed> = ((globalThis as Record<symbol, unknown>)[
  SESSION_REPORT_SENDS_KEY
] ??= new Map<string, ReportSendSeed>()) as Map<string, ReportSendSeed>;

/** The status line on a file reopened this session. */
const REOPENED_STATUS: Record<Locale, string> = {
  en: 'Reopened, no steps taken yet',
  ar: 'أُعيد فتح الملف، ولم تُتَّخذ أي خطوة بعد',
};

function withReopening<T extends Matter | Project>(file: T): T {
  if (file.active || !sessionReopened.has(file.reference)) return file;
  return { ...file, active: true, status: REOPENED_STATUS, statusTone: 'info', lastUpdatedDaysAgo: 0 };
}

/** Reopened this session, so a screen can say so. */
function wasReopened(reference: string): boolean {
  return sessionReopened.has(reference);
}

/*
 * Clients taken on in this session. Third store, same rules — see the
 * session-staff note for what "session" buys and what it costs.
 *
 * Merged at the source for the reason the matters store gives: `allClients()`
 * is read eighteen times in this file, and a client who existed only on the
 * list they were created from would be missing from the CRM's counts, the
 * matter form's picker and every engagement's client name.
 */
const SESSION_CLIENTS_KEY = Symbol.for('synqanun.mock.sessionClients');
const sessionClients: FirmClient[] = ((globalThis as Record<symbol, unknown>)[
  SESSION_CLIENTS_KEY
] ??= []) as FirmClient[];

/** Seeded clients plus any taken on in this session. */
function allClients(): FirmClient[] {
  return [...demoClients, ...sessionClients];
}

function staffIndex(): Map<string, StaffMember> {
  // Session additions included, so a person added a moment ago resolves
  // everywhere a seeded one would rather than rendering as "—".
  return new Map(allStaff().map((member) => [member.id, member]));
}

const UNKNOWN_NAME: Record<Locale, string> = { en: '—', ar: '—' };

/**
 * Clients with at least one portal account.
 *
 * Built from fixtures/accounts.ts rather than written down as an id, so that
 * adding a second client account makes that client's row say so without a
 * constant here having to be kept in step. It holds one today.
 *
 * This is the ONLY thing `hasPortal` means now. It used to double as "has any
 * work with the firm", because an engagement pointed at an account and so
 * could not belong to a client without one.
 */
const demoAccountsByClient = new Map<string, PortalAccount[]>(
  [demoClientAccount]
    .filter((account) => account.side === 'client' && account.clientId)
    .map((account) => [account.clientId as string, [account]])
);

/**
 * Which engagements a person leads, read from the CLIENT-facing fixtures.
 *
 * fixtures/matters.ts carries `leadCounsel` and fixtures/projects.ts carries
 * `lead`, because that is what the client is told. Matching on the English name
 * is admittedly a join on a display string — the fixtures' own MOCK notes say
 * production stores `leadCounselId` — but the alternative was writing every
 * lead down a second time in fixtures/practice.ts, and two records of who runs
 * a matter is worse than one awkward join.
 *
 * It is also what surfaced the missing staff member: this returned nothing for
 * MAT-1940 and MAT-1104 until Salem Al-Hashemi was added to `demoStaff`.
 */
function leadEngagementsFor(staffId: string): EngagementAssignment[] {
  const person = staffIndex().get(staffId);
  if (!person) return [];

  const matters: EngagementAssignment[] = allMatters()
    .filter((matter) => leadNameOf(matter).en === person.name.en)
    .map((matter) => ({
      reference: matter.reference,
      kind: 'matter' as const,
      title: matter.title,
      status: matter.status,
      statusTone: matter.statusTone,
      role: 'lead' as const,
      active: matter.active,
      needsAttention: matter.needsAttention,
    }));

  const projects: EngagementAssignment[] = allProjects()
    .filter((project) => project.lead.name.en === person.name.en)
    .map((project) => ({
      reference: project.reference,
      kind: 'project' as const,
      title: project.title,
      status: project.status,
      statusTone: project.statusTone,
      role: 'lead' as const,
      active: project.active,
      needsAttention: project.needsAttention,
    }));

  return [...matters, ...projects];
}

/** One lookup table over both collections, so a ref resolves whatever it is. */
function engagementByRef(reference: string) {
  const matter = allMatters().find((row) => row.reference === reference);
  if (matter) {
    return {
      reference: matter.reference,
      kind: 'matter' as const,
      title: matter.title,
      status: matter.status,
      statusTone: matter.statusTone,
      active: matter.active,
      needsAttention: matter.needsAttention,
    };
  }
  const project = allProjects().find((row) => row.reference === reference);
  if (project) {
    return {
      reference: project.reference,
      kind: 'project' as const,
      title: project.title,
      status: project.status,
      statusTone: project.statusTone,
      active: project.active,
      needsAttention: project.needsAttention,
    };
  }
  return null;
}

/** Every engagement this person touches: led, plus supported. */
function engagementsFor(staffId: string): EngagementAssignment[] {
  const led = leadEngagementsFor(staffId);
  const ledRefs = new Set(led.map((row) => row.reference));

  const supported = demoSupportAssignments
    .filter((row) => row.staffId === staffId && !ledRefs.has(row.engagementRef))
    .map((row) => {
      const engagement = engagementByRef(row.engagementRef);
      if (!engagement) {
        // A support row naming an engagement that does not exist is a fixture
        // defect, not a runtime condition to paper over.
        throw new MockApiError(`Support assignment names unknown engagement ${row.engagementRef}.`);
      }
      return { ...engagement, role: row.role };
    });

  return [...led, ...supported].sort((a, b) => {
    if (a.active !== b.active) return a.active ? -1 : 1;
    if (a.role !== b.role) return a.role === 'lead' ? -1 : 1;
    return a.reference.localeCompare(b.reference);
  });
}

/**
 * A client as the CRM lists them.
 *
 * ===========================================================================
 * EVERY FIGURE IS COUNTED FROM SOMETHING THIS PRODUCT HOLDS
 * ===========================================================================
 * Engagements from fixtures/matters.ts and fixtures/projects.ts, correspondence
 * from the inbox, approvals from the one approvals collection. There is no
 * annual retainer value, no YTD billings, no realisation rate and no retention
 * percentage, because the fixtures record none of those and a CRM is the
 * easiest screen in the product on which to invent them.
 *
 * The export's list carries "$14,820,400 YTD Institutional Billings",
 * "Realization Rate: 94.2%", "Retention 98.4%" and "Renewal SLA Met 38/39" —
 * four figures over seven visible rows, none of which any row supports.
 */
export interface ClientSummary extends FirmClient {
  /** Derived from `lastActivityDaysAgo`. */
  lastActivityOn: CalendarDate;
  matters: number;
  projects: number;
  /** Correspondence filed against this client that nobody has dealt with. */
  openCorrespondence: number;
  /** Requests on this client's work still waiting on a decision. */
  pendingApprovals: number;
  /**
   * Whether this client can sign in to the portal.
   *
   * ONE OF FIVE CAN, and that is now all this says. It used to be the flag for
   * "has engagements" as well, because a matter pointed at a portal ACCOUNT
   * rather than at a client — so the four clients with no login counted zero
   * matters no matter how many the firm was running for them. Engagements name
   * their client directly now (fixtures/matters.ts), and the two facts have
   * come apart: four of these five have work and no way to read it themselves.
   */
  hasPortal: boolean;
}

/**
 * One person at a client organisation who can sign in to the portal.
 *
 * The same row fixtures/accounts.ts holds, minus `clientId` — the record is
 * fetched BY client, so repeating it on every row would be the caller's own
 * argument handed back to it.
 */
export interface ClientContact {
  id: string;
  name: Record<Locale, string>;
  title: Record<Locale, string>;
  email: string;
  role: ClientRole;
  status: ClientAccessStatus;
}

/** Who at one client can sign in, for the firm's own side of the product. */
export interface ClientContactsRecord {
  clientId: string;
  clientName: Record<Locale, string>;
  contacts: ClientContact[];
  /** Addresses already on the list, lower-cased — for the duplicate check. */
  takenEmails: string[];
}

/**
 * What `createDocument` answers with.
 *
 * A key, never a sentence — the message is a translation and the rule that
 * produced it lives next to the collection it checked against.
 */
export type CreateDocumentResult =
  | { ok: true; document: FirmDocumentRecord }
  | { ok: false; error: 'titleRequired' | 'typeInvalid' | 'engagementInvalid' | 'notPermitted' };

/** What the signature-request screen needs before anything is chosen. */
export interface SignatureRequestContext {
  /**
   * Documents that can be asked about: the ones already SHARED with a client.
   *
   * A structural constraint rather than a policy one. The firm cannot ask
   * somebody to execute a document they have no way to read, and the firm's own
   * drafts are not visible to anybody outside the building — see
   * fixtures/documents.ts on the two collections.
   */
  documents: {
    id: string;
    name: string;
    engagementRef: string;
    engagementTitle: Record<Locale, string>;
    clientId: string;
  }[];
  /** Who can be asked, for the chosen document's client. Empty is a real answer. */
  contacts: { id: string; name: Record<Locale, string>; email: string }[];
  /** The three marks. See fixtures/signatures.ts on why there is no canvas. */
  fields: readonly SignatureField[];
}

/** What `saveSignatureRequest` answers with. A key, never a sentence. */
export type SaveSignatureRequestResult =
  | { ok: true; request: SignatureRequestRecord }
  | {
      ok: false;
      error:
        | 'documentInvalid'
        | 'noSigners'
        | 'signerInvalid'
        | 'fieldsRequired'
        | 'notPermitted';
    };

/**
 * One saved version, with its date resolved and its author named.
 *
 * NO CHANGE NOTE, NO DIFF, NO RESTORE — see fixtures/documents.ts over
 * `DocumentVersion`, which sets out why each of those would be a claim about
 * text this product does not hold.
 */
export interface DocumentVersionRecord {
  label: string;
  savedOn: CalendarDate;
  byName: Record<Locale, string>;
  byRank: Rank;
  /** True for the newest. It is the one the client was sent. */
  isCurrent: boolean;
}

/**
 * One entry plus where it sits in the corpus.
 *
 * `position` and `total` are counted from the collection rather than stated,
 * for the reason every count in this file is: the export's reader claims "363
 * Articles codified" over an index it does not have.
 */
export interface LegalEntryRecord {
  entry: LegalDatabaseEntry;
  previous: { reference: string; title: Record<Locale, string> } | null;
  next: { reference: string; title: Record<Locale, string> } | null;
  position: number;
  total: number;
}

/** What `reassignLead` answers with. A key, never a sentence. */
export type ReassignLeadResult =
  | { ok: true; changed: number; leadName: Record<Locale, string> }
  | {
      ok: false;
      error: 'noEngagements' | 'engagementInvalid' | 'leadInvalid' | 'notPermitted';
    };

/** What the invoice builder needs before anything is typed into it. */
export interface InvoiceDraftContext {
  engagements: { value: string; label: Record<Locale, string> }[];
  /** Unbilled, chargeable time on the chosen file. Empty until time is logged. */
  unbilled: TimeEntryRecord[];
  currency: string;
  today: CalendarDate;
}

/** What `saveInvoiceDraft` answers with. A key, never a sentence. */
export type SaveInvoiceDraftResult =
  | { ok: true; draft: InvoiceDraftRecord }
  | {
      ok: false;
      error:
        | 'engagementInvalid'
        | 'descriptionRequired'
        | 'noLines'
        | 'lineDescriptionRequired'
        | 'lineAmountRequired'
        | 'entryAlreadyBilled'
        | 'notPermitted';
    };

/** A client's record, as the detail screen shows it. */
export interface ClientRecord {
  client: ClientSummary;
  engagements: EngagementAssignment[];
  correspondence: InboxItemRecord[];
  approvals: ApprovalRecord[];
}

/* --------------------------------------------------------------------------
 * The inbox, assembled from two very different kinds of thing
 * ----------------------------------------------------------------------- */

/** An inbox row plus the routing the screens filter on but never render. */
interface RoutedInboxItem {
  /** Who it was addressed to, or null for the practice. */
  toId: string | null;
  item: InboxItemRecord;
}

/** Newest first. Ties broken by id so the order is stable across requests. */
function byNewestFirst(a: InboxItemRecord, b: InboxItemRecord): number {
  return a.receivedOn === b.receivedOn
    ? a.id.localeCompare(b.id)
    : a.receivedOn < b.receivedOn
      ? 1
      : -1;
}

/**
 * Every piece of correspondence the firm holds, with its routing.
 *
 * ===========================================================================
 * PORTAL ROWS ARE DERIVED; THE OTHER TWO SOURCES ARE STORED
 * ===========================================================================
 * A portal thread already exists — in fixtures/messages.ts, which is what the
 * client reads on their own Messages screen. Writing it down a second time in
 * fixtures/practice.ts is what the old `demoInbox` did, and its two "portal"
 * rows matched none of the five real conversations. One conversation, one
 * record, seen from whichever side is asking.
 *
 * `email` and `court` have no other home because those integrations do not
 * exist, so they stay stored — and every screen labels them as unconnected.
 *
 * ===========================================================================
 * WHAT "UNREAD" HONESTLY MEANS, PER SOURCE
 * ===========================================================================
 * There is no staff read cursor in this product. fixtures/messages.ts says the
 * same of the client side and defers it to Track A.5. So:
 *
 *  · PORTAL: `unread` is derived as "the client spoke last and nobody has
 *    answered" — which is not a read state at all, it is an obligation, and it
 *    is the one thing the data can actually support. `awaitingReply` carries
 *    the same fact under the name that says what it is, and the screen shows
 *    THAT rather than a dot pretending to be a read cursor.
 *
 *  · EMAIL AND COURT: the fixture's own flag, meaning the demo record arrived
 *    and nobody triaged it. `awaitingReply` is false — an unconnected mailbox
 *    cannot tell you whether anyone replied, and claiming otherwise would be
 *    the integration lie this whole screen is arranged to avoid.
 *
 * THE FIRM HOLDER IS RESOLVED BY NAME, the same awkward join as `leadCounsel`
 * and for the same reason: fixtures/messages.ts tells the CLIENT who holds
 * their thread, and that is the record. It is also what surfaced Rana
 * Al-Khatib and Salma Al-Hashemi, who held two of the five threads and had no
 * staff record until this function needed one.
 */
function routedInboxItems(): RoutedInboxItem[] {
  const today = tenantToday();
  const byName = new Map(demoStaff.map((member) => [member.name.en, member]));

  // The client, as the firm files them: the organisation, not the individual
  // who happened to type. `allClients()` names them the same way.
  const clientName = demoClientAccount.organisation ?? demoClientAccount.name;

  // FIRM-WIDE. This is the firm's inbox, not a client's portal — scoping it
  // by the signed-in client account would hide another client's conversation
  // from the colleague who has to answer it.
  const portal: RoutedInboxItem[] = resolveMessageThreads().map((thread) => {
    const latest = thread.messages[thread.messages.length - 1];
    const awaitingReply = latest?.from === 'client';
    const holder = byName.get(thread.senderName.en);

    return {
      toId: holder?.id ?? null,
      item: {
        id: thread.id,
        source: 'portal' as const,
        from: clientName,
        subject: thread.subject,
        receivedOn: thread.sentOn,
        unread: awaitingReply,
        personal: false,
        forStaff: null,
        threadId: thread.id,
        engagementRef: thread.engagementRef,
        preview: thread.preview,
        awaitingReply,
      },
    };
  });

  const rest: RoutedInboxItem[] = demoInbox.map((row) => ({
    toId: row.toId,
    item: {
      id: row.id,
      source: row.source,
      from: row.from,
      subject: row.subject,
      receivedOn: addDays(today, -row.receivedDaysAgo),
      unread: row.unread,
      personal: false,
      forStaff: null,
      // Nothing to open and no engagement recorded: an unconnected source
      // arrives as a notice that something happened, not as a document.
      threadId: null,
      engagementRef: null,
      preview: null,
      awaitingReply: false,
    },
  }));

  return [...portal, ...rest];
}


/* ===========================================================================
 * The firm's engagement registers
 * ===========================================================================
 * The staff-side directories of matters and of projects. Distinct from the
 * `matters` and `projects` namespaces above, which are the CLIENT portal's view
 * of its own files: these cross clients, carry who at the firm is on each file,
 * and are not scoped to a portal account.
 *
 * ONE SHAPE, TWO REGISTERS
 * ---------------------------------------------------------------------------
 * The matters register was built first and the projects register is the second
 * instance, which is where this codebase extracts. Both ask the same questions
 * of the same shape — what is it, whose is it, who is on it, what happens next
 * — so `engagementRegister` and `engagementDetail` answer them once and the two
 * endpoints differ only in which collection they read.
 *
 * The field names below are deliberately neutral, because the two vocabularies
 * genuinely differ and the DATA does not:
 *
 *   venue        a matter's `forum` (a court, a tribunal, an authority);
 *                a project's `jurisdiction` (a registry, a body of law).
 *   registryNumber   a matter's `courtFileNumber`; a project's
 *                `registrationNumber`. Latin in both locales either way.
 *   counterpart  a matter's `opposingParty` — who the client is against;
 *                a project's `targetEntities` — what the work acts on. Null on
 *                non-contentious work and on a project with nothing named yet.
 *
 * fixtures/engagements.ts already makes this split, and its header is explicit
 * that "a project is not a kind of matter". Nothing here makes one a subclass
 * of the other: they share the reading, not the type.
 *
 * It is also only possible to build either honestly because an engagement now
 * names its client (fixtures/matters.ts, `clientId`). Before that, every row in
 * both registers would have read "Gulf Holdings".
 */

/** Which register a row came out of. Drives nothing but the links. */
export type EngagementKind = 'matter' | 'project';

/**
 * A register's segments.
 *
 * These do NOT partition the list and are not presented as though they do: an
 * engagement can be both mine and due this fortnight. That is a departure from
 * the client-side lists, whose three filters are a status partition whose
 * counts sum to the total — and the difference is the point. These are five
 * different questions about the same register, and the only count that is a
 * total is `all`.
 *
 * `closed` covers a matter that has closed and a project that has completed.
 * One value, two words for it — the same call fixtures/projects.ts makes when
 * it notes that a project completes where a matter closes, resolved here in the
 * translation rather than in a second enum.
 *
 * The Stitch exports' segments are "All Matters 142 / My Lead Matters 28 / High
 * Priority & Urgent 7 / Court Deadlines < 14 Days 12 / Pending Billing / WIP >
 * $100k 9", and for projects "All Projects (86) / My Lead Projects (19) /
 * Urgent & Near Closing (6) / Regulatory Clearance < 14 Days (8) / Pending
 * Billing / WIP > $100k (5)". Three of five are here under honest names. There
 * is no priority field in this product, so there is no priority segment; `soon`
 * is computed from the timelines rather than stated; and there is no time
 * ledger, so the WIP segment has nothing to stand on.
 */
export type StaffRegisterFilter = 'all' | 'mine' | 'waitingOnClient' | 'soon';

export const STAFF_REGISTER_FILTERS: StaffRegisterFilter[] = ['all', 'mine', 'waitingOnClient', 'soon'];

/**
 * Which half of the register: the files in hand, or the Archive.
 *
 * At the client's request (October 2026) a closed matter leaves the main list
 * and is found under Archive instead — so "Closed" stopped being a segment
 * among the four above and became the other half of the register. The four
 * segments are questions about open files; the Archive is not one of them.
 */
export type StaffRegisterView = 'active' | 'archive';

/** What "soon" means, in one place, so the tab and the row badge agree. */
export const REGISTER_SOON_DAYS = 14;

/** One fee earner on an engagement, with what they do on it. */
export interface EngagementTeamMember {
  /** Resolved from `demoStaff` — a name is never written down twice. */
  name: Record<Locale, string>;
  rank: Rank;
  role: 'lead' | SupportRole;
}

export interface StaffEngagementRow {
  kind: EngagementKind;
  reference: string;
  title: Record<Locale, string>;
  /**
   * The kind of work. A former project is always `otherProject` — see
   * `MatterWorkType` and the note over `staff.matters`.
   */
  workType: MatterWorkType;
  /** A matter's practice area; a project's kind of work. */
  category: Record<Locale, string>;
  /** A matter's forum; a project's jurisdiction. See the header. */
  venue: Record<Locale, string>;
  /** The engagement's own status line — the same words the client is shown. */
  status: Record<Locale, string>;
  statusTone: EngagementStatusTone;
  /** Court file or registry number. Latin in both locales. `null` if none. */
  registryNumber: string | null;

  clientId: string;
  clientName: Record<Locale, string>;

  /**
   * Lead first, supporting cast after.
   *
   * The lead is NOT stored in `demoSupportAssignments` — see the note there —
   * so it is spliced on here from the engagement itself. That is the same
   * single-source rule `leadEngagementsFor` follows.
   */
  team: EngagementTeamMember[];

  lastUpdatedOn: CalendarDate;
  openedOn: CalendarDate;

  /**
   * The next thing in the record that has not happened.
   *
   * DERIVED from the timeline, exactly as the client's dashboard key date is,
   * so a register and an engagement's own screen cannot name different next
   * hearings. `null` where nothing is left ahead.
   */
  nextDate: { on: CalendarDate; inDays: number; title: Record<Locale, string> } | null;

  active: boolean;
  /**
   * When a closed file closed, or `null` for an open one.
   *
   * DERIVED from `lastUpdatedOn`: the fixtures carry no closing date, and the
   * last movement on a closed file is its closing. Not a field added to the
   * seeds, because those rows are under review (docs/saudi-fixture-mapping.md).
   * MOCK: a real record stores the date it was closed. Track A.5.
   */
  closedOn: CalendarDate | null;
  /** True when a partner reopened it this session. §5.1: it says so. */
  reopenedThisSession: boolean;
  /** Something is waiting on the CLIENT. See fixtures/matters.ts. */
  needsAttention: boolean;
  /**
   * True when this session changed who leads it.
   *
   * §5.1 requires a screen showing a session-scoped record to say so, and a
   * reassignment is the least visible write in the product: the lead column
   * simply reads a different name than it did, with nothing to mark it as new.
   */
  leadReassignedThisSession: boolean;
}

/** One option in a filter dropdown, with how many rows it would leave. */
export interface RegisterFacet {
  value: string;
  label: Record<Locale, string>;
  count: number;
}

export interface StaffRegisterList {
  items: StaffEngagementRow[];
  /**
   * Per segment, over the open half of the register — never over what a
   * filter left. `archived` is the Archive's size; `register` is everything,
   * open or closed, so an empty register is told apart from an empty view.
   */
  counts: Record<StaffRegisterFilter | 'archived' | 'register', number>;
  /** Dropdown options, derived from the register. Never a written-out list. */
  clients: RegisterFacet[];
  venues: RegisterFacet[];
  leads: RegisterFacet[];
  /**
   * Every kind of work, in the client's order, with how many rows each would
   * leave. NOT derived like the other facets: the vocabulary is fixed, so a
   * kind with nothing on it yet is still offered, with its zero.
   */
  types: { value: MatterWorkType; count: number }[];
}

/**
 * One engagement, as the firm's own screen shows it.
 *
 * The list row is embedded rather than restated, so a register and the
 * engagement behind it cannot disagree about its client, team, status or next
 * date.
 */
export interface StaffEngagementDetail {
  engagement: StaffEngagementRow;
  /** When the firm was instructed. */
  openedOn: CalendarDate;
  /** Where the work has got to, per locale. */
  currentPhase: Record<Locale, string>;
  /** Who the client is against, or what the work acts on. See the header. */
  counterpart: Record<Locale, string> | null;
  scopeSummary: Record<Locale, string>;
  /** What the client has to do. `null` unless something is waiting on them. */
  attentionReason: Record<Locale, string> | null;
  client: { id: string; name: Record<Locale, string>; standing: ClientStanding };
  /** The whole record, earliest first — not just what is ahead. */
  timeline: KeyDate[];
  /** Files shared with the client. NOT the firm's own DMS. */
  documents: SharedDocumentRecord[];
  /**
   * The firm's own drafts on this engagement. NOT visible to the client, and
   * deliberately a separate field from `documents` so that a screen rendering
   * one cannot accidentally render the other.
   */
  firmDocuments: FirmDocumentRecord[];
  /**
   * Signature requests PREPARED on this engagement's documents.
   *
   * Firm-side only. A request here has not been sent and the client's portal
   * does not know it exists — fixtures/signatures.ts, on why that separation is
   * the whole point of the record.
   */
  signatureRequests: SignatureRequestRecord[];
  /** Fee statements issued on this engagement. */
  invoices: InvoiceRecord[];
  /** Still waiting on a decision. */
  approvals: ApprovalRecord[];
  tasks: TaskRecord[];
}

/**
 * A matter or a project, in the one shape both registers render.
 *
 * The neutral field names are explained over `StaffEngagementRow`. Throwing on
 * an unknown client is deliberate: a row pointing at a client that does not
 * exist is a fixture defect, not a runtime condition to render a dash for — the
 * same call `engagementsFor` makes on a support assignment naming an
 * engagement that is not there.
 */
function toEngagementRow(
  source: Matter | Project,
  today: CalendarDate,
  people: Map<string, StaffMember>,
  byName: Map<string, StaffMember>,
  clients: Map<string, FirmClient>
): StaffEngagementRow {
  const isMatter = 'opposingParty' in source;

  const client = clients.get(source.clientId);
  if (!client) {
    throw new MockApiError(
      `Engagement ${source.reference} names unknown client ${source.clientId}.`
    );
  }

  // Through `leadNameOf`, so a reassignment made this session is the lead
  // every screen sees — see the note over that function.
  const leadName = leadNameOf(source).en;
  const lead = byName.get(leadName);

  const team: EngagementTeamMember[] = [
    ...(lead ? [{ name: lead.name, rank: lead.rank, role: 'lead' as const }] : []),
    ...demoSupportAssignments
      .filter((row) => row.engagementRef === source.reference)
      .flatMap((row) => {
        const person = people.get(row.staffId);
        if (!person) return [];
        return [{ name: person.name, rank: person.rank, role: row.role }];
      }),
  ];

  const event = nextTimelineEvent(source);

  return {
    kind: isMatter ? 'matter' : 'project',
    reference: source.reference,
    title: source.title,
    workType: isMatter ? source.workType : 'otherProject',
    category: isMatter ? source.matterType : source.category,
    venue: isMatter ? source.forum : source.jurisdiction,
    status: source.status,
    statusTone: source.statusTone,
    registryNumber: isMatter ? source.courtFileNumber : source.registrationNumber,
    clientId: source.clientId,
    clientName: client.name,
    team,
    lastUpdatedOn: addDays(today, -source.lastUpdatedDaysAgo),
    openedOn: addDays(today, -source.openedDaysAgo),
    nextDate:
      event && event.inDays >= 0
        ? { on: addDays(today, event.inDays), inDays: event.inDays, title: event.title }
        : null,
    active: source.active,
    closedOn: source.active ? null : addDays(today, -source.lastUpdatedDaysAgo),
    reopenedThisSession: wasReopened(source.reference),
    needsAttention: source.needsAttention,
    // §5.1: a session-scoped change says so wherever it shows.
    leadReassignedThisSession: leadWasReassigned(source.reference),
  };
}

/**
 * A register, filtered, with the counts and the dropdown options behind it.
 *
 * ONE CALL, for the reason `matters.list` gives: fetching the rows and their
 * counts separately is how a segment ends up reading "Closed (1)" over an empty
 * table. The options come back the same way, derived from the register rather
 * than written out — the client-side list already learned that lesson, where
 * the export offered seven forums of which two matched no matter in the list.
 *
 * NOT SCOPED BY RANK. Every entry in components/chrome/nav-items.ts that is
 * privileged carries a `ranks` allow-list, and neither register does: a
 * paralegal collating evidence has to be able to find the file they are
 * collating it for. What a rank may DO to one is a different question, and
 * there is nothing here to do it with yet.
 *
 * MOCK: replace with GET /api/staff/{matters,projects}?segment=&client=&venue=
 * &lead=. The counts and facets must be computed in the database rather than by
 * loading the whole register to count it, and the free-text search is applied
 * in the browser today, which is right over nine rows and wrong over nine
 * hundred. Tenant-scoped server-side; there is no client scope here on purpose,
 * and that is exactly the query that needs the tenant predicate most. Track A.5.
 */
/** The register's filters, all optional. An unknown value narrows to nothing. */
export interface StaffRegisterOptions {
  /** The open files (the default) or the Archive. */
  view?: StaffRegisterView;
  filter?: StaffRegisterFilter;
  clientId?: string;
  venue?: string;
  leadId?: string;
  workType?: MatterWorkType;
}

function engagementRegister(
  source: (Matter | Project)[],
  staffId: string,
  {
    view = 'active',
    filter = 'all',
    clientId,
    venue,
    leadId,
    workType,
  }: StaffRegisterOptions = {}
): StaffRegisterList {
  const today = tenantToday();
  const people = staffIndex();
  const byName = staffByDisplayName();
  const clients = new Map(allClients().map((client) => [client.id, client]));

  const rows = source.map((row) => toEngagementRow(row, today, people, byName, clients));

  const me = people.get(staffId);
  /** Whose file it is, from the reader's point of view. */
  const isMine = (row: StaffEngagementRow) =>
    me ? row.team.some((member) => member.name.en === me.name.en) : false;

  const matchesSegment = (row: StaffEngagementRow, segment: StaffRegisterFilter) => {
    switch (segment) {
      case 'mine':
        return isMine(row);
      case 'waitingOnClient':
        return row.active && row.needsAttention;
      case 'soon':
        return row.active && row.nextDate !== null && row.nextDate.inDays <= REGISTER_SOON_DAYS;
      case 'all':
        return true;
    }
  };

  // The half of the register being read. Segments apply to the open half only.
  const open = rows.filter((row) => row.active);
  const archived = rows.filter((row) => !row.active);
  const inView = view === 'archive' ? archived : open;

  const leadOf = (row: StaffEngagementRow) => row.team.find((member) => member.role === 'lead');

  /** Options are counted over the register, never over the filtered view. */
  const facet = (
    key: (row: StaffEngagementRow) => { value: string; label: Record<Locale, string> } | null
  ): RegisterFacet[] => {
    const seen = new Map<string, RegisterFacet>();
    // Over the half being read: an Archive dropdown offering a client's five
    // open files would be five dead ends.
    for (const row of inView) {
      const entry = key(row);
      if (!entry) continue;
      const existing = seen.get(entry.value);
      if (existing) existing.count += 1;
      else seen.set(entry.value, { ...entry, count: 1 });
    }
    return [...seen.values()].sort((a, b) => a.label.en.localeCompare(b.label.en));
  };

  const visible = inView
    .filter((row) => (view === 'archive' ? true : matchesSegment(row, filter)))
    .filter((row) => (clientId ? row.clientId === clientId : true))
    .filter((row) => (venue ? row.venue.en === venue : true))
    .filter((row) => (leadId ? leadOf(row)?.name.en === leadId : true))
    .filter((row) => (workType ? row.workType === workType : true))
    // Most recently moved first. Stated on the screen rather than offered as a
    // sort control nothing else in this product has.
    .sort((a, b) => b.lastUpdatedOn.localeCompare(a.lastUpdatedOn));

  return {
    items: visible,
    counts: {
      all: open.length,
      mine: open.filter((row) => matchesSegment(row, 'mine')).length,
      waitingOnClient: open.filter((row) => matchesSegment(row, 'waitingOnClient')).length,
      soon: open.filter((row) => matchesSegment(row, 'soon')).length,
      archived: archived.length,
      register: rows.length,
    },
    clients: facet((row) => ({ value: row.clientId, label: row.clientName })),
    venues: facet((row) => ({ value: row.venue.en, label: row.venue })),
    leads: facet((row) => {
      const lead = leadOf(row);
      return lead ? { value: lead.name.en, label: lead.name } : null;
    }),
    types: MATTER_WORK_TYPES.map((value) => ({
      value,
      count: inView.filter((row) => row.workType === value).length,
    })),
  };
}

/**
 * One engagement, with everything the firm's own screen shows.
 *
 * ONE CALL, for the reason the client-side `getByReference` gives: the header
 * states counts for the panels beneath it, so they have to come from the same
 * fetch or the header ends up describing a different one.
 *
 * FIRM-WIDE, and that is the whole difference from the client's version of this
 * screen. The documents and fee statements come from the UNSCOPED resolvers,
 * because a colleague reading MAT-3310 is not Gulf Holdings and the client
 * scope has no business narrowing what they see. The tenant scope still must,
 * server-side.
 *
 * Returns null for a reference that names nothing, so the route answers with
 * the translated 404 rather than an error page — the rule every detail screen
 * in this product follows. A project reference asked of the matters register
 * finds nothing and 404s, which is correct: they are separate registers.
 *
 * MOCK: replace with GET /api/staff/{matters,projects}/:reference.
 * Tenant-scoped, and scoped by whatever conflict-of-interest and
 * information-barrier rules the firm operates — a register that lets any fee
 * earner open any file is a choice, and a real one has to be made deliberately
 * rather than by omission. Track A.5, with Track B reviewing the enforcement.
 */
function engagementDetail(
  source: (Matter | Project)[],
  reference: string
): StaffEngagementDetail | null {
  const found = source.find(
    (candidate) => candidate.reference.toLowerCase() === reference.toLowerCase()
  );
  if (!found) return null;

  const today = tenantToday();
  const people = staffIndex();
  const clients = new Map(allClients().map((client) => [client.id, client]));

  const row = toEngagementRow(found, today, people, staffByDisplayName(), clients);
  // `toEngagementRow` throws on an unknown client, so this cannot be missing.
  const client = clients.get(found.clientId) as FirmClient;

  // An approval's `engagementRef` is nullable — a fee quote can precede any
  // engagement at all. A null never equals a reference, so it never matches.
  const isThisOne = (candidate: { engagementRef: string | null }) =>
    candidate.engagementRef === found.reference;

  const approvals: ApprovalRecord[] = demoApprovals
    .filter((approval) => isThisOne(approval) && approval.state === 'pending')
    .map((approval) => {
      const person = people.get(approval.submittedById);
      const dueOn = addDays(today, approval.dueInDays);

      return {
        id: approval.id,
        kind: approval.kind,
        title: approval.title,
        submittedBy: person?.name ?? UNKNOWN_NAME,
        submittedByRank: person?.rank ?? 'paralegal',
        clientName: client.name,
        engagementRef: approval.engagementRef,
        dueOn,
        daysOverdue: daysBetween(dueOn, today),
        dueToday: approval.dueInDays === 0,
      };
    })
    .sort((a, b) => a.dueOn.localeCompare(b.dueOn));

  const tasks: TaskRecord[] = demoTasks.filter(isThisOne).map((task) => {
    const dueOn = addDays(today, task.dueInDays);
    const assignedBy = people.get(task.assignedById);

    return {
      id: task.id,
      title: task.title,
      engagementRef: task.engagementRef,
      assignedBy: assignedBy?.name ?? UNKNOWN_NAME,
      assignedByRank: assignedBy?.rank ?? 'partner',
      assignedTo: people.get(task.assignedToId)?.name ?? UNKNOWN_NAME,
      dueOn,
      daysOverdue: task.state === 'done' ? 0 : daysBetween(dueOn, today),
      dueToday: task.state !== 'done' && task.dueInDays === 0,
      state: task.state,
    };
  });

  const isMatter = 'opposingParty' in found;

  return {
    engagement: row,
    openedOn: row.openedOn,
    currentPhase: found.currentPhase,
    counterpart: isMatter ? found.opposingParty : found.targetEntities,
    scopeSummary: found.scopeSummary,
    attentionReason: found.attentionReason,
    client: { id: client.id, name: client.name, standing: client.standing },
    timeline: resolveTimeline(found.timeline, found.reference, row.kind, today),
    // UNSCOPED on purpose — see the note above.
    documents: resolveDocuments(demoSharedDocuments.filter(isThisOne)),
    firmDocuments: resolveFirmDocuments(allFirmDocuments().filter(isThisOne)),
    signatureRequests: resolveSignatureRequests(sessionSignatureRequests).filter(
      (request) => request.engagementRef === found.reference
    ),
    invoices: resolveInvoices().filter(isThisOne),
    approvals,
    tasks,
  };
}

/* ===========================================================================
 * Billing and quotes — the firm's side
 * ===========================================================================
 * WHAT THIS PRODUCT CAN ANSWER ABOUT MONEY, AND WHAT IT CANNOT
 * ---------------------------------------------------------------------------
 * It holds two things: fee statements it has issued (fixtures/invoices.ts) and
 * fee quotes waiting on a decision (fixtures/practice.ts, `kind: 'quote'`).
 * Everything below is one of those two, or arithmetic over them.
 *
 * It does NOT hold a time ledger. There are no per-entry time records — no
 * date, matter, description, hours and rate — and there are no hourly rates
 * for anyone. fixtures/practice.ts records weekly HOURS per fee earner, which
 * is what the dashboards show, and hours without a rate are not money.
 *
 * That is why five screens' worth of MOCK notes in this file say "Batch 5 owns
 * Billing" about a WIP column, and why this is where that promise stops: the
 * unbilled-work-in-progress figure, the realization rate, the billable value
 * and the per-rank rate card all need a ledger that does not exist. They are
 * not approximated here. The screen says so instead, and names the timer in
 * the corner of every staff page that throws its seconds away.
 *
 * MOCK: in production the invoice totals come from the ledger rather than from
 * stored line items, and every figure below is computed server-side. A client
 * who may ask for line items may not ask for the firm's sums. Track A.5.
 */

/**
 * A fee statement, as the FIRM reads it.
 *
 * `InvoiceRecord` is the client's view of the same row. The difference is the
 * client: a firm-side ledger crosses them, so it has to name whose statement
 * each one is — which, like the registers, only became answerable when an
 * engagement started naming its client.
 */
export interface FirmInvoiceRow extends InvoiceRecord {
  clientId: string;
  clientName: Record<Locale, string>;
}

/** Days back that "issued recently" counts. Stated, never implied. */
export const RECENTLY_ISSUED_DAYS = 30;

export interface BillingLedger {
  items: FirmInvoiceRow[];
  /** Per filter, over the WHOLE ledger — never over what a filter left. */
  counts: Record<InvoiceFilter, number>;
  /**
   * Sums over the ledger, in `currency`.
   *
   * Four figures, each the total of rows the reader can go and count. There is
   * no realization rate and no WIP here: see the header.
   */
  totals: {
    /** Everything issued and not yet settled. */
    outstanding: number;
    /** The part of `outstanding` that is also past its due date. */
    overdue: number;
    /** Everything already paid. */
    settled: number;
    /** Issued within `RECENTLY_ISSUED_DAYS`, paid or not. */
    issuedRecently: number;
  };
  /**
   * The ledger's currency.
   *
   * ONE currency, asserted rather than assumed — `firmLedger` throws if the
   * collection ever holds two. A column of sums across mixed currencies is
   * wrong in a way that looks right, and the export's USD/AED toggle converts
   * at a rate nobody in this product chose.
   */
  currency: string;
  /**
   * Sums over the rows THIS CALL RETURNED, after every filter.
   *
   * `totals` above is deliberately firm-wide — the Billing summary strip
   * reports the practice, and narrowing the table below it must not silently
   * restate the headline. But "what does this client owe" is a different
   * question with a different answer, and the AI Assistant asks it. Computing
   * it here rather than in the screen is the difference between a figure
   * traceable to a counting function and one added up in a component.
   */
  selection: {
    outstanding: number;
    overdue: number;
    /** Statements in the selection, paid or not. */
    count: number;
    /**
     * Statements the `outstanding` figure actually spans.
     *
     * Its own field because the two differ and the difference is the whole
     * point: "43,000 outstanding across 5 statements" reads as one sum over
     * five rows when two of the five are settled. A figure whose label
     * overstates its own scope is the defect this project keeps refusing in
     * the exports, and it is no better for being off by two.
     */
    unpaid: number;
  };
  clients: RegisterFacet[];
}

/** A fee quote, with the decision it is waiting on. */
export interface QuoteRow {
  id: string;
  title: Record<Locale, string>;
  /** The firm's own proposed figure. See `ApprovalRequest.amount`. */
  amount: number;
  currency: string;
  clientId: string;
  clientName: Record<Locale, string>;
  /** Who priced it. Resolved from `submittedById`. */
  submittedBy: Record<Locale, string>;
  submittedByRank: Rank;
  /** Who has to decide. Resolved from `assignedToId`. */
  assignedTo: Record<Locale, string>;
  state: ApprovalState;
  /** When it was, or is, due a decision. */
  dueOn: CalendarDate;
  /** Days past due. 0 or less means it is not overdue. Only for `pending`. */
  daysOverdue: number;
}

export interface QuoteList {
  items: QuoteRow[];
  counts: Record<ApprovalState | 'all', number>;
  /**
   * The total the firm has out and undecided.
   *
   * Pending only. Counting an approved quote here would be counting work the
   * firm has won as work it is still waiting on, and counting a rejected one
   * would be counting nothing at all.
   */
  pendingValue: number;
  currency: string;
}

/* ===========================================================================
 * The approvals queue
 * ===========================================================================
 * WHOSE QUEUE IT IS
 * ---------------------------------------------------------------------------
 * The reader's own. `assignedToId === staffId`, and nothing else — the same
 * scope `staff.approvals` already uses for the dashboard card, so the card and
 * the screen cannot describe different sets.
 *
 * That is deliberately NOT the firm's pipeline. Three people hold approvals in
 * these fixtures and two of them are partners; showing a senior associate what
 * is sitting with a partner would be a supervision view, which is a different
 * screen with a different argument for existing. The export calls its first tab
 * "Pending my review" and then counts 23 across the firm, which is both at once.
 *
 * WHAT AN APPROVAL KNOWS
 * ---------------------------------------------------------------------------
 * What is waiting, who raised it, who holds it, which client and engagement it
 * belongs to, when it was raised, when it is due, and — once decided — when
 * that happened. For a quote it also knows the figure, because
 * fixtures/practice.ts records one.
 *
 * It does NOT know what the document says. There is no document body and no
 * redline anywhere in this product, so the export's clause diff has nothing
 * behind it, and neither does its attachment list.
 *
 * "No version history" used to be part of that sentence and no longer is:
 * Batch 7 added one (fixtures/documents.ts, `DocumentVersion`). It is metadata
 * only — a label, a date and a person — precisely BECAUSE the rest of the
 * sentence still holds. A history that summarised what each version changed
 * would be describing text that does not exist, which is the same fabrication
 * the clause diff is, arriving by a quieter route.
 */

/** A reviewer's queue is filtered by decision state. `all` is the total. */
export type ApprovalQueueFilter = ApprovalState | 'all';

export const APPROVAL_QUEUE_FILTERS: ApprovalQueueFilter[] = [
  'pending',
  'changesRequested',
  'approved',
  'all',
];

/**
 * An approval as its REVIEWER sees it in the queue.
 *
 * Extends the dashboard card's shape rather than replacing it: a card and a
 * queue row are the same record, and the queue simply answers more about it.
 */
export interface QueuedApproval extends ApprovalRecord {
  state: ApprovalState;
  /** Who has to decide. Resolved from `assignedToId`. */
  assignedTo: Record<Locale, string>;
  clientId: string;
  /** When it was sent up for a decision. */
  raisedOn: CalendarDate;
  /** When it was decided. `null` while pending. */
  decidedOn: CalendarDate | null;
  /** The firm's proposed figure. Quotes only; `null` on everything else. */
  amount: number | null;
  currency: string | null;
  /** Resolved from `engagementRef`. Both `null` for a quote that precedes one. */
  engagementKind: EngagementKind | null;
  engagementTitle: Record<Locale, string> | null;
}

/* ===========================================================================
 * Conflicts
 * ===========================================================================
 * WHAT A MATCH IS, AND WHAT IT IS NOT
 * ---------------------------------------------------------------------------
 * A match says one thing: a record in this firm names this party, and here is
 * which record and what kind. It does not say the engagement is barred, and
 * there is deliberately no severity on it.
 *
 * Whether a relationship disqualifies the firm depends on what it learned
 * while acting, what the client consented to, and what the retainer says —
 * none of which is in any database. The Stitch export grades its findings
 * "Direct Conflict" and "Potential Overlap" and has an AI panel conclude, at
 * "Confidence: 98.4%", that one of them breaches a named federal law. That is
 * a legal opinion produced by a substring match.
 *
 * NO CLEARANCE, EITHER. An empty result is reported as "no record names this
 * party", never as "no conflict" — the firm's own register is not the world,
 * and the difference between those two sentences is the entire professional
 * risk.
 * ======================================================================== */

/** Where a match was found. */
export type ConflictMatchKind =
  /** The firm acts for this party. */
  | 'client'
  /** The firm is against them on a contentious matter. */
  | 'adverse'
  /** They are across the table on a transaction. */
  | 'counterparty'
  /** A recorded affiliation with a party the firm knows. */
  | 'related'
  /** The firm was approached and turned the work away. */
  | 'declined';

export interface ConflictMatch {
  id: string;
  kind: ConflictMatchKind;
  /** The name that matched, as the record holds it. */
  name: Record<Locale, string>;
  /** What the record says, per locale. Never a verdict. */
  detail: Record<Locale, string>;
  /** The record to open, when there is one to open. */
  href: string | null;
  /** Engagement reference, where the match came from one. */
  reference: string | null;
  /** When it happened, where the record carries a date. */
  on: CalendarDate | null;
}

export interface ConflictSearch {
  /** Empty until a long enough query is given. */
  matches: ConflictMatch[];
  /** Whether a search actually ran. False for a blank or too-short query. */
  searched: boolean;
  /** How many parties the register can match against. Counted, not claimed. */
  registerSize: number;
}

/* ===========================================================================
 * Taking on a client
 * ======================================================================== */

export type CreateClientError =
  | 'notPermitted'
  | 'nameRequired'
  | 'nameTaken'
  | 'standingRequired';

export type CreateClientResult =
  | { ok: true; id: string }
  | { ok: false; error: CreateClientError };

/* ===========================================================================
 * Opening a matter
 * ======================================================================== */

/** One choice in the new-matter form, already carrying both locales. */
export interface MatterOption {
  value: string;
  label: Record<Locale, string>;
}

/**
 * What the form may offer.
 *
 * Every list is DERIVED from what the firm already has, which is what keeps a
 * new matter's Arabic honest: a practice area or a forum picked from this list
 * arrives with both locales attached, because it came from a record that had
 * both. A free-text field could only ever have stored one.
 */
export interface NewMatterOptions {
  clients: MatterOption[];
  /** Practice areas already in use on the register. */
  practiceAreas: MatterOption[];
  /** Forums already in use. */
  forums: MatterOption[];
  /** Fee earners who may lead a file. */
  leads: MatterOption[];
}

export type CreateMatterError =
  | 'notPermitted'
  | 'titleRequired'
  | 'workTypeRequired'
  | 'clientRequired'
  | 'practiceAreaRequired'
  | 'forumRequired'
  | 'leadRequired';

/** One colleague, as the Team access section lists them. */
export interface TeamAccessMember {
  id: string;
  name: Record<Locale, string>;
  rank: Rank;
  email: string;
  hasAccess: boolean;
  /** The reader's own row: no control removes your own access. */
  isSelf: boolean;
  /** Changed this session — §5.1, it says so. */
  changedThisSession: boolean;
}

/** One line of the access audit, resolved to names. Newest first. */
export interface TeamAccessLogEntry {
  id: string;
  change: AccessChange['change'];
  subject: Record<Locale, string>;
  actor: Record<Locale, string>;
  on: CalendarDate;
  at: ClockTime;
}

export interface TeamAccess {
  members: TeamAccessMember[];
  log: TeamAccessLogEntry[];
}

export type SetTeamAccessResult =
  | { ok: true; change: AccessChange['change'] }
  | { ok: false; error: 'notPermitted' | 'notFound' | 'self' | 'unchanged' };

/** The channels a client report can be queued on. */
export type ReportChannel = 'platform' | 'email' | 'whatsapp';
export const REPORT_CHANNELS: ReportChannel[] = ['platform', 'email', 'whatsapp'];

/**
 * A client report queued to send, this session. NOTHING IS SENT: the furthest
 * a request gets is `queued`, and the screen labels that "Queued: demo".
 */
export interface ReportSendRecord {
  reference: string;
  channels: ReportChannel[];
  state: 'awaitingApproval' | 'queued';
  requestedBy: Record<Locale, string>;
  requestedAt: ClockTime;
  approvedBy: Record<Locale, string> | null;
  approvedAt: ClockTime | null;
}

export type ReportSendResult =
  | { ok: true; state: ReportSendRecord['state'] }
  | { ok: false; error: 'notPermitted' | 'notFound' | 'noChannel' | 'notAwaiting' };

export type ReopenMatterResult =
  | { ok: true; reference: string }
  | { ok: false; error: 'notPermitted' | 'notFound' | 'notClosed' };

export type CreateMatterResult =
  | { ok: true; reference: string }
  | { ok: false; error: CreateMatterError };

/* ===========================================================================
 * Integrations
 * ======================================================================== */

export interface IntegrationSummary {
  items: IntegrationRecord[];
  /** Categories with at least one connected provider. Counted, not written. */
  connected: number;
  total: number;
  /** Every category in the model, in display order. */
  categories: IntegrationCategory[];
}

/* ===========================================================================
 * Team & roster
 * ======================================================================== */

/** One person on the firm's roster, with what the record can actually say. */
export interface RosterMember {
  id: string;
  name: Record<Locale, string>;
  rank: Rank;
  email: string;
  status: StaffAccountStatus;
  joinedOn: CalendarDate;
  /**
   * Open matters and projects they lead or support. DERIVED, not stored —
   * so a roster cannot disagree with the registers about who is carrying what.
   */
  openEngagements: number;
  /**
   * The practice areas those engagements sit in, deduplicated.
   *
   * Derived for the same reason. The Stitch export stores a "Department" per
   * person and then shows people working outside it; this is read from the
   * files they are actually on, so it cannot drift, and somebody with no open
   * work honestly has none rather than an inherited label.
   */
  practiceAreas: Record<Locale, string>[];
  /** The signed-in reader. */
  isYou: boolean;
  /** Added in this session — see the session-store note above. */
  addedThisSession: boolean;
}

export interface Roster {
  items: RosterMember[];
  /** Over the WHOLE roster, never over what a filter left. */
  total: number;
  counts: Record<StaffAccountStatus | 'all', number>;
  /** Derived from the roster, so no option can return nothing. */
  ranks: Rank[];
}

/**
 * What adding a team member can go wrong with.
 *
 * Returned as a KEY, not a sentence: the message is a translation, and an
 * error assembled here would be untranslatable — the same split the scripted
 * AI screens use for their prose.
 */
export type AddTeamMemberError =
  /** The caller's rank may not change the roster. See settings/tabs.ts. */
  | 'notPermitted'
  | 'nameRequired'
  | 'emailRequired'
  | 'emailInvalid'
  | 'emailDomain'
  | 'emailTaken'
  | 'rankInvalid';

export type AddTeamMemberResult =
  | { ok: true; member: RosterMember }
  | { ok: false; error: AddTeamMemberError };

/* ===========================================================================
 * Activity log
 * ===========================================================================
 * WHAT THIS PRODUCT ACTUALLY RECORDS ABOUT WHO DID WHAT
 * ---------------------------------------------------------------------------
 * Almost nothing, and that is the honest answer this endpoint is built around.
 *
 * An audit entry needs three things: an actor, a time, and the record acted
 * on. Across every fixture in this repo, exactly one collection carries all
 * three. `demoApprovals` has `submittedById` with `raisedDaysAgo`, and
 * `assignedToId` with `decidedDaysAgo` — a person, a date and a subject.
 *
 * Nothing else does:
 *   · `demoSharedDocuments` has `sharedDaysAgo` and no actor. Nothing records
 *     WHO shared a file.
 *   · `demoInvoices` has `issuedDaysAgo` and no actor.
 *   · `demoFirmTasks` has `assignedById` and `assignedToId` but no date on
 *     either event — its own header already carries the MOCK note that
 *     production needs "assignment, reassignment, completion and an audit
 *     trail".
 *   · Sign-in is not modelled at all. There is no session, no credential check
 *     and no device, because Track A has no authentication (BUILD_PLAN §6).
 *
 * Attributing the unattributed would be the worst possible fabrication on this
 * particular screen. An audit log exists to answer "who did this"; a row
 * reading "Fatima Al-Zahra shared this document" when no field records that
 * is a false accusation with a name on it, and it is indistinguishable from a
 * true one. So the log covers what is recorded, and the screen says in words
 * what it does not cover.
 *
 * DAY PRECISION, NOT SECONDS. The fixtures store day offsets. The Stitch
 * export stamps every row "10:48:12 GST" — false precision on a Cairo firm's
 * clock, and precision is exactly the property an audit trail is trusted for.
 * ======================================================================== */

/** The actions this workspace records an actor and a date for. */
export type ActivityAction =
  | 'approvalSubmitted'
  | 'approvalApproved'
  | 'approvalChangesRequested';

export interface ActivityEvent {
  id: string;
  /** Derived from the approval's day offset. No clock time exists. */
  on: CalendarDate;
  actorId: string;
  actorName: Record<Locale, string>;
  actorRank: Rank;
  action: ActivityAction;
  /** The request the action was taken on. */
  subject: Record<Locale, string>;
  engagementRef: string | null;
  engagementKind: EngagementKind | null;
  clientId: string;
  clientName: Record<Locale, string>;
}

export interface ActivityLog {
  items: ActivityEvent[];
  /** Over the whole log, never over what a filter left. */
  total: number;
  /** Derived from the events, so no option can return nothing. */
  actors: { value: string; label: Record<Locale, string> }[];
  actions: ActivityAction[];
}

export interface ApprovalQueue {
  items: QueuedApproval[];
  /** Per state, over the reader's WHOLE queue — not over what a filter left. */
  counts: Record<ApprovalQueueFilter, number>;
  /** Kinds present in the queue, derived. Never a written-out list. */
  kinds: RegisterFacet[];
  /**
   * The record the URL names, or null.
   *
   * Resolved here rather than by the screen searching `items`, so that a
   * filter which excludes the selected row still returns it — otherwise
   * clicking a state tab would silently empty the reading pane.
   */
  selected: QueuedApproval | null;
}

/* ===========================================================================
 * Scripted AI demonstrations
 * ===========================================================================
 * WHAT THESE ENDPOINTS RETURN, AND WHAT THEY DO NOT
 * ---------------------------------------------------------------------------
 * VALUES, not sentences. A status, a lead's name, a date, a sum, a count —
 * every one of them read from a record the fixtures already hold, through the
 * same functions the ordinary screens use. The screens turn those values into
 * prose using ICU strings from the dictionaries, which is where product copy
 * belongs; a sentence assembled in this file would be untranslatable and would
 * put copy in the data layer.
 *
 * There is NO model here. BUILD_PLAN §3 puts Track A at "no live LLM calls"
 * and §6 puts real ones in Track A.5. What these screens demonstrate is the
 * SHAPE of the interaction — what a lawyer would ask, what would come back,
 * and what it would cite — over a firm whose records are real enough to answer
 * from.
 *
 * NOTHING HERE CARRIES A CONFIDENCE SCORE. See AIDemoNotice.tsx.
 *
 * MOCK: Track A.5 replaces every one of these with a retrieval step and a real
 * completion. The source list stops being a fixed array and becomes what the
 * retriever actually used — which is the point of returning sources at all
 * now, so the shape the screens render is the shape a real answer will have.
 */

/** One engagement, as an assistant answer needs it. */
export interface AssistantEngagementFacts {
  reference: string;
  kind: EngagementKind;
  title: Record<Locale, string>;
  status: Record<Locale, string>;
  currentPhase: Record<Locale, string>;
  /** Resolved from the team. `null` if no lead is recorded. */
  leadName: Record<Locale, string> | null;
  clientId: string;
  clientName: Record<Locale, string>;
  /** The next uncompleted entry in the record. Derived, as everywhere else. */
  nextDate: { on: CalendarDate; title: Record<Locale, string> } | null;
  /** Shared with the client. NOT a DMS count. */
  documents: number;
  tasks: number;
  approvals: number;
  /** Days since the engagement last moved. */
  daysSinceActivity: number;
  /** Documents the client still has to sign. */
  awaitingSignature: number;
}

/** What one client owes, for the assistant's invoice answer. */
export interface AssistantClientBalance {
  id: string;
  name: Record<Locale, string>;
  outstanding: number;
  overdue: number;
  statements: number;
  currency: string;
}

export interface AssistantDemo {
  /** The matter the status exchange answers about. */
  matter: AssistantEngagementFacts | null;
  /** The project the drafting exchange answers about. */
  project: AssistantEngagementFacts | null;
  /** The client the invoice exchange answers about. */
  balance: AssistantClientBalance | null;
}

/**
 * One document, and what surrounds it.
 *
 * No body. fixtures/documents.ts holds a filename, a size, a status and an
 * engagement — the product has never stored document text, which is why the
 * Approvals export's clause diff was refused and why the canvas shows a
 * placeholder rather than inventing a clause to mark up.
 */
export interface DocumentContext {
  /**
   * Saved versions, NEWEST FIRST — the order a history is read in.
   *
   * The fixture stores them oldest first, because that is the order they
   * happened in; the reversal belongs here rather than in the component, so
   * every screen that shows a history shows it the same way round.
   */
  versions: DocumentVersionRecord[];
  document: SharedDocumentRecord;
  engagementRef: string;
  engagementKind: EngagementKind;
  engagementTitle: Record<Locale, string>;
  clientId: string;
  clientName: Record<Locale, string>;
  /** Documents shared on this engagement, including this one. */
  onEngagement: number;
  /** Documents shared across every engagement this client has. */
  forClient: number;
}

/* ===========================================================================
 * Staff-side global search
 * ======================================================================== */

/**
 * What the firm's own search can return.
 *
 * WIDER THAN THE CLIENT'S, WHICH IS WHY IT IS NOT THE SAME FUNCTION. The client
 * portal searches one client's own affairs. A fee earner searches the FIRM —
 * every client, every file on the register, the firm's drafts as well as what
 * has been shared — plus the legal database, which the client side has no
 * concept of at all. Pointing the portal's overlay at this header would have
 * returned a client's slice of the firm to somebody who works here.
 */
export type StaffSearchKind =
  | 'matter'
  | 'project'
  | 'client'
  | 'document'
  | 'invoice'
  | 'legalEntry';

/**
 * The order groups appear in, and it is an argument about what a fee earner
 * opens a search box for.
 *
 * Files first, because "where is that matter" is the question. Clients next,
 * because the second question is "what do we have for them". The legal database
 * is LAST despite being the biggest collection: it is reference material, and a
 * statute is never what somebody is looking for when they half-remember a
 * client's name.
 */
export const STAFF_SEARCH_KINDS: StaffSearchKind[] = [
  'matter',
  'project',
  'client',
  'document',
  'invoice',
  'legalEntry',
];

export interface StaffSearchHit {
  id: string;
  kind: StaffSearchKind;
  /** "MAT-2201", "SAMPLE-0001". Latin in both locales; rendered dir="ltr". */
  reference: string | null;
  title: Record<Locale, string>;
  /** One supporting line — client, forum, issuing body, amount. */
  meta: Record<Locale, string>;
  href: string;
  /**
   * The status pill, or null where the record has no status worth a pill.
   *
   * Same two forms as the client's, for the same reason: an engagement's status
   * is per-locale data the firm wrote about that file, while a document's or
   * invoice's is one of a fixed set the component translates.
   */
  status:
    | { form: 'text'; label: Record<Locale, string>; tone: BadgeTone }
    | { form: 'key'; key: string; tone: BadgeTone }
    | null;
  /**
   * A closed legal matter, kept in the register's Archive. Marked in the
   * overlay so a closed file is never mistaken for one in hand (the client's
   * October 2026 amendment). Absent on anything that is not a legal matter.
   */
  archived?: boolean;
}

export interface StaffSearchGroup {
  kind: StaffSearchKind;
  hits: StaffSearchHit[];
}

export interface StaffSearchResults {
  /** Echoed so a stale response can be discarded — see StaffSearch.tsx. */
  query: string;
  groups: StaffSearchGroup[];
  total: number;
  /**
   * Groups this rank was not allowed to search, so the overlay can say so.
   *
   * Saying "billing is not in your results" is better than silently returning
   * fewer rows: a junior associate searching an invoice reference and getting
   * nothing would reasonably conclude the invoice does not exist.
   */
  withheld: StaffSearchKind[];
}

/* ===========================================================================
 * Court week — the staff dashboard's week schedule grid
 * ======================================================================== */

/** The timeline kinds the grid draws, each a colour and a label of its own. */
export type CourtEventKind = 'hearing' | 'conference' | 'submission' | 'filing';

export interface CourtWeekEvent {
  id: string;
  date: CalendarDate;
  kind: CourtEventKind;
  title: Record<Locale, string>;
  court: Record<Locale, string>;
  reference: string;
  href: string;
  /** Already happened and acknowledged on the timeline. */
  completed: boolean;
}

export interface CourtWeekRow {
  id: string;
  /** A legal matter's title, or — for a legal secretary — a person's name. */
  label: Record<Locale, string>;
  /** The matter's reference; null on a person's row. */
  reference: string | null;
  events: CourtWeekEvent[];
}

export interface CourtWeek {
  /** Sunday to Saturday, the week holding the tenant's today. */
  days: { date: CalendarDate; weekend: boolean }[];
  today: CalendarDate;
  rows: CourtWeekRow[];
}

/* ===========================================================================
 * Upcoming hearings — the staff dashboard's timeline widget
 * ======================================================================== */

/**
 * One court or tribunal sitting still ahead on a file.
 *
 * Read from the engagement's own timeline (kind `hearing`), the same record the
 * matter page and the calendar render — so the dashboard cannot show a sitting
 * those screens do not. A dashboard widget only: there is no hearings screen,
 * and this does not invent one.
 */
export interface HearingRecord {
  id: string;
  date: CalendarDate;
  /** What is heard, per locale — the timeline event's title. */
  title: Record<Locale, string>;
  /** The court or tribunal: the matter's forum, or a project's jurisdiction. */
  court: Record<Locale, string>;
  /** Where, per locale — the event's own detail line (a room, a registry). */
  place: Record<Locale, string>;
  reference: string;
  engagementTitle: Record<Locale, string>;
  href: string;
}

/** How far ahead the dashboard's hearings timeline looks. */
export const HEARINGS_WINDOW_DAYS = 45;

/* ===========================================================================
 * Staff notifications
 * ======================================================================== */

/**
 * What the bell in the staff header can say.
 *
 * Three sources, each one a collection this workspace already holds, so every
 * row is derived rather than written down — the client panel's rule, for the
 * same reason (its notes on the Stitch export's invented invoice):
 *
 *   APPROVALS   what is waiting on the reader for a decision, and what was
 *               decided on what the reader sent up.
 *   FILINGS     filing and submission deadlines on the reader's own files.
 *   TEAM        colleagues' approval requests and decisions on those files.
 *
 * The client's NotificationKind is not reused: a client is told the firm
 * shared a file; a fee earner is told a partner returned their draft. Same
 * panel shape, different events.
 */
export type StaffNotificationKind =
  | 'approvalWaiting'
  | 'approvalOverdue'
  | 'submissionApproved'
  | 'submissionReturned'
  | 'filingDue'
  | 'teamRequest'
  | 'teamApproved'
  | 'teamReturned';

export interface StaffNotificationRecord {
  id: string;
  kind: StaffNotificationKind;
  /** What it is about — the request's or the deadline's own title. */
  subject: Record<Locale, string>;
  /** The colleague who acted, for the kinds that name one. */
  actor: Record<Locale, string> | null;
  /** The file it belongs to. Latin in both locales; null for firm-level requests. */
  reference: string | null;
  /**
   * The date the row is about: when it was raised or decided, or — for a
   * deadline — when it falls due. A calendar date; see `formatRelativeDays`,
   * which says "3 days ago" and "in 3 days" alike.
   */
  on: CalendarDate;
  /** Days past the deadline. Only on `approvalOverdue`. */
  daysOverdue?: number;
  href: string;
  tone: BadgeTone;
}

/** How far back team activity reaches, and how far ahead deadlines are shown. */
const STAFF_NOTIFICATION_WINDOW_DAYS = 14;

export const staff = {
  /**
   * The signed-in fee earner.
   *
   * Reads the demo viewer cookie, falling back to `SIGNED_IN_STAFF_ID` — see
   * lib/demo-viewer.ts for why a deployed build needs that and what it is
   * careful not to be. Every gate in the product runs against whoever this
   * returns, so a switched rank is genuinely refused the screens it may not
   * open rather than merely not shown the links.
   *
   * THIS is what made mock-api.ts server-only: `next/headers` cannot cross into
   * a client bundle, which is why lib/password-reset.ts exists.
   *
   * MOCK: resolved from a real session at Track A.5, at which point the cookie
   * and its helper are deleted.
   */
  async currentStaff(): Promise<StaffMember> {
    await latency();
    const id = await viewerStaffId();

    try {
      const backendData = await backendBridge.team.list();
      if (backendData?.members && Array.isArray(backendData.members)) {
        const found = backendData.members.find((m: any) => m.id === id);
        if (found) {
          const member: StaffMember = {
            id: found.id,
            name: {
              en: found.name?.en || found.name?.ar || found.email,
              ar: found.name?.ar || found.name?.en || found.email,
            },
            rank: found.rank,
            email: found.email,
            status: found.status,
            joinedDaysAgo: found.joinedDaysAgo || 0,
          };
          if (!sessionStaff.some((s) => s.id === member.id)) {
            sessionStaff.push(member);
          }
          return member;
        }
      }
    } catch {
      // Backend unavailable fallback
    }

    const person =
      demoStaff.find((member) => member.id === id) ??
      demoStaff.find((member) => member.id === SIGNED_IN_STAFF_ID);
    if (!person) throw new MockApiError('No signed-in staff member in the fixtures.');
    return person;
  },


  /**
   * Everything in the firm matching `query`, scoped to what this rank may see.
   *
   * ===========================================================================
   * THE SCOPING IS THE FEATURE, AND IT READS THE SAME ALLOW-LISTS THE SCREENS DO
   * ===========================================================================
   * A search box that reaches past a permission gate is a permission gate that
   * does not exist. The registers already refuse a paralegal the billing screen;
   * a global search that returned invoice rows to the same person would hand
   * them the contents of the screen they were refused, one row at a time.
   *
   * So invoices are gated on `seesBilling(rank)` — the same allow-list the nav
   * and the billing route read — lib/ranks.ts, read rather than restated, so the two cannot drift. Everything
   * else here is open to every fee earner because the screens that show it are:
   * the registers, the CRM and the document vault carry no rank gate, and the
   * legal database is reference material.
   *
   * WITHHELD GROUPS ARE NAMED RATHER THAN DROPPED. Returning fewer rows silently
   * is how somebody concludes a record does not exist; `withheld` lets the
   * overlay say which collection was not searched.
   *
   * ===========================================================================
   * WHY THIS IS NOT THE CLIENT'S search.query()
   * ===========================================================================
   * Different corpus, different scoping, different result kinds. The client's
   * searches one client's own portal and includes message threads; this
   * searches every client on the firm's register, includes the firm's internal
   * drafts and the legal database, and has a rank to answer to. One function
   * serving both would have taken a "who is asking" flag and branched on it in
   * six places, which is two functions wearing a coat.
   *
   * What IS shared is lib/search.ts — the Arabic folding, the AND-across-terms
   * rule and the minimum length. That is the part that must not be
   * reimplemented, and it is not.
   *
   * MOCK: replace with POST /api/staff/search, scoped server-side to the
   * authenticated fee earner's rank rather than to a rank passed in as an
   * argument — nothing here checks that the caller IS this rank, because there
   * is no session to check. The Server Action re-reads it from
   * `currentStaff()` for that reason, and at Track A.5 the scoping moves into
   * the query itself. Real search also needs paging and relevance ranking
   * rather than fixture order. Track A.5.
   */
  async staffSearch(term: string, rank: Rank): Promise<StaffSearchResults> {
    await latency();

    const query = term.trim();
    const withheld: StaffSearchKind[] = [];
    const canSeeBilling = seesBilling(rank);
    if (!canSeeBilling) withheld.push('invoice');

    if (normaliseForSearch(query).length < MIN_QUERY_LENGTH) {
      return { query, groups: [], total: 0, withheld };
    }

    const hit = (candidate: StaffSearchHit, haystacks: (string | null)[]): StaffSearchHit[] =>
      matchesQuery(haystacks, query) ? [candidate] : [];

    const clients = allClients();
    const clientName = (id: string): Record<Locale, string> =>
      clients.find((row) => row.id === id)?.name ?? UNKNOWN_NAME;

    const matterHits = allMatters().flatMap((matter) =>
      hit(
        {
          id: matter.id,
          kind: 'matter',
          reference: matter.reference,
          title: matter.title,
          meta: clientName(matter.clientId),
          href: `/staff/matters/${matter.reference}`,
          status: { form: 'text', label: matter.status, tone: matter.statusTone },
          archived: !matter.active,
        },
        [
          matter.reference,
          matter.title.en,
          matter.title.ar,
          matter.matterType.en,
          matter.matterType.ar,
          matter.forum.en,
          matter.forum.ar,
          matter.status.en,
          matter.status.ar,
          matter.courtFileNumber,
          matter.opposingParty?.en ?? null,
          matter.opposingParty?.ar ?? null,
          clientName(matter.clientId).en,
          clientName(matter.clientId).ar,
          leadNameOf(matter).en,
          leadNameOf(matter).ar,
        ]
      )
    );

    const projectHits = allProjects().flatMap((project) =>
      hit(
        {
          id: project.id,
          // A former project is a legal matter on the one register (October 2026),
          // so it groups with the matters, not under a register that is gone.
          kind: 'matter',
          reference: project.reference,
          title: project.title,
          meta: clientName(project.clientId),
          href: `/staff/matters/${project.reference}`,
          status: { form: 'text', label: project.status, tone: project.statusTone },
          archived: !project.active,
        },
        [
          project.reference,
          project.title.en,
          project.title.ar,
          project.category.en,
          project.category.ar,
          project.jurisdiction.en,
          project.jurisdiction.ar,
          project.status.en,
          project.status.ar,
          clientName(project.clientId).en,
          clientName(project.clientId).ar,
          leadNameOf(project).en,
          leadNameOf(project).ar,
        ]
      )
    );

    const clientHits = clients.flatMap((client) =>
      hit(
        {
          id: client.id,
          kind: 'client',
          reference: null,
          title: client.name,
          meta: client.summary,
          href: `/staff/clients/${client.id}`,
          status: { form: 'key', key: `standing.${client.standing}`, tone: 'neutral' },
        },
        [client.name.en, client.name.ar, client.summary.en, client.summary.ar]
      )
    );

    /*
      BOTH document collections, and that is the point of searching from the
      firm's side. The vault holds what has been shared with a client; the firm's
      own drafts have never left the building. A fee earner looking for a file
      does not know or care which of the two it is in.
    */
    const sharedHits = resolveDocuments().flatMap((document) =>
      hit(
        {
          id: document.id,
          kind: 'document',
          reference: document.engagementRef,
          // A filename is not translated — see fixtures/documents.ts.
          title: { en: document.name, ar: document.name },
          meta: document.engagementTitle,
          href: `/staff/matters/${document.engagementRef}`,
          status: { form: 'key', key: `documentStatus.${document.status}`, tone: DOCUMENT_STATUS_TONE[document.status] },
        },
        [document.name, document.engagementRef, document.engagementTitle.en, document.engagementTitle.ar]
      )
    );

    const draftHits = resolveFirmDocuments(allFirmDocuments()).flatMap((document) =>
      hit(
        {
          id: document.id,
          kind: 'document',
          reference: document.engagementRef,
          // A firm draft carries `title`; a shared document carries `name`.
          // Both are filenames and neither is translated — fixtures/documents.ts.
          title: { en: document.title, ar: document.title },
          meta: document.engagementTitle,
          href: `/staff/matters/${document.engagementRef}`,
          status: { form: 'key', key: `documentType.${document.type}`, tone: 'neutral' },
        },
        [document.title, document.engagementRef, document.engagementTitle.en, document.engagementTitle.ar]
      )
    );

    /*
      An invoice names an engagement, not a client, so the client comes from
      the engagement index — the same join the ledger screen makes. Reading it
      here rather than adding a clientId to the record keeps one answer to
      "whose invoice is this".
    */
    const engagements = engagementIndex();
    const invoiceClient = (ref: string): Record<Locale, string> =>
      clientName(engagements.get(ref)?.clientId ?? "");

    const invoiceHits = canSeeBilling
      ? resolveInvoices().flatMap((invoice) =>
          hit(
            {
              id: invoice.id,
              kind: 'invoice',
              reference: invoice.reference,
              title: invoice.description,
              meta: invoiceClient(invoice.engagementRef),
              href: `/staff/billing?client=${engagements.get(invoice.engagementRef)?.clientId ?? ''}`,
              status: { form: 'key', key: `invoiceStatus.${invoice.status}`, tone: INVOICE_STATUS_TONE[invoice.status] },
            },
            [
              invoice.reference,
              invoice.description.en,
              invoice.description.ar,
              invoice.engagementRef,
              invoiceClient(invoice.engagementRef).en,
              invoiceClient(invoice.engagementRef).ar,
            ]
          )
        )
      : [];

    /*
      The legal database, searched on its METADATA only.

      Its bodies are Lorem Ipsum — fixtures/legal-database.ts argues that at
      length — so matching against them would return every entry for any Latin
      query and none for an Arabic one. Reference, title, kind and issuing body
      are the real fields, and they are what the database's own search screen
      matches too.
    */
    const legalHits = demoLegalDatabase.flatMap((entry) =>
      hit(
        {
          id: entry.reference,
          kind: 'legalEntry',
          reference: entry.reference,
          title: entry.title,
          meta: entry.jurisdiction,
          href: `/staff/legal-database/${entry.reference}`,
          status: { form: 'key', key: `legalKind.${entry.kind}`, tone: 'neutral' },
        },
        [
          entry.reference,
          entry.title.en,
          entry.title.ar,
          entry.jurisdiction.en,
          entry.jurisdiction.ar,
        ]
      )
    );

    const byKind: Record<StaffSearchKind, StaffSearchHit[]> = {
      // One register: former projects are listed with the matters.
      matter: [...matterHits, ...projectHits],
      project: [],
      client: clientHits,
      document: [...sharedHits, ...draftHits],
      invoice: invoiceHits,
      legalEntry: legalHits,
    };

    const groups = STAFF_SEARCH_KINDS.map((kind) => ({ kind, hits: byKind[kind] })).filter(
      (group) => group.hits.length > 0
    );

    return {
      query,
      groups,
      total: groups.reduce((sum, group) => sum + group.hits.length, 0),
      withheld,
    };
  },

  /**
   * This week on the reader's files: every hearing, conference, filing
   * deadline and registry filing on the timeline, Sunday to Saturday.
   *
   * Rows are legal matters (and projects) for a fee earner. For a legal
   * secretary they are the PEOPLE they support, because that is how a
   * secretary's week is organised — whose diary has a sitting on Tuesday —
   * and an event on a file two of them share appears on both rows.
   *
   * The weekend comes from WEEKEND_DAYS (Friday and Saturday), the same
   * source the booking picker and the calendar read. Events are calendar
   * dates: the timeline carries no hour, and this does not invent one.
   */
  async courtWeek(staffId: string): Promise<CourtWeek> {
    await latency();

    const today = tenantToday();
    const start = addDays(today, -weekdayOf(today));
    const days = Array.from({ length: 7 }, (_, index) => {
      const date = addDays(start, index);
      return { date, weekend: WEEKEND_DAYS.includes(weekdayOf(date)) };
    });
    const end = days[6].date;

    const files = [...allMatters(), ...allProjects()].filter((file) => file.active);
    const eventsOf = (file: (typeof files)[number]): CourtWeekEvent[] => {
      const isMatter = 'opposingParty' in file;
      return file.timeline
        .map((event) => ({ event, date: addDays(today, event.inDays) }))
        .filter(({ date }) => date >= start && date <= end)
        .map(({ event, date }) => ({
          id: `${file.reference}-${event.id}`,
          date,
          kind: event.kind,
          title: event.title,
          court: isMatter ? file.forum : file.jurisdiction,
          reference: file.reference,
          href: `/staff/matters/${file.reference}`,
          completed: Boolean(event.completed),
        }));
    };

    const people = staffIndex();
    const reader = people.get(staffId);

    let rows: CourtWeekRow[];
    if (reader?.rank === 'legalSecretary') {
      rows = demoSecretaryAssignments
        .filter((row) => row.secretaryId === staffId)
        .map((row) => {
          const person = people.get(row.staffId);
          const refs = new Set(engagementsFor(row.staffId).map((assignment) => assignment.reference));
          return {
            id: row.staffId,
            label: person?.name ?? UNKNOWN_NAME,
            reference: null,
            events: files.filter((file) => refs.has(file.reference)).flatMap(eventsOf),
          };
        });
    } else {
      const refs = new Set(engagementsFor(staffId).map((row) => row.reference));
      rows = files
        .filter((file) => refs.has(file.reference))
        .map((file) => ({
          id: file.reference,
          label: file.title,
          reference: file.reference,
          events: eventsOf(file),
        }));
    }

    return { days, today, rows: rows.filter((row) => row.events.length > 0) };
  },

  /**
   * Hearings still ahead on the reader's files, soonest first, within
   * `HEARINGS_WINDOW_DAYS`.
   *
   * "The reader's files" is `engagementsFor` — led or supported. A legal
   * secretary leads and supports nothing, so for that rank it is the files of
   * the people they support (`demoSecretaryAssignments`): the sittings their
   * diary has to work around.
   */
  async hearings(staffId: string): Promise<HearingRecord[]> {
    await latency();

    const today = tenantToday();
    const reader = staffIndex().get(staffId);
    const people =
      reader?.rank === 'legalSecretary'
        ? demoSecretaryAssignments
            .filter((row) => row.secretaryId === staffId)
            .map((row) => row.staffId)
        : [staffId];
    const mine = new Set(
      people.flatMap((id) => engagementsFor(id).map((row) => row.reference))
    );

    const hearings: HearingRecord[] = [];
    for (const file of [...allMatters(), ...allProjects()]) {
      if (!file.active || !mine.has(file.reference)) continue;
      const isMatter = 'opposingParty' in file;
      for (const event of file.timeline) {
        if (event.kind !== 'hearing' || event.completed) continue;
        if (event.inDays < 0 || event.inDays > HEARINGS_WINDOW_DAYS) continue;
        hearings.push({
          id: `${file.reference}-${event.id}`,
          date: addDays(today, event.inDays),
          title: event.title,
          court: isMatter ? file.forum : file.jurisdiction,
          place: event.detail,
          reference: file.reference,
          engagementTitle: file.title,
          href: `/staff/matters/${file.reference}`,
        });
      }
    }

    return hearings.sort((a, b) => a.date.localeCompare(b.date));
  },

  /**
   * The staff bell's feed for one fee earner, most urgent first.
   *
   * ===========================================================================
   * DERIVED, AND SCOPED TO THE READER
   * ===========================================================================
   * Every row comes from the approvals collection or from an engagement's
   * timeline — the same records the approvals screen, the dashboards and the
   * matter pages read — so the bell cannot announce something the screen it
   * links to does not show. Team activity is limited to files the reader is ON
   * (`engagementsFor`), because a firm-wide feed would tell a paralegal about a
   * partner's quote on a client they have never met.
   *
   * Nothing is reported twice. A request waiting on the reader is an approval
   * row, not also a team row; the reader's own request decided is a submission
   * row, not also a team row.
   *
   * WHERE A ROW LEADS. A decision waiting on the reader goes to the approvals
   * queue, which only ranks that decide can open — and only they are ever
   * assigned one. Everything else goes to the file, which every rank on it can
   * open, or to the dashboard for a request with no file.
   *
   * MOCK: Track A.5 replaces this with a per-user notifications table written
   * when the events happen, carrying a read flag. Until then read state is
   * session-only, as on the client side.
   */
  async notifications(staffId: string): Promise<StaffNotificationRecord[]> {
    await latency();

    const today = tenantToday();
    const people = staffIndex();
    const reach = STAFF_NOTIFICATION_WINDOW_DAYS;

    const files = [...allMatters(), ...allProjects()];
    // One register since October 2026: matters and former projects alike.
    const known = new Set(files.map((row) => row.reference));
    const fileHref = (ref: string | null) =>
      ref && known.has(ref) ? `/staff/matters/${ref}` : '/staff';

    const mine = new Set(engagementsFor(staffId).map((row) => row.reference));
    const items: StaffNotificationRecord[] = [];

    for (const approval of demoApprovals) {
      const ref = approval.engagementRef;
      const decided = approval.state !== 'pending' && approval.decidedDaysAgo !== null;
      const reviewer = people.get(approval.assignedToId)?.name ?? UNKNOWN_NAME;
      const submitter = people.get(approval.submittedById)?.name ?? UNKNOWN_NAME;

      // Waiting on the reader. Not windowed: an undecided request does not
      // stop needing a decision because it is old.
      if (approval.assignedToId === staffId && approval.state === 'pending') {
        const overdue = daysBetween(addDays(today, approval.dueInDays), today);
        items.push({
          id: `${approval.id}-waiting`,
          kind: overdue > 0 ? 'approvalOverdue' : 'approvalWaiting',
          subject: approval.title,
          actor: submitter,
          reference: ref,
          on: addDays(today, -approval.raisedDaysAgo),
          daysOverdue: overdue > 0 ? overdue : undefined,
          href: '/staff/approvals',
          tone: overdue > 0 ? 'error' : approval.dueInDays === 0 ? 'warning' : 'neutral',
        });
        continue;
      }

      // The reader's own request, answered.
      if (approval.submittedById === staffId) {
        if (decided && approval.decidedDaysAgo! <= reach) {
          const approved = approval.state === 'approved';
          items.push({
            id: `${approval.id}-answered`,
            kind: approved ? 'submissionApproved' : 'submissionReturned',
            subject: approval.title,
            actor: reviewer,
            reference: ref,
            on: addDays(today, -approval.decidedDaysAgo!),
            href: fileHref(ref),
            tone: approved ? 'success' : 'warning',
          });
        }
        continue;
      }

      // Colleagues, on the reader's files only.
      if (!ref || !mine.has(ref)) continue;

      if (approval.raisedDaysAgo <= reach) {
        items.push({
          id: `${approval.id}-raised`,
          kind: 'teamRequest',
          subject: approval.title,
          actor: submitter,
          reference: ref,
          on: addDays(today, -approval.raisedDaysAgo),
          href: fileHref(ref),
          tone: 'neutral',
        });
      }
      if (decided && approval.decidedDaysAgo! <= reach) {
        const approved = approval.state === 'approved';
        items.push({
          id: `${approval.id}-decided`,
          kind: approved ? 'teamApproved' : 'teamReturned',
          subject: approval.title,
          actor: reviewer,
          reference: ref,
          on: addDays(today, -approval.decidedDaysAgo!),
          href: fileHref(ref),
          tone: 'neutral',
        });
      }
    }

    /*
      Filing deadlines: registry filings and submissions still ahead on the
      reader's active files. Hearings are not here — they are on the agenda and
      the calendar, and a bell that rang for every sitting would ring all week.
    */
    for (const file of files) {
      if (!file.active || !mine.has(file.reference)) continue;
      for (const event of file.timeline) {
        if (event.kind !== 'filing' && event.kind !== 'submission') continue;
        if (event.completed || event.inDays < 0 || event.inDays > reach) continue;
        items.push({
          id: `${file.reference}-${event.id}`,
          kind: 'filingDue',
          subject: event.title,
          actor: null,
          reference: file.reference,
          on: addDays(today, event.inDays),
          href: fileHref(file.reference),
          tone: event.inDays <= 2 ? 'warning' : 'neutral',
        });
      }
    }

    // Most urgent first, then nearest to today in either direction.
    const weight: Partial<Record<BadgeTone, number>> = { error: 0, warning: 1 };
    return items.sort(
      (a, b) =>
        (weight[a.tone] ?? 2) - (weight[b.tone] ?? 2) ||
        Math.abs(daysBetween(today, a.on)) - Math.abs(daysBetween(today, b.on))
    );
  },

  /**
   * What is waiting on THIS person for a decision, soonest first.
   *
   * Scoped by `assignedToId` and filtered to `pending`. Before the ladder was
   * modelled this returned the whole collection, which was correct only because
   * there was one dashboard and every row happened to be the partner's.
   *
   * `daysOverdue` is COMPUTED from the due date rather than written beside it.
   * The export states "Overdue (2d)" as a literal next to a date that does not
   * support it — the same defect as its "13 days past due" invoice.
   */
  async approvals(staffId: string): Promise<ApprovalRecord[]> {
    await latency();

    const today = tenantToday();
    const people = staffIndex();
    const clients = new Map(allClients().map((client) => [client.id, client]));

    return demoApprovals
      .filter((approval) => approval.assignedToId === staffId && approval.state === 'pending')
      .map((approval) => {
        const person = people.get(approval.submittedById);
        const client = clients.get(approval.clientId);
        const dueOn = addDays(today, approval.dueInDays);

        return {
          id: approval.id,
          kind: approval.kind,
          title: approval.title,
          submittedBy: person?.name ?? UNKNOWN_NAME,
          submittedByRank: person?.rank ?? 'paralegal',
          clientName: client?.name ?? UNKNOWN_NAME,
          engagementRef: approval.engagementRef,
          dueOn,
          daysOverdue: daysBetween(dueOn, today),
          dueToday: approval.dueInDays === 0,
        };
      })
      .sort((a, b) => (a.dueOn < b.dueOn ? -1 : a.dueOn > b.dueOn ? 1 : 0));
  },

  /**
   * What this person has sent up, and where it got to.
   *
   * The OTHER SIDE of the rows above — same collection, opposite filter. That
   * is what makes a senior associate's outbox and a partner's inbox describe
   * the same object rather than two lists free to drift apart.
   *
   * Everything is returned, including decided rows: "changes requested" and
   * "approved" are the answers the submitter was waiting for, and dropping them
   * would leave a draft simply vanishing off the screen.
   */
  async submissions(staffId: string): Promise<SubmissionRecord[]> {
    await latency();

    const today = tenantToday();
    const people = staffIndex();
    const clients = new Map(allClients().map((client) => [client.id, client]));
    const order: Record<ApprovalState, number> = {
      changesRequested: 0,
      pending: 1,
      approved: 2,
    };

    return demoApprovals
      .filter((approval) => approval.submittedById === staffId)
      .map((approval) => {
        const holder = people.get(approval.assignedToId);
        const client = clients.get(approval.clientId);

        return {
          id: approval.id,
          kind: approval.kind,
          title: approval.title,
          assignedTo: holder?.name ?? UNKNOWN_NAME,
          assignedToRank: holder?.rank ?? 'partner',
          clientName: client?.name ?? UNKNOWN_NAME,
          engagementRef: approval.engagementRef,
          state: approval.state,
          dueOn: addDays(today, approval.dueInDays),
        };
      })
      .sort((a, b) =>
        order[a.state] === order[b.state]
          ? a.dueOn.localeCompare(b.dueOn)
          : order[a.state] - order[b.state]
      );
  },

  /**
   * This person's inbox: correspondence addressed to the practice, plus
   * correspondence addressed to them by name.
   *
   * One pass produces the rows and the unread count, so the card's badge and
   * its list cannot disagree — the export's says "4 unread" in the header and
   * "14 unread" in the footer link of the same card, in both languages.
   *
   * See `routedInboxItems` for why the portal rows are derived rather than
   * stored, and for what "unread" can honestly mean on each source.
   */
  async inbox(staffId: string): Promise<{ items: InboxItemRecord[]; unreadCount: number }> {
    await latency();

    const items = routedInboxItems()
      .filter((row) => row.toId === null || row.toId === staffId)
      .map((row) => ({ ...row.item, personal: row.toId === staffId }))
      .sort(byNewestFirst);

    return { items, unreadCount: items.filter((item) => item.unread).length };
  },

  /**
   * A legal secretary's triage view: the practice's correspondence plus that of
   * every fee earner they support, each row labelled with whose it is.
   *
   * The label is the whole point. A secretary acting on someone else's mail has
   * to know whose it is before they can act, and an unlabelled merged stream is
   * how a reply goes out under the wrong name.
   */
  async correspondence(
    secretaryId: string
  ): Promise<{ items: InboxItemRecord[]; unreadCount: number }> {
    await latency();

    const people = staffIndex();
    const supported = new Set(
      demoSecretaryAssignments
        .filter((row) => row.secretaryId === secretaryId)
        .map((row) => row.staffId)
    );

    const items = routedInboxItems()
      .filter((row) => row.toId === null || supported.has(row.toId))
      .map((row) => ({
        ...row.item,
        forStaff: row.toId ? (people.get(row.toId)?.name ?? UNKNOWN_NAME) : null,
      }))
      .sort(byNewestFirst);

    return { items, unreadCount: items.filter((item) => item.unread).length };
  },

  /**
   * The conversation behind a portal row, scoped to this person.
   *
   * Returns null for a thread that is not in their inbox, rather than throwing:
   * an item id arrives from a link someone may have kept, and the right answer
   * to a stale one is an empty reading pane, not an error page.
   *
   * ONLY PORTAL ROWS HAVE ONE. An `email` or `court` row has no body in this
   * product, because the mailbox and the filing system are not connected — so
   * there is nothing here to return for them and the screen says so in words
   * instead of rendering a plausible-looking message nobody sent.
   *
   * MOCK: the same read the client's own Messages screen performs, from the
   * other side. Production scopes it by firm membership on the engagement
   * rather than by who the thread is addressed to. Track A.5.
   */
  async inboxThread(staffId: string, threadId: string): Promise<MessageThreadRecord | null> {
    await latency();

    const person = staffIndex().get(staffId);
    if (!person) throw new MockApiError(`No staff member ${staffId}.`);

    const supported = new Set(
      demoSecretaryAssignments
        .filter((row) => row.secretaryId === staffId)
        .map((row) => row.staffId)
    );

    const routed = routedInboxItems().find((row) => row.item.threadId === threadId);
    if (!routed) return null;

    const inScope =
      person.rank === 'legalSecretary'
        ? routed.toId === null || supported.has(routed.toId)
        : routed.toId === null || routed.toId === staffId;
    if (!inScope) return null;

    return resolveMessageThreads().find((thread) => thread.id === threadId) ?? null;
  },

  /**
   * The Unified Inbox screen: the same rows the dashboard card previews, with
   * the counts behind every source filter.
   *
   * ===========================================================================
   * THE SCREEN AND THE CARD READ THE SAME FUNCTION
   * ===========================================================================
   * A dashboard card that previewed a different set from the screen its "view
   * all" points at is the defect this file has now been built to avoid eight or
   * nine times. So the scope is identical — practice correspondence plus your
   * own, or for a legal secretary the people they support — and this adds only
   * the filter and the per-source counts.
   *
   * COUNTS TRAVEL WITH THE ROWS, for the same reason they do in
   * `documents.listShared`: a filter chip reading "Email (4)" that was computed
   * anywhere other than the pass which produced the rows eventually disagrees
   * with them.
   *
   * MOCK: replace with GET /api/inbox?source=&page=. The source filter and the
   * scoping both belong in the query — scoping applied after loading the firm's
   * correspondence is not scoping. Track A.5 for the portal half; the mailbox
   * and filing integrations are Track B (BUILD_PLAN.md §6).
   */
  async inboxList(
    staffId: string,
    { source = 'all' }: { source?: InboxSource | 'all' } = {}
  ): Promise<{
    items: InboxItemRecord[];
    counts: Record<InboxSource | 'all', number>;
    awaitingReplyCount: number;
    unreadCount: number;
  }> {
    await latency();

    const person = staffIndex().get(staffId);
    if (!person) throw new MockApiError(`No staff member ${staffId}.`);

    const people = staffIndex();
    const supported = new Set(
      demoSecretaryAssignments
        .filter((row) => row.secretaryId === staffId)
        .map((row) => row.staffId)
    );

    // A legal secretary's inbox is the people they support; everyone else's is
    // their own. Same rule the dashboard cards already use.
    const visible = routedInboxItems().filter((row) =>
      person.rank === 'legalSecretary'
        ? row.toId === null || supported.has(row.toId)
        : row.toId === null || row.toId === staffId
    );

    const scoped = visible
      .map((row) => ({
        ...row.item,
        personal: person.rank === 'legalSecretary' ? false : row.toId === staffId,
        forStaff:
          person.rank === 'legalSecretary' && row.toId
            ? (people.get(row.toId)?.name ?? UNKNOWN_NAME)
            : null,
      }))
      .sort(byNewestFirst);

    // Counted over everything in scope, not over what the filter left — a chip
    // that reported the filtered count would read "(0)" for every source you
    // are not currently looking at.
    const counts = {
      all: scoped.length,
      portal: scoped.filter((item) => item.source === 'portal').length,
      email: scoped.filter((item) => item.source === 'email').length,
      court: scoped.filter((item) => item.source === 'court').length,
    };

    return {
      items: source === 'all' ? scoped : scoped.filter((item) => item.source === source),
      counts,
      awaitingReplyCount: scoped.filter((item) => item.awaitingReply).length,
      unreadCount: scoped.filter((item) => item.unread).length,
    };
  },

  /**
   * Everything on this person's calendar between two dates, inclusive.
   *
   * ===========================================================================
   * THE SAME TWO SOURCES THE AGENDA CARD MERGES, OVER A RANGE
   * ===========================================================================
   * `agenda()` answers "what is on today" and this answers "what is on between
   * these dates"; both read the person's meetings and the timelines of the
   * engagements they work on. The court dates are NOT copied into a calendar
   * fixture — fixtures/engagements.ts is the single source of truth for a date,
   * so a hearing cannot appear here with one date and on the matter with
   * another. That constraint is why this function exists rather than a
   * `demoCalendarEvents` collection.
   *
   * Scoped two different ways on purpose, exactly as the agenda is: a meeting
   * knows who is in the room, and a court date belongs to whoever is on the
   * file.
   *
   * MOCK: replace with GET /api/calendar?from=&to=. The range belongs in the
   * query; loading every engagement and filtering timelines in memory is right
   * over ten records and wrong over ten thousand. A real calendar is also the
   * fee earner's own, synced from their mail account — that integration is
   * Track B (BUILD_PLAN.md §6), and nothing on this screen claims it exists.
   */
  async calendar(
    staffId: string,
    from: CalendarDate,
    to: CalendarDate
  ): Promise<CalendarEntry[]> {
    await latency();

    const today = tenantToday();
    const mine = new Set(engagementsFor(staffId).map((row) => row.reference));
    const inRange = (date: CalendarDate) => date >= from && date <= to;

    const meetings: CalendarEntry[] = demoFirmEvents
      .filter((event) => event.attendeeIds.includes(staffId))
      .map((event) => {
        const on = meetingDate(event.inDays, today);

        return {
          id: event.id,
          source: 'meeting' as const,
          kind: event.kind,
          on,
          at: event.at,
          minutes: event.minutes,
          title: event.title,
          detail: event.location,
          engagementRef: null,
          engagementKind: null,
          // The RESOLVED date, not the raw offset. Those disagreed until
          // `meetingDate` learned which way to push a past meeting, and on a
          // closed day this said "past" over a date in the future.
          past: on < today,
          // Already scoped to this person's meetings by the filter above, so
          // this only has to ask whether minutes exist and the meeting is over.
          hasTranscript: on < today && transcriptFor(event.id) !== undefined,
        };
      })
      .filter((entry) => inRange(entry.on));

    const fromTimelines: CalendarEntry[] = [...allMatters(), ...allProjects()]
      .filter((engagement) => mine.has(engagement.reference))
      .flatMap((engagement) =>
        engagement.timeline
          .map((event) => ({
            id: `${engagement.reference}-${event.id}`,
            source: 'engagement' as const,
            kind: event.kind,
            on: addDays(today, event.inDays),
            // A timeline carries a day, never an hour. See CalendarEntry.
            at: null,
            minutes: null,
            title: event.title,
            detail: event.detail,
            engagementRef: engagement.reference,
            engagementKind: ('opposingParty' in engagement ? 'matter' : 'project') as
              | 'matter'
              | 'project',
            past: event.completed,
            // A court date is not a meeting this firm was in the room for, and
            // nothing transcribes one.
            hasTranscript: false,
          }))
          .filter((entry) => inRange(entry.on))
      );

    return [...meetings, ...fromTimelines].sort((a, b) => {
      if (a.on !== b.on) return a.on < b.on ? -1 : 1;
      // All-day first within a day — it frames the day rather than sitting in
      // the middle of it.
      if ((a.at === null) !== (b.at === null)) return a.at === null ? -1 : 1;
      if (a.at && b.at && a.at !== b.at) return a.at < b.at ? -1 : 1;
      return a.id.localeCompare(b.id);
    });
  },

  /**
   * Minutes of one meeting, or null.
   *
   * ===========================================================================
   * NULL MEANS BOTH "THERE IS NO SUCH THING" AND "NOT YOURS", ON PURPOSE
   * ===========================================================================
   * Four different conditions return null: the event does not exist, it has no
   * minutes, it has not happened yet, and the reader was not in the room. The
   * caller cannot tell them apart, and that is the point — the screen answers
   * 404 for all four.
   *
   * A "you do not have access to this meeting" page would be friendlier and
   * would also confirm, to somebody typing event ids into the address bar, that
   * a meeting they were kept out of took place. Minutes of an internal meeting
   * are among the most sensitive things this product holds: an existence
   * disclosure on one is a leak even when the body is withheld. So the gate is
   * indistinguishable from a wrong URL.
   *
   * THE GATE IS THE ATTENDEE LIST, NOT A RANK. Every other gate in this file
   * asks what somebody's rank is, because those control what a role may do. This
   * one asks who was in the room, because that is what makes minutes yours —
   * a partner who was not at a meeting has no more claim on its minutes than a
   * paralegal who was. `demoFirmEvents` already scopes a meeting this way for
   * the calendar and the agenda card.
   *
   * MOCK: replace with GET /api/meetings/:id/transcript, and the gate must be
   * re-run server-side there — an attendee check that only runs in the page is
   * a suggestion. Nothing here was recorded or transcribed; see
   * fixtures/transcripts.ts on what the content is and what it may contain.
   */
  async meetingTranscript(eventId: string): Promise<MeetingTranscriptRecord | null> {
    await latency();

    const event = demoFirmEvents.find((row) => row.id === eventId);
    if (!event) return null;

    const transcript = transcriptFor(eventId);
    if (!transcript || transcript.turns.length === 0) return null;

    const today = tenantToday();
    const on = meetingDate(event.inDays, today);
    // A transcript of a meeting that has not finished is incoherent, and the
    // offsets are relative, so this has to be asked at read time rather than
    // assumed of the fixture.
    if (on >= today) return null;

    if (!event.attendeeIds.includes(SIGNED_IN_STAFF_ID)) return null;

    const people = staffIndex();
    const spoke = new Set(transcript.turns.map((turn) => turn.speakerId));

    return {
      eventId: event.id,
      kind: event.kind,
      title: event.title,
      location: event.location,
      on,
      at: event.at,
      minutes: event.minutes,
      attendees: event.attendeeIds.map((id) => {
        const person = people.get(id);
        return {
          id,
          name: person?.name ?? UNKNOWN_NAME,
          rank: person?.rank ?? 'paralegal',
          spoke: spoke.has(id),
          isYou: id === SIGNED_IN_STAFF_ID,
        };
      }),
      turns: transcript.turns.map((turn, index) => {
        const person = people.get(turn.speakerId);
        return {
          atSeconds: turn.atSeconds,
          elapsed: formatElapsed(turn.atSeconds),
          speakerId: turn.speakerId,
          speakerName: person?.name ?? UNKNOWN_NAME,
          speakerRank: person?.rank ?? 'paralegal',
          continues: index > 0 && transcript.turns[index - 1].speakerId === turn.speakerId,
          text: turn.text,
        };
      }),
      speakerCount: spoke.size,
      lastTurnAtSeconds: transcript.turns[transcript.turns.length - 1].atSeconds,
    };
  },

  /**
   * This person's day: the meetings they are in, MERGED with real court dates
   * from the engagements they work on.
   *
   * The hearings are not duplicated into fixtures/practice.ts — they are read
   * from the engagements' own timelines, which fixtures/engagements.ts
   * establishes as the single source of truth for a date. A calendar entry
   * copied from a matter is a second copy free to disagree with it.
   *
   * Scoped two different ways on purpose: a meeting knows who is in the room,
   * and a court date belongs to whoever is on the file.
   */
  async agenda(staffId: string): Promise<AgendaEntry[]> {
    await latency();

    const mine = new Set(engagementsFor(staffId).map((row) => row.reference));

    const today = tenantToday();

    const meetings: AgendaEntry[] = demoFirmEvents
      .filter(
        (event) =>
          event.attendeeIds.includes(staffId) &&
          // The RESOLVED date, not the raw offset: a meeting whose offset
          // lands on the closed weekend is pushed, and the agenda has to
          // agree with the calendar about where it went.
          meetingDate(event.inDays, today) === today
      )
      .map((event) => ({
        id: event.id,
        kind: event.kind,
        at: event.at,
        title: event.title,
        detail: event.location,
        engagementRef: null,
      }));

    const hearings: AgendaEntry[] = [...allMatters(), ...allProjects()]
      .filter((engagement) => engagement.active && mine.has(engagement.reference))
      .flatMap((engagement) =>
        engagement.timeline
          .filter((event) => !event.completed && event.inDays === 0)
          .map((event) => ({
            id: event.id,
            kind: 'hearing' as const,
            // A court date is a calendar date, not a wall-clock time — the
            // timeline does not carry an hour and this does not invent one.
            at: null,
            title: event.title,
            detail: event.detail,
            engagementRef: engagement.reference,
          }))
      );

    return [...meetings, ...hearings].sort((a, b) => (a.at ?? '').localeCompare(b.at ?? ''));
  },

  /**
   * The firm's clients, most recently active first, with what each one's
   * record actually contains.
   *
   * Replaces a version that returned the bare fixture rows. The Partner
   * Dashboard's card reads `name`, `summary` and `standing` and is unaffected;
   * the CRM needs the counts, and computing them in one place is what stops the
   * list and the detail screen disagreeing about how many matters a client has.
   */
  async clients(): Promise<{ items: ClientSummary[]; total: number }> {
    const backendData = await backendBridge.clients.list();
    if (backendData && backendData.items) {
      return backendData as { items: ClientSummary[]; total: number };
    }

    await latency();

    const today = tenantToday();

    const items = allClients()
      .map((client) => {
        return {
          ...client,
          lastActivityOn: addDays(today, -client.lastActivityDaysAgo),
          // Counted off the engagements themselves. This used to ask whether
          // the client had a portal login and answer 0 if not, because that
          // was the only way an engagement named its client - which is why
          // four of five clients read as having no work at all.
          matters: allMatters().filter((matter) => matter.clientId === client.id).length,
          projects: allProjects().filter((project) => project.clientId === client.id).length,
          openCorrespondence: demoInbox.filter(
            (item) => item.clientId === client.id && item.unread
          ).length,
          pendingApprovals: demoApprovals.filter(
            (approval) => approval.clientId === client.id && approval.state === 'pending'
          ).length,
          // Whether they can sign in, and nothing else. It stopped doubling
          // as "has any work with the firm" when engagements got a clientId.
          hasPortal: demoAccountsByClient.has(client.id),
        };
      })
      .sort((a, b) => a.lastActivityDaysAgo - b.lastActivityDaysAgo);

    return { items, total: items.length };
  },

  /**
   * One client's record: who they are, what the firm is doing for them, what
   * has come in, and what is waiting on a decision.
   *
   * Returns null for an id that names nothing, so the route can answer with the
   * translated 404 rather than an error page — the same rule the engagement
   * detail screens already follow.
   *
   * MOCK: replace with GET /api/clients/:id. The engagement, correspondence and
   * approval reads all belong in that one query; doing them here means loading
   * three whole collections to answer about one client, which is right over
   * five rows and wrong over five hundred. Track A.5.
   */
  async client(clientId: string): Promise<ClientRecord | null> {
    const backendData = await backendBridge.clients.get(clientId);
    if (backendData && backendData.client) {
      return backendData as ClientRecord;
    }

    await latency();

    const today = tenantToday();
    const summaries = allClients().map((row) => row.id);
    if (!summaries.includes(clientId)) return null;

    const { items } = await this.clients();
    const client = items.find((row) => row.id === clientId);
    if (!client) return null;

    const people = staffIndex();
    const clients = new Map(allClients().map((row) => [row.id, row]));

    // The engagements this client has, in the shape the staff side already
    // renders them — `EngagementsCard` on four dashboards reads this type.
    const engagements: EngagementAssignment[] = [...allMatters(), ...allProjects()]
      .filter((engagement) => engagement.clientId === clientId)
      .map((engagement) => ({
        reference: engagement.reference,
        kind: ('opposingParty' in engagement ? 'matter' : 'project') as 'matter' | 'project',
        title: engagement.title,
        status: engagement.status,
        statusTone: engagement.statusTone,
        // The CRM is looking at the CLIENT, not at one person's workload, so
        // there is no role to report. This used to send `lead` regardless,
        // which put "You lead this" on a partner's screen over a labour claim
        // a senior associate runs. Who runs it is the useful fact, so that is
        // what goes instead.
        leadName: leadNameOf(engagement),
        active: engagement.active,
        needsAttention: engagement.needsAttention,
      }))
      .sort((a, b) => {
        if (a.active !== b.active) return a.active ? -1 : 1;
        return a.reference.localeCompare(b.reference);
      });

    const correspondence: InboxItemRecord[] = demoInbox
      .filter((item) => item.clientId === clientId)
      .map((item) => ({
        id: item.id,
        source: item.source,
        from: item.from,
        subject: item.subject,
        receivedOn: addDays(today, -item.receivedDaysAgo),
        unread: item.unread,
        personal: false,
        forStaff: item.toId ? (people.get(item.toId)?.name ?? UNKNOWN_NAME) : null,
        threadId: null,
        engagementRef: null,
        preview: null,
        awaitingReply: false,
      }))
      .sort(byNewestFirst);

    const approvals: ApprovalRecord[] = demoApprovals
      .filter((approval) => approval.clientId === clientId && approval.state === 'pending')
      .map((approval) => {
        const person = people.get(approval.submittedById);
        const dueOn = addDays(today, approval.dueInDays);

        return {
          id: approval.id,
          kind: approval.kind,
          title: approval.title,
          submittedBy: person?.name ?? UNKNOWN_NAME,
          submittedByRank: person?.rank ?? 'paralegal',
          clientName: clients.get(clientId)?.name ?? UNKNOWN_NAME,
          engagementRef: approval.engagementRef,
          dueOn,
          daysOverdue: daysBetween(dueOn, today),
          dueToday: approval.dueInDays === 0,
        };
      })
      .sort((a, b) => a.dueOn.localeCompare(b.dueOn));

    return { client, engagements, correspondence, approvals };
  },

  /**
   * Who at one client can sign in to the portal.
   *
   * ONE SOURCE, NOT TWO. These are the rows the CLIENT's own Settings screen
   * renders, read through the same fixture — so the firm and the client see the
   * same list rather than two lists free to disagree about who has access. The
   * scoping is the whole endpoint: a roster returned unscoped is every client's
   * roster, and this is exactly the read where that matters.
   *
   * A CLIENT WITH NO CONTACTS IS NOT AN ERROR. Four of the five clients have no
   * portal at all, which is the ordinary case for a law firm — `hasPortal` has
   * meant precisely this since engagements stopped pointing at accounts.
   *
   * MOCK: replace with GET /api/clients/:id/contacts, authorised against the
   * caller's own session rather than the id in the path. Track A.5.
   */
  async clientContacts(clientId: string): Promise<ClientContactsRecord | null> {
    const backendData = await backendBridge.clients.contacts(clientId);
    if (backendData && backendData.contacts) {
      return {
        clientId: backendData.clientId || clientId,
        clientName: backendData.clientName || { en: backendData.client?.name?.en || '', ar: backendData.client?.name?.ar || '' },
        contacts: backendData.contacts || [],
        takenEmails: backendData.takenEmails || (backendData.contacts || []).map((c: any) => c.email.toLowerCase()),
      } as ClientContactsRecord;
    }

    await latency();

    const client = allClients().find((row) => row.id === clientId);
    // An id that names nothing gets the translated 404, not an empty roster —
    // "this client has no contacts" and "there is no such client" are different
    // answers and must not render the same.
    if (!client) return null;

    const contacts: ClientContact[] = demoClientTeam
      .filter((member) => member.clientId === clientId)
      .map((member) => ({
        id: member.id,
        name: member.name,
        title: member.title,
        email: member.email,
        role: member.role,
        status: member.status,
      }))
      // Active first, then by address — a stable order that does not depend on
      // a name's script, which sorts differently in the two locales.
      .sort((a, b) => {
        if (a.status !== b.status) return a.status === 'active' ? -1 : 1;
        return a.email.localeCompare(b.email);
      });

    return {
      clientId: client.id,
      clientName: client.name,
      contacts,
      takenEmails: contacts.map((contact) => contact.email.toLowerCase()),
    };
  },


  /**
   * The firm's ONE register of legal matters. See `engagementRegister`.
   *
   * FORMER PROJECTS ARE ON IT. At the client's request (October 2026) there is
   * no separate Projects register in the staff workspace: transactional work is
   * a legal matter of the kind `otherProject`. The records themselves still
   * come from fixtures/projects.ts — read here, typed `otherProject` by
   * `toEngagementRow` — so the seed data, and the Saudi-mapping rows proposed
   * against it, stay exactly as reviewed. The client portal's own projects
   * screens read the same records and are unchanged.
   */
  async matters(staffId: string, options: StaffRegisterOptions = {}): Promise<StaffRegisterList> {
    const backendData = await backendBridge.matters.list(options as any);
    if (
      backendData &&
      Array.isArray(backendData.items) &&
      Array.isArray(backendData.types) &&
      Array.isArray(backendData.clients) &&
      Array.isArray(backendData.venues) &&
      Array.isArray(backendData.leads)
    ) {
      return backendData as StaffRegisterList;
    }

    await latency();
    return engagementRegister(registerFiles(), staffId, options);
  },

  /** One legal matter, of any kind — a former project's reference included. */
  async matter(reference: string): Promise<StaffEngagementDetail | null> {
    const backendData = await backendBridge.matters.get(reference);
    if (backendData && backendData.reference) {
      return backendData as StaffEngagementDetail;
    }

    await latency();
    return engagementDetail(registerFiles(), reference);
  },
  /**
   * The firm's fee statements, filtered, with the counts and sums behind them.
   *
   * ONE CALL, for the reason every list in this file gives: a summary fetched
   * separately from its rows is a summary free to disagree with them. The
   * export shows the failure mode — "Total Billed This Month $842,500" over a
   * table whose five visible rows total $11,475.
   *
   * MOCK: replace with GET /api/staff/invoices?status=&client=. The sums must
   * be computed in the database rather than by loading the ledger to add it up,
   * and both must be tenant-scoped server-side. Track A.5.
   */
  async invoices(
    { filter = 'all', clientId }: { filter?: InvoiceFilter; clientId?: string } = {}
  ): Promise<BillingLedger> {
    const backendData = await backendBridge.billing.invoices({ filter, clientId });
    if (backendData && backendData.items) {
      return backendData as BillingLedger;
    }

    await latency();

    const today = tenantToday();
    const clients = new Map(allClients().map((client) => [client.id, client]));
    const byRef = new Map(
      [...allMatters(), ...allProjects()].map((row) => [row.reference, row])
    );

    // UNSCOPED: this is the firm's ledger, not one client's statements.
    const rows: FirmInvoiceRow[] = resolveInvoices().map((invoice) => {
      const engagement = byRef.get(invoice.engagementRef);
      // `resolveInvoices` drops orphans, so the engagement is always there.
      const client = engagement ? clients.get(engagement.clientId) : undefined;
      if (!engagement || !client) {
        throw new MockApiError(
          `Invoice ${invoice.reference} does not resolve to a client via ${invoice.engagementRef}.`
        );
      }
      return { ...invoice, clientId: client.id, clientName: client.name };
    });

    const currencies = new Set(rows.map((row) => row.currency));
    if (currencies.size > 1) {
      // A ledger that sums a column has to be summing one currency. See
      // `BillingLedger.currency`.
      throw new MockApiError(
        `The ledger holds more than one currency (${[...currencies].join(', ')}) and its totals would be meaningless.`
      );
    }

    const matches = (row: FirmInvoiceRow, value: InvoiceFilter) =>
      value === 'all' ? true : row.status === value;

    const unpaid = rows.filter((row) => row.status !== 'paid');
    const sum = (list: FirmInvoiceRow[]) =>
      list.reduce((total, row) => total + row.amount, 0);

    const visible = rows
      .filter((row) => matches(row, filter))
      .filter((row) => (clientId ? row.clientId === clientId : true));

    const seen = new Map<string, RegisterFacet>();
    for (const row of rows) {
      const existing = seen.get(row.clientId);
      if (existing) existing.count += 1;
      else seen.set(row.clientId, { value: row.clientId, label: row.clientName, count: 1 });
    }

    return {
      items: visible,
      counts: {
        all: rows.length,
        overdue: rows.filter((row) => matches(row, 'overdue')).length,
        due: rows.filter((row) => matches(row, 'due')).length,
        paid: rows.filter((row) => matches(row, 'paid')).length,
      },
      totals: {
        outstanding: sum(unpaid),
        overdue: sum(rows.filter((row) => row.status === 'overdue')),
        settled: sum(rows.filter((row) => row.status === 'paid')),
        issuedRecently: sum(
          rows.filter((row) => daysBetween(row.issuedOn, today) <= RECENTLY_ISSUED_DAYS)
        ),
      },
      currency: [...currencies][0] ?? 'USD',
      selection: {
        outstanding: sum(visible.filter((row) => row.status !== 'paid')),
        overdue: sum(visible.filter((row) => row.status === 'overdue')),
        count: visible.length,
        unpaid: visible.filter((row) => row.status !== 'paid').length,
      },
      clients: [...seen.values()].sort((a, b) => a.label.en.localeCompare(b.label.en)),
    };
  },

  /**
   * Fee quotes the firm has out, with who has to decide each one.
   *
   * Read from the approvals collection rather than a collection of their own —
   * see the note over the quotes in fixtures/practice.ts. A quote that a
   * partner has signed off is the same row the associate who priced it sees in
   * their submissions; Batch 5's Approvals screen will render the other three
   * kinds from the same place.
   *
   * MOCK: replace with GET /api/staff/quotes?state=. Track A.5.
   */
  async quotes(
    { state }: { state?: ApprovalState } = {}
  ): Promise<QuoteList> {
    const backendData = await backendBridge.billing.quotes({ state });
    if (backendData && backendData.items) {
      return backendData as QuoteList;
    }

    await latency();

    const today = tenantToday();
    const people = staffIndex();
    const clients = new Map(allClients().map((client) => [client.id, client]));

    const rows: QuoteRow[] = demoApprovals
      .filter((approval) => approval.kind === 'quote')
      .map((approval) => {
        const client = clients.get(approval.clientId);
        if (!client) {
          throw new MockApiError(`Quote ${approval.id} names unknown client ${approval.clientId}.`);
        }
        if (approval.amount === undefined || approval.currency === undefined) {
          // A quote without a figure is not a quote. Loud, because rendering a
          // blank where a price belongs is the quiet version of this bug.
          throw new MockApiError(`Quote ${approval.id} carries no amount.`);
        }

        const dueOn = addDays(today, approval.dueInDays);
        const submitter = people.get(approval.submittedById);

        return {
          id: approval.id,
          title: approval.title,
          amount: approval.amount,
          currency: approval.currency,
          clientId: client.id,
          clientName: client.name,
          submittedBy: submitter?.name ?? UNKNOWN_NAME,
          submittedByRank: submitter?.rank ?? 'seniorAssociate',
          assignedTo: people.get(approval.assignedToId)?.name ?? UNKNOWN_NAME,
          state: approval.state,
          dueOn,
          // Only a pending quote can be late. A decided one has a date it was
          // decided by, not a deadline it is still missing.
          daysOverdue: approval.state === 'pending' ? daysBetween(dueOn, today) : 0,
        };
      })
      .sort((a, b) => a.dueOn.localeCompare(b.dueOn));

    const pending = rows.filter((row) => row.state === 'pending');
    const visible = state ? rows.filter((row) => row.state === state) : rows;

    return {
      items: visible,
      counts: {
        all: rows.length,
        pending: pending.length,
        changesRequested: rows.filter((row) => row.state === 'changesRequested').length,
        approved: rows.filter((row) => row.state === 'approved').length,
      },
      pendingValue: pending.reduce((total, row) => total + row.amount, 0),
      currency: rows[0]?.currency ?? 'USD',
    };
  },

  /**
   * The reader's approvals queue, filtered, with the counts behind it.
   *
   * ONE CALL, including the selected record — see `ApprovalQueue.selected` for
   * why resolving it here rather than in the screen matters.
   *
   * MOCK: replace with GET /api/staff/approvals?state=&kind=&id=. The scope is
   * the authenticated reviewer's own queue and must be enforced server-side:
   * an approval names a client's settlement terms and a firm's fee, and a
   * request that trusts an `assignedTo` from the caller is a request that hands
   * one reviewer another's decisions. Track A.5, reviewed in Track B.
   */
  async approvalQueue(
    staffId: string,
    { state = 'all', kind, id }: { state?: ApprovalQueueFilter; kind?: ApprovalKind; id?: string } = {}
  ): Promise<ApprovalQueue> {
    await latency();

    const today = tenantToday();
    const people = staffIndex();
    const clients = new Map(allClients().map((client) => [client.id, client]));
    const engagements = new Map(
      [...allMatters(), ...allProjects()].map((row) => [row.reference, row])
    );

    const mine = demoApprovals.filter((approval) => approval.assignedToId === staffId);

    const rows: QueuedApproval[] = mine
      .map((approval) => {
        const client = clients.get(approval.clientId);
        if (!client) {
          throw new MockApiError(
            `Approval ${approval.id} names unknown client ${approval.clientId}.`
          );
        }

        const submitter = people.get(approval.submittedById);
        const dueOn = addDays(today, approval.dueInDays);
        const decided = approval.state !== 'pending';
        const engagement = approval.engagementRef
          ? engagements.get(approval.engagementRef)
          : undefined;

        // A reference that names nothing is a fixture defect, not a dash.
        if (approval.engagementRef && !engagement) {
          throw new MockApiError(
            `Approval ${approval.id} names unknown engagement ${approval.engagementRef}.`
          );
        }

        return {
          id: approval.id,
          kind: approval.kind,
          title: approval.title,
          submittedBy: submitter?.name ?? UNKNOWN_NAME,
          submittedByRank: submitter?.rank ?? 'paralegal',
          clientName: client.name,
          engagementRef: approval.engagementRef,
          dueOn,
          // A decided request cannot be late. It has a date it WAS decided,
          // not a deadline it is still missing — the same call the quotes
          // ledger makes, and the reason `decidedDaysAgo` is its own field.
          daysOverdue: decided ? 0 : daysBetween(dueOn, today),
          dueToday: !decided && approval.dueInDays === 0,
          state: approval.state,
          assignedTo: people.get(approval.assignedToId)?.name ?? UNKNOWN_NAME,
          clientId: client.id,
          raisedOn: addDays(today, -approval.raisedDaysAgo),
          decidedOn:
            approval.decidedDaysAgo === null
              ? null
              : addDays(today, -approval.decidedDaysAgo),
          amount: approval.amount ?? null,
          currency: approval.currency ?? null,
          engagementKind: engagement
            ? (('opposingParty' in engagement ? 'matter' : 'project') as EngagementKind)
            : null,
          engagementTitle: engagement ? engagement.title : null,
        };
      })
      .sort((a, b) => {
        // Undecided first, then the most pressing deadline. A queue is a list
        // of what is still owed, so what is already settled sinks.
        const open = (row: QueuedApproval) => (row.state === 'pending' ? 0 : 1);
        if (open(a) !== open(b)) return open(a) - open(b);
        return a.dueOn.localeCompare(b.dueOn);
      });

    const matches = (row: QueuedApproval, value: ApprovalQueueFilter) =>
      value === 'all' ? true : row.state === value;

    const seen = new Map<string, RegisterFacet>();
    for (const row of rows) {
      const existing = seen.get(row.kind);
      if (existing) existing.count += 1;
      else {
        seen.set(row.kind, {
          value: row.kind,
          // The kind is a translation key, not a name — the screen resolves it.
          label: { en: row.kind, ar: row.kind },
          count: 1,
        });
      }
    }

    return {
      items: rows
        .filter((row) => matches(row, state))
        .filter((row) => (kind ? row.kind === kind : true)),
      counts: {
        all: rows.length,
        pending: rows.filter((row) => matches(row, 'pending')).length,
        changesRequested: rows.filter((row) => matches(row, 'changesRequested')).length,
        approved: rows.filter((row) => matches(row, 'approved')).length,
      },
      kinds: [...seen.values()].sort((a, b) => a.value.localeCompare(b.value)),
      selected: id ? (rows.find((row) => row.id === id) ?? null) : null,
    };
  },

  /**
   * One engagement reduced to the facts an answer can be built from.
   *
   * Reads through `engagementDetail`, which is the same function the matter
   * and project screens use — so an answer and the record behind it cannot
   * disagree about a status, a lead or a next date.
   */
  async assistantFacts(reference: string): Promise<AssistantEngagementFacts | null> {
    await latency();

    const record =
      engagementDetail(allMatters(), reference) ?? engagementDetail(allProjects(), reference);
    if (!record) return null;

    const today = tenantToday();
    const lead = record.engagement.team.find((member) => member.role === 'lead');

    return {
      reference: record.engagement.reference,
      kind: record.engagement.kind,
      title: record.engagement.title,
      status: record.engagement.status,
      currentPhase: record.currentPhase,
      leadName: lead ? lead.name : null,
      clientId: record.client.id,
      clientName: record.client.name,
      nextDate: record.engagement.nextDate
        ? { on: record.engagement.nextDate.on, title: record.engagement.nextDate.title }
        : null,
      documents: record.documents.length,
      tasks: record.tasks.length,
      approvals: record.approvals.length,
      daysSinceActivity: daysBetween(record.engagement.lastUpdatedOn, today),
      awaitingSignature: record.documents.filter((document) => document.needsSignature).length,
    };
  },

  /**
   * What one client owes.
   *
   * Goes through `staff.invoices` and reads `selection`, which is the sum over
   * the rows that call returned. Adding the figures up in the screen instead
   * would produce the same number today and a different one the moment the
   * ledger gains a statement nobody remembered to include.
   */
  async assistantBalance(clientId: string): Promise<AssistantClientBalance | null> {
    const client = allClients().find((row) => row.id === clientId);
    if (!client) return null;

    const ledger = await this.invoices({ clientId });

    return {
      id: client.id,
      name: client.name,
      outstanding: ledger.selection.outstanding,
      overdue: ledger.selection.overdue,
      // The count the outstanding figure spans, not every row on file.
      statements: ledger.selection.unpaid,
      currency: ledger.currency,
    };
  },

  /**
   * The three exchanges the Assistant demonstrates, resolved.
   *
   * The references are named here rather than in the screen so that a fixture
   * change that removes one fails in the data layer — where `null` is handled
   * — instead of rendering an answer about a matter that no longer exists.
   */
  async assistantDemo(): Promise<AssistantDemo> {
    const [matter, project, balance] = await Promise.all([
      this.assistantFacts('MAT-2201'),
      this.assistantFacts('PRJ-5120'),
      this.assistantBalance(PORTAL_CLIENT_ID),
    ]);

    return { matter, project, balance };
  },

  /**
   * One shared document, with the counts a drafting suggestion needs to be
   * about something.
   *
   * A suggestion like "your other cross-border agreements on file for this
   * client typically include one" is only worth making if the screen knows how
   * many there are. These are those counts, taken from the documents
   * collection through the same resolver the library uses — so a suggestion
   * cannot claim a comparison set the product does not hold.
   *
   * MOCK: the document BODY is not here because there is no body anywhere in
   * this product — fixtures/documents.ts holds a name, a size, a status and an
   * engagement, and nothing else. Track A.5 adds real content, at which point
   * these suggestions stop being illustrations of a shape and start being
   * anchored to spans of text.
   */
  async documentContext(documentId: string): Promise<DocumentContext | null> {
    await latency();

    const resolved = resolveDocuments(demoSharedDocuments).find(
      (document) => document.id === documentId
    );
    if (!resolved) return null;

    const engagements = new Map(
      [...allMatters(), ...allProjects()].map((row) => [row.reference, row])
    );
    const engagement = engagements.get(resolved.engagementRef);
    if (!engagement) {
      throw new MockApiError(
        `Document ${resolved.id} names unknown engagement ${resolved.engagementRef}.`
      );
    }

    const client = allClients().find((row) => row.id === engagement.clientId);
    if (!client) {
      throw new MockApiError(`Document ${resolved.id} resolves to unknown client.`);
    }

    // Everything this client has on file, across every engagement of theirs.
    const theirRefs = new Set(
      [...allMatters(), ...allProjects()]
        .filter((row) => row.clientId === client.id)
        .map((row) => row.reference)
    );

    const today = tenantToday();
    const people = staffIndex();
    // Newest first. The fixture's last entry is the current one — see the
    // note on `versions` above and the fixture's own on the share date.
    const versions: DocumentVersionRecord[] = [...resolved.versions]
      .map((version, index) => ({
        label: version.label,
        savedOn: addDays(today, -version.daysAgo),
        byName: people.get(version.byStaffId)?.name ?? UNKNOWN_NAME,
        byRank: people.get(version.byStaffId)?.rank ?? 'paralegal',
        isCurrent: index === resolved.versions.length - 1,
      }))
      .reverse();

    return {
      document: resolved,
      versions,
      engagementRef: engagement.reference,
      engagementKind: ('opposingParty' in engagement ? 'matter' : 'project') as EngagementKind,
      engagementTitle: engagement.title,
      clientId: client.id,
      clientName: client.name,
      onEngagement: demoSharedDocuments.filter(
        (row) => row.engagementRef === engagement.reference
      ).length,
      forClient: demoSharedDocuments.filter((row) => theirRefs.has(row.engagementRef)).length,
    };
  },

  /** The drafts a canvas can open — the only status it makes sense to edit. */
  /**
   * One legal-database entry, as the full-text reader renders it.
   *
   * ===========================================================================
   * PREVIOUS AND NEXT ARE REAL NAVIGATION OVER A REAL LIST
   * ===========================================================================
   * Four entries in a fixed order, so "previous" and "next" mean what they say
   * and the ends of the list have nothing after them. The export's reader
   * offers prev/next over 363 articles it does not hold.
   *
   * RETURNS NULL FOR AN UNKNOWN REFERENCE so the route can answer with the
   * translated 404 — the same rule the engagement and client screens follow.
   *
   * MOCK: Track A.5 replaces this with a real source. At that point the corpus
   * stops living in the repo, fixtures/legal-database.ts is deleted rather than
   * extended, and THIS is the endpoint that starts returning law — which is why
   * the screen above it is built to say, in words, that today it does not.
   */
  async legalEntry(reference: string): Promise<LegalEntryRecord | null> {
    await latency();

    const index = demoLegalDatabase.findIndex((row) => row.reference === reference);
    if (index === -1) return null;

    const neighbour = (at: number) => {
      const row = demoLegalDatabase[at];
      return row ? { reference: row.reference, title: row.title } : null;
    };

    return {
      entry: demoLegalDatabase[index],
      previous: neighbour(index - 1),
      next: neighbour(index + 1),
      position: index + 1,
      total: demoLegalDatabase.length,
    };
  },

  async draftDocuments(): Promise<SharedDocumentRecord[]> {
    await latency();
    return resolveDocuments(demoSharedDocuments).filter(
      (document) => document.status === 'draft'
    );
  },

  /**
   * The Legal Database's sample entries, narrowed by type and jurisdiction.
   *
   * This is NOT a search. It is a filter over three placeholder rows, and the
   * distinction is the whole reason this endpoint is shaped the way it is:
   * `kind` and `jurisdiction` are facets of records that genuinely exist, so
   * narrowing by them is real work over real values. Free text is not accepted
   * here at all, because there is nothing to match it against — the bodies are
   * literal Lorem Ipsum (see fixtures/legal-database.ts) and a query that
   * "found" something in them would be pure theatre.
   *
   * The facet lists are DERIVED from the entries, the same rule the registers
   * follow, so a filter can never offer a value that returns nothing.
   *
   * MOCK: Track A.5 connects a real source and this becomes a query with a
   * result count that is not also the size of the collection.
   */
  async legalDatabase(
    { kind, jurisdiction }: { kind?: string; jurisdiction?: string } = {}
  ): Promise<{
    items: LegalDatabaseEntry[];
    total: number;
    kinds: LegalSourceKind[];
    jurisdictions: { value: string; label: Record<Locale, string> }[];
  }> {
    await latency();

    const kinds = [...new Set(demoLegalDatabase.map((entry) => entry.kind))];

    // Keyed by the English label so a chosen jurisdiction survives a language
    // switch — the same reason register facets do not key on display text in
    // the active locale.
    const jurisdictions = [
      ...new Map(
        demoLegalDatabase.map((entry) => [entry.jurisdiction.en, entry.jurisdiction])
      ),
    ].map(([value, label]) => ({ value, label }));

    // Allow-list, never a deny-list: an unrecognised value narrows nothing
    // rather than silently excluding rows.
    const byKind = kinds.includes(kind as LegalSourceKind) ? (kind as LegalSourceKind) : null;
    const byJurisdiction = jurisdictions.some((row) => row.value === jurisdiction)
      ? jurisdiction
      : null;

    const items = demoLegalDatabase.filter(
      (entry) =>
        (byKind === null || entry.kind === byKind) &&
        (byJurisdiction === null || entry.jurisdiction.en === byJurisdiction)
    );

    return { items, total: demoLegalDatabase.length, kinds, jurisdictions };
  },

  /**
   * The firm's activity log, derived from the approvals collection.
   *
   * Two events come out of one approval: it was submitted, and — if it has
   * been decided — it was decided. Both carry a real person and a real date,
   * because both are stored. See the ActivityEvent header for why no other
   * collection contributes and why inventing an actor would be worse here than
   * on any other screen.
   *
   * Newest first, which is the only order an audit log is ever read in.
   *
   * MOCK: Track A.5 replaces this with an append-only events table written by
   * the API on every mutation, at which point the log stops being derived and
   * starts being recorded — and starts including sign-ins, document shares and
   * everything else this version honestly cannot show.
   */
  async activityLog(
    { actor, action }: { actor?: string; action?: string } = {}
  ): Promise<ActivityLog> {
    await latency();

    const today = tenantToday();
    const people = staffIndex();
    const clients = new Map(allClients().map((client) => [client.id, client]));
    const engagements = new Map(
      [...allMatters(), ...allProjects()].map((row) => [row.reference, row])
    );

    const events: ActivityEvent[] = [];

    for (const approval of demoApprovals) {
      const client = clients.get(approval.clientId);
      if (!client) {
        throw new MockApiError(
          `Approval ${approval.id} names unknown client ${approval.clientId}.`
        );
      }

      const engagement = approval.engagementRef
        ? engagements.get(approval.engagementRef)
        : undefined;
      if (approval.engagementRef && !engagement) {
        throw new MockApiError(
          `Approval ${approval.id} names unknown engagement ${approval.engagementRef}.`
        );
      }

      const shared = {
        subject: approval.title,
        engagementRef: approval.engagementRef,
        engagementKind: engagement
          ? (('opposingParty' in engagement ? 'matter' : 'project') as EngagementKind)
          : null,
        clientId: client.id,
        clientName: client.name,
      };

      // Raised. Every approval has this — a request that was never submitted
      // would not be in the collection.
      const submitter = people.get(approval.submittedById);
      if (!submitter) {
        throw new MockApiError(
          `Approval ${approval.id} names unknown submitter ${approval.submittedById}.`
        );
      }
      events.push({
        id: `${approval.id}-raised`,
        on: addDays(today, -approval.raisedDaysAgo),
        actorId: submitter.id,
        actorName: submitter.name,
        actorRank: submitter.rank,
        action: 'approvalSubmitted',
        ...shared,
      });

      /*
        Decided. Guarded on the DATE, not on the state: a decided request with
        no recorded decision date cannot produce a dated log entry, and dating
        it from the deadline instead would be a different fact wearing the same
        label — the reason decidedDaysAgo is a field of its own.
      */
      if (approval.state !== 'pending' && approval.decidedDaysAgo !== null) {
        const reviewer = people.get(approval.assignedToId);
        if (!reviewer) {
          throw new MockApiError(
            `Approval ${approval.id} names unknown reviewer ${approval.assignedToId}.`
          );
        }
        events.push({
          id: `${approval.id}-decided`,
          on: addDays(today, -approval.decidedDaysAgo),
          actorId: reviewer.id,
          actorName: reviewer.name,
          actorRank: reviewer.rank,
          action:
            approval.state === 'approved' ? 'approvalApproved' : 'approvalChangesRequested',
          ...shared,
        });
      }
    }

    events.sort((a, b) => b.on.localeCompare(a.on));

    // Facets derived from the events themselves, the same rule the registers
    // and the legal database follow.
    const actors = [
      ...new Map(events.map((event) => [event.actorId, event.actorName])),
    ].map(([value, label]) => ({ value, label }));
    const actions = [...new Set(events.map((event) => event.action))];

    // Allow-list. An unrecognised value narrows nothing rather than excluding
    // every row and calling the log empty.
    const byActor = actors.some((row) => row.value === actor) ? actor : null;
    const byAction = actions.includes(action as ActivityAction)
      ? (action as ActivityAction)
      : null;

    const items = events.filter(
      (event) =>
        (byActor === null || event.actorId === byActor) &&
        (byAction === null || event.action === byAction)
    );

    return { items, total: events.length, actors, actions };
  },

  /**
   * The firm's roster.
   *
   * Everything except `status` and `joinedOn` is derived: the engagement count
   * and the practice areas come from the same matters and projects the
   * registers read, so the roster cannot claim someone is carrying work the
   * rest of the product does not show.
   *
   * Status cannot be derived — nothing about a person's files tells you whether
   * their account works — so it is stored, the way an approval's decision is.
   */
  async roster(
    { status, rank }: { status?: string; rank?: string } = {}
  ): Promise<Roster> {
    await latency();

    const today = tenantToday();

    // Track A.5 Real PostgreSQL Backend Bridge
    const backendData = await backendBridge.team.list();
    if (backendData?.members && backendData.members.length > 0) {
      const items: RosterMember[] = backendData.members.map((member: any) => ({
        id: member.id,
        name: member.name,
        rank: member.rank,
        email: member.email,
        status: member.status,
        joinedOn: addDays(today, -(member.joinedDaysAgo || 0)),
        openEngagements: member.engagementsCount || 0,
        practiceAreas: (member.practiceAreas || []).map((p: string) => ({ en: p, ar: p })),
        isYou: member.isSelf,
        addedThisSession: member.status === 'temporaryPasswordIssued',
      }));

      const filtered = items.filter((row) => {
        if (status && row.status !== status) return false;
        if (rank && row.rank !== rank) return false;
        return true;
      });

      const counts = {
        all: items.length,
        active: items.filter((row) => row.status === 'active').length,
        temporaryPasswordIssued: items.filter(
          (row) => row.status === 'temporaryPasswordIssued'
        ).length,
        deactivated: items.filter((row) => row.status === 'deactivated').length,
      };

      const ranks = [...new Set(items.map((row) => row.rank))] as Rank[];

      return { items: filtered, total: items.length, counts, ranks };
    }

    const engagements = [...allMatters(), ...allProjects()];

    const items: RosterMember[] = allStaff().map((member) => {
      // Lead by name on the engagement, or named in the support assignments.
      // Both readings already exist; this reuses them rather than adding a
      // third idea of what "on a file" means.
      const mine = engagementsFor(member.id).filter((row) => row.active !== false);

      const refs = new Set(mine.map((row) => row.reference));
      const areas = new Map<string, Record<Locale, string>>();
      for (const engagement of engagements) {
        if (!refs.has(engagement.reference)) continue;
        const area =
          'matterType' in engagement ? engagement.matterType : engagement.category;
        if (area) areas.set(area.en, area);
      }

      return {
        id: member.id,
        name: member.name,
        rank: member.rank,
        email: member.email,
        status: member.status,
        joinedOn: addDays(today, -member.joinedDaysAgo),
        openEngagements: refs.size,
        practiceAreas: [...areas.values()],
        isYou: member.id === SIGNED_IN_STAFF_ID,
        addedThisSession: sessionStaff.some((added) => added.id === member.id),
      };
    });

    const counts = {
      all: items.length,
      active: items.filter((row) => row.status === 'active').length,
      temporaryPasswordIssued: items.filter(
        (row) => row.status === 'temporaryPasswordIssued'
      ).length,
      deactivated: items.filter((row) => row.status === 'deactivated').length,
    };

    const ranks = RANKS.filter((value) => items.some((row) => row.rank === value));

    // Allow-list. An unrecognised value narrows nothing rather than emptying
    // the roster and calling the firm empty.
    const byStatus = (['active', 'temporaryPasswordIssued', 'deactivated'] as const).find(
      (value) => value === status
    );
    const byRank = ranks.find((value) => value === rank);

    return {
      items: items.filter(
        (row) =>
          (byStatus === undefined || row.status === byStatus) &&
          (byRank === undefined || row.rank === byRank)
      ),
      total: items.length,
      counts,
      ranks,
    };
  },

  /**
   * What the workspace is wired into.
   *
   * A pure read. There is no connect and no disconnect, because there is
   * nothing to connect TO: BUILD_PLAN §5 has integrations "shown as already
   * connected in fixture data", and §6 puts the real OAuth flows in Track B
   * rather than A.5, since they need provider-side business verification.
   *
   * The connected count is derived from the rows rather than stored, so the
   * headline and the list cannot disagree — the failure every Stitch export
   * on this project has shipped at least once.
   *
   * MOCK: Track B replaces this with the per-tenant token store. At that point
   * "connected" stops being a boolean and starts meaning a credential that can
   * expire, be revoked, or fail mid-request, and this endpoint grows the
   * states to say which.
   */
  async integrations(): Promise<IntegrationSummary> {
    await latency();

    const items = demoIntegrations;

    return {
      items,
      connected: items.filter((row) => row.providers.some((p) => p.connected)).length,
      total: items.length,
      categories: INTEGRATION_CATEGORIES,
    };
  },

  /**
   * The choices the new-matter form offers, all derived from the register.
   *
   * Nothing here is a written-out vocabulary. The practice areas are the ones
   * the firm's own files already sit in, the forums are the ones it already
   * appears before, and both arrive with their Arabic attached — which is the
   * whole reason they are pickers rather than text boxes.
   */
  async newMatterOptions(): Promise<NewMatterOptions> {
    const backendData = await backendBridge.matters.options();
    if (backendData) {
      return {
        clients: backendData.clients.map((c: any) => ({ value: c.id, label: c.name })),
        leads: backendData.leads.map((l: any) => ({ value: l.id, label: l.name })),
        practiceAreas: backendData.practiceAreas.map((pa: any) => ({ value: pa.en, label: pa })),
        forums: backendData.forums.map((f: any) => ({ value: f.en, label: f })),
      };
    }

    await latency();

    const matters = allMatters();

    const byLabel = (rows: Record<Locale, string>[]): MatterOption[] =>
      [...new Map(rows.map((row) => [row.en, row]))]
        .map(([value, label]) => ({ value, label }))
        .sort((a, b) => a.value.localeCompare(b.value));

    return {
      clients: allClients().map((client) => ({ value: client.id, label: client.name })),
      practiceAreas: byLabel(matters.map((matter) => matter.matterType)),
      forums: byLabel(matters.map((matter) => matter.forum)),
      // Everyone who can hold a file, which is everyone whose account works.
      // A deactivated colleague cannot be handed a new matter.
      leads: allStaff()
        .filter((member) => member.status !== 'deactivated')
        .map((member) => ({ value: member.id, label: member.name })),
    };
  },

  /**
   * Open a matter. A SESSION WRITE — see the store above, and BUILD_PLAN §5.1.
   *
   * ===========================================================================
   * NO CONFLICT CHECK, AND NOTHING HERE PRETENDS ONE RAN
   * ===========================================================================
   * The Stitch export makes this a two-step flow whose second step is an "AI
   * Conflict Check Screening" gate: "Autonomous counterpart cross-check against
   * 1,842 active matters", "Full Corporate Entity Tree Resolution", "Sanction &
   * AML Watchlist Audit", and "No matter docket can be opened or billed without
   * conflict clearance".
   *
   * There IS a conflicts register now — fixtures/conflicts.ts plus the adverse
   * parties the matters already carried — and this still does not run it.
   *
   * The register changed what a search can find. It did not change who decides.
   * A gate here would tell a lawyer the ethical screen cleared before they took
   * on a client, and no search can establish that: whether a relationship
   * disqualifies the firm turns on what it learned while acting, what was
   * consented to, and what the retainer says. Declining work for conflict is a
   * professional duty, and a form that appears to discharge it invites somebody
   * to skip the thing they are actually required to do.
   *
   * So the check is its own screen, run against a party rather than against a
   * form, and this one says so.
   *
   * MOCK: Track A.5 makes this POST /api/matters, and the real conflict search
   * becomes a query against the firm's whole client and counterparty history
   * rather than a spinner.
   */
  /** This session's send request for one matter's client report, if any. */
  async reportSend(reference: string): Promise<ReportSendRecord | null> {
    await latency();
    const seed = sessionReportSends.get(reference);
    if (!seed) return null;
    const people = staffIndex();
    const unknown = { en: '—', ar: '—' };
    return {
      reference: seed.reference,
      channels: seed.channels,
      state: seed.state,
      requestedBy: people.get(seed.requestedById)?.name ?? unknown,
      requestedAt: seed.requestedAt,
      approvedBy: seed.approvedById ? people.get(seed.approvedById)?.name ?? unknown : null,
      approvedAt: seed.approvedAt,
    };
  },

  /**
   * Ask for a matter's client report to be sent on some channels. Any fee
   * earner may ask; it waits for a partner. The channel list is allow-listed,
   * so an edited payload cannot name a channel the screen never offered.
   */
  async requestReportSend(input: {
    reference: string;
    channels: string[];
    staffId: string;
  }): Promise<ReportSendResult> {
    await latency();
    const file = registerFiles().find((row) => row.reference === input.reference);
    if (!file) return { ok: false, error: 'notFound' };
    const channels = REPORT_CHANNELS.filter((channel) => input.channels.includes(channel));
    if (channels.length === 0) return { ok: false, error: 'noChannel' };
    sessionReportSends.set(file.reference, {
      reference: file.reference,
      channels,
      state: 'awaitingApproval',
      requestedById: input.staffId,
      requestedAt: tenantNow(),
      approvedById: null,
      approvedAt: null,
    });
    return { ok: true, state: 'awaitingApproval' };
  },

  /** A partner's approval. The rank check is the Server Action's. */
  async approveReportSend(input: { reference: string; staffId: string }): Promise<ReportSendResult> {
    await latency();
    const seed = sessionReportSends.get(input.reference);
    if (!seed) return { ok: false, error: 'notFound' };
    if (seed.state !== 'awaitingApproval') return { ok: false, error: 'notAwaiting' };
    sessionReportSends.set(input.reference, {
      ...seed,
      state: 'queued',
      approvedById: input.staffId,
      approvedAt: tenantNow(),
    });
    return { ok: true, state: 'queued' };
  },

  /**
   * Who has access to the workspace, and this session's audit of changes to
   * it. Partner-only on screen — settings/tabs.ts — and the gate is the
   * caller's, as it is for the roster.
   */
  async teamAccess(viewerId: string): Promise<TeamAccess> {
    await latency();
    const people = staffIndex();
    const unknown = { en: '—', ar: '—' };

    // Track A.5 Real PostgreSQL Backend Bridge
    const backendData = await backendBridge.team.list();
    if (backendData?.members && backendData.members.length > 0) {
      const members = backendData.members.map((member: any) => ({
        id: member.id,
        name: member.name,
        rank: member.rank,
        email: member.email,
        hasAccess: member.hasAccess,
        isSelf: member.id === viewerId,
        changedThisSession: lastAccessChange(member.id) !== undefined,
      })).sort(
        (a: any, b: any) =>
          RANKS.indexOf(a.rank) - RANKS.indexOf(b.rank) || a.name.en.localeCompare(b.name.en)
      );

      const log = [...sessionAccessLog].reverse().map((entry) => ({
        id: entry.id,
        change: entry.change,
        subject: people.get(entry.staffId)?.name ?? unknown,
        actor: people.get(entry.byStaffId)?.name ?? unknown,
        on: entry.on,
        at: entry.at,
      }));

      return { members, log };
    }

    const members = allStaff()
      .map((member) => ({
        id: member.id,
        name: member.name,
        rank: member.rank,
        email: member.email,
        hasAccess: member.status !== 'deactivated',
        isSelf: member.id === viewerId,
        changedThisSession: lastAccessChange(member.id) !== undefined,
      }))
      // The ladder's order, then by name: the same order the roster reads in.
      .sort(
        (a, b) =>
          RANKS.indexOf(a.rank) - RANKS.indexOf(b.rank) || a.name.en.localeCompare(b.name.en)
      );
    const log = [...sessionAccessLog].reverse().map((entry) => ({
      id: entry.id,
      change: entry.change,
      subject: people.get(entry.staffId)?.name ?? unknown,
      actor: people.get(entry.byStaffId)?.name ?? unknown,
      on: entry.on,
      at: entry.at,
    }));
    return { members, log };
  },

  /**
   * Remove or give back one colleague's access. The rank check is the Server
   * Action's. This refuses your own row — a partner who removes themselves is
   * locked out of the screen that would undo it — and a change that changes
   * nothing, so the audit never records a removal of access nobody had.
   */
  async setTeamAccess(input: {
    staffId: string;
    grant: boolean;
    actorId: string;
  }): Promise<SetTeamAccessResult> {
    await latency();
    if (input.staffId === input.actorId) return { ok: false, error: 'self' };
    const member = allStaff().find((row) => row.id === input.staffId);
    if (!member) return { ok: false, error: 'notFound' };
    const hasAccess = member.status !== 'deactivated';
    if (hasAccess === input.grant) return { ok: false, error: 'unchanged' };
    const change = input.grant ? 'granted' : 'removed';
    sessionAccessLog.push({
      id: `acc-s${sessionAccessLog.length + 1}`,
      staffId: member.id,
      change,
      byStaffId: input.actorId,
      on: tenantToday(),
      at: tenantNow(),
    });
    return { ok: true, change };
  },

  /**
   * Reopen a closed legal matter (or a completed former project). The rank
   * check is the Server Action's — see app/[locale]/(staff)/staff/matters/
   * reopen-matter-action.ts. This checks the file: it must exist and be
   * closed, so a replayed request cannot "reopen" an open file and reset its
   * status line.
   */
  async reopenMatter(reference: string, staffId: string): Promise<ReopenMatterResult> {
    await latency();
    const file = registerFiles().find(
      (candidate) => candidate.reference.toLowerCase() === reference.toLowerCase()
    );
    if (!file) return { ok: false, error: 'notFound' };
    if (file.active) return { ok: false, error: 'notClosed' };
    sessionReopened.set(file.reference, staffId);
    return { ok: true, reference: file.reference };
  },

  async createMatter(input: {
    title: string;
    /** Required: one of `MATTER_WORK_TYPES`. */
    workType: string;
    clientId: string;
    practiceArea: string;
    forum: string;
    leadId: string;
    /** Optional. Blank stores NEW_MATTER_SCOPE rather than an empty string. */
    scope?: string;
  }): Promise<CreateMatterResult> {
    await latency();

    const title = input.title.trim();
    const scope = (input.scope ?? '').trim();
    if (!title) return { ok: false, error: 'titleRequired' };

    // An allow-list, so an edited payload cannot store a kind the register
    // has no filter or label for.
    const workType = MATTER_WORK_TYPES.find((value) => value === input.workType);
    if (!workType) return { ok: false, error: 'workTypeRequired' };

    const client = allClients().find((row) => row.id === input.clientId);
    if (!client) return { ok: false, error: 'clientRequired' };

    const matters = allMatters();

    // Allow-lists over the same derived vocabularies the form was offered, so
    // an edited payload cannot introduce a practice area the firm does not use.
    const practiceArea = matters.find(
      (matter) => matter.matterType.en === input.practiceArea
    )?.matterType;
    if (!practiceArea) return { ok: false, error: 'practiceAreaRequired' };

    const forum = matters.find((matter) => matter.forum.en === input.forum)?.forum;
    if (!forum) return { ok: false, error: 'forumRequired' };

    const lead = allStaff().find(
      (member) => member.id === input.leadId && member.status !== 'deactivated'
    );
    if (!lead) return { ok: false, error: 'leadRequired' };

    /*
      The next number after the highest on the register. Generated HERE, at
      creation, and not offered to the form beforehand — the export reserves
      "MAT-2205" on screen before anything is submitted, which hands out an
      identifier for a record that may never exist.
    */
    const highest = matters.reduce((max, matter) => {
      const digits = Number.parseInt(matter.reference.replace(/\D/g, ''), 10);
      return Number.isNaN(digits) ? max : Math.max(max, digits);
    }, 0);
    const reference = `MAT-${highest + 1}`;

    /*
      A direct line is a per-engagement disclosure (fixtures/engagements.ts).
      If this lead has published one on another file, the client already has
      it and reusing it is truthful; if they have not, this matter has not
      disclosed one and the field is null rather than an invented number.
    */
    const knownPhone =
      matters.find((matter) => matter.counsel.name.en === lead.name.en)?.counsel.phone ??
      null;

    const opened: Matter = {
      id: `mat-s${sessionMatters.length + 1}`,
      reference,
      firmId: demoFirm.id,
      clientId: client.id,
      // One title, both locales — the form has one field. Stated on screen.
      title: { en: title, ar: title },
      workType,
      matterType: practiceArea,
      leadCounsel: lead.name,
      forum,
      status: NEW_MATTER_STATUS,
      statusTone: 'info',
      needsAttention: false,
      attentionReason: null,
      active: true,
      lastUpdatedDaysAgo: 0,
      openedDaysAgo: 0,
      // No court file number until the matter is filed somewhere.
      courtFileNumber: null,
      currentPhase: NEW_MATTER_PHASE,
      // Not known at intake, and inventing a counterparty on a file the firm
      // has just taken on would be the fabrication this whole screen avoids.
      opposingParty: null,
      scopeSummary: scope ? { en: scope, ar: scope } : NEW_MATTER_SCOPE,
      counsel: {
        name: lead.name,
        /*
          The practice group, and deliberately not "Partner, commercial
          litigation" the way the seeded rows read. Composing a rank into this
          line needs a gendered Arabic form — the seeded data already has
          "محامية" on one row — and this product does not store anyone's
          gender, for the reason EngagementContact.name gives about honorifics.
          The practice group alone is accurate and carries no agreement.
        */
        role: practiceArea,
        phone: knownPhone,
        email: lead.email,
        supporting: null,
      },
      // Empty, so nothing derives a key date from a file with no history.
      timeline: [],
    };

    sessionMatters.push(opened);

    // Auto-convert prospect client to active upon opening a matter
    if (client.standing === 'prospect') {
      client.standing = 'active';
    }
    client.lastActivityDaysAgo = 0;

    return { ok: true, reference };
  },

  /**
   * Take on a client. A SESSION WRITE — see the store above and §5.1.
   *
   * ===========================================================================
   * THE RECORD IS THE WHOLE OF IT
   * ===========================================================================
   * `FirmClient` holds a name, a one-line summary of what the firm is doing for
   * them, a standing, and when their file last moved. That is genuinely all a
   * client is in this product, and the form collects exactly that rather than
   * asking for fields the record cannot keep.
   *
   * No portal account is created. fixtures/clients.ts is explicit that a client
   * is NOT an account — "one of the five has an account and four do not, and
   * that is an ordinary state for a law firm; most clients never touch the
   * portal". A new client therefore starts with no portal access, which is the
   * common case rather than an omission, and granting it is the
   * invite-client-contact flow BUILD_PLAN §3 lists separately.
   *
   * No conflict check, for the reason `createMatter` gives at length. The Add
   * Client export promises one explicitly — "Conflict of interest verification
   * runs automatically during subsequent matter onboarding via the SynQanun
   * Regulatory Engine" — which is a promise about the screen New Matter just
   * refused to fake. Two screens may not disagree, and neither of them checks
   * anything.
   *
   * MOCK: POST /api/clients at Track A.5, with the tenant scope enforced
   * server-side.
   */
  async createClient(input: {
    name: string;
    summary?: string;
    standing: string;
  }): Promise<CreateClientResult> {
    await latency();

    const name = input.name.trim();
    if (!name) return { ok: false, error: 'nameRequired' };

    // Compared case-insensitively against both locales, because the same
    // organisation typed twice is the commonest way a CRM ends up billing one
    // client on two records.
    const needle = name.toLowerCase();
    const taken = allClients().some(
      (client) =>
        client.name.en.toLowerCase() === needle || client.name.ar.toLowerCase() === needle
    );
    if (taken) return { ok: false, error: 'nameTaken' };

    const standing = CLIENT_STANDINGS.find((value) => value === input.standing);
    if (!standing) return { ok: false, error: 'standingRequired' };

    const summary = (input.summary ?? '').trim();

    const client: FirmClient = {
      id: `cli-s${sessionClients.length + 1}`,
      // One name, both locales — the form has one field. Stated on screen.
      name: { en: name, ar: name },
      summary: summary ? { en: summary, ar: summary } : NEW_CLIENT_SUMMARY,
      standing,
      // Taken on today, so today is when their file last moved.
      lastActivityDaysAgo: 0,
    };

    sessionClients.push(client);

    return { ok: true, id: client.id };
  },

  /**
   * Search the conflicts register for a party.
   *
   * Five sources, three of them DERIVED from live records rather than copied
   * into a list of their own — the clients the firm acts for, the opposing
   * parties on its contentious matters, and the counterparties on its
   * transactions. fixtures/conflicts.ts explains why only the other two are
   * stored: a copied register is free to disagree with the matter it was
   * copied from, and a conflicts register that disagrees is worse than none.
   *
   * Matching is a case-insensitive substring over BOTH locales through the
   * shared matcher, so a search typed in Arabic finds a party recorded in
   * English and the reverse. That is not a nicety — a firm whose files are
   * bilingual will be approached in both.
   *
   * MOCK: Track A.5 makes this a query with proper name normalisation —
   * trading names, transliteration variants and legal-form suffixes all
   * matter, and a substring is a weak proxy for each of them. The screen says
   * so rather than letting a clean result imply a thorough one.
   */
  async conflictSearch(query: string): Promise<ConflictSearch> {
    await latency();

    const today = tenantToday();
    const clients = allClients();

    // Every distinct party the register can match against, counted rather
    // than asserted. The export claims "1,842 active matters"; this firm has
    // ten, and the number below is the one the screen prints.
    const registerSize =
      clients.length +
      allMatters().filter((matter) => matter.opposingParty !== null).length +
      allProjects().filter((project) => project.targetEntities !== null).length +
      demoRelatedParties.length +
      demoDeclinedEngagements.length;

    if (normaliseForSearch(query).length < MIN_QUERY_LENGTH) {
      return { matches: [], searched: false, registerSize };
    }

    const hit = (name: Record<Locale, string>) => matchesQuery([name.en, name.ar], query);

    const matches: ConflictMatch[] = [];

    /* ---- The firm acts for them ---------------------------------------- */
    for (const client of clients) {
      if (!hit(client.name)) continue;
      matches.push({
        id: `client-${client.id}`,
        kind: 'client',
        name: client.name,
        detail: client.summary,
        href: `/staff/clients/${client.id}`,
        reference: null,
        on: null,
      });
    }

    /* ---- The firm is against them -------------------------------------- */
    for (const matter of allMatters()) {
      if (matter.opposingParty === null || !hit(matter.opposingParty)) continue;
      const client = clients.find((row) => row.id === matter.clientId);
      matches.push({
        id: `adverse-${matter.reference}`,
        kind: 'adverse',
        name: matter.opposingParty,
        // Names the client the firm is acting FOR, because that is the fact a
        // conflict turns on.
        detail: {
          en: `Opposed by the firm on behalf of ${client?.name.en ?? '—'}. ${matter.title.en}.`,
          ar: `يخاصمهم المكتب نيابةً عن ${client?.name.ar ?? '—'}. ${matter.title.ar}.`,
        },
        href: `/staff/matters/${matter.reference}`,
        reference: matter.reference,
        on: addDays(today, -matter.openedDaysAgo),
      });
    }

    /* ---- Across the table on a transaction ------------------------------ */
    for (const project of allProjects()) {
      if (project.targetEntities === null || !hit(project.targetEntities)) continue;
      const client = clients.find((row) => row.id === project.clientId);
      matches.push({
        id: `counterparty-${project.reference}`,
        kind: 'counterparty',
        name: project.targetEntities,
        detail: {
          en: `Counterparty on a transaction for ${client?.name.en ?? '—'}. ${project.title.en}.`,
          ar: `طرف مقابل في صفقة لصالح ${client?.name.ar ?? '—'}. ${project.title.ar}.`,
        },
        href: `/staff/matters/${project.reference}`,
        reference: project.reference,
        on: null,
      });
    }

    /* ---- Recorded affiliations ------------------------------------------ */
    for (const party of demoRelatedParties) {
      if (!hit(party.name)) continue;
      const client = clients.find((row) => row.id === party.clientId);
      matches.push({
        id: `related-${party.id}`,
        kind: 'related',
        name: party.name,
        detail: {
          en: `${party.note.en} Connected to ${client?.name.en ?? '—'}.`,
          ar: `${party.note.ar} ومرتبطة بـ«${client?.name.ar ?? '—'}».`,
        },
        href: client ? `/staff/clients/${client.id}` : null,
        reference: null,
        on: null,
      });
    }

    /* ---- Work the firm turned away -------------------------------------- */
    for (const declined of demoDeclinedEngagements) {
      if (!hit(declined.name)) continue;
      matches.push({
        id: `declined-${declined.id}`,
        kind: 'declined',
        name: declined.name,
        detail: declined.reason,
        // Nothing to open: a declined engagement never became a record.
        href: null,
        reference: null,
        on: addDays(today, -declined.declinedDaysAgo),
      });
    }

    return { matches, searched: true, registerSize };
  },

  /**
   * Add a person to the roster. A SESSION WRITE — see the store above.
   *
   * The record is created and it is real for as long as this server process
   * lives. What does NOT happen is the half that would leave the building:
   * §3.1 provisions staff with a temporary password, and none is generated,
   * shown or sent here. §5.1 calls that the split, and this is its first
   * instance — the row appears, the credential does not.
   *
   * ONE NAME, BOTH LOCALES. The form collects a single name and it is stored
   * for both, so an Arabic reader sees the Latin spelling on this row while
   * every seeded colleague has a proper Arabic name. That is the honest
   * outcome of a one-field form and it is visible rather than hidden behind a
   * transliteration nobody asked for.
   *
   * MOCK: Track A.5 captures both forms, or one plus a transliteration the
   * person can correct.
   */
  async addTeamMember(input: {
    name: string;
    email: string;
    rank: string;
  }): Promise<AddTeamMemberResult> {
    await latency();

    const name = input.name.trim();
    const email = input.email.trim().toLowerCase();

    if (!name) return { ok: false, error: 'nameRequired' };
    if (!email) return { ok: false, error: 'emailRequired' };
    // Deliberately loose: an address is validated by sending to it, and
    // nothing here sends. This catches a typo, not a spoof.
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { ok: false, error: 'emailInvalid' };
    }
    if (!email.endsWith(`@${demoFirm.domain}`)) {
      return { ok: false, error: 'emailDomain' };
    }
    if (allStaff().some((member) => member.email.toLowerCase() === email)) {
      return { ok: false, error: 'emailTaken' };
    }

    const rank = RANKS.find((value) => value === input.rank);
    if (!rank) return { ok: false, error: 'rankInvalid' };

    const member: StaffMember = {
      id: `stf-s${sessionStaff.length + 1}`,
      name: { en: name, ar: name },
      rank,
      email,
      // The state a provisioned account is in. NOT "invited" — §3.1.
      status: 'temporaryPasswordIssued',
      joinedDaysAgo: 0,
    };

    sessionStaff.push(member);

    const today = tenantToday();
    return {
      ok: true,
      member: {
        id: member.id,
        name: member.name,
        rank: member.rank,
        email: member.email,
        status: member.status,
        joinedOn: addDays(today, 0),
        // A person added a moment ago is on nothing, and the roster says so
        // rather than showing a hopeful zero-state as an assignment.
        openEngagements: 0,
        practiceAreas: [],
        isYou: false,
        addedThisSession: true,
      },
    };
  },

  /**
   * Start a document on an engagement.
   *
   * ===========================================================================
   * A CATEGORY 1 WRITE, AND ONE OF THE FEW THAT IS WHOLLY CATEGORY 1
   * ===========================================================================
   * BUILD_PLAN.md §5.1 names "new document" in its first category, and this is
   * the rare flow with no outbound half to split off. Adding a colleague issues
   * a credential; creating an invoice invites sending it; inviting a contact
   * mails them. Starting a draft asserts only that the firm has started one.
   *
   * Which is true precisely BECAUSE the record does not reach the client. It
   * lands in the firm's own collection (fixtures/documents.ts), which no
   * client-portal endpoint reads. Sharing it is the outbound act, and there is
   * no control for it anywhere in this flow.
   *
   * WHAT IT DOES NOT DO: generate a file. There is no document body in this
   * product — Document Canvas's header argues that at length, and it is why
   * accepting an AI suggestion is a permanent no-op. So this creates a record
   * of a document, not a document, and the screen says so rather than offering
   * a download of something that was never written.
   */
  async createDocument(input: {
    title: string;
    type: string;
    engagementRef: string;
  }): Promise<CreateDocumentResult> {
    await latency();

    const title = input.title.trim();
    if (!title) return { ok: false, error: 'titleRequired' };

    // Allow-list, never a deny-list — an unrecognised type is refused rather
    // than stored and rendered as a missing translation later.
    const type = DOCUMENT_TYPES.find((value) => value === input.type);
    if (!type) return { ok: false, error: 'typeInvalid' };

    // The engagement is pre-filled from the screen the dialog opened on, so a
    // reference that resolves to nothing means the caller invented one.
    const engagement = engagementIndex().get(input.engagementRef);
    if (!engagement) return { ok: false, error: 'engagementInvalid' };

    const document: FirmDocument = {
      id: `fdoc-s${sessionFirmDocuments.length + 1}`,
      title,
      type,
      engagementRef: input.engagementRef,
      createdDaysAgo: 0,
      firmId: demoFirm.id,
    };

    sessionFirmDocuments.push(document);

    const [record] = resolveFirmDocuments([document]);
    return { ok: true, document: record };
  },

  /**
   * What the signature-request screen starts from.
   *
   * ONLY SHARED DOCUMENTS, and only people who can already sign in. Both are
   * constraints of the situation rather than rules somebody chose: you cannot
   * ask for a signature on a file the signer cannot open, and you cannot ask a
   * person who has no way into the portal it lives in.
   *
   * The second one has a consequence worth leaving visible: four of the five
   * clients have nobody with portal access, so on their documents this screen
   * has nobody to offer. It says so rather than falling back to a free-text
   * address box, which would invent a route into a privileged file for somebody
   * nobody vetted.
   */
  async signatureRequestContext(documentId?: string): Promise<SignatureRequestContext> {
    await latency();

    const engagements = engagementIndex();

    const documents = demoSharedDocuments.flatMap((document) => {
      const engagement = engagements.get(document.engagementRef);
      if (!engagement) return [];
      return [
        {
          id: document.id,
          name: document.name,
          engagementRef: document.engagementRef,
          engagementTitle: engagement.title,
          clientId: engagement.clientId,
        },
      ];
    });

    const chosen = documents.find((document) => document.id === documentId);
    const contacts = chosen
      ? demoClientTeam
          .filter((member) => member.clientId === chosen.clientId)
          .map((member) => ({ id: member.id, name: member.name, email: member.email }))
      : [];

    return { documents, contacts, fields: SIGNATURE_FIELDS };
  },

  /**
   * Write down a signature request the firm intends to make.
   *
   * ===========================================================================
   * THE WRITE IS THE INTENTION. THE SEND IS NOT HERE.
   * ===========================================================================
   * BUILD_PLAN.md §5.1 category 1, and an unusually literal one: the record
   * asserts that somebody at the firm decided who to ask and what to ask for.
   * That is true the moment they do it.
   *
   * What it does NOT do is mark the document `awaitingSignature`. That status
   * drives the client portal's signing screen, so setting it would ask a client
   * to execute a document off the back of a form that sent nothing — see
   * fixtures/signatures.ts, which calls it the worst false state available in
   * this product because the client acts on it by signing.
   *
   * Sending is category 2 and is not built anywhere: there is no provider (see
   * fixtures/integrations.ts, which already says so on a shipped screen), and
   * BUILD_PLAN.md §6 puts that integration in Track B.
   */
  async saveSignatureRequest(input: {
    preparedById: string;
    documentId: string;
    signers: { contactId: string; fields: string[] }[];
    note: string;
  }): Promise<SaveSignatureRequestResult> {
    await latency();

    const document = demoSharedDocuments.find((row) => row.id === input.documentId);
    if (!document) return { ok: false, error: 'documentInvalid' };

    const engagement = engagementIndex().get(document.engagementRef);
    if (!engagement) return { ok: false, error: 'documentInvalid' };

    if (input.signers.length === 0) return { ok: false, error: 'noSigners' };

    const signers = [];
    for (const signer of input.signers) {
      // The contact must belong to THIS document's client. A roster id from
      // another organisation would be a signature request routed to a stranger.
      const contact = demoClientTeam.find(
        (member) => member.id === signer.contactId && member.clientId === engagement.clientId
      );
      if (!contact) return { ok: false, error: 'signerInvalid' };

      // Allow-list, never a deny-list.
      const fields = SIGNATURE_FIELDS.filter((value) => signer.fields.includes(value));
      if (fields.length === 0) return { ok: false, error: 'fieldsRequired' };

      signers.push({ contactId: contact.id, fields });
    }

    const request: SignatureRequest = {
      id: `sig-s${sessionSignatureRequests.length + 1}`,
      documentId: document.id,
      signers,
      note: input.note.trim(),
      preparedById: input.preparedById,
      preparedOn: tenantToday(),
    };

    sessionSignatureRequests.push(request);

    const [record] = resolveSignatureRequests([request]);
    return { ok: true, request: record };
  },

  /**
   * Who may be put in charge of a file.
   *
   * Partners and senior associates. Not everyone who records time: a paralegal
   * and a junior associate work ON a matter, and the fixtures show exactly that
   * — `demoSupportAssignments` puts them on files that somebody else leads.
   * Being responsible for a file is a different thing from working on it, and
   * the register's "lead" column means the first.
   */
  async leadOptions(): Promise<{ value: string; label: Record<Locale, string> }[]> {
    const backendData = await backendBridge.matters.leadOptions();
    if (backendData && Array.isArray(backendData)) {
      return backendData;
    }

    await latency();

    return allStaff()
      .filter((person) => LEAD_ELIGIBLE_RANKS.includes(person.rank))
      .filter((person) => person.status !== 'deactivated')
      .map((person) => ({ value: person.id, label: person.name }));
  },

  /**
   * Put one person in charge of several files at once.
   *
   * ===========================================================================
   * A BULK CATEGORY 1 WRITE, AND BULK IS WHY IT NEEDS SAYING
   * ===========================================================================
   * BUILD_PLAN.md §5.1 asks what the state ASSERTS. "Salem now leads these four
   * matters" is a record inside the firm's own workspace: nobody outside is
   * told, no client learns anything, and the firm really has decided it. So it
   * writes.
   *
   * What bulk adds is BLAST RADIUS. One mis-click here moves four files at
   * once, and the lead is read on the register, on a person's own dashboard, on
   * the client record and in search. That is why the reassignment goes through
   * `leadNameOf` rather than into four separate places, and why nothing is
   * written until every reference and the person have been checked — a partial
   * apply across a multi-select is worse than a refusal, because the reader
   * cannot see which half took.
   *
   * WHAT IT DOES NOT DO: tell anybody. Nobody is emailed, no task moves, and
   * the person who has just been made responsible for four files finds out
   * because somebody tells them. The screen says so.
   */
  async reassignLead(input: {
    references: string[];
    staffId: string;
  }): Promise<ReassignLeadResult> {
    await latency();

    if (input.references.length === 0) return { ok: false, error: 'noEngagements' };

    const person = staffIndex().get(input.staffId);
    if (!person || !LEAD_ELIGIBLE_RANKS.includes(person.rank) || person.status === 'deactivated') {
      return { ok: false, error: 'leadInvalid' };
    }

    // Checked in full BEFORE anything is written. See the header.
    const engagements = engagementIndex();
    for (const reference of input.references) {
      if (!engagements.has(reference)) return { ok: false, error: 'engagementInvalid' };
    }

    for (const reference of input.references) {
      sessionEngagementLeads.set(reference, person.id);
    }

    return { ok: true, changed: input.references.length, leadName: person.name };
  },

  /**
   * What the invoice builder starts from.
   *
   * THE UNBILLED TIME IS THE SAME LEDGER THE HOURS CARD SUMS. Not a parallel
   * list: `timeEntries` reads the one session store, so a line drawn here is
   * the entry somebody logged, and marking it billed is what stops it being
   * drawn again.
   *
   * NON-CHARGEABLE TIME IS NOT OFFERED. `billable: false` is a decision
   * somebody already took on the entry — the work was written off — and
   * surfacing it here as a candidate line would invite that decision to be
   * quietly reversed on the way to a client's statement.
   *
   * THERE ARE NO EXPENSES TO DRAW FROM. This product has no disbursement
   * ledger: nothing records a court fee paid on a client's behalf, a courier or
   * a translator. The builder therefore lets a line be added by hand, which is
   * what a firm without a disbursement system actually does, rather than
   * inventing an expense collection so that a button had something to read.
   */
  async invoiceDraftContext(engagementRef?: string): Promise<InvoiceDraftContext> {
    const backendData = await backendBridge.billing.invoiceDraftContext(engagementRef);
    if (backendData && backendData.engagements) {
      return backendData as InvoiceDraftContext;
    }

    await latency();

    const unbilled = engagementRef
      ? (await this.timeEntries({ engagementRef, unbilledOnly: true })).filter(
          (entry) => entry.billable
        )
      : [];

    return {
      engagements: engagementRefsAndTitles(),
      unbilled,
      currency: firmCurrency(),
      today: tenantToday(),
    };
  },

  /**
   * Save an assembled statement as a draft.
   *
   * ===========================================================================
   * THE WRITE IS CATEGORY 1; ISSUING IT IS NOT, AND IS NOT HERE
   * ===========================================================================
   * §5.1 splits this flow exactly where its first example says: assembling a
   * statement is a record inside the firm's own workspace, and "sending an
   * invoice" is the outbound half. So this stores a draft, and nothing in this
   * file turns a draft into an `Invoice`. The client portal cannot see it —
   * fixtures/invoices.ts sets out the structural reason.
   *
   * ===========================================================================
   * THE TOTAL IS NEVER ACCEPTED FROM THE CALLER
   * ===========================================================================
   * There is no `total` argument. It is summed from the lines when the draft is
   * read, the same way an issued statement's is — fixtures/invoices.ts calls a
   * stored total that disagrees with its own breakdown the worst thing in that
   * file to get wrong, and a builder that posted its own sum would be the most
   * likely way to produce one.
   *
   * ===========================================================================
   * EVERY LINE NEEDS AN AMOUNT
   * ===========================================================================
   * A draft is incomplete by nature, but a SAVED statement whose total omits
   * two of its own lines is not incomplete, it is wrong — and it is wrong in
   * the direction that under-bills the firm and looks correct. Lines may be
   * blank while somebody is editing; they may not be stored that way.
   *
   * ===========================================================================
   * AND THE TIME IS MARKED BILLED
   * ===========================================================================
   * Otherwise the same hour is offered to the next draft. Checked before
   * anything is written, so a draft that fails validation does not consume the
   * entries it named.
   */
  async saveInvoiceDraft(input: {
    preparedById: string;
    engagementRef: string;
    description: string;
    lines: { description: string; minutes: number | null; fromEntryIds: string[]; amount: number | null }[];
  }): Promise<SaveInvoiceDraftResult> {
    await latency();

    const engagement = engagementIndex().get(input.engagementRef);
    if (!engagement) return { ok: false, error: 'engagementInvalid' };

    const description = input.description.trim();
    if (!description) return { ok: false, error: 'descriptionRequired' };
    if (input.lines.length === 0) return { ok: false, error: 'noLines' };

    for (const line of input.lines) {
      if (!line.description.trim()) return { ok: false, error: 'lineDescriptionRequired' };
      if (line.amount === null || !Number.isFinite(line.amount) || line.amount <= 0) {
        return { ok: false, error: 'lineAmountRequired' };
      }
    }

    // Every entry named must still be unbilled. Two people assembling the same
    // file at once is not a hypothetical once this is a real API.
    const claimed = input.lines.flatMap((line) => line.fromEntryIds);
    const byId = new Map(sessionTimeEntries.map((entry) => [entry.id, entry]));
    for (const id of claimed) {
      const entry = byId.get(id);
      if (!entry || entry.billed) return { ok: false, error: 'entryAlreadyBilled' };
    }

    const draft: InvoiceDraft = {
      id: `draft-s${sessionInvoiceDrafts.length + 1}`,
      clientId: engagement.clientId,
      engagementRef: input.engagementRef,
      description,
      lines: input.lines.map((line, index) => ({
        id: `draft-s${sessionInvoiceDrafts.length + 1}-${index + 1}`,
        description: line.description.trim(),
        minutes: line.minutes,
        fromEntryIds: line.fromEntryIds,
        amount: line.amount,
      })),
      currency: firmCurrency(),
      createdOn: tenantToday(),
      preparedById: input.preparedById,
    };

    sessionInvoiceDrafts.push(draft);
    for (const id of claimed) {
      const entry = byId.get(id);
      if (entry) entry.billed = true;
    }

    const [record] = resolveInvoiceDrafts([draft]);
    return { ok: true, draft: record };
  },

  /**
   * Drafts assembled this session.
   *
   * Session-scoped and labelled as such wherever it is rendered, per §5.1.
   */
  async invoiceDrafts(): Promise<InvoiceDraftRecord[]> {
    const backendData = await backendBridge.billing.drafts();
    if (backendData && Array.isArray(backendData)) {
      return backendData as any;
    }

    await latency();
    return resolveInvoiceDrafts(sessionInvoiceDrafts);
  },

  /**
   * Matter and project counts across the firm's book.
   *
   * COUNTED FROM THE SAME ROWS every other screen reads. The export reports
   * "144 Total" matters and "64 Total" projects; there are six and four. A
   * bigger number would look better and would disagree with the matters list,
   * the client portal, global search and the notifications feed — see the
   * header of fixtures/practice.ts.
   */
  async practiceCounts(): Promise<PracticeCounts> {
    await latency();

    const pendingApprovals = demoApprovals.filter((row) => row.state === 'pending');

    // Open engagements per client, counted off the engagements themselves —
    // the same source the CRM counts from, so the two cannot disagree.
    const open = [...allMatters(), ...allProjects()].filter((row) => row.active);
    const busiest = allClients()
      .map((client) => ({
        ...client,
        open: open.filter((row) => row.clientId === client.id).length,
      }))
      .filter((client) => client.open > 0)
      .sort((a, b) => b.open - a.open || a.lastActivityDaysAgo - b.lastActivityDaysAgo)[0];

    return {
      matters: {
        total: allMatters().length,
        active: allMatters().filter((matter) => matter.active).length,
        needsAttention: allMatters().filter((matter) => matter.needsAttention).length,
        closed: allMatters().filter((matter) => !matter.active).length,
      },
      projects: {
        total: allProjects().length,
        active: allProjects().filter((project) => project.active).length,
        needsAttention: allProjects().filter((project) => project.needsAttention).length,
        completed: allProjects().filter((project) => !project.active).length,
      },
      approvals: {
        pending: pendingApprovals.length,
        overdue: pendingApprovals.filter((row) => row.dueInDays < 0).length,
        filingsOverdue: pendingApprovals.filter(
          (row) => row.kind === 'filing' && row.dueInDays < 0
        ).length,
      },
      busiestClient: busiest
        ? { id: busiest.id, name: busiest.name, engagements: busiest.open }
        : null,
    };
  },

  /** The engagements this person leads or supports. See `engagementsFor`. */
  async engagements(staffId: string): Promise<EngagementAssignment[]> {
    await latency();
    return engagementsFor(staffId);
  },

  /**
   * Work delegated TO this person, soonest first. Done items last.
   *
   * Urgency is the due date, computed here, and nothing else — see the header
   * of `demoTasks` for why there is no "Court Deadline" tone and no SLA banner.
   */
  async tasks(staffId: string): Promise<TaskRecord[]> {
    await latency();

    const today = tenantToday();
    const people = staffIndex();

    return demoTasks
      .filter((task) => task.assignedToId === staffId)
      .map((task) => {
        const person = people.get(task.assignedById);
        const dueOn = addDays(today, task.dueInDays);

        return {
          id: task.id,
          title: task.title,
          engagementRef: task.engagementRef,
          assignedBy: person?.name ?? UNKNOWN_NAME,
          assignedByRank: person?.rank ?? 'partner',
          assignedTo: people.get(task.assignedToId)?.name ?? UNKNOWN_NAME,
          dueOn,
          daysOverdue: task.state === 'done' ? 0 : daysBetween(dueOn, today),
          dueToday: task.state !== 'done' && task.dueInDays === 0,
          state: task.state,
        };
      })
      .sort((a, b) => {
        const done = (row: TaskRecord) => (row.state === 'done' ? 1 : 0);
        if (done(a) !== done(b)) return done(a) - done(b);
        return a.dueOn.localeCompare(b.dueOn);
      });
  },

  /**
   * The fee earners a legal secretary supports, with today's load counted from
   * the same functions their own dashboards read.
   *
   * `entriesToday` and `unreadForThem` are COUNTED, never stated. The export
   * writes "3 meetings today" beside a person whose calendar it never consults,
   * and a presence line — "In Meeting until 11:00", "Available in Chamber 4B" —
   * for a presence system this product does not have.
   */
  async supportedStaff(secretaryId: string): Promise<SupportedPerson[]> {
    await latency();

    const people = staffIndex();
    const mine = new Set(
      demoSecretaryAssignments
        .filter((row) => row.secretaryId === secretaryId)
        .map((row) => row.staffId)
    );

    return [...mine]
      .map((staffId) => {
        const person = people.get(staffId);
        if (!person) {
          throw new MockApiError(`Secretary assignment names unknown staff ${staffId}.`);
        }

        const engagementRefs = new Set(engagementsFor(staffId).map((row) => row.reference));

        const meetingsToday = demoFirmEvents.filter(
          (event) =>
            event.attendeeIds.includes(staffId) &&
            meetingDate(event.inDays, tenantToday()) === tenantToday()
        ).length;

        const hearingsToday = [...allMatters(), ...allProjects()]
          .filter((engagement) => engagement.active && engagementRefs.has(engagement.reference))
          .reduce(
            (running, engagement) =>
              running +
              engagement.timeline.filter((event) => !event.completed && event.inDays === 0).length,
            0
          );

        return {
          id: person.id,
          name: person.name,
          rank: person.rank,
          entriesToday: meetingsToday + hearingsToday,
          unreadForThem: demoInbox.filter((item) => item.toId === staffId && item.unread).length,
        };
      })
      .sort((a, b) => RANKS.indexOf(a.rank) - RANKS.indexOf(b.rank));
  },

  /**
   * Record time against a file.
   *
   * ===========================================================================
   * A CATEGORY 1 WRITE THAT MOVES A NUMBER SOMEBODY ELSE IS READING
   * ===========================================================================
   * BUILD_PLAN.md §5.1's first category — a record inside the firm's own
   * workspace. Nothing leaves the building: the client is not told, no invoice
   * is raised, and the entry is not money until somebody prices it.
   *
   * What makes this one different from the roster or a new document is that the
   * record feeds an EXISTING figure. `billing()` sums the stated weekly
   * baseline plus session entries, so an hour logged here moves the hours card
   * on the dashboard by an hour. A write that populated only its own list would
   * have been a fifth place for hours to live and a fifth place to disagree.
   *
   * ===========================================================================
   * NO RATE, AND THEREFORE NO AMOUNT
   * ===========================================================================
   * fixtures/practice.ts sets this out over `TimeEntry`: there is no rate card
   * in this product, `DEFAULT_HOURLY_RATES` is an editable onboarding seed
   * rather than the firm's charge-out rate, and the firm-side billing header
   * already refused the WIP figure and the realization rate for the same
   * reason. Hours without a rate are not money, so this stores hours.
   *
   * ===========================================================================
   * THE DATE IS BOUNDED AT BOTH ENDS, IN THE TENANT'S ZONE
   * ===========================================================================
   * Not in the browser's. A user in Dubai at 00:30 is already on tomorrow by
   * their own clock, and a "today" taken from their machine would let them
   * record work on a day the Cairo firm has not reached. The ceiling is
   * `tenantToday()`, computed here, and the form is handed the same value
   * rather than computing its own.
   *
   * The floor is the chart's window. An entry older than that is real work, but
   * it has nowhere to appear on any screen this product has — and a write that
   * lands somewhere invisible is indistinguishable from one that failed.
   */
  async logTime(input: {
    staffId: string;
    engagementRef: string;
    on: string;
    minutes: number;
    description: string;
    /** No default. `null` means the person did not choose — see the modal. */
    billable: boolean | null;
  }): Promise<LogTimeResult> {
    const backendData = await backendBridge.billing.logTime({
      engagementRef: input.engagementRef,
      minutes: input.minutes,
      description: input.description,
      billable: input.billable,
      entryDate: input.on,
    });
    if (backendData && backendData.ok) {
      return { ok: true, entry: backendData.entry as any };
    }

    await latency();

    const person = staffIndex().get(input.staffId);
    if (!person || !recordsTime(person.rank)) return { ok: false, error: 'notPermitted' };

    const engagement = engagementIndex().get(input.engagementRef);
    if (!engagement) return { ok: false, error: 'engagementInvalid' };

    const today = tenantToday();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.on)) return { ok: false, error: 'dateRequired' };
    // Strictly after today, in the tenant's zone. Time not yet worked is not
    // time, and a forward-dated entry is the shape a padded bill takes.
    if (daysBetween(today, input.on) > 0) return { ok: false, error: 'dateFuture' };
    if (daysBetween(input.on, today) >= HOURS_CHART_WEEKS * 7) {
      return { ok: false, error: 'dateTooOld' };
    }

    const minutes = Math.round(input.minutes);
    if (!Number.isFinite(minutes) || minutes <= 0) return { ok: false, error: 'durationRequired' };

    const description = input.description.trim();
    if (!description) return { ok: false, error: 'descriptionRequired' };

    // Not defaulted in the data layer either. A boolean arriving as `null`
    // means nobody chose, and choosing for them is how unbillable time ends up
    // on a client's statement.
    if (input.billable === null) return { ok: false, error: 'billableRequired' };

    const entry: TimeEntry = {
      id: `time-s${sessionTimeEntries.length + 1}`,
      staffId: input.staffId,
      engagementRef: input.engagementRef,
      on: input.on,
      minutes,
      description,
      billable: input.billable,
      billed: false,
    };

    sessionTimeEntries.push(entry);

    const [record] = resolveTimeEntries([entry]);
    return { ok: true, entry: record };
  },

  /**
   * What a screen needs to offer the time dialog, or `null` for a rank that
   * records no time.
   *
   * ONE CALL AND ONE GATE. The matter route and the project route both render
   * the same shared view, and both would otherwise have had to know the
   * allow-list, the tenant's today and the chart's window — three chances for
   * two screens to disagree. `null` rather than a flag beside the payload,
   * because a rank that cannot log time has no use for any of it.
   */
  async timeEntryContext(): Promise<{
    engagements: { value: string; label: Record<Locale, string> }[];
    today: CalendarDate;
    weeksShown: number;
  } | null> {
    await latency();

    const me = await this.currentStaff();
    if (!recordsTime(me.rank)) return null;

    return {
      engagements: engagementRefsAndTitles(),
      today: tenantToday(),
      weeksShown: HOURS_CHART_WEEKS,
    };
  },

  /**
   * The time ledger, filtered.
   *
   * Reads the same session store `billing()` sums, so the list and the chart
   * cannot disagree — the defect this file spends most of its headers avoiding.
   */
  async timeEntries(
    options: { staffId?: string; engagementRef?: string; clientId?: string; unbilledOnly?: boolean } = {}
  ): Promise<TimeEntryRecord[]> {
    const backendData = await backendBridge.billing.timeEntries(options);
    if (backendData && Array.isArray(backendData)) {
      return backendData as TimeEntryRecord[];
    }

    await latency();

    return resolveTimeEntries(allTimeEntries()).filter((entry) => {
      if (options.staffId && entry.staffId !== options.staffId) return false;
      if (options.engagementRef && entry.engagementRef !== options.engagementRef) return false;
      if (options.clientId && entry.clientId !== options.clientId) return false;
      if (options.unbilledOnly && entry.billed) return false;
      return true;
    });
  },

  /**
   * Hours recorded by this person, by week. See the MOCK note on
   * `demoWeeklyHours`.
   *
   * Throws for a rank that does not record time rather than returning zeroes.
   * A legal secretary has no hours row, and an hours card reading 0 beside a
   * target is a performance score invented by a layout — see `RANKS_THAT_BILL`.
   */
  async billing(staffId: string): Promise<BillingSummary> {
    await latency();

    const person = staffIndex().get(staffId);
    if (!person) throw new MockApiError(`No staff member ${staffId}.`);
    if (!recordsTime(person.rank)) {
      throw new MockApiError(`${person.rank} does not record billable time.`);
    }

    const baseline = demoWeeklyHours[staffId];
    if (!baseline) throw new MockApiError(`No recorded hours for ${staffId}.`);

    const today = tenantToday();
    const mine = sessionTimeEntries.filter((entry) => entry.staffId === staffId);

    // Added ON TOP of the stated baseline, never replacing it — fixtures/
    // practice.ts explains why the two must not be reconciled the other way.
    const weeks = baseline.map((hours, index) => {
      // Bucket 0 is the oldest week; the last is the seven days ending today.
      const weeksBack = baseline.length - 1 - index;
      const minutes = mine
        .filter((entry) => {
          const age = daysBetween(entry.on, today);
          return age >= weeksBack * 7 && age < (weeksBack + 1) * 7;
        })
        .reduce((running, entry) => running + entry.minutes, 0);

      return hours + minutes / 60;
    });

    return {
      weeks,
      total: weeks.reduce((running, hours) => running + hours, 0),
      targetPerWeek: WEEKLY_HOURS_TARGET,
      loggedThisSession: {
        entries: mine.length,
        minutes: mine.reduce((running, entry) => running + entry.minutes, 0),
      },
      weeksShown: HOURS_CHART_WEEKS,
      today,
      // Every engagement, not only this person's. A paralegal drafted into
      // somebody else's hearing bundle for an afternoon still has to record it,
      // and a list scoped to their own files would leave them nowhere to put it.
      engagements: engagementRefsAndTitles(),
    };
  },
};


export const keyDates = {
  /**
   * Dates falling due in the next `withinDays`, drawn from both matters and
   * projects and merged into one chronological list.
   *
   * The window is applied rather than assumed. The Stitch export stated "4
   * dates in the next 30 days" above a hand-written list of four — a caption
   * that would keep claiming four however many the data held. Here the caption
   * reports what this function returned.
   *
   * MOCK: replace with GET /api/key-dates?within=30 — a union over hearings,
   * filing deadlines and registry dates, computed in the database against the
   * tenant's timezone rather than by loading every engagement and filtering in
   * memory. Track A.5.
   */
  async upcoming(withinDays = 30): Promise<KeyDate[]> {
    await latency();
    const today = tenantToday();

    return [
      ...upcomingKeyDates(clientMatters(), 'matter', today, withinDays),
      ...upcomingKeyDates(clientProjects(), 'project', today, withinDays),
    ].sort((a, b) => a.date.localeCompare(b.date));
  },
};

export const documents = {
  /**
   * Documents the firm has shared with this client, newest first, filtered, with
   * the counts behind every filter.
   *
   * Counts travel with the rows for the third time in this file, and the reason
   * has not changed: the export's library states its total THREE times — a
   * toolbar chip reading "8 legal documents available", a pill reading "All
   * (8)", and a footer reading "Showing 8 of 8 shared legal files" — each from
   * its own hardcoded literal. Three literals eventually disagree. One pass over
   * the collection makes that unrepresentable, and the screen states the number
   * once.
   *
   * MOCK: replace with GET /api/documents?shared=true&status=&page=. The share
   * relationship must be the query's SUBJECT, not a filter applied after loading
   * the firm's DMS — see fixtures/documents.ts. The free-text search, the
   * engagement filter and the file-type filter are applied in the browser today,
   * which is right over eight rows and wrong over eight hundred; the real
   * endpoint takes all three. Track A.5.
   */
  async listShared({
    filter = 'all',
    page = 1,
    pageSize = 25,
  }: { filter?: DocumentFilter; page?: number; pageSize?: number } = {}): Promise<DocumentListResult> {
    await latency();

    let backendDocs: any[] = [];
    try {
      backendDocs = await backendBridge.documents.listClient();
    } catch {
      backendDocs = [];
    }

    const today = tenantToday();
    const dbDocs: SharedDocumentRecord[] = (backendDocs || []).map((d: any) => {
      const eng = engagementIndex().get(d.engagement_ref);
      return {
        id: d.id,
        name: d.name,
        kind: d.kind,
        sizeBytes: d.size_bytes,
        sharedDaysAgo: 0,
        sharedOn: d.created_at ? d.created_at.split(' ')[0] : today,
        engagementRef: d.engagement_ref || 'MAT-2201',
        status: (d.status || 'final') as DocumentStatus,
        versions: [],
        firmId: 'firm-001',
        needsSignature: d.status === 'awaitingSignature',
        engagementKind: (eng?.kind || 'matter') as any,
        engagementTitle: eng?.title || { en: d.title, ar: d.title },
        downloadUrl: `http://127.0.0.1:8000${d.download_url}`,
      };
    });

    const all = [...dbDocs, ...clientDocuments()];
    const rows = filter === 'all' ? all : all.filter((document) => document.status === filter);

    return {
      ...paged(rows, page, pageSize),
      counts: {
        all: all.length,
        awaitingSignature: all.filter((d) => d.status === 'awaitingSignature').length,
        draft: all.filter((d) => d.status === 'draft').length,
        final: all.filter((d) => d.status === 'final').length,
      },
    };
  },

  /**
   * The engagements and file types actually present in the collection, for the
   * library's two dropdowns.
   *
   * Derived from the data for the third time as well. Both exports hardcode
   * their options and both overreach: the file-type control is labelled "All
   * File Types (PDF, DOCX, XLSX, Scans)" over a collection holding no
   * spreadsheet and no scan, and the Arabic engagement dropdown writes out four
   * engagements by hand. A dropdown that offers a filter returning nothing is a
   * dropdown that has stopped describing the data.
   *
   * One call rather than two because it is one facet query, and because two
   * would be two round trips to populate one toolbar.
   *
   * MOCK: replace with a facet query — computed alongside the list in the
   * database, not by loading every document to look at it. Track A.5.
   */
  /**
   * One shared document, or `null` when the id names nothing.
   *
   * `null` rather than a throw, so the route can call `notFound()` itself —
   * see EngagementNotFound.tsx for why an unreachable document and a document
   * that is not this client's must produce exactly the same response.
   *
   * MOCK: replace with GET /api/documents/:id, scoped server-side to the
   * authenticated client. Track A.5.
   */
  async getById(id: string): Promise<SharedDocumentRecord | null> {
    await latency();
    return clientDocuments().find((document) => document.id === id) ?? null;
  },

  async facets(): Promise<DocumentFacets> {
    await latency();

    const all = clientDocuments();
    const engagements = new Map<string, DocumentFacets['engagements'][number]>();

    for (const document of all) {
      if (engagements.has(document.engagementRef)) continue;
      engagements.set(document.engagementRef, {
        reference: document.engagementRef,
        kind: document.engagementKind,
        title: document.engagementTitle,
      });
    }

    return {
      engagements: [...engagements.values()].sort((a, b) =>
        a.reference.localeCompare(b.reference)
      ),
      kinds: [...new Set(all.map((document) => document.kind))].sort(),
    };
  },
};

export const invoices = {
  /**
   * The client's fee statements, newest first, filtered, with the counts behind
   * every filter.
   *
   * Counts travel with the rows for the fourth time in this file. The invoices
   * export earns it: its summary strip states "3 Invoices settled / paid
   * ($40,000.00)" beside a table whose own settled rows add up to $50,000, and
   * the Arabic and English versions of the SAME five invoices disagree about
   * two of their amounts, two of their due dates and one of their engagements.
   * Every figure on this screen now comes from one pass over one collection.
   *
   * MOCK: replace with GET /api/invoices?status=&page=. The free-text search and
   * the engagement filter are applied in the browser today, which is right over
   * five rows and wrong over five thousand. Track A.5.
   */
  async list({
    filter = 'all',
    page = 1,
    pageSize = 25,
  }: { filter?: InvoiceFilter; page?: number; pageSize?: number } = {}): Promise<InvoiceListResult> {
    const backendData = await backendBridge.billing.clientInvoices({ filter, page, pageSize });
    if (backendData && backendData.items) {
      return backendData as InvoiceListResult;
    }

    await latency();

    const all = clientInvoices();
    const rows = filter === 'all' ? all : all.filter((invoice) => invoice.status === filter);

    return {
      ...paged(rows, page, pageSize),
      counts: {
        all: all.length,
        overdue: all.filter((invoice) => invoice.status === 'overdue').length,
        due: all.filter((invoice) => invoice.status === 'due').length,
        paid: all.filter((invoice) => invoice.status === 'paid').length,
      },
    };
  },

  /**
   * One fee statement, with its line items.
   *
   * MOCK: replace with GET /api/invoices/:reference. The reference must be
   * resolved server-side against the authenticated client's OWN ledger — a
   * lookup that trusts the URL is how one client reads another's fees, and an
   * invoice discloses what a firm charges and what work it did. Track A
   * performs no such check. Track A.5.
   */
  async getByReference(reference: string): Promise<InvoiceRecord | null> {
    const backendData = await backendBridge.billing.clientInvoice(reference);
    if (backendData && backendData.reference) {
      return backendData as InvoiceRecord;
    }

    await latency();

    return (
      clientInvoices().find(
        (invoice) => invoice.reference.toLowerCase() === reference.toLowerCase()
      ) ?? null
    );
  },

  /**
   * Balance due and the counts behind it.
   *
   * MOCK: replace with GET /api/invoices/summary, computed in the database.
   * Summing on the client is fine over five fixtures and wrong over a real
   * ledger — both for correctness under pagination and because the total is
   * itself a disclosure that has to be access-controlled on its own. Track A.5.
   */
  async summary(): Promise<InvoiceSummary> {
    const backendData = await backendBridge.billing.clientInvoiceSummary();
    if (backendData && backendData.currency) {
      return backendData as InvoiceSummary;
    }

    await latency();

    const all = clientInvoices();
    const unpaid = all.filter((invoice) => invoice.status !== 'paid');
    const overdue = all.filter((invoice) => invoice.status === 'overdue');
    const settled = all.filter((invoice) => invoice.status === 'paid');
    const sum = (rows: InvoiceRecord[]) => rows.reduce((total, row) => total + row.amount, 0);

    return {
      balanceDue: sum(unpaid),
      // MOCK: one currency across the workspace, chosen in the onboarding
      // wizard's billing step. A real summary over mixed currencies cannot be a
      // single number and must not be flattened into one.
      currency: unpaid[0]?.currency ?? all[0]?.currency ?? demoInvoices[0].currency,
      outstandingCount: unpaid.length,
      overdueTotal: sum(overdue),
      overdueCount: overdue.length,
      paidTotal: sum(settled),
      paidCount: settled.length,
    };
  },

  /**
   * The engagements that actually carry an invoice, for the list's dropdown.
   *
   * Derived from the ledger, so the control cannot offer an engagement with no
   * fees on it. Both exports hardcode their options and both overreach — the
   * English one lists MAT-1875, which has no invoice in its own table.
   *
   * MOCK: replace with a facet query computed alongside the list. Track A.5.
   */
  async engagements(): Promise<
    { reference: string; kind: 'matter' | 'project'; title: Record<Locale, string> }[]
  > {
    const backendData = await backendBridge.billing.clientInvoiceEngagements();
    if (backendData && Array.isArray(backendData) && backendData.length > 0) {
      return backendData as any;
    }

    await latency();

    const seen = new Map<
      string,
      { reference: string; kind: 'matter' | 'project'; title: Record<Locale, string> }
    >();

    for (const invoice of clientInvoices()) {
      if (seen.has(invoice.engagementRef)) continue;
      seen.set(invoice.engagementRef, {
        reference: invoice.engagementRef,
        kind: invoice.engagementKind,
        title: invoice.engagementTitle,
      });
    }

    return [...seen.values()].sort((a, b) => a.reference.localeCompare(b.reference));
  },
};

/**
 * Resolve every thread: messages onto the tenant's calendar, engagement joined
 * on, summary line taken from the last message.
 *
 * Shared by the dashboard preview and the Messages screen so the card and the
 * inbox cannot show two different "latest" lines for the same thread.
 */
function resolveMessageThreads(): MessageThreadRecord[] {
  const today = tenantToday();
  const engagements = engagementIndex();

  return demoMessageThreads
    .flatMap((thread) => {
      const engagement = engagements.get(thread.engagementRef);
      if (!engagement) return [];

      // Oldest first — a conversation reads forwards, the same way an
      // engagement's timeline does.
      const resolved: MessageRecord[] = thread.messages
        .map((message) => ({ ...message, sentOn: addDays(today, -message.sentDaysAgo) }))
        .sort((a, b) =>
          a.sentOn === b.sentOn
            ? a.sentAt.localeCompare(b.sentAt)
            : a.sentOn.localeCompare(b.sentOn)
        );

      const latest = resolved[resolved.length - 1];
      if (!latest) return [];

      return [
        {
          ...thread,
          messages: resolved,
          preview: latest.body,
          sentOn: latest.sentOn,
          sentAt: latest.sentAt,
          engagementKind: engagement.kind,
          engagementTitle: engagement.title,
        },
      ];
    })
    // Newest thread first in the list, which is the reverse of the order
    // messages read inside one.
    .sort((a, b) =>
      a.sentOn === b.sentOn ? b.sentAt.localeCompare(a.sentAt) : b.sentOn.localeCompare(a.sentOn)
    );
}

export const messages = {
  /**
   * Recent threads plus the unread count, in one call.
   *
   * Deliberately not two functions. The count and the list have to agree, and
   * fetching them separately is how a dashboard ends up showing "2 unread"
   * above a list where three are bold.
   *
   * MOCK: replace with GET /api/messages?limit=n. Unread state is per-account
   * in the real schema — see fixtures/messages.ts. Track A.5.
   */
  async overview(previewLimit = 2): Promise<{
    threads: MessageThreadRecord[];
    total: number;
    unreadCount: number;
  }> {
    await latency();
    const records = clientThreads();

    return {
      threads: records.slice(0, previewLimit),
      total: records.length,
      unreadCount: records.filter((thread) => thread.unread).length,
    };
  },

  /**
   * Every thread, newest first, with its full exchange.
   *
   * The whole conversation comes back with the list rather than being fetched
   * per thread, because Track A's data is five threads in a file. That is NOT
   * what the real endpoint should do.
   *
   * MOCK: replace with GET /api/messages for the thread summaries and GET
   * /api/messages/:id for one thread's exchange. Message bodies are the most
   * sensitive content in the portal — privileged correspondence about live
   * proceedings — so the real list endpoint returns summaries only, and a
   * thread's messages are fetched when it is opened, behind a check that the
   * thread belongs to the authenticated client. Shipping every client's whole
   * correspondence to the browser on page load would be the disclosure the
   * per-thread route exists to prevent. Track A.5.
   */
  async list(): Promise<{ threads: MessageThreadRecord[]; unreadCount: number }> {
    await latency();
    const threads = clientThreads();

    return {
      threads,
      unreadCount: threads.filter((thread) => thread.unread).length,
    };
  },

  /**
   * One thread, by id.
   *
   * MOCK: replace with GET /api/messages/:id, resolved server-side against the
   * authenticated client's own threads. Track A returns the fixture to anyone.
   *
   * There is deliberately no `markRead` beside this. Marking a thread read is a
   * WRITE, and this layer has none — every endpoint in this file reads. Faking
   * one in client state would produce a badge that clears on open and comes back
   * on reload, which is worse than a badge that does not move. See the note in
   * the Messages screen. Track A.5 adds the mutation with the real per-account
   * read cursor.
   */
  async getThread(id: string): Promise<MessageThreadRecord | null> {
    await latency();
    return clientThreads().find((thread) => thread.id === id) ?? null;
  },
};

/**
 * Shared by every invoice endpoint, and by the matter and project detail views,
 * so no two of them can disagree about what an invoice says.
 *
 * Orphans are dropped for the same reason documents' are: the real version is a
 * join, and a fee statement pointing at an engagement the client does not have
 * is the wrong thing to render.
 */
/* ===========================================================================
 * Invoice drafts
 * ===========================================================================
 * A SEPARATE COLLECTION, AND `resolveInvoices()` BELOW DOES NOT NAME IT.
 * fixtures/invoices.ts argues why at length; the operative consequence is that
 * the client portal's /invoices reads `demoInvoices` through that function, so
 * there is no query in this file that can return a draft to a client. Issuing
 * one is BUILD_PLAN.md §5.1's first example of a category 2 act, and nothing
 * here performs it.
 * ======================================================================== */

const SESSION_DRAFTS_KEY = Symbol.for('synqanun.mock.sessionInvoiceDrafts');
const sessionInvoiceDrafts: InvoiceDraft[] = ((globalThis as Record<symbol, unknown>)[
  SESSION_DRAFTS_KEY
] ??= []) as InvoiceDraft[];

/** A draft line, resolved. `amount` is non-null once saved — see the fixture. */
export interface InvoiceDraftLineRecord extends InvoiceDraftLine {
  amount: number;
}

/** A saved draft, with its total derived and its engagement joined. */
export interface InvoiceDraftRecord {
  id: string;
  clientId: string;
  clientName: Record<Locale, string>;
  engagementRef: string;
  engagementKind: 'matter' | 'project';
  engagementTitle: Record<Locale, string>;
  description: string;
  lines: InvoiceDraftLineRecord[];
  /** The SUM of `lines`. Never stored — fixtures/invoices.ts, on why. */
  total: number;
  currency: string;
  createdOn: CalendarDate;
  preparedBy: Record<Locale, string>;
}

/**
 * What a draft invoice is priced in.
 *
 * DERIVED FROM THE STATEMENTS THE FIRM HAS ALREADY ISSUED, not chosen in the
 * builder. fixtures/invoices.ts says the real thing is the firm's invoicing
 * currency, picked once in the onboarding wizard and applied workspace-wide;
 * a per-draft picker would invent a capability the product does not have and
 * would let two statements to the same client be raised in two currencies.
 *
 * Throws if the seeded statements ever disagree, rather than picking the first
 * one — a firm billing in two currencies is a real situation and this function
 * would be quietly wrong about it.
 */
function firmCurrency(): string {
  const currencies = new Set(demoInvoices.map((invoice) => invoice.currency));
  if (currencies.size !== 1) {
    throw new MockApiError('The firm has statements in more than one currency.');
  }
  return [...currencies][0];
}

function resolveInvoiceDrafts(source: InvoiceDraft[]): InvoiceDraftRecord[] {
  const engagements = engagementIndex();
  const clients = new Map(allClients().map((row) => [row.id, row]));
  const people = staffIndex();

  return source
    .flatMap((draft) => {
      const engagement = engagements.get(draft.engagementRef);
      if (!engagement) return [];

      const lines = draft.lines.map((line) => ({
        ...line,
        // Non-null by the time a draft is stored; `saveInvoiceDraft` refuses a
        // line without one, for the reason the fixture gives.
        amount: line.amount ?? 0,
      }));

      return [
        {
          id: draft.id,
          clientId: draft.clientId,
          clientName: clients.get(draft.clientId)?.name ?? UNKNOWN_NAME,
          engagementRef: draft.engagementRef,
          engagementKind: engagement.kind,
          engagementTitle: engagement.title,
          description: draft.description,
          lines,
          total: lines.reduce((running, line) => running + line.amount, 0),
          currency: draft.currency,
          createdOn: draft.createdOn,
          preparedBy: people.get(draft.preparedById)?.name ?? UNKNOWN_NAME,
        },
      ];
    })
    .sort((a, b) => b.createdOn.localeCompare(a.createdOn) || a.id.localeCompare(b.id));
}

function resolveInvoices(): InvoiceRecord[] {
  const today = tenantToday();
  const engagements = engagementIndex();

  return demoInvoices
    .flatMap((invoice) => {
      const engagement = engagements.get(invoice.engagementRef);
      if (!engagement) return [];

      const issuedOn = addDays(today, -invoice.issuedDaysAgo);
      const paidOn = invoice.paidDaysAgo === null ? null : addDays(today, -invoice.paidDaysAgo);

      return [
        {
          ...invoice,
          // The year comes from the issue date, not from the clock — an invoice
          // raised in December keeps its year when read in January.
          reference: `INV-${yearOf(issuedOn)}-${invoice.sequence}`,
          amount: invoice.lineItems.reduce((total, item) => total + item.amount, 0),
          // Settled wins over past-due: an invoice paid late is PAID, not
          // overdue. That ordering is the whole reason `paidOn` is its own
          // field rather than something inferred from the due date.
          status: (paidOn !== null
            ? 'paid'
            : invoice.dueInDays < 0
              ? 'overdue'
              : 'due') as InvoiceStatus,
          issuedOn,
          dueOn: addDays(today, invoice.dueInDays),
          paidOn,
          engagementKind: engagement.kind,
          engagementTitle: engagement.title,
        },
      ];
    })
    .sort((a, b) => b.issuedOn.localeCompare(a.issuedOn));
}

/**
 * The client's own account settings.
 *
 * EVERY ENDPOINT HERE IS A READ, AND SETTINGS IS A WRITE SCREEN
 * ---------------------------------------------------------------------------
 * That mismatch is the defining fact about this screen rather than an oversight.
 * lib/mock-api.ts has no mutations at all — by the convention at the top of this
 * file, a fake write would have to say what the real one does, and a fake write
 * that returns `{ ok: true }` while changing nothing is the one shape that
 * cannot say it honestly: the screen would look saved and reload unchanged.
 *
 * So Settings reads its values from here, edits them locally, and says plainly
 * that nothing is saved. Track A.5 adds PATCH endpoints with real persistence,
 * and that is when the screen's Save button starts meaning something.
 */
export const settings = {
  /**
   * People at the client's own organisation with portal access.
   *
   * MOCK: replace with GET /api/client/team — scoped server-side to the
   * authenticated account's organisation. See fixtures/accounts.ts. Track A.5.
   */
  async team(): Promise<ClientTeamMember[]> {
    await latency();
    // Scoped on the SIGNED-IN ACCOUNT's own organisation rather than returned
    // whole. A roster is a list of who may read privileged files, so the filter
    // is the feature — and it only became expressible when `clientId` landed on
    // the member record (fixtures/accounts.ts).
    return demoClientTeam.filter((member) => member.clientId === demoClientAccount.clientId);
  },

  /**
   * Which categories email the client.
   *
   * MOCK: replace with GET /api/client/preferences, stored per account rather
   * than per organisation. See fixtures/settings.ts. Track A.5.
   */
  async notifications(): Promise<NotificationPreference[]> {
    await latency();
    return demoNotificationPreferences;
  },
};

/*
 * Password reset lives in its own module now, because three of its callers are
 * Client Components and this file is server-only. Re-exported here so every
 * server call site keeps reading `mockApi.passwordReset` — see
 * lib/password-reset.ts for the whole argument.
 */
export { passwordReset, RESET_LINK_TTL_MINUTES } from './password-reset';

/**
 * Namespace re-export, so call sites read `mockApi.firm.get()` and a later
 * find-and-replace to a real client is mechanical.
 */
export const mockApi = {
  firm,
  invites,
  passwordReset,
  session,
  matters,
  projects,
  engagements,
  consultations,
  search,
  notifications,
  staff,
  keyDates,
  documents,
  invoices,
  messages,
  settings,
};
