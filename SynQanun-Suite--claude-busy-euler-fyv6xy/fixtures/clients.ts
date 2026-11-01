import type { Locale } from '@/lib/i18n/routing';

/**
 * fixtures/clients.ts — the firm's clients.
 *
 * WHY THIS IS NO LONGER PART OF fixtures/practice.ts
 * ---------------------------------------------------------------------------
 * It lived there while a client was something only the firm's own side knew
 * about. That stopped being true the moment an engagement had to name its
 * client: fixtures/matters.ts and fixtures/projects.ts now carry a `clientId`,
 * and practice.ts's header is explicit that nothing in it "may ever reach a
 * client-portal screen". Importing it from a client-facing fixture would have
 * inverted the boundary that header exists to protect, so the client list moved
 * to a file both halves may read instead.
 *
 * A client is NOT an account. fixtures/accounts.ts holds people who can sign
 * in; this file holds organisations the firm acts for. One of the five has an
 * account and four do not, and that is an ordinary state for a law firm — most
 * clients never touch the portal. Until this split, "has portal access" and
 * "has any work with the firm" were the same field, which is why the CRM
 * rendered four clients with no files.
 */

export type ClientStanding = 'retainer' | 'active' | 'prospect';

export interface FirmClient {
  id: string;
  name: Record<Locale, string>;
  /** What the firm is doing for them right now, per locale. */
  summary: Record<Locale, string>;
  standing: ClientStanding;
  /** Days since anything moved on their file. Drives the CRM card's ordering. */
  lastActivityDaysAgo: number;
}

/**
 * Client ids, named.
 *
 * Every engagement, invoice and thread reaches for one of these rather than
 * writing `'cli-003'` into a fixture six files away from the row it points at.
 * A mistyped literal would attach a matter to the wrong client silently; a
 * mistyped property here does not compile.
 */
/**
 * The three standings, as a list.
 *
 * Exported so the Add Client form offers exactly the values the type permits —
 * a written-out set of options in a component is a second vocabulary, free to
 * gain a fourth entry the type has never heard of.
 */
export const CLIENT_STANDINGS = ['retainer', 'active', 'prospect'] as const;

/**
 * `summary` for a client taken on a moment ago with nothing said about them.
 *
 * The field means "what the firm is doing for them right now", and for a
 * client with no matter yet the answer is nothing. Saying so is better than
 * an empty string, which renders as a gap in the CRM and reads as missing
 * data rather than as an accurate absence.
 */
export const NEW_CLIENT_SUMMARY: Record<Locale, string> = {
  en: 'No work opened yet',
  ar: 'لم يُفتح عمل بعد',
};

export const CLIENT_IDS = {
  gulfHoldings: 'cli-001',
  nileDelta: 'cli-002',
  helwan: 'cli-003',
  alexandriaPort: 'cli-004',
  cairoFintech: 'cli-005',
} as const;

/**
 * The one client with a portal account, for the demo.
 *
 * fixtures/accounts.ts reads this to say which client its account represents.
 * lib/mock-api.ts reads it nowhere: every client-portal query scopes on the
 * signed-in ACCOUNT's `clientId`, so that swapping the demo account over to a
 * different client changes what the portal returns rather than requiring a
 * second constant to be kept in step.
 */
export const PORTAL_CLIENT_ID: string = CLIENT_IDS.gulfHoldings;

/**
 * The firm's clients.
 *
 * The first is the client every portal fixture belongs to, so the two halves of
 * the product describe the same organisation. The rest exist because a CRM
 * preview over a single row is not a preview — and, since the `clientId` split,
 * because they have real files of their own.
 *
 * Counterparties and sectors are invented; the forums and regulators named
 * across the fixtures are real institutions, as design.md §7 requires.
 */
export const demoClients: FirmClient[] = [
  {
    id: CLIENT_IDS.gulfHoldings,
    name: { en: 'Gulf Holdings', ar: 'الخليج القابضة' },
    summary: {
      en: 'Corporate restructuring and cross-border IP',
      ar: 'إعادة هيكلة مؤسسية وملكية فكرية عابرة للحدود',
    },
    standing: 'retainer',
    lastActivityDaysAgo: 0,
  },
  {
    id: CLIENT_IDS.nileDelta,
    name: { en: 'Nile Delta Agribusiness', ar: 'دلتا النيل للصناعات الزراعية' },
    summary: {
      en: 'Supply contract review and export licensing',
      ar: 'مراجعة عقود التوريد وتراخيص التصدير',
    },
    standing: 'retainer',
    lastActivityDaysAgo: 1,
  },
  {
    id: CLIENT_IDS.helwan,
    name: { en: 'Helwan Industrial Group', ar: 'مجموعة حلوان الصناعية' },
    summary: {
      en: 'Employment dispute before the labour court',
      ar: 'نزاع عمالي أمام محكمة العمل',
    },
    standing: 'active',
    lastActivityDaysAgo: 2,
  },
  {
    id: CLIENT_IDS.alexandriaPort,
    name: { en: 'Alexandria Port Logistics', ar: 'الإسكندرية لخدمات الموانئ' },
    summary: {
      en: 'Concession renewal with the port authority',
      ar: 'تجديد امتياز مع هيئة الموانئ',
    },
    standing: 'active',
    lastActivityDaysAgo: 4,
  },
  {
    /*
     * A prospect, and the one client with no engagement at all.
     *
     * Deliberately left with none. "Scoping only" is exactly what a firm's
     * record of a prospect looks like — a fee quote out, nothing instructed —
     * and it keeps the empty state on the CRM and the Matters directory
     * reachable now that the other four have files. The pending quote on this
     * client is already in fixtures/practice.ts.
     */
    id: CLIENT_IDS.cairoFintech,
    name: { en: 'Cairo Fintech Partners', ar: 'شركاء القاهرة للتقنية المالية' },
    summary: {
      en: 'Central Bank licensing — scoping only',
      ar: 'ترخيص البنك المركزي — تحديد النطاق فقط',
    },
    standing: 'prospect',
    lastActivityDaysAgo: 9,
  },
];
