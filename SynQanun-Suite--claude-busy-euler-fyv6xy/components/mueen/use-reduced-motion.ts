'use client';

import * as React from 'react';

/**
 * `prefers-reduced-motion`, as state rather than a ref.
 *
 * State, because on the assistant's surfaces this decides whether a <video> is
 * MOUNTED and not merely whether it animates — the resting loop is never
 * fetched when motion is reduced, rather than fetched and paused.
 *
 * Its own module now that the stage and the avatar header both read it. The
 * repo has three older ad-hoc readings of the same query (VoiceDigest.tsx,
 * TenantSplash.tsx, splash-session.ts) that should move here; they are left
 * alone because each is a change to a screen this is not about.
 */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = React.useState(false);

  React.useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduced(query.matches);
    sync();
    query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, []);

  return reduced;
}
