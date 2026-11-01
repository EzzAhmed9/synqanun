'use client';

import * as React from 'react';
import { ChevronLeft, MessageSquare, MessageSquarePlus, Search, Send, X } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { Badge, Button, EmptyState, Input, Textarea } from '@/components/ui';
import { formatClockTime, tenantNow, type CalendarDate, type ClockTime } from '@/lib/format';
import { Link } from '@/lib/i18n/navigation';
import type { Locale } from '@/lib/i18n/routing';
import { cn, initialsOf } from '@/lib/utils';
import { NewMessageModal } from './NewMessageModal';

/**
 * The messages workspace: thread list at the start side, open conversation at
 * the end side.
 *
 * WHICH THREAD IS OPEN LIVES IN THE URL
 * ---------------------------------------------------------------------------
 * `?thread=` — server-resolved, linkable, and reachable with the back button.
 * A conversation is the closest thing this screen has to a page, and unlike the
 * documents library's selection it has no other address to fall back on: there
 * is no separate route for a thread because the thread list is not a list view,
 * it is this screen's navigation.
 *
 * The SEARCH BOX and the unread toggle are client state, and that split is the
 * same one every list in this batch makes. They are find-aids over the pane
 * rather than views of the page, and the search term here is the strongest case
 * yet for keeping one out of the URL: it is typed against privileged
 * correspondence about live proceedings, so a query string would put it in
 * browser history, in any shared link, and in the Referer header of the next
 * outbound request.
 *
 * NOTHING HERE CLAIMS TO BE SECURE
 * ---------------------------------------------------------------------------
 * The export decorates this screen with "Legally Privileged & Confidential
 * Attorney-Client Communication (SHA-256 Encrypted)", "Encrypted Transport (TLS
 * 1.3)", "تشفير كامل من طرف إلى طرف", an "Audit Reference: #SEC-4410-COMM", a
 * "قناة آمنة" chip and a send button reading "Send Privileged Message". None of
 * it is built, and the privilege claim in particular is a legal assertion rather
 * than a label — the one thing on this screen a client might actually rely on.
 * See fixtures/messages.ts.
 *
 * ALSO NOT CARRIED OVER
 * ---------------------------------------------------------------------------
 *  · THE PRESENCE DOT and "Typically replies within 1 hour" / "متصل الآن • الرد
 *    المعتاد خلال ساعة". There is no presence signal and no response-time
 *    measurement; both are a service-level promise made by a fixture.
 *  · "Delivered" / "تم التسليم" with a green tick under the client's own
 *    message. A delivery receipt for a message that was never delivered. See
 *    the composer note below for what is shown instead.
 *  · "Sign via UAE PASS" on the attached document — the same unearned
 *    e-signature claim already removed from the documents library.
 *  · "Adv. R. Al-Khatib", "المستشار ر. الخطيب", "المستشارة فاطمة الزهراء" and
 *    "Dr. D. Al-Sabah" — gendered honorifics and an invented doctorate.
 *  · THE FOURTH THREAD, "Billing & Accounts Desk", whose subject line is
 *    "[INV-2025-092] Escrow Reconciliation": it makes an invoice into an
 *    engagement, and brings the escrow account back.
 *  · "4 Active" beside a tab reading "All (4)" — the duplicate count, again.
 *  · THE RICH-TEXT TOOLBAR (bold, italic, bullets) over a plain-text model, and
 *    "Call Counsel" / "اتصال مباشر" with no telephony behind it.
 *  · THE ARABIC SIDEBAR putting the CLIENT's name where the tenant firm's
 *    belongs — the third export to do this.
 */

export interface ThreadRowData {
  id: string;
  senderName: string;
  senderRole: string;
  subject: string;
  preview: string;
  engagementRef: string;
  engagementKind: 'matter' | 'project';
  engagementTitle: string;
  engagementHref: string;
  sentOn: CalendarDate;
  sentAt: ClockTime;
  /** Pre-formatted: a time today, "Yesterday", or a date. */
  timeLabel: string;
  unread: boolean;
}

export interface ConversationMessage {
  id: string;
  from: 'firm' | 'client';
  body: string;
  /** Pre-formatted wall-clock time. */
  timeLabel: string;
  /** Machine-readable, for <time dateTime>. */
  dateTime: string;
}

/** Messages under one day's divider. */
export interface ConversationDay {
  key: string;
  /** "Today", "Yesterday", or a formatted date. */
  label: string;
  messages: ConversationMessage[];
}

export interface ConversationData {
  threadId: string;
  senderName: string;
  senderRole: string;
  subject: string;
  engagementRef: string;
  engagementKind: 'matter' | 'project';
  engagementTitle: string;
  engagementHref: string;
  days: ConversationDay[];
}

