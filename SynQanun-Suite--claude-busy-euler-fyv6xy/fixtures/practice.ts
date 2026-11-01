import { demoFirm } from './firm';
import type { ClockTime } from '@/lib/format';
import type { Locale } from '@/lib/i18n/routing';
import type { Rank } from '@/lib/ranks';

/**
 * fixtures/practice.ts — the firm's own side of the product.
 *
 * WHY THIS FILE IS SEPARATE FROM THE OTHERS
 * ---------------------------------------------------------------------------
 * Everything in /fixtures so far is data a CLIENT may see. design.md §11 item 6
 * limits the client portal to "shared documents, invoices, matter status only,
 * no internal firm data", and every MOCK note in lib/mock-api.ts says the real
 * query must enforce that server-side.
 *
 * This file is the other half: who works here, what is waiting on a partner,
 * what came into the firm's inbox, who the firm's clients are. None of it may
 * ever reach a client-portal screen, and keeping it in its own file is the
 * cheapest way to make an accidental import visible in review.
 *
 * WHAT IS DELIBERATELY NOT HERE: FIRM-WIDE COUNTS
 * ---------------------------------------------------------------------------
 * The Stitch export's Partner Dashboard reports "144 Total" matters and "64
 * Total" projects, and its Matters directory claims 142. There are no such
 * records. The demo firm's book is fixtures/matters.ts and
 * fixtures/projects.ts — nine matters and six projects — and every firm-side
 * count is taken from those, so the dashboard, the matters directory, the CRM,
 * global search and the notification feed cannot disagree.
 *
 * A bigger number would look better and would be the same move the export makes
 * everywhere else: a figure with nothing behind it. Nine is true.
 *
 * MOCK: in production these collections are the firm's whole practice, scoped
 * by tenant and filtered by the viewer's rank. Track A.5.
 */

/* ===========================================================================
 * People
 * ======================================================================== */

/**
 * Whether the person can sign in, and how far through provisioning they are.
 *
 * EXACTLY THE THREE VALUES BUILD_PLAN.md §3.1 SPECIFIES, and the omission is
 * the important part: there is no "invited — pending" state for staff.
 *
 * §3.1 replaced the staff invite flow with a temporary password: one is
 * generated when a person is added, they sign in with it at the Firm Gateway,
 * and they change it through the ordinary reset flow whenever they choose.
 * So a newly added person is not "awaiting acceptance" of anything — their
 * account exists and works. `temporaryPasswordIssued` says the credential has
 * not been replaced yet, which is a fact about the password, not a pending
 * invitation.
 *
 * The token-and-expiry invite flow in fixtures/invites.ts is CLIENT-side only.
 * §3.1: "Do not reuse it for staff."
 */
export type StaffAccountStatus =
  /** Signed in and working. */
  | 'active'
  /** Provisioned; still using the temporary password they were given. */
  | 'temporaryPasswordIssued'
  /** Access withdrawn. The person and their history stay on the record. */
  | 'deactivated';

export interface StaffMember {
  id: string;
  /**
   * Display name, per locale. NO HONORIFIC and no gender field — see the note
   * on `EngagementContact.name`. The rank below supplies the standing.
   */
  name: Record<Locale, string>;
  rank: Rank;
  email: string;
  status: StaffAccountStatus;
  /**
   * Days before the tenant's today that they joined the firm.
   *
   * Relative like every other date in these fixtures, so the roster does not
   * quietly age into a demo where the newest hire arrived four years ago.
   */
  joinedDaysAgo: number;
}

/**
 * The firm's fee earners.
 *
 * These are the same people the client-facing fixtures already name as lead
 * counsel and project leads, given their rank explicitly — so a partner looking
 * at "submitted by" sees someone who exists elsewhere in the product rather
 * than a name invented for this screen. The export invents four.
 */
export const demoStaff: StaffMember[] = [
  {
    id: 'stf-001',
    name: { en: 'Mansoor Al-Farooq', ar: 'منصور الفاروق' },
    rank: 'partner',
    email: `m.alfarooq@${demoFirm.domain}`,
    status: 'active',
    joinedDaysAgo: 2190,
  },
  {
    id: 'stf-002',
    name: { en: 'Rami Al-Khatib', ar: 'رامي الخطيب' },
    rank: 'partner',
    email: `r.alkhatib@${demoFirm.domain}`,
    status: 'active',
    joinedDaysAgo: 1825,
  },
  {
    id: 'stf-003',
    name: { en: 'Fatima Al-Zahra', ar: 'فاطمة الزهراء' },
    rank: 'seniorAssociate',
    email: `f.alzahra@${demoFirm.domain}`,
    status: 'active',
    joinedDaysAgo: 1460,
  },
  {
    id: 'stf-004',
    name: { en: 'Dalia Al-Sabah', ar: 'داليا الصباح' },
    rank: 'seniorAssociate',
    email: `d.alsabah@${demoFirm.domain}`,
    status: 'active',
    joinedDaysAgo: 1190,
  },
  {
    id: 'stf-005',
    name: { en: 'Huda Al-Mansoor', ar: 'هدى المنصور' },
    rank: 'juniorAssociate',
    email: `h.almansoor@${demoFirm.domain}`,
    status: 'active',
    joinedDaysAgo: 700,
  },
  {
    id: 'stf-006',
    name: { en: 'Noor Abdelrahman', ar: 'نور عبد الرحمن' },
    rank: 'paralegal',
    email: `n.abdelrahman@${demoFirm.domain}`,
    status: 'active',
    joinedDaysAgo: 520,
  },
  /*
   * ADDED BECAUSE THE FILE'S OWN CLAIM WAS FALSE.
   *
   * The comment above says these are "the same people the client-facing
   * fixtures already name as lead counsel and project leads". Salem Al-Hashemi
   * leads MAT-1940 and MAT-1104 in fixtures/matters.ts and had no staff record,
   * so resolving a matter's lead to a person silently failed on two of the six.
   * Found by building the per-rank dashboards, which are the first screens that
   * have to answer "whose matter is this".
   */
  {
    id: 'stf-007',
    name: { en: 'Salem Al-Hashemi', ar: 'سالم الهاشمي' },
    rank: 'partner',
    email: `s.alhashemi@${demoFirm.domain}`,
    status: 'active',
    joinedDaysAgo: 1680,
  },
  /*
   * The fifth rank finally has a person in it. lib/ranks.ts has listed
   * `legalSecretary` since Batch 0 and nobody held it, which is why nothing
   * caught that the nav and the timer were being handed to a rank the fixtures
   * could not produce.
   */
  {
    id: 'stf-008',
    name: { en: 'Layla Saeed', ar: 'ليلى سعيد' },
    rank: 'legalSecretary',
    email: `l.saeed@${demoFirm.domain}`,
    status: 'active',
    joinedDaysAgo: 430,
  },
  /*
   * Two more the client fixtures already name and this file did not, found the
   * same way Salem Al-Hashemi was: fixtures/messages.ts gives each portal
   * thread a firm holder, and resolving that holder to a person failed on two
   * of the five. Distinct people from Rami Al-Khatib and Salem Al-Hashemi —
   * different given names in both locales — not spellings of them.
   */
  {
    id: 'stf-009',
    name: { en: 'Rana Al-Khatib', ar: 'رنا الخطيب' },
    rank: 'seniorAssociate',
    email: `rana.alkhatib@${demoFirm.domain}`,
    status: 'active',
    joinedDaysAgo: 910,
  },
  {
    id: 'stf-010',
    name: { en: 'Salma Al-Hashemi', ar: 'سلمى الهاشمي' },
    rank: 'juniorAssociate',
    email: `salma.alhashemi@${demoFirm.domain}`,
    status: 'deactivated',
    joinedDaysAgo: 640,
  },
  /*
   * THE NEWEST HIRE, AND THE ONLY ONE WITH NO WORK YET.
   *
   * Added so the roster can show `temporaryPasswordIssued` truthfully. Every
   * other person in this file already leads, supports, submits or decides
   * something, which means they have demonstrably signed in — labelling any of
   * them as still holding an unused temporary password would contradict the
   * screens that show their work.
   *
   * She is referenced nowhere else on purpose. A person provisioned three days
   * ago who has not been given a file yet is the ordinary case, and it is the
   * case the status exists to describe.
   */
  {
    id: 'stf-011',
    name: { en: 'Mariam Fouad', ar: 'مريم فؤاد' },
    rank: 'juniorAssociate',
    email: `m.fouad@${demoFirm.domain}`,
    status: 'temporaryPasswordIssued',
    joinedDaysAgo: 3,
  },
];

