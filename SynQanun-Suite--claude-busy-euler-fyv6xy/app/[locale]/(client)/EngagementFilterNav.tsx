import { useTranslations } from 'next-intl';
import { Link } from '@/lib/i18n/navigation';
import { cn } from '@/lib/utils';

export interface EngagementFilterNavProps {
  /** Filter values, in display order. The first is treated as the default. */
  values: readonly string[];
  active: string;
  counts: Record<string, number>;
  /** Where the links point, e.g. `/matters`. */
  pathname: string;
  /** Translation namespace — 'matters' or 'projects'. */
  namespace: string;
}

/**
 * The status filter strip above an engagements list.
 *
 * REAL LINKS, CARRYING ?status=
 * ---------------------------------------------------------------------------
 * A status filter is a VIEW. "Show me what needs me" is worth being able to
 * link to, bookmark and reach with the back button, and it discloses nothing
 * about the client — so it belongs in the URL, and the filtering happens on the
 * server.
 *
 * The free-text search deliberately does NOT travel this way; see
 * EngagementTable.tsx for why.
 *
 * COUNTS COME FROM THE SAME PASS AS THE ROWS
 * ---------------------------------------------------------------------------
 * `counts` is computed in lib/mock-api.ts alongside the rows, not fetched
 * separately. Both Stitch exports show what happens otherwise: a chip reading
 * "6 active legal matters" sits directly beside tabs reading "All (6) … Closed
 * (1)", and the projects export does the same with five. Those cannot both be
 * true. One pass over the data makes the contradiction unrepresentable, and the
 * standalone chip is gone from both screens.
 */
export function EngagementFilterNav({
  values,
  active,
  counts,
  pathname,
  namespace,
}: EngagementFilterNavProps) {
  const t = useTranslations(namespace);
  const defaultValue = values[0];

  return (
    <nav aria-label={t('filterLabel')} className="flex flex-wrap items-center gap-2">
      {values.map((value) => {
        const isActive = value === active;

        return (
          <Link
            key={value}
            href={{
              pathname,
              query: value === defaultValue ? {} : { status: value },
            }}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'inline-flex h-8 items-center gap-1.5 rounded-pill border px-3 text-caption font-medium',
              'transition-colors max-tablet:min-h-11',
              isActive
                ? // gray-900 fill, not syn-red. design.md §4 keeps red for the
                  // one main action and the active nav module; a filter chip is
                  // neither, and spending red here would make it ordinary
                  // everywhere else.
                  'border-transparent bg-gray-900 text-white'
                : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-100 hover:text-gray-700'
            )}
          >
            {t(`filters.${value}`)}
            <span
              className={cn('font-mono text-reference', isActive ? 'text-gray-300' : 'text-gray-500')}
            >
              {counts[value]}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

export default EngagementFilterNav;
