'use client';

import * as React from 'react';
import { Search, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button, Select } from '@/components/ui';
import { Link, usePathname, useRouter } from '@/lib/i18n/navigation';
import { cn } from '@/lib/utils';

/**
 * The search bar and the two facet dropdowns.
 *
 * ===========================================================================
 * THE QUERY NEVER REACHES THE URL. THE FACETS ALWAYS DO.
 * ===========================================================================
 * This screen splits its state two ways, and the split is not only the usual
 * "views in the URL, free text in component state" convenience — here it is
 * also a confidentiality decision.
 *
 * A legal research query is privileged work product. "unfair dismissal
 * limitation period", typed by a partner, reveals what that partner thinks is
 * weak about a live case; and a URL is the least private thing in a web
 * application. It lands in browser history on a shared machine, in server
 * access logs, in the Referer header of anything the page loads, and in the
 * screenshot somebody pastes into a chat to ask a colleague a question. The
 * project's standing check on every screen is whether data leaks into the
 * URL; this is the screen where that leak would matter most.
 *
 * So the query lives here, in component state, and dies with the tab. The
 * facets — type and issuing body — are a VIEW of a list, carry nothing about
 * anyone's thinking, and go in the URL where a view belongs, so the page stays
 * linkable and the back button keeps working.
 *
 * ===========================================================================
 * SUBMITTING IS A NO-OP, AND SAYS SO IN WORDS
 * ===========================================================================
 * There is no corpus — fixtures/legal-database.ts explains why — so there is
 * nothing to search. Three options, and only one of them is honest:
 *
 *   · Match the query against the sample entries. Retrieval theatre: it would
 *     teach a demo audience that search works here, and the thing it would be
 *     matching against is Lorem Ipsum.
 *   · Do nothing at all. An inert button, which design.md forbids and which
 *     reads to a user as a bug rather than as a boundary.
 *   · Acknowledge the action and state plainly that nothing was looked up.
 *
 * The third. `preventDefault` is what stops the second-worst outcome arriving
 * by accident: an unhandled submit inside a <form> sends a full-page GET and
 * puts the query straight into the address bar — the exact leak this component
 * exists to prevent.
 *
 * ===========================================================================
 * IT TRANSLATES ITSELF
 * ===========================================================================
 * Unlike ScriptedChat, which is handed finished strings, this component
 * assembles a sentence around a value the server never sees — the query the
 * reader typed. That sentence has to be built where the value is, so this
 * calls `useTranslations` directly, as the sign-in and onboarding forms do.
 */
export function LegalSearch({
  kind,
  jurisdiction,
  kinds,
  jurisdictions,
}: {
  kind: string;
  jurisdiction: string;
  kinds: { value: string; label: string }[];
  jurisdictions: { value: string; label: string }[];
}) {
  const t = useTranslations('legalDatabase');
  const router = useRouter();
  const pathname = usePathname();

  const [draft, setDraft] = React.useState('');
  /** The query that was submitted, kept only in order to say it went nowhere. */
  const [attempted, setAttempted] = React.useState<string | null>(null);

  /** Facets rewrite the URL. An emptied dropdown drops its key entirely. */
  const go = (key: 'kind' | 'jurisdiction', value: string) => {
    const next = new URLSearchParams({
      ...(kind ? { kind } : {}),
      ...(jurisdiction ? { jurisdiction } : {}),
    });
    if (value) next.set(key, value);
    else next.delete(key);
    const query = next.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  };

  const narrowed = Boolean(kind || jurisdiction);

  return (
    <div className="flex flex-col gap-4">
      <form
        onSubmit={(event) => {
          // Without this the browser sends a GET and the query lands in the
          // address bar. See the header.
          event.preventDefault();
          const trimmed = draft.trim();
          if (trimmed) setAttempted(trimmed);
        }}
        className="flex flex-wrap items-end gap-2"
      >
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">{t('search.label')}</span>
          <Search
            aria-hidden
            size={16}
            className="pointer-events-none absolute top-1/2 -translate-y-1/2 text-gray-500 [inset-inline-start:0.75rem]"
          />
          <input
            type="search"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={t('search.placeholder')}
            className={cn(
              'h-10 w-full rounded-btn border border-gray-200 bg-gray-50 ps-9 pe-3',
              'text-body text-gray-700 placeholder:text-gray-500',
              'focus:border-gray-400 focus:bg-white focus:outline-none'
            )}
          />
        </label>
        <Button type="submit" variant="secondary" size="md" disabled={!draft.trim()}>
          {t('search.submit')}
        </Button>
      </form>

      {/*
        What the search actually did, which is nothing. Neutral, not an error
        state — the reader did nothing wrong; the capability is not here yet.
      */}
      {attempted !== null ? (
        <div
          role="status"
          className="flex items-start gap-3 rounded-card border border-gray-200 bg-gray-50 p-3"
        >
          <div className="min-w-0 flex-1">
            <p className="text-caption font-medium text-gray-700">{t('search.resultTitle')}</p>
            <p className="mt-0.5 text-caption text-gray-600">
              {/* Isolated: a Latin query must not reorder the Arabic sentence
                  it is quoted inside. lib/format.ts's bidi rule. */}
              <bdi>{t('search.result', { query: attempted })}</bdi>
            </p>
          </div>
          <button
            type="button"
            onClick={() => setAttempted(null)}
            className="shrink-0 rounded-btn p-1 text-gray-500 hover:bg-gray-200 hover:text-gray-700"
          >
            <X aria-hidden size={14} />
            <span className="sr-only">{t('search.dismiss')}</span>
          </button>
        </div>
      ) : null}

      {/* Both lists are derived from the entries, so no option can return
          nothing — the same rule the matter and project registers follow. */}
      <div className="grid grid-cols-1 gap-3 tablet:grid-cols-2">
        {(
          [
            ['kind', kinds, t('filters.allKinds'), t('filters.kind')],
            [
              'jurisdiction',
              jurisdictions,
              t('filters.allJurisdictions'),
              t('filters.jurisdiction'),
            ],
          ] as const
        ).map(([key, options, allLabel, label]) => (
          <label key={key} className="flex flex-col gap-1">
            <span className="text-caption text-gray-500">{label}</span>
            <Select
              value={key === 'kind' ? kind : jurisdiction}
              onChange={(event) => go(key, event.target.value)}
            >
              <option value="">{allLabel}</option>
              {options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </label>
        ))}
      </div>

      {narrowed ? (
        <Link
          href="/staff/legal-database"
          className="w-fit text-caption text-legal-navy hover:underline"
        >
          {t('filters.clear')}
        </Link>
      ) : null}
    </div>
  );
}

export default LegalSearch;