/** The partner whose dashboard this is. MOCK: resolved from the session. */
export const SIGNED_IN_STAFF_ID = 'stf-001';

/* ===========================================================================
 * Clients — moved to fixtures/clients.ts
 * ---------------------------------------------------------------------------
 * `ClientStanding`, `FirmClient` and `demoClients` used to live here, on the
 * grounds that only the firm's own side had any notion of a client. An
 * engagement now names its client (fixtures/matters.ts, fixtures/projects.ts),
 * so a client-facing fixture has to be able to read the list — which this
 * file's header forbids it from doing here. See fixtures/clients.ts.
 * ======================================================================== */

/* ===========================================================================
 * Approvals
 * ======================================================================== */

export type ApprovalKind = 'document' | 'filing' | 'quote';

/**
 * Where a request has got to.
 *
 * The reviewer's decision, so it is STORED rather than derived — unlike almost
 * everything else in this codebase. Nothing about a draft tells you whether a
 * partner has read it.
 */
export type ApprovalState =
  /** On someone's desk, undecided. */
  | 'pending'
  /** Sent back with comments. The submitter owns it again. */
  | 'changesRequested'
  /** Signed off. */
  | 'approved';

export interface ApprovalRequest {
  id: string;
  kind: ApprovalKind;
  /** What is waiting, per locale. */
  title: Record<Locale, string>;
  /** Who sent it up. An id into `demoStaff` — never a name written twice. */
  submittedById: string;
  /**
   * Who it is waiting on. An id into `demoStaff`.
   *
   * THE REASON THE APPROVALS LIST IS ONE COLLECTION AND NOT FIVE
   * -------------------------------------------------------------------------
   * The same row is "waiting on you" to its reviewer and "my submission" to the
   * person who raised it. Storing the pair (submittedById, assignedToId) once
   * and filtering it two ways is what keeps a senior associate's outbox and a
   * partner's inbox describing the same object. Two lists would be two lists
   * free to disagree — which is what the export does: its Junior Associate
   * dashboard shows a submission "Approved by Tariq Al-Rahman" that appears
   * nowhere on the partner's own screen.
   */
  assignedToId: string;
  state: ApprovalState;
  /** Matter or project it belongs to. `null` for a fee quote to a prospect. */
  engagementRef: string | null;
  /** The client it concerns. An id into fixtures/clients.ts. */
  clientId: string;
  /**
   * What the firm is proposing to charge. Quotes only.
   *
   * Optional because only `kind: 'quote'` has one: a document going up for
   * sign-off and a filing waiting on a partner have no price. It is the one
   * figure on the Billing screen that is not derived from something else, and
   * it is not an aggregate — it is a single document's own stated value, the
   * way an invoice line item is. The export's "$14,820,400 YTD Institutional
   * Billings" is the other kind of number entirely.
   */
  amount?: number;
  /** ISO 4217. Present whenever `amount` is. See fixtures/invoices.ts. */
  currency?: string;
  /**
   * Days before the tenant's today that it was sent up for a decision.
   *
   * Added with the queue screen, which is the first surface to show an
   * approval's provenance rather than just its deadline. Without it an
   * approved request has no date at all, and "how long has this been sitting
   * with me" — the question a queue exists to answer — is unanswerable.
   */
  raisedDaysAgo: number;
  /**
   * Days before the tenant's today that it was decided. `null` while pending.
   *
   * Its own field rather than inferred from `dueInDays`, for the reason
   * fixtures/invoices.ts gives about `paidDaysAgo`: a thing is very often
   * decided late, and reusing the deadline as the decision date is a different
   * fact wearing the same label.
   */
  decidedDaysAgo: number | null;
  /**
   * Days from the tenant's today that it is due. Negative is overdue.
   *
   * MOCK: relative for the same reason every other date in these fixtures is —
   * a demo opened next month still reads as current. The real record carries an
   * actual deadline. Track A.5.
   */
  dueInDays: number;
}

