import { demoFirm } from './firm';
import type { Locale } from '@/lib/i18n/routing';

/**
 * fixtures/invoices.ts — fee statements raised against the client.
 *
 * The firm is not restated; `firmId` points at fixtures/firm.ts.
 *
 * THE REFERENCE NUMBER IS DERIVED, NOT WRITTEN
 * ---------------------------------------------------------------------------
 * Only `sequence` is stored. lib/mock-api.ts builds "INV-2026-089" from the
 * year the invoice was issued in, resolved against the tenant's clock. The
 * Stitch export hardcoded "INV-2025-089" beside dates that were themselves
 * fixed to March 2025 — the pair looked consistent on the day it was generated
 * and looks like stale test data every day since. Deriving the year from the
 * issue date keeps the reference and the date telling the same story forever.
 *
 * A matter reference does NOT work this way (fixtures/matters.ts): a file
 * reference follows the file across years and must not change. An invoice
 * number is stamped once, at issue, and carries its year — which is exactly why
 * one is a literal and the other is computed.
 *
 * SO ARE THE TOTAL AND THE STATUS
 * ---------------------------------------------------------------------------
 * Neither `amount` nor `status` is stored any more, and both used to be.
 *
 *   · The TOTAL is the sum of `lineItems`. Storing it beside them lets an
 *     invoice exist whose stated total disagrees with its own breakdown — on a
 *     fee statement, the single worst thing in this file to get wrong.
 *
 *   · The STATUS is fully determined by `paidDaysAgo` and `dueInDays`: paid if
 *     it has been settled, overdue if it is past due and has not been, due
 *     otherwise. Keeping a third field alongside made `{ dueInDays: -12, status:
 *     'due' }` representable.
 *
 * Both are computed in lib/mock-api.ts, which is the same call already made for
 * an engagement's key date and for a document's `needsSignature`: if a value can
 * be derived, deriving it is how it is kept from drifting.
 *
 * MONEY
 * ---------------------------------------------------------------------------
 * Amounts are plain numbers in major units. See lib/format.ts `formatMoney` for
 * why that is a fixture convenience and not a schema proposal.
 *
 * NO TAX LINE, DELIBERATELY
 * ---------------------------------------------------------------------------
 * The export's detail view carries a "UAE FTA Value Added Tax (VAT 5%)" row and
 * a TRN of "AE-TRN-10049281000003" — a UAE tax registration on a statement from
 * a firm whose domain, phone numbers and timezone are all Cairo. Same
 * wrong-jurisdiction error as the UAE contact details the matters fixtures
 * already had stripped, but with a regulator's name on it.
 *
 * MOCK: a real fee statement carries a tax treatment — rate, registration
 * number, and the exempt/zero-rated/standard classification — resolved from the
 * TENANT's jurisdiction, alongside the invoicing currency chosen in the
 * onboarding wizard's billing step. None of that is configurable yet, so rather
 * than assert one country's regime, these totals carry no tax component at all.
 * Track A.5, with the tenant configuration.
 */

export type InvoiceStatus =
  /** Past its due date and unpaid. */
  | 'overdue'
  /** Issued, not yet due. */
  | 'due'
  /** Settled. */
  | 'paid';

/** One billed item on a fee statement. */
export interface InvoiceLineItem {
  id: string;
  /** What was billed. */
  description: Record<Locale, string>;
  /** The work behind it, one line. */
  detail: Record<Locale, string>;
  amount: number;
}

export interface Invoice {
  id: string;
  /**
   * Per-year sequence number. The full reference is built in lib/mock-api.ts —
   * see the header.
   */
  sequence: string;
  firmId: string;
  /*
   * No client id here, and none needed.
   *
   * A fee statement hangs off an engagement (`engagementRef` below), and the
   * engagement names the client - fixtures/matters.ts, fixtures/projects.ts.
   * This row used to carry a `clientAccountId` of its own, which was a second
   * record of the same fact and free to disagree with the first. Derive,
   * don't store.
   */

  /** What the fee statement covers, per locale. */
  description: Record<Locale, string>;
  /** Matter or project the fees were incurred on. */
  engagementRef: string;

