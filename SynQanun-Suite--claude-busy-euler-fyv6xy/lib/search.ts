/**
 * lib/search.ts — text normalisation for matching, in both scripts.
 *
 * WHY THIS IS NOT `String.includes(query.toLowerCase())`
 * ---------------------------------------------------------------------------
 * A naive substring match works acceptably for English and badly enough for
 * Arabic to make the feature look broken. Four things get in the way, and all
 * four are routine rather than exotic:
 *
 *  1. DIACRITICS (tashkeel). "مُحَامٍ" and "محام" are the same word. Legal text
 *     is more likely than most to carry them, and nobody types them into a
 *     search box.
 *
 *  2. ALEF FORMS. أ إ آ ٱ ا are five spellings of one letter, and which one a
 *     document uses is essentially arbitrary. "إعادة هيكلة" — the query in the
 *     Stitch export itself — does not substring-match "اعادة هيكلة".
 *
 *  3. TA MARBUTA AND ALEF MAQSURA. ة/ه and ى/ي are interchanged constantly in
 *     typed Arabic, including by native writers.
 *
 *  4. ARABIC-INDIC DIGITS. design.md §12 renders Western digits in both
 *     languages, so "MAT-2201" is always shown that way — but a user on an
 *     Arabic keyboard may well type ٢٢٠١, and the reference they are looking at
 *     should still be findable.
 *
 * Normalising both sides to one form is what makes the Arabic half of a
 * bilingual product actually searchable. It is deliberately lossy: the output is
 * only ever compared, never displayed.
 *
 * MOCK: the real implementation is the database's, not JavaScript's — Postgres
 * full-text search with an Arabic configuration, or a search index. This
 * normalisation is the same shape the real one needs (fold before you match) and
 * exists so the prototype behaves correctly rather than to be kept. Track A.5.
 */

/** Combining marks, superscript alef, and the tatweel elongation character. */
const ARABIC_DIACRITICS = /[ً-ْٰـ]/g;

const LETTER_FOLDS: Record<string, string> = {
  // Alef, in all its forms.
  'أ': 'ا', // أ
  'إ': 'ا', // إ
  'آ': 'ا', // آ
  'ٱ': 'ا', // ٱ
  // Ta marbuta → ha.
  'ة': 'ه', // ة
  // Alef maqsura → ya.
  'ى': 'ي', // ى
};

/** Arabic-Indic (٠-٩) and Extended Arabic-Indic (۰-۹) digits → 0-9. */
function foldDigits(value: string): string {
  return value.replace(/[٠-٩۰-۹]/g, (digit) => {
    const code = digit.charCodeAt(0);
    const base = code >= 0x06f0 ? 0x06f0 : 0x0660;
    return String(code - base);
  });
}

/**
 * Fold a string into the form matching is done in.
 *
 * NFKD-then-strip would also remove Latin accents, but it decomposes Arabic in
 * ways that do not help, so the two scripts are handled explicitly.
 */
export function normaliseForSearch(value: string): string {
  return foldDigits(value)
    .toLowerCase()
    .replace(ARABIC_DIACRITICS, '')
    .replace(/[أإآٱةى]/g, (letter) => LETTER_FOLDS[letter] ?? letter)
    // Punctuation a reference might be typed with or without: "MAT 2201",
    // "MAT-2201" and "mat2201" should all find the same file.
    .replace(/[\s\-_.]+/g, ' ')
    .trim();
}

/**
 * Does any of `haystacks` contain `needle`?
 *
 * Every term in the query must appear somewhere (AND, not OR), so adding a word
 * narrows the result set the way a reader expects. The terms need not appear in
 * the same field: "restructuring 4410" finds the project whose title carries one
 * and whose reference carries the other.
 */
export function matchesQuery(haystacks: (string | null | undefined)[], query: string): boolean {
  const terms = normaliseForSearch(query).split(' ').filter(Boolean);
  if (terms.length === 0) return false;

  const hay = haystacks
    .filter((value): value is string => Boolean(value))
    .map(normaliseForSearch)
    .join(' ');

  return terms.every((term) => hay.includes(term));
}

/**
 * The shortest query worth running.
 *
 * One character matches most of the collection, which is not a result set — it
 * is the whole portal rendered as a list. The modal shows its prompt instead.
 */
export const MIN_QUERY_LENGTH = 2;
