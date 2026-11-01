'use client';

import * as React from 'react';
import Image from 'next/image';
import { PoweredBy } from '@/components/brand/PoweredBy';
import {
  LOCKUP_VIEWBOX,
  MARK_CENTRE,
  MARK_OFFSET_FRACTION,
  TENANT_MARK_PATH,
  WORDMARK_FRACTION,
} from '@/components/brand/tenant-mark-geometry';
import { SPLASH_SEEN_KEY } from './splash-session';

/**
 * The themed tenant's splash: the mark builds in, the lockup settles, and the
 * overlay lifts off the portal chooser. design.md §10.2, "Splash and loading".
 *
 * WHAT IT IS ADAPTED FROM
 * ---------------------------------------------------------------------------
 * The reference the client supplied is a dashboard concept reel, not a logo
 * animation, so this borrows its MOTION and puts the tenant's own mark in it:
 * a gold core resolves on a dark field, hairlines burst outward with nodes at
 * their tips, the composition eases back and settles, and a title is
 * uncovered beside the subject. What the reel does that this does not (glow,
 * particle haze, vignette, depth of field) is excluded by §10.2.
 *
 * HIERARCHY
 * ---------------------------------------------------------------------------
 * The tenant's lockup is the only mark. SynQanun appears as the "Powered by
 * SynQanun" credit beneath it and nowhere else.
 *
 * THE LOCKUP IS THE REAL FILE
 * ---------------------------------------------------------------------------
 * The mark that draws in is the tenant's own path, in the lockup's coordinate
 * space, laid exactly over the lockup image. At 1.25s the image fades in
 * under it and a curtain the colour of the background slides off the
 * wordmark. Nothing is redrawn. The artwork is `dir="ltr"` and every motion
 * is physical: the lockup never mirrors, so neither does its animation.
 *
 * TIMING lives in app/globals.css. This component only:
 *   · skips — any click or key starts the exit at once;
 *   · remembers — sessionStorage, in try/catch, so it plays once a session;
 *   · unmounts — when the exit finishes, and marks <html> so a later
 *     client-side return to the chooser hides it before paint.
 *
 * It is decorative and `aria-hidden`: the chooser beneath carries the same
 * lockup and all the content, and is what a screen reader reads.
 */

// Survives client-side navigation even when sessionStorage is unavailable.
let playedThisDocument = false;

function alreadySeen(): boolean {
  try {
    return window.sessionStorage.getItem(SPLASH_SEEN_KEY) !== null;
  } catch {
    return false;
  }
}

function remember() {
  try {
    window.sessionStorage.setItem(SPLASH_SEEN_KEY, '1');
  } catch {
    // Storage blocked: the in-memory flag still prevents replays in this tab.
  }
}

/** Ray angles in degrees and lengths in lockup units, from the mark's centre. */
const RAYS: [angle: number, length: number][] = [
  [-90, 46],
  [-62, 60],
  [-32, 40],
  [-6, 64],
  [22, 44],
  [50, 58],
  [84, 42],
  [116, 62],
  [146, 40],
  [176, 66],
  [206, 46],
  [236, 56],
];

export function TenantSplash({ lockupSrc }: { lockupSrc: string }) {
  const [state, setState] = React.useState<'playing' | 'leaving' | 'done'>('playing');

  React.useEffect(() => {
    const skip =
      playedThisDocument ||
      document.documentElement.hasAttribute('data-splash-skip') ||
      alreadySeen() ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (skip) {
      setState('done');
      return;
    }

    playedThisDocument = true;
    remember();

    const leave = () => setState((s) => (s === 'playing' ? 'leaving' : s));
    window.addEventListener('pointerdown', leave);
    window.addEventListener('keydown', leave);

    // Backstop for a slow hydration that missed the exit's animationend.
    const backstop = window.setTimeout(() => setState('done'), 3200);

    return () => {
      window.removeEventListener('pointerdown', leave);
      window.removeEventListener('keydown', leave);
      window.clearTimeout(backstop);
    };
  }, []);

  React.useEffect(() => {
    if (state === 'done') document.documentElement.setAttribute('data-splash-skip', '');
  }, [state]);

  if (state === 'done') return null;

  return (
    <div
      aria-hidden
      data-leaving={state === 'leaving' ? '' : undefined}
      onAnimationEnd={(event) => {
        if (event.target === event.currentTarget) setState('done');
      }}
      className="syn-splash fixed inset-0 z-50 flex cursor-pointer flex-col items-center justify-center overflow-hidden bg-ink"
    >
      <div
        dir="ltr"
        className="syn-splash-stage relative aspect-[256/54] w-[min(80vw,30rem)]"
        style={{ '--syn-mark-offset': MARK_OFFSET_FRACTION } as React.CSSProperties}
      >
        {/* The real lockup, and the curtain that uncovers its wordmark. */}
        <div className="absolute inset-0 overflow-hidden">
          <Image
            src={lockupSrc}
            alt=""
            fill
            priority
            unoptimized
            className="syn-splash-lockup object-contain"
          />
          <span
            className="syn-splash-curtain absolute inset-y-0 left-0 bg-ink"
            style={{ width: `${WORDMARK_FRACTION * 100}%` }}
          />
        </div>

        {/* The mark, drawing in, laid exactly over the image's own mark. */}
        <svg viewBox={LOCKUP_VIEWBOX} className="absolute inset-0 h-full w-full overflow-visible">
          <path className="syn-splash-fill" d={TENANT_MARK_PATH} style={{ fill: 'var(--syn-ornament)' }} />
          <path
            className="syn-splash-outline"
            d={TENANT_MARK_PATH}
            pathLength={1}
            fill="none"
            // SVG units, not non-scaling-stroke: a non-scaling stroke measures
            // its dashes in screen pixels, which breaks the pathLength draw-on.
            strokeWidth={0.7}
            strokeLinejoin="round"
            style={{ stroke: 'var(--syn-ornament)' }}
          />
        </svg>

        {/* The burst: a core, hairline rays and their tip nodes. Flat gold. */}
        <svg
          viewBox={LOCKUP_VIEWBOX}
          className="absolute inset-0 h-full w-full overflow-visible"
          style={{ fill: 'var(--syn-ornament)', stroke: 'var(--syn-ornament)' }}
        >
          {RAYS.map(([angle, length], i) => {
            const rad = (angle * Math.PI) / 180;
            const x1 = MARK_CENTRE.x + Math.cos(rad) * 8;
            const y1 = MARK_CENTRE.y + Math.sin(rad) * 8;
            const x2 = MARK_CENTRE.x + Math.cos(rad) * length;
            const y2 = MARK_CENTRE.y + Math.sin(rad) * length;
            return (
              <g key={angle}>
                <line
                  className="syn-splash-ray"
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  pathLength={1}
                  strokeWidth={0.55}
                  opacity={0.75}
                  style={{ '--syn-delay': `${0.2 + i * 0.025}s` } as React.CSSProperties}
                />
                <circle
                  className="syn-splash-node"
                  cx={x2}
                  cy={y2}
                  r={1.6}
                  stroke="none"
                  style={{ '--syn-delay': `${0.55 + i * 0.02}s` } as React.CSSProperties}
                />
              </g>
            );
          })}
          <circle className="syn-splash-core" cx={MARK_CENTRE.x} cy={MARK_CENTRE.y} r={4} stroke="none" />
        </svg>
      </div>

      {/* The credit — permanent in every tenant, brand-guidelines §7.2. White
          at 80% on `ink` is 6.74:1. */}
      <PoweredBy className="syn-splash-credit absolute bottom-8 text-white/80" />
    </div>
  );
}

export default TenantSplash;
