import { ArrowRight, ArrowLeft, BookOpen, Scale, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { Badge, Card, buttonClasses } from '@/components/ui';
import { Link } from '@/lib/i18n/navigation';
import { formatCalendarDate } from '@/lib/format';
import type { Locale } from '@/lib/i18n/routing';
import { backendBridge } from '@/lib/backend-bridge';
import { mockApi } from '@/lib/mock-api';
import { StaffTopBar } from '../../StaffChrome';
import { LegalSearch } from './LegalSearch';

export const dynamic = 'force-dynamic';

export default async function LegalDatabasePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ kind?: string; jurisdiction?: string; q?: string; page?: string }>;
}) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  setRequestLocale(locale);

  const currentPage = parseInt(query.page || '1', 10) || 1;
  const limit = 15;

  let result: any = null;
  try {
    result = await backendBridge.legalDatabase.search({
      kind: query.kind,
      jurisdiction: query.jurisdiction,
      q: query.q,
      page: currentPage,
      limit,
    });
  } catch {
    result = null;
  }

  // Graceful fallback if backend is offline
  if (!result || !result.items) {
    result = await mockApi.staff.legalDatabase({
      kind: query.kind,
      jurisdiction: query.jurisdiction,
    });
  }

  return (
    <Library
      locale={locale as Locale}
      result={result}
      selected={{
        kind: query.kind ?? '',
        jurisdiction: query.jurisdiction ?? '',
        q: query.q ?? '',
        page: currentPage,
      }}
    />
  );
}

