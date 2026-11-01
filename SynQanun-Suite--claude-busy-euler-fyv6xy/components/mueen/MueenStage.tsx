'use client';

import * as React from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { FeatherMark } from '@/components/brand/FeatherMark';
import type { MueenAvatarProvider, MueenRecording } from '@/lib/mueen/avatar';
import { cn } from '@/lib/utils';

/**
 * The assistant's face, in the three states it is allowed to be in.
 *
 *   idle      the filmed resting loop — silent, looping, playsInline
 *   speaking  the one filmed greeting, with sound
 *   abstract  no face at all: the concentric rings, the same ones the Digest
 *             draws, because there is no footage of this being said
 *
 * ===========================================================================
 * WHY `abstract` IS NOT A DEGRADED STATE
 * ===========================================================================
 * It is the honest one. A photoreal face is a claim that a person said these
 * words, and there is exactly one sentence anybody ever filmed; every other
 * reply in this product is assembled from the firm's own records. Reusing the
 * idle loop under a reply it was not filmed for — the obvious cheat, and the
 * one that would look best — would turn the avatar into a fabrication of a
 * line nobody spoke. So the rings appear instead, in legal-navy, the AI's
 * colour (design.md §2), and the panel says which mode it is in.
 *
 * `MueenAvatarProvider.recording()` returning null is what selects this, so
 * when a live avatar lands the rings simply stop appearing. See
 * lib/mueen/avatar.ts.
 *
 * ===========================================================================
 * REDUCED MOTION
 * ===========================================================================
 * `prefers-reduced-motion: reduce` replaces the resting loop with the still
 * circle and stops the rings pulsing — the <video> is not even mounted, so the
 * loop is not merely paused but never fetched. The greeting still plays when
 * PRESSED: that press is the consent, and somebody who asked for the greeting
 * asked for the greeting. What the setting removes is motion nobody asked for.
 *
 * Both videos carry `playsInline`, so iOS renders them in place instead of
 * throwing the panel into its fullscreen player, and `disablePictureInPicture`,
 * so a resting loop cannot be torn out into a floating window.
 */

export type MueenStageMode = 'idle' | 'speaking' | 'abstract';

export interface MueenStageProps {
  provider: MueenAvatarProvider;
  mode: MueenStageMode;
  /**
   * The clip `speaking` plays. Mounted — at zero bytes — as soon as the panel
   * opens, so `play()` can be called inside the click that asked for it. A
   * play() deferred to an effect has lost the gesture and is blocked.
   */
  recording: MueenRecording | null;
  /**
   * How fast the rings travel in `abstract` mode. The Digest's voice view has
   * two speeds for a reason — a slow pulse reads as waiting, a quick one as
   * talking — and the stage keeps that distinction rather than flattening it.
   * Defaults to `speaking`, which is what a reply is doing.
   */
  ringState?: 'listening' | 'speaking';
  /** Diameter in px. */
  size: number;
  muted: boolean;
  reduced: boolean;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  onEnded: () => void;
}

