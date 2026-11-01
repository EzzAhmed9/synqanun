'use client';

import * as React from 'react';
import { Search, ShieldQuestion } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Badge, Button, Card } from '@/components/ui';
import { Link } from '@/lib/i18n/navigation';
import type { ConflictMatchKind } from '@/lib/mock-api';
import { cn } from '@/lib/utils';
import { runConflictSearch, type ConflictSearchView } from './conflict-search-action';

/**
 * The search, and what comes back.
 *
 * ===========================================================================
 * THE QUERY NEVER REACHES THE URL
 * ===========================================================================
 * Third screen in this product to make that decision, and the strongest case
 * of the three. A conflict search names a party the firm is CONSIDERING
 * acting for or against — a deal that has not been announced, a claimant who
 * has not filed, a company being bought. The Legal Database's query reveals
 * what a lawyer thinks is weak; this one reveals who the client is about to
 * be.
 *
 * A URL is the least private thing in a web application: browser history on a
 * shared machine, server access logs, the Referer header, and the screenshot
 * somebody pastes into a chat. So the query goes in a Server Action's POST
 * body and dies with the tab, the way the portal's global search already does.
 *
 * ===========================================================================
 * NO VERDICT, IN EITHER DIRECTION
 * ===========================================================================
 * Findings are listed with what each record says and nothing else — no
 * severity badge, no "Direct Conflict" versus "Potential Overlap", no AI
 * assessment concluding which federal law is engaged at 98.4% confidence.
 * Whether a relationship disqualifies the firm is a judgement about duties to
 * two clients, and it is made by the person reading this, not by a substring
 * match.
 *
 * An empty result says "no record in this firm names that party", never "no
 * conflict". The register is not the world, and that sentence is the whole
 * professional risk.
 */
export function ConflictSearchPanel({ registerSize }: { registerSize: number }) {
  const t = useTranslations('conflicts');

  const [query, setQuery] = React.useState('');
  const [pending, startTransition] = React.useTransition();
  const [result, setResult] = React.useState<ConflictSearchView | null>(null);
  /** The term the displayed result belongs to, so the heading cannot drift. */
  const [searched, setSearched] = React.useState('');

  const submit = (event: React.FormEvent) => {
    // Without this the browser sends a GET and the party's name lands in the
    // address bar. See the header.
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;

    startTransition(async () => {
      const next = await runConflictSearch(trimmed);
      setResult(next);
      setSearched(trimmed);
    });
  };

  return (
    <>
      <Card padding="lg">
        <form onSubmit={submit} className="flex flex-wrap items-end gap-2">
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">{t('search.label')}</span>
            <Search
              aria-hidden
              size={16}
              className="pointer-events-none absolute top-1/2 -translate-y-1/2 text-gray-500 [inset-inline-start:0.75rem]"
            />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('search.placeholder')}
              className={cn(
                'h-10 w-full rounded-btn border border-gray-200 bg-gray-50 ps-9 pe-3',
                'text-body text-gray-700 placeholder:text-gray-500',
                'focus:border-gray-400 focus:bg-white focus:outline-none'
              )}
            />
          </label>
          <Button type="submit" variant="primary" size="md" loading={pending} disabled={!query.trim()}>
            {t('search.submit')}
          </Button>
        </form>

        <p className="mt-3 text-caption text-gray-500">
          {t('search.scope', { count: registerSize })}
        </p>
      </Card>

      {result === null ? null : result.searched === false ? (
        <Card padding="lg">
          <p className="text-body text-gray-600">{t('tooShort')}</p>
        </Card>
      ) : result.matches.length === 0 ? (
        /*
          The careful sentence. "No record names this party" — not "no
          conflict", which the firm's own register cannot establish.
        */
        <Card padding="lg">
          <div className="flex items-start gap-3">
            <ShieldQuestion aria-hidden size={18} className="mt-0.5 shrink-0 text-gray-500" />
            <div className="min-w-0">
              <p className="text-body font-medium text-gray-900">
                <bdi>{t('none.title', { query: searched })}</bdi>
              </p>
              <p className="mt-1 text-caption text-gray-600">{t('none.body')}</p>
            </div>
          </div>
        </Card>
      ) : (
        <>
          <p className="text-caption text-gray-500">
            <bdi>{t('found', { count: result.matches.length, query: searched })}</bdi>
          </p>

          <ul className="flex flex-col gap-3">
            {result.matches.map((match) => (
              <li key={match.id}>
                <Card padding="lg">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="font-sans text-title text-gray-900">
                        <bdi>{match.name}</bdi>
                      </h2>
                      <p className="mt-1 text-body text-gray-700">
                        <bdi>{match.detail}</bdi>
                      </p>
                    </div>

                    {/*
                      A neutral label for WHERE the match came from. Not a
                      grade — see the header, and lib/mock-api.ts's note on
                      why ConflictMatch carries no severity.
                    */}
                    <Badge tone={toneFor(match.kind)}>{t(`kinds.${match.kind}`)}</Badge>
                  </div>

                  {match.reference || match.on || match.href ? (
                    <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-gray-200 pt-3">
                      {match.reference ? (
                        <span dir="ltr" className="font-mono text-reference text-gray-500">
                          {match.reference}
                        </span>
                      ) : null}
                      {match.on ? (
                        <span className="text-caption text-gray-500 [unicode-bidi:isolate]">
                          {match.on}
                        </span>
                      ) : null}
                      {match.href ? (
                        <Link
                          href={match.href}
                          className="text-caption text-legal-navy hover:underline"
                        >
                          {t('openRecord')}
                        </Link>
                      ) : (
                        // A declined engagement never became a record.
                        <span className="text-caption text-gray-500">{t('noRecord')}</span>
                      )}
                    </div>
                  ) : null}
                </Card>
              </li>
            ))}
          </ul>

          {/* Said under every result set, not only the empty one. */}
          <p className="rounded-card border border-warning/30 bg-warning/5 p-3 text-caption text-gray-700">
            {t('noVerdict')}
          </p>
        </>
      )}
    </>
  );
}

/**
 * Colour by SOURCE, never by severity.
 *
 * `adverse` and `declined` are warning-toned because they describe the firm
 * having already taken a position — which is the thing a reader most needs to
 * see, not the thing the screen has graded as worse. `client` is success
 * because acting for someone is a good state, not a problem. Everything else
 * is neutral.
 */
function toneFor(kind: ConflictMatchKind): 'success' | 'warning' | 'neutral' {
  if (kind === 'client') return 'success';
  if (kind === 'adverse' || kind === 'declined') return 'warning';
  return 'neutral';
}

export default ConflictSearchPanel;