/**
 * What is sitting on the partner's desk.
 *
 * NOT an SLA, and there is no "Threshold SLA: 4 Hours" anywhere: the export
 * puts one in the header, and a service-level commitment invented by a design
 * tool is the kind of thing a firm gets held to. Urgency here is the due date
 * and nothing else.
 */
export const demoApprovals: ApprovalRequest[] = [
  {
    id: 'apr-101',
    kind: 'document',
    title: {
      en: 'Shareholder equity reallocation agreement',
      ar: 'اتفاقية إعادة توزيع حصص المساهمين',
    },
    submittedById: 'stf-005',
    engagementRef: 'PRJ-4410',
    assignedToId: 'stf-001',
    state: 'pending',
    clientId: 'cli-001',
    dueInDays: -2,
    raisedDaysAgo: 9,
    decidedDaysAgo: null,
  },
  {
    id: 'apr-102',
    kind: 'filing',
    title: {
      en: 'Skeleton argument, second draft',
      ar: 'مذكرة المرافعة، المسودة الثانية',
    },
    submittedById: 'stf-003',
    engagementRef: 'MAT-2201',
    assignedToId: 'stf-001',
    state: 'pending',
    clientId: 'cli-001',
    dueInDays: 0,
    raisedDaysAgo: 4,
    decidedDaysAgo: null,
  },
  {
    id: 'apr-103',
    kind: 'quote',
    title: {
      en: 'Annual advisory fee quote',
      ar: 'عرض أتعاب الاستشارة السنوية',
    },
    submittedById: 'stf-004',
    engagementRef: null,
    assignedToId: 'stf-001',
    state: 'pending',
    clientId: 'cli-005',
    dueInDays: 3,
    amount: 42_000,
    currency: 'USD',
    raisedDaysAgo: 6,
    decidedDaysAgo: null,
  },
  {
    id: 'apr-104',
    kind: 'document',
    title: {
      en: 'Cross-border licensing consent',
      ar: 'موافقة الترخيص عابر الحدود',
    },
    submittedById: 'stf-005',
    engagementRef: 'MAT-3088',
    assignedToId: 'stf-001',
    state: 'pending',
    clientId: 'cli-001',
    dueInDays: 5,
    raisedDaysAgo: 2,
    decidedDaysAgo: null,
  },

  /*
   * Everything below here is routed at a SENIOR ASSOCIATE, not the partner.
   *
   * design.md's ladder is not decoration: a paralegal's exhibit index goes to
   * the associate running the file, and only what that associate signs off goes
   * up to a partner. Modelling the intermediate step is what lets one approvals
   * collection serve four dashboards — and it is also why the Partner Dashboard
   * still shows exactly four rows after this file grew by half.
   */
  {
    id: 'apr-105',
    kind: 'filing',
    title: {
      en: 'Evidence bundle index and pagination',
      ar: 'فهرس حافظة الأدلة وترقيمها',
    },
    submittedById: 'stf-006',
    engagementRef: 'MAT-2412',
    assignedToId: 'stf-003',
    state: 'pending',
    clientId: 'cli-001',
    dueInDays: 0,
    raisedDaysAgo: 5,
    decidedDaysAgo: null,
  },
  {
    id: 'apr-106',
    kind: 'document',
    title: {
      en: 'Completion checklist, third revision',
      ar: 'قائمة الإنجاز، المراجعة الثالثة',
    },
    submittedById: 'stf-005',
    engagementRef: 'PRJ-1904',
    assignedToId: 'stf-003',
    state: 'pending',
    clientId: 'cli-001',
    dueInDays: 2,
    raisedDaysAgo: 3,
    decidedDaysAgo: null,
  },
  /*
   * Sent UP rather than down: the senior associate's own submission, sitting
   * with the second partner. It is the same row her dashboard shows as an
   * outbox item and his shows as an inbox item — see `assignedToId`.
   */
  {
    id: 'apr-107',
    kind: 'document',
    title: {
      en: 'Warranty schedule, marked against the last draft',
      ar: 'جدول الضمانات، مقارنًا بالمسودة السابقة',
    },
    submittedById: 'stf-003',
    engagementRef: 'PRJ-1904',
    assignedToId: 'stf-002',
    state: 'changesRequested',
    clientId: 'cli-001',
    dueInDays: -1,
    raisedDaysAgo: 12,
    decidedDaysAgo: 4,
  },
  {
    id: 'apr-108',
    kind: 'document',
    title: {
      en: 'Royalty audit instruction letter',
      ar: 'خطاب التكليف بتدقيق العوائد',
    },
    submittedById: 'stf-005',
    engagementRef: 'MAT-3088',
    assignedToId: 'stf-003',
    state: 'approved',
    clientId: 'cli-001',
    dueInDays: -3,
    raisedDaysAgo: 14,
    decidedDaysAgo: 6,
  },
  /* =========================================================================
   * Fee quotes
   * -------------------------------------------------------------------------
   * A quote is an approval, not a collection of its own. The same row is "my
   * proposal" to the associate who priced it and "waiting on you" to the
   * partner who has to sign it off, which is exactly the pair this collection
   * already models — and a second collection would be a second record of one
   * fact, free to disagree with the first.
   *
   * THEY ARE THE ONE PLACE NEW WORK MAY APPEAR. Every other addition to these
   * fixtures has been constrained to work a client record already described,
   * because inventing a book of work is the easiest fabrication in this
   * product. A quote is the opposite case: it is by definition for work the
   * firm is NOT yet doing, so naming work that is nowhere in the registers is
   * the correct thing for one to do.
   * ====================================================================== */
  {
    id: 'apr-109',
    kind: 'quote',
    title: {
      en: 'Retainer renewal, financial year 2027',
      ar: 'تجديد عقد الأتعاب للسنة المالية 2027',
    },
    submittedById: 'stf-003',
    engagementRef: null,
    assignedToId: 'stf-001',
    state: 'approved',
    clientId: 'cli-001',
    dueInDays: -6,
    amount: 96_000,
    currency: 'USD',
    raisedDaysAgo: 21,
    decidedDaysAgo: 7,
  },
  {
    id: 'apr-110',
    kind: 'quote',
    title: {
      en: 'Distribution agreement renegotiation',
      ar: 'إعادة التفاوض على اتفاقية التوزيع',
    },
    submittedById: 'stf-005',
    engagementRef: null,
    assignedToId: 'stf-002',
    state: 'pending',
    clientId: 'cli-002',
    dueInDays: 2,
    amount: 18_500,
    currency: 'USD',
    raisedDaysAgo: 5,
    decidedDaysAgo: null,
  },
  {
    id: 'apr-111',
    kind: 'quote',
    title: {
      en: 'Appeal of the labour judgment, if given',
      ar: 'استئناف الحكم العمالي، إن صدر',
    },
    submittedById: 'stf-004',
    engagementRef: null,
    assignedToId: 'stf-001',
    state: 'changesRequested',
    clientId: 'cli-003',
    dueInDays: -1,
    amount: 24_000,
    currency: 'USD',
    raisedDaysAgo: 16,
    decidedDaysAgo: 3,
  },
];

