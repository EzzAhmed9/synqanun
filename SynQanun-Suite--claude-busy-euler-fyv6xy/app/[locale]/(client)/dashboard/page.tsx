import { Briefcase, Scale } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import type { Matter } from '@/fixtures/matters';
import type { Project } from '@/fixtures/projects';
import { tenantToday, type CalendarDate } from '@/lib/format';
import type { Locale } from '@/lib/i18n/routing';
import {
  mockApi,
  type ConsultationAvailability,
  type InvoiceRecord,
  type InvoiceSummary,
  type KeyDate,
  type MessageThreadRecord,
  type SharedDocumentRecord,
} from '@/lib/mock-api';
import { ClientTopBar } from '../ClientPortalChrome';
import { KeyDatesStrip } from '../KeyDatesStrip';
import { EngagementCard, type EngagementRow } from './EngagementCard';
import { QuickActions } from './QuickActions';
import { InvoicesCard, MessagesCard, SharedDocumentsCard } from './SummaryCards';

/**
 * Client Dashboard — the portal's landing screen, and the first screen in the
 * product that sits behind a sign-in.
 *
 * Built from the Stitch export as a layout reference only. Everything visible
 * comes from Batch 0's component library and the Batch 2 fixtures; none of the
 * export's markup survives.
 *
 * ---------------------------------------------------------------------------
 * NOT CARRIED OVER FROM THE EXPORT
 * ---------------------------------------------------------------------------
 *  · "v2.4 LTS" AND THE GREEN STATUS DOT in the sidebar footer. A version this
 *    product has never had, beside a health indicator with nothing behind it.
 *    The sidebar now shows APP_VERSION from package.json and no dot — the same
 *    call already made on Splash.
 *
 *  · "المراسلات الآمنة" — "secure correspondence" — as the Arabic heading for a
 *    card headed plainly "Messages" in English. An unearned security claim
 *    (Track A has no authentication), and an Arabic screen asserting something
 *    the English one does not, which design.md §0 rules out by making both
 *    languages first-class. Both are "Messages".
 *
 *  · THE ALL-CAPS EYEBROWS — "UPCOMING KEY DATES", "CLIENT PORTAL". design.md
 *    §3 and §7 name the tracked-out all-caps label as a generic-AI-UI tell and
 *    forbid it. Sentence case throughout.
 *
 *  · THE {{CLIENT_LOGO}} DASHED PLACEHOLDER in the sidebar head. Consistent
 *    with every screen so far: demoFirm.logoLight is null, so the SynQanun
 *    wordmark stands alone. The slot is real and lives in <Sidebar>; pointing
 *    the fixture at a file is all it takes to fill it.
 *
 *  · THE MARCH 2025 DATES. Fixed dates in a checked-in file are stale the week
 *    after they are written, and this screen's whole top strip is dates. They
 *    are relative offsets in the fixtures now, resolved against the tenant's
 *    clock — see fixtures/matters.ts and lib/format.ts.
 *
 *  · "Assigned team: 3 counsel & paralegal on matter" under the Messages card.
 *    It names a team composition no fixture holds and does not say which matter
 *    it means. The slot carries a second real thread instead.
 *
 *  · THE MOBILE BOTTOM TAB BAR. The export includes one; it is not built. Below
 *    1280px the sidebar collapses to its icon rail, which is usable but is not
 *    design.md §8's specified behaviour below 768px. Known gap, tracked.
 */

/** The window the key-dates strip covers. Stated once; the caption reads it. */
const KEY_DATES_WINDOW_DAYS = 30;

/**
 * Rendered per request rather than prerendered.
 *
 * Every date on this screen is resolved against `tenantToday()`. Under static
 * generation that would be the BUILD date, so a demo deployed once would go on
 * insisting the same four hearings were "in the next 30 days" for as long as it
 * stayed up. The auth screens are static and should stay static; this one
 * cannot be.
 *
 * MOCK: this line goes away with the fixtures. A real dashboard is dynamic
 * because it reads a database per request, not because it needs a clock.
 */
export const dynamic = 'force-dynamic';

export default async function ClientDashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  // One round trip each, in parallel. Sequentially these would stack six lots
  // of mock latency into a visible delay — which is exactly the loading
  // behaviour the artificial delay exists to surface, and exactly the reason a
  // real dashboard should be one aggregate endpoint (see lib/mock-api.ts).
  const [
    activeMatters,
    activeProjects,
    upcoming,
    sharedDocuments,
    invoiceSummary,
    invoiceList,
    inbox,
    availability,
  ] = await Promise.all([
    mockApi.matters.listActive(),
    mockApi.projects.listActive(),
    mockApi.keyDates.upcoming(KEY_DATES_WINDOW_DAYS),
    // The three most recent, of however many exist. The card's own chip counts
    // what it lists, not the collection — see SummaryCards.tsx.
    mockApi.documents.listShared({ pageSize: 3 }),
    mockApi.invoices.summary(),
    mockApi.invoices.list(),
    mockApi.messages.overview(2),
    // For the book-a-call modal in the quick-action strip. Fetched here rather
    // than in the layout because this is its only trigger — see QuickActions.
    mockApi.consultations.availability(),
  ]);

  // Resolved once and threaded through, so every card decides "is this today?"
  // against the same day. Two components each calling the clock could disagree
  // across midnight.
  const today = tenantToday();

  // Which unpaid invoices to preview is a presentation choice, so it is made
  // here rather than inside a card. The figures themselves are NOT computed
  // here — `invoiceSummary` comes from the API layer, because a balance is an
  // aggregate a client should not be able to reconstruct from whatever
  // happened to be on the page.
  const outstanding = invoiceList.items.filter((invoice) => invoice.status !== 'paid').slice(0, 2);

  return (
    <ClientDashboard
      locale={locale as Locale}
      matters={activeMatters.items}
      matterTotal={activeMatters.total}
      projects={activeProjects.items}
      projectTotal={activeProjects.total}
      keyDates={upcoming}
      documents={sharedDocuments.items}
      invoiceSummary={invoiceSummary}
      outstanding={outstanding}
      threads={inbox.threads}
      unreadCount={inbox.unreadCount}
      today={today}
      availability={availability}
    />
  );
}