export function MueenStage({
  provider,
  mode,
  recording,
  ringState = 'speaking',
  size,
  muted,
  reduced,
  videoRef,
  onEnded,
}: MueenStageProps) {
  const t = useTranslations('mueen');
  const idleRef = React.useRef<HTMLVideoElement | null>(null);

  // Nothing decodes two faces at once. The loop holds still while the greeting
  // speaks, and picks up again when it is done.
  React.useEffect(() => {
    const loop = idleRef.current;
    if (!loop) return;
    if (mode === 'idle') void loop.play().catch(() => undefined);
    else loop.pause();
  }, [mode]);

  return (
    <div
      // One name for the whole stage: a screen reader hears which state the
      // assistant is in, and never the frames.
      role="img"
      aria-label={t(`stage.${mode}`)}
      data-mode={mode}
      className={cn(
        'relative shrink-0 overflow-hidden rounded-pill',
        mode === 'abstract' ? 'bg-transparent' : 'border border-legal-navy/15 bg-legal-navy/5'
      )}
      style={{ width: size, height: size }}
    >
      {mode === 'abstract' ? (
        <Rings size={size} state={ringState} />
      ) : (
        <>
          {/*
            The resting face: a still under reduced motion, and otherwise the
            loop over its own poster frame, so the circle is never a hole while
            the first frames arrive.
          */}
          {reduced || !provider.idle ? (
            <Image
              src={provider.face.large}
              alt=""
              width={provider.face.largeSize}
              height={provider.face.largeSize}
              /*
                UNOPTIMISED, and measured before deciding. These files were cut
                to the exact size and format they are shown at — circle-cropped
                webp, 512 and 128 — so there is nothing for the optimiser to
                improve: it re-encoded this one to a 25.1 KB JPEG against the
                25.7 KB original, and asked the server for 3840px of a 512px
                source to fill a 152px circle. Serving the file itself costs the
                bytes on disk and no transform.
              */
              unoptimized
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <video
              ref={idleRef}
              autoPlay
              loop
              muted
              playsInline
              disablePictureInPicture
              poster={provider.idle.poster}
              aria-hidden
              /*
                NOT hidden while the greeting speaks. It is paused, and it stays
                on screen UNDERNEATH as a frozen frame, which is what lets the
                greeting ship without a poster of its own: there is never a hole
                in the circle for one to cover. See the note on the clip below.
              */
              className="absolute inset-0 h-full w-full object-cover"
            >
              {provider.idle.sources.map((source) => (
                <source key={source.src} src={source.src} type={source.type} />
              ))}
            </video>
          )}

          {/*
            The greeting. `preload="none"` is what keeps it at zero bytes until
            somebody asks for it: it is mounted, not loaded.

            AND IT HAS NO POSTER, deliberately. A `poster` is fetched EVEN under
            `preload="none"` — measured, 19.3 KB on every panel open — and this
            one would never have been seen: the element is invisible until play
            is pressed, and by then it is showing real frames. The resting loop
            sits behind it and covers the gap. Do not add one back without
            re-measuring what it costs.
          */}
          {recording ? (
            <video
              ref={videoRef}
              preload="none"
              playsInline
              disablePictureInPicture
              muted={muted}
              onEnded={onEnded}
              aria-hidden
              className={cn(
                'absolute inset-0 h-full w-full object-cover',
                mode === 'speaking' ? 'visible' : 'invisible'
              )}
            >
              {recording.sources.map((source) => (
                <source key={source.src} src={source.src} type={source.type} />
              ))}
            </video>
          ) : null}
        </>
      )}
    </div>
  );
}

/**
 * The concentric rings, at panel size.
 *
 * Deliberately the same construction as the Digest's orb — three still rings,
 * three travelling ones, the feather at the centre, `syn-orb` /
 * `syn-orb-pulse` from globals.css — so the two surfaces are visibly the same
 * assistant. Flat navy at fixed opacities: no gradient, no blur, no glow
 * (design.md §7).
 *
 * `data-state` drives the pace from globals.css. "Listening" is the Digest's
 * word for the moment the reader's own question is appearing; no microphone is
 * opened anywhere in this product, and the screen that uses that state says so
 * under its controls.
 */
function Rings({ size, state }: { size: number; state: 'listening' | 'speaking' }) {
  return (
    <div aria-hidden data-state={state} className="syn-orb absolute inset-0">
      {[0, 0.45, 0.9].map((delay) => (
        <span
          key={delay}
          className="syn-orb-pulse absolute inset-0 rounded-pill border-2 border-legal-navy opacity-0"
          style={{ '--syn-delay': `${delay}s` } as React.CSSProperties}
        />
      ))}
      <span className="absolute inset-0 rounded-pill bg-legal-navy/10" />
      <span className="absolute inset-[11%] rounded-pill bg-legal-navy/20" />
      <span className="absolute inset-[22%] rounded-pill bg-legal-navy/40" />
      <span className="absolute inset-[31%] rounded-pill bg-legal-navy" />
      <span className="absolute inset-[38%] flex items-center justify-center rounded-pill bg-white">
        <FeatherMark height={Math.min(34, Math.max(16, Math.round(size * 0.16)))} />
      </span>
    </div>
  );
}

/**
 * The sound bars, under the stage, while the assistant answers without a face.
 *
 * Decoration — `aria-hidden`. The words are in the caption below it, which is
 * what a screen reader should read.
 */
export function MueenSoundBars({ count = 15 }: { count?: number }) {
  return (
    <div aria-hidden className="flex h-6 items-center justify-center gap-1">
      {Array.from({ length: count }, (_, index) => (
        <span
          key={index}
          className="syn-wave-bar block h-6 w-1 rounded-pill bg-legal-navy"
          style={{ '--syn-delay': `${((index * 7) % 9) * -0.1}s` } as React.CSSProperties}
        />
      ))}
    </div>
  );
}

export default MueenStage;
