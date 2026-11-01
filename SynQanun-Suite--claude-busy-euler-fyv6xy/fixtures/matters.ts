import { CLIENT_IDS } from './clients';
import type { EngagementContact, EngagementStatusTone, TimelineEventSeed } from './engagements';
import { demoFirm } from './firm';
import type { MatterWorkType } from '@/lib/matter-work-types';
import type { Locale } from '@/lib/i18n/routing';

// Re-exported for the screens that already import these from here. The shapes
// themselves live in fixtures/engagements.ts, because a project has them too
// and should not have to reach into the matter fixture to get them.
export type { EngagementContact, EngagementStatusTone, TimelineEventKind, TimelineEventSeed } from './engagements';

/**
 * fixtures/matters.ts — the client's contentious and regulatory legal files.
 *
 * Created because the Client Dashboard needs it. The firm is NOT restated
 * here: `firmId` points at fixtures/firm.ts, which stays the single source of
 * truth for the demo firm's name in both languages. No fixture contains the
 * string "MR and Partners".
 *
 * MATTER vs PROJECT — the distinction the client portal draws
 * ---------------------------------------------------------------------------
 * A MATTER is a legal file: a dispute, an arbitration, a regulatory filing —
 * something with a forum (a court, a tribunal, an authority) and a lead
 * counsel. A PROJECT is a transaction or a corporate exercise — a
 * restructuring, an entity formation, a due diligence — run by a corporate
 * manager rather than litigated. fixtures/projects.ts mirrors this file's shape
 * on purpose, because the dashboard renders them through one component; the two
 * are separate types rather than one with a `kind` flag because they diverge in
 * Batch 2's detail screens, where a matter has hearings and a project has
 * workstreams.
 *
 * In the STAFF workspace that separation ended in October 2026: the client
 * asked for one Legal matters register, so a project is served there as a
 * legal matter of the kind `otherProject` (see `MatterWorkType` below and
 * `staff.matters` in lib/mock-api.ts). The records stay in
 * fixtures/projects.ts, unedited, and the client portal still lists them as
 * projects.
 *
 * design.md §7: "Use real legal content in mockups (matter names, clause
 * numbers, firm-realistic billing line items) — generic 'Lorem Ipsum' or
 * 'Project Alpha' placeholder content undercuts the credibility this product is
 * selling." Everything below is written to that instruction. The counterparties
 * are invented; the forums (DIFC, DIAC, ADGM, the Saudi commercial courts) are
 * real institutions, named the way instructions to a Gulf client would name
 * them.
 */

/* ===========================================================================
 * THE STATE A MATTER STARTS IN
 * ===========================================================================
 * A matter opened through the New Matter form has no history, no filing and no
 * counterparty yet, so these are the only honest values for the three fields
 * that would otherwise have to be invented at intake.
 *
 * They live here rather than in a dictionary because they are FIELD VALUES on
 * a record — the same kind of thing as a status on any seeded matter above —
 * and they are per locale for the same reason every other status is: the
 * client portal renders them, and an Arabic client reads Arabic.
 * ======================================================================== */

/** `status` on a matter opened a moment ago. */
export const NEW_MATTER_STATUS: Record<Locale, string> = {
  en: 'Opened, no steps taken yet',
  ar: 'فُتح الملف، ولم تُتَّخذ أي خطوة بعد',
};

/** `currentPhase` on the same. */
export const NEW_MATTER_PHASE: Record<Locale, string> = {
  en: 'Intake',
  ar: 'القيد الأولي',
};

/**
 * `scopeSummary` when the form's description was left blank.
 *
 * It says the scope is not recorded rather than describing work nobody has
 * described — an invented instruction paragraph on a live file is the kind of
 * thing a client could later be told they agreed to.
 */
export const NEW_MATTER_SCOPE: Record<Locale, string> = {
  en: 'No scope has been recorded for this matter yet.',
  ar: 'لم يُسجَّل بعد نطاق تكليف لهذه المسألة القانونية.',
};

/* ===========================================================================
 * THE KIND OF WORK — the client's own five words for it
 * ===========================================================================
 * Taken from the client's mockup, where the same five values appear as the
 * "نوع العمل" column on its archive and dashboard tables and, in the plural,
 * as its sidebar and report rows: قضية، استشارة، عقد، تنفيذ، مشروع آخر. The
 * mockup's sidebar also lists الجلسات (hearings) and الوكالات (powers of
 * attorney), but neither is a kind of file there: hearings are a calendar of
 * the cases' sittings, and powers of attorney are a register whose entries
 * LINK to files (قضية 120، عقد 108، تنفيذ 152). So they are not values here.
 *
 * A fixed vocabulary, unlike `matterType` below (the practice area), because
 * the register filters on it and a matter cannot be opened without one.
 * Labels live in the dictionaries (`staffMatters.types.*`): these are product
 * words, not the firm's description of a file.
 *
 * `otherProject` is what a former project is. The firm's transactional work
 * used to sit on a separate Projects register; at the client's request it is
 * now one kind of legal matter. See `staff.matters` in lib/mock-api.ts for
 * how those records are served.
 *
 * The type and the list live in lib/matter-work-types.ts, a module with no
 * fixture imports, so the browser bundle can use them without pulling in data.
 * ======================================================================== */

