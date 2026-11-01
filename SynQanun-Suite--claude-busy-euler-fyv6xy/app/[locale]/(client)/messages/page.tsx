import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import {
  daysBetween,
  formatCalendarDate,
  formatClockTime,
  tenantToday,
  type CalendarDate,
} from '@/lib/format';
import type { Locale } from '@/lib/i18n/routing';
import { mockApi, type MessageThreadRecord } from '@/lib/mock-api';
import { ClientTopBar } from '../ClientPortalChrome';
import {
  MessagesWorkspace,
  type ConversationData,
  type ConversationDay,
  type ThreadRowData,
} from './MessagesWorkspace';

/**
 * Messages — the client's correspondence with the firm.
 *
 * Reads fixtures/messages.ts, which already existed for the dashboard's preview
 * card. It has been EXTENDED rather than recreated: a thread now carries its
 * exchange, and the three fields the dashboard used to read off the thread
 * (`preview`, `sentDaysAgo`, `sentAt`) are derived from the last message. The
 * dashboard card reads the same names and did not change.
 *
 * WHICH THREAD IS OPEN IS A SERVER CONCERN
 * ---------------------------------------------------------------------------
 * `?thread=` is resolved here and the conversation is rendered from it, so the
 * pane is addressable and the back button works. An unrecognised id falls back
 * to the newest thread rather than erroring — a thread id arrives from a link
 * someone may have kept, and the right response is to show the inbox.
 *
 * READING A THREAD DOES NOT MARK IT READ, AND THAT IS DELIBERATE
 * ---------------------------------------------------------------------------
 * lib/mock-api.ts has no writes. Faking one in client state would clear the
 * sidebar badge on open and bring it back on reload, which is a worse lie than
 * a badge that does not move — it teaches a demo audience that the portal
 * remembers something it does not. The real per-account read cursor is Track
 * A.5; see the MOCK note on `messages.getThread`.
 */

/** Rendered per request — every timestamp resolves against the tenant's clock. */
export const dynamic = 'force-dynamic';

export default async function MessagesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ thread?: string }>;
}) {
  const [{ locale }, { thread }] = await Promise.all([params, searchParams]);
  setRequestLocale(locale);

  const { threads } = await mockApi.messages.list();

  // Newest first, so index 0 is the thread a client most likely wants.
  const selected = threads.find((candidate) => candidate.id === thread) ?? threads[0] ?? null;

  return (
    <Messages
      locale={locale as Locale}
      threads={threads}
      selected={selected}
      // Whether the URL NAMED a thread, not whether one resolved. Below 1280px
      // this decides which of the two panes is on screen, and landing on
      // /messages should show the list.
      threadInUrl={typeof thread === 'string' && thread.length > 0}
      today={tenantToday()}
    />
  );
}

function Messages({
  locale,
  threads,
  selected,
  threadInUrl,
  today,
}: {
  locale: Locale;
  threads: MessageThreadRecord[];
  selected: MessageThreadRecord | null;
  threadInUrl: boolean;
  today: CalendarDate;
}) {
  const t = useTranslations('messages');

  /**
   * A day label for a thread row or a conversation divider.
   *
   * "Today" and "Yesterday" rather than a date, because that is how a person
   * reads a recent message. Anything older gets its date. The comparison is
   * between two CALENDAR DATES in the tenant's jurisdiction — never a subtraction
   * of instants, which is where the off-by-one lives (lib/format.ts).
   */
  function dayLabel(date: CalendarDate): string {
    const age = daysBetween(date, today);
    if (age === 0) return t('today');
    if (age === 1) return t('yesterday');
    return formatCalendarDate(date, locale);
  }

  // Flattened here, where the locale is, so the client component never resolves
  // a language and never builds a formatter.
  const rows: ThreadRowData[] = threads.map((thread) => ({
    id: thread.id,
    senderName: thread.senderName[locale],
    senderRole: thread.senderRole[locale],
    subject: thread.subject[locale],
    preview: thread.preview[locale],
    engagementRef: thread.engagementRef,
    engagementKind: thread.engagementKind,
    engagementTitle: thread.engagementTitle[locale],
    engagementHref:
      thread.engagementKind === 'matter'
        ? `/matters/${thread.engagementRef}`
        : `/projects/${thread.engagementRef}`,
    sentOn: thread.sentOn,
    sentAt: thread.sentAt,
    // A time for today, a word for yesterday, a date before that — the same
    // rule the dashboard's message card already uses.
    timeLabel:
      thread.sentOn === today
        ? formatClockTime(thread.sentAt, locale)
        : dayLabel(thread.sentOn),
    unread: thread.unread,
  }));

  const conversation: ConversationData | null = selected
    ? {
        threadId: selected.id,
        senderName: selected.senderName[locale],
        senderRole: selected.senderRole[locale],
        subject: selected.subject[locale],
        engagementRef: selected.engagementRef,
        engagementKind: selected.engagementKind,
        engagementTitle: selected.engagementTitle[locale],
        engagementHref:
          selected.engagementKind === 'matter'
            ? `/matters/${selected.engagementRef}`
            : `/projects/${selected.engagementRef}`,
        days: groupByDay(selected, locale, dayLabel),
      }
    : null;

  return (
    <>
      <ClientTopBar title={t('title')} subtitle={t('subtitle')} />
      <MessagesWorkspace threads={rows} conversation={conversation} threadInUrl={threadInUrl} />
    </>
  );
}

/**
 * Group a thread's messages under one divider per day.
 *
 * Messages arrive oldest first from the API layer, so a single pass builds the
 * groups in reading order without sorting again.
 */
function groupByDay(
  thread: MessageThreadRecord,
  locale: Locale,
  dayLabel: (date: CalendarDate) => string
): ConversationDay[] {
  const days: ConversationDay[] = [];

  for (const message of thread.messages) {
    const current = days[days.length - 1];

    if (!current || current.key !== message.sentOn) {
      days.push({ key: message.sentOn, label: dayLabel(message.sentOn), messages: [] });
    }

    days[days.length - 1].messages.push({
      id: message.id,
      from: message.from,
      body: message.body[locale],
      timeLabel: formatClockTime(message.sentAt, locale),
      dateTime: `${message.sentOn}T${message.sentAt}`,
    });
  }

  return days;
}
