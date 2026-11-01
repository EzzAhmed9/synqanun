import { ArrowLeft, Inbox, PlugZap } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Badge, Card, EmptyState, tabTriggerClasses } from '@/components/ui';
import { TwoPane } from '../TwoPane';
import { InboxList, type InboxRowData } from './InboxList';
import { formatCalendarDate, formatClockTime, formatRelativeDays } from '@/lib/format';
import { Link } from '@/lib/i18n/navigation';
import type { Locale } from '@/lib/i18n/routing';
import type { InboxItemRecord, MessageThreadRecord } from '@/lib/mock-api';
import type { InboxSource } from '@/fixtures/practice';
import { cn } from '@/lib/utils';
import { StaffTopBar } from '../../StaffChrome';

/**
 * The Unified Inbox's two panes.
 *
 * ===========================================================================
 * THIS IS A SERVER COMPONENT, AND THAT IS THE DESIGN
 * ===========================================================================
 * The client portal's equivalent, MessagesWorkspace.tsx, carries `'use client'`
 * because it has a composer with draft state. This screen has no composer — see
 * below — so every piece of state it has is a URL: which source is filtered,
 * which item is open. Both are views, both should survive a reload and a
 * back button, and neither needs a byte of client JavaScript.
 *
 * ===========================================================================
 * THERE IS NO REPLY BOX, ON ANY SOURCE
 * ===========================================================================
 * The client portal's composer exists and is labelled "Not sent" — an echo that
 * says plainly it went nowhere. That was defensible there because the client's
 * own words coming back is a small, visibly-inert thing.
 *
 * A firm replying to a client is not that. It is correspondence going out under
 * the firm's name, on a matter, and the two dishonest options are both worse
 * here than on the portal: fake the send, or add a ninth inert button to the
 * one screen whose entire purpose is answering people. Composing from the firm
 * side is Batch 6 (BUILD_PLAN.md §3, "New Matter form ... invite-client-contact
 * flow" batch), where writes exist.
 *
 * ===========================================================================
 * THE THREE SOURCES ARE NOT ONE STREAM
 * ===========================================================================
 * Every row states where it came from, and the two that are not connected say
 * so on the row and again in the reading pane. A merged stream would claim a
 * mailbox integration and a court-filing integration this product does not
 * have — and this is the screen where that claim would be most costly, because
 * a unified inbox that silently drops half the firm's post is worse than one
 * that never claimed to hold it.
 */

const FILTERS: (InboxSource | 'all')[] = ['all', 'portal', 'email', 'court'];