/* ===========================================================================
 * Inbox
 * ======================================================================== */

/**
 * Where a message came from.
 *
 * `portal` is the client-portal thread the other half of this product already
 * holds — the same conversation, seen from the firm's side. The other two are
 * integrations that do not exist yet and are labelled as such wherever they
 * appear.
 */
export type InboxSource = 'portal' | 'email' | 'court';

export interface InboxItem {
  id: string;
  source: InboxSource;
  /**
   * Who it was addressed to. An id into demoStaff, or null for the firm.
   *
   * A unified inbox has both: correspondence sent to the practice and
   * correspondence sent to a person. Without the distinction every rank's
   * dashboard shows the same four rows under the heading "My inbox", which is
   * the export's arrangement and is simply untrue on four screens out of five.
   *
   * MOCK: production resolves this from the recipient headers of a real
   * mailbox and from the portal thread's participants. Track B for the mailbox
   * (BUILD_PLAN.md §6); the portal half exists in fixtures/messages.ts today.
   */
  toId: string | null;
  /**
   * Which client the correspondence is filed against. Null for a court or a
   * registry, which writes to the firm rather than on behalf of a client.
   *
   * Matched by id rather than by the sender’s display name. The CRM needs to
   * ask "what has come in from this client", and a join on a name is the same
   * fragile thing `leadCounsel` already is — it just fails more quietly here,
   * because a near-miss would silently drop a client’s post off their record.
   */
  clientId: string | null;
  /** Sender, per locale. An institution for `court`. */
  from: Record<Locale, string>;
  subject: Record<Locale, string>;
  /** Days before the tenant's today. */
  receivedDaysAgo: number;
  unread: boolean;
}

/**
 * Correspondence that is NOT a portal thread.
 *
 * ===========================================================================
 * THE PORTAL ROWS USED TO BE IN HERE, AND THEY WERE A LIE
 * ===========================================================================
 * This collection used to carry two `portal` items, under a note saying they
 * were "the client's own threads from fixtures/messages.ts, seen from the other
 * side". They were not. fixtures/messages.ts holds five threads — "Hearing
 * preparation and attendance", "Draft disclosure for your approval" and three
 * more — and neither of the rows here matched any of them. Two independent
 * lists of the same conversations, exactly the defect the derived key date and
 * the single approvals collection exist to prevent.
 *
 * It went unnoticed because the Partner Dashboard shows three inbox rows as a
 * preview and nothing linked them to anything. The Unified Inbox is the screen
 * where it would have become visible: a firm-side list of client conversations
 * that the client's own Messages screen has never heard of.
 *
 * So portal items are now DERIVED from `demoMessageThreads` in lib/mock-api.ts
 * — one conversation, one record, seen from whichever side is asking — and this
 * collection holds only what genuinely has no other home.
 *
 * MOCK: `email` needs a mailbox integration and `court` needs a filing-system
 * integration. Both are Track B (BUILD_PLAN.md §6) and every screen labels them
 * as unconnected rather than merging them into one stream that would claim two
 * integrations this product does not have.
 *
 * `unread` here means the demo record arrived and nobody has triaged it. On a
 * portal thread the firm has no read cursor at all, and what CAN be derived is
 * whether the client spoke last — see `staff.inbox` in lib/mock-api.ts.
 */
