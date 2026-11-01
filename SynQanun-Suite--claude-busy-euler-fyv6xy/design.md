# DESIGN.md — SynQanun Suite

Design system for **SynQanun Suite**: an AI-native, full-lifecycle platform for law firms and legal departments — drafting, document management (DMS), billing, and workflow, run through AI agents. This file follows the Stitch `DESIGN.md` convention and is meant to be dropped into the project root and read directly by Stitch (or any AI coding agent) when generating screens.

Brand source of truth: `brand-guidelines.md`. Every token below is inherited from it — if you need to change a color or typeface, change it there first.

---

## 0. Product Context

- **What it is:** one platform replacing the scattered tools a law firm currently uses — drafting, DMS, billing, workflow — orchestrated by AI agents rather than bolted-on AI features.
- **Who uses it:** lawyers, paralegals, firm admins/partners, and (in scoped portal views) the firm's own clients.
- **Deployment shape:** white-label, multi-tenant. Every visual reference to "the firm" in this file means a *placeholder* tenant — see §10.
- **Bilingual:** Arabic and English, both first-class, not a translated afterthought. See §12.
- **Reference points:** Harvey and Legora for the sleek, restrained "serious legal software" register; Microsoft Office/Outlook for information density and navigation patterns this audience already has muscle memory for; ChatGPT for how AI-agent conversation and streaming output should feel. None of these are copied wholesale — see §7 for where SynQanun should diverge.

---

## 1. Visual Theme & Atmosphere

**Mood:** calm authority with a live current of AI underneath it. The interface should feel like a well-run law office, not a startup dashboard — generous whitespace, restrained color, information presented once and clearly rather than decorated. The one place energy is allowed to show is anywhere the AI agent is actively working: that's where the brand's red→black gradient and the feather motif get to move.

**Density:** medium-high. This audience (Office/Outlook power users) is comfortable with dense toolbars, multi-pane layouts, and data tables — don't over-simplify into a consumer-app sparseness that would force extra clicks to reach frequently-used tools. Density should read as *organized*, not *cramped*: achieved through a disciplined spacing scale (§5), not smaller text.

**Where SynQanun should not look like its references:** Harvey/Legora skew minimal-to-sparse because they're single-purpose drafting tools; SynQanun Suite is a full operating system for a firm and needs Office-level navigational structure. Don't strip out the persistent sidebar/command-bar structure in the name of "sleekness" — that would cost users the multi-module orientation they need.

---

## 2. Color Palette & Roles

All hex values inherited from `brand-guidelines.md` §3.

### Brand
| Token | Hex | Role |
|---|---|---|
| `syn-red` | `#EB1C24` | Primary actions, active nav state, the "hot" end of brand gradient |
| `syn-garnet` | `#3D0709` | Hover/pressed state of red, gradient terminus, dark decorative accents |
| `syn-ink` | `#000000` | Logo reproduction only — do not use for UI text (see `gray-900`) |

### Neutrals
| Token | Hex | Role |
|---|---|---|
| `gray-50` | `#F7F7F8` | App canvas background |
| `gray-100` | `#EEEEF0` | Cards, panels, table row alternation |
| `gray-200` | `#DFDFE3` | Borders, dividers, input outlines (default state) |
| `gray-300` | `#C7C7CD` | Disabled borders |
| `gray-400` | `#A3A3AC` | Disabled text, decorative icons. Placeholder text takes `gray-500`: this step is 2.5:1 on white |
| `gray-500` | `#6B6B76` | Secondary/muted text, timestamps, metadata (AA on white, gray-50, gray-100 and a themed cream — see brand-guidelines §3.5) |
| `gray-600` | `#56565F` | Default body text |
| `gray-700` | `#3A3A42` | Headings, emphasized body text |
| `gray-800` | `#24242A` | Dark-mode surface |
| `gray-900` | `#131316` | Dark-mode canvas / primary UI "black" (never pure `#000`) |

