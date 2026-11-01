'use client';

import * as React from 'react';
import { Play, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { MueenAvatarProvider } from '@/lib/mueen/avatar';
import { recordedMueen } from '@/lib/mueen/avatar';
import { cn } from '@/lib/utils';
import { MueenStage } from './MueenStage';
import { usePrefersReducedMotion } from './use-reduced-motion';
import { useMueenGreeting, type MueenGreeting as MueenGreetingState } from './use-mueen-greeting';

/**
 * The greeting's controls and caption — the one copy of them in the product.
 *
 * Rendered by the floating panel, by the Digest's voice view and by the
 * Assistant screen, all driven by `useMueenGreeting`. The labels the client
 * asked for live here and nowhere else: "Mueen is an AI assistant" sits on the
 * identity line, and "Demo: pre-recorded response" sits under the caption, so
 * a new surface cannot acquire the face without acquiring both.
 *
 * ===========================================================================
 * WHAT IT SAYS WHEN SOMETHING IS MISSING
 * ===========================================================================
 *  · NO TRANSCRIPT. The clip still plays — a demo whose greeting is silent is
 *    not a safer demo, it is a broken one — and the caption slot carries a
 *    sentence saying no transcript has been supplied, rather than words nobody
 *    said. This is a knowing gap against WCAG 1.2.2, open until
 *    lib/mueen/greeting.ts is filled in, and it is stated on screen rather
 *    than left for somebody to notice.
 *  · NO TAKE IN THIS LANGUAGE. An English reader is told the voice will be
 *    Arabic before they press, from `recording.spoken` — so an English
 *    recording made later silences the notice by existing.
 *  · THE BROWSER REFUSED. `blocked` replaces the play control with one that
 *    asks for the tap the browser is waiting for, and says why.
 */

/* ---------------------------------------------------------------------------
 * Shared styling. Live controls on an AI surface need a 3:1 boundary and the
 * panel's body is white, so the border carries it — measured at 5.7:1.
 * ------------------------------------------------------------------------ */
export const MUEEN_SECONDARY =
  'border border-legal-navy/60 bg-legal-navy/5 text-legal-navy hover:bg-legal-navy/10';
export const MUEEN_ANSWER_BOX = 'rounded-card border border-legal-navy/20 bg-legal-navy/5 p-3';

export function MueenGreetingControls({
  greeting,
  className,
}: {
  greeting: MueenGreetingState;
  className?: string;
}) {
  const t = useTranslations('mueen');
  const { recording, caption, foreignTape, started, blocked, muted, play, toggleMute } = greeting;

  if (!recording) return null;

  return (
    <div className={className}>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={play}
          className={cn(
            'inline-flex h-10 items-center gap-2 rounded-pill px-4 text-caption font-medium',
            'bg-legal-navy text-white hover:bg-legal-navy-pressed'
          )}
        >
          <Play aria-hidden size={15} />
          {blocked ? t('greeting.tapForSound') : t('greeting.play')}
        </button>

        {/* Mute and replay appear once there is something to mute or replay,
            and stay after the clip ends. */}
        {started && !blocked ? (
          <>
            <button
              type="button"
              onClick={toggleMute}
              aria-pressed={muted}
              aria-label={muted ? t('greeting.unmute') : t('greeting.mute')}
              title={muted ? t('greeting.unmute') : t('greeting.mute')}
              className={cn(
                'inline-flex h-10 w-10 items-center justify-center rounded-pill',
                MUEEN_SECONDARY
              )}
            >
              {muted ? <VolumeX aria-hidden size={15} /> : <Volume2 aria-hidden size={15} />}
            </button>
            <button
              type="button"
              onClick={play}
              aria-label={t('greeting.replay')}
              title={t('greeting.replay')}
              className={cn(
                'inline-flex h-10 w-10 items-center justify-center rounded-pill',
                MUEEN_SECONDARY
              )}
            >
              <RotateCcw aria-hidden size={15} />
            </button>
          </>
        ) : null}
      </div>

      {/* Why the sound did not start, or what language it is in. Both are said
          before the press, not after it. */}
      {blocked ? (
        <p role="status" className="mt-2 text-caption font-medium text-gray-700">
          {t('greeting.blocked')}
        </p>
      ) : foreignTape ? (
        <p className="mt-2 text-caption text-gray-700">{t('greeting.foreignTape')}</p>
      ) : null}

      {/*
        The live region is MOUNTED EMPTY and filled later: a region that appears
        already populated is routinely missed, because there was no change for a
        screen reader to notice.
      */}
      <div aria-live="polite">
        {started ? (
          <div className={cn('mt-3', MUEEN_ANSWER_BOX)}>
            {caption ? (
              <>
                <p className="text-caption font-medium text-gray-700">
                  {t('greeting.captionLabel')}
                </p>
                <p className="mt-1 text-body text-gray-700">
                  {/*
                    A script the surrounding copy may not share: an Arabic line
                    under English chrome must not drag the paragraph's direction
                    or its punctuation. <bdi>, not dir="ltr" — lib/format.ts.
                  */}
                  <bdi>{caption}</bdi>
                </p>
              </>
            ) : (
              <p className="text-caption text-gray-700">{t('greeting.noTranscript')}</p>
            )}
            <p className="mt-2 text-caption font-medium text-gray-700">
              {t('greeting.prerecorded')}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

/**
 * The whole avatar view: face, identity, controls.
 *
 * Used by the screens that have room for it — the Digest's voice view and the
 * Assistant. The floating panel composes the same two pieces inside its own
 * frame, because it also carries a close button and a dismiss gesture.
 */
export function MueenAvatarHeader({
  greeting,
  provider = recordedMueen,
  size = 152,
  ringState,
  className,
}: {
  greeting: MueenGreetingState;
  provider?: MueenAvatarProvider;
  size?: number;
  /** Pass through while the surface is speaking a line that has no clip. */
  ringState?: 'listening' | 'speaking';
  className?: string;
}) {
  const t = useTranslations('mueen');
  const reduced = usePrefersReducedMotion();

  const mode = greeting.speaking ? 'speaking' : ringState ? 'abstract' : 'idle';

  return (
    <div className={cn('flex flex-col items-center gap-3 text-center', className)}>
      <MueenStage
        provider={provider}
        mode={mode}
        ringState={ringState}
        recording={greeting.recording}
        size={size}
        muted={greeting.muted}
        reduced={reduced}
        videoRef={greeting.videoRef}
        onEnded={greeting.onEnded}
      />

      <div className="flex flex-col items-center gap-0.5">
        <p className="font-sans text-title text-legal-navy">{t('name')}</p>
        {/* The label, in words, wherever the face appears. */}
        <p className="text-caption text-gray-700">{t('isAI')}</p>
      </div>

      <MueenGreetingControls greeting={greeting} className="w-full max-w-md" />
    </div>
  );
}

/**
 * The avatar view, wired to its own playback — a drop-in for a server page.
 *
 * The Assistant screen is rendered on the server and has no hook to call, so
 * this is the client boundary: it owns `useMueenGreeting` and greets on
 * arrival. The Digest's voice view does NOT use it, because that screen already
 * holds state the face has to follow — whether a scripted line is being
 * "spoken", and whether a question was handed over — and so drives the stage
 * itself from the same hook.
 */
export function MueenGreetingSurface({
  provider = recordedMueen,
  size = 152,
  className,
}: {
  provider?: MueenAvatarProvider;
  size?: number;
  className?: string;
}) {
  const greeting = useMueenGreeting({ provider, autoPlay: true });
  return (
    <MueenAvatarHeader
      greeting={greeting}
      provider={provider}
      size={size}
      className={className}
    />
  );
}

export default MueenGreetingControls;
