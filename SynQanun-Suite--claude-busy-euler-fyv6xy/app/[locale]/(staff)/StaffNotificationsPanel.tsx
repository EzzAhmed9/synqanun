'use client';

import * as React from 'react';
import {
  Bell,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  RotateCcw,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { Badge } from '@/components/ui';
import { formatRelativeDays, isolateRun } from '@/lib/format';
import { useRouter } from '@/lib/i18n/navigation';
import type { Locale } from '@/lib/i18n/routing';
import type { StaffNotificationKind, StaffNotificationRecord } from '@/lib/mock-api';
import { cn } from '@/lib/utils';

/**
 * The staff bell's panel: decisions waiting on the reader, answers to what they
 * sent up, filing deadlines on their files, and colleagues' activity on those
 * files. The data is derived in `mockApi.staff.notifications`.
 *
 * Modelled on the client portal's NotificationsPanel.tsx, read its header for
 * what "mark as read" may assert and for the gendered-grammar rule: every
 * sentence here keeps the colleague's name the object of a preposition
 * ("from X", "by X"), so no Arabic verb has to agree with it.
 *
 * ===========================================================================
 * WHERE THIS DIFFERS FROM THE CLIENT PANEL, ON PURPOSE
 * ===========================================================================
 *  · FOCUS IS TRAPPED. The client panel is a light popover that leaves focus
 *    where it was. This one moves focus into itself on open, keeps Tab and
 *    Shift+Tab inside it, and hands focus back to the bell on Escape or the
 *    close button — so a keyboard user never tabs out into the page behind an
 *    open panel and loses it. Hence `aria-modal`. A click outside still closes
 *    it, without stealing focus back from whatever was clicked.
 *  · CONTRAST. Secondary text is gray-600, not gray-500: gray-500 measures
 *    4.25:1 on white and under 4 on gray-50, below the 4.5 small text needs.
 *  · THE UNREAD DOT IS `action`, which is syn-red in accent mode — so nothing
 *    changes there — and the tenant's action colour in a themed one.
 */

const KIND_ICON: Record<StaffNotificationKind, LucideIcon> = {
  approvalWaiting: ClipboardCheck,
  approvalOverdue: ClipboardCheck,
  submissionApproved: CheckCircle2,
  submissionReturned: RotateCcw,
  filingDue: CalendarClock,
  teamRequest: Users,
  teamApproved: Users,
  teamReturned: Users,
};

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

export interface StaffNotificationsPanelProps {
  open: boolean;
  onClose: () => void;
  items: StaffNotificationRecord[];
  readIds: ReadonlySet<string>;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
}

export function StaffNotificationsPanel({
  open,
  onClose,
  items,
  readIds,
  onMarkRead,
  onMarkAllRead,
}: StaffNotificationsPanelProps) {
  const t = useTranslations('staffNotifications');
  const locale = useLocale() as Locale;
  const router = useRouter();

  const panelRef = React.useRef<HTMLDivElement>(null);
  const returnTo = React.useRef<HTMLElement | null>(null);
  const headingId = React.useId();

  const [filter, setFilter] = React.useState<'all' | 'unread'>('all');

  const unreadCount = items.filter((item) => !readIds.has(item.id)).length;
  const visible = filter === 'unread' ? items.filter((item) => !readIds.has(item.id)) : items;

  /** Close, and give focus back to whatever opened the panel — the bell. */
  const dismiss = React.useCallback(() => {
    onClose();
    returnTo.current?.focus?.();
  }, [onClose]);

  // Move focus in on open; remember where it came from.
  React.useEffect(() => {
    if (!open) return;
    returnTo.current = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
  }, [open]);

  React.useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        dismiss();
        return;
      }
      if (event.key !== 'Tab' || !panelRef.current) return;

      const focusable = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const current = document.activeElement;
      const inside = panelRef.current.contains(current);

      if (event.shiftKey && (current === first || current === panelRef.current || !inside)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (current === last || !inside)) {
        event.preventDefault();
        first.focus();
      }
    }

    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (panelRef.current?.contains(target)) return;
      // The bell toggles on its own; letting this fire too would close and reopen.
      if ((target as HTMLElement).closest?.('[data-notifications-trigger]')) return;
      onClose();
    }

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('mousedown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('mousedown', onPointerDown);
    };
  }, [open, onClose, dismiss]);

  // Reopening starts on "All" rather than wherever it was left.
  React.useEffect(() => {
    if (!open) setFilter('all');
  }, [open]);

  if (!open) return null;

  function go(item: StaffNotificationRecord) {
    onMarkRead(item.id);
    onClose();
    router.push(item.href);
  }

  return (
    /*
      Anchored to the viewport's top-end corner, under the header's icon group
      in both directions — the same placement as the client panel, and for the
      same reason (`top-16` is the header's fixed height).
    */
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={headingId}
      tabIndex={-1}
      className={cn(
        'fixed top-16 z-40 flex max-h-[min(34rem,calc(100vh-5rem))] w-[min(27rem,calc(100vw-2rem))] flex-col',
        'rounded-card border border-gray-200 bg-white shadow-overlay outline-none'
      )}
      style={{ insetInlineEnd: '1rem' }}
    >
      {/* Header ---------------------------------------------------------- */}
      <div className="flex items-center justify-between gap-3 border-b border-gray-200 px-4 py-3">
        <div className="flex items-center gap-2">
          <h2 id={headingId} className="font-sans text-title text-gray-700">
            {t('title')}
          </h2>
          {unreadCount > 0 ? (
            <Badge tone="error" icon={null}>
              {t('unreadCount', { count: unreadCount })}
            </Badge>
          ) : null}
        </div>

        <button
          type="button"
          onClick={dismiss}
          aria-label={t('close')}
          className="-me-1 shrink-0 rounded-sm p-1.5 text-gray-600 hover:bg-gray-100 hover:text-gray-700"
        >
          <X aria-hidden size={16} />
        </button>
      </div>

      {/* Filter + mark all ------------------------------------------------ */}
      {items.length > 0 ? (
        <div className="flex items-center justify-between gap-3 border-b border-gray-200 bg-gray-50 px-4 py-2">
          <div className="flex items-center gap-1">
            <FilterPill active={filter === 'all'} onClick={() => setFilter('all')}>
              {t('filters.all', { count: items.length })}
            </FilterPill>
            <FilterPill active={filter === 'unread'} onClick={() => setFilter('unread')}>
              {t('filters.unread', { count: unreadCount })}
            </FilterPill>
          </div>

          {unreadCount > 0 ? (
            <button
              type="button"
              onClick={onMarkAllRead}
              className="shrink-0 rounded-sm px-1.5 py-0.5 text-caption font-medium text-legal-navy hover:bg-gray-100 hover:underline"
            >
              {t('markAllRead')}
            </button>
          ) : null}
        </div>
      ) : null}

      {/* List ------------------------------------------------------------- */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {visible.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
            <Bell aria-hidden size={20} strokeWidth={1.6} className="text-gray-500" />
            <p className="text-body text-gray-600">
              {filter === 'unread' ? t('emptyUnread') : t('empty')}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {visible.map((item) => (
              <li key={item.id}>
                <Row
                  item={item}
                  read={readIds.has(item.id)}
                  locale={locale}
                  onSelect={() => go(item)}
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="border-t border-gray-200 bg-gray-50 px-4 py-2.5 text-caption text-gray-600">
        {t('notPersisted')}
      </p>
    </div>
  );
}

/* ===========================================================================
 * Pieces
 * ======================================================================== */

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'rounded-pill border px-2.5 py-0.5 text-caption font-medium transition-colors',
        active
          ? 'border-gray-300 bg-white text-gray-700'
          : 'border-transparent text-gray-600 hover:bg-gray-100 hover:text-gray-700'
      )}
    >
      {children}
    </button>
  );
}

