'use client';

import * as React from 'react';
import { SendHorizonal } from 'lucide-react';
import { Badge, Button } from '@/components/ui';
import { Link } from '@/lib/i18n/navigation';
import { cn } from '@/lib/utils';
import { AIDemoNotice } from './AIDemoNotice';

/**
 * The transcript, and the matcher that decides what comes back.
 *
 * ===========================================================================
 * TWO SCREENS, ONE CHAT
 * ===========================================================================
 * This began as AssistantChat.tsx, inside the Assistant's own folder. The
 * Digest is the second scripted conversation in the product and needs the same
 * three things — an opening line, a set of offered questions, and an honest
 * answer to anything else — so it moved up a level and lost the "Assistant"
 * in its name. That is the project's rule about extracting at the SECOND real
 * instance rather than the first: the shape is now known, because two screens
 * have asked for it.
 *
 * The two differ only in what they are handed. The Assistant opens with an
 * invitation; the Digest opens with a briefing that counts today's calendar
 * and the reader's review queue. Both of those are just the `greeting` prop,
 * resolved on the server, which is why neither needed a flag here.
 *
 * ===========================================================================
 * EVERY ANSWER ARRIVES FULLY FORMED
 * ===========================================================================
 * The server resolved each exchange from real records and rendered it into the
 * active language before this component ever saw it. Nothing here reads a
 * fixture, formats a date or resolves a locale — the same arrangement
 * InboxList.tsx and ClientsTable.tsx use, and the reason a Server Component
 * may not hand a function across the boundary.
 *
 * ===========================================================================
 * AN UNMATCHED QUESTION GETS AN HONEST ANSWER
 * ===========================================================================
 * If nothing matches, it says so and names what it can answer. It does not
 * pick the nearest script, and it does not stay silent — both of those read as
 * a model that understood and chose, which is the impression this whole screen
 * exists not to give.
 */

export interface ScriptedExchange {
  id: string;
  /** Offered as a suggestion, and the exact text that selects this answer. */
  prompt: string;
  /** Lowercased fragments; any one of them selects this exchange. */
  match: string[];
  lines: string[];
  /** A closing caveat rendered apart from the answer body. */
  closing?: string;
  sources: { ref: string; label: string; href: string }[];
}

interface Turn {
  id: number;
  question: string;
  answer: ScriptedExchange | null;
}