export const demoInbox: InboxItem[] = [
  {
    id: 'inb-02',
    source: 'email',
    toId: 'stf-003',
    clientId: 'cli-002',
    from: { en: 'Nile Delta Agribusiness', ar: 'دلتا النيل للصناعات الزراعية' },
    subject: {
      en: 'Revised supply schedule for review',
      ar: 'جدول التوريد المعدّل للمراجعة',
    },
    receivedDaysAgo: 0,
    unread: true,
  },
  {
    id: 'inb-03',
    source: 'court',
    toId: null,
    clientId: null,
    from: { en: 'Cairo Economic Court', ar: 'محكمة القاهرة الاقتصادية' },
    subject: {
      en: 'Hearing date confirmed — commercial case 8821',
      ar: 'تأكيد موعد الجلسة — الدعوى التجارية 8821',
    },
    receivedDaysAgo: 1,
    unread: true,
  },
  {
    id: 'inb-05',
    source: 'email',
    toId: 'stf-001',
    clientId: 'cli-004',
    from: { en: 'Alexandria Port Logistics', ar: 'الإسكندرية لخدمات الموانئ' },
    subject: {
      en: 'Concession terms — the board wants a call this week',
      ar: 'شروط الامتياز — المجلس يطلب اتصالًا هذا الأسبوع',
    },
    receivedDaysAgo: 0,
    unread: true,
  },
  {
    id: 'inb-06',
    source: 'court',
    toId: 'stf-006',
    clientId: null,
    from: { en: 'Cairo Economic Court', ar: 'محكمة القاهرة الاقتصادية' },
    subject: {
      en: 'Filing acknowledged — evidence bundle received',
      ar: 'إفادة بقبول الإيداع — استلام حافظة الأدلة',
    },
    receivedDaysAgo: 1,
    unread: true,
  },
  {
    id: 'inb-07',
    source: 'email',
    toId: 'stf-005',
    clientId: 'cli-003',
    from: { en: 'Helwan Industrial Group', ar: 'مجموعة حلوان الصناعية' },
    subject: {
      en: 'Payroll records for the disputed period',
      ar: 'سجلات الرواتب عن الفترة محل النزاع',
    },
    receivedDaysAgo: 2,
    unread: false,
  },
  /*
   * Added so the Unified Inbox is a screen rather than a preview. Three rows is
   * enough for a dashboard card and not enough to tell whether a filter works.
   *
   * Every sender is a client already in fixtures/clients.ts, a forum already named
   * across the fixtures, or the registry. Nothing here introduces an
   * organisation the rest of the product has never heard of.
   */
  {
    id: 'inb-08',
    source: 'court',
    toId: null,
    clientId: null,
    from: { en: 'Cairo Court of Appeal', ar: 'محكمة استئناف القاهرة' },
    subject: {
      en: 'Cause list published for the coming week',
      ar: 'نشر جدول الجلسات للأسبوع القادم',
    },
    receivedDaysAgo: 2,
    unread: false,
  },
  {
    id: 'inb-09',
    source: 'email',
    toId: 'stf-001',
    clientId: 'cli-005',
    from: { en: 'Cairo Fintech Partners', ar: 'شركاء القاهرة للتقنية المالية' },
    subject: {
      en: 'Following up on the advisory fee quote',
      ar: 'متابعة بشأن عرض أتعاب الاستشارة',
    },
    receivedDaysAgo: 3,
    unread: true,
  },
  {
    id: 'inb-10',
    source: 'email',
    toId: 'stf-003',
    clientId: 'cli-003',
    from: { en: 'Helwan Industrial Group', ar: 'مجموعة حلوان الصناعية' },
    subject: {
      en: 'Witness availability for the labour hearing',
      ar: 'مواعيد الشهود لجلسة النزاع العمالي',
    },
    receivedDaysAgo: 4,
    unread: false,
  },
  {
    id: 'inb-11',
    source: 'court',
    toId: 'stf-005',
    clientId: null,
    from: { en: 'Commercial Registry', ar: 'السجل التجاري' },
    subject: {
      en: 'Amended articles entered on the register',
      ar: 'قيد النظام الأساسي المعدّل في السجل',
    },
    receivedDaysAgo: 5,
    unread: false,
  },
  {
    id: 'inb-12',
    source: 'email',
    toId: null,
    clientId: 'cli-002',
    from: { en: 'Nile Delta Agribusiness', ar: 'دلتا النيل للصناعات الزراعية' },
    subject: {
      en: 'Export licence renewal — documents attached',
      ar: 'تجديد رخصة التصدير — المستندات مرفقة',
    },
    receivedDaysAgo: 6,
    unread: false,
  },
];

/* ===========================================================================
 * Calendar
 * ======================================================================== */

export type FirmEventKind = 'hearing' | 'internal' | 'client';

export interface FirmEvent {
  id: string;
  kind: FirmEventKind;
  /**
   * Who is in the room. Ids into demoStaff.
   *
   * A quarterly partners' fee review is not on a paralegal's day, and before
   * this field every staff dashboard would have shown it to everyone. An empty
   * array would mean a meeting nobody attends, so there is no such row.
   */
  attendeeIds: string[];
  /** Days from the tenant's today. Negative is past. */
  inDays: number;
  /** Wall-clock start in the tenant's zone — see fixtures/availability.ts. */
  at: ClockTime;
  /**
   * How long it runs, in minutes.
   *
   * Added for the week grid, which has to give a block a height. The agenda
   * card never needed it because a list only shows a start.
   *
   * Court dates do NOT get one and never will: they come from an engagement’s
   * timeline, which carries no hour at all (fixtures/engagements.ts), so the
   * calendar shows them as all-day rather than inventing a start and a length
   * for a hearing. The export gives every entry a precise range.
   */
  minutes: number;
  title: Record<Locale, string>;
  /** Where, per locale. */
  location: Record<Locale, string>;
}

/**
 * The partner's day.
 *
 * Internal meetings only — hearings and filing deadlines are NOT duplicated
 * here. Those live on their engagements' timelines and are the single source
 * of truth for them (see the header of fixtures/engagements.ts); the dashboard
 * joins the two so a court date cannot appear on the calendar with one date and
 * on the matter with another.
 *
 * MOCK: a real calendar is the fee earner's own, synced from their mail
 * account. That integration is Track B (BUILD_PLAN.md §6). Nothing here claims
 * a video-conference link: the export's "Join Meeting" button opens a Zoom that
 * does not exist.
 */
