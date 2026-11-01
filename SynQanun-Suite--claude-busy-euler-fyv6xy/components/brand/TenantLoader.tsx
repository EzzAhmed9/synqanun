'use client';

import { useTranslations } from 'next-intl';
import { isThemedTenant } from '@/fixtures/firm';
import { MARK_VIEWBOX, TENANT_MARK_PATH } from './tenant-mark-geometry';

/**
 * Route loading state for a themed tenant: the splash's mark, looping —
 * the outline draws, the mark fills, holds, and fades. design.md §10.2,
 * "Splash and loading". Mounted by the gateway, staff and client loading.tsx.
 *
 * ACCENT MODE RENDERS NOTHING. loading.tsx cannot be switched off per tenant
 * (its presence is what creates the boundary), so an unthemed tenant gets an
 * empty boundary rather than a new indicator: no tenant mark, and no
 * SynQanun one either, since the feather's pulse means "the AI is working"
 * (brand-guidelines §5), not "the page is loading".
 *
 * CONTRAST. Gold on cream is 2.76:1, under the 3:1 a meaningful graphic
 * needs, so the mark is decoration here and the state is carried by the
 * visible "Loading…" label in gray-600 (6.85:1), announced via role=status.
 *
 * Reduced motion: globals.css stops both animations and the finished mark
 * shows, still.
 */
export function TenantLoader() {
  const t = useTranslations('common');

  if (!isThemedTenant()) return null;

  return (
    <div role="status" className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-16">
      <svg aria-hidden viewBox={MARK_VIEWBOX} className="h-12 w-auto overflow-visible">
        <path className="syn-loader-fill" d={TENANT_MARK_PATH} style={{ fill: 'var(--syn-ornament)' }} />
        <path
          className="syn-loader-outline"
          d={TENANT_MARK_PATH}
          pathLength={1}
          fill="none"
          strokeWidth={1.5}
          strokeLinejoin="round"
          style={{ stroke: 'var(--syn-ornament)' }}
        />
      </svg>
      <span className="text-caption text-gray-600">{t('loading')}</span>
    </div>
  );
}

export default TenantLoader;
