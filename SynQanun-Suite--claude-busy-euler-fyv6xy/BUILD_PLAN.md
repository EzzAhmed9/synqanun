# SynQanun Suite — Build Plan (Stitch → Claude Code)

## Who's building what

Track A (the prototype below) is built solo, with Claude Code, working
through the batches sequentially — no need to parallelize since it's
one person, one thread of work. Once Track A's screens are done, the
same solo Claude Code effort continues into **Track A.5** (below) —
a real backend, still built before the dev team gets involved. Track B
— third-party integrations and security hardening — is the dev team's
job, reviewing and building on top of what gets produced here.

That handoff is the reason this plan insists on clean seams between
"fake for the demo" and "real, later": the dev team shouldn't have to
reverse-engineer which parts of the code are load-bearing and which are
placeholder. Two rules, applied consistently through every batch below:

- Every faked piece of data or behavior lives behind the `lib/mock-api.ts`
  layer (or its i18n/fixture equivalents) — never inline fake data
  scattered inside components. One file (or one clearly-named folder) is
  what the dev team replaces; nothing else should need to change.
- Every place something is faked gets a `// MOCK:` comment stating what
  the real version needs to do (e.g. `// MOCK: replace with real Gmail/
  Outlook OAuth + message fetch`). Small overhead now, saves the dev team
  a full audit later.

## Three tracks, one codebase

**Track A — Clickable Prototype (build first).** Real code, real component
library, real navigation between all 64 screens, bilingual EN/AR with RTL,
responsive — but data is mocked (fixtures, not a database) and every
AI/integration feature is convincingly faked (canned but realistic
responses, no live LLM calls, no real Gmail/Zoom/payment APIs). Goal:
something you can hand someone a link to and they click through the
whole firm-and-client experience like it's real.

**Track A.5 — Real backend (build second, still solo).** Once every
screen exists and the demo is click-through-ready, the same solo effort
continues into making the backend genuinely real, before any dev team
involvement:
- A real database (Postgres — Supabase or Neon both work well with
  Next.js) replacing the fixture files, with actual persistence.
- Real authentication (NextAuth or Clerk) replacing the fake login
  screens, with real sessions and role-based access matching the 5
  staff ranks + client + admin.
- Real CRUD API routes for matters, clients, invoices, documents, etc.,
  enforcing the same permission rules the UI already assumes (e.g. a
  Junior Associate's API access should be as scoped as their dashboard
  already implies).
- Real AI integration for Digest, AI Assistant, and AI Reports — this
  is genuinely accessible solo (an API key, not a business-verification
  process), unlike the integrations below.

This is deliberately still "you and Claude Code," not the dev team —
it hands them a real, persisted, working backend to review and harden,
rather than starting them from zero.