export interface MessagesWorkspaceProps {
  threads: ThreadRowData[];
  conversation: ConversationData | null;
  /** True when `?thread=` was supplied — drives which pane shows below 1280px. */
  threadInUrl: boolean;
}

/** A message the client typed in this session. See `send()`. */
interface LocalMessage {
  id: string;
  body: string;
  timeLabel: string;
}

export function MessagesWorkspace({
  threads,
  conversation,
  threadInUrl,
}: MessagesWorkspaceProps) {
  const t = useTranslations('messages');
  const locale = useLocale() as Locale;

  const [query, setQuery] = React.useState('');
  const [unreadOnly, setUnreadOnly] = React.useState(false);
  const [draft, setDraft] = React.useState('');
  const [composeOpen, setComposeOpen] = React.useState(false);
  const [local, setLocal] = React.useState<LocalMessage[]>([]);

  const streamRef = React.useRef<HTMLDivElement>(null);
  const threadId = conversation?.threadId ?? null;

  // Anything typed belongs to the thread it was typed in. Switching threads
  // clears both, rather than carrying a half-written message across.
  React.useEffect(() => {
    setLocal([]);
    setDraft('');
  }, [threadId]);

  // A conversation opens at its newest message, like every other chat surface.
  React.useEffect(() => {
    const stream = streamRef.current;
    if (stream) stream.scrollTop = stream.scrollHeight;
  }, [threadId, local.length]);

  const visibleThreads = React.useMemo(() => {
    const needle = query.trim().toLocaleLowerCase(locale);

    return threads.filter((thread) => {
      if (unreadOnly && !thread.unread) return false;
      if (!needle) return true;
      return [
        thread.senderName,
        thread.subject,
        thread.preview,
        thread.engagementTitle,
        thread.engagementRef,
      ].some((field) => field.toLocaleLowerCase(locale).includes(needle));
    });
  }, [threads, query, unreadOnly, locale]);

  const unreadCount = threads.filter((thread) => thread.unread).length;

  /**
   * THE SEND DECISION.
   *
   * The message is appended to THIS conversation, in this browser, and marked
   * "not sent". It is not a no-op the way the invoice payment button is, and the
   * difference between the two cases is what is being asserted.
   *
   * Pressing pay and seeing a receipt would claim something about the world:
   * that money moved. Nothing in the browser can make that true. Pressing send
   * and seeing your own words appear claims something about the INTERFACE — and
   * an optimistic echo is what a real messaging client does anyway, while the
   * request is in flight. The lie would be the delivery receipt, so there isn't
   * one: the bubble carries a plain "Not sent" label and the composer says why,
   * once, under the field.
   *
   * It also does not survive a reload, and the screen says so rather than
   * letting a demo audience conclude the portal remembered it.
   *
   * MOCK: replace with POST /api/messages/:id — optimistic append stays, the
   * status goes from "sending" to "sent" on the response and to a retry
   * affordance on failure, and the thread's `updatedAt` moves. Track A.5.
   */
  function send() {
    const body = draft.trim();
    if (!body || !conversation) return;

    setLocal((current) => [
      ...current,
      {
        id: `local-${current.length + 1}`,
        body,
        // Both the clock and the formatting come from lib/format.ts — the
        // tenant's zone, not the browser's, so a message typed now sits on the
        // same clock as the firm's messages above it.
        timeLabel: formatClockTime(tenantNow(), locale),
      },
    ]);
    setDraft('');
  }

  return (
    /*
      <main>, not <div>. This screen was the only one in the product without a
      main landmark — the other eleven portal screens and both staff screens
      built on the same two-pane layout all have one, so somebody navigating by
      landmark could skip to the content everywhere except here.

      It reads as an oversight rather than a decision: the two panes below are
      already <section>s with their own labels, so the structure was there and
      only the outer element was wrong. Found in the Track A close-out sweep.
    */
    <main className="mx-auto flex w-full max-w-content flex-1 flex-col px-6 py-6">
      <div className="flex min-h-0 flex-1 overflow-hidden rounded-card border border-gray-200 bg-white">
        {/* Thread list ---------------------------------------------------- */}
        <section
          aria-label={t('threadsLabel')}
          className={cn(
            'flex w-full min-w-0 flex-col border-gray-200',
            // Logical border: it sits between the panes in both directions.
            'desktop:w-[340px] desktop:shrink-0 desktop:border-e',
            // Below 1280px only one pane shows at a time, and which one is
            // decided by the URL — so the back button is the way back to the
            // list, exactly as it would be on a phone.
            threadInUrl && 'max-desktop:hidden'
          )}
        >
          <div className="flex flex-col gap-3 border-b border-gray-200 p-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-sans text-title text-gray-700">{t('threadsHeading')}</h2>
              {/* Secondary, because the primary on this view is Send. */}
              <Button
                variant="secondary"
                size="sm"
                icon={<MessageSquarePlus aria-hidden size={15} />}
                onClick={() => setComposeOpen(true)}
              >
                {t('newMessage')}
              </Button>
            </div>

            <div className="relative">
              <Input
                id="messages-search"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                aria-label={t('searchLabel')}
                placeholder={t('searchPlaceholder')}
                // Room on BOTH sides for the two adornments, logical properties
                // throughout. Not a `latinValue` field — a search term here is
                // very often Arabic.
                className="ps-9 pe-9"
              />
              <Search
                aria-hidden
                size={16}
                strokeWidth={1.8}
                className="pointer-events-none absolute top-1/2 -translate-y-1/2 text-gray-500"
                style={{ insetInlineStart: '0.75rem' }}
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  aria-label={t('clearSearch')}
                  className="absolute top-1/2 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-sm text-gray-500 hover:bg-gray-200 hover:text-gray-700"
                  style={{ insetInlineEnd: '0.5rem' }}
                >
                  <X aria-hidden size={14} strokeWidth={2} />
                </button>
              ) : null}
            </div>

            {/* Two states, not the export's three: its "By Matter" tab is a
                grouping rather than a filter, and grouping five threads by
                engagement produces five groups of one. */}
            <div className="flex flex-wrap items-center gap-2">
              <FilterPill active={!unreadOnly} onClick={() => setUnreadOnly(false)}>
                {t('filters.all', { count: threads.length })}
              </FilterPill>
              <FilterPill active={unreadOnly} onClick={() => setUnreadOnly(true)}>
                {t('filters.unread', { count: unreadCount })}
              </FilterPill>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {threads.length === 0 ? (
              /* The one client-side empty state that gets a call to action: a
                 client can start a conversation themselves, so leaving them at
                 a dead end would be the wrong end of the choice. Every other
                 empty state in the portal is the firm's to fill — see
                 components/ui/EmptyState.tsx. */
              <EmptyState
                icon={MessageSquare}
                title={t('emptyNone')}
                body={t('emptyNoneBody')}
                // No border or card fill: this sits inside the thread pane,
                // which already has both.
                className="border-0 bg-transparent px-6 py-12"
                action={
                  <Button
                    variant="primary"
                    icon={<MessageSquarePlus aria-hidden size={15} />}
                    onClick={() => setComposeOpen(true)}
                  >
                    {t('newMessage')}
                  </Button>
                }
              />
            ) : visibleThreads.length === 0 ? (
              <p className="px-6 py-10 text-center text-body text-gray-500">
                {query.trim() ? t('emptySearch', { query: query.trim() }) : t('emptyUnread')}
              </p>
            ) : (
              <ul className="divide-y divide-gray-200">
                {visibleThreads.map((thread) => (
                  <li key={thread.id}>
                    <Link
                      href={{ pathname: '/messages', query: { thread: thread.id } }}
                      aria-current={thread.id === threadId ? 'true' : undefined}
                      className={cn(
                        'flex w-full items-start gap-3 p-4 text-start transition-colors',
                        // Start-edge marker, so the selected row is not carried
                        // by fill alone. `border-s` flips with `dir`.
                        'border-s-2',
                        thread.id === threadId
                          ? 'border-action bg-gray-100'
                          : 'border-transparent hover:bg-gray-50'
                      )}
                    >
                      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-pill border border-gray-200 bg-gray-100 text-caption font-medium text-gray-600">
                        {initialsOf(thread.senderName)}
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline justify-between gap-2">
                          <span
                            className={cn(
                              'truncate',
                              thread.unread
                                ? 'text-body-emphasis text-gray-900'
                                : 'text-body text-gray-700'
                            )}
                          >
                            {thread.senderName}
                          </span>
                          {/* Isolated, NOT direction-forced. In Arabic this is
                              "11:30 ص" or "16 سبتمبر" — Arabic words beside
                              numerals, whose correct visual order is the
                              right-to-left one. The export sets
                              `direction: ltr` on exactly these, which is the
                              bug the dashboard shipped once. */}
                          <time
                            dateTime={`${thread.sentOn}T${thread.sentAt}`}
                            className="shrink-0 text-caption text-gray-500 [unicode-bidi:isolate]"
                          >
                            {thread.timeLabel}
                          </time>
                        </span>

                        <span className="mt-0.5 block truncate text-caption text-gray-500">
                          {thread.senderRole}
                        </span>

                        <span className="mt-1 block truncate text-body text-gray-700">
                          {thread.subject}
                        </span>
                        <span className="mt-0.5 block truncate text-caption text-gray-500">
                          {thread.preview}
                        </span>

                        <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          <span className="text-caption text-gray-500">
                            {t(`kind.${thread.engagementKind}`)}
                          </span>
                          {/* Latin in every locale — forced LTR and isolated. */}
                          <span
                            dir="ltr"
                            className="font-mono text-reference text-gray-500 [unicode-bidi:isolate]"
                          >
                            {thread.engagementRef}
                          </span>
                          {thread.unread ? (
                            <Badge tone="warning" icon={null} className="ms-auto">
                              {t('unreadBadge')}
                            </Badge>
                          ) : null}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* Conversation ---------------------------------------------------- */}
        <section
          aria-label={t('conversationLabel')}
          className={cn(
            'flex min-w-0 flex-1 flex-col bg-gray-50',
            !threadInUrl && 'max-desktop:hidden'
          )}
        >
          {conversation === null ? (
            <div className="flex flex-1 items-center justify-center p-10">
              <p className="text-body text-gray-500">{t('noThreadSelected')}</p>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-200 bg-white p-4">
                <div className="flex min-w-0 items-start gap-3">
                  {/* Only below 1280px, where this pane replaced the list. */}
                  <Link
                    href="/messages"
                    className="mt-1 inline-flex items-center gap-1 text-caption font-medium text-gray-500 hover:text-gray-700 desktop:hidden"
                  >
                    <ChevronLeft aria-hidden size={14} strokeWidth={2} className="rtl:rotate-180" />
                    {t('backToThreads')}
                  </Link>

                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-pill border border-gray-200 bg-gray-100 text-caption font-medium text-gray-600 max-desktop:hidden">
                    {initialsOf(conversation.senderName)}
                  </span>

                  <div className="min-w-0">
                    <p className="truncate text-body-emphasis text-gray-700">
                      {conversation.senderName}
                    </p>
                    <p className="truncate text-caption text-gray-500">
                      {conversation.senderRole}
                    </p>
                  </div>
                </div>

                <Link
                  href={conversation.engagementHref}
                  className="inline-flex max-w-full items-center gap-1.5 text-caption text-gray-500 hover:text-action hover:underline"
                >
                  <span className="truncate">{conversation.engagementTitle}</span>
                  <span
                    dir="ltr"
                    className="shrink-0 font-mono text-reference [unicode-bidi:isolate]"
                  >
                    {conversation.engagementRef}
                  </span>
                </Link>
              </div>

              {/* Stream */}
              <div ref={streamRef} className="min-h-0 flex-1 overflow-y-auto p-4">
                <p className="sr-only">{conversation.subject}</p>

                <ul className="flex flex-col gap-4">
                  {conversation.days.map((day) => (
                    <li key={day.key}>
                      <p className="mb-4 flex items-center justify-center">
                        <span className="rounded-pill border border-gray-200 bg-white px-3 py-0.5 text-caption text-gray-500 [unicode-bidi:isolate]">
                          {day.label}
                        </span>
                      </p>

                      <ul className="flex flex-col gap-4">
                        {day.messages.map((message) => (
                          <li key={message.id}>
                            <Bubble
                              from={message.from}
                              senderName={conversation.senderName}
                              body={message.body}
                              timeLabel={message.timeLabel}
                              dateTime={message.dateTime}
                            />
                          </li>
                        ))}
                      </ul>
                    </li>
                  ))}

                  {local.length > 0 ? (
                    <li>
                      <ul className="flex flex-col gap-4">
                        {local.map((message) => (
                          <li key={message.id}>
                            <Bubble
                              from="client"
                              senderName={conversation.senderName}
                              body={message.body}
                              timeLabel={message.timeLabel}
                              // No `dateTime`: this message has no recorded
                              // instant, because it was never recorded.
                              status={t('notSent')}
                            />
                          </li>
                        ))}
                      </ul>
                    </li>
                  ) : null}
                </ul>
              </div>

              {/* Composer */}
              <form
                // preventDefault, no action and no method. A message body is the
                // most sensitive text in the portal; without this, submitting
                // would be a GET that puts privileged correspondence in the URL,
                // in browser history and in the next Referer header. Same
                // omission the Client Gateway shipped with a password.
                onSubmit={(event) => {
                  event.preventDefault();
                  send();
                }}
                className="border-t border-gray-200 bg-white p-4"
              >
                <label htmlFor="message-body" className="sr-only">
                  {t('composerLabel', { name: conversation.senderName })}
                </label>
                {/* Was an inline <textarea>; moved to components/ui/Textarea.tsx
                    when the booking modal became its second instance. */}
                <Textarea
                  id="message-body"
                  name="body"
                  rows={3}
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault();
                      send();
                    }
                  }}
                  placeholder={t('composerPlaceholder', { name: conversation.senderName })}
                />

                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-caption text-gray-500">{t('composerHint')}</p>

                  {/* The one syn-red primary on this view. design.md §2: red is
                      the human's own action. Not "Send Privileged Message" —
                      see the note at the top of this file. */}
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={draft.trim().length === 0}
                    icon={<Send aria-hidden size={15} className="rtl:rotate-180" />}
                  >
                    {t('send')}
                  </Button>
                </div>

                {/* Said once, under the field, rather than as a banner claiming
                    the opposite. */}
                <p className="mt-2 text-caption text-gray-500">{t('noBackend')}</p>
              </form>
            </>
          )}
        </section>
      </div>

      {/* Opened from either "New message" — the thread list's header and the
          empty state's call to action. One modal, one piece of state, so the
          two cannot disagree about whether it is open. */}
      <NewMessageModal open={composeOpen} onClose={() => setComposeOpen(false)} />
    </main>
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
        'inline-flex h-8 items-center rounded-pill border px-3 text-caption font-medium transition-colors',
        'max-tablet:min-h-11',
        active
          ? // gray-900 fill, matching the filter strips on every other list.
            // design.md §4 keeps red for the one main action.
            'border-transparent bg-gray-900 text-white'
          : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-100 hover:text-gray-700'
      )}
    >
      {children}
    </button>
  );
}

