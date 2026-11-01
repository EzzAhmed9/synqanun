# SynQanun Suite — Track A prototype

Bilingual (EN/AR, LTR/RTL) legal-tech platform. This repo is **Track A** from
`BUILD_PLAN.md`: a clickable prototype with real code, a real component library
and real navigation, but mocked data and honestly-labelled fake AI/integration
behaviour.

`BUILD_PLAN.md` runs three tracks. **Track A** is this prototype. **Track A.5**
is still solo and makes the backend real — Postgres, real authentication and
role-based access, real CRUD routes, real LLM calls. **Track B** is the dev
team: third-party integrations and the multi-tenant security hardening pass.
When a `// MOCK:` comment names a track, it means the one that turns it real.

**Current state: Batches 0–7 complete.** 57 screens across three route groups —
16 pre-auth, 12 client portal, 29 staff workspace — plus a catch-all 404. Every
screen is built in both languages and mirrors under RTL.

## Run it

```bash
npm install
npm run dev
```

There is no fake sign-in to get through — the prototype has no authentication
at all (that is Track A.5), so every route is reachable directly:

| Where | English | Arabic |
|---|---|---|
| Landing | `/en` | `/ar` |
| Client portal | `/en/dashboard` | `/ar/dashboard` |
| Staff workspace | `/en/staff` | `/ar/staff` |
| Firm onboarding | `/en/onboarding` | `/ar/onboarding` |

The staff workspace renders as whoever `SIGNED_IN_STAFF_ID` names in
`fixtures/practice.ts` — a partner by default. Change that constant to see the
other four rank dashboards and the nav, routes and controls each rank gets.

Requires Node 18.18 or newer. `npm run build` needs network access the first
time, because the four typefaces are fetched and self-hosted at build time.

## What to check when something changes

Every screen has to survive all of this, and most regressions in this codebase
have been one of the first four:

| Check | What you should see |
|---|---|
| Both locales | Open `/en/...` and `/ar/...`. Key parity is enforced by hand: `en.json` and `ar.json` carry the same 1,960 keys |
| RTL mirrors | Sidebar, tab bars, table columns and directional icons all swap edge. Logos never mirror |
| Adornment overlap | Icons inside inputs and badges use logical properties (`ps-`/`pe-`/`[inset-inline:0]`), never `left`/`right` |
| Arabic plurals | ICU has six categories in Arabic (`=0/one/two/few/many/other`). A message with only `one`/`other` is wrong at 2 and at 3–10 |
| Three breakpoints | Full sidebar above 1280px, 64px icon rail 768–1279px, bottom tab bar below 768px (`design.md` §8) |
| Digits | Western 0–9 in both languages — `ar-EG-u-nu-latn`, see `lib/format.ts` |
| Red vs navy | Every red control is a human action; every navy one is the product's own voice |
| No invented claims | No confidence score, no fabricated statute or case, no fake success state. See `fixtures/legal-database.ts` and `staff/ai/AIDemoNotice.tsx` for the standing arguments |

`npx tsc --noEmit` and `npm run build` both have to be clean before a commit.

## Layout

```
app/
  [locale]/            → locale segment; layout here sets <html lang dir>
    (auth)/            → landing, gateways, onboarding, invites, resets
    (client)/          → client portal
    (staff)/           → staff workspace, scoped by rank
    [...rest]/         → catch-all 404
    error.tsx          → locale-tree error boundary
    not-found.tsx      → translated 404
    WorkspaceHome.tsx  → picks which workspace those two send you back to
  global-error.tsx     → last boundary; catches the root layout itself
components/
  brand/               → Logo, FeatherMark, PoweredBy, asset registry
  chrome/              → Sidebar, BottomTabBar, TopBar, TimerPill, TenantFooter
  ui/                  → Button, Card, Badge, Table, Tabs, Modal, EmptyState
  ai/                  → ChatPanel, StreamingText, SourceChip
  auth/  onboarding/   → screen-specific pieces for those two flows
  providers/           → UIStateProvider (sidebar collapse, timer)
lib/
  mock-api.ts          → THE TRACK A ↔ TRACK B SEAM. Every read and write
  design-tokens.ts     → TS mirror of the design system
  format.ts            → dates, money, clock times, the bidi rules
  ranks.ts             → the five ranks and what each may do
  i18n/                → routing, request config, en.json, ar.json
fixtures/              → 18 files; the demo's entire world
public/brand/          → the three real brand assets
```

## Where the design system lives

`brand-guidelines.md` → `design.md` → `app/globals.css` → `lib/design-tokens.ts`.
Authority runs in that order. To change a colour or typeface, edit
`brand-guidelines.md` first and let the change flow down — never patch a value
in `globals.css` alone.

Tailwind v4 is configured **CSS-first**: the `@theme` block in
`app/globals.css` *is* the theme config, and there is no `tailwind.config.ts`.
That block clears Tailwind's stock palette entirely, so only tokens
`design.md` defines are available as utilities — `bg-blue-500` simply will not
compile, which is deliberate.

`lib/design-tokens.ts` mirrors the same values for consumers that cannot use a
Tailwind class (charts, inline SVG, OG images). If the two ever disagree,
`globals.css` wins.

Dark mode is **not built** — `design.md` defers it to a future phase. The
neutral scale already reserves `gray-800`/`gray-900` for it, and
`app/globals.css` carries a commented block describing exactly what adding it
entails.

## Two rules that held for every batch

Both from `BUILD_PLAN.md`, and both exist so that neither Track A.5 nor the
Track B dev team has to reverse-engineer which code is load-bearing and which
is placeholder:

1. **No inline fake data.** Everything faked lives behind `lib/mock-api.ts` or
   in `/fixtures`. One file is what the dev team replaces.
2. **Every fake carries a `// MOCK:` comment** saying what the real version must
   do. `grep -r "MOCK:"` is the integration backlog — 197 of them today. By the
   end of Track A.5 that search should surface only Track B's scope
   (`BUILD_PLAN.md` §7).

A third rule emerged during the build and is worth stating: **a write either
happens or is refused out loud.** `BUILD_PLAN.md` §5.1 splits every form by what
it asserts — a record inside the firm's own workspace writes to session state
and says so; anything claiming to have left the building (mail, money, a
commitment on a third party's behalf) is a stated no-op. Nothing fakes success.

## Not yet done

- **Vector brand masters** — see `public/brand/README.md`. The three PNGs are
  the only assets; print and large-format reproduction need the originals.
- **A non-null `{{CLIENT_ACCENT}}`.** The slot is fully wired — onboarding sets
  it, `firmAccent()` reads it, the client gateway renders the stripe — but
  `demoFirm.accent` is `null`, so only the documented gray-200 fallback is ever
  exercised by the shipped fixture.
- **The week grid below 768px.** Seven columns give each day about 37px, which
  is unreadable with or without an overlapping meeting. The answer is not to
  render a seven-day time grid on a phone at all, which is a design decision
  rather than a layout fix.
- **`initialsOf` collisions.** Two live pairs (Rami/Rana Al-Khatib → RA,
  Salem/Salma Al-Hashemi → SA). Deliberately not fixed: no call site renders
  initials as the sole identifier of a person who could be confused with
  another — every avatar has the full name beside it. Longer initials cannot
  separate Salem from Salma without four letters, and a per-person colour
  collides with `design.md` §2's colour reservation.
- **Document bodies.** There are none, anywhere, and that is load-bearing
  rather than missing: it is why the canvas marks up a placeholder, why version
  history is metadata-only, and why no redline exists. Real storage is Track
  A.5.
