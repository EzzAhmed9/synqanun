'use client';

import { useTranslations } from 'next-intl';
import { Select } from '@/components/ui';
import { Link, usePathname, useRouter } from '@/lib/i18n/navigation';

/**
 * The two dropdowns over the activity log: who, and what kind of action.
 *
 * Both are VIEWS of a list — who is on screen carries nothing private about
 * the reader's own thinking, unlike the Legal Database's research query — so
 * both go in the URL, where a view belongs and the back button works.
 *
 * Every option is derived from the events themselves (`activityLog` builds the
 * facet lists from the rows it returned), so no option can select nothing. The
 * export's filter offers "All Personnel (31)" over a firm whose own stat card
 * on the same screen says 28, above a table of 7 — three numbers, none of them
 * checkable, none of them agreeing.
 */
export function ActivityFilters({
  actor,
  action,
  actors,
  actions,
}: {
  actor: string;
  action: string;
  actors: { value: string; label: string }[];
  actions: { value: string; label: string }[];
}) {
  const t = useTranslations('staffSettings.activity.filters');
  const router = useRouter();
  const pathname = usePathname();

  const go = (key: 'actor' | 'action', value: string) => {
    const next = new URLSearchParams({
      ...(actor ? { actor } : {}),
      ...(action ? { action } : {}),
    });
    if (value) next.set(key, value);
    else next.delete(key);
    const query = next.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  };

  const narrowed = Boolean(actor || action);

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-3 tablet:grid-cols-2">
        {(
          [
            ['actor', actors, t('allActors'), t('actor')],
            ['action', actions, t('allActions'), t('action')],
          ] as const
        ).map(([key, options, allLabel, label]) => (
          <label key={key} className="flex flex-col gap-1">
            <span className="text-caption text-gray-500">{label}</span>
            <Select
              value={key === 'actor' ? actor : action}
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
          href="/staff/settings/activity"
          className="w-fit text-caption text-legal-navy hover:underline"
        >
          {t('clear')}
        </Link>
      ) : null}
    </div>
  );
}

export default ActivityFilters;
