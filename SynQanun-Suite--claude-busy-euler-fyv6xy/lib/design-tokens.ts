/**
 * SynQanun Suite — design tokens (TypeScript mirror)
 *
 * BUILD_PLAN.md §2 calls for `lib/design-tokens.ts`, "generated from
 * brand-guidelines.md + design.md".
 *
 * The *authoritative* runtime source is the `@theme` block in app/globals.css —
 * that is what Tailwind compiles. This file mirrors the same values for
 * consumers that cannot use a Tailwind class: chart libraries, canvas/inline
 * SVG fills, `next/og` image generation, and anything passing a colour to a
 * third-party component as a prop.
 *
 * Keep the two in sync. If they ever disagree, globals.css wins.
 * Order of authority overall: brand-guidelines.md → design.md → globals.css →
 * this file.
 */

/* ---------------------------------------------------------------------------
 * Colour — design.md §2 / brand-guidelines.md §3
 * ------------------------------------------------------------------------- */

export const brand = {
  /** Primary actions, active nav state, the "hot" end of the brand gradient. */
  synRed: '#EB1C24',
  /** Hover/pressed state of red, gradient terminus, dark decorative accents. */
  synGarnet: '#3D0709',
  /** Logo reproduction ONLY. design.md §2: never a UI text or surface colour. */
  synInk: '#000000',
} as const;

export const gray = {
  50: '#F7F7F8', // App canvas background
  100: '#EEEEF0', // Cards, panels, table row alternation
  200: '#DFDFE3', // Borders, dividers, input outlines (default state)
  300: '#C7C7CD', // Disabled borders
  400: '#A3A3AC', // Placeholder text, disabled text/icons
  500: '#6B6B76', // Secondary/muted text, timestamps, metadata — AA on every surface
  600: '#56565F', // Default body text
  700: '#3A3A42', // Headings, emphasized body text
  800: '#24242A', // Dark-mode surface (reserved — dark mode is a future phase)
  900: '#131316', // Dark-mode canvas / primary UI "black" (never pure #000)
} as const;

export const semantic = {
  /** Links, info banners, and ALL AI-agent surfaces. design.md §2. */
  legalNavy: '#1E3A5F',
  /** Completed steps, confirmations. */
  success: '#1E7A4C',
  /** Deadlines approaching, drafts pending review. */
  warning: '#B4740E',
  /**
   * Validation errors, failed actions, destructive confirmation.
   * Deliberately NOT syn-red — see brand-guidelines.md §3.4. Must always be
   * paired with an icon + text label, never carried by hue alone.
   */
  error: '#B23A32',
  /** Neutral system messages. Identical to legalNavy by design. */
  info: '#1E3A5F',
} as const;

/**
 * The brand gradient — brand-guidelines.md §3.1.
 * Permitted on the logo and the feather motif's animated states ONLY.
 * Never a decorative background wash.
 */
export const brandGradient = 'linear-gradient(180deg, #EB1C24 0%, #3D0709 100%)';

/**
 * AI-agent chat panel surface — design.md §4: legal-navy at ~6% opacity as a
 * background wash, not a solid fill.
 */
export const aiSurface = 'rgba(30, 58, 95, 0.06)';

/**
 * design.md §2 "Assignment logic" — the single most load-bearing rule in the
 * design system, exposed as code so it can be asserted rather than remembered:
 *
 *   Red is for the human's actions.  Navy is for the AI's actions.
 *
 * A user must be able to tell, by colour alone, whether something came from
 * them or from the agent. design.md §7: "Don't use syn-red for anything
 * AI-generated — that collision is the single most important rule in this file."
 */
export const actorColor = {
  human: brand.synRed,
  ai: semantic.legalNavy,
} as const;

/* ---------------------------------------------------------------------------
 * Typography — design.md §3 / brand-guidelines.md §4
 * ------------------------------------------------------------------------- */

