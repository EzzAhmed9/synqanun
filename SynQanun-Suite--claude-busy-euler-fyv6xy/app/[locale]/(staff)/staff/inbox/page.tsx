import { setRequestLocale } from 'next-intl/server';
import type { Locale } from '@/lib/i18n/routing';
import { mockApi } from '@/lib/mock-api';
import type { InboxSource } from '@/fixtures/practice';
import { InboxWorkspace } from './InboxWorkspace';

/**
 * Unified Inbox — BUILD_PLAN.md §3, Batch 4, the item after the five rank
 * dashboards.
 *
 * ===========================================================================
 * EVERY RANK HAS ONE, AND EACH ONE HOLDS SOMETHING DIFFERENT
 * ===========================================================================
 * The entry in components/chrome/nav-items.ts carries no `ranks` allow-list, so
 * unlike Billing and Approvals this screen is not gated: correspondence is not
 * privileged by seniority the way a fee quote or a filing sign-off is.
 *
 * WHAT it holds is scoped, by exactly the rule the dashboard cards already use:
 * the practice's correspondence plus your own, and for a legal secretary the
 * practice's plus that of every fee earner they support. `staff.inboxList`
 * applies it; the screen does not filter anything itself.
 *
 * ===========================================================================
 * THE CARD AND THE SCREEN READ THE SAME FUNCTION
 * ===========================================================================
 * The dashboards' inbox card is a preview of this list, not a separate query
 * over the same data — so "3 unread" on a dashboard and the rows here cannot
 * describe different sets. That property is the whole reason the Partner
 * Dashboard's card was worth wiring to a scoped function in the first place.
 *
 * ===========================================================================
 * PORTAL THREADS ARE DERIVED FROM THE CLIENT'S OWN CONVERSATIONS
 * ===========================================================================
 * Building this screen is what exposed the defect: `demoInbox` carried two
 * rows marked `portal` under a comment claiming they were the client's threads
 * seen from the firm's side, and they matched none of the five real
 * conversations in fixtures/messages.ts. A firm-side inbox listing client
 * conversations the client's own Messages screen has never heard of is exactly
 * the failure the derived key date and the single approvals collection exist to
 * prevent, and it was invisible while the only consumer was a three-row
 * dashboard preview.
 *
 * `routedInboxItems` in lib/mock-api.ts now derives them. One conversation, one
 * record, read from whichever side is asking.
 *
 * ---------------------------------------------------------------------------
 * WHAT THIS SCREEN DELIBERATELY DOES NOT DO
 * ---------------------------------------------------------------------------
 *  · MERGE THE THREE SOURCES. Only `portal` is real. Every row names its
 *    source, and opening an `email` or `court` row says in words that the
 *    integration does not exist rather than rendering a body nobody sent.
 *
 *  · OFFER A REPLY BOX. The client portal's composer is labelled "Not sent" and
 *    that was defensible for a client's own words echoing back. Correspondence
 *    going out under the firm's name is not that. Batch 6, where writes exist.
 *
 *  · MARK ANYTHING READ. There is no staff read cursor in this product, and
 *    faking one in client state would clear a badge on open and bring it back
 *    on reload — the same reasoning the client's Messages screen records. What
 *    the data CAN support is "the client spoke last and nobody answered", which
 *    is shown as an obligation rather than dressed up as a read state.
 *
 *  · CLAIM A COUNT IT DID NOT PRODUCE. The filter chips, the subtitle and the
 *    list footer all come from the single pass that built the rows.
 */

/** Rendered per request — every date resolves against the tenant's clock. */
export const dynamic = 'force-dynamic';

const SOURCES: InboxSource[] = ['portal', 'email', 'court'];

function parseSource(value: string | undefined): InboxSource | 'all' {
  // An unrecognised value falls back to everything rather than erroring: the
  // query string arrives from a link someone may have kept, and the right
  // answer to a stale one is the inbox.
  return SOURCES.includes(value as InboxSource) ? (value as InboxSource) : 'all';
}

export default async function StaffInboxPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ source?: string; item?: string }>;
}) {
  const [{ locale }, { source: sourceParam, item: itemParam }] = await Promise.all([
    params,
    searchParams,
  ]);
  setRequestLocale(locale);

  const source = parseSource(sourceParam);

  // MOCK: the session resolves this in production, and the rank it returns is
  // what decides whose correspondence this is. Track A.5.
  const person = await mockApi.staff.currentStaff();
  const { items, counts, unreadCount, awaitingReplyCount } = await mockApi.staff.inboxList(
    person.id,
    { source }
  );

  // An id that names nothing in scope opens nothing, rather than erroring or
  // silently showing the first row — the same rule the client's Messages screen
  // applies to `?thread=`, except that one falls back to the newest thread
  // because a client arriving at /messages expects to be reading something. A
  // firm inbox is a queue; landing in it should not open somebody's post.
  const selected = items.find((candidate) => candidate.id === itemParam) ?? null;

  // Only portal rows have a conversation. The scoping is enforced again in the
  // API rather than trusted from here.
  const thread = selected?.threadId
    ? await mockApi.staff.inboxThread(person.id, selected.threadId)
    : null;

  return (
    <InboxWorkspace
      locale={locale as Locale}
      items={items}
      counts={counts}
      unreadCount={unreadCount}
      awaitingReplyCount={awaitingReplyCount}
      source={source}
      selected={selected}
      thread={thread}
      // Whether the URL NAMED an item, not whether one resolved. Below 1280px
      // this decides which pane is on screen, and landing on /staff/inbox
      // should show the list.
      itemInUrl={typeof itemParam === 'string' && itemParam.length > 0}
      showRecipient={person.rank === 'legalSecretary'}
    />
  );
}
