'use client';

import * as React from 'react';
import { Mic, RotateCcw, Square } from 'lucide-react';
import { useTranslations } from 'next-intl';
import {
  MueenGreetingControls,
  MueenStage,
  useMueenGreeting,
  usePrefersReducedMotion,
} from '@/components/mueen';
import { Badge } from '@/components/ui';
import { recordedMueen } from '@/lib/mueen/avatar';
import { Link } from '@/lib/i18n/navigation';
import { cn } from '@/lib/utils';
import { AIDemoNotice } from './AIDemoNotice';
import { ScriptedChat, type ScriptedExchange } from './ScriptedChat';

/**
 * The Digest, dressed as a voice agent — DEMO-ONLY, and it says so.
 *
 * ===========================================================================
 * WHAT IS REAL AND WHAT IS NOT
 * ===========================================================================
 * EXACTLY ONE THING ON THIS SCREEN IS HEARD: معين's recorded greeting, filmed
 * once, in Arabic, by a real person. It plays on arrival and from its own
 * control, it is labelled "Demo: pre-recorded response", and it is the only
 * audio in this product.
 *
 * Nothing else is spoken and nothing is listened to. There is no microphone
 * access and no speech recognition: `getUserMedia` and the Web Speech API
 * appear nowhere. The mic button plays the NEXT SCRIPTED TURN — the same
 * exchanges, in the same words, that the text chat answers — and a label under
 * the controls says exactly that, in both languages.
 *
 * The face follows that split rather than papering over it. The stage shows
 * the filmed loop while nothing is happening and the filmed greeting while it
 * speaks, but EVERY SCRIPTED LINE GETS THE RINGS, because none of them was
 * ever filmed: running the loop under words nobody said is the one thing an
 * avatar must not do here. See components/mueen/MueenStage.tsx.
 *
 * What the reader sees around that is a pantomime of a conversation: the rings
 * "listen" while the question appears, then "speak" while the answer appears
 * word by word. Every sentence lands in the transcript as real text the moment
 * it is finished, and Stop writes out whatever was left, so stopping never
 * loses the answer.
 *
 * ===========================================================================
 * FOR KEYBOARDS AND SCREEN READERS
 * ===========================================================================
 *  · The conversation's state is announced through one polite live region, and
 *    the stage carries its own name for each of its three states.
 *  · The word-by-word caption is `aria-hidden`: announcing each word would be
 *    noise. Finished sentences enter the transcript, a polite live list, so a
 *    screen reader hears each sentence once, whole.
 *  · Both controls are real buttons with names; Stop is disabled when there is
 *    nothing to stop.
 *  · Reduced motion: the resting loop is not mounted at all, the rings stay
 *    still, the waveform holds still, and each sentence appears whole rather
 *    than word by word. The greeting still plays when asked for — that press,
 *    or that click through to this screen, is the consent.
 *
 * The text chat is one switch away and is the same conversation engine, so
 * nothing the voice view shows is unavailable as plain text. A question handed
 * over from the dashboard opens there, where it is asked.
 *
 * AN AI SURFACE (design.md §2): legal-navy and the feather, no red, no tenant
 * action colour, no glow and no gradient.
 */

type Phase = 'idle' | 'listening' | 'speaking';

interface Line {
  id: string;
  who: 'you' | 'assistant';
  text: string;
  /** Sources travel with the last line of an answer. */
  sources?: ScriptedExchange['sources'];
}

const WORD_MS = 130;
const SENTENCE_GAP_MS = 450;
const LISTEN_MS = 900;

/**
 * Diameter of the stage, in px.
 *
 * Flat across every width, where the old rings-only orb was 224 above 768px
 * and 176 below. The stage now carries a FACE as well as rings, and two sizes
 * meant two inline dimensions fighting a responsive class; 192 fits inside the
 * 375px screen's padding with room to spare and is still 2.5x the 480px source.
 */
const STAGE_PX = 192;

export interface VoiceDigestProps {
  exchanges: ScriptedExchange[];
  greeting: string;
  unmatched: string;
  placeholder: string;
  sendLabel: string;
  suggestionsLabel: string;
  sourcesLabel: string;
  youLabel: string;
  handoffKey: string;
}

