'use client';

import * as React from 'react';
import {
  Archive,
  Briefcase,
  FileText,
  Info,
  Library,
  Receipt,
  Scale,
  Search,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { Badge, Overlay } from '@/components/ui';
import { useRouter } from '@/lib/i18n/navigation';
import type { Locale } from '@/lib/i18n/routing';
import { MIN_QUERY_LENGTH, normaliseForSearch } from '@/lib/search';
import type { StaffSearchHit, StaffSearchKind, StaffSearchResults } from '@/lib/mock-api';
import { cn } from '@/lib/utils';
import { runStaffSearch } from './staff-search-action';

/**
 * The firm's global search — one box over the register, the CRM, the document
 * vault, the ledger and the legal database.
 *
 * ===========================================================================
 * WHY THIS IS NOT THE CLIENT PORTAL'S OVERLAY WITH A DIFFERENT ACTION
 * ===========================================================================
 * The header's search button was a named no-op for exactly this reason, and the
 * comment on it was right: staff search reaches further than the client's, so
 * pointing the portal's overlay at this header would have returned a client's
 * slice of the firm to somebody who works here.
 *
 * What differs is not cosmetic. A fee earner searches EVERY client rather than
 * one; the firm's internal drafts as well as what has been shared; the legal
 * database, which the portal has no concept of; and no message threads, because
 * a staff inbox is a different collection with its own screen. And unlike the
 * portal — where one account sees one client's everything — what comes back
 * here depends on RANK.
 *
 * The interaction is deliberately identical: same debounce, same stale-response
 * check, same keyboard model, same refusal to put the query in the URL. A
 * reviewer who has used one should not have to learn the other.
 *
 * ===========================================================================
 * WHY THERE ARE STILL THREE SEARCH BOXES, AND WHY THAT IS RIGHT
 * ===========================================================================
 * This overlay, the conflict check and the legal database screen all take a
 * typed query, and merging them was the obvious tidy-up. It would have been
 * wrong twice:
 *
 *   · THE CONFLICT CHECK IS NOT A SEARCH. It runs a party name against the
 *     firm's records and answers a question with legal weight — whether this
 *     firm can act. Its result is a finding with its own screen, its own
 *     caveats and its own record of having been run. Dropping "no conflict
 *     found" into a list of search hits would turn a professional check into a
 *     row that looks like everything else.
 *
 *   · THE LEGAL DATABASE SCREEN IS A BROWSER, NOT A BOX. It carries kind and
 *     jurisdiction filters, result cards with excerpts, and a position counter
 *     over the whole corpus. That is a screen for reading a corpus; an overlay
 *     is for getting somewhere.
 *
 * What this DOES do is include legal-database entries as a group, so one box
 * still spans both worlds and a half-remembered reference is findable from any
 * screen. The specialist screens keep the depth; this keeps the reach.
 *
 * ===========================================================================
 * THE QUERY NEVER TOUCHES THE URL
 * ===========================================================================
 * Same rule as the portal's, with a different party at risk. A fee earner's
 * search terms name clients, counterparties and matters the firm may not have
 * taken on — "Al-Noor conflict" typed before a pitch says something about both
 * the firm and the prospect. So: a Server Action POST, no `?q=`, no deep link
 * to a result set, and nothing kept between openings.
 */

const KIND_ICON: Record<StaffSearchKind, LucideIcon> = {
  matter: Scale,
  project: Briefcase,
  client: Users,
  document: FileText,
  invoice: Receipt,
  legalEntry: Library,
};

/** How long to wait after the last keystroke before asking the server. */
const DEBOUNCE_MS = 220;

export interface StaffSearchProps {
  open: boolean;
  onClose: () => void;
}

export function StaffSearch({ open, onClose }: StaffSearchProps) {
  const t = useTranslations('staffSearch');
  const locale = useLocale() as Locale;
  const router = useRouter();

  const inputRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);

  const [query, setQuery] = React.useState('');
  const [results, setResults] = React.useState<StaffSearchResults | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [active, setActive] = React.useState(0);

  const labelId = React.useId();
  const listId = React.useId();

  // One sequence for the keyboard, not groups within groups.
  const flat = React.useMemo(
    () => (results?.groups ?? []).flatMap((group) => group.hits),
    [results]
  );

  const tooShort = normaliseForSearch(query).length < MIN_QUERY_LENGTH;

  React.useEffect(() => {
    if (!open) return;

    if (tooShort) {
      setResults(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const timer = setTimeout(() => {
      void runStaffSearch(query).then((next) => {
        // Discard a response that is no longer the current question: a slow
        // request for "res" can land after a fast one for "restructuring". The
        // echoed query is what makes the check possible.
        setResults((current) => (next.query === query.trim() ? next : current));
        if (next.query === query.trim()) {
          setLoading(false);
          setActive(0);
        }
      });
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [query, open, tooShort]);

  // Opening fresh, and disposing on close. Nothing is kept between openings —
  // see the privacy note above.
  React.useEffect(() => {
    if (open) {
      inputRef.current?.focus();
      return;
    }
    setQuery('');
    setResults(null);
    setLoading(false);
    setActive(0);
  }, [open]);

  function go(hit: StaffSearchHit) {
    onClose();
    router.push(hit.href);
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (flat.length === 0) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((index) => (index + 1) % flat.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((index) => (index - 1 + flat.length) % flat.length);
    } else if (event.key === 'Home') {
      event.preventDefault();
      setActive(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      setActive(flat.length - 1);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const hit = flat[active];
      if (hit) go(hit);
    }
  }

  // `block: 'nearest'`, not smooth — holding an arrow key would otherwise queue
  // one animation per keystroke. Same call the client overlay makes.
  React.useEffect(() => {
    const node = listRef.current?.querySelector<HTMLElement>('[data-active="true"]');
    node?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const hasQuery = !tooShort;
  const empty = hasQuery && !loading && results !== null && results.total === 0;
  const withheld = results?.withheld ?? [];

  return (
    <Overlay
      open={open}
      onClose={onClose}
      size="xl"
      align="top"
      labelledBy={labelId}
      autoFocus={false}
    >
      <h2 id={labelId} className="sr-only">
        {t('title')}
      </h2>

      <div className="flex items-center gap-3 border-b border-gray-200 px-4 py-3">
        {/* Not mirrored in Arabic: a magnifying glass is an object, not a
            direction. */}
        <Search aria-hidden size={18} className="shrink-0 text-gray-500" />

        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={flat.length > 0}
          aria-controls={listId}
          aria-activedescendant={
            flat.length > 0 && flat[active] ? `${listId}-${flat[active].id}` : undefined
          }
          aria-autocomplete="list"
          aria-label={t('title')}
          // Not a <form>. Nothing to submit, and a form here would be one
          // missing onSubmit away from putting the query in the query string.
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder={t('placeholder')}
          autoComplete="off"
          spellCheck={false}
          className="min-w-0 flex-1 bg-transparent text-title text-gray-700 outline-none placeholder:text-gray-600"
        />

        {query ? (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              inputRef.current?.focus();
            }}
            aria-label={t('clear')}
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-pill text-gray-500 hover:bg-gray-100 hover:text-gray-700"
          >
            <X aria-hidden size={15} />
          </button>
        ) : null}

        <kbd className="shrink-0 rounded-sm border border-gray-200 bg-gray-100 px-1.5 py-0.5 font-mono text-caption text-gray-600 max-tablet:hidden">
          Esc
        </kbd>
      </div>

      {hasQuery ? (
        <div className="flex items-center justify-between gap-3 border-b border-gray-200 bg-gray-50 px-4 py-2">
          <p role="status" aria-live="polite" className="text-caption text-gray-600">
            {/* Zero is its own sentence: a count of sections is meaningless once
                the count of matches is zero. */}
            {loading
              ? t('searching')
              : (results?.total ?? 0) === 0
                ? t('countZero')
                : t('count', {
                    count: results?.total ?? 0,
                    groups: results?.groups.length ?? 0,
                  })}
          </p>

          {flat.length > 0 ? (
            <p className="text-caption text-gray-600 max-tablet:hidden">{t('navigate')}</p>
          ) : null}
        </div>
      ) : null}

      {/*
        WHAT THIS RANK WAS NOT ALLOWED TO SEARCH, SAID OUT LOUD.

        Returning fewer rows in silence is how somebody concludes a record does
        not exist. A junior associate who searches an invoice reference and gets
        nothing should be told the ledger was not searched — not left to decide
        the invoice was never raised. The gate is not apologised for; it is just
        not hidden.
      */}
      {hasQuery && withheld.length > 0 ? (
        <p className="flex items-start gap-2 border-b border-gray-200 bg-gray-50 px-4 py-2 text-caption text-gray-600">
          <Info aria-hidden size={13} className="mt-0.5 shrink-0 text-gray-500" />
          <span>
            {t('withheld', {
              // Intl's list, not a hard-coded joiner: "، " in Arabic, ", " and
              // "and" in English.
              groups: new Intl.ListFormat(locale, { type: 'conjunction' }).format(
                withheld.map((kind) => t(`kinds.${kind}`, { count: 2 }))
              ),
            })}
          </span>
        </p>
      ) : null}

      <div
        ref={listRef}
        id={listId}
        role="listbox"
        aria-label={t('title')}
        className="overflow-y-auto p-2"
      >
        {!hasQuery ? (
          <p className="px-3 py-8 text-center text-body text-gray-600">{t('prompt')}</p>
        ) : empty ? (
          <p className="px-3 py-8 text-center text-body text-gray-600">
            {t('empty', { query: results?.query ?? query })}
          </p>
        ) : (
          (results?.groups ?? []).map((group) => {
            const Icon = KIND_ICON[group.kind];

            return (
              <section key={group.kind} className="mb-2 last:mb-0">
                {/* Sentence case, not an all-caps eyebrow — design.md §3. */}
                <h3 className="flex items-center gap-2 px-3 py-1.5 text-caption font-medium text-gray-600">
                  <Icon aria-hidden size={13} strokeWidth={2} className="text-gray-500" />
                  {t(`kinds.${group.kind}`, { count: group.hits.length })}
                  <span className="text-gray-600">({group.hits.length})</span>
                </h3>

                <ul>
                  {group.hits.map((hit) => {
                    const index = flat.indexOf(hit);

                    return (
                      <li key={`${hit.kind}-${hit.id}`}>
                        <Row
                          hit={hit}
                          id={`${listId}-${hit.id}`}
                          locale={locale}
                          active={index === active}
                          onHover={() => setActive(index)}
                          onSelect={() => go(hit)}
                        />
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })
        )}
      </div>
    </Overlay>
  );
}

function Row({
  hit,
  id,
  locale,
  active,
  onHover,
  onSelect,
}: {
  hit: StaffSearchHit;
  id: string;
  locale: Locale;
  active: boolean;
  onHover: () => void;
  onSelect: () => void;
}) {
  const t = useTranslations('staffSearch');

  return (
    // A <button>, not an <a>: the overlay has to close before the router moves.
    <button
      type="button"
      id={id}
      role="option"
      aria-selected={active}
      data-active={active}
      onMouseEnter={onHover}
      onClick={onSelect}
      className={cn(
        // flex-wrap with a floor on the text column: on a phone a long status
        // pill drops under the title instead of squeezing it to a letter wide.
        'flex w-full flex-wrap items-start gap-x-3 gap-y-1 rounded-btn border-s-2 px-3 py-2.5 text-start transition-colors',
        // The edge, not just the wash, marks the active option: gray-100 on
        // white is barely 1.1:1. `action` holds 3:1 or better against white in
        // both modes (syn-red 4.0, Meezan's bronze 4.85) — WCAG 1.4.11.
        active ? 'border-action bg-gray-100' : 'border-transparent hover:bg-gray-50'
      )}
    >
      <div className="min-w-[12rem] flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          {hit.reference ? (
            // Latin in both locales — lib/format.ts's identifier rule.
            <span dir="ltr" className="font-mono text-reference text-gray-600">
              {hit.reference}
            </span>
          ) : null}

          {/* <bdi>: a filename or a client name may be in either script. */}
          <span className="text-body font-medium text-gray-700 [overflow-wrap:anywhere]">
            <bdi>{hit.title[locale]}</bdi>
          </span>
        </div>

        <p className="mt-0.5 truncate text-caption text-gray-600">
          <bdi>{hit.meta[locale]}</bdi>
        </p>
      </div>

      <span className="mt-0.5 flex shrink-0 flex-wrap items-center gap-1.5">
        {/* A closed legal matter lives in the register's Archive; say so,
            with a word and an icon, before the reader opens it. */}
        {hit.archived ? (
          <Badge tone="neutral" icon={<Archive aria-hidden size={12} />}>
            {t('archived')}
          </Badge>
        ) : null}
        {hit.status ? (
          <Badge tone={hit.status.tone}>
            {hit.status.form === 'text' ? hit.status.label[locale] : t(`status.${hit.status.key}`)}
          </Badge>
        ) : null}
      </span>
    </button>
  );
}

export default StaffSearch;
