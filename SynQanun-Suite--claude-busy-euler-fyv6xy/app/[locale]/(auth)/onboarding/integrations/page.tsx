'use client';

import * as React from 'react';
import { CalendarDays, Mail, Video } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useOnboarding } from '@/components/onboarding/OnboardingProvider';
import { WizardShell } from '@/components/onboarding/WizardShell';
import { Badge, Button, Card } from '@/components/ui';

type MeetingProvider = 'zoom' | 'teams' | 'meet';

/**
 * Step 3 — connect integrations.
 *
 * COLOUR IS LOAD-BEARING HERE. Every Connect button is legal-navy, not
 * syn-red. design.md §2 splits the two: red is the human's own action, navy is
 * anything the system does on their behalf. Pressing Connect hands the user
 * off to a third party's OAuth consent screen and brings back a token — the
 * product acting for them, not them acting directly. The wizard's Continue
 * button stays red, so the one primary action per view (design.md §4) is still
 * unambiguous.
 *
 * MOCK: every connection here is theatre. BUILD_PLAN.md §5 — integrations are
 * shown as connected in fixture data, with no real OAuth flow in Track A, and
 * §"Three tracks" leaves these to Track B because real API access needs
 * provider business verification and a security review, not just code.
 */
export default function IntegrationsStep() {
  const t = useTranslations('onboarding.integrations');
  const { integrations, setIntegrations } = useOnboarding();

  const mailProviderLabel = integrations.mail
    ? t(integrations.mail === 'google' ? 'google' : 'microsoft')
    : null;

  function toggleMeeting(provider: MeetingProvider) {
    const next = integrations.meetings.includes(provider)
      ? integrations.meetings.filter((p) => p !== provider)
      : [...integrations.meetings, provider];
    setIntegrations({ meetings: next });
  }

  return (
    <WizardShell step="integrations" title={t('title')}>
      <div className="flex flex-col gap-6">
        <p className="text-body text-gray-600">{t('cardBody')}</p>

        {/* --- Email ---------------------------------------------------- */}
        <Card padding="lg">
          <SectionHeading icon={<Mail aria-hidden size={16} />} title={t('mailTitle')} body={t('mailBody')} />

          <div className="mt-4 grid grid-cols-1 gap-3 tablet:grid-cols-2">
            {(['google', 'microsoft'] as const).map((provider) => (
              <ProviderRow
                key={provider}
                label={t(provider)}
                connected={integrations.mail === provider}
                onConnect={() => setIntegrations({ mail: provider })}
                onDisconnect={() => setIntegrations({ mail: null })}
              />
            ))}
          </div>
        </Card>

        {/* --- Calendar ------------------------------------------------- */}
        <Card padding="lg">
          <SectionHeading
            icon={<CalendarDays aria-hidden size={16} />}
            title={t('calendarTitle')}
            body={t('calendarBody')}
          />

          {/*
            No separate control. The calendar rides on the mail account, so
            offering a second Connect button would imply a second consent step
            that does not exist. It reflects the email choice instead.
          */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-card border border-gray-200 bg-gray-50 p-3">
            <span className="text-body text-gray-600">
              {mailProviderLabel
                ? t('calendarFollows', { provider: mailProviderLabel })
                : t('calendarWaiting')}
            </span>
            <StatusTag connected={Boolean(integrations.mail)} />
          </div>
        </Card>

        {/* --- Meetings -------------------------------------------------- */}
        <Card padding="lg">
          <SectionHeading
            icon={<Video aria-hidden size={16} />}
            title={t('meetingsTitle')}
            body={t('meetingsBody')}
          />

          <div className="mt-4 grid grid-cols-1 gap-3 tablet:grid-cols-3">
            {(['zoom', 'teams', 'meet'] as const).map((provider) => (
              <ProviderRow
                key={provider}
                label={t(provider)}
                connected={integrations.meetings.includes(provider)}
                onConnect={() => toggleMeeting(provider)}
                onDisconnect={() => toggleMeeting(provider)}
              />
            ))}
          </div>
        </Card>

        <p className="text-caption text-gray-500">{t('skipNote')}</p>
      </div>
    </WizardShell>
  );
}

function SectionHeading({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm border border-gray-200 bg-gray-50 text-legal-navy">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-title text-gray-700">{title}</span>
        <span className="mt-0.5 block text-caption text-gray-500">{body}</span>
      </span>
    </div>
  );
}

function ProviderRow({
  label,
  connected,
  onConnect,
  onDisconnect,
}: {
  label: string;
  connected: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
}) {
  const t = useTranslations('onboarding.integrations');
  const [pending, setPending] = React.useState(false);

  async function handleConnect() {
    setPending(true);
    // MOCK: stands in for the round trip to the provider's consent screen and
    // back. The delay exists so the pending state is visible at all — the real
    // flow leaves the page entirely and returns with a code to exchange.
    await new Promise((resolve) => setTimeout(resolve, 600));
    setPending(false);
    onConnect();
  }

  return (
    <div className="flex flex-col gap-3 rounded-card border border-gray-200 p-3">
      <div className="flex items-center justify-between gap-2">
        {/* Provider names are proper nouns and stay Latin in both locales. */}
        <span dir="ltr" className="text-body-emphasis text-gray-700 [unicode-bidi:isolate]">
          {label}
        </span>
        <StatusTag connected={connected} />
      </div>

      {connected ? (
        <Button variant="secondary" size="sm" fullWidth onClick={onDisconnect}>
          {t('disconnect')}
        </Button>
      ) : (
        // legal-navy: the system acting on the user's behalf — design.md §2.
        <Button variant="ai" size="sm" fullWidth loading={pending} onClick={handleConnect}>
          {pending ? t('connecting') : t('connect')}
        </Button>
      )}
    </div>
  );
}

/** Status is carried by an icon and a word, never by colour alone (§3.5). */
function StatusTag({ connected }: { connected: boolean }) {
  const t = useTranslations('onboarding.integrations');
  return (
    <Badge tone={connected ? 'success' : 'neutral'}>
      {connected ? t('connected') : t('notConnected')}
    </Badge>
  );
}