  /** The breakdown. Their sum IS the invoice total — see the header. */
  lineItems: InvoiceLineItem[];
  /**
   * ISO 4217 code.
   *
   * MOCK: per-invoice for the fixture. In the real system this is the firm's
   * invoicing currency, chosen once in the onboarding wizard's billing step
   * (lib/ranks.ts `CURRENCIES`) and applied workspace-wide — "Every rate,
   * invoice and statement in the workspace uses this currency." Track A.5.
   */
  currency: string;

  /** Days before the tenant's today that it was issued. */
  issuedDaysAgo: number;
  /** Days from the tenant's today until it falls due. Negative means overdue. */
  dueInDays: number;
  /**
   * Days before the tenant's today that it was settled. `null` while unpaid.
   *
   * Its own field, not inferred from `dueInDays`. The matter detail first
   * rendered "Paid 14 Feb 2026" by reusing the due date, which is a different
   * fact wearing the same label — an invoice is very often paid late, which is
   * precisely what the overdue row above it is about.
   */
  paidDaysAgo: number | null;
}

// MOCK: replace with GET /api/invoices — tenant-scoped and client-scoped
// server-side, and computed from the time ledger rather than stored as a flat
// total. The aggregate the dashboard shows (balance due, overdue count) must be
// computed on the server too: a client that can ask for the line items can ask
// for a sum it should not see. Track A.5.
export const demoInvoices: Invoice[] = [
  {
    id: 'inv-089',
    sequence: '089',
    firmId: demoFirm.id,
    description: {
      en: 'Monthly retainer and disbursements',
      ar: 'الأتعاب الشهرية والمصروفات',
    },
    engagementRef: 'MAT-2201',
    lineItems: [
      {
        id: 'li-089-1',
        description: { en: 'Monthly retainer', ar: 'الأتعاب الشهرية' },
        detail: {
          en: 'Standing instruction on the Apollo proceedings',
          ar: 'التوكيل القائم في دعوى أبولو',
        },
        amount: 9_500,
      },
      {
        id: 'li-089-2',
        description: { en: 'Court and filing disbursements', ar: 'مصروفات المحكمة والإيداع' },
        detail: {
          en: 'Paid to the registry on your behalf',
          ar: 'سُددت لقلم المحكمة نيابةً عنكم',
        },
        amount: 1_750,
      },
      {
        id: 'li-089-3',
        description: { en: 'Translation and courier', ar: 'الترجمة والبريد السريع' },
        detail: {
          en: 'Certified translation of exhibits B to F',
          ar: 'ترجمة معتمدة للمستندات من (ب) إلى (و)',
        },
        amount: 750,
      },
    ],
    currency: 'USD',
    issuedDaysAgo: 42,
    dueInDays: -12,
    paidDaysAgo: null,
  },
  {
    id: 'inv-104',
    sequence: '104',
    firmId: demoFirm.id,
    description: {
      en: 'DIFC filing fees and court costs',
      ar: 'رسوم القيد والمصروفات القضائية لدى محكمة دبي المالي',
    },
    engagementRef: 'MAT-2201',
    lineItems: [
      {
        id: 'li-104-1',
        description: { en: 'Claim filing fee', ar: 'رسم قيد الدعوى' },
        detail: {
          en: 'DIFC Court of First Instance, claim CFI-042',
          ar: 'محكمة دبي المالي الابتدائية، الدعوى CFI-042',
        },
        amount: 6_800,
      },
      {
        id: 'li-104-2',
        description: { en: 'Hearing bundle preparation', ar: 'إعداد حافظة الجلسة' },
        detail: {
          en: 'Indexing, pagination and lodging of four volumes',
          ar: 'الفهرسة والترقيم وإيداع أربعة مجلدات',
        },
        amount: 3_200,
      },
      {
        id: 'li-104-3',
        description: { en: 'Service of process', ar: 'إعلان الخصوم' },
        detail: {
          en: 'Service on the respondent and courier costs',
          ar: 'إعلان المدعى عليه ومصروفات البريد السريع',
        },
        amount: 2_500,
      },
    ],
    currency: 'USD',
    issuedDaysAgo: 6,
    dueInDays: 9,
    paidDaysAgo: null,
  },
  {
    // Added with the matter detail view, so MAT-2201's Invoices tab has a
    // settled row to show alongside the outstanding one — filtered out of this
    // shared collection, not duplicated into a per-matter fixture.
    id: 'inv-014',
    sequence: '014',
    firmId: demoFirm.id,
    description: {
      en: 'Initial retainer — DIFC filing and counsel engagement',
      ar: 'الدفعة المقدمة — رسوم القيد لدى محكمة دبي المالي وأتعاب التوكيل',
    },
    engagementRef: 'MAT-2201',
    lineItems: [
      {
        id: 'li-014-1',
        description: { en: 'Engagement retainer', ar: 'الدفعة المقدمة للتوكيل' },
        detail: {
          en: 'Opening the file and instructing counsel',
          ar: 'فتح الملف وتكليف هيئة الدفاع',
        },
        amount: 10_000,
      },
      {
        id: 'li-014-2',
        description: { en: 'Merits assessment', ar: 'تقييم مركز الدعوى' },
        detail: {
          en: 'Written opinion on prospects and forum',
          ar: 'رأي قانوني مكتوب في فرص الدعوى والاختصاص',
        },
        amount: 3_500,
      },
      {
        id: 'li-014-3',
        description: { en: 'Registration and filing costs', ar: 'رسوم التسجيل والإيداع' },
        detail: { en: 'Paid to the registry on your behalf', ar: 'سُددت لقلم المحكمة نيابةً عنكم' },
        amount: 1_500,
      },
    ],
    currency: 'USD',
    issuedDaysAgo: 245,
    dueInDays: -215,
    // Settled a few days before it fell due.
    paidDaysAgo: 219,
  },
  {
    // Settled — so the dashboard's "balance due" is a filtered sum rather than
    // a total of everything in the list, and the figure can be read as a real
    // aggregate instead of a restated constant.
    id: 'inv-072',
    sequence: '072',
    firmId: demoFirm.id,
    description: {
      en: 'Corporate structuring advisory',
      ar: 'استشارات إعادة الهيكلة المؤسسية',
    },
    engagementRef: 'PRJ-4410',
    lineItems: [
      {
        id: 'li-072-1',
        description: { en: 'Structuring options paper', ar: 'ورقة خيارات إعادة الهيكلة' },
        detail: {
          en: 'Comparative review of three holding structures',
          ar: 'مراجعة مقارنة لثلاثة هياكل قابضة',
        },
        amount: 5_250,
      },
      {
        id: 'li-072-2',
        description: { en: 'Group reorganisation review', ar: 'مراجعة إعادة تنظيم المجموعة' },
        detail: {
          en: 'Intra-group transfers and consent requirements',
          ar: 'عمليات النقل بين شركات المجموعة ومتطلبات الموافقة',
        },
        amount: 2_400,
      },
      {
        id: 'li-072-3',
        description: { en: 'Registry searches', ar: 'الاستعلامات من السجل التجاري' },
        detail: { en: 'Commercial registry and encumbrance checks', ar: 'فحص السجل التجاري والرهون' },
        amount: 1_100,
      },
    ],
    currency: 'USD',
    issuedDaysAgo: 74,
    dueInDays: -44,
    paidDaysAgo: 51,
  },
  {
    // Added with the project detail view. Note the knock-on: the client-wide
    // balance and overdue count on the dashboard both rise, because both are
    // computed from this collection rather than restated. That is the point of
    // computing them.
    id: 'inv-092',
    sequence: '092',
    firmId: demoFirm.id,
    description: {
      en: 'Milestone 3 — MISA regulatory filing and ADGM structuring',
      ar: 'المرحلة 3 — الإيداع النظامي لدى وزارة الاستثمار وهيكلة سوق أبوظبي العالمي',
    },
    engagementRef: 'PRJ-4410',
    lineItems: [
      {
        id: 'li-092-1',
        description: {
          en: 'Milestone 3 — regulatory filing package',
          ar: 'المرحلة 3 — حزمة الإيداع النظامي',
        },
        detail: {
          en: 'MISA submission and ADGM registration protocols',
          ar: 'الإيداع لدى وزارة الاستثمار وإجراءات التسجيل في سوق أبوظبي العالمي',
        },
        amount: 10_200,
      },
      {
        id: 'li-092-2',
        description: {
          en: 'SPV incorporation documents',
          ar: 'مستندات تأسيس الكيان ذي الغرض الخاص',
        },
        detail: {
          en: 'Articles, shareholder resolutions and board charters',
          ar: 'النظام الأساسي وقرارات الشركاء ومواثيق مجلس الإدارة',
        },
        amount: 5_400,
      },
      {
        id: 'li-092-3',
        description: { en: 'Senior counsel advisory', ar: 'استشارات المستشار الأول' },
        detail: {
          en: 'Structuring review and risk sign-off',
          ar: 'مراجعة الهيكلة واعتماد المخاطر',
        },
        amount: 2_900,
      },
    ],
    currency: 'USD',
    issuedDaysAgo: 38,
    dueInDays: -8,
    paidDaysAgo: null,
  },
  /* =========================================================================
   * The other clients' fee statements
   * -------------------------------------------------------------------------
   * Added with the firm-side Billing screen, which is the first reader of this
   * collection that is not a single client's portal. Until then every invoice
   * here belonged to Gulf Holdings, because every engagement did.
   *
   * One statement per client with work on the books, for work the register
   * already describes — fixtures/matters.ts. Nothing below bills for anything
   * the firm is not already said to be doing, and there is no statement for
   * Cairo Fintech, who have been quoted and have instructed nothing.
   *
   * Currency stays USD across the collection. A ledger that sums a column has
   * to be summing one currency; the export's USD/AED toggle silently converts
   * at a rate nobody chose, which is a worse answer than one currency.
   * ====================================================================== */
  {
    id: 'inv-118',
    sequence: '118',
    firmId: demoFirm.id,
    description: {
      en: 'Labour claim — defence to date',
      ar: 'الدعوى العمالية — أتعاب الدفاع حتى تاريخه',
    },
    engagementRef: 'MAT-3310',
    lineItems: [
      {
        id: 'li-118-1',
        description: { en: 'Defence and evidence collation', ar: 'الدفاع وجمع المستندات' },
        detail: {
          en: 'Statement of defence and the payroll schedule',
          ar: 'مذكرة الدفاع وجدول الرواتب',
        },
        amount: 7_400,
      },
      {
        id: 'li-118-2',
        description: { en: 'Court disbursements', ar: 'مصروفات المحكمة' },
        detail: {
          en: 'Filing and service on twenty-four claimants',
          ar: 'الإيداع والإعلان لأربعة وعشرين مدعيًا',
        },
        amount: 1_250,
      },
    ],
    currency: 'USD',
    issuedDaysAgo: 51,
    dueInDays: -21,
    paidDaysAgo: null,
  },
  {
    id: 'inv-121',
    sequence: '121',
    firmId: demoFirm.id,
    description: {
      en: 'Concession renewal — negotiation phase',
      ar: 'تجديد الامتياز — مرحلة التفاوض',
    },
    engagementRef: 'MAT-2760',
    lineItems: [
      {
        id: 'li-121-1',
        description: { en: 'Renewal proposal and terms', ar: 'مقترح التجديد والشروط' },
        detail: {
          en: 'Drafting and submission to the concessions committee',
          ar: 'الصياغة والتقديم إلى لجنة الامتيازات',
        },
        amount: 12_600,
      },
      {
        id: 'li-121-2',
        description: { en: 'Throughput schedule review', ar: 'مراجعة جدول الطاقة التشغيلية' },
        detail: {
          en: 'Revised undertakings and the investment annex',
          ar: 'الالتزامات المعدّلة وملحق الاستثمار',
        },
        amount: 4_800,
      },
    ],
    currency: 'USD',
    issuedDaysAgo: 27,
    dueInDays: 3,
    paidDaysAgo: null,
  },
  {
    id: 'inv-126',
    sequence: '126',
    firmId: demoFirm.id,
    description: {
      en: 'Export licence renewal — filing fees and advice',
      ar: 'تجديد رخصة التصدير — رسوم الإيداع والاستشارة',
    },
    engagementRef: 'MAT-4021',
    lineItems: [
      {
        id: 'li-126-1',
        description: { en: 'Renewal application', ar: 'طلب التجديد' },
        detail: {
          en: 'Exporter register filing and the technical dossier',
          ar: 'الإيداع لدى سجل المصدّرين والملف الفني',
        },
        amount: 5_200,
      },
      {
        id: 'li-126-2',
        description: { en: 'Authority disbursements', ar: 'مصروفات الهيئة' },
        detail: {
          en: 'Registration and inspection fees',
          ar: 'رسوم القيد والمعاينة',
        },
        amount: 1_900,
      },
    ],
    currency: 'USD',
    issuedDaysAgo: 19,
    dueInDays: 11,
    paidDaysAgo: 4,
  },
];

