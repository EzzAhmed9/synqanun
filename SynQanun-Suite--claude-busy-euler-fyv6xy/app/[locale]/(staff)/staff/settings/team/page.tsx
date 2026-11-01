import { Info, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import {
  Badge,
  Card,
  EmptyState,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '@/components/ui';
import { formatCalendarDate } from '@/lib/format';
import type { Locale } from '@/lib/i18n/routing';
import { mockApi, type Roster, type RosterMember } from '@/lib/mock-api';
import type { Rank } from '@/lib/ranks';
import { cn, initialsOf } from '@/lib/utils';
import { SettingsShell } from '../SettingsShell';
import { canManageRoster } from '../tabs';
import { AddTeamMember } from './AddTeamMember';
import { RosterFilters } from './RosterFilters';

/**
 * Settings → Team & Roster — BUILD_PLAN.md §3, Batch 6.
 *
 * ===========================================================================
 * §3.1 REMOVED THE THING THIS EXPORT IS BUILT AROUND
 * ===========================================================================
 * The Stitch export's spine is an invite flow: a "Pending Invites" metric, a
 * "Pending Invites (3)" segment, an "Invited Pending — Expires in 5d" status,
 * per-row "Resend invite link" / "Copy invitation URL" / "Revoke invitation",
 * and a modal whose primary button is "Send invitation".
 *
 * BUILD_PLAN.md §3.1 deleted all of it, in terms:
 *
 *   · "There is no Accept Invite screen for staff." Staff are provisioned by
 *     temporary password instead.
 *   · The per-row action is "Resend temporary password", NOT "Resend invite".
 *   · Statuses are "Temporary password issued" / "Active" / "Deactivated".
 *     "There is no 'Invited — pending' state for staff."
 *   · The token-and-expiry invite flow is client-side only: "Do not reuse it
 *     for staff."
 *
 * So there is no pending-invite segment here, no expiry countdown, and no
 * invitation URL to copy. A new colleague's account EXISTS and WORKS from the
 * moment it is created; what is outstanding is that they are still on the
 * password they were handed, which is what `temporaryPasswordIssued` says.
 *
 * ===========================================================================
 * WHAT IS DERIVED, AND WHY THE DEPARTMENT COLUMN IS NOT STORED
 * ===========================================================================
 * The export gives each person a "Department / Practice Area" field and then
 * shows people working outside it. Here the practice areas ARE the areas of
 * the open files they are on, read from the same matters and projects the
 * registers read — so the column cannot drift, and someone with no open work
 * honestly shows none instead of carrying a label nobody maintains.
 *
 * The engagement count is derived the same way, and it is the column that
 * makes the deactivated row useful: it says whether withdrawing that person's
 * access left anything behind.
 *
 * ===========================================================================
 * READING IS OPEN. CHANGING IS NOT.
 * ===========================================================================
 * The tab has no rank allow-list — every register in this product already
 * names the team on a file, so who works here is not a secret. Adding a person
 * creates an account and assigns a rank, so `canManageRoster` gates the
 * control, and add-member-action.ts gates the endpoint independently because a
 * Server Action is reachable whether or not a button was rendered.
 *
 * ===========================================================================
 * THE REST OF WHAT THE EXPORT SHIPPED
 * ===========================================================================
 *   · COUNTS THAT DISAGREE WITH EACH OTHER. "28 Total Practitioners" in the
 *     metric card, "31" in the segment strip, "Showing 7 of 31", and
 *     "Fee Earners 19 + Support 9 = 28" against segments reading "21 + 10 =
 *     31". Four numbers, no two of which reconcile. This firm has eleven
 *     people and the screen counts them.
 *   · "68% billable core" and "Capacity: 93%" — ratios against a denominator
 *     nothing defines.
 *   · A BILLABLE RATE FIELD IN THE ADD FORM, pre-filled "1,850 AED" with
 *     "Benchmark: 1,850 AED for Senior Associate". The firm is in Cairo and
 *     invoices in USD (fixtures/invoices.ts); there is no rate card anywhere
 *     in this product, and inventing one inside a form that creates a person
 *     would make a number up and then bill against it.
 *   · MANDATORY MFA, checked by default — "Require hardware / authenticator
 *     MFA on first verification ... Mandated by SynQanun firm security
 *     policy". There is no authentication at all in Track A and BUILD_PLAN §6
 *     defers 2FA to Track B. A checked box claiming a security policy is
 *     enforced is the most consequential kind of false state.
 *   · BAR REGISTRATION NUMBERS — "BAR-UAE-8812", "BAR-DIFC-0421",
 *     "BAR-ADGM-1109" — for a Cairo firm, and different numbers for the same
 *     people between the two locales.
 *   · PHONE NUMBERS with Dubai dialling codes, invented per person.
 *   · SEVEN PEOPLE WHO ARE NOT THIS FIRM'S STAFF, and a rank vocabulary that
 *     does not match ours ("Associate", "Senior Partner").
 *   · PORTRAIT PHOTOGRAPHS generated per row, with prompts left in the markup
 *     as `data-alt`. The product has no photo field, and design.md's avatar is
 *     initials.
 *   · "Cluster: UAE-Central-01", "Live directory synced", "تحديث مباشر
 *     للمصادقة وصلاحيات RBAC" — infrastructure and access-control claims.
 *   · A "Reassign matters" row action, which would move live client work with
 *     one click and no confirmation.
 *   · {{CLIENT_LOGO}} literal for the seventh export; a timer pre-loaded to
 *     01:42:15 on MAT-2204, which is not on the register.
 */

export const dynamic = 'force-dynamic';

export default async function TeamSettingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string; rank?: string }>;
}) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  setRequestLocale(locale);

  const me = await mockApi.staff.currentStaff();
  const roster = await mockApi.staff.roster({ status: query.status, rank: query.rank });

  return (
    <Team
      locale={locale as Locale}
      rank={me.rank}
      roster={roster}
      canManage={canManageRoster(me.rank)}
      selected={{ status: query.status ?? '', rank: query.rank ?? '' }}
    />
  );
}

