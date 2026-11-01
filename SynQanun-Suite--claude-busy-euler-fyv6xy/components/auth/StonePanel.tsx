import { TENANT_MARK_PATH as MARK_PATH } from '@/components/brand/tenant-mark-geometry';
import { cn } from '@/lib/utils';

/**
 * The stone panel on a themed tenant's sign-in screens — design.md §10.2,
 * "Split sign-in".
 *
 * DECORATION, AND NOTHING BUT
 * ---------------------------------------------------------------------------
 * It carries no text and no state, so it is `aria-hidden` and is dropped
 * entirely below tablet width, where a quarter of the screen is better spent
 * on the form. The tenant's NAME is carried by the lockup on the form side;
 * the mark carved in here is a repeat of it, not the identification.
 *
 * Every colour comes from the theme: the stone is `ink` darkened, and the
 * veins, the carved mark's rim and the edge rule are `ornament`. Ornament is
 * not a text colour (§10.2) and nothing here is text. Gold on the stone
 * measures above 3:1, though it does not have to: nothing here conveys
 * meaning.
 *
 * NO GRADIENT, NO GLOW
 * ---------------------------------------------------------------------------
 * §10.2 forbids both on a themed surface. The stone's depth is fractal noise,
 * not a gradient. The mark is carved INTO the stone: its shading is an inner
 * shadow and highlight clipped to the mark's own outline, so nothing spills
 * past the edge as a drop shadow or a halo (brand-guidelines §2.3).
 *
 * THE TEXTURE SLOT
 * ---------------------------------------------------------------------------
 * `textureSrc` is where the firm's supplied texture goes when it exists,
 * configured as `theme.authPanel.texture` in fixtures/firm.ts. With it set, the
 * image replaces the generated stone; the carved mark and the edge rule stay on
 * top. Null renders the CSS/SVG stone.
 *
 * DIRECTION
 * ---------------------------------------------------------------------------
 * The panel sits at the inline END of the screen (the caller's flex order puts
 * it there), so it is on the right in English and the left in Arabic. The edge
 * rule is `border-s`, which follows. The SVG content does not mirror, and must
 * not: brand-guidelines §2.5, logos never flip.
 *
 * The mark's outline is the tenant's own vector, from
 * components/brand/tenant-mark-geometry.ts, inline because an <img> cannot be
 * clipped against.
 */

/** Veins, drawn in a 400×1000 box and cropped to the panel. Thick first. */
const VEINS: { d: string; width: number; opacity: number }[] = [
  { d: 'M -20 120 C 60 160 110 150 170 220 S 260 300 330 290 S 420 330 440 360', width: 1.6, opacity: 0.85 },
  { d: 'M 170 220 C 150 280 175 330 140 400 S 90 470 120 540', width: 0.8, opacity: 0.6 },
  { d: 'M 420 520 C 360 560 330 610 260 640 S 150 700 100 760 S 20 830 -20 850', width: 1.4, opacity: 0.8 },
  { d: 'M 260 640 C 280 700 250 740 270 800 S 320 880 300 960', width: 0.7, opacity: 0.55 },
  { d: 'M -20 610 C 30 600 60 630 100 620 S 160 590 190 600', width: 0.6, opacity: 0.5 },
  { d: 'M 330 290 C 340 250 370 230 420 220', width: 0.6, opacity: 0.5 },
  { d: 'M 60 980 C 120 940 150 900 210 900 S 300 860 420 880', width: 1.0, opacity: 0.7 },
];

