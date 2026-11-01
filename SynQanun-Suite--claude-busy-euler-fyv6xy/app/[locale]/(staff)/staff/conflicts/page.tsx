import { Info } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { mockApi } from '@/lib/mock-api';
import { StaffTopBar } from '../../StaffChrome';
import { ConflictSearchPanel } from './ConflictSearchPanel';

/**
 * Conflict check — BUILD_PLAN.md §3, Batch 6.
 *
 * ===========================================================================
 * THE REGISTER IS REAL NOW, AND THREE SCREENS CHANGED WITH IT
 * ===========================================================================
 * Until this commit, four places in the product said no conflicts register
 * existed: the Matter Risk Overview's conflicts row, the New Matter form, the
 * Add Client form, and `createMatter`'s header. All four were true and all
 * four are now wrong, so all four move in this commit. A product that grows a
 * capability and leaves its own disclaimers behind is how a screen comes to
 * contradict the thing it depends on.
 *
 * ===========================================================================
 * MOST OF THE REGISTER WAS ALREADY HERE
 * ===========================================================================
 * fixtures/conflicts.ts stores only what nothing else records — corporate
 * affiliations and declined engagements. The other three sources are DERIVED
 * from live records the firm keeps anyway: who it acts for, who it is against
 * on each contentious matter (`opposingParty`), and who is across the table on
 * each transaction (`targetEntities`). Six matters and five projects were
 * already carrying adverse parties; nobody had called that a register.
 *
 * Copying those names into a list of their own would have produced a second
 * register free to disagree with the matters it came from — and a conflicts
 * register that disagrees with the file is worse than none, because it is
 * believed.
 *
 * ===========================================================================
 * WHAT THIS SCREEN REFUSES TO DO
 * ===========================================================================
 * The Stitch export runs this as a gate inside matter creation and produces a
 * verdict. Both are refused, for different reasons.
 *
 * NOT A GATE. It is a search a person runs and reads, because the judgement it
 * informs is professional. The previous commit declined to make conflict
 * clearance a step a form can pass; having real data changes what the search
 * can find, not who decides.
 *
 * NO SEVERITY. The export badges findings "Direct Conflict" and "Potential
 * Overlap" and has an AI panel conclude that one "poses a direct procedural
 * conflict under UAE Federal Law No. 34 of 2022 ... Confidence: 98.4%". That
 * is a legal opinion generated from a name match. Whether a relationship
 * disqualifies the firm turns on what it learned while acting, what was
 * consented to and what the retainer says — none of it in any database.
 *
 * NO CLEARANCE. An empty result reads "no record in this firm names that
 * party", never "no conflict". The register is the firm's own knowledge, not
 * the world's, and the gap between those sentences is the entire professional
 * risk. The export's equivalent state would have been a green tick.
 *
 * NO DECLARATION CHECKBOX. The export ends in "I confirm that I have reviewed
 * all flagged conflict records above ... proceeding without Partner waiver may
 * constitute a professional conduct breach", audited to an "Immutable Log:
 * AUD-DXB-9921-CNF". That is a professional attestation with real
 * consequences, recorded to a log that does not exist — the activity log
 * covers approvals only, and says so. A tickbox that pretends to bind somebody
 * is worse than no tickbox.
 *
 * ===========================================================================
 * THE REST OF WHAT THE EXPORT SHIPPED
 * ===========================================================================
 *   · "1,842 active matters" screened, on a firm with ten. The count here is
 *     the register's real size and moves when the register does.
 *   · "Entity Engine v4.2 • Auto-Query", "3 subsidiaries identified", and a
 *     "Re-run full index search" link — an engine, an index and a corporate
 *     tree resolver, none of which exist.
 *   · A FOUR-STEP MATTER WIZARD (details, conflict, rates, roster) replacing
 *     the one-step form built last commit, with conflict as step 2 of 4.
 *   · REAL PEOPLE AND FIRMS as parties: "Al-Manara Logistics PJSC", "Horizon
 *     Shipping LLC (CLI-8802)", "Capt. Mansoor Al-Ketbi", "Rashid Al-Haddad",
 *     and citations of "Law Society Compliance Guideline 4.2" and "Dubai
 *     Legal Affairs Department regulations" for a Cairo firm.
 *   · {{CLIENT_LOGO}} literal for the ninth export, and the timer on
 *     MAT-2204 again.
 */

export const dynamic = 'force-dynamic';

export default async function ConflictsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  // An empty query returns no matches and the register's size, which is all
  // the first paint needs — the search itself is a Server Action.
  const { registerSize } = await mockApi.staff.conflictSearch('');

  return <Conflicts registerSize={registerSize} />;
}

function Conflicts({ registerSize }: { registerSize: number }) {
  const t = useTranslations('conflicts');

  return (
    <>
      <StaffTopBar title={t('title')} subtitle={t('subtitle')} />

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-5 px-6 py-6">
        {/*
          What the register covers and what it cannot. Read before the first
          search, so a clean result is understood correctly the first time.
        */}
        <div className="flex items-start gap-3 rounded-card border border-gray-300 bg-gray-100 p-4">
          <Info aria-hidden size={16} className="mt-0.5 shrink-0 text-gray-500" />
          <div className="min-w-0">
            <p className="text-caption font-medium text-gray-700">{t('scope.heading')}</p>
            <p className="mt-1 text-caption text-gray-600">{t('scope.covers')}</p>
            <p className="mt-2 text-caption text-gray-600">{t('scope.limits')}</p>
          </div>
        </div>

        <ConflictSearchPanel registerSize={registerSize} />
      </main>
    </>
  );
}
