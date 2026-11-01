import Image from 'next/image';
import { cn } from '@/lib/utils';
import { FEATHER } from './assets';

export interface FeatherMarkProps {
  /**
   * Height of the MARK ITSELF in px — not of the source file's 48×48 canvas.
   * Clamped to 16–34px: 16 is the brand minimum (§2.3), 34 is all the artwork
   * the delivered raster contains (see components/brand/assets.ts).
   */
  height?: number;
  /**
   * Apply the "agent is thinking" pulse.
   *
   * brand-guidelines.md §5 and design.md §7: a slow pulse under ~1.5s that
   * reads as "alive", not "loading spinner cosplay". Use this instead of a
   * generic spinner wherever the user is waiting on AI output, so the brand is
   * present during the wait. Respects prefers-reduced-motion.
   */
  thinking?: boolean;
  /**
   * Quiet variant for empty states — brand-guidelines.md §5: "a single
   * muted-outline feather, never the full gradient, to keep empty states quiet
   * rather than promotional."
   *
   * Implemented as reduced opacity, NOT a colour filter. §5 forbids recolouring
   * the feather, and the gradient must survive; dimming the whole mark keeps
   * the gradient intact while dropping it back visually.
   */
  muted?: boolean;
  className?: string;
  /**
   * Accessible name. Defaults to "" (decorative), which is right for the vast
   * majority of uses — the feather beside an AI message is reinforcing a label
   * that is already there. Pass a real string only when the feather is the
   * sole carrier of meaning.
   */
  alt?: string;
  priority?: boolean;
}

/**
 * The SynQanun feather mark.
 *
 * Not a generic icon and not interchangeable with one. brand-guidelines.md §5
 * makes this the product's signature for "the AI is present/acting" — it
 * appears next to every AI-generated suggestion, draft and action, so a user
 * always knows output came from SynQanun's AI even inside a fully white-labeled
 * client instance.
 *
 * Non-negotiable rules this component enforces by construction:
 *
 *   · Always the real asset. Never `lucide-react`'s feather, never an inline
 *     SVG redraw. BUILD_PLAN.md §1 chose lucide for the neutral UI icon set
 *     precisely so this one mark stays outside it.
 *   · Always its red→black gradient. Never recoloured to a client's brand
 *     colour (§5, §7.2) — which is why this component exposes no `color` prop.
 *   · Exclusively SynQanun's. A client's icon set may never replace it or sit
 *     inside it (§5).
 *   · Never below 16px — "it degrades into an illegible smear" (§2.5).
 *
 * On dark or photographic surfaces, brand-guidelines.md §2.4/§5 call for a
 * flattened single-colour version of the mark. That asset does not exist yet;
 * when dark mode is built, add it to the registry rather than filtering this
 * one.
 */
export function FeatherMark({
  height = 20,
  thinking = false,
  muted = false,
  className,
  alt = '',
  priority = false,
}: FeatherMarkProps) {
  const markHeight = Math.min(
    Math.max(height, FEATHER.minHeight),
    FEATHER.maxHeight ?? height
  );

  // Scale the untouched 48×48 source so the 12×34 artwork inside it measures
  // `markHeight`, then offset the canvas to bring the artwork into the box.
  const scale = markHeight / FEATHER.ink.height;
  const markWidth = Math.max(1, Math.round(FEATHER.ink.width * scale));

  return (
    <span
      className={cn(
        'relative block shrink-0 overflow-hidden',
        thinking && 'syn-feather-thinking',
        className
      )}
      style={{
        // The feather never mirrors — logos never flip (brand-guidelines.md
        // §2.5, design.md §12).
        direction: 'ltr',
        width: markWidth,
        height: markHeight,
        opacity: muted ? 0.4 : 1,
      }}
      aria-hidden={alt === '' ? true : undefined}
    >
      <Image
        src={FEATHER.src}
        alt={alt}
        width={Math.round(FEATHER.canvas.width * scale)}
        height={Math.round(FEATHER.canvas.height * scale)}
        priority={priority}
        className="absolute max-w-none"
        style={{
          left: -Math.round(FEATHER.ink.x * scale),
          top: -Math.round(FEATHER.ink.y * scale),
        }}
      />
    </span>
  );
}

export default FeatherMark;
