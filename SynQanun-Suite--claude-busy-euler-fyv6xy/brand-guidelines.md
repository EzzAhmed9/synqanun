# SynQanun Brand Guidelines

**Owner:** SynQanun · **Product:** SynQanun Suite · **Status:** v1.0 — source of truth for `design.md`

This document is the single source of truth for how the SynQanun brand looks, sounds, and behaves — including how it shares space with a client's brand inside SynQanun Suite's white-label mode. `design.md` (the Stitch-ready UI spec) inherits every token defined here. If the two files ever disagree, this one wins.

---

## 1. Brand Essence

SynQanun is the first legal AI built for the Egyptian and MENA market. The brand needs to hold two things at once: the **gravity of law** (precision, authority, trust) and the **momentum of AI** (speed, capability, forward motion). The red-to-black gradient in the logo already encodes this — heat and motion at the top, settling into solid, immovable black at the base. That is the brand's central metaphor: **energy resolving into authority.**

Every design decision should ask: *does this feel precise and load-bearing, or does it feel decorative?* SynQanun earns trust through restraint, not flourish.

## 2. Logo System

### 2.1 Marks in the system

| Mark | File | Use |
|---|---|---|
| English wordmark | `synqanun_png__2_.png` | Primary mark for English-language contexts |
| Arabic wordmark | `Synqanun_arabic_png__1_.png` | Primary mark for Arabic-language contexts — not a mirror of the English mark, a distinct native-script lockup |
| Feather mark | `_Feathre_logo_synqanun.ico` | Standalone icon — favicon, app icon, avatar, and the recurring UI motif (see §5) |

Source files were delivered as PNG/ICO. **Request true vector (SVG/AI/EPS) masters from whoever designed the originals before production use** — PNG raster will blur at large sizes (hero lockups, print, signage) and the ICO is fixed at 48×48px, too small for anything beyond a favicon. Until vector masters exist, treat 48×48 as the feather mark's safe maximum raster size and re-render larger uses from a redrawn vector.

### 2.2 Wordmark construction

Both wordmarks share one construction: the **first syllable** ("syn" / "سين") sits in the red→black gradient, the **second syllable** ("anun" / "قانون") sits in solid black. This isn't decorative — it's the brand's core visual rule: **gradient marks the "new/AI" part of the name, solid black marks the "law" part.** Any new lockup (sub-brand, product suite name, app icon) should follow this same split when it includes the SynQanun name.

### 2.3 Clear space & minimum size

- Clear space on all sides ≥ the height of the wordmark's lowercase "a" (both scripts).
- Minimum digital size: 24px tall for the wordmark, 16px for the feather mark alone.
- Never crop, rotate, skew, or apply drop shadows/outer glows to any mark.

### 2.4 Backgrounds

- Preferred: white or near-white (`Gray-50`, §3.2).
- On dark or photographic backgrounds, use a single-color (all-black or all-white) flattened version of the mark — never place the live red gradient over a busy or dark image; it loses the gradient's legibility and the red can clash with photo content.
- Minimum contrast: mark must pass WCAG AA against its background.

### 2.5 Don'ts

- Don't recolor the gradient (no blue SynQanun, no all-red SynQanun with black removed).
- Don't separate "syn" from "anun" into two colors other than the defined gradient→solid relationship.
- Don't pair the English and Arabic wordmarks side-by-side as if they were one lockup — pick the one that matches the interface language in view.
- Don't scale the feather mark down past 16px — it degrades into an illegible smear.

## 3. Color System

### 3.1 Brand colors (extracted from source files)

| Token | Hex | Role |
|---|---|---|
| `syn-red` | `#EB1C24` | Primary brand color. CTAs, active states, the "energy" end of the gradient. |
| `syn-garnet` | `#3D0709` | Gradient terminus / deep accent. Hover-darkened red, shadow-side of the gradient, dark decorative use. |
| `syn-ink` | `#000000` | Logo black — reserved for the logo itself and maximum-contrast text on white. |

**The brand gradient**, used only for the logo and the feather motif's animated states — never as a decorative background wash:
```
linear-gradient(180deg, #EB1C24 0%, #3D0709 100%)
```

### 3.2 Neutral scale (added — UI needs more than red/black/white)

Pure `#000000` is correct for the logo but too harsh for large UI surfaces and body text (halation on screens, fails "soft authority" tone). This scale is the UI's actual black-to-white range:

