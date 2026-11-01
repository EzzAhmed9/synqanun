import type { Locale } from '@/lib/i18n/routing';

/**
 * fixtures/firm.ts — the canonical demo firm.
 *
 * SINGLE SOURCE OF TRUTH for the tenant's name and branding across the whole
 * prototype. Every other fixture file (matters, invoices, messages, users…)
 * imports from here. No fixture, component, screen or translation string may
 * hardcode the firm's name again — if the demo firm is ever renamed, this file
 * is the only edit.
 *
 * Note this is deliberately a .ts file, not .json: BUILD_PLAN.md §2 lists the
 * entity fixtures as JSON, but the firm is the one fixture other fixtures
 * import, so it needs to be importable and typed. The entity fixtures added in
 * Batch 0.5 / Batch 2 will reference `demoFirm` from here.
 *
 * WHITE-LABEL NOTE — brand-guidelines.md §7.3 and design.md §10:
 * this object is the demo's stand-in for the four tenant placeholders
 * ({{CLIENT_NAME}}, {{CLIENT_LOGO_LIGHT}}, {{CLIENT_LOGO_DARK}},
 * {{CLIENT_ACCENT}}). In production these come from the tenant-configuration
 * layer, never from a checked-in file. The shape below matches what that layer
 * must eventually return, so swapping it is a data change, not a refactor.
 */

/**
 * A tenant's own palette, for tenants granted themed mode.
 *
 * ===========================================================================
 * FIVE TOKENS, AND EACH ONE EXISTS BECAUSE CONTRAST FORCED IT
 * ===========================================================================
 * The obvious design is one brand colour. It does not survive measurement: a
 * firm's gold reads beautifully as a hairline and fails every text threshold
 * there is. So the palette splits by WHAT A COLOUR MAY CARRY rather than by
 * how it looks, and the split is checked rather than asserted — the ratios
 * below were measured, not estimated.
 *
 *   ornament  the brand colour at its most recognisable. Hairlines, rules,
 *             decorative marks, large flat shapes. NEVER text, never an icon
 *             that carries meaning, never a focus ring. Meezan's gold is
 *             2.76:1 on its own cream — under 4.5 for text, and under even
 *             the 3.0 that WCAG 1.4.11 asks of a meaningful UI component.
 *   action    the filled-button colour, which must hold white text at 4.5.
 *             Meezan's bronze is 4.85:1. This REPLACES syn-red inside a
 *             themed tenant, which is the single biggest thing themed mode
 *             changes and the reason it is granted rather than assumed.
 *   ink       the dark neutral: chrome surfaces, and body text on canvas.
 *             Charcoal is 8.89:1 on cream and holds white at 9.42:1.
 *   canvas    the app background, replacing gray-50.
 *   onDark    what sits on `ink` — labels in a dark sidebar. White, because
 *             the brand gold on charcoal is 3.22:1: fine for an active-state
 *             indicator, not for a label.
 */
export interface TenantTheme {
  /** Rendered into CSS custom properties by the locale layout. */
  ornament: string;
  action: string;
  /** Pressed/hover state of `action`. Darker, never lighter. */
  actionPressed: string;
  ink: string;
  canvas: string;
  onDark: string;
  /** Corner radius for the dashboard's bento tiles, in px. */
  tileRadius: number;
  /**
   * The decorative panel on the themed sign-in screens (design.md §10.2,
   * "Split sign-in"). Decoration only: it carries no text and no state.
   *
   * `texture` is THE SLOT FOR A SUPPLIED IMAGE. Null renders the built-in
   * CSS/SVG stone (components/auth/StonePanel.tsx), drawn from `ink` and
   * `ornament` so it needs no colours of its own. When the firm supplies its
   * texture, put the path under /public here and the panel renders it instead.
   * The embossed mark and the gold edge rule stay on top in both cases.
   */
  authPanel: {
    texture: string | null;
  };
}

export interface FirmIdentity {
  /** Stable tenant id. Never rendered. */
  id: string;
  /** {{CLIENT_NAME}} — displayed name, per locale. */
  name: Record<Locale, string>;
  /** {{CLIENT_DOMAIN}} — used for portal URLs and staff email addresses. */
  domain: string;
  /**
   * {{CLIENT_LOGO_LIGHT}} — path under /public, or null when the tenant has no
   * logo. Renders in exactly three places (design.md §10): login/splash, the
   * sidebar top slot, and exported client-facing document headers.
   */
  logoLight: string | null;
  /** {{CLIENT_LOGO_DARK}} — variant for dark surfaces. Dark mode is a future phase. */
  logoDark: string | null;
  /**
   * {{CLIENT_ACCENT}} — optional single accent colour. Falls back to gray-200
   * when absent (brand-guidelines.md §7.3).
   *
   * HARD CONSTRAINT (brand-guidelines.md §7.2, design.md §7): this colour may
   * only tint a client-portal header wash or a card border. It must never
   * appear on a primary button, on any AI-agent surface, or anywhere syn-red
   * or legal-navy already appear.
   */
  accent: string | null;

