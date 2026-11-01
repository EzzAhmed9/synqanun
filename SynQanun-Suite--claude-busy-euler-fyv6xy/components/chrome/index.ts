/**
 * Shared application chrome — BUILD_PLAN.md §2 and §3, Batch 0 item 2.
 *
 * Built once here so every screen inherits it. BUILD_PLAN.md §3 is direct
 * about the cost of not doing this: "Trying to assemble 64 screens before the
 * shared pieces exist is exactly how the Stitch inconsistencies happened
 * (untranslated sidebars, missing timer pills, mismatched structure)."
 */

export { Sidebar, type SidebarProps } from './Sidebar';
export { TopBar, type TopBarProps } from './TopBar';
export { TimerPill, type TimerPillProps } from './TimerPill';
export { DigestTrigger, type DigestTriggerProps } from './DigestTrigger';
export { LanguageToggle, type LanguageToggleProps } from './LanguageToggle';
export {
  AuthHeader,
  StaffAuthHeader,
  type AuthHeaderProps,
  type StaffAuthHeaderProps,
} from './AuthHeader';
export { TenantFooter, type TenantFooterProps } from './TenantFooter';
export { clientNavItems, staffNavFor, type NavItem } from './nav-items';