function Row({
  item,
  read,
  locale,
  onSelect,
}: {
  item: StaffNotificationRecord;
  read: boolean;
  locale: Locale;
  onSelect: () => void;
}) {
  const t = useTranslations('staffNotifications');
  const Icon = KIND_ICON[item.kind];

  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex w-full items-start gap-3 px-4 py-3 text-start transition-colors hover:bg-gray-50"
    >
      {/* Unread: a dot plus weight, never colour alone (brand-guidelines §3.4). */}
      <span
        aria-hidden
        className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-pill', read ? 'bg-transparent' : 'bg-action')}
      />

      <span
        className={cn(
          'mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-sm border',
          item.tone === 'error'
            ? 'border-error/25 bg-error/10 text-error'
            : item.tone === 'warning'
              ? 'border-warning/25 bg-warning/10 text-warning-text'
              : item.tone === 'success'
                ? 'border-success/25 bg-success/10 text-success'
                : 'border-gray-200 bg-gray-100 text-gray-600'
        )}
      >
        <Icon aria-hidden size={14} strokeWidth={1.9} />
      </span>

      <span className="min-w-0 flex-1">
        <span
          className={cn(
            'block text-body [overflow-wrap:anywhere]',
            read ? 'text-gray-600' : 'font-medium text-gray-700'
          )}
        >
          {t(`items.${item.kind}`, {
            // FSI/PDI isolation: a Latin title inside an Arabic sentence must
            // not drag the punctuation around it. See `isolateRun`.
            subject: isolateRun(item.subject[locale]),
            actor: item.actor ? isolateRun(item.actor[locale]) : '',
            days: item.daysOverdue ?? 0,
          })}
        </span>

        <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-caption text-gray-600">
          {item.reference ? (
            <>
              {/* Latin in both locales — lib/format.ts. */}
              <span dir="ltr" className="font-mono text-reference">
                {item.reference}
              </span>
              <span aria-hidden>·</span>
            </>
          ) : null}
          {/* "3 days ago" or, for a deadline, "in 3 days". Isolated, not
              direction-forced: "بعد 3 أيام" orders right-to-left. */}
          <span className="[unicode-bidi:isolate]">{formatRelativeDays(item.on, locale)}</span>
        </span>
      </span>
    </button>
  );
}

export default StaffNotificationsPanel;