/* ===========================================================================
 * Drafts — deliberately NOT an `Invoice`
 * ======================================================================== */

/**
 * A fee statement the firm is assembling, before anything is issued.
 *
 * ===========================================================================
 * WHY THIS CANNOT BE A STATUS ON `Invoice`
 * ===========================================================================
 * `InvoiceStatus` is 'overdue' | 'due' | 'paid', and all three mean ISSUED —
 * the header above explains that the status is not even stored, it is computed
 * from the due date and the settlement date. There is no representable value
 * that means "the client has never seen this", and adding one would change what
 * every existing read of that collection means.
 *
 * That is convenient, but it is not the reason for the separation. The reason
 * is the client portal. /invoices reads `demoInvoices` through
 * `resolveInvoices()`, and a draft appearing there would tell a client they owe
 * money the firm has not asked them for — on a statement nobody has approved,
 * with a total somebody was still editing. A draft in the same collection is one
 * forgotten `.filter()` away from doing exactly that.
 *
 * A separate collection cannot be forgotten. `resolveInvoices()` does not name
 * this type, so there is no query that returns a draft by accident. The same
 * argument fixtures/documents.ts makes about the firm's own drafts, on the
 * collection where being wrong costs the client money.
 *
 * ISSUING IS THE OUTBOUND ACT, and BUILD_PLAN.md §5.1 puts it in category 2:
 * "Sending an invoice" is its first example. So nothing in this product turns a
 * draft into an `Invoice`, and the control that appears to is a stated no-op.
 *
 * ===========================================================================
 * ONE LANGUAGE PER LINE, NOT TWO
 * ===========================================================================
 * `InvoiceLineItem.description` is a `Record<Locale, string>` because the seeded
 * statements were written by the firm in both languages. A line assembled here
 * is typed once, by the person assembling it, in whichever language they are
 * working in — and a second field would either sit empty or be filled by
 * machine translation of a billing narrative, which is not a thing this product
 * should do to a document a client may dispute.
 */
