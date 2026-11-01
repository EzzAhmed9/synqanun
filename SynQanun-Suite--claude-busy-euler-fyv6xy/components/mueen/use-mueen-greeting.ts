'use client';

import * as React from 'react';
import { useLocale } from 'next-intl';
import type { Locale } from '@/lib/i18n/routing';
import { MUEEN_GREETING, recordedMueen, type MueenAvatarProvider, type MueenRecording } from '@/lib/mueen/avatar';
import { greetingTranscript } from '@/lib/mueen/greeting';

/**
 * ONE playback engine for the recorded greeting, shared by every surface that
 * shows the assistant's face.
 *
 * The floating panel, the Digest's voice view and the Assistant screen all
 * call this. They cannot drift: there is one provider deciding which file
 * plays (lib/mueen/avatar.ts), one transcript deciding what the caption says
 * (lib/mueen/greeting.ts), and one state machine here deciding when sound
 * comes out. Adding a fourth surface means calling this hook, not copying a
 * <video>.
 *
 * ===========================================================================
 * WHY THE DOM NODE IS SET DIRECTLY AND NOT ONLY THROUGH PROPS
 * ===========================================================================
 * `muted` and `volume` are set on the element inside `play()`, immediately
 * before the call, as well as being bound as React props. A prop is applied
 * on the next render, and `play()` happens in this tick — so a render that has
 * not landed yet would have left the element on whatever the last render said.
 * Setting both on the node is what guarantees the frame that starts playing is
 * the one that is audible.
 *
 * ===========================================================================
 * AND WHY play() IS CALLED IN THE HANDLER, WITH ITS PROMISE HANDLED
 * ===========================================================================
 * Audible playback needs the user gesture that asked for it, and a gesture
 * does not survive a render — so `play()` runs synchronously inside the click,
 * never from an effect scheduled after it. It still returns a promise that can
 * REJECT: a browser may refuse unmuted playback outright, and autoplay after a
 * navigation is exactly where that happens. A rejection is not swallowed; it
 * sets `blocked`, and the surface shows a visible control that asks for the
 * tap the browser wants. Silence with no explanation is the one outcome this
 * must never produce.
 */

export interface MueenGreeting {
  /** The clip, or null if the provider has none. */
  recording: MueenRecording | null;
  /** The caption for this reader, or null when no transcript was supplied. */
  caption: string | null;
  /** The tape is in a language this reader does not read. */
  foreignTape: boolean;
  /** The clip is playing right now. */
  speaking: boolean;
  /** It has been played at least once on this surface. */
  started: boolean;
  /** The browser refused to start it — ask for a tap. */
  blocked: boolean;
  muted: boolean;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  play: () => void;
  toggleMute: () => void;
  /** Stop and go quiet — for a panel closing, or another turn taking over. */
  stop: () => void;
  /** Bind to the <video>'s onEnded. */
  onEnded: () => void;
}

export interface UseMueenGreetingOptions {
  provider?: MueenAvatarProvider;
  /**
   * Start speaking as soon as the surface appears.
   *
   * Every way into the assistant greets you — that is the point of a greeting.
   * It is suppressed when the reader arrived carrying a QUESTION, because
   * answering is what they asked for and a greeting over the top of it is
   * noise. See the Digest's handoff.
   */
  autoPlay?: boolean;
}

export function useMueenGreeting({
  provider = recordedMueen,
  autoPlay = false,
}: UseMueenGreetingOptions = {}): MueenGreeting {
  const locale = useLocale() as Locale;
  const videoRef = React.useRef<HTMLVideoElement | null>(null);

  const [speaking, setSpeaking] = React.useState(false);
  const [started, setStarted] = React.useState(false);
  const [blocked, setBlocked] = React.useState(false);
  const [muted, setMuted] = React.useState(false);

  // Read inside play(), which must not re-create itself every time the mute
  // toggle moves — a changing `play` identity would re-fire the autoplay effect.
  const mutedRef = React.useRef(false);

  const recording = React.useMemo(() => provider.recording(MUEEN_GREETING), [provider]);
  const caption = greetingTranscript(locale);
  const foreignTape = recording !== null && recording.spoken !== locale;

  const play = React.useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    // On the NODE, now — see the header.
    video.muted = mutedRef.current;
    video.volume = 1;
    video.currentTime = 0;

    setStarted(true);
    setBlocked(false);
    setSpeaking(true);

    const starting = video.play();
    if (starting && typeof starting.then === 'function') {
      starting.catch(() => {
        // Refused. Say so and offer the tap, rather than leaving a still face
        // and no sound with nothing on screen to explain it.
        setSpeaking(false);
        setBlocked(true);
      });
    }
  }, []);

  const stop = React.useCallback(() => {
    const video = videoRef.current;
    if (video && !video.paused) video.pause();
    setSpeaking(false);
  }, []);

  const toggleMute = React.useCallback(() => {
    setMuted((current) => {
      const next = !current;
      mutedRef.current = next;
      if (videoRef.current) videoRef.current.muted = next;
      return next;
    });
  }, []);

  const onEnded = React.useCallback(() => setSpeaking(false), []);

  /*
    The greeting on arrival. There is no gesture of our own here, so this is
    the call most likely to be refused — which is precisely why the rejection
    path exists. In practice a reader reaches an assistant surface by clicking
    something, and that click leaves the document activated.
  */
  React.useEffect(() => {
    if (!autoPlay || !recording) return;
    play();
    // Once, on arrival — not again when the mute toggle moves.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPlay, recording]);

  return {
    recording,
    caption,
    foreignTape,
    speaking,
    started,
    blocked,
    muted,
    videoRef,
    play,
    toggleMute,
    stop,
    onEnded,
  };
}
