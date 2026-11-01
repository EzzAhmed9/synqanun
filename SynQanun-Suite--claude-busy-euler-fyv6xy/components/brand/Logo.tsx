import Image from 'next/image';
import { useLocale } from 'next-intl';
import { cn } from '@/lib/utils';
import { WORDMARK_AR, WORDMARK_EN, type BrandAsset } from './assets';

export interface LogoProps {
  /**
   * Height of the MARK ITSELF in px — not of the source file's square canvas.
   * Floor of 24px per brand-guidelines.md §2.3.
   */
  height?: number;
  /**
   * Override the locale used to pick the wordmark. Almost never needed: the
   * correct behaviour is to follow the interface language, which is the
   * default. Provided for the login/splash screen, which may need to show a
   * specific script before a locale is established.
   */
  locale?: string;
  /**
   * Reserve the required clear space around the mark
   * (brand-guidelines.md §2.3: ≥ the height of the lowercase "a" on all sides).
   * On by default — turn it off only when the surrounding layout already
   * guarantees the margin, never to pack the mark tighter.
   */
  clearSpace?: boolean;
  className?: string;
  /**
   * Accessible name. Defaults to "SynQanun". Pass "" when the mark sits beside
   * a visible "SynQanun" text label, so screen readers don't announce it twice.
   */
  alt?: string;
  priority?: boolean;
}

/**
 * The SynQanun wordmark.
 *
 * Picks the English or Arabic lockup from the active locale. These are two
 * distinct native-script marks (brand-guidelines.md §2.1) — the Arabic one is
 * not a mirrored English one — so this component renders exactly one of them
 * and never both. §2.5: "Don't pair the English and Arabic wordmarks
 * side-by-side as if they were one lockup — pick the one that matches the
 * interface language in view."
 *
 * The mark is NOT mirrored in RTL. design.md §7 and §12, and
 * brand-guidelines.md §2.5: layout and directional icons flip; logos never do.
 * That is why nothing here reads `dir`, and why the wrapper explicitly pins
 * `direction: ltr` — so a `transform: scaleX(-1)` inherited from an ancestor
 * RTL-mirroring utility can never reach the mark.
 *
 * Construction, for reference (brand-guidelines.md §2.2): the first syllable
 * ("syn" / "سين") carries the red→black gradient, the second ("anun" /
 * "قانون") is solid black — gradient marks the "new/AI" half of the name,
 * solid black marks the "law" half. That relationship lives in the asset. Do
 * not attempt to reproduce, recolour, or re-split it in code.
 */
export function Logo({
  height = 32,
  locale: localeOverride,
  clearSpace = true,
  className,
  alt = 'SynQanun',
  priority = false,
}: LogoProps) {
  // `useLocale()` is valid in both Server and Client Components under
  // next-intl, so Logo stays a Server Component unless its parent is a Client
  // Component.
  const activeLocale = useLocale();
  const locale = localeOverride ?? activeLocale;

  const asset: BrandAsset = locale === 'ar' ? WORDMARK_AR : WORDMARK_EN;

  // Hard floor from brand-guidelines.md §2.3. Clamping rather than throwing:
  // a too-small logo in a prototype should be visibly corrected, not a crash.
  const markHeight = Math.max(height, asset.minHeight);

  // Scale the untouched source so the ARTWORK — not the transparent canvas it
  // floats in — measures `markHeight`. See components/brand/assets.ts for why.
  const scale = markHeight / asset.ink.height;
  const markWidth = Math.round(asset.ink.width * scale);
  const pad = clearSpace ? Math.round(markHeight * asset.clearSpaceRatio) : 0;

  return (
    <span
      className={cn('inline-block shrink-0', className)}
      style={{
        // Logos never flip. Pinning direction here isolates the mark from any
        // RTL mirroring applied further up the tree.
        direction: 'ltr',
        padding: pad,
      }}
    >
      <span
        className="relative block overflow-hidden"
        style={{ width: markWidth, height: markHeight }}
      >
        <Image
          src={asset.src}
          alt={alt}
          width={Math.round(asset.canvas.width * scale)}
          height={Math.round(asset.canvas.height * scale)}
          priority={priority}
          className="absolute max-w-none"
          style={{
            // Physical left/top are correct here, not logical properties: the
            // wrapper pins direction:ltr, and this offset tracks a fixed pixel
            // position inside the image file, which has no reading direction.
            left: -Math.round(asset.ink.x * scale),
            top: -Math.round(asset.ink.y * scale),
          }}
        />
      </span>
    </span>
  );
}

export default Logo;
