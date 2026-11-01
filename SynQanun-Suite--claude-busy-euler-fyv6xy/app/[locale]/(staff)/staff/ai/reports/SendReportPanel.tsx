'use client';

import * as React from 'react';
import { CheckCircle2, Mail, MessageCircle, MonitorSmartphone, Send, ShieldCheck } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Badge, Button, Card } from '@/components/ui';
import { useRouter } from '@/lib/i18n/navigation';
import type { ReportChannel } from '@/lib/mock-api';
import { CardHead } from '../../cards';

const CHANNELS: { id: ReportChannel; icon: typeof Mail }[] = [
  { id: 'platform', icon: MonitorSmartphone },
  { id: 'email', icon: Mail },
  { id: 'whatsapp', icon: MessageCircle },
];

export interface ReportPreview {
  to: string;
  subject: string;
  lines: string[];
  signoff: string;
}

export interface ReportSendStatus {
  channels: ReportChannel[];
  state: 'awaitingApproval' | 'queued';
  requested: string;
  approved: string | null;
}

/**
 * "Send" on a matter's client report: choose channels, read exactly what the
 * client receives, then ask a partner — DEMO-ONLY, and it says so.
 *
 * ===========================================================================
 * NOTHING IS SENT
 * ===========================================================================
 * No portal message is written, no email leaves, no WhatsApp is opened. The
 * furthest a request gets is "Queued: demo" on each channel chip, after a
 * partner approves it. The panel's caption says that before anyone presses
 * anything, and the chips never say "Sent".
 *
 * ===========================================================================
 * A PARTNER APPROVES EVERY SEND
 * ===========================================================================
 * Any fee earner may prepare it and ask. Only a partner sees Approve; anyone
 * else is told who has to approve it. A partner who prepares a send still
 * approves it as a separate, explicit step, so the approval line is never
 * implied by the request.
 *
 * The preview is the CLIENT's version of the report: status, next step, what
 * is waiting on them. The firm's internal figures (tasks, approvals, the
 * conflict check) are left out, and a line under the preview says so.
 */