**Track B — Dev team.** What's left after Track A.5, and why it's
being left rather than attempted solo:
- **Third-party integrations** — Gmail/Outlook OAuth, Zoom/Teams/Meet,
  e-signature, payment gateways. These aren't primarily a coding
  problem: real API access usually requires business verification with
  each provider, and sensitive scopes (reading someone's email) often
  trigger a security review process that takes weeks regardless of who
  writes the integration code. Solo effort doesn't remove this delay.
- **Security/compliance hardening** for the multi-tenant, white-label
  architecture specifically — this product will hold privileged legal
  documents and client financial data across multiple firms on shared
  infrastructure. Tenant isolation mistakes are expensive to unwind
  once real client data is involved, so this genuinely benefits from a
  second set of eyes before that happens, not just a coding pass.

This plan covers Track A in full, then Track A.5's additions on top of
it. Track B is the dev team's own scoping exercise once they're
handed a real backend to build integrations and hardening on top of.

---

## 1. Tech stack (recommended default)

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 15 (App Router) + TypeScript | Route groups map cleanly onto client-side vs. staff-side vs. rank; easy Vercel deploy for demo links |
| Styling | Tailwind CSS | Fast to keep consistent with DESIGN.md tokens as a theme config, which is the actual fix for the inconsistency issues we kept correcting in Stitch |
| i18n / RTL | `next-intl` for translation, native `dir="rtl"` + Tailwind logical properties (`ps-`, `pe-`, `ms-`, `me-`) — no separate RTL plugin needed at this Tailwind version | Matches DESIGN.md §12's logical-property requirement directly |
| Icons | `lucide-react` for the neutral UI icon set; the feather mark and both wordmarks stay as real image/SVG assets, never from the icon set | Keeps the "feather is exclusive to SynQanun" rule enforceable in code |
| Fonts | Self-hosted variable fonts: Cairo, Inter, IBM Plex Sans Arabic, JetBrains Mono | Avoids a Google Fonts runtime dependency for an on-prem-deployed product |
| State | React Context for cross-cutting UI state (language, sidebar collapse, active timer); no heavier state library needed for the prototype | Track B introduces real data-fetching state (React Query or similar) when a real API exists |
| Mock data | Typed JSON fixtures + a thin fake-API layer (`lib/mock-api.ts`) with artificial delay, so swapping to real endpoints later is a one-file change | This is the seam between Track A and Track B |
| Deployment | Vercel, password-protected (Vercel's built-in protection or a simple middleware gate) | Fast shareable demo links without exposing an unfinished, brand-carrying product publicly |

If there's already an infrastructure decision made elsewhere (existing backend team, a required stack, on-prem constraints beyond what's above), flag it now — the plan below assumes a green field.

---

## 2. Repo structure

```
synqanun-suite/
  app/
    (client)/            → client-side routes (dashboard, matters, etc.)
    (staff)/              → staff-side routes, further scoped by rank
    (auth)/               → splash, both gateways, invites, resets
  components/
    chrome/                → Sidebar, TopBar, TimerPill, DigestTrigger
    ui/                    → Button, Card, Badge, Modal, Table, Tabs...
    ai/                    → ChatPanel, StreamingText, SourceChip
  lib/
    design-tokens.ts       → generated from brand-guidelines.md + design.md
    mock-api.ts            → fake data layer, swappable for Track B
    i18n/                  → translation dictionaries (en.json, ar.json)
  fixtures/
    clients.json, matters.json, invoices.json, messages.json, ...
  public/
    brand/                 → synqanun logos, feather mark, {{CLIENT_LOGO}} placeholder
```

---

## 3. Build order — foundation first, screens after

Trying to assemble 64 screens before the shared pieces exist is exactly
how the Stitch inconsistencies happened (untranslated sidebars, missing
timer pills, mismatched structure). In code, build these once and every
screen inherits them automatically:

**Batch 0 — Foundation (do not skip ahead of this)**
1. Design tokens as actual Tailwind theme config + CSS variables — direct
   transcription of `design.md` §2–3's hex values and type scale.
2. Chrome components: Sidebar (with the collapse toggle and per-rank item
   visibility built as a prop, not copy-pasted per screen), TopBar (search/
   Digest/notifications/avatar as one component), floating TimerPill.
3. Core UI kit: Button (primary/secondary/AI-navy/destructive variants),
   Card, Badge (status tokens), Table, Tabs, Modal.
4. i18n/RTL scaffolding — wire up the language toggle and `dir` switching
   on one trivial screen (Splash) and confirm it actually works before
   scaling to 64 screens.
5. Mock data schema + fixtures for the core entities (clients, matters,
   projects, invoices, messages, users/ranks).

**Batch 1 — Auth & entry**
Splash, both Gateways, Accept Invite (**client only** — see §3.1),
password reset flows (client + staff), Firm/Tenant onboarding wizard.

### 3.1 Staff provisioning — scope correction

There is **no Accept Invite screen for staff**. It was in the original
Batch 1 line above and has been removed. Staff are provisioned by
temporary password instead:

1. **A temporary password is generated per person when they are added** —
   in the onboarding wizard's "Add your team" step, and later in
   Team/Roster's "Add team member" action. In the demo this surfaces as a
   confirmation in the wizard's review/launch step, e.g. "X team members
   will receive their temporary credentials by email". No mail is sent in
   Track A.
2. **Staff then sign in normally at the Firm Gateway** with their email and
   that temporary password. The existing sign-in form covers this; nothing
   new is needed.
3. **They change it via the ordinary staff password reset flow**, whenever
   they choose. There is no forced first-login change gate.

Consequences for screens not yet built:

- Team/Roster's per-row action is **"Resend temporary password"** for staff
  rows, not "Resend invite".
- Staff roster status values are **"Temporary password issued" / "Active" /
  "Deactivated"**. There is no "Invited — pending" state for staff.

The token-and-expiry invite flow stays exactly as built and is
**client-side only**: `fixtures/invites.ts`, `mockApi.invites.*`, and
`/invite/client`. Do not reuse it for staff.

> **Carry-forward, not a Track A blocker.** A temporary password with no
> forced change on first login is a minor security softness — same category
> as the 2FA and session-timeout questions §6 defers. It becomes real work
> in **Track A.5**, when real authentication replaces the fake login
> screens: that is the point at which a forced-change-on-first-login gate
> either gets built or gets consciously skipped. The **Track B** hardening
> pass then reviews the decision alongside 2FA and session timeout. Record
> it in `HANDOFF.md` (§7) when that file is written at the end of Track A.5.

**Batch 2 — Client core**
Dashboard, Matters (list+detail), Projects (list+detail), Documents,
Invoices (list+detail), Messages, Settings.

**Batch 3 — Client extras**
Payment confirmation, e-signature signing flow, notifications panel,
global search, Upload/Book-a-call modals, empty/error states.

**Batch 4 — Staff core**
Partner Dashboard, then the other 4 rank dashboards, Unified Inbox,
Calendar, Clients/CRM (list+detail), Matters/Projects (list+detail),
Billing & Quotes.

**Batch 5 — Staff AI & advanced**
Document Canvas, AI Reports, Approvals, Legal Database Search, AI
Assistant, Digest conversation interface.

**Batch 6 — Staff admin & forms**
Settings (Integrations, Firm settings, Team/Roster — see §3.1 for its
per-row action and status values, Activity log),
New Matter form, Add Client form, New Document type-picker, Time entry
modal, Invoice builder, Conflict-of-interest check, e-signature
request creation, invite-client-contact flow.

**Batch 7 — Polish**
Document version history, law full-text reader, non-editable document
preview, meeting transcript reader, bulk actions, remaining empty/error
states.

---

## 4. Using the Stitch output

Stitch's code export (React/Tailwind) is a reference for each screen's
layout, not something to paste in directly — it's what generated the
inconsistencies in the first place, and pasting 64 independently-
generated components would reproduce that in code. Per screen:

1. Open the Stitch export as a visual/structural reference.
2. Rebuild the screen in Claude Code using Batch 0's shared components —
   the Sidebar/TopBar/TimerPill/Button/Card come from the shared library,
   not from Stitch's version of them.
3. Wire it to the fixture data and mock-api layer instead of Stitch's
   static content.

This is naturally a Claude Code delegation pattern: point it at a
screen's Stitch export plus the relevant `design.md` section, and have
it produce the screen using the existing component library — one batch
at a time, so each batch's shared pieces are solid before the next
depends on them.

---

## 5. Making the prototype feel real (fake-it strategy)

- **AI Assistant / Document Canvas AI suggestions**: canned but varied
  responses with a realistic streaming-text delay, drawn from a small
  library of pre-written legal-sounding outputs per scenario — not one
  static string reused everywhere.
- **Digest**: a scripted conversation (2-3 branching paths) with a real
  waveform animation, not actual speech recognition.
- **AI Reports**: pre-written sample reports per scope/type combination,
  generated instantly for the demo rather than genuinely computed.
- **Meeting transcripts/minutes**: static realistic sample content tied
  to the demo's fixture meetings.
- **Integrations (email/calendar/Zoom/etc.)**: shown as already
  "connected" in fixture data — no real OAuth flow in Track A.

### 5.1 What a submitted form does — the write-layer rule

Settled before Batch 6, because it governs all nine of that batch's
screens and the seventeen controls across Batches 4–5 that were deferred
with the note "writes are Batch 6".

**The rule: it depends on what the action asserts, not on who is doing
it.**

1. **An action that creates or changes a record inside the firm's own
   workspace WRITES**, in session. New Matter, Add Client, time entry,
   new document, invoice draft, and the approvals queue's approve /
   request-changes / decline. These assert nothing about anyone outside
   the product: the record really does exist in the prototype's state for
   as long as the session lasts, so showing it is true rather than
   flattering.

2. **An action that asserts something left the building is a CLEAR
   NO-OP**, stated where the action was taken. Sending an invoice,
   requesting an e-signature, inviting a client contact, resending a
   temporary password, sending a report to a client. Mail, money, and
   commitments made on a third party's behalf.

This is the line Batches 2–3 were already drawing without naming it.
Every client-side flow that refuses to fake success — the unsent message,
the payment receipt, the saved setting, the uploaded file, the booked
call — is in category 2. None of them is refused for being a write; each
is refused for asserting an outbound act. `BookCallModal.tsx` puts it
most sharply: a confirmed booking "would commit a person who has never
heard of it".

So category 1 is not a relaxation of that standard. It is the same
standard, applied to actions that make no such claim.

**Session-scoped, and labelled as such.** Category 1 writes live in
memory in `lib/mock-api.ts`. They do not survive a server restart, and
two people viewing the same demo at once do not share them. Any screen
showing a record created this way says so, the same way every other MOCK
boundary in this codebase is named on screen rather than only in a
comment.

**Where the two categories meet in one flow, the flow splits.** Creating
an invoice writes; sending it does not. Adding a team member writes;
issuing their temporary password does not. The record appears, and the
outbound half says plainly that it did not happen.

**Two things stay no-ops for their own reasons**, unrelated to this rule:

- **Document Canvas's suggestions.** Accepting one edits document text,
  and there is no document text — `fixtures/documents.ts` holds a name, a
  size, a status and an engagement. Nothing to write to.
- **Pinning a legal-database reference.** The corpus is four placeholder
  entries; pinning one is a preference about content that does not exist.

> **Track A.5 replaces the whole mechanism, not just the storage.**
> Category 1 becomes real `POST`/`PATCH` routes against Postgres, at
> which point "session-scoped" stops being true and the on-screen labels
> come off. Category 2 becomes real sends — mail, e-signature provider,
> payment gateway — and several of those are Track B, because they need
> provider-side verification (§6). A category 2 action therefore stays a
> stated no-op **longer** than a category 1 one, and the two must not be
> un-faked in the same pass.

---

## 6. Track A → A.5 → B: what changes at each handoff

**Into Track A.5 (still solo):**
- `lib/mock-api.ts` → real API routes hitting a real Postgres database.
- Fixture JSON → real schema (multi-tenant, since this is white-label —
  tenant isolation becomes a real architectural concern here, not just
  a `{{CLIENT_LOGO}}` token).
- Fake auth (no real login) → real authentication + sessions + the
  role-based access the UI already assumes.
- Fake AI responses → real LLM calls (Digest, AI Assistant, AI Reports)
  — the source-attribution requirement from the AI Assistant screen
  becomes a real retrieval step, not a static chip.

**Into Track B (dev team, after Track A.5):**
- Fake "connected" integrations → real OAuth flows for Gmail/Outlook,
  Zoom/Teams/Meet, e-signature, and payment gateway providers — expect
  provider-side business verification and security review, not just
  implementation time.
- A full security/compliance hardening pass appropriate to handling
  real client legal and financial data across multiple tenants
  (encryption at rest, real audit logging in place of fixture data,
  server-side access-control enforcement, not just UI-hidden).
- Revisit the 2FA and session-timeout questions deferred earlier — once
  real data is flowing, those defaults are worth reconsidering.

---

## 7. Handoff checklist (prep for the dev team, at end of Track A.5)

Not needed until Track A.5 is actually done, but worth keeping in mind:

- A short `HANDOFF.md`: what's real (database, auth, AI, CRUD APIs) vs.
  what's still ahead (integrations, security hardening), and which
  parts of the system are most novel/risky for them to review first
  (the multi-tenant white-label data model, role-based permission
  enforcement).
- Any remaining `// MOCK:` comments should, by this point, only mark
  the third-party integrations — a project-wide search for `MOCK:`
  should surface exactly Track B's scope, nothing else.
- An `.env.example` listing the environment variables Track B will
  need (API keys for email/calendar/meeting providers, e-signature,
  payment gateway) — the LLM provider key should already be real and
  in use by this point, not still a placeholder.

## 8. Immediate next step

Batch 0 is the right place to start regardless of anything else — it's
small, fast, and everything downstream depends on getting it right once.
