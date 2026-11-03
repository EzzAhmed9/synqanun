'use client';

import * as React from 'react';
import { Search, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button, Select } from '@/components/ui';
import { Link, usePathname, useRouter } from '@/lib/i18n/navigation';
import { cn } from '@/lib/utils';

export function LegalSearch({
  kind,
  jurisdiction,
  q = '',
  kinds,
  jurisdictions,
}: {
  kind: string;
  jurisdiction: string;
  q?: string;
  kinds: { value: string; label: string }[];
  jurisdictions: { value: string; label: string }[];
}) {
  const t = useTranslations('legalDatabase');
  const router = useRouter();
  const pathname = usePathname();

  const [draft, setDraft] = React.useState(q);

  React.useEffect(() => {
    setDraft(q);
  }, [q]);

  const go = (key: 'kind' | 'jurisdiction' | 'q', value: string) => {
    const next = new URLSearchParams();
    const currentKind = key === 'kind' ? value : kind;
    const currentJurisdiction = key === 'jurisdiction' ? value : jurisdiction;
    const currentQ = key === 'q' ? value : q;

    if (currentKind) next.set('kind', currentKind);
    if (currentJurisdiction) next.set('jurisdiction', currentJurisdiction);
    if (currentQ) next.set('q', currentQ);

    const queryString = next.toString();
    router.push(queryString ? `${pathname}?${queryString}` : pathname);
  };

  const narrowed = Boolean(kind || jurisdiction || q);

  return (
    <div className="flex flex-col gap-4">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          go('q', draft.trim());
        }}
        className="flex flex-wrap items-end gap-2"
      >
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">{t('search.label')}</span>
          <Search
            aria-hidden
            size={16}
            className="pointer-events-none absolute top-1/2 -translate-y-1/2 text-gray-500 [inset-inline-start:0.75rem]"
          />
          <input
            type="search"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={t('search.placeholder')}
            className={cn(
              'h-10 w-full rounded-btn border border-gray-200 bg-gray-50 ps-9 pe-3',
              'text-body text-gray-700 placeholder:text-gray-500',
              'focus:border-gray-400 focus:bg-white focus:outline-none'
            )}
          />
        </label>
        <Button type="submit" variant="secondary" size="md">
          {t('search.submit')}
        </Button>
      </form>

      {q ? (
        <div
          role="status"
          className="flex items-center justify-between rounded-card border border-syn-gold/20 bg-syn-gold/5 p-3 text-caption text-gray-700"
        >
          <span>
            {t('search.resultTitle')}: <bdi className="font-semibold">«{q}»</bdi>
          </span>
          <button
            type="button"
            onClick={() => {
              setDraft('');
              go('q', '');
            }}
            className="inline-flex items-center gap-1 text-caption text-gray-500 hover:text-red-600"
          >
            <X aria-hidden size={14} />
            <span>{t('search.dismiss')}</span>
          </button>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-3 tablet:grid-cols-2">
        {(
          [
            ['kind', kinds, t('filters.allKinds'), t('filters.kind')],
            [
              'jurisdiction',
              jurisdictions,
              t('filters.allJurisdictions'),
              t('filters.jurisdiction'),
            ],
          ] as const
        ).map(([key, options, allLabel, label]) => (
          <label key={key} className="flex flex-col gap-1">
            <span className="text-caption text-gray-500">{label}</span>
            <Select
              value={key === 'kind' ? kind : jurisdiction}
              onChange={(event) => go(key, event.target.value)}
            >
              <option value="">{allLabel}</option>
              {options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </label>
        ))}
      </div>

      {narrowed ? (
        <Link
          href="/staff/legal-database"
          className="w-fit text-caption text-legal-navy hover:underline"
        >
          {t('filters.clear')}
        </Link>
      ) : null}
    </div>
  );
}

export default LegalSearch;
