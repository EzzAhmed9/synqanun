'use client';

import * as React from 'react';
import {
  Briefcase,
  FileText,
  MessageSquare,
  Receipt,
  Scale,
  Search,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { Badge, Overlay } from '@/components/ui';
import { useRouter } from '@/lib/i18n/navigation';
import type { Locale } from '@/lib/i18n/routing';
import type { SearchHit, SearchKind, SearchResults } from '@/lib/mock-api';
import { MIN_QUERY_LENGTH, normaliseForSearch } from '@/lib/search';
import { cn } from '@/lib/utils';
import { runGlobalSearch } from './search-action';

/**
 * Global search — one box over every collection in the client's portal.
 *
 * ===========================================================================
 * THE QUERY NEVER TOUCHES THE URL
 * ===========================================================================
 * This is the one decision the whole screen is built around, and it runs against
 * the grain of everything else in this portal. `?status=overdue`, `?tab=team`,
 * `?thread=`, and now `?doc=` are all deliberately IN the URL: they are views,
 * they are linkable, and putting them in history is a feature.
 *
 * A SEARCH TERM IS NOT A VIEW. It is a sentence the client typed about their own
 * legal affairs — a counterparty they have not sued yet, a settlement figure, a
 * regulator's name. `?q=` would write that into browser history on a machine
 * that may be shared, into the next Referer header, and into every access log
 * between the browser and the server. The status of an invoice is not
 * privileged; what a client went looking for is.
 *
 * So the query lives in component state, it reaches the server in a POST body
 * via a Server Action, and closing the overlay disposes of it. There is no
 * deep link to a search result page, deliberately — see app/.../search-action.ts.
 *
 * ===========================================================================
 * NO "RECENT SEARCHES"
 * ===========================================================================
 * Both exports show a strip of them in the footer — "SPV Articles",
 * "INV-2025-089", "Mansoor Al-Farooq". It is a genuinely useful feature and it
 * is not built, because the only place a prototype with no session could keep
 * them is `localStorage`, which is the durable version of the problem the
 * paragraph above avoids: a list of what this client searched for, sitting on
 * the device, surviving sign-out, readable by the next person to open the
 * laptop.
 *
 * Not a permanent no. It belongs server-side against an authenticated session,
 * with a retention window and a way to clear it — which makes it a product
 * decision with a privacy policy attached, not a UI detail to be inferred from a
 * mockup. Flagged rather than quietly shipped.
 *
 * ---------------------------------------------------------------------------
 * NOT CARRIED OVER FROM THE STITCH EXPORT
 * ---------------------------------------------------------------------------
 *  · REWRITTEN RECORDS. Every matter in the export has had the search term
 *    edited into its title: "Apollo Commercial Logistics — Corporate
 *    Restructuring Defence" for a matter whose name is "Apollo Commercial
 *    Logistics v. Al-Noor Freight", "Marina Tower EPC Contract Arbitration &
 *    Restructuring" for one called "Marina Tower EPC contract arbitration".
 *    This is the most quietly dishonest thing in any export so far: it does not
 *    fake a feature, it fakes the DATA so the feature looks good, and it would
 *    have been invisible to anyone not holding the fixtures. The search below
 *    runs against the real records and finds whatever it finds.
 *
 *  · "14 total matches across 5 categories" over sections whose own chips read
 *    3, 2, 3, 2 and 1 — eleven. The counts also disagree with their own footers:
 *    a "Matters 3" chip above a "View all 4 matters" link, "Documents 3" above
 *    "View all 5 documents". Every count here is the length of the list under
 *    it.
 *
 *  · THE "VIEW ALL N MATCHING …" LINKS, which cannot be built at all: the
 *    destination would have to carry the query in its URL. Nothing is capped
 *    instead, so there is nothing to link to. See lib/mock-api.ts.
 *
 *  · "Vault & Shared Files", "المراسلات الآمنة" ("secure correspondence") as the
 *    Messages heading, and "Notarized & Sealed" / "معتمد وموثق رسمياً" as a
 *    document status. There is no vault, no encryption, and no notarisation in
 *    this model — the eighth screen running for this category. Arabic said
 *    "secure correspondence" where English said plainly "Messages", which is the
 *    same divergence the dashboard already had corrected.
 *
 *  · "Adv. Mansoor Al-Farooq" and "Sender: Senior Partner Counsel". The
 *    honorific is gendered in Arabic (see fixtures/engagements.ts) and the role
 *    line is not a role any fixture holds.
 *
 *  · "1 overdue" AS A STATUS ON A SINGLE INVOICE. That is a count of a
 *    collection rendered as a property of one row.
 *
 *  · THE ALL-CAPS SECTION EYEBROWS ("MATTERS", "PROJECTS", tracking-wider),
 *    which design.md §3 and §7 name as a generic-AI-UI tell and forbid.
 *
 *  · "Powered by" AND THE TWO LOGO IMAGES inside the search panel's footer.
 *    brand-guidelines.md §7.2 requires that row in the main app footer, which
 *    the portal layout already renders; a search overlay is not one of the
 *    four branding locations in design.md §10, and stamping it here would put
 *    the mark twice on one screen.
 *
 *  · THE MIRRORED SEARCH ICON in the Arabic version (`scale-x-[-1]`). A
 *    magnifying glass is not directional; flipping it makes a left-handed
 *    magnifier, not an RTL one. design.md §12's mirroring rule covers arrows and
 *    progress, not objects.
 *
 *  · MARCH 2025 throughout, and per-language filenames for the same file.
 */

const KIND_ICON: Record<SearchKind, LucideIcon> = {
  matter: Scale,
  project: Briefcase,
  document: FileText,
  invoice: Receipt,
  message: MessageSquare,
};

/** How long to wait after the last keystroke before asking the server. */
const DEBOUNCE_MS = 220;

export interface GlobalSearchProps {
  open: boolean;
  onClose: () => void;
}

export function GlobalSearch({ open, onClose }: GlobalSearchProps) {
  const t = useTranslations('search');
  const locale = useLocale() as Locale;
  const router = useRouter();

  const inputRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);

  const [query, setQuery] = React.useState('');
  const [results, setResults] = React.useState<SearchResults | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [active, setActive] = React.useState(0);

  const labelId = React.useId();
  const listId = React.useId();

  // Flattened once per result set: the keyboard moves through one sequence, not
  // through groups within groups.
  const flat = React.useMemo(
    () => (results?.groups ?? []).flatMap((group) => group.hits),
    [results]
  );

  const tooShort = normaliseForSearch(query).length < MIN_QUERY_LENGTH;

  /* --- Querying ---------------------------------------------------------- */

  React.useEffect(() => {
    if (!open) return;

    if (tooShort) {
      setResults(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const term = query;
    const timer = setTimeout(() => {
      void runGlobalSearch(term).then((next) => {
        // Discard a response that is no longer the current question. Debouncing
        // reduces how often this happens; it does not prevent it, because a
        // slow request for "res" can still land after a fast one for
        // "restructuring" and would otherwise replace the right answer with an
        // older one. The echoed query is what makes the check possible — see
        // SearchResults in lib/mock-api.ts.
        setResults((current) => (next.query === query.trim() ? next : current));
        if (next.query === query.trim()) {
          setLoading(false);
          setActive(0);
        }
      });
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [query, open, tooShort]);

  // Opening fresh, and disposing on close. The query is not kept between
  // openings — see the privacy note at the top of this file.
  React.useEffect(() => {
    if (open) {
      // The overlay does not autofocus, so this is the only focus move and it
      // lands where typing should go.
      inputRef.current?.focus();
      return;
    }
    setQuery('');
    setResults(null);
    setLoading(false);
    setActive(0);
  }, [open]);

  /* --- Keyboard ---------------------------------------------------------- */

  function go(hit: SearchHit) {
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

  // Keep the active row in view. `block: 'nearest'` and NOT smooth scrolling:
  // the documents library shipped a smooth scroll that silently stalled 36px
  // into a long journey, and holding an arrow key down here would queue one
  // animation per keystroke.
  React.useEffect(() => {
    const node = listRef.current?.querySelector<HTMLElement>('[data-active="true"]');
    node?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const hasQuery = !tooShort;
  const empty = hasQuery && !loading && results !== null && results.total === 0;

  return (
    <Overlay
      open={open}
      onClose={onClose}
      size="xl"
      align="top"
      labelledBy={labelId}
      // The input below takes focus itself; letting the overlay move focus
      // first would announce two focus changes on open.
      autoFocus={false}
    >
      <h2 id={labelId} className="sr-only">
        {t('title')}
      </h2>

      {/* Input row — the overlay's header. ------------------------------- */}
      <div className="flex items-center gap-3 border-b border-gray-200 px-4 py-3">
        {/* NOT mirrored in Arabic: a magnifying glass is an object, not a
            direction. See the note at the top of this file. */}
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
          // Not a <form>. There is nothing to submit: results arrive as you
          // type, and Enter opens the highlighted row. A form here would be one
          // missing onSubmit away from putting the query in the query string,
          // which is the one thing this screen must never do.
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder={t('placeholder')}
          autoComplete="off"
          spellCheck={false}
          className="min-w-0 flex-1 bg-transparent text-title text-gray-700 outline-none placeholder:text-gray-500"
        />

        {query ? (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              inputRef.current?.focus();
            }}
            aria-label={t('clear')}
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-pill text-gray-500 hover:bg-gray-100 hover:text-gray-600"
          >
            <X aria-hidden size={15} />
          </button>
        ) : null}

        <kbd className="shrink-0 rounded-sm border border-gray-200 bg-gray-100 px-1.5 py-0.5 font-mono text-caption text-gray-500 max-tablet:hidden">
          Esc
        </kbd>
      </div>

      {/* Status strip ---------------------------------------------------- */}
      {hasQuery ? (
        <div className="flex items-center justify-between gap-3 border-b border-gray-200 bg-gray-50 px-4 py-2">
          {/*
            One count, from the rows. `aria-live` because the result of typing
            is a number that changes silently otherwise — a sighted user sees
            the list move, a screen-reader user gets nothing.
          */}
          <p role="status" aria-live="polite" className="text-caption text-gray-500">
            {/*
              Zero is its own whole sentence rather than a `=0` arm inside the
              composed one. With both plurals in a single string, no results
              rendered as "No matches in 0 sections" — and in Arabic as "لا توجد
              نتائج في لا قسم", "no matches in no section". A count of sections is
              meaningless once the count of matches is zero, so the sentence
              stops there.
            */}
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
            <p className="text-caption text-gray-500 max-tablet:hidden">{t('navigate')}</p>
          ) : null}
        </div>
      ) : null}

      {/* Results --------------------------------------------------------- */}
      <div ref={listRef} id={listId} role="listbox" aria-label={t('title')} className="overflow-y-auto p-2">
        {!hasQuery ? (
          <p className="px-3 py-8 text-center text-body text-gray-500">{t('prompt')}</p>
        ) : empty ? (
          // The query is echoed back, which is safe: it is on screen already,
          // and it is the fastest way to spot a typo.
          <p className="px-3 py-8 text-center text-body text-gray-500">
            {t('empty', { query: results?.query ?? query })}
          </p>
        ) : (
          (results?.groups ?? []).map((group) => {
            const Icon = KIND_ICON[group.kind];

            return (
              <section key={group.kind} className="mb-2 last:mb-0">
                {/* Sentence case, not an all-caps eyebrow — design.md §3. */}
                <h3 className="flex items-center gap-2 px-3 py-1.5 text-caption font-medium text-gray-500">
                  <Icon aria-hidden size={13} strokeWidth={2} className="text-gray-500" />
                  {t(`kinds.${group.kind}`, { count: group.hits.length })}
                  <span className="text-gray-500">({group.hits.length})</span>
                </h3>

                <ul>
                  {group.hits.map((hit) => {
                    const index = flat.indexOf(hit);

                    return (
                      <li key={hit.id}>
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

/* ===========================================================================
 * Row
 * ======================================================================== */

function Row({
  hit,
  id,
  locale,
  active,
  onHover,
  onSelect,
}: {
  hit: SearchHit;
  id: string;
  locale: Locale;
  active: boolean;
  onHover: () => void;
  onSelect: () => void;
}) {
  const t = useTranslations('search');

  return (
    // A <button>, not an <a>. The destination is reached through the router so
    // the overlay can close first; an anchor would also need its own click
    // handler to do that, and would then be a link that does not behave like
    // one on middle-click. The whole row is the target.
    <button
      type="button"
      id={id}
      role="option"
      aria-selected={active}
      data-active={active}
      onMouseEnter={onHover}
      onClick={onSelect}
      className={cn(
        'flex w-full items-start gap-3 rounded-btn px-3 py-2.5 text-start transition-colors',
        active ? 'bg-gray-100' : 'hover:bg-gray-50'
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          {hit.reference ? (
            // A reference is Latin in both locales — one of the few strings
            // that genuinely wants dir="ltr". See lib/format.ts.
            <span dir="ltr" className="font-mono text-reference text-gray-500">
              {hit.reference}
            </span>
          ) : null}

          {/* <bdi>: a filename or a subject line may be in either script, and
              this row must keep the page's direction either way. */}
          <span className="text-body font-medium text-gray-700 [overflow-wrap:anywhere]">
            <bdi>{hit.title[locale]}</bdi>
          </span>
        </div>

        <p className="mt-0.5 truncate text-caption text-gray-500">
          <bdi>{hit.meta[locale]}</bdi>
        </p>
      </div>

      {hit.status ? (
        <Badge tone={hit.status.tone} className="mt-0.5 shrink-0">
          {hit.status.form === 'text' ? hit.status.label[locale] : t(`status.${hit.status.key}`)}
        </Badge>
      ) : null}
    </button>
  );
}

export default GlobalSearch;