function Bubble({
  from,
  senderName,
  body,
  timeLabel,
  dateTime,
  status,
}: {
  from: 'firm' | 'client';
  senderName: string;
  body: string;
  timeLabel: string;
  dateTime?: string;
  /** Shown instead of a delivery receipt. See the send note above. */
  status?: string;
}) {
  const isClient = from === 'client';

  return (
    /*
      Logical properties only. `ms-auto` pushes the client's own messages to the
      INLINE END, which is the right in English and the left in Arabic, with no
      second rule and no `dir` check — the export hardcodes `ml-auto` in its
      English file and `mr-auto` in its Arabic one, which is two opposite
      physical values maintained by hand.
    */
    <div
      className={cn(
        // `w-fit` so the auto margin below does the aligning directly. A
        // full-width row reaches the same place only by way of `items-end` on
        // the column inside it, which is two mechanisms doing one job.
        'flex w-fit max-w-[42rem] items-start gap-3',
        isClient && 'ms-auto'
      )}
    >
      {isClient ? null : (
        /*
          Dropped below 768px. Measured at 375px, the avatar and its gap take 44
          of the 229px a bubble has to work with — a fifth of the line — and the
          conversation still says who is speaking twice over, by which side the
          bubble sits on and by its fill. On a phone the width is worth more than
          the third signal.

          Initials, never the feather: brand-guidelines.md §5 reserves it for the
          AI, and the client portal has no AI surfaces at all. The client's own
          messages carry no avatar at any size — it is their session.
        */
        <span className="mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-pill border border-gray-200 bg-white text-caption font-medium text-gray-600 max-tablet:hidden">
          {initialsOf(senderName)}
        </span>
      )}

      <div className={cn('min-w-0', isClient && 'flex flex-col items-end')}>
        <div
          className={cn(
            'rounded-card border px-4 py-3 text-body',
            isClient
              ? 'border-gray-200 bg-gray-100 text-gray-700'
              : 'border-gray-200 bg-white text-gray-700'
          )}
        >
          {/* `whitespace-pre-wrap` so a typed newline survives; `break-words`
              so an unbroken string cannot widen the bubble past the pane. */}
          <p className="whitespace-pre-wrap break-words">{body}</p>
        </div>

        <p className="mt-1 flex flex-wrap items-center gap-1.5 px-1 text-caption text-gray-500">
          {/* Isolated, not direction-forced — "11:30 ص" in Arabic. */}
          {dateTime ? (
            <time dateTime={dateTime} className="[unicode-bidi:isolate]">
              {timeLabel}
            </time>
          ) : (
            <span className="[unicode-bidi:isolate]">{timeLabel}</span>
          )}
          {status ? (
            <>
              <span aria-hidden>·</span>
              <span>{status}</span>
            </>
          ) : null}
        </p>
      </div>
    </div>
  );
}

export default MessagesWorkspace;
