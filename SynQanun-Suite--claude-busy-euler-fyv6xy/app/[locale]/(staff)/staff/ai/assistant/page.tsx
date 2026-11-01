import { setRequestLocale } from 'next-intl/server';
import { useTranslations } from 'next-intl';
import { formatCalendarDate, formatMoney } from '@/lib/format';
import type { Locale } from '@/lib/i18n/routing';
import { MueenGreetingSurface } from '@/components/mueen';
import { mockApi } from '@/lib/mock-api';
import { StaffTopBar } from '../../../StaffChrome';
import { ScriptedChat, type ScriptedExchange } from '../ScriptedChat';

/**
 * AI Assistant — BUILD_PLAN.md §3, Batch 5.
 *
 * ===========================================================================
 * A SCRIPT OVER REAL RECORDS, AND IT SAYS SO
 * ===========================================================================
 * There is no model. BUILD_PLAN §3 puts Track A at "no live LLM calls" and §6
 * puts real ones in Track A.5, so what this screen demonstrates is the SHAPE
 * of the interaction: what a fee earner would ask, what would come back, and
 * what it would cite.
 *
 * Every figure in every answer is read from a record through the same
 * functions the ordinary screens use — `assistantFacts` goes through
 * `engagementDetail`, `assistantBalance` through `staff.invoices` — so an
 * answer and the screen behind it cannot disagree. Not one number on this page
 * is typed into it.
 *
 * ===========================================================================
 * THE SENTENCES ARE TRANSLATIONS, THE VALUES ARE DATA
 * ===========================================================================
 * lib/mock-api.ts returns a status, a name, a date, a sum. This file turns
 * them into prose with ICU strings from the dictionaries. A sentence assembled
 * in the data layer would be untranslatable, and a figure hardcoded in the
 * dictionary would be a fabrication with a translator's name on it.
 *
 * ===========================================================================
 * SOURCES ARE INTERNAL RECORDS, NEVER CASE LAW
 * ===========================================================================
 * Each answer lists what it was built from — "MAT-2201 · Engagement record" —
 * and every entry is a reference this product holds and can navigate to. Four
 * Stitch exports across this project attached invented case citations to
 * invented AI analysis: "[2023] ADGMCFI 0019", "[2023] CFI 012", "2024-CFI-009",
 * "ADGM Court of Appeal ruling". An assistant that cites a judgment is making a
 * legal claim; one that cites its own records is showing its work.
 *
 * ===========================================================================
 * NO CONFIDENCE SCORE
 * ===========================================================================
 * See AIDemoNotice.tsx. Seven exports attached one to output like this.
 *
 * ===========================================================================
 * WHAT THE STITCH EXPORT PUT HERE
 * ===========================================================================
 * The export arrived after this screen was built, and nothing in it changed
 * the build — but it is worth recording what it contains, because it is the
 * catalogue this file's rules were written against:
 *
 *   · SOURCE CHIPS THAT CITE CASE LAW. "[2023] ADGMCFI 0019 (Astraea v. Apex
 *     Logistics)" and "ADGM Companies Regulations 2020 § 102", offered as
 *     clickable authorities beneath an invented analysis of whether statutory
 *     indemnity rights can be waived. See the section above on why this
 *     screen's sources are internal records only.
 *   · A GENERATED CLAUSE, SCORED. The assistant drafts replacement contract
 *     language and stamps it "Compliance verification: 100% Passed" — the
 *     forbidden confidence score, attached to invented legal drafting, on the
 *     screen where somebody would copy it out.
 *   · MODEL TELEMETRY FOR A MODEL THAT DOES NOT EXIST. "Latency: 420ms",
 *     "Temperature: 0.2 (Rigid)", "Firm-wide Vector Index · 142k docs". This
 *     workspace holds about a dozen documents.
 *   · SEVEN FABRICATED PRIOR CONVERSATIONS, with dates, matter references and
 *     source counts — and the two locales disagree about the same one, filing
 *     it as "DIAC Case 1840" in English and "MAT-1840" in Arabic.
 *   · TWO DIFFERENT TENANTS. "Al-Tamimi & Partners" in the English export,
 *     "رم وشركاه / RAMM & CO" in the Arabic, neither of them this firm — and
 *     "NT_L" rendered literally in the English logo slot.
 *   · AN ESCROW THREAD ("Apex Logistics Escrow Holdback Analysis"), the
 *     thirteenth instance of a facility this product does not operate.
 *   · A timer pre-loaded to 01:46:40 against MAT-2201: time nobody worked.
 */

export const dynamic = 'force-dynamic';

export default async function AssistantPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const demo = await mockApi.staff.assistantDemo();
  return <Assistant locale={locale as Locale} demo={demo} />;
}

