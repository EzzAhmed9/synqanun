'use client';

import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { FeatherMark } from '@/components/brand/FeatherMark';
import { Logo } from '@/components/brand/Logo';
import { useUIState } from '@/components/providers/UIStateProvider';
import { APP_VERSION } from '@/lib/app-meta';
import { Link, usePathname } from '@/lib/i18n/navigation';
import { cn } from '@/lib/utils';
import { resolveActiveNavId, type NavItem } from './nav-items';

export interface SidebarProps {
  /**
   * Nav items to render, already filtered for this user's rank.
   *
   * BUILD_PLAN.md §3: per-rank item visibility is "built as a prop, not
   * copy-pasted per screen". The Sidebar has no opinion about ranks — the
   * route group's layout decides what goes in this array.
   */
  items: NavItem[];
  /**
   * Which item is active. Defaults to matching the current pathname, which is
   * right for real screens; pass it explicitly for previews and tests.
   */
  activeId?: string;
  /**
   * White-label tenant logo for the top slot — design.md §10 permits a small
   * client logo here and NOWHERE else in the chrome. Must never be larger than
   * the SynQanun mark beside it. `null` renders the SynQanun-only layout.
   */
  clientLogo?: { src: string; alt: string } | null;
  /**
   * The tenant's own marks, for a themed tenant — see design.md §10.2.
   *
   * Passed in rather than read from the fixture here, because a chrome
   * component reaching into tenant configuration is how per-component theming
   * starts. The layout resolves it; this renders it.
   */
  tenantMark?: { lockup: string; mark: string; alt: string } | null;
  /** Whether this tenant re-skins the product. Decides the logo hierarchy. */
  themed?: boolean;
  className?: string;
}

/**
 * Persistent module sidebar.
 *
 * design.md §4 "Navigation": start-aligned sidebar, module switcher, tenant
 * logo slot at top, SynQanun feather mark as the collapsed-state icon. The
 * active module gets a "syn-red left-border indicator (right-border in RTL) +
 * gray-100 background, not a filled red tab (keeps red rare/meaningful rather
 * than everywhere)."
 *
 * design.md §1 warns specifically against removing this in the name of
 * sleekness: SynQanun Suite "is a full operating system for a firm and needs
 * Office-level navigational structure."
 *
 * RTL — design.md §12 requires the sidebar move to the right in Arabic. There
 * is no RTL-specific code here to make that happen. It falls out of three
 * things: the flex row in the layout, `border-s-2` for the active indicator
 * (inline-start, so it flips), and `ps-`/`pe-`/`ms-`/`me-` spacing throughout.
 * No `left`, `right`, `pl-`, `pr-`, `ml-` or `mr-` appears in this file, and
 * none should be added.
 */
