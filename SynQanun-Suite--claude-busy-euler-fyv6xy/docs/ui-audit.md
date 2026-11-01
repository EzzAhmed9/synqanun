# UI audit — staff workspace and client portal

**Scope.** Every staff and client-portal screen except the staff dashboard
(which was redesigned separately in Phase 4b), plus onboarding and the client
invite. 48 routes × English and Arabic × 1440px and 390px = 192 page variants,
crawled in Chromium against a production build of the Meezan (themed) tenant
as the partner demo viewer.

**Method.** An automated probe on every rendered element, then manual review of
what it flagged:
- **Contrast:** text below 4.5:1, or 3:1 for 24px and larger or 18.66px bold.
  Placeholders are included; disabled controls are exempt, per WCAG.
- **SynQanun red:** any element painted `#EB1C24` (text, fill, border, outline)
  in the Meezan theme.
- **Phone-width overflow:** any element past the viewport edge that isn't inside
  its own scroll container.
- **English in Arabic mode:** Latin text on Arabic pages outside deliberate LTR
  runs (references, codes, emails, filenames).
- **Old terminology:** قضية/قضايا, المساعد, "case", and bare "Matter".
- **Hard-coded colours:** a static search for hex and `rgba()` in classes and
  inline styles.

**Status.** The audit and its fixes were requested together, so every finding
below already has a fix commit on `claude/busy-euler-fyv6xy`. The re-crawl after
`787e6f2` reports **0 contrast failures, 0 SynQanun red and 0 overflow** on all
192 variants. Items marked *left* are deliberate, with the reason.

## Findings catalogue