export const demoFirmEvents: FirmEvent[] = [
  {
    id: 'evt-01',
    kind: 'internal',
    attendeeIds: ['stf-001', 'stf-002', 'stf-007', 'stf-008'],
    inDays: 0,
    at: '11:30',
    minutes: 90,
    title: {
      en: 'Partners meeting — quarterly fee review',
      ar: 'اجتماع الشركاء — مراجعة الأتعاب الربع سنوية',
    },
    location: { en: 'Main meeting room', ar: 'قاعة الاجتماعات الرئيسية' },
  },
  {
    id: 'evt-02',
    kind: 'client',
    attendeeIds: ['stf-001', 'stf-003', 'stf-005'],
    inDays: 0,
    at: '14:00',
    minutes: 60,
    title: {
      en: 'Client strategy — Alexandria concession renewal',
      ar: 'جلسة استراتيجية — تجديد امتياز الإسكندرية',
    },
    location: { en: 'Meeting room B', ar: 'قاعة الاجتماعات ب' },
  },
  {
    id: 'evt-03',
    kind: 'internal',
    attendeeIds: ['stf-003', 'stf-005', 'stf-006'],
    inDays: 1,
    at: '09:30',
    minutes: 45,
    title: {
      en: 'Case review — labour dispute bundle',
      ar: 'مراجعة الملف — حافظة النزاع العمالي',
    },
    location: { en: 'Main meeting room', ar: 'قاعة الاجتماعات الرئيسية' },
  },

  /*
   * Spread across the week, because a week view over three entries on two days
   * tests nothing — not the weekend shading, not two blocks on one day, not an
   * entry that starts before the grid does.
   *
   * All internal or client meetings. Nothing here is a court date: those live
   * on their engagements’ timelines and the calendar reads them from there, so
   * a hearing cannot appear here with one date and on the matter with another.
   */
  {
    id: 'evt-04',
    kind: 'client',
    attendeeIds: ['stf-001', 'stf-004'],
    inDays: -2,
    at: '10:00',
    minutes: 75,
    title: {
      en: 'Kick-off — Helwan labour dispute',
      ar: 'جلسة انطلاق — نزاع حلوان العمالي',
    },
    location: { en: 'Meeting room B', ar: 'قاعة الاجتماعات ب' },
  },
  {
    id: 'evt-05',
    kind: 'internal',
    attendeeIds: ['stf-003', 'stf-005', 'stf-006'],
    inDays: -1,
    at: '15:30',
    minutes: 60,
    title: {
      en: 'Evidence bundle walkthrough',
      ar: 'مراجعة حافظة الأدلة'
    },
    location: { en: 'Main meeting room', ar: 'قاعة الاجتماعات الرئيسية' },
  },
  {
    id: 'evt-06',
    kind: 'client',
    attendeeIds: ['stf-001', 'stf-003'],
    inDays: 2,
    at: '09:00',
    minutes: 90,
    title: {
      en: 'Nile Delta — export licence review',
      ar: 'دلتا النيل — مراجعة رخصة التصدير'
    },
    location: { en: 'Meeting room B', ar: 'قاعة الاجتماعات ب' },
  },
  {
    /*
     * PAST, INTERNAL, AND THE PARTNER IS IN IT — all three deliberate.
     *
     * Added for the meeting transcript reader (BUILD_PLAN.md §3, Batch 7).
     * fixtures/transcripts.ts can only carry minutes for a meeting that has
     * already happened and whose speakers are all on this firm's roster, and
     * before this row the only such meeting was evt-05, which the signed-in
     * partner does not attend. So the reader would have had nothing to open.
     *
     * The fourth attendee is the legal secretary, and she says nothing in the
     * transcript. That is the point of her being here: "who was in the room" and
     * "who is in the minutes" are different lists.
     */
    id: 'evt-08',
    kind: 'internal',
    attendeeIds: ['stf-001', 'stf-003', 'stf-004', 'stf-008'],
    inDays: -1,
    /*
     * 11:00, WHICH OVERLAPS evt-04 BY A QUARTER OF AN HOUR, ON PURPOSE.
     *
     * evt-04 runs 10:00 to 11:15 on the same day. This started at 11:00, was
     * moved to 11:30 when that revealed that the week grid drew overlapping
     * blocks one on top of the other — hiding the second meeting outright —
     * and is back at 11:00 now that the grid lays them out side by side.
     *
     * It is the only overlap in these fixtures, so it is the only thing that
     * exercises that layout. Keeping it also keeps the demo honest about what
     * a calendar is for: a client meeting running into an internal conference
     * is an ordinary double-booking, and the week view's job is to show it
     * rather than to tidy it away. Both stf-001 and stf-004 are in both rooms
     * for those fifteen minutes, which is exactly the conflict a fee earner
     * opens a week view to find.
     *
     * See `placeEntries` in the calendar's CalendarViews.tsx.
     */
    at: '11:00',
    minutes: 60,
    title: {
      en: 'Case conference — Helwan labour dispute',
      ar: 'مداولة الملف — نزاع حلوان العمالي',
    },
    location: { en: 'Meeting room B', ar: 'قاعة الاجتماعات ب' },
  },
  {
    id: 'evt-07',
    kind: 'internal',
    attendeeIds: ['stf-001', 'stf-002', 'stf-007', 'stf-008'],
    inDays: 3,
    at: '13:00',
    minutes: 45,
    title: {
      en: 'Conflicts review — new instructions',
      ar: 'مراجعة تعارض المصالح — تكليفات جديدة'
    },
    location: { en: 'Main meeting room', ar: 'قاعة الاجتماعات الرئيسية' },
  },
];

/* ===========================================================================
 * Billing
 * ======================================================================== */

/**
 * Hours recorded per fee earner, most recent week last.
 *
 * WHY IT IS KEYED BY PERSON
 * ---------------------------------------------------------------------------
 * It used to be one array — the partner's — because there was one dashboard.
 * Four more ranks record their own time, and the alternative to a key was the
 * same array rendered under four different names, which is a lie about whose
 * hours those are. The partner's four weeks are unchanged; his dashboard reads
 * the same numbers it read before.
 *
 * A RANK MISSING FROM HERE IS NOT A ZERO. A legal secretary has no entry
 * because a legal secretary does not record billable time — see
 * `RANKS_THAT_BILL` in lib/ranks.ts, which is what stops that screen from
 * rendering an hours card reading 0 and calling it performance.
 *
 * MOCK: in production these are summed from time entries, which is also what
 * makes the dashboard figure and the timer agree. There are no time entries in
 * Track A — stopping the timer discards its elapsed seconds, see
 * UIStateProvider — so these are stated rather than computed, and the screen
 * says the timer does not feed them.
 */
export const demoWeeklyHours: Record<string, number[]> = {
  'stf-001': [38, 42, 48, 36.5],
  'stf-002': [35, 39, 41, 33],
  'stf-003': [41, 44, 46, 39.5],
  'stf-004': [37, 40, 38, 35],
  'stf-005': [44, 46, 47, 42],
  'stf-006': [32, 35, 36, 31.5],
  'stf-007': [30, 34, 37, 29],
  // 'stf-008' — the legal secretary. Deliberately absent, not zero.
};

/** What the firm expects in a week, at every rank that bills. A target, not a commitment. */
export const WEEKLY_HOURS_TARGET = 40;

