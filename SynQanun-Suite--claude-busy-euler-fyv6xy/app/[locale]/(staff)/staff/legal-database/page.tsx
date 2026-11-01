import { ArrowRight, FileText, Info } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { Badge, Card } from '@/components/ui';
import { Link } from '@/lib/i18n/navigation';
import { formatCalendarDate } from '@/lib/format';
import type { Locale } from '@/lib/i18n/routing';
import { mockApi } from '@/lib/mock-api';
import { StaffTopBar } from '../../StaffChrome';
import { LegalSearch } from './LegalSearch';

/**
 * Legal Database Search — BUILD_PLAN.md §3, Batch 5.
 *
 * ===========================================================================
 * NO AIDemoNotice ON THIS SCREEN, ON PURPOSE
 * ===========================================================================
 * The other four Batch 5 screens generate something that reads as analysis and
 * wear the notice that says no model produced it. This one does not generate
 * anything: it is a search interface over a library. Putting the AI notice on
 * it would tell a reader that these entries came out of a model, which would
 * be a different and worse claim than the true one — that there is no library
 * connected yet.
 *
 * It carries its own label instead, in gray rather than legal-navy, because
 * navy is reserved for the product speaking as an agent (design.md §2, and
 * AIDemoNotice.tsx's note on why). A "this is sample data" banner is a system
 * message, not a voice.
 *
 * ===========================================================================
 * WHAT THE STITCH EXPORT PUT ON THIS SCREEN, AND WHY NONE OF IT IS HERE
 * ===========================================================================
 * This is the most dangerous export in the whole project, because everything
 * on it is designed to be copied into a document by a lawyer in a hurry.
 *
 *   · REAL INSTRUMENTS WITH INVENTED TEXT. "ADGM Companies Regulations 2020
 *     (Part 10, Art. 102)", "DIFC Law No. 5/2018 § 85(3)", "UAE Federal Law
 *     No. 6 of 2018 — Article 27" — each real, each quoted at length in words
 *     a design tool wrote. The English export's Article 102 excerpt even
 *     carries a typo ("satisfyng") that no gazette contains.
 *   · INVENTED JUDGMENTS PRESENTED AS BINDING. "[2023] ADGMCFI 0019 (Astraea
 *     Shipping Holdings Ltd v. Apex Logistics Consortium)", badged "Binding
 *     Authority", with a paragraph number ("[42]") and a holding attributed to
 *     a court. Nothing about the card tells a reader it is fiction.
 *   · HIGHLIGHTED PASSAGES. Each excerpt has a <mark> over the "relevant"
 *     sentence, which asserts that an engine read the instrument and found the
 *     operative words. No engine read anything.
 *   · "IN FORCE" / "ENACTED 1 JAN 2021". A currency claim. Whether an
 *     instrument is still in force is the single fact a practitioner most
 *     needs to be right, and it is asserted here about documents that do not
 *     exist.
 *   · "FOUND 18 … SHOWING 1–3 OF 18", with three cards and page buttons that
 *     go nowhere. The recurring self-contradiction: a headline count with
 *     nothing behind it.
 *   · "RELEVANCE (COGNITIVE RANK)" and "COURT AUTHORITY LEVEL" as sort orders,
 *     and a side panel promising "cross-jurisdictional conflict validation" —
 *     three capability claims. The conflicts one is the notable refusal: the
 *     firm does now have a conflicts register, and it is a register of the
 *     firm's OWN parties — not a cross-jurisdictional validator over case law,
 *     which is what this panel offers.
 *   · FOUR PINNED REFERENCES AND FOUR RECENT SEARCHES. Fabricated history
 *     belonging to a named partner, including what they researched and when.
 *     Pinning is a write, and Batch 6 owns writes.
 *
 * What survives is the SHAPE: a query field, facets, a result count, and cards
 * carrying a reference, a type, an issuing body, a date and a body.
 *
 * ===========================================================================
 * THE BODIES ARE LOREM IPSUM
 * ===========================================================================
 * See fixtures/legal-database.ts, which argues the case at length. Short
 * version: it is the one body text nobody in any language mistakes for law,
 * and the references are `SAMPLE-0001`, which is not a citation format any
 * reporter uses anywhere.
 *
 * Each card now links to the full-text reader (Batch 7), which shows the same
 * placeholder at length. The line that used to read "there is no full text to
 * open" moved there rather than being deleted — it belongs before the text, on
 * the screen where somebody is about to read a wall of Latin.
 *
 * ===========================================================================
 * THE FACETS FILTER; THE SEARCH BOX DOES NOT
 * ===========================================================================
 * Filtering three real rows by their real type and issuing body is real work
 * over real values, so the dropdowns do exactly what they appear to. Free-text
 * search has nothing to match against, so it is a stated no-op rather than
 * theatre — LegalSearch.tsx explains that, and why the query stays out of the
 * URL while the facets go into it.
 *
 * ===========================================================================
 * NOT RANK-GATED
 * ===========================================================================
 * The export badges this screen "Partner / Senior Only" in English and
 * "خاص بالشركاء والمستشارين الرئيسيين" in Arabic, while its own sidebar in a
 * different export labels the same entry "Senior". components/chrome/nav-items.ts
 * gives `legalDatabase` no allow-list: looking up a statute is not a privileged
 * act the way signing off a fee quote is, and a paralegal who cannot read the
 * law cannot do their job.
 */

