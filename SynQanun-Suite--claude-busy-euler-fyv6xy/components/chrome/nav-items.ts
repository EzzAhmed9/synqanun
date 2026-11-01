import type { LucideIcon } from 'lucide-react';
import {
  BadgeCheck,
  Briefcase,
  CalendarDays,
  FileBarChart,
  FileText,
  FolderOpen,
  LayoutDashboard,
  Library,
  MessageSquare,
  Receipt,
  Scale,
  Settings,
  Sparkles,
  Users,
  Workflow,
  ShieldQuestion,
} from 'lucide-react';
import { RANKS_THAT_SEE_BILLING, type Rank } from '@/lib/ranks';

/**
 * Sidebar navigation model.
 *
 * BUILD_PLAN.md §3 is specific about why this is data rather than markup:
 * the sidebar's per-rank item visibility must be "built as a prop, not
 * copy-pasted per screen". So <Sidebar> renders whatever list it is handed,
 * and the decision about WHICH items a given user sees is made by the caller —
 * a route group's layout, once ranks exist.
 *
 * Icons come from lucide-react, the single neutral UI icon set
 * (BUILD_PLAN.md §1). The feather mark is NOT in here and never will be:
 * brand-guidelines.md §5 keeps it exclusively SynQanun's, which is exactly why
 * it lives in components/brand/ as a real asset instead.
 */

export interface NavItem {
  /** Stable key. Also used to resolve the active item. */
  id: string;
  /** Locale-agnostic path — <Link> from lib/i18n/navigation adds the prefix. */
  href: string;
  /**
   * Key into the `nav` namespace of the translation dictionaries.
   *
   * Labels are keys, not strings, so a nav item cannot be added without a
   * translation existing in BOTH dictionaries. BUILD_PLAN.md §3 lists
   * "untranslated sidebars" as one of the concrete failures this batch exists
   * to prevent.
   */
  labelKey: string;
  icon: LucideIcon;
  /** Optional count (unread messages, pending approvals). */
  count?: number;
  /**
   * Lit only on its own path, never on a path beneath it. For the staff
   * dashboard, whose `/staff` prefixes every staff route: since the inbox left
   * the sidebar (October 2026) the longest match on /staff/inbox would be the
   * dashboard, and a highlighted Dashboard on the inbox says the reader is
   * somewhere they are not. No entry lit is the truthful answer there.
   */
  exact?: boolean;
}

/* ===========================================================================
 * The staff nav, by rank
 * ======================================================================== */

interface StaffNavEntry extends NavItem {
  /**
   * Ranks that see this item. Absent means everyone.
   *
   * A LIST OF WHO SEES IT, not a list of who does not. The difference matters
   * when a rank is added: an item with an allow-list stays hidden from the new
   * rank until someone decides otherwise, which is the safe direction for a nav
   * that gates billing and approvals.
   */
  ranks?: readonly Rank[];
}

const STAFF_NAV: StaffNavEntry[] = [
  { id: 'dashboard', href: '/staff', labelKey: 'dashboard', icon: LayoutDashboard, exact: true },
  /*
   * NO INBOX ENTRY. At the client's request (October 2026) the unified inbox
   * left the sidebar for an envelope in the staff top bar, with its own unread
   * badge — see TopBar.tsx `inboxHref`. The route is unchanged and ungated, as
   * it always was: every rank has correspondence.
   */
  { id: 'calendar', href: '/staff/calendar', labelKey: 'calendar', icon: CalendarDays },
  { id: 'clients', href: '/staff/clients', labelKey: 'clients', icon: Users },
  { id: 'matters', href: '/staff/matters', labelKey: 'matters', icon: Scale },
  /*
   * Billing and approvals are the two entries the ladder actually gates.
   *
   * A legal secretary does not sign off a fee quote and a paralegal does not
   * approve a filing, so neither sees the entry at all. BUILD_PLAN.md §3 and
   * the Settings governance note agree on how that is expressed: the item is
   * ABSENT, never rendered disabled. A greyed-out control tells someone what
   * they are not allowed to do, which is a worse answer than not raising it.
   */
  {
    id: 'billing',
    href: '/staff/billing',
    labelKey: 'billing',
    icon: Receipt,
    // Read from lib/ranks.ts rather than written here, because the billing
    // route and the staff search read the same list — see the note there.
    ranks: RANKS_THAT_SEE_BILLING,
  },
  {
    id: 'approvals',
    href: '/staff/approvals',
    labelKey: 'approvals',
    icon: BadgeCheck,
    /*
     * A SENIOR ASSOCIATE REVIEWS TOO, and this said otherwise.
     *
     * fixtures/practice.ts routes three approvals at stf-003 under a comment
     * explaining exactly why — "a paralegal's exhibit index goes to the
     * associate running the file, and only what that associate signs off goes
     * up to a partner" — and SeniorAssociateDashboard.tsx has rendered an
     * ApprovalsCard since Batch 4. The queue screen was the only thing that
     * disagreed, and it disagreed by hiding itself from someone whose own
     * dashboard tells them they have two decisions waiting.
     */
    ranks: ['partner', 'seniorAssociate'],
  },
  /*
   * Batch 5 adds three AI surfaces. None carries a `ranks` allow-list:
   * asking the assistant about a matter, or searching the legal database, is
   * not privileged by seniority the way a fee quote or a filing sign-off is.
   * What each one SHOWS is still scoped by the records behind it.
   *
   * The Digest has no entry here on purpose — it opens from the top bar,
   * where every staff screen already carries the button for it.
   */
  { id: 'aiAssistant', href: '/staff/ai/assistant', labelKey: 'aiAssistant', icon: Sparkles },
  { id: 'aiReports', href: '/staff/ai/reports', labelKey: 'aiReports', icon: FileBarChart },
  { id: 'legalDatabase', href: '/staff/legal-database', labelKey: 'legalDatabase', icon: Library },
  /*
   * Batch 6. No `ranks`: any fee earner may need to know whether the firm is
   * conflicted before a conversation goes further, and every record it returns
   * is the firm's own work, already visible on the registers. What stays gated
   * is ACTING on the answer — matters/permissions.ts and clients/permissions.ts.
   */
  { id: 'conflicts', href: '/staff/conflicts', labelKey: 'conflicts', icon: ShieldQuestion },
  { id: 'settings', href: '/staff/settings', labelKey: 'settings', icon: Settings },
];

