import { ArrowLeft, ArrowRight, Scale, BookOpen, FileText, UserCheck, Tag, Calendar } from 'lucide-react';
import { notFound } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { Badge, Card } from '@/components/ui';
import { formatCalendarDate } from '@/lib/format';
import { Link } from '@/lib/i18n/navigation';
import type { Locale } from '@/lib/i18n/routing';
import { backendBridge } from '@/lib/backend-bridge';
import { mockApi } from '@/lib/mock-api';
import { StaffTopBar } from '../../../StaffChrome';
import { CopyReference } from './CopyReference';

export const dynamic = 'force-dynamic';

export default async function LawReaderPage({
  params,
}: {
  params: Promise<{ locale: string; reference: string }>;
}) {
  const { locale, reference } = await params;
  setRequestLocale(locale);

  const decodedRef = decodeURIComponent(reference);
  let record: any = null;

  try {
    const backendData = await backendBridge.legalDatabase.get(decodedRef);
    if (backendData && (backendData.entry || backendData.reference)) {
      const entryObj = backendData.entry || backendData;
      record = {
        entry: entryObj,
        previous: backendData.previous ? { reference: backendData.previous, title: { ar: backendData.previous, en: backendData.previous } } : null,
        next: backendData.next ? { reference: backendData.next, title: { ar: backendData.next, en: backendData.next } } : null,
        position: backendData.position || 1,
        total: backendData.total || 1,
      };
    }
  } catch {
    record = null;
  }

  // Graceful fallback if backend is temporarily unreachable
  if (!record) {
    record = await mockApi.staff.legalEntry(decodedRef);
  }

  if (!record || !record.entry) notFound();

  return <Reader locale={locale as Locale} record={record} />;
}