export function SendReportPanel({
  reference,
  clientName,
  preview,
  status,
  canApprove,
}: {
  reference: string;
  clientName: string;
  preview: ReportPreview;
  status: ReportSendStatus | null;
  canApprove: boolean;
}) {
  const t = useTranslations('ai.reports.send');
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [channels, setChannels] = React.useState<Set<ReportChannel>>(
    () => new Set(status?.channels ?? ['platform'])
  );
  const [error, setError] = React.useState<string | null>(null);
  const [announcement, setAnnouncement] = React.useState('');

  const toggle = (channel: ReportChannel) =>
    setChannels((current) => {
      const next = new Set(current);
      if (next.has(channel)) next.delete(channel);
      else next.add(channel);
      return next;
    });

  const request = () => {
    setError(null);
    if (channels.size === 0) {
      setError(t('errors.noChannel'));
      return;
    }
    startTransition(async () => {
      const { requestReportSend } = await import('./send-report-action');
      const result = await requestReportSend({ reference, channels: [...channels] });
      if (result.ok) {
        setAnnouncement(t('done.requested'));
        router.refresh();
      } else setError(t(`errors.${result.error}`));
    });
  };

  const approve = () => {
    setError(null);
    startTransition(async () => {
      const { approveReportSend } = await import('./send-report-action');
      const result = await approveReportSend(reference);
      if (result.ok) {
        setAnnouncement(t('done.queued'));
        router.refresh();
      } else setError(t(`errors.${result.error}`));
    });
  };

  return (
    <Card padding="none" className="overflow-hidden">
      <header className="border-b border-gray-200 p-5">
        <CardHead icon={Send} heading={t('heading')} caption={t('caption')} />
      </header>

      <div className="flex flex-col gap-5 p-5">
        {/* 1 · Channels ---------------------------------------------------- */}
        <fieldset>
          <legend className="text-caption font-medium text-gray-700">{t('channels.legend')}</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {CHANNELS.map(({ id, icon: Icon }) => (
              <label
                key={id}
                className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-pill border border-gray-300 bg-white px-3.5 text-body text-gray-700 has-[:checked]:border-action has-[:checked]:bg-gray-50 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-legal-navy max-tablet:min-h-11"
              >
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-action"
                  checked={channels.has(id)}
                  onChange={() => toggle(id)}
                />
                <Icon aria-hidden size={15} className="text-gray-600" />
                {t(`channels.${id}`)}
              </label>
            ))}
          </div>
          <p className="mt-2 text-caption text-gray-600">{t('channels.hint')}</p>
        </fieldset>

        {/* 2 · What the client receives ------------------------------------ */}
        <section aria-labelledby={`preview-${reference}`}>
          <h3 id={`preview-${reference}`} className="text-caption font-medium text-gray-700">
            {t('preview.heading', { client: clientName })}
          </h3>
          <div className="mt-2 rounded-card border border-gray-200 bg-white">
            <dl className="border-b border-gray-200 px-4 py-3 text-caption">
              <div className="flex flex-wrap gap-x-2">
                <dt className="text-gray-600">{t('preview.to')}</dt>
                <dd className="text-gray-700">
                  <bdi>{preview.to}</bdi>
                </dd>
              </div>
              <div className="mt-1 flex flex-wrap gap-x-2">
                <dt className="text-gray-600">{t('preview.subject')}</dt>
                <dd className="font-medium text-gray-700 [unicode-bidi:isolate]">{preview.subject}</dd>
              </div>
            </dl>
            <div className="flex flex-col gap-2 px-4 py-3 text-body text-gray-700">
              {preview.lines.map((line) => (
                <p key={line} className="[unicode-bidi:plaintext]">
                  {line}
                </p>
              ))}
              <p className="mt-1 text-gray-600">
                <bdi>{preview.signoff}</bdi>
              </p>
            </div>
          </div>
          <p className="mt-2 text-caption text-gray-600">{t('preview.internalLeftOut')}</p>
        </section>

        {/* 3 · Approval and status ----------------------------------------- */}
        <section aria-labelledby={`status-${reference}`} className="border-t border-gray-200 pt-4">
          <h3 id={`status-${reference}`} className="text-caption font-medium text-gray-700">
            {t('status.heading')}
          </h3>

          {status ? (
            <>
              <ul className="mt-2 flex flex-wrap gap-2">
                {status.channels.map((channel) => (
                  <li key={channel}>
                    <Badge
                      tone={status.state === 'queued' ? 'info' : 'warning'}
                      icon={
                        status.state === 'queued' ? (
                          <CheckCircle2 aria-hidden size={12} />
                        ) : (
                          <ShieldCheck aria-hidden size={12} />
                        )
                      }
                    >
                      {t(`channels.${channel}`)}
                      {' · '}
                      {status.state === 'queued' ? t('status.queued') : t('status.awaiting')}
                    </Badge>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-caption text-gray-600">{status.requested}</p>
              {status.approved ? <p className="text-caption text-gray-600">{status.approved}</p> : null}
            </>
          ) : (
            <p className="mt-2 text-body text-gray-600">{t('status.none')}</p>
          )}

          <p role="status" aria-live="polite" className={announcement ? 'mt-3 text-body text-gray-700' : 'sr-only'}>
            {announcement}
          </p>
          {error ? (
            <p role="alert" className="mt-3 text-body text-error">
              {error}
            </p>
          ) : null}

          <div className="mt-4 flex flex-wrap items-center gap-3">
            {status?.state === 'awaitingApproval' && canApprove ? (
              <Button variant="primary" loading={pending} onClick={approve} icon={<ShieldCheck aria-hidden size={15} />}>
                {t('actions.approve')}
              </Button>
            ) : null}
            <Button
              variant={status?.state === 'awaitingApproval' && canApprove ? 'secondary' : 'primary'}
              loading={pending}
              onClick={request}
              icon={<Send aria-hidden size={15} />}
            >
              {status ? t('actions.requestAgain') : t('actions.request')}
            </Button>
          </div>
          {status?.state === 'awaitingApproval' && !canApprove ? (
            <p className="mt-2 text-caption text-gray-600">{t('status.needsPartner')}</p>
          ) : null}
        </section>
      </div>
    </Card>
  );
}

export default SendReportPanel;
