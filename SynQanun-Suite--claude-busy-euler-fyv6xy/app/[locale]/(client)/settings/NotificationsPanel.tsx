'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Card } from '@/components/ui';
import type { NotificationCategory } from '@/fixtures/settings';
import { cn } from '@/lib/utils';
import { SaveRow } from './SaveRow';

/**
 * Notification preferences — one switch per category, over the one channel this
 * product has.
 *
 * The export's second column, "SMS / WhatsApp", is gone; see the header of
 * fixtures/settings.ts. Its categories are gone too — they name features that
 * do not exist ("escrow deposit receipts") or re-assert the privilege claim
 * already stripped from Messages ("Privileged Counsel Dispatches"). The four
 * here are the four sections of the portal the client already has.
 */

export interface NotificationsPanelProps {
  rows: { category: NotificationCategory; email: boolean }[];
}

export function NotificationsPanel({ rows }: NotificationsPanelProps) {
  const t = useTranslations('settings.notifications');

  const initial = React.useMemo(
    () => Object.fromEntries(rows.map((row) => [row.category, row.email])),
    [rows]
  ) as Record<NotificationCategory, boolean>;

  const [state, setState] = React.useState(initial);
  const [attempted, setAttempted] = React.useState(false);

  const dirty = rows.some((row) => state[row.category] !== initial[row.category]);

  return (
    <Card padding="lg">
      <div className="border-b border-gray-200 pb-3">
        <h2 className="font-sans text-title text-gray-700">{t('heading')}</h2>
        <p className="mt-0.5 text-caption text-gray-500">{t('caption')}</p>
      </div>

      <ul className="mt-2 divide-y divide-gray-200">
        {rows.map((row) => (
          <li
            key={row.category}
            className="flex flex-wrap items-start justify-between gap-4 py-4"
          >
            <div className="min-w-0 flex-1">
              <p className="text-body text-gray-700">{t(`categories.${row.category}.title`)}</p>
              <p className="mt-0.5 text-caption text-gray-500">
                {t(`categories.${row.category}.body`)}
              </p>
            </div>

            <Switch
              checked={state[row.category]}
              onChange={(next) => {
                setState((current) => ({ ...current, [row.category]: next }));
                setAttempted(false);
              }}
              label={t('emailFor', { category: t(`categories.${row.category}.title`) })}
              onLabel={t('on')}
              offLabel={t('off')}
            />
          </li>
        ))}
      </ul>

      <SaveRow
        dirty={dirty}
        attempted={attempted}
        onSave={() => setAttempted(true)}
        onDiscard={() => {
          setState(initial);
          setAttempted(false);
        }}
      />
    </Card>
  );
}

/**
 * An on/off switch.
 *
 * Built here rather than in components/ui because this is its FIRST instance —
 * the rule on this project is to extract at the second, the same call made for
 * the message composer's textarea. When the staff Settings in Batch 6 needs one,
 * it moves.
 *
 * A real `<button role="switch">` with `aria-checked`, not a styled checkbox:
 * the kit's <Checkbox> is a checkbox, and a preference that takes effect the
 * moment it is flipped is a switch. It also carries a visible on/off WORD
 * beside it — design.md §2 and brand-guidelines.md §3.5 forbid conveying state
 * by colour alone, and a red-versus-grey track is exactly that. The export has
 * no label on either state.
 */
function Switch({
  checked,
  onChange,
  label,
  onLabel,
  offLabel,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  onLabel: string;
  offLabel: string;
}) {
  return (
    <div className="flex shrink-0 items-center gap-2.5">
      <span className={cn('text-caption', checked ? 'text-gray-700' : 'text-gray-500')}>
        {checked ? onLabel : offLabel}
      </span>

      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex h-6 w-11 shrink-0 items-center rounded-pill border transition-colors',
          'outline-none focus-visible:border-legal-navy',
          checked ? 'border-transparent bg-action' : 'border-gray-300 bg-gray-200'
        )}
      >
        {/*
          `insetInlineStart` rather than `left`, and a logical translate, so the
          knob travels toward the inline END in both directions — it slides
          right in English and left in Arabic without a second rule.
        */}
        <span
          aria-hidden
          className={cn(
            'inline-block h-4 w-4 rounded-pill bg-white shadow-resting transition-transform',
            checked ? 'translate-x-5 rtl:-translate-x-5' : 'translate-x-0'
          )}
          style={{ marginInlineStart: '0.175rem' }}
        />
      </button>
    </div>
  );
}

export default NotificationsPanel;
