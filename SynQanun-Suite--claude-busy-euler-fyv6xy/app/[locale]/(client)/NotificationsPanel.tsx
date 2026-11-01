'use client';

import * as React from 'react';
import { Bell, FileText, MessageSquare, PenLine, Receipt, X, type LucideIcon } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { Badge } from '@/components/ui';
import { formatRelativeDays, isolateRun } from '@/lib/format';
import { useRouter } from '@/lib/i18n/navigation';
import type { Locale } from '@/lib/i18n/routing';
import type { NotificationKind, NotificationRecord } from '@/lib/mock-api';
import { cn } from '@/lib/utils';

/**
 * The notifications panel behind the bell in the top bar.
 *
 * ===========================================================================
 * WHAT "MARK AS READ" IS ALLOWED TO ASSERT
 * ===========================================================================
 * The sixth time the question has come up, and the first time the answer is
 * yes. WHAT DOES THE STATE ASSERT?
 *
 *   · An echoed message asserts the interface received your words → shown.
 *   · A payment receipt asserts money moved → refused.
 *   · A saved setting asserts the system will remember → refused.
 *   · A documents row asserts the firm has your file → refused.
 *   · A confirmed booking asserts a lawyer committed an hour → refused.
 *   · A READ NOTIFICATION ASSERTS THAT YOU HAVE SEEN IT.
 *
 * That last one is true at the moment it is made, and it is a claim about the
 * READER rather than about the world. Nothing downstream depends on it: no
 * deadline moves, no money changes hands, and the invoice a dismissed
 * notification pointed at is still overdue on the invoices screen, where it
 * says so in red. Losing the flag on reload costs the client nothing except
 * seeing the same list again, which is the safe direction to fail in.
 *
 * Compare the one it is most easily confused with. Marking an invoice
 * notification read does NOT assert the invoice is settled — and the panel is
 * careful never to imply it does, which is why a read row keeps its status tone
 * and its "past due" wording instead of going quiet.
 *
 * So read state works, and a line under the list says it will not be
 * remembered. It is session state in this component, not the fixtures: see the
 * MOCK note on `notifications.list` for why the prototype has nowhere to store
 * it and what the real record carries.
 *
 * ---------------------------------------------------------------------------
 * NOT CARRIED OVER FROM THE STITCH EXPORT
 * ---------------------------------------------------------------------------
 *  · "INV-2025-092 ($18,500.00) settlement is 13 days past due" — an invoice
 *    that exists nowhere else in the export, at an amount that appears nowhere
 *    else, in a year the ledger does not use, two panels above an invoices card
 *    listing entirely different numbers. The single clearest example of why
 *    notifications are derived here rather than written down.
 *
 *  · "Payment Confirmed: Receipt issued for Retainer Due Diligence
 *    ($12,000.00)" and "Executed License: ADGM Commercial License 2025 approved
 *    and archived". Neither event exists in the model, and the first asserts a
 *    receipt for a payment this product cannot take — the same claim the
 *    invoice screen already refuses to make.
 *
 *  · "Adv. R. Al-Khatib sent a PRIVILEGED DISPATCH", and the Arabic "أرسل
 *    بريداً مشفراً ومحمياً بالحصانة" — an "encrypted, privilege-protected"
 *    email. Ninth screen for this category. A message notification says a
 *    message arrived.
 *
 *  · "10m ago", "2h ago", "3h ago". Minute and hour precision over records that
 *    only ever knew a date — see `formatRelativeDays`.
 *
 *  · EVERY NOTIFICATION TAGGED PRJ-4410, including ones whose own text is about
 *    a DIFC matter. Each row here carries the reference of the record it was
 *    derived from, so it cannot be tagged with anything else.
 *
 *  · THE AMBER WASH ON UNREAD ROWS (`bg-amber-50/30`). design.md §2 gives amber
 *    to `warning` — a deadline approaching, something pending. "You have not
 *    read this yet" is not a warning, and painting it amber means a routine
 *    unread row and a genuinely overdue invoice wear the same colour. Unread is
 *    carried by weight and a dot instead, which is also why the Arabic export
 *    using a grey wash for the same state was the better of the two.
 *
 *  · The two languages disagreeing again: an "All / Unread" pill pair in
 *    English against underlined tabs in Arabic, "1 overdue" against "1 مستحقة
 *    السداد" ("1 due" — a different claim), and "2 unread" against "2 رسالتان
 *    جديدتان" ("2 two-new-messages").
 *
 *  · "View all notifications →" pointing at a screen that does not exist. There
 *    is no notifications page in BUILD_PLAN.md §3 and the whole feed fits in the
 *    panel, so there is nothing to link to.
 *
 * ---------------------------------------------------------------------------
 * A GENDERED-GRAMMAR TRAP, FOUND IN THIS SCREEN'S OWN COPY
 * ---------------------------------------------------------------------------
 * The message notification first read "أرسل {subject} رسالة" — "{subject} sent
 * a message" — which renders as "أرسل هدى المنصور", a masculine verb over a
 * female sender. Exactly the problem that removed "Adv." / "المستشار" from the
 * fixtures, reappearing one layer down: Arabic agrees VERBS with gender, not
 * just honorifics, so any sentence built around a person's name has it.
 *
 * The fix is the same one, and it is not to store everyone's gender: the
 * sentence is rebuilt so nothing agrees with the name. "رسالة جديدة من
 * {subject}" — "a new message from {subject}" — is a noun phrase, and the
 * English was moved to match so the two languages say the same thing.
 *
 * RULE FOR LATER SCREENS: a translated sentence with a person's name in it is
 * a gender-agreement bug waiting to happen in Arabic. Prefer a construction
 * where the name is the object of a preposition ("from X", "with X") over one
 * where it drives a verb.
 */

