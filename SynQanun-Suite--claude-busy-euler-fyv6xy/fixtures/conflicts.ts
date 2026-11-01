import type { Locale } from '@/lib/i18n/routing';

/**
 * fixtures/conflicts.ts — the firm's conflicts register.
 *
 * ===========================================================================
 * THIS FILE HOLDS ONLY WHAT CANNOT BE DERIVED
 * ===========================================================================
 * Most of a conflicts register is already in this repo and was never labelled
 * as one. The firm knows, from records it keeps for other reasons:
 *
 *   · WHO IT ACTS FOR — fixtures/clients.ts.
 *   · WHO IT IS AGAINST — every contentious matter carries an
 *     `opposingParty`. Six of the nine do.
 *   · WHO IT IS ACROSS THE TABLE FROM — every project carries
 *     `targetEntities`, the transactional counterpart of an opposing party.
 *
 * A conflict search that read a separate list of those names would be a second
 * copy of the register, free to fall out of step with the matters it was
 * copied from — and a conflicts register that disagrees with the matter file
 * is worse than none, because it is trusted. So the search derives those three
 * from the live records and this file holds only the two things nothing else
 * in the product records.
 *
 * ===========================================================================
 * 1. RELATED PARTIES
 * ===========================================================================
 * Corporate affiliation is the part a name search cannot infer. That "Gulf
 * Holdings International Ltd" belongs to the same group as "Gulf Holdings" is
 * obvious to a reader and invisible to a substring match, and the cases that
 * actually catch firms out are the ones where the names share nothing at all.
 * A real register records the link explicitly; so does this one.
 *
 * ===========================================================================
 * 2. DECLINED ENGAGEMENTS
 * ===========================================================================
 * The work the firm turned away. It is the single most useful thing in a
 * conflicts register and the one thing no other record can reconstruct: a
 * matter that was never opened leaves no matter behind. Without it a firm can
 * decline a party for conflict, forget, and be approached again by the same
 * party under a different introducer.
 *
 * ===========================================================================
 * WHAT IS DELIBERATELY ABSENT
 * ===========================================================================
 * A SEVERITY GRADE. The Stitch export badges its two findings "Direct
 * Conflict" and "Potential Overlap", and its AI panel concludes that one of
 * them "poses a direct procedural conflict under UAE Federal Law No. 34 of
 * 2022" with "Confidence: 98.4%". Whether a relationship is disqualifying is a
 * professional judgement about duties to two clients — it depends on what the
 * firm learned, what was consented to, and what the retainer says, none of
 * which is in any database. The register reports the RELATIONSHIP and the
 * lawyer grades it.
 *
 * A CLEARANCE STATE. Nothing here can mark a party cleared, and the screen
 * cannot return "no conflict". It returns "no record names this party", which
 * is a different and much weaker statement — the firm's register is not the
 * world.
 *
 * MOCK: Track A.5 makes this a real table with the corporate-group hierarchy
 * and the declined-engagement log the firm actually keeps, and the search
 * becomes a query rather than a scan. The shape below is what that table has
 * to return.
 */

/** How a related party connects to a record the firm already holds. */
export type RelatedPartyKind =
  /** Owned by, or owning, a party the firm already knows. */
  | 'group'
  /** Shares a director or officer with one. */
  | 'sharedOfficer'
  /** Holds a material stake in one. */
  | 'shareholder';

export interface RelatedParty {
  id: string;
  /** The name a search might be run on. */
  name: Record<Locale, string>;
  kind: RelatedPartyKind;
  /**
   * The client this party connects to. An id into fixtures/clients.ts, never a
   * name written twice — a mistyped literal would attach an affiliation to the
   * wrong client silently.
   */
  clientId: string;
  /** What the connection is, in the firm's own words, per locale. */
  note: Record<Locale, string>;
}

