import type { CalendarDate } from '@/lib/format';
import type { Locale } from '@/lib/i18n/routing';

/**
 * Sample entries for the Legal Database screen.
 *
 * ===========================================================================
 * THE BODIES ARE LOREM IPSUM, AND THAT IS THE POINT
 * ===========================================================================
 * This product does not hold a legal corpus. It holds a firm's matters,
 * projects, clients, documents and invoices — not statutes, not judgments, not
 * commentary. Track A.5 connects a real source; until then the Legal Database
 * is a search interface with nothing behind it.
 *
 * So the question this file answers is: what does a result card contain when
 * there is no result? Every other option is worse than filler:
 *
 *   · REAL LAW, QUOTED. The Stitch exports took this one, and it is the most
 *     dangerous thing in any of them. "ADGM Companies Regulations 2020 (Part
 *     10, Art. 102)" is a real instrument; the text quoted beneath it was
 *     written by a design tool, complete with a typo ("satisfyng"). The same
 *     export attributes invented holdings to "[2023] ADGMCFI 0019" and
 *     "DIFC Law No. 5/2018 § 85(3)". A lawyer who copies that into a pleading
 *     has filed fabricated authority, and it looks exactly like the real thing
 *     until a judge checks.
 *
 *   · INVENTED LAW THAT READS AS REAL. Slightly better and still bad: a
 *     plausible citation with plausible text is indistinguishable from the
 *     above to anyone who is not already an expert on that jurisdiction.
 *
 *   · REALISTIC-LOOKING PROSE ABOUT NOTHING. Reads as a real excerpt at a
 *     glance, which is the whole failure mode.
 *
 * Lorem Ipsum fails all of those tests immediately and on purpose. Nobody
 * mistakes it for law, in any language, at any level of expertise. It is the
 * one body text that cannot be copied into a filing by accident.
 *
 * DO NOT "IMPROVE" THIS. Replacing the Latin with readable legal-sounding
 * English or Arabic would undo the only property it is here for.
 *
 * ===========================================================================
 * WHAT IS REALISTIC, AND WHY THAT IS ALLOWED
 * ===========================================================================
 * The METADATA is realistic because the layout has to be exercised: a result
 * card carries a type, an issuing body and a date, and four rows of "—" would
 * not tell anyone whether the screen works. Titles name a SUBJECT ("termination
 * of a commercial lease for non-payment"), never a holding — a topic is not a
 * claim about what any court decided.
 *
 * The references are the giveaway, and deliberately so: `SAMPLE-0001` is not a
 * citation format any reporter uses, in any jurisdiction, and it appears on the
 * card exactly where a citation would. Latin in both locales, so it carries
 * `dir="ltr"` under the rule in lib/format.ts.
 *
 * ===========================================================================
 * NOT A SEARCH INDEX
 * ===========================================================================
 * Four entries, filterable by type and issuing body, because filtering four
 * real rows by their real metadata is real filtering. Free-text search is NOT
 * modelled against them — matching a query to Lorem Ipsum would be theatre,
 * and the screen says so instead of performing it.
 *
 * MOCK: Track A.5 replaces this with a connection to an actual source, at
 * which point the corpus stops living in the repo and this file is deleted
 * rather than extended.
 */

export type LegalSourceKind = 'judgment' | 'statute' | 'regulation' | 'commentary';

export interface LegalDatabaseEntry {
  /**
   * Deliberately not a citation format. See the header — this is the field a
   * reader's eye goes to first, so it is the field that has to disqualify
   * itself fastest.
   */
  reference: string;
  kind: LegalSourceKind;
  /** A subject, never a holding. */
  title: Record<Locale, string>;
  /** Issuing body. Realistic, because the card has a slot for one. */
  jurisdiction: Record<Locale, string>;
  issuedOn: CalendarDate;
  /**
   * Literal Lorem Ipsum, identical in both locales.
   *
   * Identical on purpose: in the Arabic interface a Latin paragraph is even
   * more obviously placeholder than it is in English, which is the direction
   * this should err in. The screen renders it `dir="ltr"` because it IS Latin
   * text — that is correct typography, not the identifier rule.
   *
   * This is the EXCERPT the result card shows. The reader shows `sections`.
   */
  body: string;
  /**
   * The entry as the full-text reader renders it.
   *
   * ===========================================================================
   * STRUCTURE IS EXERCISED; CONTENT IS NOT INVENTED
   * ===========================================================================
   * Added with the reader, on the same principle the header already states
   * about metadata: the layout has to be exercised or nobody can tell whether
   * it works. A reader with one paragraph in it proves nothing about a reader.
   *
   * So an entry has numbered sections — because instruments have numbered
   * sections — and every one of them is Lorem Ipsum. A section NUMBER is
   * structure. A section BODY would be a claim, and the header above spends
   * thirty lines on why this file will not make one.
   *
   * What is deliberately NOT here, because each would be a claim: a heading per
   * section (a heading names what a provision does), a page number (there are
   * no pages), an amendment history, an in-force date, or a cross-reference to
   * another instrument.
   */
  sections: { number: string; body: string }[];
}