export function ScriptedChat({
  exchanges,
  greeting,
  unmatched,
  placeholder,
  sendLabel,
  suggestionsLabel,
  sourcesLabel,
  youLabel,
  handoffKey,
}: {
  exchanges: ScriptedExchange[];
  greeting: string;
  unmatched: string;
  placeholder: string;
  sendLabel: string;
  suggestionsLabel: string;
  sourcesLabel: string;
  youLabel: string;
  /**
   * A sessionStorage key another screen may leave a question under — the
   * dashboard's معين prompt does. Read once on arrival, removed, and asked as
   * if typed here. Storage rather than a `?q=`: a fee earner's question names
   * clients and matters, and the codebase keeps those out of URLs, history and
   * access logs (see staff-search-action.ts).
   */
  handoffKey?: string;
}) {
  const [turns, setTurns] = React.useState<Turn[]>([]);
  const [draft, setDraft] = React.useState('');
  const nextId = React.useRef(0);

  /** First fragment match wins. No scoring, because there is no model. */
  const answerFor = (question: string): ScriptedExchange | null => {
    const needle = question.trim().toLowerCase();
    if (!needle) return null;
    return (
      exchanges.find((exchange) => exchange.match.some((m) => needle.includes(m))) ?? null
    );
  };

  /**
   * `chosen` is passed when the reader clicked a suggestion.
   *
   * A chip IS the exchange — it was rendered from it — so running the matcher
   * over its text would be asking a question this component already knows the
   * answer to, and getting it wrong in any language whose words are not in
   * `match`. That is not hypothetical: the Arabic chips fell through to "I do
   * not have anything on that" until this took the matcher out of the path.
   */
  const ask = (question: string, chosen?: ScriptedExchange) => {
    const trimmed = question.trim();
    if (!trimmed) return;
    nextId.current += 1;
    setTurns((prior) => [
      ...prior,
      { id: nextId.current, question: trimmed, answer: chosen ?? answerFor(trimmed) },
    ]);
    setDraft('');
  };

  // Strict mode runs effects twice in development; the ref keeps it to one ask.
  const handedOff = React.useRef(false);
  React.useEffect(() => {
    if (!handoffKey || handedOff.current) return;
    handedOff.current = true;
    let question: string | null = null;
    try {
      question = window.sessionStorage.getItem(handoffKey);
      window.sessionStorage.removeItem(handoffKey);
    } catch {
      // Storage blocked: the Digest simply opens without a question.
    }
    if (question) ask(question);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handoffKey]);

  return (
    <>
      <AIDemoNotice className="mb-4" />

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
        <p className="text-body text-gray-600">{greeting}</p>

        {turns.map((turn) => (
          <article key={turn.id} className="flex flex-col gap-3">
            {/* What was asked ----------------------------------------- */}
            <div className="flex flex-col items-end gap-1">
              <span className="text-caption text-gray-500">{youLabel}</span>
              <p className="max-w-[85%] rounded-card bg-gray-100 px-4 py-2 text-body text-gray-700">
                <bdi>{turn.question}</bdi>
              </p>
            </div>

            {/* What came back ----------------------------------------- */}
            <div className="max-w-[92%] rounded-card border border-legal-navy/20 bg-white p-4">
              {turn.answer ? (
                <>
                  {turn.answer.lines.map((line, index) => (
                    <p
                      key={index}
                      className={cn('text-body text-gray-700', index > 0 && 'mt-2')}
                    >
                      <bdi>{line}</bdi>
                    </p>
                  ))}

                  {turn.answer.closing ? (
                    <p className="mt-3 border-t border-gray-200 pt-3 text-caption text-gray-500">
                      <bdi>{turn.answer.closing}</bdi>
                    </p>
                  ) : null}

                  {/* Internal records only. Never a case citation. */}
                  <div className="mt-3 border-t border-gray-200 pt-3">
                    <p className="text-caption text-gray-500">{sourcesLabel}</p>
                    <ul className="mt-1.5 flex flex-wrap gap-1.5">
                      {turn.answer.sources.map((source) => (
                        <li key={`${source.ref}-${source.label}`}>
                          <Link href={source.href} className="hover:underline">
                            <Badge tone="neutral" icon={null}>
                              <span className="[unicode-bidi:isolate]">{source.ref}</span>
                              {' · '}
                              {source.label}
                            </Badge>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              ) : (
                // Not a guess, and not silence.
                <p className="text-body text-gray-600">
                  <bdi>{unmatched}</bdi>
                </p>
              )}
            </div>
          </article>
        ))}
      </div>

      {/* What it can actually answer, offered rather than hidden ------- */}
      <div className="mt-4 flex flex-col gap-2">
        <p className="text-caption text-gray-500">{suggestionsLabel}</p>
        <div className="flex flex-wrap gap-2">
          {exchanges.map((exchange) => (
            <button
              key={exchange.id}
              type="button"
              onClick={() => ask(exchange.prompt, exchange)}
              className={cn(
                'rounded-pill border border-gray-200 bg-gray-50 px-3 py-1.5',
                'text-start text-caption text-gray-700',
                'hover:border-gray-400 hover:bg-white focus:outline-none focus:border-legal-navy'
              )}
            >
              <bdi>{exchange.prompt}</bdi>
            </button>
          ))}
        </div>
      </div>

      {/*
        A real form with a real handler. design.md's standing rule against
        inert controls: this one does something — it runs the matcher and
        appends a turn — and `preventDefault` stops the full-page GET that an
        unhandled submit would otherwise send, which would put the question in
        the URL.
      */}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          ask(draft);
        }}
        className="mt-3 flex items-end gap-2"
      >
        <label className="flex-1">
          <span className="sr-only">{placeholder}</span>
          <input
            type="text"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={placeholder}
            className={cn(
              'h-10 w-full rounded-btn border border-gray-200 bg-gray-50 px-3',
              'text-body text-gray-700 placeholder:text-gray-500',
              'focus:border-gray-400 focus:bg-white focus:outline-none'
            )}
          />
        </label>
        <Button type="submit" variant="secondary" size="md" disabled={!draft.trim()}>
          <SendHorizonal aria-hidden size={15} className="rtl:rotate-180" />
          {sendLabel}
        </Button>
      </form>
    </>
  );
}

export default ScriptedChat;