function Reader({ locale, record }: { locale: Locale; record: any }) {
  const t = useTranslations('lawReader');
  const tDb = useTranslations('legalDatabase');
  const { entry, previous, next, position, total } = record;

  const titleText =
    typeof entry.title === 'object' && entry.title !== null
      ? entry.title[locale] || entry.title.ar || entry.title.en
      : entry.title;

  const jurisdictionText =
    typeof entry.jurisdiction === 'object' && entry.jurisdiction !== null
      ? entry.jurisdiction[locale] || entry.jurisdiction.ar || entry.jurisdiction.en
      : entry.jurisdiction;

  const bodyText =
    typeof entry.body === 'object' && entry.body !== null
      ? entry.body[locale] || entry.body.ar || entry.body.en
      : typeof entry.content === 'object' && entry.content !== null
      ? entry.content[locale] || entry.content.ar || entry.content.en
      : entry.body || entry.content || '';

  const sections: { id?: any; number: string; type?: string; body: string }[] =
    entry.sections && Array.isArray(entry.sections) && entry.sections.length > 0
      ? entry.sections
      : bodyText
      ? [{ number: '1', body: bodyText }]
      : [];

  const KindIcon = entry.kind === 'judgment' ? Scale : entry.kind === 'statute' ? BookOpen : FileText;

  return (
    <>
      <StaffTopBar
        title={titleText}
        subtitle={locale === 'ar' ? 'عرض السند القانوني والنص الكامل' : 'Legal Authority & Full Text View'}
      />

      <main className="mx-auto flex w-full max-w-content flex-1 flex-col gap-5 px-6 py-6">
        <Link
          href="/staff/legal-database"
          className="inline-flex w-fit items-center gap-1.5 text-caption font-medium text-legal-navy hover:underline"
        >
          <ArrowLeft aria-hidden size={14} className="rtl:rotate-180" />
          {t('back')}
        </Link>

        {/* Header Metadata Card */}
        <Card padding="lg" className="bg-white shadow-sm border-gray-200">
          <div className="flex flex-wrap items-center gap-2">
            <span dir="ltr" className="font-mono text-reference font-semibold text-legal-navy bg-legal-navy/5 px-2.5 py-1 rounded-pill border border-legal-navy/10">
              {entry.reference}
            </span>
            <Badge tone={entry.kind === 'judgment' ? 'action' : 'neutral'} icon={null} className="inline-flex items-center gap-1">
              <KindIcon size={12} />
              <span>{tDb(`kinds.${entry.kind}`)}</span>
            </Badge>
            <span className="text-caption text-gray-700 font-medium">
              <bdi>{jurisdictionText}</bdi>
            </span>
            {entry.issuedOn && (
              <span className="text-caption text-gray-500 ms-auto flex items-center gap-1">
                <Calendar size={13} />
                <span>{entry.issuedOn}</span>
              </span>
            )}
          </div>

          <h1 className="mt-3 font-sans text-display font-semibold text-gray-900 leading-snug">
            <bdi>{titleText}</bdi>
          </h1>

          {/* Additional Specific Chips */}
          <div className="mt-3 flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100">
            {entry.level && (
              <span className="rounded-pill bg-gray-100 px-2.5 py-0.5 text-caption font-medium text-gray-700">
                درجة التقاضي: {entry.level}
              </span>
            )}
            {entry.judgmentNumber && (
              <span className="rounded-pill bg-gray-100 px-2.5 py-0.5 text-caption font-medium text-gray-700">
                رقم الحكم: {entry.judgmentNumber}
              </span>
            )}
            {entry.partyName && (
              <span className="rounded-pill bg-syn-gold/10 px-2.5 py-0.5 text-caption font-medium text-gray-800 flex items-center gap-1">
                <UserCheck size={12} className="text-syn-gold" />
                <span>الأطراف: {entry.partyName} ({entry.partyRole || 'طرف'})</span>
              </span>
            )}
            {entry.status && (
              <span className="rounded-pill bg-green-50 px-2.5 py-0.5 text-caption font-medium text-green-700 border border-green-200">
                الحالة: {entry.status}
              </span>
            )}
            {entry.category && (
              <span className="rounded-pill bg-gray-100 px-2.5 py-0.5 text-caption font-medium text-gray-600 flex items-center gap-1">
                <Tag size={12} />
                <span>{entry.category}</span>
              </span>
            )}
            <div className="ms-auto">
              <CopyReference reference={entry.reference} />
            </div>
          </div>
        </Card>

        {/* Structured Provisions & Legal Text */}
        <Card padding="lg" className="bg-white shadow-sm border-gray-200">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <h2 className="text-title font-semibold text-gray-900">
              {entry.kind === 'judgment' ? 'أقسام ومنطوق الحكم القضائي' : 'نصوص ومواد النظام'}
            </h2>
            <span className="text-caption font-mono text-gray-500">
              {sections.length} {sections.length === 1 ? 'قسم' : 'أقسام / مواد'}
            </span>
          </div>

          <div className="mt-5 flex flex-col gap-4">
            {sections.map((section, idx) => (
              <div key={idx} className="flex items-start gap-4 p-4 rounded-card border border-gray-200 bg-gray-50/50 hover:bg-white hover:shadow-sm transition-all">
                <span
                  className="mt-0.5 shrink-0 rounded-btn bg-legal-navy/10 px-3 py-1 font-sans text-caption font-semibold text-legal-navy border border-legal-navy/15"
                >
                  {section.number}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-body text-gray-800 leading-relaxed font-normal whitespace-pre-line">
                    {section.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Navigation between entries */}
        <nav aria-label={t('navLabel')} className="grid grid-cols-1 gap-3 tablet:grid-cols-2">
          {previous ? (
            <Link
              href={`/staff/legal-database/${previous.reference}`}
              className="flex items-center gap-3 rounded-card border border-gray-200 bg-white p-4 hover:bg-gray-50 transition-colors shadow-sm"
            >
              <ArrowLeft aria-hidden size={16} className="shrink-0 text-gray-500 rtl:rotate-180" />
              <span className="min-w-0">
                <span className="block text-caption text-gray-500">{t('previous')}</span>
                <span className="block truncate text-body font-medium text-gray-700">
                  <bdi>{typeof previous.title === 'object' ? previous.title[locale] || previous.title.ar || previous.title.en : previous.title || previous.reference}</bdi>
                </span>
              </span>
            </Link>
          ) : (
            <span />
          )}

          {next ? (
            <Link
              href={`/staff/legal-database/${next.reference}`}
              className="flex items-center justify-end gap-3 rounded-card border border-gray-200 bg-white p-4 text-end hover:bg-gray-50 transition-colors shadow-sm"
            >
              <span className="min-w-0">
                <span className="block text-caption text-gray-500">{t('next')}</span>
                <span className="block truncate text-body font-medium text-gray-700">
                  <bdi>{typeof next.title === 'object' ? next.title[locale] || next.title.ar || next.title.en : next.title || next.reference}</bdi>
                </span>
              </span>
              <ArrowRight aria-hidden size={16} className="shrink-0 text-gray-500 rtl:rotate-180" />
            </Link>
          ) : null}
        </nav>
      </main>
    </>
  );
}
