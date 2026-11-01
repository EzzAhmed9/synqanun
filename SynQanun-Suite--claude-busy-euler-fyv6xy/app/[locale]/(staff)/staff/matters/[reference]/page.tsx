import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import type { Locale } from '@/lib/i18n/routing';
import { mockApi } from '@/lib/mock-api';
import { EngagementView } from '../../register/EngagementView';
import { canReopenMatter } from '../permissions';

/**
 * One matter, from the firm's side.
 *
 * The screen itself is shared with a project — see
 * ../../register/EngagementView.tsx, which also carries the reasoning for one
 * page rather than the export's five tabs. This file reads the collection,
 * names the words, and keeps the record of what its own export claimed.
 *
 * ---------------------------------------------------------------------------
 * NOT CARRIED OVER FROM THE STITCH EXPORT
 * ---------------------------------------------------------------------------
 *  · THE AI STRATEGY ENGINE. "SynQanun Cognitive Strategy & Risk Engine",
 *    "Confidence Score: 94.2%", "احتمالية الحكم لصالح الموكل: 82%", a
 *    recommended settlement range of "$38.0M – $41.5M", and a reading of which
 *    notice is void for missing a 30-day deadline. This is legal advice with a
 *    number on it. It is the fourth screen in a row to carry invented AI
 *    analysis and it is the most dangerous of them, because a litigator acting
 *    on "82%" is acting on nothing.
 *
 *  · ITS CITATIONS, which do not exist: "[2023] ADGMCFI 0019", "[2023] CFI
 *    012", "[2025] ADGMCFI ORD-0312". The two locales also give this matter two
 *    different court file numbers — "ADGM-CFI-2024-00984" in English and
 *    "ADGM-CFI-2024-089" in Arabic.
 *
 *  · THE BILLING PANEL — "Total Billed to Date (FY25) $312,800.00", "Unbilled
 *    Work in Progress $164,250.00 / 142.5 Billable Hours", and per-lawyer
 *    rates. The rates disagree across locales too: $950/$680/$450/$220 in
 *    English, $1,200/$850/$550/$250 in Arabic, for the same four people. There
 *    is no time ledger and there are no rates in this product. The fee
 *    statements below are real, because fixtures/invoices.ts holds them.
 *
 *  · THE TRUST ACCOUNT — "Client Trust / Retainer Balance $75,000.00 / Held at
 *    Emirates NBD Legal Trust", "رصيد حساب الأمانة: 75,000 $ متاح". Client
 *    money is the single most regulated thing a law firm touches and this
 *    product does not hold a penny of it. Ninth instance across the exports.
 *
 *  · A REAL JUDGE ON THE BENCH. "Bench: Sir Peter Gross · Presiding", and in
 *    the Arabic timeline "Justice Sir Peter Gross signed directions order".
 *    He is a real English judge, as was the Justice Sir Jeremy Cooke the
 *    Approvals export named twice. Also Clifford Chance LLP as opposing
 *    counsel, KPMG and Deloitte and PwC and Charles River Associates as
 *    experts, and Emirates NBD and DocuSign as the firm's rails.
 *
 *  · THE INSTRUCTING PRINCIPAL CARD — "Rashid Al-Khouri, Group General
 *    Counsel", with a direct line and a secure mail address. The portal
 *    account on this client is Tarek Al-Rahman (fixtures/accounts.ts). The
 *    export invents a different person to be the same client's contact, and
 *    gives him a phone number.
 *
 *  · THE SECURITY THEATRE: "مؤمن مشفر • ADGM eCourts Sync ON", "All filings
 *    stamped with ADGM Court Registry SHA-256 integrity hash", "SHA-256
 *    #8b91c", "MOJ Notarized", "DocuSign ID #4409", "مدقق بنسبة 100%",
 *    "Strict Tier-1 Redacted Commercial Secrets", and a storage meter reading
 *    "420 MB مستخدمة من 2.0 GB". Nothing is encrypted, hashed, notarised,
 *    synchronised or metered here, and claiming otherwise about a privileged
 *    file is the worst place in the product to claim it.
 *
 *  · "Export Dossier (PDF)", "Share", "+ New Filing", "Upload Document", "+
 *    New Draft Canvas", "Edit Details", "Manage Team", "Add a court date",
 *    "Refresh AI Strategy Audit", and Approve/Reject on every pending item.
 *    Every one is a write. Batch 6, and Approvals is Batch 5.
 */

export const dynamic = 'force-dynamic';

export default async function StaffMatterPage({
  params,
}: {
  params: Promise<{ locale: string; reference: string }>;
}) {
  const { locale, reference } = await params;
  setRequestLocale(locale);

  const [record, time, me] = await Promise.all([
    mockApi.staff.matter(decodeURIComponent(reference)),
    // `null` for a rank that records no time — the gate lives in the data
    // layer, not in this route.
    mockApi.staff.timeEntryContext(),
    mockApi.staff.currentStaff(),
  ]);
  // A reference that names nothing gets the translated 404, not an error page.
  // A former project's reference resolves here: one register since October
  // 2026. See `staff.matters` in lib/mock-api.ts.
  if (!record) notFound();

  return (
    <EngagementView
      locale={locale as Locale}
      // A former project keeps its own words for venue, registry and target.
      namespace={record.engagement.kind === 'project' ? 'staffProjects' : 'staffMatters'}
      basePath="/staff/matters"
      record={record}
      canReopen={canReopenMatter(me.rank)}
      // Flattened here, because this is where the locale is.
      time={
        time
          ? {
              engagements: time.engagements.map((row) => ({
                value: row.value,
                label: row.label[locale as Locale],
              })),
              today: time.today,
              weeksShown: time.weeksShown,
            }
          : null
      }
    />
  );
}
