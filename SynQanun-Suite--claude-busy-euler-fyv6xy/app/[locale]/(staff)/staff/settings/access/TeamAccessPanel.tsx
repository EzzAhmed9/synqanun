'use client';

import * as React from 'react';
import { History, Info, KeyRound, UserMinus, UserPlus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Badge, Button, Card, Modal, Select } from '@/components/ui';
import { useRouter } from '@/lib/i18n/navigation';
import { CardHead } from '../../cards';

interface AccessMember {
  id: string;
  name: string;
  rank: string;
  email: string;
  hasAccess: boolean;
  isSelf: boolean;
  changed: boolean;
}

interface AccessLogLine {
  id: string;
  change: 'removed' | 'granted';
  text: string;
  when: string;
}

/**
 * The Team access section's controls: give access, remove it (after a
 * confirmation), and the audit line. See ./page.tsx for what is and is not
 * real here.
 *
 * Removal is the destructive act, so it follows design.md §4: an OUTLINE
 * destructive button opens a dialog, and only the dialog's confirm is a solid
 * error fill. Giving access back is not destructive and needs no dialog; it is
 * recorded in the same audit.
 */
export function TeamAccessPanel({
  members,
  log,
}: {
  members: AccessMember[];
  log: AccessLogLine[];
}) {
  const t = useTranslations('staffSettings.access');
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [confirming, setConfirming] = React.useState<AccessMember | null>(null);
  const [granting, setGranting] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [announcement, setAnnouncement] = React.useState('');

  const withAccess = members.filter((member) => member.hasAccess);
  const withoutAccess = members.filter((member) => !member.hasAccess);

  const apply = (member: AccessMember, grant: boolean) => {
    setError(null);
    startTransition(async () => {
      const { setTeamAccess } = await import('./set-access-action');
      const result = await setTeamAccess({ staffId: member.id, grant });
      if (result.ok) {
        setConfirming(null);
        setGranting('');
        setAnnouncement(t(grant ? 'done.granted' : 'done.removed', { name: member.name }));
        router.refresh();
      } else {
        setError(t(`errors.${result.error}`));
      }
    });
  };

  return (
    <div className="flex flex-col gap-5">
      {/* What this screen is, before anything on it is read. */}
      <div className="flex items-start gap-3 rounded-card border border-gray-300 bg-gray-100 p-4">
        <Info aria-hidden size={16} className="mt-0.5 shrink-0 text-gray-500" />
        <div className="min-w-0">
          <p className="text-caption font-medium text-gray-700">{t('notice.heading')}</p>
          <p className="mt-1 text-caption text-gray-600">{t('notice.body')}</p>
        </div>
      </div>

      {/* The outcome of the last action, announced and shown. */}
      <p role="status" aria-live="polite" className={announcement ? 'text-body text-gray-700' : 'sr-only'}>
        {announcement}
      </p>
      {error && !confirming ? (
        <p role="alert" className="text-body text-error">
          {error}
        </p>
      ) : null}

      {/* The audit line: always visible, newest first. -------------------- */}
      <Card padding="none" className="overflow-hidden">
        <header className="border-b border-gray-200 p-5">
          <CardHead
            icon={History}
            heading={t('audit.heading')}
            caption={t('audit.caption', { count: log.length })}
          />
        </header>
        {log.length === 0 ? (
          <p className="p-5 text-body text-gray-600">{t('audit.empty')}</p>
        ) : (
          <ol className="divide-y divide-gray-200">
            {log.map((line) => (
              <li key={line.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 p-4">
                <span className="flex min-w-0 items-baseline gap-2 text-body text-gray-700">
                  {line.change === 'removed' ? (
                    <UserMinus aria-hidden size={14} className="shrink-0 translate-y-0.5 text-gray-600" />
                  ) : (
                    <UserPlus aria-hidden size={14} className="shrink-0 translate-y-0.5 text-gray-600" />
                  )}
                  <span className="[overflow-wrap:anywhere]">{line.text}</span>
                </span>
                <span className="text-caption text-gray-600 [unicode-bidi:isolate]">
                  {line.when} · {t('audit.thisSession')}
                </span>
              </li>
            ))}
          </ol>
        )}
      </Card>

      {/* Give access ------------------------------------------------------ */}
      <Card padding="lg">
        <CardHead icon={UserPlus} heading={t('grant.heading')} caption={t('grant.caption')} />
        {withoutAccess.length === 0 ? (
          <p className="mt-4 text-body text-gray-600">{t('grant.none')}</p>
        ) : (
          <form
            className="mt-4 flex flex-wrap items-end gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              const member = withoutAccess.find((row) => row.id === granting);
              if (!member) {
                setError(t('errors.chooseMember'));
                return;
              }
              apply(member, true);
            }}
          >
            <label className="flex min-w-[14rem] flex-1 flex-col gap-1.5">
              <span className="text-caption font-medium text-gray-700">{t('grant.label')}</span>
              <Select value={granting} onChange={(event) => setGranting(event.target.value)}>
                <option value="">{t('grant.choose')}</option>
                {withoutAccess.map((member) => (
                  <option key={member.id} value={member.id}>
                    {`${member.name} — ${member.rank}`}
                  </option>
                ))}
              </Select>
            </label>
            <Button type="submit" variant="secondary" loading={pending && !confirming} icon={<UserPlus aria-hidden size={15} />}>
              {t('grant.action')}
            </Button>
          </form>
        )}
      </Card>

      {/* Who has access --------------------------------------------------- */}
      <Card padding="none" className="overflow-hidden">
        <header className="border-b border-gray-200 p-5">
          <CardHead
            icon={KeyRound}
            heading={t('members.heading')}
            caption={t('members.caption', { count: withAccess.length })}
          />
        </header>
        <ul className="divide-y divide-gray-200">
          {withAccess.map((member) => (
            <li key={member.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="min-w-[12rem] flex-1">
                <p className="text-body text-gray-700">
                  <bdi>{member.name}</bdi>
                </p>
                <p className="mt-0.5 text-caption text-gray-600">
                  {member.rank} ·{' '}
                  <span dir="ltr" className="[overflow-wrap:anywhere]">
                    {member.email}
                  </span>
                </p>
                {member.changed ? (
                  <p className="mt-0.5 text-caption text-gray-600">{t('members.changed')}</p>
                ) : null}
              </div>
              {member.isSelf ? (
                // No control removes your own access: it would lock you out
                // of the screen that undoes it.
                <Badge tone="neutral" icon={null}>
                  {t('members.you')}
                </Badge>
              ) : (
                <Button
                  variant="destructive"
                  size="sm"
                  icon={<UserMinus aria-hidden size={14} />}
                  onClick={() => {
                    setError(null);
                    setConfirming(member);
                  }}
                  aria-label={t('remove.label', { name: member.name })}
                >
                  {t('remove.action')}
                </Button>
              )}
            </li>
          ))}
        </ul>
      </Card>

      {/* The confirmation step. ------------------------------------------- */}
      <Modal
        open={confirming !== null}
        onClose={() => (pending ? undefined : setConfirming(null))}
        title={confirming ? t('remove.confirmTitle', { name: confirming.name }) : ''}
        description={confirming ? t('remove.confirmBody', { name: confirming.name }) : undefined}
        size="sm"
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="secondary" onClick={() => setConfirming(null)} disabled={pending}>
              {t('remove.cancel')}
            </Button>
            <Button
              variant="destructive-confirm"
              loading={pending}
              icon={<UserMinus aria-hidden size={15} />}
              onClick={() => confirming && apply(confirming, false)}
            >
              {t('remove.confirm')}
            </Button>
          </div>
        }
      >
        {error ? (
          <p role="alert" className="text-body text-error">
            {error}
          </p>
        ) : (
          <p className="text-caption text-gray-600">{t('remove.audited')}</p>
        )}
      </Modal>
    </div>
  );
}

export default TeamAccessPanel;
