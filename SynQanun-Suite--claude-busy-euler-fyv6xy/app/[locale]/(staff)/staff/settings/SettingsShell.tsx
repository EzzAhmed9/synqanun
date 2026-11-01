import type { LucideIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { EmptyState, tabTriggerClasses } from '@/components/ui';
import { Link } from '@/lib/i18n/navigation';
import type { Rank } from '@/lib/ranks';
import { cn } from '@/lib/utils';
import { StaffTopBar } from '../../StaffChrome';
import { settingsTabsFor, type SettingsTabId } from './tabs';

/**
 * The chrome every Settings sub-area sits inside: the top bar and the tab
 * strip, rendered once instead of four times.
 *
 * The strip is filtered by rank through `settingsTabsFor`, so a paralegal does
 * not see an Integrations tab they cannot open — and the routes behind it
 * refuse independently, because a hidden tab is not a permission. See tabs.ts.
 */
export function SettingsShell({
  rank,
  active,
  children,
}: {
  rank: Rank;
  active: SettingsTabId;
  children: React.ReactNode;
}) {
  const t = useTranslations('staffSettings');
  const tabs = settingsTabsFor(rank);

  return (
    <>
      <StaffTopBar title={t('title')} subtitle={t(`tabs.${active}`)} />

      <main className="mx-auto flex w-full max-w-content flex-1 flex-col gap-5 px-6 py-6">
        <nav
          aria-label={t('tabsLabel')}
          className="flex gap-1 overflow-x-auto border-b border-gray-200"
        >
          {tabs.map((tab) => (
            <Link
              key={tab.id}
              href={tab.href}
              aria-current={tab.id === active ? 'page' : undefined}
              className={cn(tabTriggerClasses(tab.id === active), 'whitespace-nowrap')}
            >
              {t(`tabs.${tab.id}`)}
            </Link>
          ))}
        </nav>

        {children}
      </main>
    </>
  );
}

/**
 * What a Settings sub-area renders for a rank that may not open it.
 *
 * ===========================================================================
 * WHY NOT <RouteNotPermitted>
 * ===========================================================================
 * That component is for a whole route with no siblings — /staff/billing and
 * /staff/approvals, where a refused reader has nowhere else to go and the
 * screen is correctly a dead end with the chrome around it.
 *
 * A Settings sub-area is not that. The reader has other tabs they CAN open,
 * and the honest refusal is the one that leaves them visible: this renders
 * inside <SettingsShell>, so the strip is still there and "the rest of
 * Settings is available from the tabs above" is a true sentence rather than a
 * pointer at navigation that is not on screen.
 *
 * The refusal itself follows RouteNotPermitted's rules: no error colour, no
 * status code, and the rank named as a plain category rather than as a
 * judgement about the person.
 */
export function SettingsNotPermitted({
  icon,
  rank,
  tab,
  rankLabel,
}: {
  icon: LucideIcon;
  rank: Rank;
  tab: SettingsTabId;
  /** The BARE rank category — it lands inside a sentence. See lib/ranks.ts. */
  rankLabel: string;
}) {
  const t = useTranslations('staffSettings');

  return (
    <SettingsShell rank={rank} active={tab}>
      <EmptyState
        icon={icon}
        title={t('notPermitted.title')}
        body={t('notPermitted.body', { rank: rankLabel })}
      />
    </SettingsShell>
  );
}