export interface DeclinedEngagement {
  id: string;
  /** The party the firm was asked to act for or against. */
  name: Record<Locale, string>;
  /** Days before the tenant's today that the firm declined. */
  declinedDaysAgo: number;
  /** Why, per locale. Recorded because the next enquiry needs it. */
  reason: Record<Locale, string>;
}

/**
 * Affiliations the firm has recorded.
 *
 * Deliberately includes one pair whose names DO NOT resemble each other —
 * Marsa Bonded Logistics and Alexandria Port Logistics — because that is the
 * case a name search cannot catch and the reason this table exists at all.
 */
export const demoRelatedParties: RelatedParty[] = [
  {
    id: 'rel-001',
    name: {
      en: 'Gulf Holdings International Ltd',
      ar: 'الخليج القابضة الدولية المحدودة',
    },
    kind: 'group',
    clientId: 'cli-001',
    note: {
      en: 'Offshore holding company in the same group as the client.',
      ar: 'شركة قابضة خارجية ضمن مجموعة الموكل نفسها.',
    },
  },
  {
    id: 'rel-002',
    name: { en: 'Marsa Bonded Logistics', ar: 'مرسى للخدمات اللوجستية الجمركية' },
    kind: 'group',
    clientId: 'cli-004',
    note: {
      en: 'Wholly owned subsidiary. The names share nothing, so a search on one will not surface the other without this record.',
      ar: 'شركة تابعة مملوكة بالكامل. ولا يجمع بين الاسمين شيء، فالبحث عن أحدهما لا يُظهر الآخر بغير هذا القيد.',
    },
  },
  {
    id: 'rel-003',
    name: { en: 'Hisham Barakat', ar: 'هشام بركات' },
    kind: 'sharedOfficer',
    clientId: 'cli-005',
    note: {
      en: 'Non-executive director of the client and of two unrelated companies in the sector.',
      ar: 'عضو مجلس إدارة غير تنفيذي لدى الموكل ولدى شركتين أخريين في القطاع نفسه.',
    },
  },
  {
    id: 'rel-004',
    name: { en: 'Delta Agri Investments', ar: 'دلتا للاستثمارات الزراعية' },
    kind: 'shareholder',
    clientId: 'cli-002',
    note: {
      en: 'Holds a majority stake in the client.',
      ar: 'تملك حصة الأغلبية في الموكل.',
    },
  },
];

/**
 * Work the firm turned away, and why.
 *
 * Two of the three were declined for conflict; the third for capacity, which
 * is included on purpose. A register that recorded only conflicts would let a
 * reader assume every name in it was disqualifying, and the reason column
 * exists precisely so that assumption is not available.
 */
export const demoDeclinedEngagements: DeclinedEngagement[] = [
  {
    id: 'dec-001',
    name: { en: 'Najd Media Holding', ar: 'نجد القابضة للإعلام' },
    declinedDaysAgo: 210,
    reason: {
      en: 'Approached the firm directly while already the opposing party on a live matter.',
      ar: 'تواصلت مع المكتب مباشرةً وهي طرف خصم في قضية قائمة.',
    },
  },
  {
    id: 'dec-002',
    name: { en: 'Sinai Quarry Company', ar: 'شركة محاجر سيناء' },
    declinedDaysAgo: 96,
    reason: {
      en: 'Declined for conflict: adverse to a retainer client on an unrelated dispute.',
      ar: 'اعتُذر عنها لتعارض المصالح: خصم لموكل بعقد أتعاب دائم في نزاع غير ذي صلة.',
    },
  },
  {
    id: 'dec-003',
    name: { en: 'Rashid Textiles', ar: 'الرشيد للمنسوجات' },
    declinedDaysAgo: 41,
    reason: {
      en: 'Declined for capacity, not conflict. No conflict was found.',
      ar: 'اعتُذر عنها لعدم توفر الطاقة الاستيعابية، لا لتعارض مصالح. ولم يُرصد أي تعارض.',
    },
  },
];
