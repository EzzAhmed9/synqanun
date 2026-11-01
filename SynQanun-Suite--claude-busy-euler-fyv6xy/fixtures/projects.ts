import { CLIENT_IDS } from './clients';
import type { EngagementContact, EngagementStatusTone, TimelineEventSeed } from './engagements';
import { demoFirm } from './firm';
import type { Locale } from '@/lib/i18n/routing';

/**
 * fixtures/projects.ts — the client's transactional and corporate engagements.
 *
 * A project is the non-contentious counterpart to a matter: a restructuring, an
 * entity formation, a due diligence exercise. It has a project lead rather than
 * lead counsel, a jurisdiction or registry rather than a forum, and it
 * COMPLETES rather than closing.
 *
 * Its shared shapes come from fixtures/engagements.ts, which both this file and
 * fixtures/matters.ts import. They used to come from matters.ts directly, which
 * made a project look like a kind of matter; it is not, and at three shared
 * types that reading had stopped being harmless.
 *
 * DATES LIVE ON THE TIMELINE — the migration matters.ts already made
 * ---------------------------------------------------------------------------
 * A project used to carry a single `KeyDateSeed` for the dashboard strip,
 * because there was no project detail screen and inventing a procedural history
 * for one would have been fixture data no screen asked for. That screen now
 * exists, so projects carry a real `timeline` and the dashboard's key date is
 * DERIVED from it — the next event still ahead. `KeyDateSeed` was the last of
 * its kind and is gone.
 *
 * The firm is not restated; `firmId` points at fixtures/firm.ts.
 */

export interface Project {
  id: string;
  /** Client-visible reference, JetBrains Mono per design.md §3. */
  reference: string;
  firmId: string;
  /**
   * The client whose transaction this is - an id into fixtures/clients.ts.
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
  /**
   * The kind of work, per locale — corporate restructuring, SPV formation, and
   * so on. The project-side counterpart of `Matter.matterType`.
   *
   * MOCK: a controlled vocabulary in the real schema, not free text — the firm
   * reports and filters on it. Track A.5.
   */
  category: Record<Locale, string>;
  /**
   * Project lead's full display name, per locale. No honorific — see
   * `EngagementContact.name` for why.
   *
   * MOCK: denormalised for the prototype; the real record holds a `leadId` into
   * the users table. Track A.5.
   */
  manager: Record<Locale, string>;
  /** Jurisdiction or registry the work sits under, per locale. */
  jurisdiction: Record<Locale, string>;

  status: Record<Locale, string>;
  statusTone: EngagementStatusTone;
  /** Something is waiting on the client. Shown as a badge on the item itself. */
  needsAttention: boolean;
  /** WHAT the client has to do, per locale. `null` unless `needsAttention`. */
  attentionReason: Record<Locale, string> | null;

  /**
   * Live engagements show on the dashboard; completed ones only in the full
   * list. Drives the list's filter strip exactly as `Matter.active` does:
   * "Needs attention" is `needsAttention`, "Completed" is `!active`, and "In
   * progress" is everything else — three filters that partition the list and
   * whose counts always sum to the total.
   */
  active: boolean;

  /** Days before the tenant's today that the engagement last moved. */
  lastUpdatedDaysAgo: number;
  /** Days before the tenant's today that the firm was instructed. */
  openedDaysAgo: number;

  /* ---- Detail view only. Nothing below appears in the list or dashboard. --- */

  /**
   * Commercial registration or registry file number, distinct from the firm's
   * own `reference`. A Latin identifier in both locales, so it renders under
   * `dir="ltr"`. `null` before anything is filed.
   */
  registrationNumber: string | null;
  /** Where the work has got to, per locale. */
  currentPhase: Record<Locale, string>;
  /**
   * The corporate entities the work acts on, per locale.
   *
   * The project-side counterpart of `Matter.opposingParty` — a transaction has
   * subjects rather than an opponent. `null` where none is named yet.
   */
  targetEntities: Record<Locale, string> | null;
  /** A short paragraph of what the firm is instructed to do, per locale. */
  scopeSummary: Record<Locale, string>;
  /** The project lead the client deals with. */
  lead: EngagementContact;
  /** The procedural record, oldest first. Feeds the dashboard's key dates. */
  timeline: TimelineEventSeed[];
}

