import { notFound } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import type { Locale } from '@/lib/i18n/routing';
import { mockApi, type MatterDetail } from '@/lib/mock-api';
import {
  EngagementDetail,
  isEngagementTab,
  type EngagementFact,
  type EngagementTab,
} from '../../EngagementDetail';

/**
 * A single matter — overview, documents, timeline and invoices.
 *
 * The screen itself is app/[locale]/(client)/EngagementDetail.tsx, shared with
 * the project detail: a matter and a project are both engagements and their
 * detail views are the same view with different nouns. This file's whole job is
 * to fetch one matter and say which nouns.
 *
 * ---------------------------------------------------------------------------
 * NOT CARRIED OVER FROM THE STITCH EXPORT
 * ---------------------------------------------------------------------------
 *  · THE OVERVIEW TAB CONTAINING EVERYTHING. The export renders the facts, the
 *    counsel card, the full timeline, the full document list AND the full
 *    invoice list under "Overview", then offers three more tabs holding the
 *    same three things. Each tab owns its own subject here.
 *
 *  · "Send secure message" / "إرسال مراسلة مشفرة" and "Secure Channel" /
 *    "القناة الآمنة" — Track A has no authentication at all.
 *
 *  · LEGAL-NAVY ON THE MESSAGE BUTTON. design.md §2 reserves navy for the AI's
 *    surfaces and red for the human's own actions; §7 calls the collision "the
 *    single most important rule in this file".
 *
 *  · "Active Retainer • 65% utilized" — a figure that reads as computed from a
 *    ledger and is not. The Invoices tab shows what the client actually owes.
 *
 *  · "DIFC Courts Registered Practitioner" — a regulatory credential asserted
 *    for a persona, adding nothing the role does not.
 *
 *  · A UAE PHONE NUMBER and `m.alfarooq@firm-portal.ae` for a firm whose domain
 *    is in fixtures/firm.ts. Both now come from the firm.
 *
 *  · THE PULSING RED ATTENTION DOT, the per-type colour dots, "v2.4 LTS" and
 *    the green status dot — all as removed from the list and dashboard.
 */

/** Rendered per request — every date resolves against the tenant's clock. */
export const dynamic = 'force-dynamic';

export default async function MatterDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; reference: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const [{ locale, reference }, { tab }] = await Promise.all([params, searchParams]);
  setRequestLocale(locale);

  // MOCK: the reference is taken from the URL and looked up with no check that
  // it belongs to the signed-in client. That check is the whole security of
  // this screen and it does not exist in Track A — see lib/mock-api.ts.
  const detail = await mockApi.matters.getByReference(decodeURIComponent(reference));
  if (!detail) notFound();

  // An unrecognised ?tab= falls back to Overview rather than erroring — the
  // same treatment the list gives an unknown ?status=.
  return (
    <MatterDetailView
      locale={locale as Locale}
      detail={detail}
      tab={isEngagementTab(tab) ? tab : 'overview'}
    />
  );
}

function MatterDetailView({
  locale,
  detail,
  tab,
}: {
  locale: Locale;
  detail: MatterDetail;
  tab: EngagementTab;
}) {
  const t = useTranslations('matters.detail');
  const tList = useTranslations('matters');
  const { matter, openedOn, timeline, documents, invoices } = detail;

  // Assembled here rather than inside the shared component: a matter has a
  // court file number and an opposing party where a project has a registration
  // number and target entities. Those are not one field under two names.
  const facts: EngagementFact[] = [
    { label: t('overview.matterType'), value: matter.matterType[locale] },
    { label: t('overview.forum'), value: matter.forum[locale] },
    ...(matter.courtFileNumber
      ? [{ label: t('overview.courtFile'), value: matter.courtFileNumber, mono: true }]
      : []),
    { label: t('overview.phase'), value: matter.currentPhase[locale] },
    // Advisory matters have no opponent. The row is omitted rather than
    // printing a label with nothing after it.
    ...(matter.opposingParty
      ? [{ label: t('overview.opposing'), value: matter.opposingParty[locale] }]
      : []),
  ];

  return (
    <EngagementDetail
      locale={locale}
      namespace="matters.detail"
      basePath={`/matters/${matter.reference}`}
      backHref="/matters"
      tab={tab}
      title={matter.title[locale]}
      kindLabel={matter.matterType[locale]}
      reference={matter.reference}
      venue={matter.forum[locale]}
      status={matter.status[locale]}
      statusTone={matter.statusTone}
      needsAttention={matter.needsAttention}
      needsAttentionLabel={tList('needsAttention')}
      attentionReason={matter.attentionReason?.[locale] ?? null}
      // A matter CLOSES where a project completes.
      inactiveLabel={matter.active ? null : tList('closed')}
      openedOn={openedOn}
      facts={facts}
      scopeSummary={matter.scopeSummary[locale]}
      contact={{
        name: matter.counsel.name[locale],
        role: matter.counsel.role[locale],
        phone: matter.counsel.phone,
        email: matter.counsel.email,
        supporting: matter.counsel.supporting?.[locale] ?? null,
      }}
      timeline={timeline}
      documents={documents}
      invoices={invoices}
    />
  );
}