| Token | Hex | Typical use |
|---|---|---|
| `gray-50` | `#F7F7F8` | App background |
| `gray-100` | `#EEEEF0` | Card/panel background, table stripes |
| `gray-200` | `#DFDFE3` | Borders, dividers |
| `gray-300` | `#C7C7CD` | Disabled borders, input outlines |
| `gray-400` | `#A3A3AC` | Disabled text, decorative icons (not placeholder text — 2.5:1) |
| `gray-500` | `#6B6B76` | Secondary/muted text |
| `gray-600` | `#56565F` | Body text on light surfaces |
| `gray-700` | `#3A3A42` | Headings on light surfaces |
| `gray-800` | `#24242A` | Dark surface background (dark mode) |
| `gray-900` | `#131316` | Darkest surface (dark mode) |

### 3.3 Functional accent

Red alone cannot carry links, AI-state, and info messaging without competing with red CTAs and red error states. One accent was added, chosen deliberately (not a generic Tailwind blue) to sit comfortably next to a red/black identity and to echo the "trustworthy enterprise software" register of Outlook/Office and Harvey/Legora:

| Token | Hex | Role |
|---|---|---|
| `legal-navy` | `#1E3A5F` | Links, info states, the AI agent's UI surfaces (chat bubbles, "agent is working" indicators), secondary buttons. Deliberately cool and calm against the brand's warm red — signals "the system is reasoning," distinct from "the system wants you to act" (red). |

### 3.4 Semantic colors

| Token | Hex | Role |
|---|---|---|
| `success` | `#1E7A4C` | Confirmations, completed workflow steps |
| `warning` | `#B4740E` | Approaching deadlines, drafts needing review |
| `error` | `#B23A32` | Failures, validation errors, destructive actions |
| `info` | `#1E3A5F` (= `legal-navy`) | Neutral system messages |

**Why `error` isn't `syn-red`:** the brand red is a call-to-action / identity color used constantly across the UI (buttons, active nav, highlights). If it also meant "something is wrong," every primary button would read as an alarm. `error` (`#B23A32`) is a deliberately duller, cooler rust-red — related enough to still say "red = stop," different enough not to fight the brand color. Error states must **always pair color with an icon and text**, never rely on the red hue alone — this is a hard rule given how close the two reds sit.

### 3.5 Accessibility

- Body text: `gray-600`/`gray-700` on `gray-50`/white — passes WCAG AA.
- Muted text: `gray-500` holds AA (4.5:1) on every surface it sits on — white 5.26, `gray-50` 4.92, `gray-100` 4.54, a themed cream 4.97. It was `#7A7A85` until a full-product audit measured it at 4.24 on white and 3.66 on `gray-100`; the step was darkened rather than 419 call sites moved. `gray-400` is for disabled states and decorative icons, never for text a reader must read — placeholder text included, which takes `gray-500`.
- `syn-red` on white passes AA for large text/icons only; for small body text on white, don't set red text — use it for backgrounds, borders, and icons, and pair with white or `syn-ink` text on top of it.
- Never use color alone to convey state (error/success/warning) — pair with icon + label, required for both accessibility and the red/error collision above.

## 4. Typography

Two constraints drove this: the product is **fully bilingual (Arabic/English)**, and the logo's letterforms are a **bold, rounded-geometric** style — round bowls, minimal contrast, confident weight. The pairing below was chosen (not defaulted) to match both:

| Role | Typeface | Why |
|---|---|---|
| Display / headlines / anything logo-adjacent | **Cairo** (700–900) | One of the few typefaces drawn natively for *both* Arabic and Latin under a single family, in a bold rounded-geometric style that echoes the wordmark's own letterforms — so headlines feel like they belong to the same brand as the logo, in either script, without maintaining two unrelated type systems. |
| UI body text — Latin | **Inter** (400–600) | Neutral, extremely legible at small sizes, the current standard for dense software UI (matches the Office/Outlook-literate audience's expectations) without competing with Cairo's personality in headlines. |
| UI body text — Arabic | **IBM Plex Sans Arabic** (400–600) | Matches Inter's x-height and weight rhythm closely, so mixed AR/EN screens (common in this product) don't visually seesaw between a heavy line and a light one. |
| Monospace — document IDs, clause references, AI citations, code | **JetBrains Mono** | Legal work is full of reference numbers (clause 4.2(a), case citations, invoice IDs) that benefit from tabular, unambiguous digits distinct from prose. |

Full size/weight scale lives in `design.md` §3 — this section defines *roles*, not pixel values, since that's a UI-layer decision, not a brand one.

## 5. Iconography & the Feather Motif

The feather is not just a favicon — it's SynQanun's recurring signature for **"the AI is present/acting."**

Approved uses:
- **App icon / favicon** — static, full gradient.
- **AI agent identity** — appears next to every AI-generated suggestion, draft, or action across the product, so a user always knows "this came from SynQanun's AI," even inside a fully white-labeled client instance.
- **Loading / "agent is thinking" indicator** — the feather subtly animates (e.g. a soft pulse along the gradient, or the quill tip tracing a short stroke) rather than a generic spinner. This reinforces brand presence in exactly the moments users wait on AI output.
- **Empty states** — a single muted-outline feather, never the full gradient, to keep empty states quiet rather than promotional.

Rules:
- The feather always keeps its red→black gradient (or a single-color flattened version on dark/busy surfaces) — never recolor it to a client's brand color.
- Never let a client's icon set replace or sit inside the feather mark. The feather is exclusively SynQanun's.
- Outside of the feather, use a single, neutral icon set for the rest of the product (specified in `design.md`) — don't introduce a second illustrative icon style.

## 6. Voice & Tone

- **Precise over persuasive.** SynQanun states what happened and what's next; it doesn't sell within its own UI.
- **Calm authority.** No exclamation points, no "Oops!," no forced friendliness. A missed deadline is reported plainly, with a fix, not softened.
- **Bilingual parity.** Arabic copy is never a shortened or "friendlier" version of the English — same precision, same information, in each language's natural register.

## 7. White-Label System — SynQanun Dominant, Client Customized

This is the core brand rule for SynQanun Suite: **SynQanun is the platform's identity; a client's brand is a guest, not a co-owner.**

### 7.1 What the client controls

A client's brand may appear **only** in these scoped locations:
1. **Login / splash screen** — client logo displayed above or beside the SynQanun mark.
2. **Top navigation, start-side logo slot** — small client logo, secondary in size/weight to the SynQanun identity in the nav.
3. **Client-facing exported documents** (invoices, generated contracts, client portal) — client logo in the document header.
4. **Client portal accent** *(optional, limited)* — a single client accent color may tint non-critical UI: the client portal's header background stripe or a card border. It must never be used on primary buttons, AI-agent surfaces, or anywhere `syn-red` or `legal-navy` currently appear.

### 7.2 What never changes, in any client instance

- The feather mark and everything it represents (§5) — always SynQanun's, always the brand gradient.
- AI-surface color (`legal-navy`). Primary action color (`syn-red`) in **accent mode**; see §7.4, which is the one place it may be replaced.
- The "Powered by SynQanun" credit — appears in the main app footer, every exported document, and the login screen, in every instance, permanently. It is not a toggle the client can disable.
- Core typography (Cairo/Inter/IBM Plex Sans Arabic).

### 7.3 Token placeholders (defined here, wired up in `design.md` §10)

Since any client's logo can be swapped in later, nothing client-specific is hardcoded. Placeholders only:

```
{{CLIENT_NAME}}
{{CLIENT_LOGO_LIGHT}}      /* SVG/PNG, transparent background */
{{CLIENT_LOGO_DARK}}       /* variant for dark surfaces, if dark mode is enabled */
{{CLIENT_ACCENT}}          /* optional — falls back to gray-200 if the client has no brand color */
```

No client asset (logo file, hex code) belongs in this file or in `design.md`. When onboarding an actual client, these four values are supplied through the product's tenant-configuration layer, not by editing the design system.

### 7.4 Themed-tenant mode — a second tier, granted not assumed

§7.1 describes **accent mode**: the client's brand is a guest in four scoped places. That remains the default and remains what most tenants get.

**Themed mode** is the second tier. The firm's palette owns the canvas, the chrome and the primary action — so the product reads as that firm's software rather than as SynQanun wearing their logo. It is granted per tenant and recorded in the tenant's own configuration, never switched on by a screen.

The governing detail — the five-token palette, the contrast each token must hold, and why the brand colour may not be a text colour — is in `design.md` §10.2, so that the measurements live beside the tokens that have to satisfy them. What belongs here is the brand position:

**SynQanun is still the platform, and a themed tenant does not change the three things that say so.**

1. **The feather is always ours.** It never takes the tenant's colour, never animates in the tenant's gradient, and is never swapped for a tenant mark. It is the one element that identifies whose software this is.
2. **`legal-navy` is always the AI.** The human/AI colour split (§3.3) is not a style; it is how a reader tells what came from a machine. A tenant may recolour the human's primary action — it may not recolour the agent.
3. **The "Powered by SynQanun" credit is unchanged**, in all three locations of §7.2, and is still not a toggle.

A tenant typeface is **not** part of themed mode. Type stays Cairo / IBM Plex Sans Arabic until font files are supplied and licensed; a house font named in a brand deck is not a font the product may set.

## 8. Asset Reference

| Asset | Delivered as | Status |
|---|---|---|
| English wordmark | PNG (1080×1080) | Raster only — request vector master |
| Arabic wordmark | PNG (1080×1080) | Raster only — request vector master |
| Feather mark | ICO (48×48) | Raster only, small — request vector master before any use above favicon size |

---
*This file defines the brand. For how it's implemented in the SynQanun Suite product UI — layout, components, spacing, screens — see `design.md`.*