export { MATTER_WORK_TYPES, type MatterWorkType } from '@/lib/matter-work-types';

export interface Matter {
  id: string;
  /**
   * Client-visible file reference. Rendered in JetBrains Mono (design.md §3
   * "Reference / mono": clause numbers, doc IDs, invoice numbers).
   *
   * Stable and year-less by design — a matter reference follows the file for
   * its whole life, which can span years. Invoice references do carry a year;
   * see fixtures/invoices.ts.
   */
  reference: string;
  /** Tenant this file belongs to — see fixtures/firm.ts. */
  firmId: string;
  /**
   * The client whose legal file this is - an id into fixtures/clients.ts.
   *
   * NOT an account id. It used to point at fixtures/accounts.ts instead,
   * which meant work could only belong to a client who had a portal login -
   * so the firm's four clients without one appeared to have no files at all.
   * A firm acts for organisations; some of them also sign in. The portal
   * scopes by resolving the signed-in account's own `clientId` and matching
   * it against this, so the two facts stay separable.
   */
  clientId: string;

  title: Record<Locale, string>;
  /** The kind of work — see `MatterWorkType`. Required when opening a matter. */
  workType: MatterWorkType;
  /**
   * Area of practice the file sits in, per locale — commercial litigation,
   * intellectual property, and so on. Distinct from `forum`, which is who is
   * hearing it.
   *
   * MOCK: a controlled vocabulary in the real schema, not free text — the firm
   * reports on it and filters by it, and two spellings of "Intellectual
   * property" would split a practice group in half. Track A.5.
   */
  matterType: Record<Locale, string>;
  /**
   * Lead counsel's full display name, per locale.
   *
   * No honorific. The Stitch export prefixed these with "Adv." in English and
   * with "المستشار"/"المستشارة" in Arabic — a form that is grammatically
   * gendered, so rendering it correctly would mean storing each fee earner's
   * gender purely to decorate their name. The export already gets this wrong by
   * inference rather than by data. The name alone says everything the column
   * needs to; the column header supplies the role.
   *
   * MOCK: denormalised for the prototype. The real record holds a
   * `leadCounselId` pointing at the users table, and the portal resolves the
   * name through it — so that a lawyer leaving the firm updates one row rather
   * than every matter they ever led. Track A.5.
   */
  leadCounsel: Record<Locale, string>;
  /** Court, tribunal or regulator hearing the file, per locale. */
  forum: Record<Locale, string>;

  /**
   * Where the file currently stands, per locale.
   *
   * Per-locale DATA rather than a translation key, because this is the firm's
   * own description of a specific file, not product copy. A status enum with
   * five values could not say "Memorial submitted" and "Prospectus signed"
   * without flattening both into "In progress".
   *
   * MOCK: the real record pairs a coarse status enum (for filtering and
   * reporting) with this free-text note (for the client). Track A.5.
   */
  status: Record<Locale, string>;
  statusTone: EngagementStatusTone;

  /**
   * Something is waiting on the CLIENT — not on the firm.
   *
   * Rendered as a badge on the item itself, never as a separate "needs
   * attention" section: a client should find the thing that needs them where
   * the thing lives, not in a second list they have to reconcile against the
   * first.
   */
  needsAttention: boolean;
  /**
   * WHAT the client has to do, per locale — "Review the witness statement".
   * `null` when `needsAttention` is false.
   *
   * The export carried this reason in the Arabic badge text but only in an
   * English `title` tooltip, so the two languages said different amounts, and
   * the English half was unreachable by keyboard or touch. It is real, useful
   * content — a client who is told only that something needs them still has to
   * open the file to find out what — so it is rendered inline, in both.
   */
  attentionReason: Record<Locale, string> | null;

  /**
   * Open files show on the dashboard; closed ones only in the full list.
   *
   * This one flag drives the whole matters-list filter strip. "Needs attention"
   * is `needsAttention`, "Closed" is `!active`, and "In progress" is everything
   * else — so the three partition the list exactly and their counts always sum
   * to the total. A separate lifecycle enum alongside these two booleans would
   * be a second source of truth that could disagree with the badge on the row.
   */
  active: boolean;

  /**
   * Days before the tenant's today that the file last moved. Relative for the
   * same reason as `KeyDateSeed` — see above.
   */
  lastUpdatedDaysAgo: number;
  /** Days before the tenant's today that the firm was instructed. */
  openedDaysAgo: number;

  /* ---- Detail view only. Nothing below appears in the list or dashboard. --- */

