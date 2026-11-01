import { Briefcase } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { EmptyState } from '@/components/ui';
import { formatCalendarDate } from '@/lib/format';
import type { Locale } from '@/lib/i18n/routing';
import { PROJECT_FILTERS, mockApi, type ProjectFilter, type ProjectRecord } from '@/lib/mock-api';
import { ClientTopBar } from '../ClientPortalChrome';
import { EngagementFilterNav } from '../EngagementFilterNav';
import { EngagementTable, type EngagementRowData } from '../EngagementTable';

/**
 * My Projects — the client's transactional and corporate engagements.
 *
 * Structurally the matters list, because a project is the same kind of thing
 * with different nouns: the table and the filter strip are shared (see
 * EngagementTable.tsx and EngagementFilterNav.tsx), and this file fetches
 * projects and names the columns.
 *
 * The one real difference is the third filter. A project COMPLETES where a
 * matter closes — same `!active` predicate, different word for it, carried by
 * the translation rather than by a second code path.
 *
 * ---------------------------------------------------------------------------
 * NOT CARRIED OVER FROM THE STITCH EXPORT
 * ---------------------------------------------------------------------------
 *  · "5 active engagements" beside tabs reading "All (5) … Completed (1)".
 *    Five cannot be both the total and the active count when one is complete.
 *    The chip is gone; the tabs carry counts computed in one pass.
 *
 *  · THE ARABIC-ONLY "إشعار قانوني وتحديث الحوكمة" BANNER, which has no English
 *    counterpart — design.md §0 makes both languages first-class, so one does
 *    not get furniture the other lacks. It also asserts that status and
 *    timelines "sync directly from SynQanun's case-management system", which in
 *    Track A is a fixture file.
 *
 *  · THE EXPORT'S OWN SEARCH SCRIPT, which hid rows with `style.display` and
 *    left the "Showing 5 of 5" footer claiming five while showing one.
 *
 *  · THE ARABIC SIDEBAR PUTTING THE CLIENT'S OWN NAME IN THE {{CLIENT_LOGO}}
 *    SLOT ("مجموعة الخليج القابضة"). That slot is the TENANT's — the law firm's
 *    — not the signed-in client's organisation. brand-guidelines.md §7.1 scopes
 *    it to the firm; putting the client there inverts whose portal this is.
 *
 *  · "Adv. R. Al-Khatib" / "المستشار ر. الخطيب" — the gendered honorific again.
 *  · THE PULSING AMBER DOTS, the "System Online" indicator, "v2.4 LTS", and the
 *    whole-row click handler.
 */

/** Rendered per request — `lastUpdatedOn` resolves against the tenant's clock. */
export const dynamic = 'force-dynamic';

function isProjectFilter(value: string | undefined): value is ProjectFilter {
  return value !== undefined && (PROJECT_FILTERS as string[]).includes(value);
}

export default async function ProjectsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const [{ locale }, { status }] = await Promise.all([params, searchParams]);
  setRequestLocale(locale);

  const filter: ProjectFilter = isProjectFilter(status) ? status : 'all';

  const [result, categories] = await Promise.all([
    mockApi.projects.list({ filter }),
    mockApi.projects.categories(),
  ]);

  return (
    <Projects
      locale={locale as Locale}
      filter={filter}
      counts={result.counts}
      projects={result.items}
      categories={categories.map((category) => category[locale as Locale])}
    />
  );
}

function Projects({
  locale,
  filter,
  counts,
  projects,
  categories,
}: {
  locale: Locale;
  filter: ProjectFilter;
  counts: Record<ProjectFilter, number>;
  projects: ProjectRecord[];
  categories: string[];
}) {
  const t = useTranslations('projects');

  const rows: EngagementRowData[] = projects.map((project) => ({
    id: project.id,
    reference: project.reference,
    href: `/projects/${project.reference}`,
    title: project.title[locale],
    category: project.category[locale],
    venue: project.jurisdiction[locale],
    lead: project.manager[locale],
    status: project.status[locale],
    statusTone: project.statusTone,
    needsAttention: project.needsAttention,
    attentionReason: project.attentionReason?.[locale] ?? null,
    inactive: !project.active,
    lastUpdatedOn: project.lastUpdatedOn,
    lastUpdatedLabel: formatCalendarDate(project.lastUpdatedOn, locale),
  }));

  return (
    <>
      <ClientTopBar title={t('title')} subtitle={t('subtitle')} />

      <main className="mx-auto flex w-full max-w-content flex-1 flex-col gap-5 px-6 py-6">
        {counts.all === 0 ? (
          <EmptyState icon={Briefcase} title={t('emptyNone')} body={t('emptyNoneBody')} />
        ) : (
          <>
            <EngagementFilterNav
              values={PROJECT_FILTERS}
              active={filter}
              counts={counts}
              pathname="/projects"
              namespace="projects"
            />

            {/* The dropdown filters by CATEGORY here and by forum on the matters
                list — the same control, filled from whichever field
                distinguishes the rows. */}
            <EngagementTable rows={rows} filterOptions={categories} namespace="projects" />
          </>
        )}
      </main>
    </>
  );
}
