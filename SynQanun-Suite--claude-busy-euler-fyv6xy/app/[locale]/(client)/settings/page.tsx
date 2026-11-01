import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import {
  Badge,
  Button,
  Card,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  tabTriggerClasses,
} from '@/components/ui';
import type { ClientTeamMember } from '@/fixtures/accounts';
import type { NotificationPreference } from '@/fixtures/settings';
import { Link } from '@/lib/i18n/navigation';
import type { Locale } from '@/lib/i18n/routing';
import { mockApi } from '@/lib/mock-api';
import { cn, initialsOf } from '@/lib/utils';
import { ClientTopBar } from '../ClientPortalChrome';
import { InviteTeammateButton } from './InviteTeammateModal';
import { NotificationsPanel } from './NotificationsPanel';
import { PasswordPanel } from './PasswordPanel';
import { ProfilePanel } from './ProfilePanel';

/**
 * Settings — the last screen of Batch 2, and the only one that is entirely a
 * write surface.
 *
 * Every other client screen reads and carries a forward-referencing button or
 * two. Here every control is one, which is why the save policy is decided once,
 * in SaveRow.tsx, rather than per button: the controls behave normally, and
 * pressing Save says plainly that nothing was saved.
 *
 * ---------------------------------------------------------------------------
 * WHAT THE EXPORT BUNDLES THAT IS NOT THIS SCREEN
 * ---------------------------------------------------------------------------
 * The "Invite teammate" MODAL. BUILD_PLAN.md §3 groups the client-side modals
 * into Batch 3, and this one needs more behind it than the others: an invite is
 * a write, it issues a token, and it grants a stranger access to privileged
 * files. The roster below is a read, so it is built; the button that opens the
 * modal carries a MOCK note.
 *
 * ---------------------------------------------------------------------------
 * NOT CARRIED OVER
 * ---------------------------------------------------------------------------
 *  · THE LANGUAGE SELECTOR. design.md §12: the toggle "lives in the top nav,
 *    persistent, never buried in a settings screen". The export buries it here.
 *    See the note in ProfilePanel.tsx, with the time zone and numeral pickers
 *    that have the same problem for different reasons.
 *
 *  · EVERY SECURITY CLAIM, for the fifth screen running: "Client Trust Account
 *    #ADGM-9921" in the footer and "Client Vault ID" in the sidebar, "Secure
 *    Enclave" / "بيئة آمنة ومشفرة" as a status indicator, "Dual-factor
 *    verification active", and a linked UAE PASS identity with an Emirates ID
 *    number. See PasswordPanel.tsx.
 *
 *  · THE PREFILLED PASSWORD in the markup of both language versions.
 *
 *  · THE ROLE PREVIEW SWITCHER — "Previewing as: Admin (Full governance)" — and
 *    the dashed note explaining how the page renders for a Member. That is a
 *    developer affordance shipped as a product feature, and it advertises an
 *    access-control model that nothing enforces. Roles are real data on the
 *    roster; the switcher is not.
 *
 *  · "Active seats: 3/10", "invitations expire after 72 hours", and "enterprise
 *    domain verification" — a seat licence, an expiry policy and a domain rule,
 *    none of which exist.
 *
 *  · THE STICKY "last synced: today 10:42 AM" line, the avatar photo upload, the
 *    "Verified" badge on an editable email, "v2.4 LTS", the pulsing online dot,
 *    and — third export running — the Arabic sidebar putting the CLIENT's name
 *    where the tenant firm's belongs.
 */

/**
 * NOT exported.
 *
 * A `page.tsx` in the App Router may only export a fixed set of names —
 * `default`, `metadata`, `dynamic`, `generateStaticParams` and a handful more.
 * Next generates a type constraint over the module's other exports, so adding
 * one here fails `next build` with "does not satisfy the constraint
 * '{ [x: string]: never; }'" even though `tsc --noEmit` is perfectly happy:
 * the constraint lives in .next/types, which only the build writes.
 *
 * ENGAGEMENT_TABS gets away with being exported because EngagementDetail.tsx is
 * a component, not a route. Nothing outside this file needs these, so they stay
 * local rather than moving to a module of their own.
 */
const SETTINGS_TABS = ['profile', 'notifications', 'security', 'team'] as const;
type SettingsTab = (typeof SETTINGS_TABS)[number];

function isSettingsTab(value: string | undefined): value is SettingsTab {
  return value !== undefined && (SETTINGS_TABS as readonly string[]).includes(value);
}

/** Rendered per request — the account and roster come from the session. */
export const dynamic = 'force-dynamic';

export default async function SettingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const [{ locale }, { tab }] = await Promise.all([params, searchParams]);
  setRequestLocale(locale);

  const activeTab: SettingsTab = isSettingsTab(tab) ? tab : 'profile';

  const [account, team, notifications] = await Promise.all([
    mockApi.session.currentClient(),
    mockApi.settings.team(),
    mockApi.settings.notifications(),
  ]);

  return (
    <Settings
      locale={locale as Locale}
      tab={activeTab}
      account={account}
      team={team}
      notifications={notifications}
    />
  );
}