// MOCK: replace with GET /api/projects — tenant-scoped and client-scoped
// server-side, same constraint as matters. design.md §11 item 6 keeps internal
// firm data (fee earners' time, internal notes, conflicts) out of this payload
// entirely; scoping it in the query is the only place that can be enforced.
// Track A.5.
export const demoProjects: Project[] = [
  {
    id: 'prj-4410',
    reference: 'PRJ-4410',
    firmId: demoFirm.id,
    clientId: CLIENT_IDS.gulfHoldings,
    title: {
      en: 'Regional asset restructuring and holdings transfer',
      ar: 'إعادة هيكلة الأصول الإقليمية ونقل ملكية الشركات القابضة',
    },
    category: { en: 'Corporate restructuring', ar: 'إعادة هيكلة الشركات' },
    manager: { en: 'Rami Al-Khatib', ar: 'رامي الخطيب' },
    jurisdiction: { en: 'UAE and KSA', ar: 'الإمارات والسعودية' },
    status: { en: 'Shareholder approval required', ar: 'موافقة المساهمين مطلوبة' },
    statusTone: 'warning',
    needsAttention: true,
    attentionReason: {
      en: 'Execute the shareholder resolution',
      ar: 'اعتماد وتوقيع قرار الشركاء',
    },
    active: true,
    lastUpdatedDaysAgo: 1,
    openedDaysAgo: 242,
    registrationNumber: 'REG-KSA-99214',
    currentPhase: {
      en: 'Phase 3: shareholder asset allocation and cross-border novation',
      ar: 'المرحلة 3: تخصيص أصول المساهمين وحوالة العقود عبر الحدود',
    },
    targetEntities: {
      en: 'Gulf Holdings International Ltd and Saudi Logistics FZCO',
      ar: 'الخليج القابضة الدولية المحدودة والسعودية للخدمات اللوجستية م.م.ح',
    },
    scopeSummary: {
      en: 'Restructuring the operating subsidiaries across Dubai and Riyadh into a unified holding structure, including cross-border asset novation and the MISA regulatory filings that follow it.',
      ar: 'إعادة هيكلة الشركات التابعة العاملة في دبي والرياض ضمن كيان قابض موحّد، بما يشمل حوالة الأصول عبر الحدود والإيداعات النظامية اللاحقة لدى وزارة الاستثمار.',
    },
    lead: {
      name: { en: 'Rami Al-Khatib', ar: 'رامي الخطيب' },
      role: { en: 'Partner, corporate and M&A', ar: 'شريك، الشركات والاستحواذ' },
      // Cairo firm, Cairo number — the export gave a UAE line to a lawyer at an
      // Egyptian firm, and an @firm-portal.ae address to a firm whose domain is
      // in fixtures/firm.ts.
      phone: '+20 2 2735 1406',
      email: `r.alkhatib@${demoFirm.domain}`,
      supporting: { en: 'Fatima Al-Zahra', ar: 'فاطمة الزهراء' },
    },
    timeline: [
      {
        id: 'prj-4410-tl-1',
        inDays: -33,
        kind: 'filing',
        title: { en: 'Initial tax and entity due diligence', ar: 'الفحص الضريبي وفحص الكيانات الأولي' },
        detail: { en: 'Cross-border tax clearance submitted', ar: 'تقديم المخالصة الضريبية عبر الحدود' },
        note: { en: 'Clearance certificate issued', ar: 'صدرت شهادة المخالصة' },
        completed: true,
      },
      {
        id: 'prj-4410-tl-2',
        inDays: 7,
        kind: 'filing',
        title: { en: 'MISA licensing approval', ar: 'موافقة وزارة الاستثمار على الترخيص' },
        detail: { en: 'Ministry of Investment, Riyadh', ar: 'وزارة الاستثمار، الرياض' },
        note: {
          en: 'Signed shareholder consent is needed first',
          ar: 'تلزم موافقة المساهمين الموقّعة أولًا',
        },
        completed: false,
        awaitingClient: true,
      },
      {
        id: 'prj-4410-tl-3',
        inDays: 15,
        kind: 'submission',
        title: { en: 'Holdings asset novation deed', ar: 'صك حوالة الأصول القابضة' },
        detail: { en: 'ADGM Registry of Companies', ar: 'سجل الشركات بسوق أبوظبي العالمي' },
        note: { en: 'Draft finalised with the lead', ar: 'اكتملت المسودة لدى المستشار المسؤول' },
        completed: false,
      },
      {
        id: 'prj-4410-tl-4',
        inDays: 34,
        kind: 'conference',
        title: { en: 'Extraordinary general meeting', ar: 'الجمعية العمومية غير العادية' },
        detail: {
          en: 'Shareholder vote and board reconstitution',
          ar: 'تصويت المساهمين وإعادة تشكيل مجلس الإدارة',
        },
        note: null,
        completed: false,
      },
    ],
  },
  {
    id: 'prj-3902',
    reference: 'PRJ-3902',
    firmId: demoFirm.id,
    clientId: CLIENT_IDS.gulfHoldings,
    title: {
      en: 'ADGM special purpose vehicle registration',
      ar: 'تسجيل شركة ذات غرض خاص بسوق أبوظبي العالمي',
    },
    category: { en: 'SPV and asset protection', ar: 'الشركات ذات الغرض الخاص وحماية الأصول' },
    manager: { en: 'Dalia Al-Sabah', ar: 'داليا الصباح' },
    jurisdiction: { en: 'ADGM Registration Authority', ar: 'سلطة التسجيل في سوق أبوظبي العالمي' },
    status: { en: 'Articles filed', ar: 'تم إيداع عقد التأسيس' },
    statusTone: 'success',
    needsAttention: false,
    attentionReason: null,
    active: true,
    lastUpdatedDaysAgo: 5,
    openedDaysAgo: 128,
    registrationNumber: 'ADGM-SPV-11740',
    currentPhase: { en: 'Awaiting certificate of incorporation', ar: 'بانتظار شهادة التأسيس' },
    targetEntities: {
      en: 'Gulf Holdings SPV I Ltd',
      ar: 'الخليج القابضة — الشركة ذات الغرض الخاص الأولى المحدودة',
    },
    scopeSummary: {
      en: 'Incorporating a special purpose vehicle at ADGM to ring-fence the group’s regional real estate holdings, and preparing its constitutional documents.',
      ar: 'تأسيس شركة ذات غرض خاص في سوق أبوظبي العالمي لعزل الأصول العقارية الإقليمية للمجموعة، وإعداد وثائقها التأسيسية.',
    },
    lead: {
      name: { en: 'Dalia Al-Sabah', ar: 'داليا الصباح' },
      role: { en: 'Senior associate, corporate', ar: 'محامية أولى، قسم الشركات' },
      phone: '+20 2 2735 1411',
      email: `d.alsabah@${demoFirm.domain}`,
      supporting: null,
    },
    timeline: [
      {
        id: 'prj-3902-tl-1',
        inDays: -12,
        kind: 'filing',
        title: { en: 'Articles of association filed', ar: 'إيداع عقد التأسيس' },
        detail: { en: 'ADGM Registry of Companies', ar: 'سجل الشركات بسوق أبوظبي العالمي' },
        note: { en: 'Filing acknowledged', ar: 'تم الإقرار باستلام الإيداع' },
        completed: true,
      },
      {
        id: 'prj-3902-tl-2',
        inDays: 18,
        kind: 'conference',
        title: { en: 'Board resolution signoff', ar: 'اعتماد قرار مجلس الإدارة' },
        detail: { en: 'ADGM registration approval', ar: 'موافقة التسجيل في سوق أبوظبي العالمي' },
        note: null,
        completed: false,
      },
    ],
  },
  {
    id: 'prj-2819',
    reference: 'PRJ-2819',
    firmId: demoFirm.id,
    clientId: CLIENT_IDS.gulfHoldings,
    title: {
      en: 'Series B preferred share investment due diligence',
      ar: 'الفحص النافي للجهالة لاستثمار الأسهم الممتازة — الجولة ب',
    },
    category: { en: 'Venture capital and growth equity', ar: 'رأس المال الجريء وأسهم النمو' },
    manager: { en: 'Rami Al-Khatib', ar: 'رامي الخطيب' },
    jurisdiction: { en: 'MENA technology advisory', ar: 'استشارات التقنية في الشرق الأوسط' },
    status: { en: 'Report finalised', ar: 'تم إنجاز التقرير النهائي' },
    statusTone: 'success',
    needsAttention: false,
    attentionReason: null,
    active: true,
    lastUpdatedDaysAgo: 9,
    openedDaysAgo: 88,
    registrationNumber: null,
    currentPhase: { en: 'Report delivered, awaiting instructions', ar: 'تم تسليم التقرير، بانتظار التعليمات' },
    targetEntities: { en: 'Mishkat Technologies FZ-LLC', ar: 'مشكاة للتقنيات م.م.ح' },
    scopeSummary: {
      en: 'Legal due diligence on a Series B preferred share subscription, covering cap table, IP ownership and material contracts.',
      ar: 'فحص قانوني نافٍ للجهالة لاكتتاب أسهم ممتازة في الجولة ب، يغطي هيكل الملكية وملكية حقوق الملكية الفكرية والعقود الجوهرية.',
    },
    lead: {
      name: { en: 'Rami Al-Khatib', ar: 'رامي الخطيب' },
      role: { en: 'Partner, corporate and M&A', ar: 'شريك، الشركات والاستحواذ' },
      phone: '+20 2 2735 1406',
      email: `r.alkhatib@${demoFirm.domain}`,
      supporting: null,
    },
    timeline: [
      {
        id: 'prj-2819-tl-1',
        inDays: -9,
        kind: 'submission',
        title: { en: 'Due diligence report delivered', ar: 'تسليم تقرير الفحص النافي للجهالة' },
        detail: { en: 'Issued to the investment committee', ar: 'صادر إلى لجنة الاستثمار' },
        note: { en: 'Report finalised', ar: 'اكتمل التقرير' },
        completed: true,
      },
    ],
  },
  {
    // Introduced by the projects list. The second engagement waiting on the
    // client, so "Needs attention (2)" is a real count.
    id: 'prj-1904',
    reference: 'PRJ-1904',
    firmId: demoFirm.id,
    clientId: CLIENT_IDS.gulfHoldings,
    title: {
      en: 'Cross-border family trust and succession framework',
      ar: 'إطار الصندوق العائلي العابر للحدود وخطة التعاقب',
    },
    category: { en: 'Private wealth and trusts', ar: 'إدارة الثروات والصناديق العائلية' },
    manager: { en: 'Fatima Al-Zahra', ar: 'فاطمة الزهراء' },
    jurisdiction: { en: 'DIFC prescribed company', ar: 'شركة محددة بمركز دبي المالي العالمي' },
    status: { en: 'Trust deed signature pending', ar: 'بانتظار توقيع صك الصندوق' },
    statusTone: 'warning',
    needsAttention: true,
    attentionReason: {
      en: 'Sign the trust deed before the settlor meeting',
      ar: 'توقيع صك الصندوق قبل اجتماع المؤسّس',
    },
    active: true,
    lastUpdatedDaysAgo: 15,
    openedDaysAgo: 196,
    registrationNumber: 'DIFC-PC-4487',
    currentPhase: { en: 'Deed execution', ar: 'تنفيذ الصك' },
    targetEntities: {
      en: 'Al-Rahman Family Trust',
      ar: 'صندوق عائلة الرحمن',
    },
    scopeSummary: {
      en: 'Establishing a DIFC prescribed company to hold family assets across three jurisdictions, with a succession framework for the next generation of beneficiaries.',
      ar: 'تأسيس شركة محددة بمركز دبي المالي العالمي لحيازة أصول العائلة في ثلاث ولايات قضائية، مع إطار للتعاقب لصالح الجيل التالي من المستفيدين.',
    },
    lead: {
      name: { en: 'Fatima Al-Zahra', ar: 'فاطمة الزهراء' },
      role: { en: 'Senior associate, private wealth', ar: 'محامية أولى، إدارة الثروات' },
      phone: '+20 2 2735 1432',
      email: `f.alzahra@${demoFirm.domain}`,
      supporting: null,
    },
    timeline: [
      {
        id: 'prj-1904-tl-1',
        inDays: -50,
        kind: 'filing',
        title: { en: 'Prescribed company registered', ar: 'تسجيل الشركة المحددة' },
        detail: { en: 'DIFC Registrar of Companies', ar: 'مسجّل الشركات بمركز دبي المالي العالمي' },
        note: null,
        completed: true,
      },
      {
        id: 'prj-1904-tl-2',
        inDays: 24,
        kind: 'conference',
        title: { en: 'Settlor and trustee meeting', ar: 'اجتماع المؤسّس وأمين الصندوق' },
        detail: { en: 'Deed execution and asset schedule', ar: 'تنفيذ الصك وجدول الأصول' },
        note: {
          en: 'The trust deed needs signing beforehand',
          ar: 'يلزم توقيع صك الصندوق قبل الاجتماع',
        },
        completed: false,
        awaitingClient: true,
      },
    ],
  },
  {
    // The only completed engagement. A project COMPLETES where a matter closes
    // — the list's third filter is labelled accordingly, off the same `!active`.
    id: 'prj-1082',
    reference: 'PRJ-1082',
    firmId: demoFirm.id,
    clientId: CLIENT_IDS.gulfHoldings,
    title: {
      en: 'GCC logistics infrastructure joint venture structuring',
      ar: 'هيكلة المشروع اللوجستي المشترك للبنية التحتية الخليجية',
    },
    category: { en: 'Commercial joint venture', ar: 'المشاريع التجارية المشتركة' },
    manager: { en: 'Dalia Al-Sabah', ar: 'داليا الصباح' },
    jurisdiction: { en: 'KSA MISA licensing', ar: 'ترخيص وزارة الاستثمار السعودية' },
    status: { en: 'Structuring executed', ar: 'تم تنفيذ الهيكلة' },
    statusTone: 'success',
    needsAttention: false,
    attentionReason: null,
    active: false,
    lastUpdatedDaysAgo: 30,
    openedDaysAgo: 430,
    registrationNumber: 'MISA-2025-6621',
    currentPhase: { en: 'Completed', ar: 'مكتمل' },
    targetEntities: {
      en: 'Gulf Logistics Infrastructure JV Company',
      ar: 'شركة المشروع المشترك للبنية التحتية اللوجستية الخليجية',
    },
    scopeSummary: {
      en: 'Structuring and licensing a joint venture company for regional logistics infrastructure, including the shareholders’ agreement and MISA foreign investment licence.',
      ar: 'هيكلة وترخيص شركة مشروع مشترك للبنية التحتية اللوجستية الإقليمية، بما يشمل اتفاقية المساهمين ورخصة الاستثمار الأجنبي من وزارة الاستثمار.',
    },
    lead: {
      name: { en: 'Dalia Al-Sabah', ar: 'داليا الصباح' },
      role: { en: 'Senior associate, corporate', ar: 'محامية أولى، قسم الشركات' },
      phone: '+20 2 2735 1411',
      email: `d.alsabah@${demoFirm.domain}`,
      supporting: null,
    },
    timeline: [
      {
        id: 'prj-1082-tl-1',
        inDays: -120,
        kind: 'filing',
        title: { en: 'MISA foreign investment licence issued', ar: 'صدور رخصة الاستثمار الأجنبي' },
        detail: { en: 'Ministry of Investment, Riyadh', ar: 'وزارة الاستثمار، الرياض' },
        note: null,
        completed: true,
      },
      {
        id: 'prj-1082-tl-2',
        inDays: -30,
        kind: 'submission',
        title: { en: 'Shareholders’ agreement executed', ar: 'توقيع اتفاقية المساهمين' },
        detail: { en: 'Signed by all joint venture parties', ar: 'موقّعة من جميع أطراف المشروع المشترك' },
        note: { en: 'Project completed', ar: 'اكتمل المشروع' },
        completed: true,
      },
    ],
  },
  /* =========================================================================
   * The other clients' transactional work
   * -------------------------------------------------------------------------
   * One project, for the one other client whose record describes transactional
   * work — fixtures/clients.ts says Nile Delta Agribusiness is having its
   * supply contracts reviewed. The rest of that client's line, export
   * licensing, is a filing with an authority and so is a MATTER by the
   * distinction fixtures/matters.ts draws: see MAT-4021 there.
   *
   * Helwan and Alexandria Port have no project because neither record claims
   * any, and a directory that pads itself is the defect this whole split
   * exists to avoid.
   * ====================================================================== */
  {
    id: 'prj-5120',
    reference: 'PRJ-5120',
    firmId: demoFirm.id,
    clientId: CLIENT_IDS.nileDelta,
    title: {
      en: 'Supply contract framework review',
      ar: 'مراجعة الإطار التعاقدي لعقود التوريد',
    },
    category: { en: 'Commercial contracts', ar: 'العقود التجارية' },
    manager: { en: 'Huda Al-Mansoor', ar: 'هدى المنصور' },
    jurisdiction: { en: 'Egyptian law', ar: 'القانون المصري' },
    status: { en: 'Drafting the standard terms', ar: 'صياغة الشروط النموذجية' },
    statusTone: 'info',
    needsAttention: false,
    attentionReason: null,
    active: true,
    lastUpdatedDaysAgo: 1,
    openedDaysAgo: 41,
    registrationNumber: null,
    currentPhase: {
      en: 'Existing contracts reviewed, standard terms in draft',
      ar: 'الانتهاء من مراجعة العقود القائمة وصياغة الشروط النموذجية',
    },
    targetEntities: null,
    scopeSummary: {
      en: 'Reviewing the grower and haulier contracts across the delta operations and drafting one set of standard terms to replace them, with a revised allocation of spoilage risk.',
      ar: 'مراجعة عقود المزارعين وشركات النقل في عمليات الدلتا وصياغة مجموعة موحّدة من الشروط النموذجية لتحل محلها، مع إعادة توزيع مخاطر التلف.',
    },
    lead: {
      name: { en: 'Huda Al-Mansoor', ar: 'هدى المنصور' },
      role: { en: 'Associate, commercial contracts', ar: 'محامية، العقود التجارية' },
      phone: '+20 2 2735 1417',
      email: `h.almansoor@${demoFirm.domain}`,
      supporting: { en: 'Fatima Al-Zahra', ar: 'فاطمة الزهراء' },
    },
    timeline: [
      {
        id: 'prj-5120-tl-1',
        inDays: -30,
        kind: 'conference',
        title: { en: 'Scoping meeting with the procurement team', ar: 'اجتماع تحديد النطاق مع فريق المشتريات' },
        detail: { en: 'Delta operations office', ar: 'مكتب عمليات الدلتا' },
        note: { en: 'Contract population agreed', ar: 'تم الاتفاق على العقود محل المراجعة' },
        completed: true,
      },
      {
        id: 'prj-5120-tl-2',
        inDays: -7,
        kind: 'submission',
        title: { en: 'Review note on the existing contracts', ar: 'مذكرة مراجعة العقود القائمة' },
        detail: { en: 'Issued to the general counsel', ar: 'مُرسلة إلى المستشار العام' },
        note: null,
        completed: true,
      },
      {
        id: 'prj-5120-tl-3',
        inDays: 21,
        kind: 'conference',
        title: { en: 'Standard terms walkthrough', ar: 'عرض الشروط النموذجية' },
        detail: { en: 'With procurement and operations', ar: 'مع إدارتي المشتريات والعمليات' },
        note: null,
        completed: false,
      },
    ],
  },
];