/**
 * One entry in the time ledger.
 *
 * ===========================================================================
 * THERE IS NO SEEDED ARRAY HERE, AND THAT IS NOT AN OVERSIGHT
 * ===========================================================================
 * `demoWeeklyHours` above states what each fee earner recorded, by week. Those
 * are TOTALS, not sums — the MOCK note says so, and says that in production
 * they come from entries like this one.
 *
 * Seeding entries beside them would put the same hours in the product twice:
 * once stated in the weekly figure and once itemised underneath it, with
 * nothing reconciling the two. The dashboard would then either double-count or
 * silently ignore half its own ledger, and both are worse than the honest
 * position — which is that this prototype had no ledger until Batch 6 gave it
 * one, and the weekly figures are what was recorded before that.
 *
 * So the ledger starts EMPTY and only ever holds what somebody logs in the
 * session. `billing()` adds session minutes ON TOP of the stated baseline
 * rather than replacing it, which is why a logged hour moves the chart by
 * exactly that hour.
 *
 * DO NOT add demo entries here. If a future batch wants a populated ledger,
 * the weekly figures have to go at the same time, replaced by sums over it.
 *
 * ===========================================================================
 * NO RATE, ANYWHERE ON THIS RECORD
 * ===========================================================================
 * There is no `rate` and no `amount`, because this product has neither. The
 * firm-side billing header in lib/mock-api.ts puts it plainly: "hours without a
 * rate are not money", and the WIP figure, the realization rate and the per-rank
 * rate card were all refused there for exactly that reason.
 *
 * `DEFAULT_HOURLY_RATES` in lib/ranks.ts is NOT the missing rate card. It seeds
 * the onboarding wizard's billing step with editable starting values and its own
 * MOCK note says the real thing is "the tenant's configured rate card". Reading
 * it here would turn a placeholder somebody was invited to overwrite into the
 * firm's actual charge-out rate, on a record a client could be billed from.
 */
export interface TimeEntry {
  id: string;
  /** Who did the work — an id into `demoStaff`. */
  staffId: string;
  /** Matter or project it was done on. Every entry is on a file. */
  engagementRef: string;
  /**
   * The day the work was done, in the TENANT's zone — 'YYYY-MM-DD'.
   *
   * An absolute date rather than the `daysAgo` offset the seeded fixtures use,
   * because there are no seeded entries: every one of these is created against
   * a real today, and storing an offset would mean it drifted a day every time
   * the clock rolled over.
   */
  on: string;
  /**
   * Duration in MINUTES.
   *
   * Not decimal hours. A tenth of an hour is six minutes, and rounding a
   * twenty-minute call to 0.3 and back loses two minutes every time it is
   * read — on a record whose whole purpose is to be exact. The interface asks
   * for hours and minutes and multiplies; nothing rounds.
   */
  minutes: number;
  /** What was done. The line a client would read on a statement. */
  description: string;
  /**
   * Whether it can be charged to the client.
   *
   * Not defaulted anywhere: the form makes it an explicit choice. See
   * LogTimeModal.tsx.
   */
  billable: boolean;
  /**
   * True once the entry has been put on a draft invoice.
   *
   * The invoice builder reads unbilled entries, so an entry that has already
   * been drawn into a draft must not be offered again — billing a client twice
   * for one piece of work is the worst arithmetic error this product could
   * make.
   */
  billed: boolean;
}

/* ===========================================================================
 * Who works on what
 * ======================================================================== */

/**
 * What someone does on an engagement they do not lead.
 *
 * Deliberately narrow and procedural. A role here describes a job on a file,
 * not a standing — the standing is the person's rank, and writing "Senior
 * Drafter" or "Lead Associate" beside a name the way the export does invents a
 * second, parallel hierarchy that no firm actually runs.
 */
export type SupportRole =
  /** Producing drafts for the lead to settle. */
  | 'drafting'
  /** Collating, indexing and checking the evidence. */
  | 'evidence'
  /** Lodging documents with a registry or court. */
  | 'filings'
  /** Reviewing a data room or a disclosure set. */
  | 'diligence'
  /** Points of law, authorities, precedent. */
  | 'research';

export interface SupportAssignment {
  staffId: string;
  /** Matter or project reference. Must name a real engagement. */
  engagementRef: string;
  role: SupportRole;
}

/**
 * The supporting cast on each engagement.
 *
 * ===========================================================================
 * THE LEAD IS NOT IN HERE, AND THAT IS THE POINT
 * ===========================================================================
 * Every matter in fixtures/matters.ts already carries `leadCounsel` and every
 * project carries `lead`, because the CLIENT is told who is running their file.
 * That is the record. Repeating it here would be a second copy of the one fact
 * both halves of the product display, and two copies of "who is running this
 * matter" is exactly the class of defect the derived key date was built to
 * prevent.
 *
 * So lib/mock-api.ts resolves the lead from the engagement fixtures and unions
 * it with this table. This file holds ONLY what is genuinely not written down
 * anywhere else: the people a client is not told about.
 *
 * MOCK: production has one `engagement_members` table with a role column, and
 * the lead is a row in it like anyone else. The split here is an artefact of
 * the client fixtures having been written first. Track A.5.
 */
export const demoSupportAssignments: SupportAssignment[] = [
  // Huda (junior associate) — drafts under two partners; leads MAT-3088.
  { staffId: 'stf-005', engagementRef: 'MAT-2201', role: 'drafting' },
  { staffId: 'stf-005', engagementRef: 'PRJ-1904', role: 'diligence' },
  { staffId: 'stf-005', engagementRef: 'PRJ-4410', role: 'drafting' },

  // Fatima (senior associate) — leads MAT-2412 and PRJ-1904 elsewhere.
  { staffId: 'stf-003', engagementRef: 'MAT-2201', role: 'drafting' },
  { staffId: 'stf-003', engagementRef: 'MAT-1940', role: 'research' },

  // Noor (paralegal) — leads nothing, which is correct.
  { staffId: 'stf-006', engagementRef: 'MAT-2201', role: 'evidence' },
  { staffId: 'stf-006', engagementRef: 'MAT-2412', role: 'evidence' },
  { staffId: 'stf-006', engagementRef: 'MAT-3088', role: 'research' },
  { staffId: 'stf-006', engagementRef: 'PRJ-1904', role: 'filings' },

  // Dalia (senior associate) — leads PRJ-3902, PRJ-1082 and MAT-3310 elsewhere.
  { staffId: 'stf-004', engagementRef: 'PRJ-2819', role: 'diligence' },

  /*
   * The other clients' files, added with the `clientId` split.
   *
   * Each of these matches the `supporting` name on the engagement's own
   * counsel card — fixtures/matters.ts, `EngagementContact.supporting`, which
   * is what the CLIENT is told. The two are separate records of overlapping
   * facts (that one names a person, this one names a person and a job), and
   * leaving them to disagree is how a directory ends up listing a team the
   * client has never been introduced to. MAT-2760 has no row because its
   * counsel card names no second fee earner.
   */
  { staffId: 'stf-006', engagementRef: 'MAT-4021', role: 'filings' },
  { staffId: 'stf-006', engagementRef: 'MAT-3310', role: 'evidence' },
  { staffId: 'stf-003', engagementRef: 'PRJ-5120', role: 'drafting' },
];