export function Sidebar({
  items,
  activeId,
  clientLogo = null,
  tenantMark = null,
  themed = false,
  className,
}: SidebarProps) {
  const t = useTranslations('nav');
  const pathname = usePathname();
  const { sidebarCollapsed, toggleSidebar } = useUIState();

  // The rule moved to nav-items.ts when the bottom tab bar needed the same
  // answer — it carries the reasoning and the bug it already fixed.
  const resolvedActiveId = activeId ?? resolveActiveNavId(items, pathname);

  return (
    <aside
      // `border-e` is the inline-end edge: the sidebar's border sits against
      // the content in both directions.
      className={cn(
        /*
          Charcoal in a themed tenant, white otherwise — both through the same
          token, which falls back to white when no theme is set. design.md
          §10.2.
        */
        'flex h-full shrink-0 flex-col border-e border-sidebar-edge bg-sidebar transition-[width] duration-200',
        // design.md §8: below 768px the bottom tab bar replaces the sidebar
        // ENTIRELY. Not collapsed to the icon rail — replaced. The rail is the
        // 768–1279px behaviour and it was standing in for this on phones.
        'max-tablet:hidden',
        sidebarCollapsed ? 'w-16' : 'w-64',
        className
      )}
    >
      {/* Brand + tenant slot ------------------------------------------------ */}
      <div
        className={cn(
          'flex h-16 items-center border-b border-sidebar-edge',
          sidebarCollapsed ? 'justify-center px-2' : 'ps-4 pe-3'
        )}
      >
        {/*
          ==================================================================
          THE HIERARCHY INVERTS IN A THEMED TENANT — design.md §10.2
          ==================================================================
          In accent mode the SynQanun wordmark leads and the tenant's logo is
          the smaller guest beside it, which is §10's rule and is what the
          `else` branch below still does.

          In themed mode the rail is the tenant's charcoal and the tenant's
          mark is the only mark in the slot. A subordinate tenant logo under a
          dominant SynQanun lockup, on a surface painted in the tenant's own
          palette, reads as neither firm's product. SynQanun is still present
          on every one of these screens — as the "Powered by SynQanun" credit
          in the footer, which §7.2 makes permanent and untoggleable.

          The feather is NOT displaced by this. It is the AI's identity
          wherever it signifies the agent; what it stops doing is standing in
          as a brand lockup in a slot the tenant now owns.
        */}
        {themed && tenantMark ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={sidebarCollapsed ? tenantMark.mark : tenantMark.lockup}
            alt={tenantMark.alt}
            className={cn('w-auto shrink-0', sidebarCollapsed ? 'h-7' : 'h-8')}
          />
        ) : sidebarCollapsed ? (
          // design.md §4: the feather mark is the collapsed-state icon.
          <FeatherMark height={26} alt="SynQanun" />
        ) : (
          <div className="flex min-w-0 items-center gap-2">
            {/* The wordmark picks its own script from the locale and never
                mirrors — brand-guidelines.md §2.5. */}
            <Logo height={22} clearSpace={false} priority />
            {clientLogo ? (
              <>
                {/* design.md §10: the client logo is secondary in size and
                    weight to the SynQanun identity. A divider keeps the two
                    marks from reading as a single combined lockup. */}
                <span aria-hidden className="h-5 w-px shrink-0 bg-gray-200" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={clientLogo.src} alt={clientLogo.alt} className="h-4 w-auto shrink-0" />
              </>
            ) : null}
          </div>
        )}
      </div>

      {/* Module switcher ---------------------------------------------------- */}
      <nav aria-label={t('modules')} className="flex-1 overflow-y-auto py-3">
        <ul className="flex flex-col gap-0.5 px-2">
          {items.map((item) => {
            const isActive = item.id === resolvedActiveId;
            const Icon = item.icon;
            const label = t(item.labelKey);

            return (
              <li key={item.id}>
                <Link
                  href={item.href}
                  aria-current={isActive ? 'page' : undefined}
                  title={sidebarCollapsed ? label : undefined}
                  className={cn(
                    'group relative flex items-center rounded-sm',
                    // 44px — design.md §8's touch-target minimum, and the same
                    // row rhythm as the tables.
                    'h-11 text-body',
                    sidebarCollapsed ? 'justify-center px-0' : 'ps-3 pe-2 gap-3',
                    isActive
                      ? // syn-red edge indicator on the INLINE-START side, so it
                        // sits left in English and right in Arabic. Background
                        // is gray-100, not a red fill.
                        'border-s-2 border-sidebar-active bg-sidebar-raised text-sidebar-strong font-medium'
                      : 'border-s-2 border-transparent text-sidebar-muted hover:bg-sidebar-raised hover:text-sidebar-strong'
                  )}
                >
                  <Icon
                    aria-hidden
                    size={18}
                    strokeWidth={isActive ? 2.25 : 2}
                    className={cn('shrink-0', isActive ? 'text-sidebar-active' : 'text-sidebar-muted')}
                  />
                  {sidebarCollapsed ? (
                    // Keep the label available to screen readers even when the
                    // rail hides it visually.
                    <span className="sr-only">{label}</span>
                  ) : (
                    <span className="truncate">{label}</span>
                  )}
                  {!sidebarCollapsed && item.count ? (
                    <span className="ms-auto rounded-pill bg-gray-200 px-1.5 text-caption text-gray-600">
                      {item.count}
                    </span>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Platform mark ------------------------------------------------------
          design.md §4 gives the sidebar's TOP slot to the tenant and its
          BOTTOM to SynQanun. Keeping the feather here — present in every
          instance, in every tenant — is what brand-guidelines.md §5 means by
          the mark being how a user knows whose system they are in "even inside
          a fully white-labeled client instance". It is not the AI-present
          signal in this position; it is the platform's own mark, which is why
          it carries no pulse.

          The version comes from package.json via APP_VERSION. The Stitch
          export hardcoded "v2.4 LTS" next to a green dot — a version this
          product has never had, beside a health indicator with nothing
          measuring it. Same call as Splash: state what the system can actually
          be asked, or state nothing. The dot is gone.

          Hidden while collapsed, because §4 also makes the feather the rail's
          collapsed-state icon in the TOP slot — showing it again down here
          would put the same mark twice in a 64px column. */}
      {!sidebarCollapsed && (
        <div className="flex items-center gap-2 border-t border-gray-200 py-3 ps-4 pe-3">
          <FeatherMark height={18} />
          <span className="truncate font-mono text-reference text-sidebar-muted">v{APP_VERSION}</span>
        </div>
      )}

      {/* Collapse toggle ----------------------------------------------------- */}
      <div className="border-t border-gray-200 p-2">
        <button
          type="button"
          onClick={toggleSidebar}
          aria-expanded={!sidebarCollapsed}
          aria-label={sidebarCollapsed ? t('expand') : t('collapse')}
          className={cn(
            // Sidebar tokens, not grays: gray-600 measured 1.3:1 on the
            // themed charcoal rail. These resolve to the old grays in accent mode.
            'flex h-11 w-full items-center rounded-sm text-body text-sidebar-muted',
            'hover:bg-sidebar-raised hover:text-sidebar-strong',
            sidebarCollapsed ? 'justify-center' : 'ps-3 pe-2 gap-3'
          )}
        >
          {/* Directional icon — design.md §12 flips these. `rtl:rotate-180`
              turns the panel chevron around in Arabic; the logo above does
              not flip, which is the distinction §12 draws. */}
          {sidebarCollapsed ? (
            <PanelLeftOpen aria-hidden size={18} className="shrink-0 rtl:rotate-180" />
          ) : (
            <PanelLeftClose aria-hidden size={18} className="shrink-0 rtl:rotate-180" />
          )}
          {!sidebarCollapsed && <span className="truncate">{t('collapse')}</span>}
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