/**
 * The nav a given rank sees.
 *
 * BUILD_PLAN.md §3 requires per-rank visibility be "built as a prop, not
 * copy-pasted per screen" — so <Sidebar> still renders whatever list it is
 * handed and knows nothing about ranks, and this function is the one place the
 * ladder is expressed. Five dashboards call it with five ranks rather than
 * maintaining five arrays.
 */
/**
 * Which nav item a path belongs to — the LONGEST href it sits under.
 *
 * ===========================================================================
 * EXTRACTED AT THE SECOND INSTANCE, WITH THE BUG IT ALREADY FIXED
 * ===========================================================================
 * This lived inside Sidebar.tsx until the bottom tab bar needed the same
 * answer. Two copies of it would be two chances to disagree about which item
 * is current, and the disagreement would be invisible: the sidebar and the tab
 * bar are never on screen at the same time, so nothing would ever show them
 * contradicting each other.
 *
 * It is not a naive `startsWith`, and the reason is recorded here rather than
 * lost in the move. The client nav's hrefs are distinct top-level paths and
 * none prefixes another; every staff route is nested under /staff, so the
 * dashboard's own href prefixes all of them and won every comparison — on
 * /staff/inbox the sidebar highlighted Dashboard. Longest match fixes that.
 *
 * The boundary test matters too: a plain `startsWith` would light
 * /staff/matters for a hypothetical /staff/mattersomething, so a match is
 * either the exact path or the path followed by a separator.
 */
export function resolveActiveNavId(items: NavItem[], pathname: string): string | undefined {
  return items
    .filter(
      (item) =>
        pathname === item.href || (!item.exact && pathname.startsWith(`${item.href}/`))
    )
    .sort((a, b) => b.href.length - a.href.length)[0]?.id;
}

export function staffNavFor(rank: Rank): NavItem[] {
  return STAFF_NAV.filter((item) => !item.ranks || item.ranks.includes(rank)).map(
    ({ ranks: _ranks, ...item }) => item
  );
}

/**
 * Whether a rank may open a staff route at all.
 *
 * THE NAV IS NOT THE GATE. Hiding an entry hides the entrance; it does not
 * stop anyone typing the address, and the route still has to refuse. Gating
 * the nav alone is how /staff came to render the partner's approvals and
 * billing figures to every rank that asked for it.
 *
 * Both readers come from the SAME allow-list above, so a rank added to an
 * entry gains the screen and the link together and neither can be forgotten.
 *
 * MOCK: in production this is a server-side authorisation check on every
 * request, not a component reading a list. Track A.5, reviewed in the Track B
 * hardening pass — a UI that hides a button is not a permission.
 */
export function staffRouteAllows(rank: Rank, id: string): boolean {
  const entry = STAFF_NAV.find((item) => item.id === id);
  return entry ? !entry.ranks || entry.ranks.includes(rank) : false;
}

/**
 * Client-portal nav — design.md §11 item 6 scopes the client's view to shared
 * documents, invoices and matter status only. No internal firm data.
 *
 * The seven items below are Batch 2's full client surface, in the order the
 * design specifies. Note the divergence from the staff nav at item 5: a
 * client sees "Invoices" — the statements addressed to them — where staff see
 * "Billing", the module that raises them. Two labels because they are two
 * different things, not one thing renamed; that is also why the label is a
 * dictionary key per side rather than a shared `billing` string.
 *
 * `count` is deliberately absent here. Unread totals are data, and this is a
 * static route table; the client layout merges the real count onto the messages
 * item at render time. A number baked into this file would be a lie the moment
 * anyone read a message.
 */
export const clientNavItems: NavItem[] = [
  { id: 'dashboard', href: '/dashboard', labelKey: 'dashboard', icon: LayoutDashboard },
  { id: 'matters', href: '/matters', labelKey: 'myMatters', icon: Scale },
  { id: 'projects', href: '/projects', labelKey: 'myProjects', icon: Briefcase },
  { id: 'documents', href: '/documents', labelKey: 'documents', icon: FileText },
  { id: 'invoices', href: '/invoices', labelKey: 'invoices', icon: Receipt },
  { id: 'messages', href: '/messages', labelKey: 'messages', icon: MessageSquare },
  { id: 'settings', href: '/settings', labelKey: 'settings', icon: Settings },
];