### Accent & semantic
| Token | Hex | Role |
|---|---|---|
| `legal-navy` | `#1E3A5F` | Links, info banners, **all AI-agent surfaces** (chat panel, streaming responses, "agent working" states, suggestion chips) |
| `success` | `#1E7A4C` | Completed steps, confirmations |
| `warning` | `#B4740E` | Deadlines approaching, drafts pending review |
| `warning-text` | `#87570A` | Warning **text** on a warning tint (badges). `warning` itself is 3.4:1 there, under AA; this is the same amber at 75% and holds ≥ 4.8:1 on white, gray-50, gray-100 and a themed cream. |
| `error` | `#B23A32` | Validation errors, failed actions, destructive-action confirmation — **always with an icon + text label**, never color alone (see brand guide §3.4 for why this isn't `syn-red`) |

### Assignment logic (read this before generating any screen)
- **Red is for the human's actions.** Primary buttons, "this is active/selected," the firm's own CTAs.
- **Navy is for the AI's actions.** Anything the agent generated, is generating, or is suggesting. This split is load-bearing: a user should be able to tell, by color alone, whether something came from them or from the AI.
- **Black/ink is never a UI surface color** — only the literal logo. UI "black" is `gray-900`.

---

## 3. Typography Rules

Family roles inherited from `brand-guidelines.md` §4: **Cairo** (display, bilingual), **Inter** (Latin UI body), **IBM Plex Sans Arabic** (Arabic UI body), **JetBrains Mono** (references/IDs/citations).

| Level | Family | Weight | Size / Line-height (EN) | Notes |
|---|---|---|---|---|
| Display / page title | Cairo | 800 | 28px / 36px | One per screen, sentence case — never all caps |
| Section heading | Cairo | 700 | 20px / 28px | |
| Card/subsection title | Inter / IBM Plex Sans Arabic | 600 | 16px / 24px | |
| Body | Inter / IBM Plex Sans Arabic | 400 | 14px / 22px | Default for all prose, table cells, form labels |
| Body, emphasized | Inter / IBM Plex Sans Arabic | 500 | 14px / 22px | Use for the one value in a row that matters (a due date, a total) — not decoration |
| Caption / metadata | Inter / IBM Plex Sans Arabic | 400 | 12px / 18px | Timestamps, byline, helper text — `gray-500` |
| Reference / mono | JetBrains Mono | 400–500 | 13px / 20px | Clause numbers, doc IDs, invoice numbers, AI citations |

**Rules:**
- Sentence case everywhere — nav labels, buttons, headings. No tracked-out all-caps eyebrows (a common generic-AI-UI tell; explicitly avoid it).
- Arabic line-height runs ~10% taller than the Latin equivalent at the same size — Plex Sans Arabic needs the room; don't reuse the exact Latin line-height token for Arabic text blocks.
- Never set `syn-red` as a text color for body copy (fails contrast at small sizes) — red is for backgrounds/icons/borders, not paragraph text.

---

## 4. Component Stylings

**Buttons**
- Primary: `syn-red` fill, white text, 8px corner radius, `syn-garnet` on press/hover. Used once per view for the one main action.
- Secondary: `gray-50` fill, `gray-200` border, `gray-700` text.
- AI/agent action ("Ask SynQanun to draft this," "Regenerate"): `legal-navy` fill or outline — visually distinct from the red primary button so users never confuse "do this myself" with "ask the AI."
- Destructive: outline style with `error` text/border until a confirmation step, then solid `error` fill.

**Cards & panels**
- `gray-50`/white surface, 1px `gray-200` border, 8px radius, no drop shadow at rest. A soft shadow (`0 1px 3px rgba(19,19,22,0.08)`) only on elevated/floating elements (menus, modals) — see §6. Don't apply the same shadow to every card; flat + bordered is the default resting state, matching the "calm, not glossy" theme.

**Tables** (heavy use — billing, DMS, matter lists)
- Row height 44px, `gray-100` zebra striping optional for long tables, `gray-200` horizontal dividers only (no vertical grid lines — Office-style, not spreadsheet-style).
- Sortable column headers: `gray-500` label, `gray-700` on active sort.

**AI Agent Chat Panel** (ChatGPT-inspired, adapted)
- Docked side panel or full-screen mode, `legal-navy`-tinted surface (`legal-navy` at ~6% opacity as background wash, not solid).
- Agent messages: feather glyph (small, static, brand gradient) as the sender avatar — always, in every tenant, regardless of white-label client.
- Streaming text: appears progressively, not via a bouncing-dots spinner alone — pair with the feather's subtle pulse animation (§ brand guide 5) so the brand is present during the wait, not just a generic loader.
- User messages: right/end-aligned (or start-aligned in RTL — see §12), `gray-100` bubble, no avatar needed (already their session).

**Command bar / ribbon** (Office-inspired, for the Drafting module specifically)
- A persistent top toolbar grouping formatting, AI-assist, and review tools — familiar to Word/Outlook users. Avoid Harvey/Legora's minimal single-toolbar-hides-until-hover pattern here; this audience expects tools visible, not discovered.

**Navigation**
- Persistent start-aligned sidebar: module switcher (Drafting, DMS, Billing, Workflow, Dashboard) + tenant/client logo slot at top (§10) + SynQanun feather mark as the collapsed-state icon.
- Active module: `syn-red` left-border indicator (right-border in RTL) + `gray-100` background, not a filled red tab (keeps red rare/meaningful rather than everywhere).

---

## 5. Layout Principles

- **Base unit:** 4px. Spacing scale: 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64.
- **Grid:** 12-column, 24px gutters on desktop (≥1280px); content max-width 1440px, centered, with the persistent sidebar fixed outside that measure.
- **Alignment:** start-aligned (left in LTR/English, right in RTL/Arabic) for all text and form content — never centered body copy or centered form labels; centering is reserved for empty states and modals only.
- **Whitespace philosophy:** density comes from *organization* (clear sections, consistent row heights, grouped toolbars) not from shrinking spacing. When in doubt, add space around a group of related items rather than between every individual item — group, then breathe.

---

## 6. Depth & Elevation

Three levels only — resist adding more:

| Level | Use | Shadow |
|---|---|---|
| 0 — Resting | Cards, panels, table rows | none (border only) |
| 1 — Raised | Dropdowns, popovers, tooltips | `0 1px 3px rgba(19,19,22,0.08)` |
| 2 — Overlay | Modals, the AI chat panel in floating mode | `0 8px 24px rgba(19,19,22,0.16)` |

No colored shadows, no glow effects on the red or navy accents — glow reads as "gamified," which fights the calm-authority theme.

---

## 7. Do's and Don'ts

**Do**
- Let `legal-navy` carry every AI-originated element consistently — it's the tell that lets users trust what's human vs. AI-authored.
- Keep the feather mark's animation subtle — a slow pulse or a short traced stroke, under ~1.5s loop. It should read as "alive," not "loading spinner cosplay."
- Default to Office/Outlook-familiar patterns for navigation and document editing; default to ChatGPT-familiar patterns only inside the AI chat panel itself.
- Use real legal content in mockups (matter names, clause numbers, firm-realistic billing line items) — generic "Lorem Ipsum" or "Project Alpha" placeholder content undercuts the credibility this product is selling.

**Don't**
- Don't use `syn-red` for anything AI-generated — that collision is the single most important rule in this file.
- Don't add a tracked-out all-caps eyebrow label above section headings ("MATTERS", "BILLING OVERVIEW") — sentence case, no decoration.
- Don't apply the same rounded-card-plus-soft-shadow treatment to everything — it's the generic SaaS-template look this product should read as more serious than.
- Don't center-align body text, table content, or form labels.
- Don't let a client's white-label accent color (§10) appear anywhere near the AI agent's surfaces or the primary action color — see brand guide §7.2.
- Don't mirror the SynQanun or client logo for RTL — logos never flip; only layout and directional icons do.

---

## 8. Responsive Behavior

| Breakpoint | Range | Behavior |
|---|---|---|
| Desktop | ≥1280px | Full sidebar + multi-pane (e.g., document list + preview + AI panel open simultaneously) |
| Tablet | 768–1279px | Sidebar collapses to icon rail (feather + module icons only, labels on hover/tap); AI panel becomes an overlay rather than a persistent pane |
| Mobile | <768px | Bottom tab bar replaces sidebar entirely; AI chat becomes its own full-screen module rather than a panel; tables convert to stacked cards (row → card, columns → labeled rows) |

Touch targets ≥44px on tablet/mobile. The command/ribbon bar (§4) condenses to an overflow menu below 1024px — don't try to horizontally scroll a full ribbon on small screens.

---

## 9. Agent Prompt Guide

Quick reference for prompting Stitch (or any agent reading this file):

**Color quick-reference:**
```
Primary (human actions):     #EB1C24 (syn-red)
Primary hover/press:         #3D0709 (syn-garnet)
AI / agent surfaces:         #1E3A5F (legal-navy)
Canvas background:           #F7F7F8 (gray-50)
Card background:             #FFFFFF or #EEEEF0 (gray-100)
Border/divider:               #DFDFE3 (gray-200)
Body text:                    #56565F (gray-600)
Heading text:                 #3A3A42 (gray-700)
Success / Warning / Error:    #1E7A4C / #B4740E / #B23A32
```

**Ready-to-use prompts:**
- *"Generate the Drafting module main screen: Office-style ribbon toolbar at top, document canvas center, AI agent chat panel docked on the [end] side with legal-navy tinted background and feather avatar on agent messages. Sentence case throughout, no colored shadows."*
- *"Generate the Billing dashboard: dense table of invoices (JetBrains Mono for invoice numbers and amounts), status pills using success/warning/error tokens with icon + label, one syn-red primary button top-right for 'New invoice.'"*
- *"Generate the tenant login screen using the white-label template: {{CLIENT_LOGO_LIGHT}} above the fold, SynQanun feather + 'Powered by SynQanun' credit fixed at the bottom, {{CLIENT_ACCENT}} as a subtle background wash only, no other client branding."*
- *"Generate this screen in Arabic/RTL: mirror layout direction and directional icons only, keep both logos unmirrored, apply IBM Plex Sans Arabic at 10% taller line-height than the Latin spec."*

---

## 10. White-Label Tokens

SynQanun Suite is a template system — no client's actual logo or color belongs in this file (see `brand-guidelines.md` §7). Every tenant-specific value is a placeholder, resolved at runtime by the product's tenant configuration:

```
{{CLIENT_NAME}}
{{CLIENT_LOGO_LIGHT}}     /* transparent-background SVG/PNG for light surfaces */
{{CLIENT_LOGO_DARK}}      /* variant for dark-mode surfaces */
{{CLIENT_ACCENT}}         /* optional; falls back to gray-200 when absent */
{{CLIENT_DOMAIN}}
{{CLIENT_ABOUT_TEXT}}     /* content token, not a branding slot — see 10.1 */
```

**Where these may render** (exhaustive — nowhere else):
1. Login/splash screen — `{{CLIENT_LOGO_LIGHT/DARK}}`, sized secondary to the SynQanun mark.
2. Sidebar top slot — small `{{CLIENT_LOGO_LIGHT/DARK}}`, never larger than the feather mark beside it.
3. Exported client-facing documents (invoices, contracts, portal) — `{{CLIENT_LOGO_LIGHT}}` in the document header.
4. Client portal background wash / card border only — `{{CLIENT_ACCENT}}` at low opacity, never on buttons or AI surfaces.

That list governs **branding** — where a client's logo and accent colour are permitted to appear. It mirrors `brand-guidelines.md` §7.1 and remains exhaustive. `{{CLIENT_ABOUT_TEXT}}` is not on it and is not an exception to it: it carries no logo and no colour, so it has nothing to place.

### 10.1 `{{CLIENT_ABOUT_TEXT}}` — a content token

A **content token** is tenant-authored prose rendered inside an otherwise standard SynQanun layout. It is governed by this section, not by the four branding locations above, and it never changes how a screen is structured, coloured or laid out — only what words sit inside a component the design system already defines.

It resolves to four fields, each keyed by locale (`en` / `ar`), because Arabic copy is never a shortened version of the English (`brand-guidelines.md` §6):

```
{{CLIENT_ABOUT_TEXT}}
  ├─ tagline         /* firm descriptor under the firm name, e.g. "Advocates and legal consultants".
  │                     The per-screen context that follows it ("Client access", "Client onboarding")
  │                     is PRODUCT copy and lives in the translation dictionaries, not here. */
  ├─ headline        /* one sentence-case line above the body copy. Display scale, §3. */
  ├─ about           /* the firm's own description. Body scale, one to three sentences. */
  └─ practiceAreas   /* short list of practice areas, rendered as caption-scale metadata */
```

**Where it may render** (extend this list as screens claim it — do not assume a new screen inherits it):

1. **Client Gateway** — `headline`, `about` and `practiceAreas` in the firm panel; `tagline` in the header bar.

**Rules**

- Sentence case, and subject to §3's type scale like any other copy — a tenant supplies words, not formatting. No markup, no inline styling, no all-caps.
- It is client-facing only. It must never appear on a staff-side screen, and never inside an AI-agent surface.
- Never rendered in `syn-red`, `legal-navy` or `{{CLIENT_ACCENT}}`. It is body copy: `gray-600`, with headings in `gray-700`.
- Both locales are required. A tenant that supplies only English has an incomplete configuration; fall back to omitting the block rather than rendering one language into the other's screen.
- Length is not unbounded. `headline` is one line, `about` is a short paragraph. The Client Gateway's panel is a card, not a CMS page — long copy belongs on the firm's own website, which `{{CLIENT_DOMAIN}}` already points at.

Fixed, non-templated, in every tenant: the feather mark, `legal-navy`, the "Powered by SynQanun" credit (main app footer + every exported document + login screen), and all typography.

`syn-red` is fixed in **accent mode**, which is everything §10 described until §10.2 — and is the one thing §10.2 is allowed to change. See below.

### 10.2 Themed-tenant mode

§10 above assumes one kind of tenant: SynQanun's product with a guest logo and, optionally, a guest colour on a card border. **Themed mode** is a second kind, granted per tenant rather than assumed, in which the firm's palette owns the canvas, the chrome and the primary action.

It exists because the accent slot could not carry a firm whose brand is the product's whole surface — a tenant whose identity is a gold-and-charcoal house style does not read as itself with a red primary button on a gray-50 canvas, and the only way to get there under §10's rules was a hundred per-screen overrides, which is the drift this document exists to prevent.

**How a tenant gets one.** `fixtures/firm.ts` carries a `theme` object, or `null`. Null is accent mode and remains the default. The locale layout renders the theme as CSS custom properties on `<html>`; `app/globals.css` maps them onto the product's own token names, each with the SynQanun value as its fallback. A component is written against the token and is correct in both modes.

**The five tokens, and why there are five rather than one.** A single brand colour does not survive contrast measurement. The palette is split by *what a colour may carry*:

| Token | Carries | Must measure |
|---|---|---|
| `ornament` | Hairlines, rules, decoration, large flat shapes | nothing — see below |
| `action` | Filled buttons, with white text | ≥ 4.5:1 against white |
| `ink` | Dark chrome; body text on canvas | ≥ 4.5:1 both on canvas and against `onDark` |
| `canvas` | The app background | — |
| `onDark` | Labels sitting on `ink` | ≥ 4.5:1 against `ink` |

**`ornament` is not a text colour, and there is no token that makes it one.** A firm's brand gold is typically 2.5–3:1 on its own light canvas: below 4.5 for text, and below even the 3:1 that WCAG 1.4.11 asks of a *meaningful* UI component. It may draw a rule or a decorative mark. An icon that carries meaning, a focus ring, or any state a user must perceive takes `action` or `ink`.

**What themed mode changes that accent mode does not:** the canvas, the chrome surfaces, the corner radius of dashboard tiles, and `syn-red` as the primary action — replaced by `action`. That last one is the significant grant, which is why it is per tenant and written down here.

**What it does not change, in any mode:**

- The feather mark and the brand gradient it animates in.
- `legal-navy` and every AI-agent surface. A themed tenant's gold never touches the assistant, the Digest, a suggestion chip or a streaming response — the human/AI colour split (§2) survives theming intact, and it is the reason a reader can still tell what came from the machine.
- `success`, `warning`, `error`, `info`. A status token means the same thing in every tenant; a firm does not get to decide what "overdue" looks like.
- The "Powered by SynQanun" credit, in all three of its locations.
- Typography. A tenant supplies colours, not type — and no tenant typeface is adopted until the font files are supplied and licensed.

**No gradients, no glow, no glassmorphism** on a themed surface. §2's one sanctioned gradient belongs to the feather.

#### Logo hierarchy — inverted, and this is the other significant grant

§10's branding list says the tenant logo is "sized secondary to the SynQanun mark" on login and splash, and "never larger than the feather mark beside it" in the sidebar. **In themed mode that inverts.**

The tenant's mark is the **primary** mark on the login, the gateway, the splash and the sidebar's top slot. SynQanun is present on all of them, but as the fixed "Powered by SynQanun" credit rather than as a competing lockup.

This follows from what themed mode already is. A tenant whose palette owns the canvas and the primary action, showing a *subordinate* version of its own logo above a dominant SynQanun lockup, reads as neither firm's product. The accent-mode rule exists because in accent mode SynQanun *is* the visible brand and a guest logo must not outweigh it; once the surface is the tenant's, the same rule produces the opposite of its intent.

Precise, because "primary" is otherwise an argument:

- **Login, gateway, splash** — the tenant lockup is the largest mark on the screen. No SynQanun lockup appears beside it. "Powered by SynQanun" sits in the footer at caption scale, per §7.2, and is not a toggle.
- **Sidebar top slot** — the tenant mark, in the variant that suits the surface: on a charcoal sidebar that is the gold-on-dark lockup, and the mark alone when the rail is collapsed. The feather does not sit beside it competing for the slot.
- **Everywhere the feather already means something, it is unchanged.** The feather is the AI's identity (§2, brand-guidelines §5) — on agent avatars, "working" states and AI surfaces. Themed mode moves the tenant's logo up the hierarchy in the three *branding* slots; it does not give the tenant the feather, recolour it, or let a tenant mark stand in for it anywhere it signifies the agent.
- **Exported client-facing documents** keep §10's rule unchanged: tenant logo in the header, SynQanun credit in the document. An export leaves the product and is read by people who never saw either brand in context.

#### Split sign-in

A themed tenant's splash (as a portal chooser) and both gateways render as a split screen: a canvas side holding the tenant lockup and a dark `ink` card with an `ornament` hairline, and a decorative panel taking about a quarter of the width on the **inline end** (right in English, left in Arabic). The panel's artwork does not mirror; logos never flip (§12).

- **The panel is decoration.** It carries no text and no state, is hidden from assistive technology, and is dropped below tablet width. Its colours are the theme's: a stone darkened from `ink`, with `ornament` veins and edge rule. It has no gradient and no glow. The tenant mark carved into it is shaded inside its own outline, not with a drop shadow.
- **The texture is a tenant slot.** `theme.authPanel.texture` takes a supplied image. Null renders a CSS/SVG stone, which stays the fallback for any tenant without a file.
- **Meezan's texture is a placeholder.** `public/brand/meezan/auth-stone.webp` (800×1800, about 30 KB, tiles seamlessly) is a stand-in generated by `scripts/generate-auth-stone.py`: charcoal from `ink` and veins in `ornament` and `action-pressed`. The client's own marble has not been supplied, and the copy inside their mockup can't be used because it is a 1240px screenshot with the M baked in. When the real file arrives, replacing it is a one-line change: point `theme.authPanel.texture` in `fixtures/firm.ts` at it, or overwrite the .webp. The carved M and the gold edge rule always draw on top. The panel carries no text. The M's gold rim measures at least 3.19:1 against the stone under it at 1024, 1440 and 1920 wide (median 5:1), which meets the 3:1 non-text contrast minimum (WCAG 1.4.11). Recheck that ratio against any replacement texture.
- **Inside the dark card:** labels and values are `onDark`, secondary copy is white at 80%, and field borders are white at 50% (≥ 3:1 against both the card and the field). Focus rings switch to `onDark`. The primary button is still `action` with white text; `ornament` may border it but may not fill it behind text.
- **The credit stays.** "Powered by SynQanun" sits in the frame's footer at caption scale, as everywhere else in §7.2.

#### Splash and loading

A themed tenant's mark animates in two places, both drawn from the tenant's own mark and lockup files, never redrawn and never a video.

- **Splash.** Over the portal chooser, the first time it is shown in a session (about 2.5 s, then the overlay lifts). On a flat `ink` field, a gold core appears, hairline rays draw outward from it and fade, the mark's outline draws in and fills, and the lockup slides to centre while its wordmark is uncovered. "Powered by SynQanun" fades in beneath, the only SynQanun presence. Any click or key skips it. sessionStorage remembers it; when storage is blocked it can replay on a full reload but never on client-side navigation.
- **Loading.** The mark alone, looping (outline draws, fills, fades), with a visible "Loading…" label carrying the state, since gold on the canvas is under 3:1. It sits under the gateway, staff and client `loading.tsx` boundaries. In accent mode those boundaries render nothing.
- **Motion budget.** Opacity, transform and stroke-dashoffset only. No gradient, glow, shadow, blur or particle effect. The artwork never mirrors, so neither does its motion: the wordmark is always uncovered from the mark outward, in both locales.
- **Reduced motion.** No splash and no delay, since the chooser already leads with the static lockup. The loader shows the finished mark, still.

---

## 11. Module / Screen Inventory

For scoping individual Stitch generations. Each should be prompted as its own screen referencing this file:

1. **Dashboard** — cross-module overview: upcoming deadlines, active drafts, billing snapshot, "agent activity" feed.
2. **Drafting** — ribbon + document canvas + AI panel (see §9 prompt example).
3. **DMS (Document Management)** — folder/matter tree (start-aligned rail), document list/table, preview pane.
4. **Billing** — invoice table, time-entry capture, payment status.
5. **Workflow / AI Agents** — visual list or board of automated workflows/agents, each with status, last run, and a "what did the agent do" log (this is where AI transparency matters most — always show agent reasoning/sources, never a black box).
6. **Client Portal** (client-facing, white-label-accented per §10) — scoped view: shared documents, invoices, matter status only, no internal firm data.


### 11.1 Client amendments — October 2026 (Meezan meeting)

Applied to the staff workspace, one commit each. Every item below is demo state where it writes anything, and says so on screen.

- **One Legal matters register, typed.** Every legal matter carries a kind of work, `MatterWorkType` (`lib/matter-work-types.ts`): قضية / Case, استشارة / Consultation, عقد / Contract, تنفيذ / Enforcement, مشروع آخر / Other project. These are the five values the client's mockup uses in its "نوع العمل" columns (archive, dashboard, reports); its plural forms (القضايا، الاستشارات، العقود، التنفيذ، المشاريع الأخرى) are the sidebar's and appear in the filter. The register has a "نوع المسألة / Matter type" filter (`?type=`), a neutral type badge on each row and on the file, and the New matter form requires it. **The mockup's sidebar also lists الجلسات (hearings) and الوكالات (powers of attorney); neither is a kind of file there.** Hearings are a calendar of the cases' sittings, and powers of attorney are a register whose rows link to files. So they are not type values.
- **No Projects section.** The staff nav and routes have no Projects register. Former projects are served on the matters register as "Other projects" (`staff.matters` in `lib/mock-api.ts`). Their records stay in `fixtures/projects.ts`, unedited, so the Saudi-mapping rows are untouched. Their files open at `/staff/matters/PRJ-…` with their own words for registry and target. Every old `/staff/projects…` URL 307-redirects to `/staff/matters?type=otherProject` (`next.config.ts`). The client portal's projects screens are unchanged.
- **Active | Archive.** Closed matters leave the main list for an Archive tab inside Legal matters (`?view=archive`; the mockup's "القائمة | الأرشيف" pill). It shows each file's closed date, derived from its last movement because the seeds carry no closing date. "Closed" is no longer a segment. Partners can reopen a file from the Archive or from the file (`canReopenMatter`). A reopening is a session overlay read everywhere, marked "Reopened this session". The search overlay badges archived results.
- **Dashboard.** The partner's legal-matter and project count tiles are gone. Every rank's grid was measured at 1440 and 1024 and has no short rows; the hours bars take half the tablet row beside the hours ring (`BentoCell tabletHalf`).
- **Inbox in the top bar.** The unified inbox left the sidebar (and so the phone tab bar). The staff top bar has an envelope beside the bell, badged with the same unread count the dashboards read. The dashboard nav entry matches `/staff` exactly, so no entry is lit on the inbox.
- **Team access** (Settings, partner only). Lists who can sign in, gives access back, and removes access behind a confirmation dialog: the outline destructive button opens it, and only the confirm inside is a solid error fill. Every change writes a visible audit line (who, by whom, when, this session). Your own row has no remove control. The tab is absent for other ranks and the route and action refuse them.
- **Meetings: "Join in Teams".** A placeholder slot (`components/meetings/TeamsJoinSlot.tsx`) on every upcoming meeting in the calendar's entry panel and every upcoming conference on a matter's record, marked "Teams connection: demo". Pressing it explains that Teams is not connected; it opens nothing. **It uses a plain video glyph, not the Teams logo**: Microsoft's mark is a third-party trademark and its purple is not a tenant token.
- **AI reports: Send.** On the matter report, choose On platform / Email / WhatsApp, read a preview of what the client receives, and send for a partner's approval (`canApproveReportSend`). The preview is the client's version: status, next step, what is waiting on them; internal figures are left out and the screen says so. Channel chips read "Awaiting partner approval", then "Queued: demo". Nothing is sent. The practice summary is firm-internal and is not sendable.


### 11.2 Scans to editable text (OCR), in the browser

- **Where.** Document Canvas has an "Upload a scan" control, and the canvas gains an OCR mode (`?source=ocr&id=…`). No new screen. The staff side had no document upload before this, and the canvas held placeholder blocks rather than a markdown editor. The OCR mode is that editor: one right-to-left or left-to-right paragraph per scanned line, beside the original page image.
- **Nothing leaves the browser.** pdf.js (its legacy build) renders pages, tesseract.js reads them with tessdata_fast Arabic and English, and the result is kept in IndexedDB (the five most recent). Every piece of the reader is served from this site's `/ocr/`; the language data is committed under `public/ocr/tessdata/`, and the engines are copied from node_modules at build time (`scripts/copy-ocr-assets.mjs`). Both the dialog and the canvas say this in words.
- **Honest about quality.** Before a file is chosen, the dialog says handwriting and poor scans may read badly. Words under 75% confidence are tinted and dotted-underlined (never colour alone), with the count stated per page. The canvas also says to check the text against the original, because confident misreads happen: see `docs/ocr-accuracy.md` for the measured figures on the sample scan (`fixtures/ocr-sample.ts`).
- **Export.** .docx built in the browser with `docx`: right-to-left (`bidirectional`) paragraphs and `rightToLeft` runs for Arabic lines, complex-script font Sakkal Majalla, Latin Calibri, and a page break per scanned page.
- **Word / Microsoft Graph.** A labelled, inert slot (`data-slot="microsoft-word-graph"`, `lib/ocr/word-integration.ts`) that describes the intended OneDrive upload. Not built. When it is, it sends the file to Microsoft, so it must carry its own sentence and not the "never leaves your browser" one.

---

## 12. Bilingual (AR/EN) & RTL Rules

- Full mirroring in Arabic: sidebar moves to the right, start-aligned text flips accordingly, directional icons (chevrons, arrows, "back") flip — **logos never flip** (brand guide §2.5).
- Use CSS logical properties (`margin-inline-start`, not `margin-left`) throughout — hard left/right values will break on locale switch.
- Numerals: use Western (0–9) digits in both languages for dates, currency, and IDs — standard practice in Egyptian/GCC legal and financial documents; don't switch to Arabic-Indic numerals even in full-Arabic screens.
- Language toggle lives in the top nav, persistent, never buried in a settings screen.
- Mixed-direction content (an Arabic matter name containing a Latin case citation) should isolate the embedded run's direction rather than let it drag the surrounding text's alignment — flag this explicitly to Stitch when a screen mixes scripts in one field.

---
*Source of brand tokens: `brand-guidelines.md`. Update tokens there; this file inherits, not duplicates, brand decisions.*