function ClientDashboard({
  locale,
  matters,
  matterTotal,
  projects,
  projectTotal,
  keyDates,
  documents,
  invoiceSummary,
  outstanding,
  threads,
  unreadCount,
  today,
  availability,
}: {
  locale: Locale;
  matters: Matter[];
  matterTotal: number;
  projects: Project[];
  projectTotal: number;
  keyDates: KeyDate[];
  documents: SharedDocumentRecord[];
  invoiceSummary: InvoiceSummary;
  outstanding: InvoiceRecord[];
  threads: MessageThreadRecord[];
  unreadCount: number;
  today: CalendarDate;
  availability: ConsultationAvailability;
}) {
  const t = useTranslations('dashboard');
  const tKeyDates = useTranslations('dashboard.keyDates');
  const tMatters = useTranslations('dashboard.matters');
  const tProjects = useTranslations('dashboard.projects');

  // Matters and projects are flattened to a common row shape here, where the
  // translations are, so <EngagementCard> stays ignorant of which it is holding.
  const matterRows: EngagementRow[] = matters.map((matter) => ({
    id: matter.id,
    reference: matter.reference,
    title: matter.title[locale],
    metaPrimary: tMatters('leadCounsel', { name: matter.leadCounsel[locale] }),
    metaSecondary: matter.forum[locale],
    status: matter.status[locale],
    statusTone: matter.statusTone,
    needsAttention: matter.needsAttention,
  }));

  const projectRows: EngagementRow[] = projects.map((project) => ({
    id: project.id,
    reference: project.reference,
    title: project.title[locale],
    metaPrimary: tProjects('manager', { name: project.manager[locale] }),
    metaSecondary: project.jurisdiction[locale],
    status: project.status[locale],
    statusTone: project.statusTone,
    needsAttention: project.needsAttention,
  }));

  return (
    <>
      {/* Identity and the no-Digest rule come from ClientPortalChrome, so a
          page supplies only its own title — see the note there. */}
      <ClientTopBar title={t('title')} subtitle={t('subtitle')} />

      <main className="mx-auto flex w-full max-w-content flex-1 flex-col gap-6 px-6 py-6">
        <QuickActions availability={availability} />

        <KeyDatesStrip
          dates={keyDates}
          locale={locale}
          heading={tKeyDates('heading')}
          caption={tKeyDates('count', { count: keyDates.length, days: KEY_DATES_WINDOW_DAYS })}
          emptyLabel={tKeyDates('empty', { days: KEY_DATES_WINDOW_DAYS })}
        />

        {/* Two equal columns on desktop, stacked below. `desktop:` is 1280px —
            design.md §8's full-sidebar-plus-multi-pane breakpoint. */}
        <section className="grid grid-cols-1 gap-6 desktop:grid-cols-2">
          <EngagementCard
            icon={Scale}
            title={tMatters('title')}
            subtitle={tMatters('subtitle')}
            countLabel={tMatters('count', { count: matterTotal })}
            rows={matterRows}
            showingLabel={tMatters('showing', { shown: matterRows.length, total: matterTotal })}
            viewAllLabel={tMatters('viewAll')}
            viewAllHref="/matters"
            needsAttentionLabel={t('needsAttention')}
            emptyLabel={tMatters('empty')}
          />

          <EngagementCard
            icon={Briefcase}
            title={tProjects('title')}
            subtitle={tProjects('subtitle')}
            countLabel={tProjects('count', { count: projectTotal })}
            rows={projectRows}
            showingLabel={tProjects('showing', { shown: projectRows.length, total: projectTotal })}
            viewAllLabel={tProjects('viewAll')}
            viewAllHref="/projects"
            needsAttentionLabel={t('needsAttention')}
            emptyLabel={tProjects('empty')}
          />
        </section>

        <section className="grid grid-cols-1 gap-6 tablet:grid-cols-3">
          <SharedDocumentsCard documents={documents} today={today} locale={locale} />
          <InvoicesCard summary={invoiceSummary} outstanding={outstanding} locale={locale} />
          <MessagesCard
            threads={threads}
            unreadCount={unreadCount}
            today={today}
            locale={locale}
          />
        </section>
      </main>
    </>
  );
}