  /**
   * The court's own file reference, distinct from the firm's `reference`.
   *
   * A Latin identifier in both locales, so it renders under `dir="ltr"`.
   * `null` for a matter with no proceedings issued.
   */
  courtFileNumber: string | null;
  /** Where the file has got to procedurally, per locale. */
  currentPhase: Record<Locale, string>;
  /** Who the client is against, per locale. `null` for non-contentious work. */
  opposingParty: Record<Locale, string> | null;
  /** A short paragraph of what the firm is instructed to do, per locale. */
  scopeSummary: Record<Locale, string>;
  /** The fee earner the client deals with. */
  counsel: EngagementContact;
  /**
   * The procedural record, oldest first. The dashboard's key date is the next
   * uncompleted event in here — see `TimelineEventSeed`.
   */
  timeline: TimelineEventSeed[];
}

// MOCK: replace with GET /api/matters — tenant-scoped AND client-scoped
// server-side. design.md §11 item 6 limits the client portal to "shared
// documents, invoices, matter status only, no internal firm data", and that
// limit has to be enforced by the query, not by which fields the component
// happens to render. Track A.5.
export const demoMatters: Matter[] = [
  {
    id: 'mat-2201',
    reference: 'MAT-2201',
    firmId: demoFirm.id,
    clientId: CLIENT_IDS.gulfHoldings,
    title: {
      en: 'Apollo Commercial Logistics v. Al-Noor Freight',
      ar: 'أبولو للخدمات اللوجستية ضد النور للشحن',
    },
    workType: 'case',
    matterType: { en: 'Commercial litigation', ar: 'نزاع تجاري' },
    leadCounsel: { en: 'Mansoor Al-Farooq', ar: 'منصور الفاروق' },
    forum: { en: 'DIFC Court of First Instance', ar: 'محكمة دبي المالي الابتدائية' },
    status: { en: 'Hearing scheduled', ar: 'جلسة محددة' },
    statusTone: 'warning',
    needsAttention: true,
    attentionReason: {
      en: 'Review the witness statement',
      ar: 'مراجعة إفادة الشهود',
    },
    active: true,
    lastUpdatedDaysAgo: 3,
    openedDaysAgo: 248,
    courtFileNumber: 'CFI-042-2026',
    currentPhase: {
      en: 'Witness examination preparation, pre-trial hearing',
      ar: 'إعداد استجواب الشهود وجلسة ما قبل المحاكمة',
    },
    opposingParty: {
      en: 'Al-Noor Freight and Logistics FZCO',
      ar: 'النور للشحن والخدمات اللوجستية م.م.ح',
    },
    scopeSummary: {
      en: 'Acting for Apollo Commercial Logistics in a damages claim alleging breach of cold-chain multimodal carriage obligations under DIFC Contract Law No. 6 of 2004.',
      ar: 'التمثيل القانوني لشركة أبولو للخدمات اللوجستية في دعوى تعويض عن الإخلال بالتزامات النقل المبرد متعدد الوسائط بموجب قانون العقود رقم 6 لسنة 2004 الصادر عن مركز دبي المالي العالمي.',
    },
    counsel: {
      name: { en: 'Mansoor Al-Farooq', ar: 'منصور الفاروق' },
      role: { en: 'Partner, commercial litigation', ar: 'شريك، قسم النزاعات التجارية' },
      // The firm is in Cairo (fixtures/firm.ts), so its direct lines are
      // Egyptian. The export gave a UAE number to a lawyer at an Egyptian firm.
      phone: '+20 2 2735 1400',
      email: `m.alfarooq@${demoFirm.domain}`,
      supporting: { en: 'Salem Al-Hashemi', ar: 'سالم الهاشمي' },
    },
    timeline: [
      {
        id: 'mat-2201-tl-1',
        inDays: -35,
        kind: 'filing',
        title: { en: 'Defence skeleton argument filed', ar: 'إيداع مذكرة الدفاع الافتتاحية' },
        detail: { en: 'Submitted to the DIFC registry', ar: 'مُودعة لدى سجل محكمة دبي المالي' },
        note: { en: 'Receipt acknowledged', ar: 'تم تأكيد الاستلام' },
        completed: true,
      },
      {
        id: 'mat-2201-tl-2',
        inDays: 3,
        kind: 'hearing',
        title: { en: 'Case management hearing', ar: 'جلسة إدارة الدعوى' },
        detail: {
          en: 'DIFC Court of First Instance, hearing room 3',
          ar: 'محكمة دبي المالي الابتدائية، قاعة 3',
        },
        note: { en: 'Witness statement review due', ar: 'مطلوب مراجعة إفادة الشهود' },
        completed: false,
        awaitingClient: true,
      },
      {
        id: 'mat-2201-tl-3',
        inDays: 11,
        kind: 'submission',
        title: { en: 'Supplemental witness statement', ar: 'الإفادة التكميلية للشهود' },
        detail: { en: 'Filing deadline with the registrar', ar: 'الموعد النهائي للإيداع لدى المسجّل' },
        note: { en: 'Being prepared by the firm', ar: 'قيد الإعداد لدى المكتب' },
        completed: false,
      },
      {
        id: 'mat-2201-tl-4',
        inDays: 28,
        kind: 'conference',
        title: { en: 'Pre-trial witness conference', ar: 'اجتماع الشهود التحضيري' },
        detail: {
          en: 'Joint session with the quantum expert',
          ar: 'جلسة مشتركة مع خبير تقدير الأضرار',
        },
        note: null,
        completed: false,
      },
    ],
  },
  {
    id: 'mat-1940',
    reference: 'MAT-1940',
    firmId: demoFirm.id,
    clientId: CLIENT_IDS.gulfHoldings,
    title: {
      en: 'Marina Tower EPC contract arbitration',
      ar: 'تحكيم عقد المقاولات الهندسية لمشروع مارينا تاور',
    },
    workType: 'case',
    matterType: {
      en: 'Construction and infrastructure',
      ar: 'منازعات إنشائية وبنية تحتية',
    },
    leadCounsel: { en: 'Salem Al-Hashemi', ar: 'سالم الهاشمي' },
    forum: { en: 'DIAC arbitration proceeding', ar: 'مركز دبي للتحكيم الدولي' },
    status: { en: 'Memorial submitted', ar: 'تم تقديم المذكرة' },
    statusTone: 'success',
    needsAttention: false,
    attentionReason: null,
    active: true,
    lastUpdatedDaysAgo: 6,
    openedDaysAgo: 402,
    courtFileNumber: 'DIAC-2025-118',
    currentPhase: {
      en: 'Expert evidence exchange',
      ar: 'تبادل تقارير الخبرة',
    },
    opposingParty: {
      en: 'Marina Tower Development LLC',
      ar: 'مارينا تاور للتطوير ذ.م.م',
    },
    scopeSummary: {
      en: 'Representing the employer in a DIAC arbitration over delay and variation claims on the Marina Tower EPC contract.',
      ar: 'تمثيل صاحب العمل في تحكيم أمام مركز دبي للتحكيم الدولي بشأن مطالبات التأخير والتغييرات في عقد المقاولات الهندسية لمشروع مارينا تاور.',
    },
    counsel: {
      name: { en: 'Salem Al-Hashemi', ar: 'سالم الهاشمي' },
      role: { en: 'Partner, construction disputes', ar: 'شريك، منازعات الإنشاءات' },
      phone: '+20 2 2735 1418',
      email: `s.alhashemi@${demoFirm.domain}`,
      supporting: null,
    },
    timeline: [
      {
        id: 'mat-1940-tl-1',
        inDays: -22,
        kind: 'submission',
        title: { en: 'Statement of claim submitted', ar: 'تقديم مذكرة الدعوى' },
        detail: { en: 'Filed with the DIAC tribunal', ar: 'مُودعة لدى هيئة التحكيم' },
        note: { en: 'Receipt acknowledged', ar: 'تم تأكيد الاستلام' },
        completed: true,
      },
      {
        id: 'mat-1940-tl-2',
        inDays: 11,
        kind: 'submission',
        title: { en: 'Expert witness submission', ar: 'إيداع تقرير الخبير' },
        detail: { en: 'Arbitral tribunal deadline', ar: 'موعد نهائي أمام هيئة التحكيم' },
        note: null,
        completed: false,
      },
      {
        id: 'mat-1940-tl-3',
        inDays: 54,
        kind: 'hearing',
        title: { en: 'Substantive arbitration hearing', ar: 'جلسة التحكيم الموضوعية' },
        detail: { en: 'DIAC, Dubai', ar: 'مركز دبي للتحكيم الدولي، دبي' },
        note: null,
        completed: false,
      },
    ],
  },
  {
    id: 'mat-3088',
    reference: 'MAT-3088',
    firmId: demoFirm.id,
    clientId: CLIENT_IDS.gulfHoldings,
    title: {
      en: 'Cross-border IP licensing and royalty audit',
      ar: 'تدقيق عقود ترخيص حقوق الملكية الفكرية والعوائد',
    },
    workType: 'consultation',
    matterType: { en: 'Intellectual property', ar: 'ملكية فكرية' },
    leadCounsel: { en: 'Huda Al-Mansoor', ar: 'هدى المنصور' },
    forum: { en: 'Riyadh Commercial Court', ar: 'المحكمة التجارية بالرياض' },
    status: { en: 'Draft disclosure pending your approval', ar: 'مسودة الإفصاح بانتظار اعتمادك' },
    statusTone: 'warning',
    needsAttention: true,
    attentionReason: {
      en: 'Sign the disclosure authorisation',
      ar: 'توقيع تفويض الإفصاح',
    },
    active: true,
    lastUpdatedDaysAgo: 8,
    openedDaysAgo: 165,
    courtFileNumber: 'RCC-2026-0771',
    currentPhase: { en: 'Pre-action disclosure', ar: 'الإفصاح السابق للدعوى' },
    opposingParty: { en: 'Najd Media Holding', ar: 'نجد القابضة للإعلام' },
    scopeSummary: {
      en: 'Auditing licensed use and royalty accounting across the client’s Gulf trade marks, and preparing the disclosure that precedes any claim.',
      ar: 'تدقيق الاستخدام المرخّص وحسابات العوائد على علامات العميل التجارية في الخليج، وإعداد الإفصاح السابق لأي دعوى.',
    },
    counsel: {
      name: { en: 'Huda Al-Mansoor', ar: 'هدى المنصور' },
      role: { en: 'Counsel, intellectual property', ar: 'محامية، الملكية الفكرية' },
      phone: '+20 2 2735 1425',
      email: `h.almansoor@${demoFirm.domain}`,
      supporting: null,
    },
    timeline: [
      {
        id: 'mat-3088-tl-1',
        inDays: -60,
        kind: 'filing',
        title: { en: 'Royalty audit instructed', ar: 'التكليف بتدقيق العوائد' },
        detail: { en: 'Scope agreed with the client', ar: 'تم الاتفاق على النطاق مع العميل' },
        note: null,
        completed: true,
      },
      {
        id: 'mat-3088-tl-2',
        inDays: 21,
        kind: 'submission',
        title: { en: 'Disclosure bundle lodged', ar: 'إيداع حافظة الإفصاح' },
        detail: { en: 'Riyadh Commercial Court deadline', ar: 'الموعد النهائي للمحكمة التجارية بالرياض' },
        note: {
          en: 'A signed authorisation is needed first',
          ar: 'يلزم تفويض موقّع أولًا',
        },
        completed: false,
        awaitingClient: true,
      },
    ],
  },
  {
    id: 'mat-1875',
    reference: 'MAT-1875',
    firmId: demoFirm.id,
    clientId: CLIENT_IDS.gulfHoldings,
    title: {
      en: 'Financial regulatory advisory on sukuk issuance',
      ar: 'الاستشارات التنظيمية المالية لإصدار الصكوك',
    },
    workType: 'consultation',
    matterType: {
      en: 'Banking and capital markets',
      ar: 'أسواق المال والخدمات المصرفية',
    },
    leadCounsel: { en: 'Mansoor Al-Farooq', ar: 'منصور الفاروق' },
    forum: { en: 'SCA UAE compliance', ar: 'هيئة الأوراق المالية والسلع' },
    status: { en: 'Prospectus signed', ar: 'تم توقيع نشرة الاكتتاب' },
    statusTone: 'success',
    needsAttention: false,
    attentionReason: null,
    active: true,
    lastUpdatedDaysAgo: 13,
    openedDaysAgo: 310,
    courtFileNumber: null,
    currentPhase: { en: 'Post-issuance reporting', ar: 'التقارير اللاحقة للإصدار' },
    // Advisory work — there is no opponent. The detail view omits the row
    // rather than printing a label with nothing after it.
    opposingParty: null,
    scopeSummary: {
      en: 'Advising on regulatory approvals and continuing disclosure obligations for the client’s sukuk programme.',
      ar: 'تقديم المشورة بشأن الموافقات التنظيمية والتزامات الإفصاح المستمر لبرنامج الصكوك الخاص بالعميل.',
    },
    counsel: {
      name: { en: 'Mansoor Al-Farooq', ar: 'منصور الفاروق' },
      role: { en: 'Partner, commercial litigation', ar: 'شريك، قسم النزاعات التجارية' },
      phone: '+20 2 2735 1400',
      email: `m.alfarooq@${demoFirm.domain}`,
      supporting: null,
    },
    timeline: [
      {
        id: 'mat-1875-tl-1',
        inDays: -18,
        kind: 'filing',
        title: { en: 'Prospectus signed', ar: 'توقيع نشرة الاكتتاب' },
        detail: { en: 'Lodged with the regulator', ar: 'مُودعة لدى الجهة التنظيمية' },
        note: { en: 'Approval confirmed', ar: 'تم تأكيد الموافقة' },
        completed: true,
      },
    ],
  },
  {
    // Introduced by the matters list. Neither waiting on the client nor
    // finished — the "In progress" filter's reason to exist.
    id: 'mat-2412',
    reference: 'MAT-2412',
    firmId: demoFirm.id,
    clientId: CLIENT_IDS.gulfHoldings,
    title: {
      en: 'Al-Baraka commercial leasehold portfolio dispute',
      ar: 'نزاع عقود إيجار محفظة البركة العقارية التجارية',
    },
    workType: 'case',
    matterType: { en: 'Real estate litigation', ar: 'منازعات عقارية' },
    leadCounsel: { en: 'Fatima Al-Zahra', ar: 'فاطمة الزهراء' },
    forum: { en: 'Abu Dhabi Commercial Court', ar: 'محكمة أبوظبي التجارية' },
    status: { en: 'Evidence collation', ar: 'جمع الأدلة ومراجعتها' },
    statusTone: 'info',
    needsAttention: false,
    attentionReason: null,
    active: true,
    lastUpdatedDaysAgo: 17,
    openedDaysAgo: 96,
    courtFileNumber: 'ADCC-2026-3310',
    currentPhase: { en: 'Evidence collation', ar: 'جمع الأدلة ومراجعتها' },
    opposingParty: { en: 'Corniche Estates LLC', ar: 'الكورنيش العقارية ذ.م.م' },
    scopeSummary: {
      en: 'Acting on a portfolio-wide dispute over service charge and rent review provisions across twelve commercial leases.',
      ar: 'التمثيل في نزاع يشمل المحفظة بأكملها حول بنود رسوم الخدمات ومراجعة الأجرة في اثني عشر عقد إيجار تجاري.',
    },
    counsel: {
      name: { en: 'Fatima Al-Zahra', ar: 'فاطمة الزهراء' },
      role: { en: 'Senior associate, real estate', ar: 'محامية أولى، القطاع العقاري' },
      phone: '+20 2 2735 1432',
      email: `f.alzahra@${demoFirm.domain}`,
      supporting: null,
    },
    timeline: [
      {
        id: 'mat-2412-tl-1',
        inDays: -40,
        kind: 'filing',
        title: { en: 'Claim issued', ar: 'قيد الدعوى' },
        detail: { en: 'Abu Dhabi Commercial Court', ar: 'محكمة أبوظبي التجارية' },
        note: null,
        completed: true,
      },
      {
        id: 'mat-2412-tl-2',
        inDays: 62,
        kind: 'submission',
        title: { en: 'Evidence bundle exchange', ar: 'تبادل حوافظ الأدلة' },
        detail: { en: 'Court-directed deadline', ar: 'موعد محدد من المحكمة' },
        note: null,
        completed: false,
      },
    ],
  },
  {
    // The only closed file. It exists so the list's "Closed" filter has
    // something in it and so "Showing 5 of 6" is a real subset rather than a
    // caption over an unfiltered list.
    id: 'mat-1104',
    reference: 'MAT-1104',
    firmId: demoFirm.id,
    clientId: CLIENT_IDS.gulfHoldings,
    title: {
      en: 'Joint venture telecom concession de-merger',
      ar: 'تسوية وإنهاء شراكة مشروع الاتصالات المشترك',
    },
    workType: 'contract',
    matterType: { en: 'Corporate governance', ar: 'حوكمة الشركات' },
    leadCounsel: { en: 'Salem Al-Hashemi', ar: 'سالم الهاشمي' },
    forum: { en: 'ADGM Courts', ar: 'محاكم سوق أبوظبي العالمي' },
    status: { en: 'Settlement finalised', ar: 'تم اعتماد التسوية النهائية' },
    // `success` rather than the export's grey: the settlement completing is a
    // good outcome, and design.md §2 gives that tone to "completed steps,
    // confirmations". That the file is now closed is carried by `active`, and
    // shown as its own neutral badge — a lifecycle fact, not a colour.
    statusTone: 'success',
    needsAttention: false,
    attentionReason: null,
    active: false,
    lastUpdatedDaysAgo: 27,
    openedDaysAgo: 520,
    courtFileNumber: 'ADGM-2025-0044',
    currentPhase: { en: 'Closed', ar: 'منتهية' },
    opposingParty: { en: 'Gulfnet Telecom PJSC', ar: 'جلفنت للاتصالات ش.م.ع' },
    scopeSummary: {
      en: 'Unwinding a joint venture telecom concession, including the settlement agreement and the transfer of licensed spectrum.',
      ar: 'إنهاء امتياز اتصالات مشترك، بما يشمل اتفاق التسوية ونقل الترددات المرخّصة.',
    },
    counsel: {
      name: { en: 'Salem Al-Hashemi', ar: 'سالم الهاشمي' },
      role: { en: 'Partner, construction disputes', ar: 'شريك، منازعات الإنشاءات' },
      phone: '+20 2 2735 1418',
      email: `s.alhashemi@${demoFirm.domain}`,
      supporting: null,
    },
    timeline: [
      {
        id: 'mat-1104-tl-1',
        inDays: -95,
        kind: 'conference',
        title: { en: 'Settlement conference', ar: 'جلسة التسوية' },
        detail: { en: 'ADGM Courts, Abu Dhabi', ar: 'محاكم سوق أبوظبي العالمي، أبوظبي' },
        note: null,
        completed: true,
      },
      {
        id: 'mat-1104-tl-2',
        inDays: -27,
        kind: 'filing',
        title: { en: 'Settlement approved and filed', ar: 'اعتماد التسوية وإيداعها' },
        detail: { en: 'ADGM Courts registry', ar: 'سجل محاكم سوق أبوظبي العالمي' },
        note: { en: 'Matter closed', ar: 'أُغلق الملف' },
        completed: true,
      },
    ],
  },
  /* =========================================================================
   * The other clients' files
   * -------------------------------------------------------------------------
   * Added with the `clientId` split. Until then every matter here belonged to
   * the one client with a portal account, which made the CRM read as though
   * the firm had four clients it did nothing for.
   *
   * Each one is exactly the work that client's own record already describes —
   * fixtures/clients.ts, `summary`. Nothing below gives a client a second file
   * the firm was not already said to be handling: a directory is the easiest
   * screen in this product on which to invent a book of work, and the Stitch
   * export invents 142 of them.
   *
   * The forums are Egyptian, which the six above are not. The firm is in Cairo
   * (fixtures/firm.ts) and acts for Gulf Holdings in Gulf forums deliberately;
   * its Egyptian clients are heard by Egyptian courts and licensed by Egyptian
   * authorities. All three institutions named below are real.
   * ====================================================================== */
  {
    id: 'mat-4021',
    reference: 'MAT-4021',
    firmId: demoFirm.id,
    clientId: CLIENT_IDS.nileDelta,
    title: {
      en: 'Export licence renewal, citrus and processed produce',
      ar: 'تجديد رخصة التصدير للموالح والحاصلات المصنّعة',
    },
    workType: 'consultation',
    matterType: { en: 'Trade and customs regulation', ar: 'تنظيم التجارة والجمارك' },
    leadCounsel: { en: 'Fatima Al-Zahra', ar: 'فاطمة الزهراء' },
    forum: {
      en: 'General Organisation for Export and Import Control',
      ar: 'الهيئة العامة للرقابة على الصادرات والواردات',
    },
    status: { en: 'Application under review', ar: 'الطلب قيد الفحص' },
    statusTone: 'info',
    needsAttention: false,
    attentionReason: null,
    active: true,
    lastUpdatedDaysAgo: 1,
    openedDaysAgo: 64,
    courtFileNumber: 'GOEIC-2026-0881',
    currentPhase: {
      en: 'Technical dossier filed, inspection being scheduled',
      ar: 'إيداع الملف الفني وجارٍ تحديد موعد المعاينة',
    },
    opposingParty: null,
    scopeSummary: {
      en: 'Renewing the exporter registration and the accompanying product certificates for the citrus and processed produce lines, and answering the authority’s technical queries on cold-store conformity.',
      ar: 'تجديد قيد المُصدّر وشهادات المنتجات المصاحبة لخطوط الموالح والحاصلات المصنّعة، والرد على استفسارات الهيئة الفنية بشأن مطابقة مخازن التبريد.',
    },
    counsel: {
      name: { en: 'Fatima Al-Zahra', ar: 'فاطمة الزهراء' },
      role: {
        en: 'Senior associate, trade and regulatory',
        ar: 'مستشارة أولى، التجارة والشؤون التنظيمية',
      },
      phone: '+20 2 2735 1408',
      email: `f.alzahra@${demoFirm.domain}`,
      supporting: { en: 'Noor Abdelrahman', ar: 'نور عبد الرحمن' },
    },
    timeline: [
      {
        id: 'mat-4021-tl-1',
        inDays: -22,
        kind: 'filing',
        title: { en: 'Renewal application lodged', ar: 'إيداع طلب التجديد' },
        detail: { en: 'Exporter register, Cairo office', ar: 'سجل المصدّرين، مكتب القاهرة' },
        note: { en: 'Receipt issued', ar: 'صدر إيصال الاستلام' },
        completed: true,
      },
      {
        id: 'mat-4021-tl-2',
        inDays: -4,
        kind: 'submission',
        title: {
          en: 'Cold-store conformity annexes filed',
          ar: 'إيداع مرفقات مطابقة مخازن التبريد',
        },
        detail: { en: 'In answer to the authority’s query', ar: 'رداً على استفسار الهيئة' },
        note: null,
        completed: true,
      },
      {
        id: 'mat-4021-tl-3',
        inDays: 16,
        kind: 'conference',
        title: { en: 'Site inspection at the Damietta facility', ar: 'معاينة موقع منشأة دمياط' },
        detail: { en: 'Joint visit with the authority’s inspectors', ar: 'زيارة مشتركة مع مفتشي الهيئة' },
        note: null,
        completed: false,
      },
    ],
  },
  {
    id: 'mat-3310',
    reference: 'MAT-3310',
    firmId: demoFirm.id,
    clientId: CLIENT_IDS.helwan,
    title: {
      en: 'Collective redundancy claim, foundry division',
      ar: 'دعوى الفصل الجماعي بقطاع المسبك',
    },
    workType: 'case',
    matterType: { en: 'Employment and labour', ar: 'العمل والتوظيف' },
    leadCounsel: { en: 'Dalia Al-Sabah', ar: 'داليا الصباح' },
    forum: {
      en: 'South Cairo Court of First Instance, labour circuit',
      ar: 'محكمة جنوب القاهرة الابتدائية، الدائرة العمالية',
    },
    status: { en: 'Evidence collation', ar: 'جمع المستندات' },
    statusTone: 'info',
    needsAttention: true,
    attentionReason: {
      en: 'Confirm the severance schedule',
      ar: 'اعتماد جدول مكافآت نهاية الخدمة',
    },
    active: true,
    lastUpdatedDaysAgo: 2,
    openedDaysAgo: 96,
    courtFileNumber: 'LAB-2026-4471',
    currentPhase: {
      en: 'Documents exchanged, conciliation sitting listed',
      ar: 'تبادل المستندات وتحديد جلسة التسوية',
    },
    opposingParty: {
      en: 'Twenty-four former employees of the foundry division',
      ar: 'أربعة وعشرون من العاملين السابقين بقطاع المسبك',
    },
    scopeSummary: {
      en: 'Defending a collective claim for reinstatement and compensation following the closure of the foundry division, and settling the severance schedule the court will be asked to endorse.',
      ar: 'الدفاع في دعوى جماعية بطلب إعادة العاملين إلى العمل والتعويض عقب غلق قطاع المسبك، وضبط جدول مكافآت نهاية الخدمة المطلوب اعتماده من المحكمة.',
    },
    counsel: {
      name: { en: 'Dalia Al-Sabah', ar: 'داليا الصباح' },
      role: { en: 'Senior associate, employment', ar: 'مستشارة أولى، قسم العمل' },
      phone: '+20 2 2735 1412',
      email: `d.alsabah@${demoFirm.domain}`,
      supporting: { en: 'Noor Abdelrahman', ar: 'نور عبد الرحمن' },
    },
    timeline: [
      {
        id: 'mat-3310-tl-1',
        inDays: -48,
        kind: 'filing',
        title: { en: 'Statement of defence filed', ar: 'إيداع مذكرة الدفاع' },
        detail: { en: 'South Cairo court registry', ar: 'قلم محكمة جنوب القاهرة' },
        note: { en: 'Served on the claimants', ar: 'أُعلنت للمدعين' },
        completed: true,
      },
      {
        id: 'mat-3310-tl-2',
        inDays: 6,
        kind: 'hearing',
        title: { en: 'Conciliation sitting', ar: 'جلسة التسوية الودية' },
        detail: { en: 'Labour circuit, chamber 2', ar: 'الدائرة العمالية، القاعة 2' },
        note: {
          en: 'Severance schedule to be confirmed',
          ar: 'مطلوب اعتماد جدول مكافآت نهاية الخدمة',
        },
        completed: false,
        awaitingClient: true,
      },
      {
        id: 'mat-3310-tl-3',
        inDays: 34,
        kind: 'hearing',
        title: { en: 'Substantive hearing', ar: 'جلسة المرافعة' },
        detail: {
          en: 'Listed subject to the conciliation outcome',
          ar: 'محددة رهناً بنتيجة جلسة التسوية',
        },
        note: null,
        completed: false,
      },
    ],
  },
  {
    id: 'mat-2760',
    reference: 'MAT-2760',
    firmId: demoFirm.id,
    clientId: CLIENT_IDS.alexandriaPort,
    title: {
      en: 'Container terminal concession renewal',
      ar: 'تجديد امتياز محطة الحاويات',
    },
    workType: 'contract',
    matterType: { en: 'Regulatory and concessions', ar: 'الشؤون التنظيمية والامتيازات' },
    leadCounsel: { en: 'Rami Al-Khatib', ar: 'رامي الخطيب' },
    forum: { en: 'Alexandria Port Authority', ar: 'هيئة ميناء الإسكندرية' },
    status: { en: 'Terms under negotiation', ar: 'التفاوض على الشروط' },
    statusTone: 'warning',
    needsAttention: false,
    attentionReason: null,
    active: true,
    lastUpdatedDaysAgo: 4,
    openedDaysAgo: 152,
    courtFileNumber: 'APA-CONC-2026-17',
    currentPhase: {
      en: 'Draft terms with the authority’s legal department',
      ar: 'مسودة الشروط لدى الإدارة القانونية بالهيئة',
    },
    opposingParty: null,
    scopeSummary: {
      en: 'Acting on the renewal of the container terminal concession, including the revised throughput undertakings, the investment schedule and the handover regime at the end of the term.',
      ar: 'التمثيل في تجديد امتياز محطة الحاويات، بما يشمل تعديل التزامات الطاقة التشغيلية وجدول الاستثمار ونظام التسليم عند انتهاء المدة.',
    },
    counsel: {
      name: { en: 'Rami Al-Khatib', ar: 'رامي الخطيب' },
      role: {
        en: 'Partner, infrastructure and concessions',
        ar: 'شريك، البنية التحتية والامتيازات',
      },
      phone: '+20 2 2735 1404',
      email: `r.alkhatib@${demoFirm.domain}`,
      supporting: null,
    },
    timeline: [
      {
        id: 'mat-2760-tl-1',
        inDays: -61,
        kind: 'submission',
        title: { en: 'Renewal proposal submitted', ar: 'تقديم مقترح التجديد' },
        detail: {
          en: 'To the authority’s concessions committee',
          ar: 'إلى لجنة الامتيازات بالهيئة',
        },
        note: { en: 'Acknowledged', ar: 'تم الإقرار بالاستلام' },
        completed: true,
      },
      {
        id: 'mat-2760-tl-2',
        inDays: 9,
        kind: 'conference',
        title: {
          en: 'Negotiation session on throughput undertakings',
          ar: 'جلسة تفاوض بشأن التزامات الطاقة التشغيلية',
        },
        detail: { en: 'Authority headquarters, Alexandria', ar: 'المقر الرئيسي للهيئة، الإسكندرية' },
        note: null,
        completed: false,
      },
      {
        id: 'mat-2760-tl-3',
        inDays: 41,
        kind: 'filing',
        title: { en: 'Executed concession deed lodged', ar: 'إيداع عقد الامتياز الموقّع' },
        detail: { en: 'Subject to the committee’s approval', ar: 'رهناً بموافقة اللجنة' },
        note: null,
        completed: false,
      },
    ],
  },
];