function Assistant({
  locale,
  demo,
}: {
  locale: Locale;
  demo: Awaited<ReturnType<typeof mockApi.staff.assistantDemo>>;
}) {
  const t = useTranslations('ai.assistant');
  /*
    The matter-status sentences and the source labels live at ai.* rather than
    under this screen, because the Digest answers the same question from the
    same records and has to say it in the same words. Two copies of one
    sentence are two things to translate and two things to get out of step.
  */
  const status = useTranslations('ai.matterStatus');
  const source = useTranslations('ai.sources');

  /**
   * Words that select an exchange when somebody types rather than clicks.
   *
   * Pipe-separated in the dictionaries so each language brings its own — an
   * Arabic reader typing "الفواتير" has to land on the invoice answer, and
   * would not have if the list were the English keywords alone.
   */
  const keywords = (id: string) =>
    t(`script.${id}.keywords`)
      .split('|')
      .map((word) => word.trim().toLowerCase())
      .filter(Boolean);

  const exchanges: ScriptedExchange[] = [];

  /* ---- 1. The status of a matter ------------------------------------- */
  if (demo.matter) {
    const m = demo.matter;
    exchanges.push({
      id: 'status',
      prompt: t('script.status.prompt', { ref: m.reference }),
      // Loose matching for TYPED questions; a clicked suggestion bypasses it
      // entirely. The keyword list is translated, because a matcher built only
      // from English words answers nothing an Arabic reader types.
      match: [m.reference.toLowerCase(), ...keywords('status')],
      lines: [
        status('line1', {
          ref: m.reference,
          title: m.title[locale],
          status: m.status[locale],
          client: m.clientName[locale],
        }),
        // No single Arabic verb agrees with an interpolated name, so the
        // missing-lead case gets its own sentence rather than a noun phrase
        // dropped into a slot shaped for a person. See ai.matterStatus.
        m.leadName
          ? status('line2', {
              lead: m.leadName[locale],
              phase: m.currentPhase[locale],
            })
          : status('line2NoLead', { phase: m.currentPhase[locale] }),
        m.nextDate
          ? status('line3', {
              title: m.nextDate.title[locale],
              date: formatCalendarDate(m.nextDate.on, locale, { month: 'long' }),
            })
          : status('noNext'),
        status('line4', {
          documents: m.documents,
          tasks: m.tasks,
          approvals: m.approvals,
        }),
      ],
      sources: [
        { ref: m.reference, label: source('engagement'), href: `/staff/matters/${m.reference}` },
        { ref: m.clientName[locale], label: source('client'), href: `/staff/clients/${m.clientId}` },
      ],
    });
  }

  /* ---- 2. What a client owes ----------------------------------------- */
  if (demo.balance) {
    const b = demo.balance;
    exchanges.push({
      id: 'invoices',
      prompt: t('script.invoices.prompt', { client: b.name[locale] }),
      match: [b.name.en.toLowerCase(), b.name.ar, ...keywords('invoices')],
      lines: [
        t('script.invoices.line1', {
          client: b.name[locale],
          // Computed by `staff.invoices`, never added up here.
          amount: formatMoney(b.outstanding, b.currency, locale),
          statements: b.statements,
        }),
        b.overdue > 0
          ? t('script.invoices.overdue', {
              amount: formatMoney(b.overdue, b.currency, locale),
            })
          : t('script.invoices.noneOverdue'),
      ],
      sources: [
        { ref: b.name[locale], label: source('ledger'), href: `/staff/billing?client=${b.id}` },
      ],
    });
  }

  /* ---- 3. A drafted client update ------------------------------------ */
  if (demo.project) {
    const p = demo.project;
    exchanges.push({
      id: 'draft',
      prompt: t('script.draft.prompt', { ref: p.reference }),
      match: [p.reference.toLowerCase(), ...keywords('draft')],
      lines: [
        t('script.draft.line1', { client: p.clientName[locale] }),
        t('script.draft.line2', { title: p.title[locale], phase: p.currentPhase[locale] }),
        p.nextDate
          ? t('script.draft.line3', {
              title: p.nextDate.title[locale],
              date: formatCalendarDate(p.nextDate.on, locale, { month: 'long' }),
            })
          : t('script.draft.noNext'),
        t('script.draft.signoff'),
      ],
      // The caveat the brief asks for, and it is the last thing in the draft
      // rather than a footnote — so anyone copying the text takes it with them.
      closing: t('script.draft.caveat'),
      sources: [
        {
          ref: p.reference,
          label: source('engagement'),
          href: `/staff/matters/${p.reference}`,
        },
      ],
    });
  }

  return (
    <>
      <StaffTopBar title={t('title')} subtitle={t('subtitle')} />
      <main className="mx-auto flex w-full min-h-0 max-w-3xl flex-1 flex-col px-6 py-6">
        {/*
          The face, and the one recording. This is where the sidebar's معين
          entry lands, so it greets on arrival like every other way in — the
          same hook, provider and transcript as the Digest and the floating
          panel. Nothing below it is voiced: ScriptedChat is text, assembled
          from the firm's own records, and says so.
        */}
        <MueenGreetingSurface className="mb-6" size={128} />
        <ScriptedChat
          exchanges={exchanges}
          greeting={t('greeting')}
          unmatched={t('unmatched')}
          placeholder={t('placeholder')}
          sendLabel={t('send')}
          suggestionsLabel={t('suggestions')}
          sourcesLabel={t('sourcesLabel')}
          youLabel={t('you')}
        />
      </main>
    </>
  );
}