export interface InvoiceDraftLine {
  id: string;
  /** What is being billed. One string — see the header. */
  description: string;
  /**
   * Minutes of recorded time behind this line, or `null` for a line that is
   * not time — a disbursement, a fixed fee, a courier.
   *
   * Shown beside the amount so the person pricing it can see what they are
   * pricing. It is NOT multiplied by anything: there is no rate card in this
   * product, which fixtures/practice.ts sets out over `TimeEntry`.
   */
  minutes: number | null;
  /**
   * The time entries this line was built from.
   *
   * Kept so that saving the draft can mark them billed. Without it the same
   * hour can be drawn into a second draft an hour later, and billing a client
   * twice for one piece of work is the worst arithmetic error available here.
   */
  fromEntryIds: string[];
  /**
   * What the client is charged for this line, in the draft's currency.
   *
   * Typed by the person assembling the statement, because nothing in this
   * product can compute it — there are no rates. It is nullable only WHILE
   * EDITING: a draft cannot be saved with a line that has no amount, since its
   * stated total would then disagree with its own contents. The header above
   * calls that the single worst thing in this file to get wrong.
   */
  amount: number | null;
}

/**
 * A draft fee statement.
 *
 * No `sequence` and no reference. An invoice number is stamped once, at issue
 * (see the header), and nothing here issues anything — handing a draft a number
 * from the same series would burn a reference on a statement that may never be
 * sent, and would make a draft indistinguishable from a real one in any list
 * that shows references.
 */
export interface InvoiceDraft {
  id: string;
  /** Whose statement this would be. */
  clientId: string;
  /** The file the fees were incurred on. */
  engagementRef: string;
  /** What the statement covers. One string, typed by the preparer. */
  description: string;
  lines: InvoiceDraftLine[];
  /** ISO 4217, derived rather than chosen — see `invoiceDraftContext`. */
  currency: string;
  /** Tenant calendar date it was assembled on. */
  createdOn: string;
  /** Who assembled it — an id into fixtures/practice.ts. */
  preparedById: string;
}
