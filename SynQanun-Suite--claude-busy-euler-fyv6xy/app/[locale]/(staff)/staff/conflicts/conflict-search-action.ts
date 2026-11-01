'use server';

import { getLocale } from 'next-intl/server';
import { formatCalendarDate } from '@/lib/format';
import type { Locale } from '@/lib/i18n/routing';
import { mockApi, type ConflictMatchKind } from '@/lib/mock-api';

/**
 * Run a conflict search.
 *
 * ===========================================================================
 * A SERVER ACTION, FOR THE REASON search-action.ts GIVES
 * ===========================================================================
 * Two reasons, and the second is why this is not a URL.
 *
 * 1. THE REGISTER STAYS ON THE SERVER. Matching in the browser would mean
 *    shipping every client, every opposing party and the whole declined-work
 *    log into the bundle so a search box could hide most of them. The
 *    declined log in particular is the firm's record of work it turned away
 *    and why — that is not something to hand to every page load.
 *
 * 2. THE QUERY IS NOT A VIEW. It names a party the firm is considering acting
 *    for or against: an unannounced deal, an unfiled claim, a target company.
 *    A POST body is where that belongs, not browser history on a shared
 *    machine.
 *
 * ===========================================================================
 * RESOLVED HERE, NOT IN THE COMPONENT
 * ===========================================================================
 * The action returns strings already in the reader's language, because a
 * Server Action can reach `getLocale()` and a Client Component cannot be
 * handed a `Record<Locale, string>` to decide later. Same arrangement as
 * every other server-resolved surface in this product.
 *
 * No rank gate. Checking whether the firm is conflicted is something any fee
 * earner may legitimately need to do before a conversation goes further, and
 * everything it returns is the firm's own record of its own work — which the
 * registers already show. What is gated is ACTING on it: opening the matter
 * or taking the client on.
 */

export interface ConflictMatchView {
  id: string;
  kind: ConflictMatchKind;
  name: string;
  detail: string;
  href: string | null;
  reference: string | null;
  /** Already formatted for the reader's locale, or null. */
  on: string | null;
}

export interface ConflictSearchView {
  matches: ConflictMatchView[];
  searched: boolean;
  registerSize: number;
}

export async function runConflictSearch(query: string): Promise<ConflictSearchView> {
  const locale = (await getLocale()) as Locale;
  const result = await mockApi.staff.conflictSearch(query);

  return {
    searched: result.searched,
    registerSize: result.registerSize,
    matches: result.matches.map((match) => ({
      id: match.id,
      kind: match.kind,
      name: match.name[locale],
      detail: match.detail[locale],
      href: match.href,
      reference: match.reference,
      on: match.on ? formatCalendarDate(match.on, locale, { month: 'short' }) : null,
    })),
  };
}
