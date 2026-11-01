/**
 * Brand asset registry — the only place the SynQanun marks are described.
 *
 * brand-guidelines.md §2 is the law here. Three rules this module exists to
 * make mechanically enforceable rather than merely documented:
 *
 *   · The marks are IMAGE ASSETS. They are never drawn with an icon library,
 *     never recreated in inline SVG, never recoloured, never substituted with
 *     a generated glyph. BUILD_PLAN.md §1 pins this too: "the feather mark and
 *     both wordmarks stay as real image/SVG assets, never from the icon set."
 *   · The wordmarks are two distinct native-script lockups, not two renderings
 *     of one shape. The Arabic mark is NOT a mirrored English mark, and the two
 *     must never appear side by side as if they were one lockup
 *     (brand-guidelines.md §2.5).
 *   · Minimum sizes are hard floors: 24px tall for a wordmark, 16px for the
 *     feather.
 *
 * ---------------------------------------------------------------------------
 * WHY THE `ink` NUMBERS EXIST
 * ---------------------------------------------------------------------------
 * The delivered PNGs are square canvases with a large transparent margin — the
 * English wordmark is 813×415px of artwork floating inside 1080×1080px of
 * nothing. Rendering the raw file at "40px tall" therefore yields a mark about
 * 15px tall, adrift in whitespace, and blows every layout measurement.
 *
 * `ink` is the measured bounding box of the actual artwork in each file. The
 * Logo and FeatherMark components use it to scale and offset the *untouched*
 * asset so that the size you ask for is the size of the mark itself. This
 * removes transparent canvas padding only — it does not crop, rotate, skew or
 * otherwise alter the mark, all of which brand-guidelines.md §2.3 forbids.
 *
 * Measured from the source files; recompute if an asset is ever replaced.
 */

export interface BrandAsset {
  /** Path under /public. */
  src: string;
  /** Intrinsic file dimensions. */
  canvas: { width: number; height: number };
  /** Measured bounding box of the artwork within that canvas. */
  ink: { x: number; y: number; width: number; height: number };
  /** Hard minimum rendered height of the artwork, in px. */
  minHeight: number;
  /**
   * Maximum rendered height before the raster visibly degrades, in px, or null
   * when there is no practical ceiling at UI sizes.
   */
  maxHeight: number | null;
  /**
   * Clear space required on all sides, as a multiple of the rendered mark
   * height. brand-guidelines.md §2.3 defines it as "the height of the
   * wordmark's lowercase 'a'"; these are estimates taken from the raster and
   * should be re-derived from the vector masters when those arrive.
   */
  clearSpaceRatio: number;
}

/**
 * English wordmark. Primary mark for English-language contexts.
 * Original delivered filename: `synqanun_png__2_.png`.
 */
export const WORDMARK_EN: BrandAsset = {
  src: '/brand/synqanun-wordmark-en.png',
  canvas: { width: 1080, height: 1080 },
  ink: { x: 133, y: 333, width: 813, height: 415 },
  minHeight: 24,
  maxHeight: null,
  clearSpaceRatio: 0.34,
};

/**
 * Arabic wordmark. Primary mark for Arabic-language contexts.
 * brand-guidelines.md §2.1: "not a mirror of the English mark, a distinct
 * native-script lockup."
 * Original delivered filename: `Synqanun_arabic_png__1_.png`.
 */
export const WORDMARK_AR: BrandAsset = {
  src: '/brand/synqanun-wordmark-ar.png',
  canvas: { width: 1080, height: 1080 },
  ink: { x: 175, y: 300, width: 730, height: 479 },
  minHeight: 24,
  maxHeight: null,
  clearSpaceRatio: 0.3,
};

/**
 * Feather mark. brand-guidelines.md §5: not merely a favicon — SynQanun's
 * recurring signature for "the AI is present/acting". Exclusively SynQanun's;
 * a client's icon set may never replace it or sit inside it (§7.2).
 *
 * `maxHeight: 48` is a real constraint, not caution: the source was delivered
 * at 48×48 raster, and brand-guidelines.md §2.1 says to "treat 48×48 as the
 * feather mark's safe maximum raster size and re-render larger uses from a
 * redrawn vector." The artwork inside that canvas is only 12×34px, so the
 * usable mark height caps out at 34px until a vector master exists.
 */
export const FEATHER: BrandAsset = {
  src: '/brand/synqanun-feather.png',
  canvas: { width: 48, height: 48 },
  ink: { x: 18, y: 7, width: 12, height: 34 },
  minHeight: 16,
  maxHeight: 34,
  clearSpaceRatio: 0.25,
};

/**
 * ⚠ ASSET DEBT — brand-guidelines.md §2.1 and §8.
 *
 * All three marks were delivered as raster only. The guidelines instruct:
 * "Request true vector (SVG/AI/EPS) masters from whoever designed the
 * originals before production use." Until then:
 *
 *   · The wordmarks (1080px canvas, ~800px of artwork) are safe at every size
 *     this UI uses, but will blur in hero lockups, print and signage.
 *   · The feather is the urgent one. Its artwork is 12×34px. It is fine as a
 *     favicon and adequate as a 20–24px inline AI marker, but it CANNOT be
 *     used larger — and brand-guidelines.md §5 wants it as an empty-state
 *     illustration and an animated "agent is thinking" indicator, both of
 *     which want more pixels than exist.
 *
 * This is a blocker for Batch 5 (AI surfaces), not for Batch 0.
 */
export const ASSETS_ARE_RASTER_ONLY = true;
