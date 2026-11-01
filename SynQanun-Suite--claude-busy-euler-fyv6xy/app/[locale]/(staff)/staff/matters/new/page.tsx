import { FolderPlus, Info } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { Locale } from '@/lib/i18n/routing';
import { mockApi, type NewMatterOptions } from '@/lib/mock-api';
import { StaffTopBar } from '../../../StaffChrome';
import { RouteNotPermitted } from '../../RouteNotPermitted';
import { canOpenMatter } from '../permissions';
import { NewMatterForm } from './NewMatterForm';

/**
 * New Matter — BUILD_PLAN.md §3, Batch 6.
 *
 * ===========================================================================
 * THE CONFLICT-CHECK GATE IS REFUSED, AND THIS IS WHY
 * ===========================================================================
 * The Stitch export makes opening a matter a two-step flow. Step two is an "AI
 * Conflict Check Screening" gate, and it is the most dangerous single element
 * in any export this project has received:
 *
 *   · "Autonomous counterpart cross-check against 1,842 active matters"
 *   · "Full Corporate Entity Tree Resolution"
 *   · "Sanction & AML Watchlist Audit"
 *   · "No matter docket can be opened or billed without conflict clearance or
 *     authorized Senior Partner override"
 *   · An "Initial Docket Readiness Index — 92% Score ✓ Ready for Gate 2"
 *
 * A conflicts register now exists — fixtures/conflicts.ts, plus the adverse
 * parties the matters already carried — and /staff/conflicts searches it. The
 * gate is still refused, and the register is why the refusal is worth
 * restating rather than quietly dropping.
 *
 * Having data changed what a search can FIND. It did not change who decides.
 * A conflicts search runs against a party and returns records; whether any of
 * them disqualifies the firm turns on what it learned while acting, what was
 * consented to and what the retainer says. A form cannot read those, so a form
 * cannot clear a matter — and a screen that appears to discharge a professional
 * duty invites a lawyer to skip the thing they are actually required to do.
 * The export's 92% readiness score is the forbidden shape from Batch 5,
 * attached this time to a compliance decision.
 *
 * So the check is its own screen, run against a party rather than against a
 * form, and this one says twice that none has run here: once before the button
 * is pressed, once on the confirmation.
 *
 * ===========================================================================
 * THE REST OF WHAT THE EXPORT SHIPPED
 * ===========================================================================
 *   · A RESERVED REFERENCE ON AN EMPTY FORM — "AI Case Identifier: MAT-2205,
 *     Auto-Generated". It hands out a file number for a matter that may never
 *     be created. Ours is generated on save and appears in the confirmation.
 *   · FEE FIGURES AT INTAKE — "Retainer / Fixed Capped ($180,000 USD)" and a
 *     "Tier-1 Partner Oversight rate". There is no rate card in this product
 *     and a fee basis is a quote, which Approvals already models as a record a
 *     partner signs off. Typing one into the form that creates the matter
 *     would produce an agreed price nobody agreed.
 *   · COMPLIANCE FURNITURE — "Enterprise Security L3", "Regulatory Protocol:
 *     DIFC-COI-2025/B", "Compliant with DIFC Court Rules Part 35",
 *     "256-bit AES envelope encryption applied to all filings",
 *     "ISO/IEC 27001 Certified", "Statutory Freeze ... automated ethical wall
 *     isolation". Seven claims, none of them true of this product.
 *   · "AUTO-FILL FROM INTAKE MEMO" and "AI Redraft for Engagement Letter" —
 *     two AI actions over documents that do not exist.
 *   · A VERIFIED CLIENT — "Apollo Global Logistics Ltd, CLI-9041, Verified
 *     Entity • Active Retainer, DIFC Registry of Companies #08219". Not this
 *     firm's client, and a verification badge for a check nothing performs.
 *   · GENERATED PORTRAITS for the staffing pills, image prompts left in the
 *     markup as `data-alt`, and a "Sarah Khalid" who is not on the roster.
 *   · A DIFC/UAE jurisdiction footer on a Cairo firm, and the timer once more
 *     on "MAT-2204 · Apollo Maritime Acquisition", which is not on the
 *     register.
 *
 * ===========================================================================
 * PARTNER AND SENIOR ASSOCIATE
 * ===========================================================================
 * Reading the register is open to everyone; opening a file commits the firm.
 * See ../permissions.ts, which both this route and the Server Action read.
 */

export const dynamic = 'force-dynamic';

export default async function NewMatterPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const me = await mockApi.staff.currentStaff();

  // Before anything is fetched. A link that was not drawn is not a permission.
  if (!canOpenMatter(me.rank)) {
    const t = await getTranslations('staffMatters.new');
    const tRank = await getTranslations('ranks');
    return (
      <RouteNotPermitted
        icon={FolderPlus}
        pageTitle={t('heading')}
        subtitle={t('subtitle')}
        title={t('notPermitted.title')}
        // The BARE category, not `holder` — it lands inside a sentence.
        body={t('notPermitted.body', { rank: tRank(me.rank) })}
      />
    );
  }

  const options = await mockApi.staff.newMatterOptions();

  return <NewMatter locale={locale as Locale} options={options} />;
}

function NewMatter({
  locale,
  options,
}: {
  locale: Locale;
  options: NewMatterOptions;
}) {
  const t = useTranslations('staffMatters.new');

  // Resolved here, because this is where the locale is.
  const flatten = (rows: NewMatterOptions['clients']) =>
    rows.map((row) => ({ value: row.value, label: row.label[locale] }));

  return (
    <>
      <StaffTopBar title={t('heading')} subtitle={t('subtitle')} />

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-5 px-6 py-6">
        {/*
          What opening a matter does and does not do, before the form. The
          export's version of this space holds a progress ribbon promising a
          conflict screen; this holds the fact that there isn't one.
        */}
        <div className="flex items-start gap-3 rounded-card border border-gray-300 bg-gray-100 p-4">
          <Info aria-hidden size={16} className="mt-0.5 shrink-0 text-gray-500" />
          <div className="min-w-0">
            <p className="text-caption font-medium text-gray-700">{t('intro.heading')}</p>
            <p className="mt-1 text-caption text-gray-600">{t('intro.body')}</p>
            <p className="mt-2 text-caption text-gray-600">{t('intro.locales')}</p>
          </div>
        </div>

        <NewMatterForm
          clients={flatten(options.clients)}
          practiceAreas={flatten(options.practiceAreas)}
          forums={flatten(options.forums)}
          leads={flatten(options.leads)}
        />
      </main>
    </>
  );
}
