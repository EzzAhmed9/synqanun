import { ArrowLeft, ArrowRight } from 'lucide-react';
import { notFound } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { Badge, Card } from '@/components/ui';
import { formatCalendarDate } from '@/lib/format';
import { Link } from '@/lib/i18n/navigation';
import type { Locale } from '@/lib/i18n/routing';
import { backendBridge } from '@/lib/backend-bridge';
import { mockApi, type LegalEntryRecord } from '@/lib/mock-api';
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

  // Graceful fallback to mockApi if backend is temporarily unreachable
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

  const sections: { number: string; body: string }[] =
    entry.sections && Array.isArray(entry.sections) && entry.sections.length > 0
      ? entry.sections
      : bodyText
      ? [{ number: '1', body: bodyText }]
      : [];

  return (
    <>
      <StaffTopBar title={titleText} subtitle={t('subtitle')} />

      <main className="mx-auto flex w-full max-w-content flex-1 flex-col gap-5 px-6 py-6">
        <Link
          href="/staff/legal-database"
          className="inline-flex w-fit items-center gap-1.5 text-caption font-medium text-legal-navy hover:underline"
        >
          <ArrowLeft aria-hidden size={14} className="rtl:rotate-180" />
          {t('back')}
        </Link>

        <Card padding="lg">
          <div className="flex flex-wrap items-center gap-2">
            <span dir="ltr" className="font-mono text-reference font-semibold text-legal-navy">
              {entry.reference}
            </span>
            <Badge tone="neutral" icon={null}>
              {tDb(`kinds.${entry.kind}`)}
            </Badge>
            <span className="text-caption text-gray-600 font-medium">
              <bdi>{jurisdictionText}</bdi>
            </span>
            <span className="text-caption text-gray-500 [unicode-bidi:isolate]">
              {tDb('entry.issued')} {formatCalendarDate(entry.issuedOn, locale, { month: 'long' })}
            </span>
          </div>

          <h1 className="mt-2 font-sans text-title font-semibold text-gray-900">
            <bdi>{titleText}</bdi>
          </h1>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 pt-3">
            <p className="text-caption text-gray-500">
              {t('position', { position, total })}
            </p>
            <CopyReference reference={entry.reference} />
          </div>
        </Card>

        {/* The legal provisions */}
        <Card padding="lg">
          <h2 className="text-body font-medium text-gray-800">{t('sectionsCaption')}</h2>

          <div className="mt-4 flex flex-col gap-4">
            {sections.map((section, idx) => (
              <div key={idx} className="flex items-start gap-4">
                <span
                  dir="ltr"
                  className="mt-0.5 shrink-0 rounded-btn bg-syn-gold/10 px-2.5 py-1 font-mono text-reference font-semibold text-syn-gold"
                >
                  {section.number}
                </span>
                <div className="min-w-0 flex-1 rounded-card border border-gray-200 bg-white p-4 shadow-sm">
                  <p className="text-body text-gray-800 leading-relaxed font-normal">
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
              className="flex items-center gap-3 rounded-card border border-gray-200 bg-white p-4 hover:bg-gray-50 transition-colors"
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
              className="flex items-center justify-end gap-3 rounded-card border border-gray-200 bg-white p-4 text-end hover:bg-gray-50 transition-colors"
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