/* ===========================================================================
 * Tasks
 * ======================================================================== */

export type TaskState = 'assigned' | 'inProgress' | 'done';

export interface FirmTask {
  id: string;
  /** What has to be done, per locale. */
  title: Record<Locale, string>;
  /** Who has to do it. An id into `demoStaff`. */
  assignedToId: string;
  /** Who asked for it. An id into `demoStaff` — a name is never written twice. */
  assignedById: string;
  /** The engagement it belongs to. Must name a real matter or project. */
  engagementRef: string;
  /** Days from the tenant's today. Negative is overdue. */
  dueInDays: number;
  state: TaskState;
}

/**
 * Delegated work items.
 *
 * WHY THIS IS ITS OWN COLLECTION AND NOT A KIND OF APPROVAL
 * ---------------------------------------------------------------------------
 * An approval is a finished thing asking for a decision. A task is unfinished
 * work asking for effort. They have different owners, different end states and
 * different consequences for running late, and the only thing they share is a
 * due date. Folding one into the other would put a paralegal's "index the
 * bundle" into a partner's approval queue.
 *
 * NO "COURT DEADLINE" TONE, AND NO SLA
 * ---------------------------------------------------------------------------
 * The export marks one task "Court Deadline" in error red and another
 * "Due Today" in amber, and its Junior Associate screen adds a banner reading
 * "Review SLA Reminder ... due to Tariq Al-Rahman by 18:00 GST today". A task's
 * urgency here is its due date, computed, and nothing else. A procedural
 * deadline belongs to the engagement's timeline — fixtures/engagements.ts is
 * the single source of truth for a court date — and a task that happens to fall
 * near one does not get to restate it.
 *
 * MOCK: production has assignment, reassignment, completion and an audit trail
 * of each. None of that exists, and nothing on these screens changes a state.
 * Track A.5.
 */
export const demoTasks: FirmTask[] = [
  {
    id: 'tsk-01',
    title: {
      en: 'Index and paginate the evidence bundle',
      ar: 'فهرسة حافظة الأدلة وترقيم صفحاتها',
    },
    assignedToId: 'stf-006',
    assignedById: 'stf-003',
    engagementRef: 'MAT-2412',
    dueInDays: 0,
    state: 'inProgress',
  },
  {
    id: 'tsk-02',
    title: {
      en: 'Collate the exhibits for the witness conference',
      ar: 'تجميع المستندات لاجتماع الشهود التحضيري',
    },
    assignedToId: 'stf-006',
    assignedById: 'stf-001',
    engagementRef: 'MAT-2201',
    dueInDays: -1,
    state: 'assigned',
  },
  {
    id: 'tsk-03',
    title: {
      en: 'Check the royalty audit schedule against the instruction letter',
      ar: 'مطابقة جدول تدقيق العوائد بخطاب التكليف',
    },
    assignedToId: 'stf-006',
    assignedById: 'stf-005',
    engagementRef: 'MAT-3088',
    dueInDays: 2,
    state: 'assigned',
  },
  {
    id: 'tsk-04',
    title: {
      en: 'Cross-check the data room against the completion checklist',
      ar: 'مراجعة غرفة البيانات مقابل قائمة الإنجاز',
    },
    assignedToId: 'stf-006',
    assignedById: 'stf-003',
    engagementRef: 'PRJ-1904',
    dueInDays: 4,
    state: 'assigned',
  },
  {
    id: 'tsk-05',
    title: {
      en: 'Certify the served copies of the claim',
      ar: 'توثيق نسخ صحيفة الدعوى المعلنة',
    },
    assignedToId: 'stf-006',
    assignedById: 'stf-003',
    engagementRef: 'MAT-2412',
    dueInDays: -4,
    state: 'done',
  },
  /*
   * A junior associate is given work too, so "my tasks" is not a paralegal
   * feature that happens to sit on one screen.
   */
  {
    id: 'tsk-06',
    title: {
      en: 'Mark up the warranty schedule against the last draft',
      ar: 'مقارنة جدول الضمانات بالمسودة السابقة',
    },
    assignedToId: 'stf-005',
    assignedById: 'stf-003',
    engagementRef: 'PRJ-1904',
    dueInDays: 1,
    state: 'inProgress',
  },
  {
    id: 'tsk-07',
    title: {
      en: 'Summarise the opposing submissions for the file note',
      ar: 'تلخيص مذكرات الخصم لمذكرة الملف',
    },
    assignedToId: 'stf-005',
    assignedById: 'stf-001',
    engagementRef: 'MAT-2201',
    dueInDays: 3,
    state: 'assigned',
  },
];

/* ===========================================================================
 * Practice support
 * ======================================================================== */

export interface SecretaryAssignment {
  secretaryId: string;
  /** A fee earner they support. An id into `demoStaff`. */
  staffId: string;
}

/**
 * Which fee earners a legal secretary supports.
 *
 * A legal secretary's work is organised around PEOPLE where everyone else's is
 * organised around engagements, which is why this table exists rather than
 * reusing `demoSupportAssignments`. It is also why that dashboard looks unlike
 * the other four: it is the only one whose first question is "whose day is
 * this" rather than "which file is this".
 *
 * MOCK: production reads this from the firm's org chart, where it is also what
 * decides whose calendar the secretary may write to. Nothing here grants any
 * access — Track A has no authorisation at all. Track A.5.
 */
export const demoSecretaryAssignments: SecretaryAssignment[] = [
  { secretaryId: 'stf-008', staffId: 'stf-001' },
  { secretaryId: 'stf-008', staffId: 'stf-003' },
  { secretaryId: 'stf-008', staffId: 'stf-005' },
];