const KIND_ICON: Record<NotificationKind, LucideIcon> = {
  documentAwaitingSignature: PenLine,
  documentShared: FileText,
  invoiceOverdue: Receipt,
  messageReceived: MessageSquare,
};

export interface NotificationsPanelProps {
  open: boolean;
  onClose: () => void;
  items: NotificationRecord[];
  readIds: ReadonlySet<string>;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
}

export function NotificationsPanel({
  open,
  onClose,
  items,
  readIds,
  onMarkRead,
  onMarkAllRead,
}: NotificationsPanelProps) {
  const t = useTranslations('notifications');
  const locale = useLocale() as Locale;
  const router = useRouter();

  const panelRef = React.useRef<HTMLDivElement>(null);
  const headingId = React.useId();

  const [filter, setFilter] = React.useState<'all' | 'unread'>('all');

  const unreadCount = items.filter((item) => !readIds.has(item.id)).length;
  const visible = filter === 'unread' ? items.filter((item) => !readIds.has(item.id)) : items;

  // Escape, and a click anywhere outside. NOT <Overlay>: a popover hanging off
  // a header button is not a dialog — it does not take the screen, it does not
  // trap focus, and locking background scroll for it would be wrong. The two
  // overlays that ARE dialogs share Overlay.tsx; this deliberately does not.
  React.useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (panelRef.current?.contains(target)) return;
      // The bell itself toggles; letting this fire too would close and reopen.
      if ((target as HTMLElement).closest?.('[data-notifications-trigger]')) return;
      onClose();
    }

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('mousedown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('mousedown', onPointerDown);
    };
  }, [open, onClose]);

  // Reopening starts on "All" rather than wherever it was left.
  React.useEffect(() => {
    if (!open) setFilter('all');
  }, [open]);

  if (!open) return null;

  function go(item: NotificationRecord) {
    onMarkRead(item.id);
    onClose();
    router.push(item.href);
  }

  return (
    /*
      Anchored to the viewport's top-end corner rather than measured against the
      bell. `insetInlineEnd` puts it under the icon group in both directions
      with no second rule, and `top-16` is the header's own height — the one
      coupling here, and the reason <TopBar> is `h-16` as a constant rather than
      padding. A floating-element library would measure it properly; that is not
      worth a dependency for one popover.
    */
    <div
      ref={panelRef}
      role="dialog"
      aria-labelledby={headingId}
      className={cn(
        'fixed top-16 z-40 flex max-h-[min(32rem,calc(100vh-5rem))] w-[min(26rem,calc(100vw-2rem))] flex-col',
        'rounded-card border border-gray-200 bg-white shadow-overlay'
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
            // Derived from the rows below, in the same render. The export's
            // "3 new" badge sat over six hardcoded items.
            <Badge tone="error" icon={null}>
              {t('unreadCount', { count: unreadCount })}
            </Badge>
          ) : null}
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label={t('close')}
          className="-me-1 shrink-0 rounded-sm p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
        >
          <X aria-hidden size={16} />
        </button>
      </div>

      {/* Filter + mark all ------------------------------------------------ */}
      {items.length > 0 ? (
        <div className="flex items-center justify-between gap-3 border-b border-gray-200 bg-gray-50 px-4 py-2">
          {/*
            Client state, not the URL — unlike the status strips on Matters and
            Invoices. Those are views worth linking to; which half of a popover
            you are looking at is not, and this panel has no address of its own
            to carry it.
          */}
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
            {/* Two different nothings: an empty feed, and a feed you have read
                to the end. Saying "nothing new" over the second would be wrong
                — there is plenty, you have just seen it. */}
            <p className="text-body text-gray-500">
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

      {/* The honest footer. Said once, where the read state is, rather than as
          a banner claiming the opposite. */}
      <p className="border-t border-gray-200 bg-gray-50 px-4 py-2.5 text-caption text-gray-500">
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
          : 'border-transparent text-gray-500 hover:bg-gray-100 hover:text-gray-700'
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
  item: NotificationRecord;
  read: boolean;
  locale: Locale;
  onSelect: () => void;
}) {
  const t = useTranslations('notifications');
  const Icon = KIND_ICON[item.kind];

  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex w-full items-start gap-3 px-4 py-3 text-start transition-colors hover:bg-gray-50"
    >
      {/* Unread marker. A dot plus weight, never colour alone
          (brand-guidelines.md §3.4) — and the row keeps its own status tone
          regardless, because being read changes nothing about the invoice. */}
      <span
        aria-hidden
        className={cn(
          'mt-1.5 h-2 w-2 shrink-0 rounded-pill',
          read ? 'bg-transparent' : 'bg-action'
        )}
      />

      <span
        className={cn(
          'mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-sm border',
          item.tone === 'error'
            ? 'border-error/25 bg-error/10 text-error'
            : item.tone === 'warning'
              ? 'border-warning/25 bg-warning/10 text-warning-text'
              : 'border-gray-200 bg-gray-100 text-gray-600'
        )}
      >
        <Icon aria-hidden size={14} strokeWidth={1.9} />
      </span>

      <span className="min-w-0 flex-1">
        {/* The sentence is in the dictionary; the subject comes from the
            record. <bdi> because a filename or a name may be in either script
            while the row keeps the page direction. */}
        <span
          className={cn(
            'block text-body [overflow-wrap:anywhere]',
            read ? 'text-gray-600' : 'font-medium text-gray-700'
          )}
        >
          {t(`items.${item.kind}`, {
            // Isolated with FSI/PDI rather than <bdi>, because the subject is a
            // placeholder inside a translated sentence and there is no element
            // to wrap it in — see `isolateRun`. Without it, a Latin filename
            // dropped into an Arabic sentence drags the punctuation around it.
            subject: isolateRun(item.subject[locale]),
            days: item.daysOverdue ?? 0,
          })}
        </span>

        <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-caption text-gray-500">
          {/* Latin in both locales — one of the strings that genuinely wants
              dir="ltr". See lib/format.ts. */}
          <span dir="ltr" className="font-mono text-reference">
            {item.reference}
          </span>
          <span aria-hidden className="text-gray-300">
            ·
          </span>
          {/* Isolated, not direction-forced: "منذ 3 أيام" orders right-to-left. */}
          <span className="[unicode-bidi:isolate]">{formatRelativeDays(item.on, locale)}</span>
        </span>
      </span>
    </button>
  );
}

export default NotificationsPanel;
