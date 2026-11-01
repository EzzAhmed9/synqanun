import { notFound } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import type { Locale } from '@/lib/i18n/routing';
import { mockApi, type ProjectDetail } from '@/lib/mock-api';
import {
  EngagementDetail,
  isEngagementTab,
  type EngagementFact,
  type EngagementTab,
} from '../../EngagementDetail';

/**
 * A single project — overview, documents, timeline and invoices.
 *
 * Structurally the matter detail, because a project IS the same kind of thing:
 * work the firm was instructed to do, with a lead, a procedural record, shared
 * documents and a ledger. The screen is
 * app/[locale]/(client)/EngagementDetail.tsx, built once and used by both; this
 * file fetches one project and supplies the nouns.
 *
 * WHAT DIFFERS FROM THE MATTER SIDE, AND WHY
 * ---------------------------------------------------------------------------
 *  · The facts panel. A matter has a court file number and an opposing party; a
 *    project has a registration number and target entities. A transaction has
 *    subjects, not an opponent, so the rows are assembled here rather than
 *    pretending the two are one field.
 *  · A project COMPLETES where a matter closes. Same `!active` predicate, and
 *    the translation carries the difference.
 *  · The contact card reads "Responsible lead", not "Responsible counsel" —
 *    also purely a translation, off the identical key shape.
 *
 * ---------------------------------------------------------------------------
 * NOT CARRIED OVER FROM THE STITCH EXPORT
 * ---------------------------------------------------------------------------
 *  · THE OVERVIEW TAB CONTAINING EVERYTHING — the export repeats the timeline,
 *    documents and invoices under Overview and then offers three tabs holding
 *    exactly those. Each tab owns its subject.
 *
 *  · "Send secure message" / "إرسال مراسلة مشفرة" and "القناة الآمنة", against a
 *    build with no authentication.
 *
 *  · LEGAL-NAVY ON THE MESSAGE BUTTON — navy is the AI's, red is the human's
 *    (design.md §2, §7).
 *
 *  · "Fixed Fee Engagement • 70% milestones billed" — a figure that reads as
 *    computed from a ledger and is not. The Invoices tab is the real answer.
 *
 *  · "ADGM & KSA Bar Registered" beneath the lead's name — a regulatory
 *    credential asserted for a persona.
 *
 *  · A UAE PHONE and `r.alkhatib@firm-portal.ae` for a Cairo firm whose domain
 *    lives in fixtures/firm.ts.
 *
 *  · "المستشار ر. الخطيب" / "Adv. R. Al-Khatib" — the Arabic honorific is
 *    gendered, and the export picks a gender per persona by inference. Names
 *    render in full without it.
 *
 *  · THE ARABIC-ONLY "إشعار قانوني وتحديث الحوكمة" BANNER on the list, which
 *    has no English counterpart — design.md §0 makes both languages
 *    first-class, which rules out one carrying furniture the other does not.
 *    It also asserts a live sync with a case-management system that does not
 *    exist in Track A.
 *
 *  · THE PULSING AMBER STATUS DOTS, the green "System Online" indicator and
 *    "v2.4 LTS" — as removed everywhere else.
 */

/** Rendered per request — every date resolves against the tenant's clock. */
export const dynamic = 'force-dynamic';

export default async function ProjectDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; reference: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const [{ locale, reference }, { tab }] = await Promise.all([params, searchParams]);
  setRequestLocale(locale);

  // MOCK: the reference is taken from the URL and looked up with no check that
  // it belongs to the signed-in client — see lib/mock-api.ts.
  const detail = await mockApi.projects.getByReference(decodeURIComponent(reference));
  if (!detail) notFound();

  return (
    <ProjectDetailView
      locale={locale as Locale}
      detail={detail}
      tab={isEngagementTab(tab) ? tab : 'overview'}
    />
  );
}

function ProjectDetailView({
  locale,
  detail,
  tab,
}: {
  locale: Locale;
  detail: ProjectDetail;
  tab: EngagementTab;
}) {
  const t = useTranslations('projects.detail');
  const tList = useTranslations('projects');
  const { project, openedOn, timeline, documents, invoices } = detail;

  const facts: EngagementFact[] = [
    { label: t('overview.category'), value: project.category[locale] },
    { label: t('overview.jurisdiction'), value: project.jurisdiction[locale] },
    ...(project.registrationNumber
      ? [{ label: t('overview.registration'), value: project.registrationNumber, mono: true }]
      : []),
    { label: t('overview.phase'), value: project.currentPhase[locale] },
    ...(project.targetEntities
      ? [{ label: t('overview.entities'), value: project.targetEntities[locale] }]
      : []),
  ];

  return (
    <EngagementDetail
      locale={locale}
      namespace="projects.detail"
      basePath={`/projects/${project.reference}`}
      backHref="/projects"
      tab={tab}
      title={project.title[locale]}
      kindLabel={project.category[locale]}
      reference={project.reference}
      venue={project.jurisdiction[locale]}
      status={project.status[locale]}
      statusTone={project.statusTone}
      needsAttention={project.needsAttention}
      needsAttentionLabel={tList('needsAttention')}
      attentionReason={project.attentionReason?.[locale] ?? null}
      inactiveLabel={project.active ? null : tList('closed')}
      openedOn={openedOn}
      facts={facts}
      scopeSummary={project.scopeSummary[locale]}
      contact={{
        name: project.lead.name[locale],
        role: project.lead.role[locale],
        phone: project.lead.phone,
        email: project.lead.email,
        supporting: project.lead.supporting?.[locale] ?? null,
      }}
      timeline={timeline}
      documents={documents}
      invoices={invoices}
    />
  );
}