  /* -------------------------------------------------------------------------
   * THEMED-TENANT MODE — ratified in design.md §10.2, brand-guidelines §7.4
   * -------------------------------------------------------------------------
   * `{{CLIENT_ACCENT}}` above answers "may this tenant tint a card border".
   * This answers a bigger question: may this tenant RECOLOUR the product.
   *
   * They are deliberately separate fields rather than one. Accent mode is the
   * default and the conservative one — a guest colour in two places, with
   * syn-red still the primary action everywhere. Themed mode re-skins the
   * canvas, the chrome and the primary action, and is granted per tenant
   * rather than assumed.
   *
   * `null` means accent mode: the product looks like SynQanun, which is still
   * what every other tenant in these fixtures gets.
   *
   * WHAT A THEME MAY NOT TOUCH is not expressed here, because a type cannot
   * enforce it — see the two ratifying sections. In short: the feather, the
   * legal-navy AI surfaces, the semantic tokens, the "Powered by SynQanun"
   * credit and the typography are fixed in every tenant, themed or not.
   * ---------------------------------------------------------------------- */
  theme: TenantTheme | null;

  /* -------------------------------------------------------------------------
   * {{CLIENT_ABOUT_TEXT}} — ratified in design.md §10.1
   * -------------------------------------------------------------------------
   * The four fields below are the resolved shape of that token. It is a
   * CONTENT token, not a branding one: it carries no logo and no colour, so it
   * is deliberately NOT one of §10's four branding locations (or of
   * brand-guidelines.md §7.1's) — those govern where a client's mark and
   * accent may be placed, and this places nothing.
   *
   * §10.1 keeps its own list of screens that may render it, currently the
   * Client Gateway alone. A new screen does not inherit the right to use it;
   * add the screen to §10.1 first.
   *
   * Both locales are required — Arabic copy is never a shortened version of
   * the English (brand-guidelines.md §6).
   * ---------------------------------------------------------------------- */

  /** Strapline under the firm name in the portal header, per locale. */
  tagline: Record<Locale, string>;
  /** Headline above the about text on the client gateway, per locale. */
  headline: Record<Locale, string>;
  /** {{CLIENT_ABOUT_TEXT}} — the firm's own description on the client gateway. */
  about: Record<Locale, string>;
  /** Practice areas listed beneath the about text, per locale. */
  practiceAreas: Record<Locale, string[]>;
}

// MOCK: replace with the tenant-configuration lookup for the authenticated
// tenant (resolved from subdomain or session claim). Track A.5 — see
// BUILD_PLAN.md §6, "Fixture JSON → real schema (multi-tenant)".
export const demoFirm: FirmIdentity = {
  id: 'firm-meezan-legal',
  name: {
    en: 'Meezan Legal',
    ar: 'ميزان القانونية',
  },
  domain: 'meezanlegal.sa',
  logoLight: '/brand/meezan/meezan-logo-full-colour.svg',
  logoDark: '/brand/meezan/meezan-logo-gold-on-dark.svg',
  /*
    `accent` stays null even though this tenant is very much branded, and the
    two fields not agreeing is the point rather than an oversight.

    `accent` is the guest-colour slot: a tint on a card border, under rules
    that assume syn-red is still the primary action. This tenant is in THEMED
    mode, where the brand colour is not a guest — it owns the canvas and the
    action colour outright. Setting both would give the gold two different
    sets of rules at once, and the narrower one would be the lie.
  */
  accent: null,
  theme: {
    // Measured, not chosen by eye — see TenantTheme.
    ornament: '#b0935b', // gold
    action: '#8a6d3b', // bronze, 4.85:1 on white
    actionPressed: '#6f572f',
    ink: '#464648', // charcoal, 8.89:1 on cream
    canvas: '#fbf8f3', // cream
    onDark: '#ffffff',
    tileRadius: 24,
    // PLACEHOLDER: the client mockup shows a photographed marble, not yet
    // supplied. This stand-in is generated by scripts/generate-auth-stone.py;
    // swap the path (or the file) when the client's own texture arrives. Null
    // falls back to the CSS/SVG stone in components/auth/StonePanel.tsx.
    authPanel: { texture: '/brand/meezan/auth-stone.webp' },
  },

  // The firm's own descriptor only. The per-screen context that follows it
  // ("Client access", "Client onboarding") is product copy and lives in the
  // translation dictionaries — it is not something a tenant configures.
  tagline: {
    en: 'Advocates and legal consultants',
    ar: 'محامون ومستشارون قانونيون',
  },
  headline: {
    en: 'Dedicated legal representation and trusted advisory services',
    ar: 'تمثيل قانوني مخصص واستشارات تقوم على الثقة',
  },
  about: {
    en: 'Meezan Legal advises Saudi and regional businesses on corporate transactions, commercial arbitration and regulatory compliance. Client matters are handled by a named partner, with every instruction, filing and fee statement recorded in this portal.',
    ar: 'تقدّم ميزان القانونية المشورة للشركات السعودية والإقليمية في المعاملات التجارية والتحكيم التجاري والامتثال التنظيمي. يتولى كل ملف شريك مسؤول بالاسم، وتُقيَّد كل التعليمات والمذكرات وكشوف الأتعاب في هذه البوابة.',
  },
  practiceAreas: {
    en: ['Corporate, arbitration and regulatory practice', 'Privileged and confidential client workspace'],
    ar: ['قضايا الشركات والتحكيم والامتثال التنظيمي', 'مساحة عمل خاضعة للسرية المهنية'],
  },
};