| ID | Finding | Files | Severity | Status |
|---|---|---|---|---|
| C1 | Muted text below AA on every screen: `gray-500` (#7A7A85) is 4.24:1 on white, 4.00 on Meezan cream, 3.96 on gray-50 and 3.66 on gray-100. 419 uses. | `app/globals.css`, `lib/design-tokens.ts`, `design.md` §2, `brand-guidelines.md` §3.2 | **high** (systemic) | Fixed `788a5b5`: token darkened to #6B6B76 (≥ 4.54 on every surface) |
| C2 | Readable text in `gray-400` (2.3–2.5:1): "not set" and "no next date" values, references in lists, canvas and legal-database placeholder bodies, search hints, icon-only buttons | `staff/approvals/ApprovalsWorkspace.tsx`, `staff/billing/page.tsx`, `staff/clients/page.tsx`, `staff/inbox/InboxWorkspace.tsx`, `staff/calendar/CalendarViews.tsx`, `staff/calendar/[event]/transcript/page.tsx`, `staff/register/*`, `staff/ai/canvas/page.tsx`, `staff/legal-database/*`, `(client)/GlobalSearch.tsx`, `(client)/settings/page.tsx`, `(client)/documents/*`, `(auth)/onboarding/review/page.tsx`, `(auth)/reset/*/sent/page.tsx`, `components/ui/EmptyState.tsx` | **high** | Fixed `788a5b5` (→ gray-500). Disabled states keep gray-400 |
| C3 | Input placeholders in `gray-400` (2.16–2.34:1) | `components/ui/Input.tsx`, `components/ui/Textarea.tsx`, `(client)/GlobalSearch.tsx`, `staff/ai/ScriptedChat.tsx`, `staff/clients/ClientsTable.tsx`, `staff/conflicts/ConflictSearchPanel.tsx`, `staff/inbox/InboxList.tsx`, `staff/legal-database/LegalSearch.tsx`, `staff/register/RegisterTable.tsx` | **medium** | Fixed `788a5b5` |
| C4 | Inactive tab triggers 4.00:1 on cream (matters, projects, clients, billing, approvals, settings, AI reports, calendar) | `components/ui/tab-styles.ts` (via gray-500) | **medium** | Fixed by the C1 token |
| C5 | "Collapse sidebar" control 1.30:1, nearly invisible on the dark Meezan rail, on every desktop screen | `components/chrome/Sidebar.tsx` | **high** | Fixed `787e6f2` (sidebar tokens) |
| C6 | `warning` amber used as text, 3.43–3.86:1: "1 overdue", next steps, "Waiting on you", onboarding review, CSV notice, invoice builder, password strength | `(client)/EngagementDetail.tsx`, `(client)/KeyDatesStrip.tsx`, `(client)/documents/DocumentsLibrary.tsx`, `(auth)/onboarding/review/page.tsx`, `(auth)/onboarding/team/page.tsx`, `staff/billing/new/InvoiceBuilder.tsx`, `components/ui/PasswordStrength.tsx` | **medium** | Fixed `787e6f2` (`warning-text`) |
| C7 | Red or bronze text below AA: syn-red on white 4.45, syn-red on gray-50 3.83, and bronze on tints 4.18–4.27. Covers the onboarding step labels and badge, "Soon", the calendar's today, the billing alarm figure and the tab-bar labels | `components/onboarding/WizardShell.tsx`, `staff/register/RegisterTable.tsx`, `staff/calendar/CalendarViews.tsx`, `staff/billing/page.tsx`, `components/chrome/BottomTabBar.tsx` | **medium** | Fixed `a69db10` + `787e6f2` (`action`, and `action-pressed` on tints) |
| R1 | Phone tab bar: active item and "More" in SynQanun red, every screen at 390px | `components/chrome/BottomTabBar.tsx` | **medium** | Fixed `a69db10` |
| R2 | Timer play button SynQanun red on every staff screen | `components/chrome/TimerPill.tsx` | **medium** | Fixed `a69db10` |
| R3 | SynQanun red accents: onboarding progress bar, step counter and badge; selected rows (inbox, approvals, messages, calendar); unread dots; client settings toggles; checkbox accents; selected-option borders; link hovers in client tables | `components/onboarding/WizardShell.tsx`, `staff/inbox/InboxList.tsx`, `staff/approvals/ApprovalsWorkspace.tsx`, `(client)/messages/MessagesWorkspace.tsx`, `staff/calendar/CalendarViews.tsx`, `staff/clients/[id]/page.tsx`, `(client)/NotificationsPanel.tsx`, `(client)/settings/NotificationsPanel.tsx`, `staff/register/*`, `staff/signatures/SignatureRequestForm.tsx`, `staff/time/LogTimeModal.tsx`, `(client)/invoices/*`, `(client)/documents/DocumentsLibrary.tsx`, `(client)/EngagementTable.tsx` | **medium** | Fixed `a69db10` |
| R4 | "Soon" tag SynQanun red on the staff legal matters and projects registers | `staff/register/RegisterTable.tsx` | **low** | Fixed `a69db10` + `787e6f2` |
| R5 | `bg-red-50/40` selected fills: the stock palette is cleared, so the class never existed and the fills were silently missing | `staff/register/NewDocumentModal.tsx`, `staff/signatures/SignatureRequestForm.tsx`, `staff/time/LogTimeModal.tsx` | **medium** | Fixed `a69db10` (`bg-action/5`) |
| R6 | Client dashboard unread pill SynQanun red (white text 4.45:1) | `(client)/dashboard/SummaryCards.tsx` | **low** | Fixed `a69db10` |
| H1 | Hard-coded colours: AI and destructive button pressed states (#16293f, #8f2e28), modal scrim `rgba()`, stone panel #000/#fff | `components/ui/Button.tsx`, `components/ui/Overlay.tsx`, `components/auth/StonePanel.tsx` | **low** | Fixed `1917265` (tokens) |
| H2 | Hard-coded colours in `app/global-error.tsx` | `app/global-error.tsx` | low | *Left*: it renders when the root layout has failed, so no stylesheet exists. It is already bilingual |
| A1 | Broken Arabic word "مسائل قانونيةي" on the staff legal matters filter (Phase 1 substring rename of قضاياي) | `lib/i18n/ar.json` → `staffMatters.segments.mine` | **high** | Fixed `7f19d81` (مسائلي القانونية) |
| A2 | Tenant logo alt text "Meezan Legal" in Arabic mode (screen readers announce it in English) | `(staff)/StaffChrome.tsx`, `(client)/ClientPortalChrome.tsx` | **medium** | Fixed `7f19d81` |
| A3 | The assistant called "المساعد الذكي" in the branding hint | `lib/i18n/ar.json` → `onboarding.branding.accentHint` | **low** | Fixed `7f19d81` (معين) |
| L1 | Latin in Arabic mode: "PNG/SVG", "CSV", "Enter / Shift + Enter", "Lorem Ipsum" (naming the placeholder text) | `lib/i18n/ar.json` (onboarding, messages, legal database) | low | *Left*: format and key names, written as they appear on screen and keyboards |
| L2 | "Meezan Legal" on Arabic settings | `staff/settings/general/page.tsx` | — | *Left*: it is the labelled English-name field beside the Arabic one |
| L3 | "Letter to the Registry — extension request" on an Arabic matter page | `fixtures/documents.ts` (`demoFirmDocuments`) | — | *Left*: a draft is titled in the language it is drafted in; another draft there is in Arabic |
| L4 | "محكمة دبي المالي الابتدائية، الدعوى CFI-042" on a client invoice | `fixtures/invoices.ts` | — | *Left*: Saudi fixture mapping row C2, not to be touched |
| T1 | "Case management hearing", "Case conference", "commercial case 8821", "قضية قائمة" | fixtures / `conflicts.scope.covers` | — | *Left*: court-case meaning, correct |
| T2 | "Matter title", "Matter overview", "Matter type", "Matter risk overview" | `lib/i18n/en.json` | low | *Left* (decision from `ad23682`): compounds on a matter's own screen; easy to change if you prefer "Legal matter …" |
| T3 | "قضايا الشركات والتحكيم…" practice area | `fixtures/firm.ts` | — | *Left*: tenant-authored content (design.md §10.1) |
| O1 | Overflow at 390px | — | — | None found on any screen, before or after |

## Per screen

IDs refer to the catalogue above. Counts are instances across the four variants
of each screen, so one root cause typically appears many times. "After" is the
re-crawl at `787e6f2`.

| Screen | Findings before fixes (instances across en/ar × 1440/390) | After |
|---|---|---|
| `/dashboard` | C1×60, C5×2, C7×8, R1×4, R3×2, R6×2, T×2 | clean |
| `/matters` | C1×42, C2×4, C3×4, C5×2, C7×4, R1×4 | clean |
| `/projects` | C1×42, C2×4, C3×4, C5×2, C7×4, R1×4 | clean |
| `/documents` | C1×66, C2×4, C3×4, C5×2, C6×4, C7×4, R1×4 | clean |
| `/invoices` | C1×42, C2×4, C3×4, C5×2, C7×4, R1×4 | clean |
| `/messages` | C1×64, C3×6, C5×2, C7×4, L×1, R1×4 | clean |
| `/settings` | C1×32, C2×4, C4×4, C5×2, C7×4, R1×4 | clean |
| `/staff/inbox` | C1×38, C2×4, C3×4, C4×4, C5×2, C7×4, R1×4, R2×4, T×2 | clean |
| `/staff/calendar` | C1×56, C2×4, C4×4, C5×2, C7×8, R1×4, R2×4, R3×8, T×2 | clean |
| `/staff/clients` | C1×36, C2×4, C3×4, C4×4, C5×2, C7×4, R1×4, R2×4 | clean |
| `/staff/clients/new` | C1×24, C3×8, C5×2, C7×4, R1×4, R2×4 | clean |
| `/staff/matters` | C1×52, C2×8, C3×4, C4×4, C5×2, C7×10, R1×4, R2×4, R4×4, T×2 | clean |
| `/staff/matters/new` | C1×24, C3×8, C5×2, C7×4, R1×4, R2×4, T×2 | clean |
| `/staff/projects` | C1×52, C2×8, C3×4, C4×4, C5×2, C7×8, R1×4, R2×4, R4×4 | clean |
| `/staff/billing` | C1×48, C2×4, C4×4, C5×2, C7×8, R1×4, R2×4, R3×4, T×2 | clean |
| `/staff/billing/new` | C1×28, C3×4, C5×2, C7×4, R1×4, R2×4 | clean |
| `/staff/approvals` | C1×38, C2×4, C4×4, C5×2, C7×4, R1×4, R2×4 | clean |
| `/staff/ai/assistant` | C1×28, C3×4, C5×2, C7×4, R1×4, R2×4 | clean |
| `/staff/ai/canvas` | C1×48, C2×4, C5×2, C7×4, R1×4, R2×4 | clean |
| `/staff/ai/digest` | C1×28, C3×4, C5×2, C7×4, R1×4, R2×4 | clean |
| `/staff/ai/reports` | C1×28, C4×4, C5×2, C7×4, R1×4, R2×4, T×2 | clean |
| `/staff/legal-database` | C1×48, C2×4, C3×4, C5×2, C7×4, L×2, R1×4, R2×4 | clean |
| `/staff/conflicts` | C1×28, C3×4, C5×2, C7×4, R1×4, R2×4, T×2 | clean |
| `/staff/settings` | C1×40, C4×4, C5×2, C7×4, L×2, R1×4, R2×4 | clean |
| `/staff/settings/general` | C1×40, C4×4, C5×2, C7×4, L×2, R1×4, R2×4 | clean |
| `/staff/settings/team` | C1×50, C4×4, C5×2, C7×4, R1×4, R2×4 | clean |
| `/staff/settings/integrations` | C1×36, C4×4, C5×2, C7×4, R1×4, R2×4 | clean |
| `/staff/settings/activity` | C1×42, C4×4, C5×2, C7×4, R1×4, R2×4 | clean |
| `/staff/signatures/new` | C1×28, C5×2, C7×4, R1×4, R2×4 | clean |
| `/staff/calendar/evt-08/transcript` | C1×52, C2×4, C5×2, C7×4, R1×4, R2×4, T×4 | clean |
| `/staff/legal-database/SAMPLE-0001` | C1×40, C2×4, C5×2, C7×4, L×2, R1×4, R2×4 | clean |
| `/onboarding` | C1×56, C3×4, C7×16, L×2, R3×20, T×4 | clean |
| `/onboarding/team` | C1×34, C3×4, C7×16, L×4, R3×20 | clean |
| `/onboarding/branding` | C1×56, C3×4, C7×16, L×2, R3×20, T×4 | clean |
| `/onboarding/billing` | C1×38, C7×16, R3×20 | clean |
| `/onboarding/integrations` | C1×36, C7×16, R3×20 | clean |
| `/onboarding/review` | C1×30, C2×4, C6×4, C7×12, R3×20 | clean |
| `/invite/client` | C1×40, T×2 | clean |
| `/matters/MAT-2201` | C1×56, C2×4, C4×4, C5×2, C6×8, C7×4, R1×4, T×6 | clean |
| `/projects/PRJ-4410` | C1×56, C2×4, C4×4, C5×2, C6×8, C7×4, R1×4 | clean |
| `/invoices/INV-2026-104` | C1×46, C5×2, C7×4, L×2, R1×4 | clean |
| `/invoices/INV-2026-104/receipt` | C1×20, C5×2, C7×4, R1×4 | clean |
| `/documents/doc-4471/sign` | C1×32, C5×2, C7×4, R1×4 | clean |
| `/staff/matters/MAT-4021` | C1×48, C2×4, C5×2, C7×4, L×2, R1×4, R2×4 | clean |
| `/staff/projects/PRJ-4410` | C1×44, C5×2, C7×4, R1×4, R2×4 | clean |
| `/staff/clients/cli-001` | C1×32, C5×2, C7×4, R1×4, R2×4 | clean |
| `/staff/clients/cli-001/contacts` | C1×40, C5×2, C7×4, R1×4, R2×4 | clean |
