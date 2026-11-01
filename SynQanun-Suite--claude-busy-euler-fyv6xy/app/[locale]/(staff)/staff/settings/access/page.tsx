import { KeyRound } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { formatCalendarDate, formatClockTime, isolateRun } from '@/lib/format';
import type { Locale } from '@/lib/i18n/routing';
import { mockApi } from '@/lib/mock-api';
import { SettingsNotPermitted, SettingsShell } from '../SettingsShell';
import { settingsTabAllows } from '../tabs';
import { TeamAccessPanel } from './TeamAccessPanel';

/**
 * Settings → Team access. Partner only — the client's October 2026 amendment.
 *
 * Who may sign in to the workspace, a control to give access back or remove
 * it, and the audit line of every change made this session. Removal asks
 * first, in a dialog that says what will and will not happen.
 *
 * DEMO STATE, AND IT SAYS SO. Nothing here talks to an identity provider: no
 * account is locked and nobody is signed out. A change overlays the roster
 * for this session (see `withAccessChange` in lib/mock-api.ts), so the Team
 * tab and the lead pickers agree with it, and it is gone on restart.
 *
 * Other ranks do not see the tab, and a typed address gets the same "not for
 * this rank" screen the other partner-only tabs give. The gate runs before
 * the query.
 */

export const dynamic = 'force-dynamic';

export default async function AccessSettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const typedLocale = locale as Locale;

  const me = await mockApi.staff.currentStaff();

  if (!settingsTabAllows(me.rank, 'access')) {
    const tRank = await getTranslations('ranks');
    return (
      <SettingsNotPermitted icon={KeyRound} rank={me.rank} tab="access" rankLabel={tRank(me.rank)} />
    );
  }

  const [access, t, tRank] = await Promise.all([
    mockApi.staff.teamAccess(me.id),
    getTranslations('staffSettings.access'),
    getTranslations('ranks'),
  ]);

  return (
    <SettingsShell rank={me.rank} active="access">
      <TeamAccessPanel
        // Resolved here, where the locale is: every string crosses into the
        // client component already in one language.
        members={access.members.map((member) => ({
          id: member.id,
          name: member.name[typedLocale],
          rank: tRank(`holder.${member.rank}`),
          email: member.email,
          hasAccess: member.hasAccess,
          isSelf: member.isSelf,
          changed: member.changedThisSession,
        }))}
        log={access.log.map((entry) => ({
          id: entry.id,
          change: entry.change,
          // Names are the objects of prepositions in both languages, so no
          // Arabic verb has to agree with anyone's gender.
          text: t(`log.${entry.change}`, {
            subject: isolateRun(entry.subject[typedLocale]),
            actor: isolateRun(entry.actor[typedLocale]),
          }),
          when: `${formatCalendarDate(entry.on, typedLocale, { month: 'short' })} · ${formatClockTime(entry.at, typedLocale)}`,
        }))}
      />
    </SettingsShell>
  );
}