export function VoiceDigest(props: VoiceDigestProps) {
  const t = useTranslations('ai.digest.voice');
  const tMueen = useTranslations('mueen');
  const { exchanges, greeting: opening, sourcesLabel, youLabel, handoffKey } = props;

  // A question handed over from the dashboard is TYPED, so it opens in the
  // text chat, which reads and asks it. Checked without consuming it.
  const [mode, setMode] = React.useState<'voice' | 'text'>('voice');
  /*
    Tri-state rather than a boolean, because "we have not looked yet" and "there
    is no question" must not be the same thing: the greeting keys off this, and
    starting it during the tick before the handoff is read would talk over
    somebody who came here to have a question answered.
  */
  const [handoff, setHandoff] = React.useState<'unknown' | 'waiting' | 'none'>('unknown');
  React.useEffect(() => {
    try {
      setHandoff(window.sessionStorage.getItem(handoffKey) ? 'waiting' : 'none');
    } catch {
      // Storage blocked: treat it as nobody asking anything.
      setHandoff('none');
    }
  }, [handoffKey]);
  React.useEffect(() => {
    if (handoff === 'waiting') setMode('text');
  }, [handoff]);

  /*
    THE FACE. Same hook, same provider and same transcript as the floating
    panel and the Assistant screen — see components/mueen/use-mueen-greeting.ts.
    It greets on arrival, because every way into معين greets you, EXCEPT when a
    question was handed over: then answering is what was asked for.
  */
  const greeting = useMueenGreeting({ autoPlay: handoff === 'none' && mode === 'voice' });

  const [phase, setPhase] = React.useState<Phase>('idle');
  const [next, setNext] = React.useState(0);
  const [transcript, setTranscript] = React.useState<Line[]>([
    { id: 'greeting', who: 'assistant', text: opening },
  ]);
  const [caption, setCaption] = React.useState<{ who: Line['who']; words: string[]; shown: number } | null>(
    null
  );

  const timers = React.useRef<number[]>([]);
  const pending = React.useRef<Line[]>([]);
  // The hook is the one reader of the query; the ref is how the word-reveal
  // timers, which run outside a render, see the same answer.
  const reducedMotion = usePrefersReducedMotion();
  const reduced = React.useRef(false);
  React.useEffect(() => {
    reduced.current = reducedMotion;
  }, [reducedMotion]);

  const clearTimers = () => {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
  };
  React.useEffect(() => clearTimers, []);

  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };

  /** Play the queued lines one by one: reveal words, then commit the line. */
  const playQueue = () => {
    const line = pending.current[0];
    if (!line) {
      setCaption(null);
      setPhase('idle');
      return;
    }
    setPhase(line.who === 'you' ? 'listening' : 'speaking');
    const words = line.text.split(/\s+/).filter(Boolean);

    const commit = () => {
      pending.current.shift();
      setTranscript((prior) => [...prior, line]);
      setCaption(null);
      later(playQueue, line.who === 'you' ? 200 : SENTENCE_GAP_MS);
    };

    if (reduced.current) {
      setCaption({ who: line.who, words, shown: words.length });
      later(commit, line.who === 'you' ? LISTEN_MS : 1200);
      return;
    }

    setCaption({ who: line.who, words, shown: 0 });
    words.forEach((_, index) => {
      later(() => setCaption({ who: line.who, words, shown: index + 1 }), (index + 1) * WORD_MS);
    });
    later(commit, words.length * WORD_MS + (line.who === 'you' ? LISTEN_MS : 300));
  };

  const playNext = () => {
    if (phase === 'listening' || phase === 'speaking') return;
    const exchange = exchanges[next];
    if (!exchange) return;
    clearTimers();
    const answer: Line[] = exchange.lines.map((text, index) => ({
      id: `${exchange.id}-${index}`,
      who: 'assistant',
      text,
      sources: index === exchange.lines.length - 1 ? exchange.sources : undefined,
    }));
    pending.current = [{ id: `${exchange.id}-q`, who: 'you', text: exchange.prompt }, ...answer];
    setNext(next + 1);
    playQueue();
  };

  /** Stop: write out everything that was left, as text, and go still. */
  const stop = () => {
    clearTimers();
    setTranscript((prior) => [...prior, ...pending.current]);
    pending.current = [];
    setCaption(null);
    setPhase('idle');
  };

  const restart = () => {
    clearTimers();
    pending.current = [];
    setCaption(null);
    setNext(0);
    setPhase('idle');
    setTranscript([{ id: 'greeting', who: 'assistant', text: opening }]);
  };

  // The end state: the last scripted turn has finished playing.
  const shownPhase = next >= exchanges.length && phase === 'idle' ? 'done' : phase;
  const busy = phase === 'listening' || phase === 'speaking';

  return (
    <>
      <div role="group" aria-label={t('modeLabel')} className="mb-5 flex gap-1 self-start rounded-pill border border-gray-200 bg-white p-1">
        {(['voice', 'text'] as const).map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={mode === value}
            onClick={() => {
              if (value === 'text') {
                stop();
                // The face is not on the text view, so neither is its voice.
                greeting.stop();
              }
              setMode(value);
            }}
            className={cn(
              'rounded-pill px-4 py-1.5 text-caption font-medium transition-colors',
              mode === value ? 'bg-legal-navy text-white' : 'text-gray-700 hover:bg-gray-100'
            )}
          >
            {value === 'voice' ? t('modeVoice') : t('modeText')}
          </button>
        ))}
      </div>

      {mode === 'text' ? (
        <ScriptedChat {...props} />
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          {/* The text chat carries this notice itself. */}
          <AIDemoNotice className="mb-6" />
          <section aria-label={t('assistant')} className="flex flex-col items-center text-center">
            {/*
              THE FACE, AND WHEN IT IS NOT THE FACE.

              The resting loop while nothing is happening; the filmed greeting
              while that is playing; and the rings — the same rings this screen
              has always drawn — for every scripted line, because none of them
              was ever filmed. Putting the loop under a line nobody spoke is the
              one thing the avatar must not do. See components/mueen/MueenStage.
            */}
            <MueenStage
              mode={greeting.speaking ? 'speaking' : phase === 'idle' ? 'idle' : 'abstract'}
              ringState={phase === 'listening' ? 'listening' : 'speaking'}
              provider={recordedMueen}
              recording={greeting.recording}
              size={STAGE_PX}
              muted={greeting.muted}
              reduced={reducedMotion}
              videoRef={greeting.videoRef}
              onEnded={greeting.onEnded}
            />

            <p className="mt-3 text-caption text-gray-700">{tMueen('isAI')}</p>

            {/* The greeting's own controls — the shared ones, so this screen
                and the floating panel cannot say different things about the
                same recording. */}
            <MueenGreetingControls greeting={greeting} className="mt-4 w-full max-w-md" />

            {/* The state, announced once per change. */}
            <p role="status" aria-live="polite" className="mt-5 text-body font-medium text-legal-navy">
              {t(`states.${shownPhase}`)}
            </p>

            {/* The waveform, only while "speaking". Decoration. */}
            <div aria-hidden className="mt-3 flex h-8 items-center gap-1">
              {phase === 'speaking'
                ? Array.from({ length: 21 }, (_, index) => (
                    <span
                      key={index}
                      className="syn-wave-bar block h-8 w-1 rounded-pill bg-legal-navy"
                      style={{ '--syn-delay': `${((index * 7) % 9) * -0.1}s` } as React.CSSProperties}
                    />
                  ))
                : null}
            </div>

            {/* The live caption: the current sentence, word by word. */}
            <div
              aria-hidden
              className="mt-3 flex min-h-[5.5rem] w-full max-w-xl flex-col items-center justify-start rounded-card border border-legal-navy/15 bg-white px-5 py-4"
            >
              {caption ? (
                <>
                  <span className="text-caption font-medium text-gray-600">
                    {caption.who === 'you' ? youLabel : t('assistant')}
                  </span>
                  <p className={cn('mt-1 text-title font-normal', caption.who === 'you' ? 'text-gray-700' : 'text-legal-navy')}>
                    <bdi>{caption.words.slice(0, caption.shown).join(' ')}</bdi>
                  </p>
                </>
              ) : (
                <span className="text-caption text-gray-600">{t('caption')}</span>
              )}
            </div>

            {/* Controls */}
            <div className="mt-5 flex items-center gap-3">
              {shownPhase === 'done' ? (
                <button
                  type="button"
                  onClick={restart}
                  className="flex h-14 items-center gap-2 rounded-pill border border-legal-navy/30 bg-white px-5 text-body font-medium text-legal-navy hover:bg-legal-navy/5"
                >
                  <RotateCcw aria-hidden size={18} />
                  {t('restart')}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={playNext}
                  disabled={busy}
                  aria-label={t('mic')}
                  title={t('mic')}
                  className="flex h-16 w-16 items-center justify-center rounded-pill bg-legal-navy text-white transition-colors hover:bg-legal-navy-pressed disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-600"
                >
                  <Mic aria-hidden size={24} />
                </button>
              )}
              <button
                type="button"
                onClick={stop}
                disabled={!busy}
                aria-label={t('stop')}
                title={t('stop')}
                className="flex h-12 w-12 items-center justify-center rounded-pill border border-legal-navy/30 bg-white text-legal-navy hover:bg-legal-navy/5 disabled:cursor-not-allowed disabled:border-gray-200 disabled:text-gray-500"
              >
                <Square aria-hidden size={16} />
              </button>
            </div>

            <p className="mt-4 max-w-md text-caption font-medium text-gray-700">{t('demo')}</p>
          </section>

          {/* The transcript: real text, every sentence, once finished. */}
          <section aria-labelledby="digest-transcript" className="mt-8 border-t border-gray-200 pt-5">
            <h2 id="digest-transcript" className="font-sans text-title text-gray-700">
              {t('transcript')}
            </h2>
            <ol aria-live="polite" className="mt-3 flex flex-col gap-3">
              {transcript.map((line) => (
                <li key={line.id} className={cn('flex flex-col gap-1', line.who === 'you' && 'items-end')}>
                  <span className="text-caption text-gray-600">
                    {line.who === 'you' ? youLabel : t('assistant')}
                  </span>
                  <p
                    className={cn(
                      'max-w-[92%] rounded-card px-4 py-2 text-body',
                      line.who === 'you'
                        ? 'bg-gray-100 text-gray-700'
                        : 'border border-legal-navy/15 bg-white text-gray-700'
                    )}
                  >
                    <bdi>{line.text}</bdi>
                  </p>
                  {line.sources ? (
                    <div className="max-w-[92%]">
                      <p className="text-caption text-gray-600">{sourcesLabel}</p>
                      <ul className="mt-1 flex flex-wrap gap-1.5">
                        {line.sources.map((source) => (
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
                  ) : null}
                </li>
              ))}
            </ol>
          </section>
        </div>
      )}
    </>
  );
}


export default VoiceDigest;