export const dynamic = 'force-dynamic';

export default async function LegalDatabasePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ kind?: string; jurisdiction?: string }>;
}) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  setRequestLocale(locale);

  // Unrecognised values narrow nothing rather than erroring — the allow-list
  // lives in `legalDatabase()`, next to the collection it allows against.
  const result = await mockApi.staff.legalDatabase({
    kind: query.kind,
    jurisdiction: query.jurisdiction,
  });

  return (
    <Library locale={locale as Locale} result={result} selected={query} />
  );
}

function Library({
  locale,
  result,
  selected,
}: {
  locale: Locale;
  result: Awaited<ReturnType<typeof mockApi.staff.legalDatabase>>;
  selected: { kind?: string; jurisdiction?: string };
}) {
  const t = useTranslations('legalDatabase');

  return (
    <>
      <StaffTopBar title={t('title')} subtitle={t('subtitle')} />

      <main className="mx-auto flex w-full max-w-content flex-1 flex-col gap-5 px-6 py-6">
        <Card padding="lg">
          <LegalSearch
            kind={selected.kind ?? ''}
            jurisdiction={selected.jurisdiction ?? ''}
            // Resolved here, because this is where the locale is.
            kinds={result.kinds.map((value) => ({ value, label: t(`kinds.${value}`) }))}
            jurisdictions={result.jurisdictions.map((row) => ({
              value: row.value,
              label: row.label[locale],
            }))}
          />
        </Card>

        {/*
          The panel's own label. Gray and an Info icon, not navy and a feather:
          this is a system message about the data, not the product speaking as
          an agent. See the header.
        */}
        <div className="flex items-start gap-3 rounded-card border border-gray-300 bg-gray-100 p-4">
          <Info aria-hidden size={16} className="mt-0.5 shrink-0 text-gray-500" />
          <div className="min-w-0">
            <p className="text-caption font-medium text-gray-700">{t('sample.heading')}</p>
            <p className="mt-1 text-caption text-gray-600">{t('sample.body')}</p>
          </div>
        </div>

        <p className="text-caption text-gray-500">
          {/* Counted from what was returned against what exists. Never a
              headline figure with nothing behind it. */}
          {t('results.count', { shown: result.items.length, total: result.total })}
        </p>

        {result.items.length === 0 ? (
          <div className="rounded-card border border-dashed border-gray-200 bg-white p-10 text-center">
            <p className="text-body font-medium text-gray-700">{t('results.noneTitle')}</p>
            <p className="mt-1 text-caption text-gray-500">{t('results.noneBody')}</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-4">
            {result.items.map((entry) => (
              <li key={entry.reference}>
                <Card padding="lg">
                  <div className="flex flex-wrap items-center gap-2">
                    {/*
                      Sits exactly where a citation would, and disqualifies
                      itself on sight. Latin in both locales, so `dir="ltr"`
                      under lib/format.ts's identifier rule.
                    */}
                    <span dir="ltr" className="font-mono text-reference text-gray-500">
                      {entry.reference}
                    </span>
                    <Badge tone="neutral" icon={null}>
                      {t(`kinds.${entry.kind}`)}
                    </Badge>
                    <span className="text-caption text-gray-500">
                      <bdi>{entry.jurisdiction[locale]}</bdi>
                    </span>
                    <span className="text-caption text-gray-500 [unicode-bidi:isolate]">
                      {t('entry.issued')}{' '}
                      {formatCalendarDate(entry.issuedOn, locale, { month: 'long' })}
                    </span>
                  </div>

                  <h2 className="mt-2 font-sans text-title text-gray-900">
                    <bdi>{entry.title[locale]}</bdi>
                  </h2>

                  {/*
                    Dashed and gray, the same treatment Document Canvas gives
                    its empty sections, so the two screens agree about what
                    "there is no content here" looks like.

                    `dir="ltr"` because the text IS Latin — correct typography
                    for a Latin paragraph, and in the Arabic interface it makes
                    the placeholder unmistakable.
                  */}
                  <div className="mt-3 rounded-card border border-dashed border-gray-300 bg-gray-50 p-4">
                    <p className="text-caption text-gray-500">{t('entry.bodyCaption')}</p>
                    <p dir="ltr" className="mt-2 text-start text-body text-gray-500">
                      {entry.body}
                    </p>
                  </div>

                  {/*
                    THIS USED TO SAY THERE WAS NO FULL TEXT TO OPEN, and it was
                    true: the card held the only paragraph an entry had. The
                    reader exists now, so the claim moved rather than being
                    deleted — it is on the reader, before the text, where
                    somebody about to read a wall of Latin needs it.

                    What the link opens is still not law. The reader says so
                    twice, and the excerpt above is visibly the same placeholder
                    the reader shows more of.
                  */}
                  <p className="mt-3 flex items-start gap-2 text-caption text-gray-500">
                    <FileText aria-hidden size={14} className="mt-0.5 shrink-0" />
                    {t('entry.sampleBody')}
                  </p>

                  <Link
                    href={`/staff/legal-database/${entry.reference}`}
                    className="mt-3 inline-flex w-fit items-center gap-1.5 text-caption text-legal-navy hover:underline"
                  >
                    {t('entry.read')}
                    {/* A direction, so it mirrors. design.md §12. */}
                    <ArrowRight aria-hidden size={14} className="rtl:rotate-180" />
                  </Link>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