function Settings({
  locale,
  tab,
  account,
  team,
  notifications,
}: {
  locale: Locale;
  tab: SettingsTab;
  account: Awaited<ReturnType<typeof mockApi.session.currentClient>>;
  team: ClientTeamMember[];
  notifications: NotificationPreference[];
}) {
  const t = useTranslations('settings');

  return (
    <>
      <ClientTopBar title={t('title')} subtitle={t('subtitle')} />

      {/* Tabs — real links carrying ?tab=, the same arrangement the engagement
          detail uses. A tab that is its own URL is linkable, bookmarkable and
          reachable with the back button, which also makes it navigation rather
          than a `role="tablist"`. `tabTriggerClasses` is shared, so one look
          cannot become two. */}
      <div className="border-b border-gray-200 bg-white px-6">
        <nav
          aria-label={t('tabsLabel')}
          className="mx-auto flex w-full max-w-content gap-1 overflow-x-auto"
        >
          {SETTINGS_TABS.map((value) => {
            const isActive = value === tab;

            return (
              <Link
                key={value}
                href={{
                  pathname: '/settings',
                  query: value === 'profile' ? {} : { tab: value },
                }}
                aria-current={isActive ? 'page' : undefined}
                className={cn(tabTriggerClasses(isActive), 'whitespace-nowrap')}
              >
                {t(`tabs.${value}`)}
                {value === 'team' ? (
                  <span className="font-mono text-reference text-gray-500">{team.length}</span>
                ) : null}
              </Link>
            );
          })}
        </nav>
      </div>

      <main className="mx-auto flex w-full max-w-content flex-1 flex-col gap-6 px-6 py-6">
        {tab === 'profile' ? (
          <ProfilePanel
            name={account.name[locale]}
            title={account.title?.[locale] ?? ''}
            phone={account.phone ?? ''}
            email={account.email}
            organisation={account.organisation?.[locale] ?? ''}
          />
        ) : null}

        {tab === 'notifications' ? (
          <NotificationsPanel
            rows={notifications.map((row) => ({ category: row.category, email: row.email }))}
          />
        ) : null}

        {tab === 'security' ? <PasswordPanel /> : null}

        {tab === 'team' ? (
          <TeamPanel locale={locale} team={team} selfId={account.id} />
        ) : null}
      </main>
    </>
  );
}

/* ===========================================================================
 * Team
 * ======================================================================== */

function TeamPanel({
  locale,
  team,
  selfId,
}: {
  locale: Locale;
  team: ClientTeamMember[];
  selfId: string;
}) {
  const t = useTranslations('settings.team');

  return (
    <Card padding="none">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-200 p-5">
        <div>
          <h2 className="font-sans text-title text-gray-700">{t('heading')}</h2>
          <p className="mt-0.5 text-caption text-gray-500">{t('caption')}</p>
        </div>

        {/*
          The invite modal is built. Sending is a clear no-op — an invitation is
          a write that hands someone access to privileged files, and see
          InviteTeammateModal.tsx for why a pending row would fail in both
          directions at once.

          The addresses already on the team go with it, so the modal can tell a
          client that someone is already here rather than silently accepting a
          duplicate.
        */}
        <InviteTeammateButton
          label={t('invite')}
          existingEmails={team.map((member) => member.email.toLowerCase())}
        />
      </div>

      <Table>
        <TableHead>
          <tr>
            <TableHeaderCell>{t('columns.person')}</TableHeaderCell>
            <TableHeaderCell>{t('columns.email')}</TableHeaderCell>
            <TableHeaderCell>{t('columns.role')}</TableHeaderCell>
            <TableHeaderCell>{t('columns.status')}</TableHeaderCell>
          </tr>
        </TableHead>

        <TableBody>
          {team.map((member) => (
            <TableRow key={member.id}>
              {/* No `label`: this cell is the card's heading below 768px. */}
              <TableCell className="py-3">
                <div className="flex items-start gap-3">
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-pill border border-gray-200 bg-gray-100 text-caption font-medium text-gray-600">
                    {initialsOf(member.name[locale])}
                  </span>
                  <div className="min-w-0">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-body-emphasis text-gray-700">
                        {member.name[locale]}
                      </span>
                      {member.id === selfId ? (
                        <Badge tone="neutral">{t('you')}</Badge>
                      ) : null}
                    </span>
                    <span className="mt-0.5 block text-caption text-gray-500">
                      {member.title[locale]}
                    </span>
                  </div>
                </div>
              </TableCell>

              <TableCell label={t('columns.email')} className="py-3">
                {/* Latin in every locale — forced LTR and isolated so RTL cannot
                    split an address around its dots and @. */}
                <span
                  dir="ltr"
                  className="font-mono text-reference text-gray-600 [unicode-bidi:isolate]"
                >
                  {member.email}
                </span>
              </TableCell>

              <TableCell label={t('columns.role')} className="py-3">
                <Badge tone="neutral">{t(`roles.${member.role}`)}</Badge>
              </TableCell>

              <TableCell label={t('columns.status')} className="py-3">
                {/* success for someone who has taken up their access, warning
                    for an invitation still outstanding — icon and label both,
                    never the hue alone. */}
                <Badge tone={member.status === 'active' ? 'success' : 'warning'}>
                  {t(`statuses.${member.status}`)}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/*
        No per-row remove or deactivate control. Those are writes, they belong
        with the invite modal in Batch 3, and a row of buttons that do nothing is
        worse here than anywhere else on this screen — removing a colleague's
        access is not something to mime.
      */}
      <p className="border-t border-gray-200 bg-gray-50 p-5 text-caption text-gray-500">
        {t('managedNote')}
      </p>
    </Card>
  );
}
