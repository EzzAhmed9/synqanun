/**
 * The tenant mark's outline, for the places that must ANIMATE or CARVE it
 * rather than show it as an image: the stone panel, the splash and the
 * loading state.
 *
 * Copied from public/brand/meezan/meezan-mark-gold.svg, not redrawn. The
 * lockup files draw the same path in the same coordinate space, so an SVG
 * with `LOCKUP_VIEWBOX` overlays the lockup image exactly. The splash relies
 * on that to hand over from the animated mark to the real lockup without a
 * visible seam.
 *
 * MOCK: the demo tenant's geometry, checked in. At Track A.5 it comes from
 * tenant configuration with the rest of the lockup.
 */
export const TENANT_MARK_PATH =
  'M 326.566406 225.523438 L 316.628906 215.523438 L 316.628906 174.78125 C 316.628906 174.507812 316.40625 174.285156 316.128906 174.285156 L 271.867188 174.285156 C 269.9375 174.285156 268.371094 175.847656 268.371094 177.78125 L 268.371094 225.523438 L 278 225.523438 L 278 191.292969 C 278 190.527344 278.355469 189.800781 278.960938 189.328125 L 286.878906 183.128906 C 287.207031 182.875 287.6875 183.105469 287.6875 183.523438 L 287.6875 225.523438 L 297.265625 225.523438 L 297.265625 187.8125 C 297.265625 187.085938 297.582031 186.394531 298.136719 185.917969 L 306.125 179.0625 C 306.449219 178.785156 306.949219 179.015625 306.949219 179.441406 L 306.949219 225.523438 Z';

/** The mark file's own viewBox: the mark alone. */
export const MARK_VIEWBOX = '267.87 173.79 59.20 52.24';

/** The lockup files' viewBox. The mark sits at its inline-right end. */
export const LOCKUP_VIEWBOX = '72 173 256 54';

/** The mark's centre, in lockup coordinates. */
export const MARK_CENTRE = { x: 297.47, y: 199.91 } as const;

/**
 * Where the wordmark ends and the mark begins, as a fraction of the lockup's
 * width: (267.87 − 72) / 256. The splash uncovers everything before it.
 */
export const WORDMARK_FRACTION = 0.765;

/**
 * How far the lockup must shift for the MARK to sit at the centre: the
 * distance from the lockup's centre (200) to the mark's (297.47), over 256.
 */
export const MARK_OFFSET_FRACTION = 0.381;