const LOREM_ONE =
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor ' +
  'incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis ' +
  'nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.';

const LOREM_TWO =
  'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu ' +
  'fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in ' +
  'culpa qui officia deserunt mollit anim id est laborum.';

const LOREM_THREE =
  'Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium ' +
  'doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore ' +
  'veritatis et quasi architecto beatae vitae dicta sunt explicabo.';

const LOREM_FOUR =
  'Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed ' +
  'quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt, neque ' +
  'porro quisquam est qui dolorem ipsum quia dolor sit amet.';

const LOREM_FIVE =
  'Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, ' +
  'adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et ' +
  'dolore magnam aliquam quaerat voluptatem.';

const LOREM_SIX =
  'Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil ' +
  'molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla ' +
  'pariatur. At vero eos et accusamus et iusto odio dignissimos.';

/**
 * Three sections per entry, rotated through the six paragraphs above.
 *
 * Built here rather than written out four times: the numbering is the only
 * thing that differs between entries, and four hand-written copies of the same
 * structure is four chances for one of them to drift into looking deliberate.
 */
function sectionsFrom(...bodies: string[]): { number: string; body: string }[] {
  return bodies.map((body, index) => ({ number: String(index + 1), body }));
}

export const demoLegalDatabase: LegalDatabaseEntry[] = [
  {
    reference: 'SAMPLE-0001',
    kind: 'judgment',
    title: {
      en: 'Termination of a commercial lease for non-payment',
      ar: 'إنهاء عقد إيجار تجاري لعدم سداد الأجرة',
    },
    jurisdiction: { en: 'Egypt — Court of Cassation', ar: 'مصر — محكمة النقض' },
    issuedOn: '2024-03-11',
    body: LOREM_ONE,
    sections: sectionsFrom(LOREM_ONE, LOREM_TWO, LOREM_THREE),
  },
  {
    reference: 'SAMPLE-0002',
    kind: 'statute',
    title: {
      en: 'Notice periods on the termination of an employment contract',
      ar: 'مواعيد الإخطار عند إنهاء عقد العمل',
    },
    jurisdiction: { en: 'Egypt — Official Gazette', ar: 'مصر — الجريدة الرسمية' },
    issuedOn: '2023-07-02',
    body: LOREM_TWO,
    sections: sectionsFrom(LOREM_TWO, LOREM_FOUR, LOREM_FIVE),
  },
  {
    reference: 'SAMPLE-0003',
    kind: 'regulation',
    title: {
      en: 'Licensing requirements for export of agricultural produce',
      ar: 'اشتراطات ترخيص تصدير الحاصلات الزراعية',
    },
    jurisdiction: {
      en: 'Egypt — General Organisation for Export and Import Control',
      ar: 'مصر — الهيئة العامة للرقابة على الصادرات والواردات',
    },
    issuedOn: '2025-01-20',
    body: LOREM_THREE,
    sections: sectionsFrom(LOREM_THREE, LOREM_FIVE, LOREM_SIX),
  },
  {
    reference: 'SAMPLE-0004',
    kind: 'commentary',
    title: {
      en: 'Practitioner note on limitation periods in labour claims',
      ar: 'تعليق عملي على مواعيد سقوط الدعوى العمالية',
    },
    jurisdiction: { en: 'Egyptian Bar Association', ar: 'نقابة المحامين المصرية' },
    issuedOn: '2024-11-05',
    body: LOREM_FOUR,
    sections: sectionsFrom(LOREM_FOUR, LOREM_SIX, LOREM_ONE),
  },
];
