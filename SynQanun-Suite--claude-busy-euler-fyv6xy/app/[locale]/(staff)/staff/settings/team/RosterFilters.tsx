'use client';

import { useTranslations } from 'next-intl';
import { Select } from '@/components/ui';
import { Link, usePathname, useRouter } from '@/lib/i18n/navigation';

/**
 * Status and rank, over the roster.
 *
 * Views of a list, so both go in the URL — the same split every register in
 * this product uses, and unlike the Legal Database's query there is nothing
 * private about which rank somebody is looking at.
 *
 * Both option lists are derived from the roster (`roster()` builds them from
 * the rows it returned), so no option can select nothing. The export offers a
 * "Pending Invites (3)" segment over a firm with no invite flow at all.
 */
export function RosterFilters({
  status,
  rank,
  statuses,
  ranks,
}: {
  status: string;
  rank: string;
  statuses: { value: string; label: string; count: number }[];
  ranks: { value: string; label: string }[];
}) {
  const t = useTranslations('staffSettings.team.filters');
  const router = useRouter();
  const pathname = usePathname();

  const go = (key: 'status' | 'rank', value: string) => {
    const next = new URLSearchParams({
      ...(status ? { status } : {}),
      ...(rank ? { rank } : {}),
    });
    if (value) next.set(key, value);
    else next.delete(key);
    const query = next.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  };

  const narrowed = Boolean(status || rank);

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-3 tablet:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="text-caption text-gray-500">{t('status')}</span>
          <Select value={status} onChange={(event) => go('status', event.target.value)}>
            <option value="">{t('allStatuses')}</option>
            {statuses.map((option) => (
              <option key={option.value} value={option.value}>
                {`${option.label} (${option.count})`}
              </option>
            ))}
          </Select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-caption text-gray-500">{t('rank')}</span>
          <Select value={rank} onChange={(event) => go('rank', event.target.value)}>
            <option value="">{t('allRanks')}</option>
            {ranks.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </label>
      </div>

      {narrowed ? (
        <Link
          href="/staff/settings/team"
          className="w-fit text-caption text-legal-navy hover:underline"
        >
          {t('clear')}
        </Link>
      ) : null}
    </div>
  );
}

export default RosterFilters;