export function InboxWorkspace({
  locale,
  items,
  counts,
  unreadCount,
  awaitingReplyCount,
  source,
  selected,
  thread,
  itemInUrl,
  showRecipient,
}: {
  locale: Locale;
  items: InboxItemRecord[];
  counts: Record<InboxSource | 'all', number>;
  unreadCount: number;
  awaitingReplyCount: number;
  source: InboxSource | 'all';
  selected: InboxItemRecord | null;
  thread: MessageThreadRecord | null;
  itemInUrl: boolean;
  /** A legal secretary's view labels whose correspondence each row is. */
  showRecipient: boolean;
}) {
  const t = useTranslations('inbox');

  /*
    Flattened here, where the locale is, so the client island never resolves a
    language and never builds a formatter — the arrangement
    MessagesWorkspace.tsx already uses. The href is built here too: composing
    one needs no client logic, and doing it on the row would put the filter
    rule in two places.
  */
  const rows: InboxRowData[] = items.map((item) => ({
    id: item.id,
    source: item.source,
    from: item.from[locale],
    subject: item.subject[locale],
    preview: item.preview ? item.preview[locale] : null,
    engagementRef: item.engagementRef,
    timeLabel: formatRelativeDays(item.receivedOn, locale),
    unread: item.unread,
    awaitingReply: item.awaitingReply,
    personal: item.personal,
    forStaff: showRecipient && item.forStaff ? item.forStaff[locale] : null,
    href: {
      pathname: '/staff/inbox',
      query:
        source === 'all'
          ? { item: item.id }
          : ({ source, item: item.id } as Record<string, string>),
    },
  }));

  return (
    <>
      <StaffTopBar
        title={t('title')}
        // Counted from the rows in scope, not stated over them. The Partner
        // Dashboard's card previews the same function, so the two agree.
        subtitle={t('subtitle', { count: awaitingReplyCount })}
      />

      <main className="mx-auto flex w-full max-w-content flex-1 flex-col px-6 py-6">
        {/*
          Real links, not in-page tabs: each filter is its own address, so the
          back button, "open in new tab" and bookmarking all work. Same
          arrangement — and the same class string — as the engagement detail's
          tabs. See components/ui/tab-styles.ts.

          Absent on an empty inbox, where all four would read zero and every one
          of them leads back here. Same call as the approvals queue beside it.
        */}
        {counts.all === 0 ? null : (
        <nav
          aria-label={t('filters.label')}
          className="flex gap-1 overflow-x-auto border-b border-gray-200"
        >
          {FILTERS.map((value) => {
            const isActive = value === source;
            const count = counts[value];

            return (
              <Link
                key={value}
                href={{
                  pathname: '/staff/inbox',
                  query: value === 'all' ? {} : { source: value },
                }}
                aria-current={isActive ? 'page' : undefined}
                className={cn(tabTriggerClasses(isActive), 'whitespace-nowrap')}
              >
                {t(`filters.${value}`)}
                {/* Latin digits in both locales — design.md §12. */}
                <span className="font-mono text-reference text-gray-500 [unicode-bidi:isolate]">
                  {count}
                </span>
              </Link>
            );
          })}
        </nav>
        )}

        {/* The layout is shared with the approvals queue — see TwoPane.tsx,
            which also carries the reasoning for the sub-1280px swap. */}
        <TwoPane
          listLabel={t('listLabel')}
          readingLabel={t('readingLabel')}
          selectionInUrl={itemInUrl}
          list={
            /*
              Same split as the approvals queue beside it. `counts.all` is the
              whole inbox before the source tabs, so zero there is "nothing has
              come in" rather than "nothing from the source you picked" — and
              the second sentence pointed at a selection the reader had not
              made.
            */
            items.length === 0 ? (
              <EmptyState
                icon={Inbox}
                title={counts.all === 0 ? t('empty.noneTitle') : t('empty.title')}
                body={counts.all === 0 ? t('empty.noneBody') : t('empty.body')}
                className="m-4 border-dashed"
              />
            ) : (
              /*
                The only client component on the screen, and it exists for one
                reason: a half-typed search string is not a view and does not
                belong in the URL. Everything it renders arrives already
                resolved for the locale — see InboxList.tsx.
              */
              <InboxList rows={rows} activeId={selected?.id ?? null} />
            )
          }
          reading={
            selected ? (
              <ReadingPane
                item={selected}
                thread={thread}
                locale={locale}
                source={source}
                showRecipient={showRecipient}
              />
            ) : (
              <EmptyState
                icon={Inbox}
                title={t('noSelection.title')}
                body={t('noSelection.body')}
                className="m-4 border-dashed"
              />
            )
          }
        />
      </main>
    </>
  );
}

/* ===========================================================================
 * The reading pane
 * ======================================================================== */

