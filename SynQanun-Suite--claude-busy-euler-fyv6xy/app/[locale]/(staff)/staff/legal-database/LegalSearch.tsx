'use client';

import * as React from 'react';
import { Search, X, BookOpen, Scale, FileText, Layers } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button, Select } from '@/components/ui';
import { Link, usePathname, useRouter } from '@/lib/i18n/navigation';
import { cn } from '@/lib/utils';

export function LegalSearch({
  kind = '',
  jurisdiction = '',
  q = '',
  kinds,
  jurisdictions,
  counts,
}: {
  kind?: string;
  jurisdiction?: string;
  q?: string;
  kinds: { value: string; label: string }[];
  jurisdictions: { value: string; label: string }[];
  counts?: { all: number; judgment: number; statute: number; regulation: number };
}) {
  const t = useTranslations('legalDatabase');
  const router = useRouter();
  const pathname = usePathname();

  const [draft, setDraft] = React.useState(q);

  React.useEffect(() => {
    setDraft(q);
  }, [q]);

  const go = (updates: { kind?: string; jurisdiction?: string; q?: string; page?: string }) => {
    const next = new URLSearchParams();
    const finalKind = updates.kind !== undefined ? updates.kind : kind;
    const finalJurisdiction = updates.jurisdiction !== undefined ? updates.jurisdiction : jurisdiction;
    const finalQ = updates.q !== undefined ? updates.q : q;

    if (finalKind && finalKind !== 'all') next.set('kind', finalKind);
    if (finalJurisdiction && finalJurisdiction !== 'all') next.set('jurisdiction', finalJurisdiction);
    if (finalQ) next.set('q', finalQ);
    if (updates.page) next.set('page', updates.page);

    const queryString = next.toString();
    router.push(queryString ? `${pathname}?${queryString}` : pathname);
  };

  const narrowed = Boolean(kind || jurisdiction || q);

  const categories = [
    { id: '', label: 'كافة المصادر', icon: Layers, count: counts?.all },
    { id: 'judgment', label: 'أحكام قضائية', icon: Scale, count: counts?.judgment },
    { id: 'statute', label: 'أنظمة ولوائح', icon: BookOpen, count: counts?.statute },
    { id: 'regulation', label: 'قرارات وتعاميم', icon: FileText, count: counts?.regulation },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* Category Pills */}
      <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 pb-3">
        {categories.map((cat) => {
          const Icon = cat.icon;
          const isActive = (kind || '') === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => go({ kind: cat.id, page: '1' })}
              className={cn(
                'inline-flex items-center gap-2 rounded-btn px-3 py-1.5 text-caption font-medium transition-all',
                isActive
                  ? 'bg-legal-navy text-white shadow-sm'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              )}
            >
              <Icon size={14} className={isActive ? 'text-syn-gold' : 'text-gray-500'} />
              <span>{cat.label}</span>
              {cat.count !== undefined ? (
                <span
                  className={cn(
                    'rounded-pill px-1.5 py-0.5 text-[10px] font-mono',
                    isActive ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-600'
                  )}
                >
                  {cat.count.toLocaleString()}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {/* Search Input Bar */}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          go({ q: draft.trim(), page: '1' });
        }}
        className="flex flex-wrap items-center gap-2"
      >
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">{t('search.label')}</span>
          <Search
            aria-hidden
            size={18}
            className="pointer-events-none absolute top-1/2 -translate-y-1/2 text-gray-400 [inset-inline-start:0.875rem]"
          />
          <input
            type="search"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="ابحث برقم القضية، نص الحكم، اسم النظام، أو المادة القانونية..."
            className={cn(
              'h-11 w-full rounded-btn border border-gray-300 bg-white ps-10 pe-3',
              'text-body text-gray-800 placeholder:text-gray-400',
              'focus:border-legal-navy focus:ring-1 focus:ring-legal-navy focus:outline-none transition-shadow'
            )}
          />
        </label>
        <Button type="submit" variant="primary" size="md" className="h-11 px-6">
          {t('search.submit')}
        </Button>
      </form>

      {/* Active Search Term Banner */}
      {q ? (
        <div
          role="status"
          className="flex items-center justify-between rounded-card border border-syn-gold/30 bg-syn-gold/5 p-3 text-caption text-gray-800"
        >
          <span className="flex items-center gap-2">
            <span>{t('search.resultTitle')}:</span>
            <bdi className="font-semibold text-legal-navy text-body">«{q}»</bdi>
          </span>
          <button
            type="button"
            onClick={() => {
              setDraft('');
              go({ q: '', page: '1' });
            }}
            className="inline-flex items-center gap-1 text-caption text-gray-500 hover:text-red-600 transition-colors"
          >
            <X aria-hidden size={14} />
            <span>{t('search.dismiss')}</span>
          </button>
        </div>
      ) : null}

      {/* Jurisdiction / Court Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-2">
          <span className="text-caption font-medium text-gray-600">{t('filters.jurisdiction')}:</span>
          <Select
            value={jurisdiction}
            onChange={(event) => go({ jurisdiction: event.target.value, page: '1' })}
            className="h-9 min-w-[200px] text-caption"
          >
            <option value="">{t('filters.allJurisdictions')}</option>
            {jurisdictions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </div>

        {narrowed ? (
          <Link
            href="/staff/legal-database"
            className="text-caption font-medium text-legal-navy hover:underline"
          >
            {t('filters.clear')}
          </Link>
        ) : null}
      </div>
    </div>
  );
}

export default LegalSearch;