function Library({
  locale,
  result,
  selected,
}: {
  locale: Locale;
  result: any;
  selected: { kind?: string; jurisdiction?: string; q?: string; page: number };
}) {
  const t = useTranslations('legalDatabase');

  const currentPage = result.page || selected.page || 1;
  const totalPages = result.totalPages || Math.max(1, Math.ceil((result.total || 0) / 15));

  const buildPageUrl = (page: number) => {
    const params = new URLSearchParams();
    if (selected.kind) params.set('kind', selected.kind);
    if (selected.jurisdiction) params.set('jurisdiction', selected.jurisdiction);
    if (selected.q) params.set('q', selected.q);
    params.set('page', String(page));
    return `/staff/legal-database?${params.toString()}`;
  };

  const kindIcons: Record<string, any> = {
    judgment: Scale,
    statute: BookOpen,
    regulation: FileText,
  };

  return (
    <>
      <StaffTopBar
        title={t('title')}
        subtitle={locale === 'ar' ? 'المكتبة التشريعية ومحرك البحث في الأحكام والأنظمة القضائية' : 'Saudi Legal Knowledge Base & Judicial Search Engine'}
      />

      <main className="mx-auto flex w-full max-w-content flex-1 flex-col gap-5 px-6 py-6">
        <Card padding="lg" className="shadow-sm border-gray-200">
          <LegalSearch
            kind={selected.kind}
            jurisdiction={selected.jurisdiction}
            q={selected.q}
            counts={result.counts}
            kinds={(result.kinds || []).map((value: string) => ({
              value,
              label: t(`kinds.${value}`),
            }))}
            jurisdictions={(result.jurisdictions || []).map((row: any) => ({
              value: typeof row === 'string' ? row : row.value,
              label: typeof row === 'string' ? row : row.label[locale] || row.label.ar || row.label.en,
            }))}
          />
        </Card>

        {/* Results Metadata Bar */}
        <div className="flex items-center justify-between text-caption text-gray-600">
          <p>
            {locale === 'ar' ? (
              <>
                يُعرض <span className="font-semibold text-gray-900">{result.items.length}</span> نتيجة من أصل{' '}
                <span className="font-semibold text-gray-900 font-mono">{(result.total || 0).toLocaleString('ar-EG')}</span> سجلاً قانونياً
              </>
            ) : (
              <>
                Showing <span className="font-semibold text-gray-900">{result.items.length}</span> of{' '}
                <span className="font-semibold text-gray-900 font-mono">{(result.total || 0).toLocaleString()}</span> records
              </>
            )}
          </p>
          {totalPages > 1 && (
            <span className="text-gray-500 font-medium">
              {locale === 'ar' ? `صفحة ${currentPage} من ${totalPages}` : `Page ${currentPage} of ${totalPages}`}
            </span>
          )}
        </div>

        {/* Results List */}
        {result.items.length === 0 ? (
          <div className="rounded-card border border-dashed border-gray-300 bg-white p-12 text-center">
            <Scale aria-hidden size={40} className="mx-auto text-gray-400 mb-3" />
            <p className="text-title font-medium text-gray-800">{t('results.noneTitle')}</p>
            <p className="mt-1 text-caption text-gray-500 max-w-md mx-auto">{t('results.noneBody')}</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-4">
            {result.items.map((entry: any) => {
              const bodyText =
                typeof entry.body === 'object' && entry.body !== null
                  ? entry.body[locale] || entry.body.ar || entry.body.en
                  : entry.body || entry.content || '';

              const titleText =
                typeof entry.title === 'object' && entry.title !== null
                  ? entry.title[locale] || entry.title.ar || entry.title.en
                  : entry.title;

              const jurisdictionText =
                typeof entry.jurisdiction === 'object' && entry.jurisdiction !== null
                  ? entry.jurisdiction[locale] || entry.jurisdiction.ar || entry.jurisdiction.en
                  : entry.jurisdiction;

              const KindIcon = kindIcons[entry.kind] || FileText;

              return (
                <li key={entry.reference}>
                  <Card padding="lg" className="hover:border-gray-300 hover:shadow-sm transition-all bg-white">
                    <div className="flex flex-wrap items-center gap-2">
                      <span dir="ltr" className="font-mono text-reference font-semibold text-legal-navy bg-legal-navy/5 px-2 py-0.5 rounded-pill border border-legal-navy/10">
                        {entry.reference}
                      </span>
                      <Badge tone={entry.kind === 'judgment' ? 'info' : 'neutral'} icon={null} className="inline-flex items-center gap-1">
                        <KindIcon size={12} />
                        <span>{t(`kinds.${entry.kind}`)}</span>
                      </Badge>
                      <span className="text-caption text-gray-600 font-medium">
                        <bdi>{jurisdictionText}</bdi>
                      </span>
                      {entry.issuedOn && (
                        <span className="text-caption text-gray-500 [unicode-bidi:isolate] ms-auto">
                          {t('entry.issued')} {entry.issuedOn}
                        </span>
                      )}
                    </div>

                    <h2 className="mt-3 font-sans text-title font-semibold text-gray-900 leading-snug">
                      <Link
                        href={`/staff/legal-database/${entry.reference}`}
                        className="hover:text-legal-navy hover:underline transition-colors"
                      >
                        <bdi>{titleText}</bdi>
                      </Link>
                    </h2>

                    <div className="mt-3 rounded-card border border-gray-100 bg-gray-50/60 p-4">
                      <p className="text-body text-gray-700 leading-relaxed line-clamp-3">
                        {bodyText}
                      </p>
                    </div>

                    <div className="mt-4 flex items-center justify-between pt-2 border-t border-gray-100">
                      <div className="flex items-center gap-2">
                        {entry.status && (
                          <span className="rounded-pill bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">
                            {entry.status}
                          </span>
                        )}
                        {entry.category && (
                          <span className="rounded-pill bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">
                            {entry.category}
                          </span>
                        )}
                      </div>

                      <Link
                        href={`/staff/legal-database/${entry.reference}`}
                        className="inline-flex items-center gap-1.5 text-caption font-semibold text-legal-navy hover:text-syn-gold transition-colors"
                      >
                        <span>{t('entry.read')}</span>
                        <ArrowRight aria-hidden size={14} className="rtl:rotate-180" />
                      </Link>
                    </div>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <nav aria-label="Pagination" className="mt-6 flex items-center justify-center gap-2">
            {currentPage > 1 ? (
              <Link
                href={buildPageUrl(currentPage - 1)}
                className={buttonClasses({ variant: 'secondary', size: 'sm', className: 'gap-1' })}
              >
                <ChevronRight aria-hidden size={16} className="rtl:rotate-180" />
                <span>{locale === 'ar' ? 'السابق' : 'Previous'}</span>
              </Link>
            ) : null}

            <span className="px-3 py-1.5 text-caption font-mono font-medium text-gray-700 bg-white rounded-btn border border-gray-200">
              {currentPage} / {totalPages}
            </span>

            {currentPage < totalPages ? (
              <Link
                href={buildPageUrl(currentPage + 1)}
                className={buttonClasses({ variant: 'secondary', size: 'sm', className: 'gap-1' })}
              >
                <span>{locale === 'ar' ? 'التالي' : 'Next'}</span>
                <ChevronLeft aria-hidden size={16} className="rtl:rotate-180" />
              </Link>
            ) : null}
          </nav>
        )}
      </main>
    </>
  );
}