function ReadingPane({
  item,
  thread,
  locale,
  source,
  showRecipient,
}: {
  item: InboxItemRecord;
  thread: MessageThreadRecord | null;
  locale: Locale;
  source: InboxSource | 'all';
  showRecipient: boolean;
}) {
  const t = useTranslations('inbox');

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="border-b border-gray-200 p-5">
        {/* Below 1280px the panes take turns, so the reading pane needs a way
            back to the list. A direction, so it mirrors — design.md §12. */}
        <Link
          href={{
            pathname: '/staff/inbox',
            query: source === 'all' ? {} : { source },
          }}
          className="mb-3 inline-flex w-fit items-center gap-1.5 text-caption text-legal-navy hover:underline desktop:hidden"
        >
          <ArrowLeft aria-hidden size={14} className="rtl:rotate-180" />
          {t('backToList')}
        </Link>

        <h2 className="font-sans text-heading text-gray-700">
          <bdi>{item.subject[locale]}</bdi>
        </h2>

        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-caption text-gray-500">
          <span>{t('fromName', { name: item.from[locale] })}</span>
          {item.engagementRef ? (
            <>
              <span aria-hidden className="text-gray-300">·</span>
              {/* Latin in every locale — see lib/format.ts. */}
              <span dir="ltr" className="font-mono text-reference">
                {item.engagementRef}
              </span>
            </>
          ) : null}
          <span aria-hidden className="text-gray-300">·</span>
          <span className="[unicode-bidi:isolate]">
            {formatCalendarDate(item.receivedOn, locale)}
          </span>
        </p>

        <span className="mt-2 flex flex-wrap items-center gap-1.5">
          <Badge tone={item.source === 'portal' ? 'info' : 'neutral'} icon={null}>
            {t(`sources.${item.source}`)}
          </Badge>
          {item.awaitingReply ? <Badge tone="warning">{t('awaitingReply')}</Badge> : null}
          {showRecipient && item.forStaff ? (
            <Badge tone="neutral" icon={null}>
              {t('forStaff', { name: item.forStaff[locale] })}
            </Badge>
          ) : null}
        </span>
      </header>

      {thread ? (
        <Conversation thread={thread} locale={locale} />
      ) : (
        <NotConnected source={item.source} />
      )}
    </div>
  );
}

/**
 * A real conversation, read from fixtures/messages.ts — the same exchange the
 * client sees on their own Messages screen, from the other side.
 *
 * The firm's own messages sit at the start side and the client's at the end,
 * which is the mirror of the portal's arrangement: on both screens, "us" is the
 * side you are reading from. design.md §4's chat rules put the reader's own
 * messages at the end side, and §12 flips both in Arabic from `dir` alone.
 */
function Conversation({
  thread,
  locale,
}: {
  thread: MessageThreadRecord;
  locale: Locale;
}) {
  const t = useTranslations('inbox');

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-5">
      {thread.messages.map((message) => {
        const isFirm = message.from === 'firm';

        return (
          <div
            key={message.id}
            className={cn('flex flex-col gap-1', isFirm ? 'items-end' : 'items-start')}
          >
            <div
              className={cn(
                'max-w-[85%] rounded-card px-4 py-3 text-body',
                isFirm
                  ? 'bg-legal-navy/6 text-gray-700'
                  : 'border border-gray-200 bg-gray-50 text-gray-700'
              )}
            >
              <bdi>{message.body[locale]}</bdi>
            </div>
            <p className="flex items-center gap-1.5 text-caption text-gray-500">
              <span>{isFirm ? t('fromFirm') : t('fromClient')}</span>
              <span aria-hidden className="text-gray-300">·</span>
              <span className="[unicode-bidi:isolate]">
                {formatClockTime(message.sentAt, locale)}
              </span>
            </p>
          </div>
        );
      })}

      {/*
        Where a composer would be. It says what is missing and which batch owns
        it, rather than presenting a box that cannot send. See the file header.
      */}
      <p className="mt-2 rounded-card border border-dashed border-gray-200 bg-gray-50 p-4 text-caption text-gray-500">
        {t('noReply')}
      </p>
    </div>
  );
}

/**
 * What an `email` or `court` row opens to.
 *
 * The row is a record that something arrived; there is no body because the
 * mailbox and the filing system are not connected. Saying that in words, on the
 * screen, is the alternative to rendering a plausible-looking message nobody
 * sent — which is what a merged inbox would have to do.
 */
function NotConnected({ source }: { source: InboxSource }) {
  const t = useTranslations('inbox');

  return (
    <div className="flex min-h-0 flex-1 flex-col p-5">
      <Card padding="lg" className="border-dashed bg-gray-50">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm bg-gray-100 text-gray-500">
            <PlugZap aria-hidden size={18} strokeWidth={1.8} />
          </span>
          <div className="min-w-0">
            <p className="text-body-emphasis text-gray-700">
              {t(`notConnected.${source}.title`)}
            </p>
            <p className="mt-1 max-w-[46rem] text-caption text-gray-600">
              {t(`notConnected.${source}.body`)}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default InboxWorkspace;