export const fontFamily = {
  /** Cairo 700–900 — display, headlines, anything logo-adjacent. Bilingual. */
  display: 'var(--font-cairo)',
  /** Inter 400–600 — Latin UI body. */
  sans: 'var(--font-inter)',
  /** IBM Plex Sans Arabic 400–600 — Arabic UI body. */
  arabic: 'var(--font-plex-arabic)',
  /** JetBrains Mono — clause numbers, doc IDs, invoice numbers, AI citations. */
  mono: 'var(--font-jetbrains-mono)',
} as const;

export type TypeLevel =
  | 'display'
  | 'heading'
  | 'title'
  | 'body'
  | 'bodyEmphasis'
  | 'caption'
  | 'reference';

/**
 * design.md §3 type scale. `lineHeightAr` is the Arabic line-height: ~10%
 * taller than the Latin equivalent at the same size, because IBM Plex Sans
 * Arabic needs the room. design.md is explicit that the Latin line-height
 * token must not be reused for Arabic text blocks.
 */
export const typeScale: Record<
  TypeLevel,
  {
    family: keyof typeof fontFamily;
    weight: number;
    size: number;
    lineHeight: number;
    lineHeightAr: number;
    note: string;
  }
> = {
  display: {
    family: 'display',
    weight: 800,
    size: 28,
    lineHeight: 36,
    lineHeightAr: 40,
    note: 'Page title. One per screen, sentence case — never all caps.',
  },
  heading: {
    family: 'display',
    weight: 700,
    size: 20,
    lineHeight: 28,
    lineHeightAr: 31,
    note: 'Section heading.',
  },
  title: {
    family: 'sans',
    weight: 600,
    size: 16,
    lineHeight: 24,
    lineHeightAr: 26,
    note: 'Card / subsection title.',
  },
  body: {
    family: 'sans',
    weight: 400,
    size: 14,
    lineHeight: 22,
    lineHeightAr: 24,
    note: 'Default for all prose, table cells, form labels.',
  },
  bodyEmphasis: {
    family: 'sans',
    weight: 500,
    size: 14,
    lineHeight: 22,
    lineHeightAr: 24,
    note: 'The one value in a row that matters (a due date, a total) — not decoration.',
  },
  caption: {
    family: 'sans',
    weight: 400,
    size: 12,
    lineHeight: 18,
    lineHeightAr: 20,
    note: 'Timestamps, byline, helper text. Set in gray-500.',
  },
  reference: {
    family: 'mono',
    weight: 400,
    size: 13,
    lineHeight: 20,
    lineHeightAr: 22,
    note: 'Clause numbers, doc IDs, invoice numbers, AI citations.',
  },
};

/* ---------------------------------------------------------------------------
 * Layout — design.md §5, §6, §8
 * ------------------------------------------------------------------------- */

/** design.md §5: base unit 4px; scale 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64. */
export const spacingScale = [4, 8, 12, 16, 24, 32, 48, 64] as const;
export const spacingBaseUnit = 4;

export const radius = {
  sm: 4,
  card: 8, // design.md §4 "Cards & panels"
  btn: 8, // design.md §4 "Buttons / Primary"
  pill: 9999,
} as const;

/** design.md §6 — three elevation levels only. Resist adding more. */
export const elevation = {
  /** Level 0 — cards, panels, table rows. Border only, no shadow. */
  resting: 'none',
  /** Level 1 — dropdowns, popovers, tooltips. */
  raised: '0 1px 3px rgba(19, 19, 22, 0.08)',
  /** Level 2 — modals, the AI chat panel in floating mode. */
  overlay: '0 8px 24px rgba(19, 19, 22, 0.16)',
} as const;

/** design.md §8 responsive behaviour. */
export const breakpoints = {
  tablet: 768,
  desktop: 1280,
} as const;

export const layout = {
  /** design.md §5: content max-width 1440px, centered, sidebar outside it. */
  contentMaxWidth: 1440,
  /** design.md §5: 12-column grid, 24px gutters on desktop. */
  gridColumns: 12,
  gridGutter: 24,
  /** design.md §4: table row height 44px. Also the §8 touch-target minimum. */
  tableRowHeight: 44,
  minTouchTarget: 44,
  sidebarWidth: 256,
  sidebarWidthCollapsed: 64,
  topBarHeight: 64,
} as const;