/**
 * The tenant's theme as CSS custom properties, or null in accent mode.
 *
 * ===========================================================================
 * ONE PLACE EMITS THESE, AND NO COMPONENT READS THE FIXTURE
 * ===========================================================================
 * The whole point of theming through variables is that recolouring the product
 * is not a hundred component edits. The locale layout spreads this onto the
 * document element once; everything downstream keeps using the same token names
 * it always used, and those names resolve differently inside a themed tenant.
 *
 * A component that imported `demoFirm.theme` to pick a colour would be the
 * beginning of the per-screen drift the whole design system exists to prevent —
 * and it would not work anyway, because the fallbacks below are what make an
 * unthemed tenant render at all.
 *
 * MOCK: resolved from the tenant-configuration layer at Track A.5, which is
 * also when these stop being compile-time constants and have to be injected
 * per request without flashing the wrong palette.
 */
export function themeVariables(): Record<string, string> | null {
  const theme = demoFirm.theme;
  if (!theme) return null;

  return {
    '--syn-tenant-ornament': theme.ornament,
    '--syn-tenant-action': theme.action,
    '--syn-tenant-action-pressed': theme.actionPressed,
    '--syn-tenant-ink': theme.ink,
    '--syn-tenant-canvas': theme.canvas,
    '--syn-tenant-on-dark': theme.onDark,
    '--syn-tenant-tile-radius': `${theme.tileRadius}px`,

    /*
      Sidebar layers, derived from the theme rather than configured separately.
      A tenant supplies a palette, not five sidebar slots — asking for those
      would be asking a firm to design a component.

      The charcoal rail inverts every layer: the surface is `ink`, the labels
      are `onDark`, and the active edge is `ornament`. Gold is 3.22:1 on
      charcoal, which clears the 3:1 that WCAG 1.4.11 asks of a non-text
      indicator and does NOT clear 4.5 — so it draws the edge and the icon, and
      the label beside it is white.
    */
    '--syn-sidebar-bg': theme.ink,
    '--syn-sidebar-edge': 'rgba(255, 255, 255, 0.10)',
    '--syn-sidebar-raised': 'rgba(255, 255, 255, 0.08)',
    '--syn-sidebar-strong': theme.onDark,
    // Not pure white: a resting label at full white gives the rail no
    // hierarchy, and every item reads as selected.
    '--syn-sidebar-muted': 'rgba(255, 255, 255, 0.72)',
    '--syn-sidebar-active': theme.ornament,
  };
}

/** The themed tenant's sign-in panel texture, or null for the built-in stone. */
export function authPanelTexture(): string | null {
  return demoFirm.theme?.authPanel.texture ?? null;
}

/** Whether this tenant re-skins the product rather than tinting it. */
export function isThemedTenant(): boolean {
  return demoFirm.theme !== null;
}

/**
 * Resolve the demo firm's name for a locale.
 *
 * Use this everywhere the firm is named. Do not reach into
 * `demoFirm.name.en` directly from a component — going through this helper is
 * what guarantees an Arabic screen never renders a Latin firm name.
 */
export function firmName(locale: Locale): string {
  return demoFirm.name[locale];
}

/**
 * The client accent, or the documented gray-200 fallback.
 * brand-guidelines.md §7.3: "falls back to gray-200 if the client has no brand
 * colour."
 */
export function firmAccent(): string {
  return demoFirm.accent ?? '#DFDFE3';
}