export function StonePanel({
  textureSrc,
  className,
}: {
  /** A supplied texture image under /public, or null for the generated stone. */
  textureSrc: string | null;
  className?: string;
}) {
  return (
    <aside
      aria-hidden
      className={cn(
        'relative hidden w-1/4 shrink-0 border-s-4 border-ornament bg-ink tablet:block',
        className
      )}
    >
      {/* Sticky, so the carved mark stays in view when the form is taller
          than the screen and the page scrolls. */}
      <div className="sticky top-0 h-screen overflow-hidden">
        {textureSrc ? (
          // THE SUPPLIED-TEXTURE SLOT. A CSS background rather than next/image:
          // it is decoration with no alt text to carry, and `cover` crops it to
          // whatever shape the panel is.
          <div
            data-slot="auth-panel-texture"
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${textureSrc})` }}
          />
        ) : (
          <GeneratedStone />
        )}

        <div className="absolute inset-0 flex items-center justify-center px-[14%]">
          <CarvedMark />
        </div>
      </div>
    </aside>
  );
}

/** The built-in stone: darkened `ink`, two noise layers, and `ornament` veins. */
function GeneratedStone() {
  return (
    <svg
      data-slot="auth-panel-generated"
      className="absolute inset-0 h-full w-full"
      viewBox="0 0 400 1000"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        {/* Broad, uneven clouding, stretched vertically like a cut slab. */}
        <filter id="syn-stone-cloud" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.006 0.016" numOctaves="5" seed="7" />
          <feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  1.1 0 0 0 -0.45" />
        </filter>
        {/* Fine grain, so the slab does not read as a flat fill up close. */}
        <filter id="syn-stone-grain" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3" />
          <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  1.4 0 0 0 -0.55" />
        </filter>
        {/* Wobble, so the veins wander rather than following clean curves. */}
        <filter id="syn-stone-vein" x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="11" result="wobble" />
          <feDisplacementMap in="SourceGraphic" in2="wobble" scale="9" />
        </filter>
      </defs>

      {/* `ink` is the panel's background; this darkens it to stone. */}
      <rect width="400" height="1000" opacity="0.4" style={{ fill: 'var(--color-gray-900)' }} />
      <rect width="400" height="1000" filter="url(#syn-stone-cloud)" opacity="0.2" />
      <rect width="400" height="1000" filter="url(#syn-stone-grain)" opacity="0.35" />

      <g filter="url(#syn-stone-vein)" fill="none" strokeLinecap="round" style={{ stroke: 'var(--syn-ornament)' }}>
        {VEINS.map((vein) => (
          <path key={vein.d} d={vein.d} strokeWidth={vein.width} opacity={vein.opacity} />
        ))}
      </g>
    </svg>
  );
}

/**
 * The tenant mark, carved into the stone.
 *
 * Inner shadow along the top and leading edges, inner highlight along the
 * bottom and trailing ones, both clipped to the outline — the light comes from
 * above, so the mark reads as recessed. A hairline `ornament` rim catches the
 * cut edge. Physical offsets, not logical: this is lighting on artwork that
 * never mirrors.
 */
function CarvedMark() {
  return (
    <svg
      className="h-auto w-full max-w-[14rem]"
      viewBox="266.37 172.29 62.2 55.24"
    >
      <defs>
        <clipPath id="syn-stone-mark-clip">
          <path d={MARK_PATH} />
        </clipPath>
      </defs>

      <g clipPath="url(#syn-stone-mark-clip)">
        {/* The floor of the cut, a shade below the surface around it. */}
        <rect x="266" y="172" width="64" height="56" opacity="0.18" style={{ fill: 'var(--color-gray-900)' }} />
        <path
          d={MARK_PATH}
          transform="translate(0.6 0.7)"
          fill="none"
          style={{ stroke: 'var(--color-gray-900)' }}
          strokeWidth="1.6"
          opacity="0.55"
        />
        <path
          d={MARK_PATH}
          transform="translate(-0.5 -0.6)"
          fill="none"
          style={{ stroke: 'var(--color-white)' }}
          strokeWidth="1"
          opacity="0.12"
        />
      </g>

      <path d={MARK_PATH} fill="none" strokeWidth="0.45" style={{ stroke: 'var(--syn-ornament)' }} />
    </svg>
  );
}

export default StonePanel;
