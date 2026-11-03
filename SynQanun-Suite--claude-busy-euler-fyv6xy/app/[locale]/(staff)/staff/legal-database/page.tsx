import { ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { Badge, Card } from '@/components/ui';
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
  searchParams: Promise<{ kind?: string; jurisdiction?: string; q?: string }>;
}) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  setRequestLocale(locale);

  let result: any = null;
  try {
    result = await backendBridge.legalDatabase.search({
      kind: query.kind,
      jurisdiction: query.jurisdiction,
      q: query.q,
    });
  } catch {
    result = null;
  }

  // Graceful fallback to mockApi if backend is temporarily unreachable
  if (!result || !result.items) {
    result = await mockApi.staff.legalDatabase({
      kind: query.kind,
      jurisdiction: query.jurisdiction,
    });
  }

  return (
    <Library locale={locale as Locale} result={result} selected={query} />
  );
}

function Library({
  locale,
  result,
  selected,
}: {
  locale: Locale;
  result: any;
  selected: { kind?: string; jurisdiction?: string; q?: string };
}) {
  const t = useTranslations('legalDatabase');

  return (
    <>
      <StaffTopBar title={t('title')} subtitle={t('subtitle')} />

      <main className="mx-auto flex w-full max-w-content flex-1 flex-col gap-5 px-6 py-6">
        <Card padding="lg">
          <LegalSearch
            kind={selected.kind ?? ''}
            jurisdiction={selected.jurisdiction ?? ''}
            q={selected.q ?? ''}
            kinds={(result.kinds || []).map((value: string) => ({
              value,
              label: t(`kinds.${value}`),
            }))}
            jurisdictions={(result.jurisdictions || []).map((row: any) => ({
              value: typeof row === 'string' ? row : row.value,
              label: typeof row === 'string' ? row : row.label[locale] || row.label.en,
            }))}
          />
        </Card>

        <p className="text-caption text-gray-500">
          {t('results.count', { shown: result.items.length, total: result.total })}
        </p>

        {result.items.length === 0 ? (
          <div className="rounded-card border border-dashed border-gray-200 bg-white p-10 text-center">
            <p className="text-body font-medium text-gray-700">{t('results.noneTitle')}</p>
            <p className="mt-1 text-caption text-gray-500">{t('results.noneBody')}</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-4">
            {result.items.map((entry: any) => {
              const bodyText =
                typeof entry.body === 'object' && entry.body !== null
                  ? entry.body[locale] || entry.body.ar || entry.body.en
                  : typeof entry.content === 'object' && entry.content !== null
                  ? entry.content[locale] || entry.content.ar || entry.content.en
                  : entry.body || entry.content || '';

              const titleText =
                typeof entry.title === 'object' && entry.title !== null
                  ? entry.title[locale] || entry.title.ar || entry.title.en
                  : entry.title;

              const jurisdictionText =
                typeof entry.jurisdiction === 'object' && entry.jurisdiction !== null
                  ? entry.jurisdiction[locale] || entry.jurisdiction.ar || entry.jurisdiction.en
                  : entry.jurisdiction;

              return (
                <li key={entry.reference}>
                  <Card padding="lg">
                    <div className="flex flex-wrap items-center gap-2">
                      <span dir="ltr" className="font-mono text-reference font-semibold text-legal-navy">
                        {entry.reference}
                      </span>
                      <Badge tone="neutral" icon={null}>
                        {t(`kinds.${entry.kind}`)}
                      </Badge>
                      <span className="text-caption text-gray-600 font-medium">
                        <bdi>{jurisdictionText}</bdi>
                      </span>
                      <span className="text-caption text-gray-500 [unicode-bidi:isolate]">
                        {t('entry.issued')}{' '}
                        {formatCalendarDate(entry.issuedOn, locale, { month: 'long' })}
                      </span>
                    </div>

                    <h2 className="mt-2 font-sans text-title font-semibold text-gray-900">
                      <bdi>{titleText}</bdi>
                    </h2>

                    <div className="mt-3 rounded-card border border-gray-200 bg-gray-50/70 p-4">
                      <p className="text-body text-gray-800 leading-relaxed font-normal">
                        {bodyText}
                      </p>
                    </div>

                    <div className="mt-4 flex items-center justify-between">
                      <Link
                        href={`/staff/legal-database/${entry.reference}`}
                        className="inline-flex w-fit items-center gap-1.5 text-caption font-medium text-legal-navy hover:underline"
                      >
                        {t('entry.read')}
                        <ArrowRight aria-hidden size={14} className="rtl:rotate-180" />
                      </Link>
                    </div>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </>
  );
}
