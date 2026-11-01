import type { Rank } from '@/lib/ranks';

/**
 * The Settings sub-areas, and which ranks may open each.
 *
 * ===========================================================================
 * WHY THIS IS NOT IN components/chrome/nav-items.ts
 * ===========================================================================
 * That file is the NAV — one entry per sidebar row, and `legalDatabase`,
 * `billing` and the rest each map to one screen. Settings is one nav row over
 * four screens, so the ladder has to be expressed one level down. The shape is
 * deliberately identical to `staffNavFor` / `staffRouteAllows`: one allow-list,
 * read by both the tab strip and the route, so a rank added to a sub-area
 * gains the screen and the link together and neither can be forgotten.
 *
 * A DIFFERENT DECISION FROM THE EXPORT'S. The Stitch export renders these as a
 * nested, expandable sidebar group. <Sidebar> takes a flat list and knows
 * nothing about nesting; adding a second level to it for one consumer would be
 * a chrome change made for a single screen. A tab strip is already in the kit
 * (`tabTriggerClasses`, used by the registers, the approvals queue and AI
 * Reports), so Settings uses that and the sidebar stays one row.
 *
 * ===========================================================================
 * WHO SEES WHAT, AND WHY
 * ===========================================================================
 *  · GENERAL — everyone. It is the reader's own account and the firm's own
 *    details. Hiding a person's profile from them would be absurd.
 *  · TEAM — everyone. Knowing who your colleagues are is not privileged: the
 *    CRM, the registers and every engagement already name the team on the
 *    file. What is privileged is CHANGING the roster, and that is an action
 *    inside the screen rather than the screen itself.
 *  · INTEGRATIONS — partners. Firm-wide configuration: connecting the firm's
 *    mail and calendar is an act on behalf of the whole practice.
 *  · ACTIVITY — partners. It is the one screen here whose subject is other
 *    people's actions. That is supervision, and the ladder already reserves
 *    firm-wide oversight (billing, approvals) to the top of it.
 *
 * ABSENT, NEVER DISABLED — the same rule nav-items.ts states at length. A
 * greyed-out tab tells someone what they are not allowed to do, which is a
 * worse answer than not raising it.
 */

export type SettingsTabId = 'general' | 'team' | 'access' | 'integrations' | 'activity';

export interface SettingsTab {
  id: SettingsTabId;
  href: string;
  /** Omitted means every rank. */
  ranks?: Rank[];
}

export const SETTINGS_TABS: SettingsTab[] = [
  { id: 'general', href: '/staff/settings/general' },
  { id: 'team', href: '/staff/settings/team' },
  /*
   * TEAM ACCESS — partners (the client's October 2026 amendment). Who may sign
   * in to the workspace, and the audit of who changed that. Unlike Team, the
   * whole screen is privileged, not just an action on it: a list of who has
   * had access removed is itself a personnel record.
   */
  { id: 'access', href: '/staff/settings/access', ranks: ['partner'] },
  { id: 'integrations', href: '/staff/settings/integrations', ranks: ['partner'] },
  { id: 'activity', href: '/staff/settings/activity', ranks: ['partner'] },
];

/** The tabs a given rank sees. */
export function settingsTabsFor(rank: Rank): SettingsTab[] {
  return SETTINGS_TABS.filter((tab) => !tab.ranks || tab.ranks.includes(rank));
}

/**
 * Whether a rank may open a sub-area at all.
 *
 * THE TAB STRIP IS NOT THE GATE. Hiding a tab hides the entrance; it does not
 * stop anyone typing the address. Both readers come from the same list above.
 *
 * MOCK: in production this is a server-side authorisation check on every
 * request, not a component reading an array. Track A.5, reviewed in the Track B
 * hardening pass — a UI that hides a tab is not a permission.
 */
export function settingsTabAllows(rank: Rank, id: SettingsTabId): boolean {
  const tab = SETTINGS_TABS.find((entry) => entry.id === id);
  return tab !== undefined && (!tab.ranks || tab.ranks.includes(rank));
}

/** Where /staff/settings sends a reader — the first sub-area they may open. */
export function firstSettingsTabFor(rank: Rank): string {
  return settingsTabsFor(rank)[0]?.href ?? '/staff/settings/general';
}

/**
 * Who may CHANGE the roster, as opposed to reading it.
 *
 * The Team tab has no `ranks` above, on the reasoning that knowing who your
 * colleagues are is not privileged — every register already names the team on
 * a file. Adding a person to the firm is a different act entirely: it creates
 * an account, assigns a rank, and decides what that person can see.
 *
 * So the screen is open and the action is not, and this is the line between
 * them. Kept here rather than in the page because two callers need it — the
 * page, to decide whether to render the control, and the Server Action, which
 * is a public endpoint that the page's decision does not protect.
 *
 * Partner only, matching Integrations: both are acts on behalf of the whole
 * practice rather than work on a file.
 */
export const ROSTER_MANAGER_RANKS = ['partner'] as const satisfies readonly Rank[];

export function canManageRoster(rank: Rank): boolean {
  return (ROSTER_MANAGER_RANKS as readonly Rank[]).includes(rank);
}

/**
 * Who may add or remove a colleague's access. The same allow-list as the tab:
 * two readers, the page (which renders nothing for anyone else) and the Server
 * Action, which is a public endpoint and checks for itself.
 */
export function canManageAccess(rank: Rank): boolean {
  return settingsTabAllows(rank, 'access');
}