const STATUSES = ['active', 'temporaryPasswordIssued', 'deactivated'] as const;

function Team({
  locale,
  rank,
  roster,
  canManage,
  selected,
}: {
  locale: Locale;
  rank: Rank;
  roster: Roster;
  canManage: boolean;
  selected: { status: string; rank: string };
}) {
  const t = useTranslations('staffSettings.team');
  const tRank = useTranslations('ranks');

  return (
    <SettingsShell rank={rank} active="team">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-2xl text-caption text-gray-600">{t('intro')}</p>
        {/* Rendered only for a rank that may use it — absent, never disabled.
            The endpoint checks independently; see add-member-action.ts. */}
        {canManage ? <AddTeamMember ranks={roster.ranks} /> : null}
      </div>

      {/*
        How staff get their access, said once and plainly. It is the fact the
        export's entire invite apparatus gets wrong, and every status label
        below only makes sense against it.
      */}
      <div className="flex items-start gap-3 rounded-card border border-gray-300 bg-gray-100 p-4">
        <Info aria-hidden size={16} className="mt-0.5 shrink-0 text-gray-500" />
        <div className="min-w-0">
          <p className="text-caption font-medium text-gray-700">{t('provisioning.heading')}</p>
          <p className="mt-1 text-caption text-gray-600">{t('provisioning.body')}</p>
        </div>
      </div>

      <Card padding="lg">
        <RosterFilters
          status={selected.status}
          rank={selected.rank}
          statuses={STATUSES.map((value) => ({
            value,
            label: t(`status.${value}`),
            count: roster.counts[value],
          }))}
          ranks={roster.ranks.map((value) => ({ value, label: tRank(value) }))}
        />
      </Card>

      <p className="text-caption text-gray-500">
        {t('count', { shown: roster.items.length, total: roster.total })}
      </p>

      {roster.items.length === 0 ? (
        <EmptyState icon={Users} title={t('empty.title')} body={t('empty.body')} />
      ) : (
        <div className="overflow-hidden rounded-card border border-gray-200 bg-white">
          <Table striped className="tablet:min-w-[56rem]">
            <TableHead>
              <TableRow>
                <TableHeaderCell>{t('columns.member')}</TableHeaderCell>
                <TableHeaderCell>{t('columns.rank')}</TableHeaderCell>
                <TableHeaderCell>{t('columns.work')}</TableHeaderCell>
                <TableHeaderCell>{t('columns.status')}</TableHeaderCell>
                <TableHeaderCell>{t('columns.joined')}</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {roster.items.map((member) => (
                <Row key={member.id} member={member} locale={locale} t={t} tRank={tRank} />
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </SettingsShell>
  );
}

function Row({
  member,
  locale,
  t,
  tRank,
}: {
  member: RosterMember;
  locale: Locale;
  t: (key: string, values?: Record<string, string | number>) => string;
  tRank: (key: string) => string;
}) {
  const gone = member.status === 'deactivated';

  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-3">
          {/* Initials, per design.md. The export generates a portrait per
              person and leaves the image prompt in the markup. */}
          <span
            aria-hidden
            className={cn(
              'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-caption font-medium',
              gone ? 'bg-gray-100 text-gray-500' : 'bg-legal-navy/10 text-legal-navy'
            )}
          >
            {initialsOf(member.name[locale])}
          </span>
          <div className="min-w-0">
            <span className={cn('block text-body', gone ? 'text-gray-500' : 'text-gray-900')}>
              <bdi>{member.name[locale]}</bdi>
              {member.isYou ? (
                <span className="ms-2 text-caption text-gray-500">{t('you')}</span>
              ) : null}
            </span>
            {/* An address is Latin in both locales. */}
            <span dir="ltr" className="block text-start font-mono text-reference text-gray-500">
              {member.email}
            </span>
          </div>
        </div>
      </TableCell>

      <TableCell>
        <span className="text-body text-gray-700">{tRank(`holder.${member.rank}`)}</span>
      </TableCell>

      <TableCell>
        <span className="block text-body text-gray-700">
          {t('openEngagements', { count: member.openEngagements })}
        </span>
        {member.practiceAreas.length > 0 ? (
          <span className="mt-0.5 block text-caption text-gray-500">
            <bdi>{member.practiceAreas.map((area) => area[locale]).join(' · ')}</bdi>
          </span>
        ) : null}
      </TableCell>

      <TableCell>
        <Badge
          tone={
            member.status === 'active'
              ? 'success'
              : member.status === 'temporaryPasswordIssued'
                ? 'warning'
                : 'neutral'
          }
        >
          {t(`status.${member.status}`)}
        </Badge>
        {member.addedThisSession ? (
          // Says so on the row, not only in a comment. See the session store.
          <span className="mt-1 block text-caption text-gray-500">{t('addedThisSession')}</span>
        ) : null}
      </TableCell>

      <TableCell>
        <span className="text-caption text-gray-600 [unicode-bidi:isolate]">
          {formatCalendarDate(member.joinedOn, locale, { month: 'short' })}
        </span>
      </TableCell>
    </TableRow>
  );
}
