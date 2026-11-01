import type { Locale } from '@/lib/i18n/routing';

/**
 * Where the assistant's FACE comes from — and the seam a live avatar replaces.
 *
 * ===========================================================================
 * WHY A PROVIDER AND NOT THREE FILE PATHS IN A COMPONENT
 * ===========================================================================
 * Today معين has one recording: a single greeting, filmed once, in Arabic.
 * That is the whole of it. A live avatar — a model that speaks whatever the
 * Digest answers — is the obvious next step, and when it arrives the panel's
 * markup, labels, captions, mute, replay, reduced-motion fallback and RTL
 * behaviour are all still right. Only the SOURCE of the pixels changes.
 *
 * So the components below ask this interface three questions and never name a
 * file:
 *
 *   · `face`      — the still circle, for the launcher and for reduced motion.
 *   · `idle`      — the resting loop, or null if the provider has no motion.
 *   · `recording` — the clip for one named utterance, or NULL.
 *
 * That last null is the load-bearing one. `recording()` returning null is not
 * an error: it is the provider saying "I have no footage of this being said",
 * and the stage then draws the abstract ring and sound bars instead. A live
 * provider would answer every utterance and the ring would stop appearing; a
 * provider with no video at all answers none, and the panel degrades to the
 * ring everywhere without a single conditional in the components.
 *
 * ===========================================================================
 * WHAT THIS DELIBERATELY DOES NOT HOLD
 * ===========================================================================
 * THE WORDS. A caption is text in the reader's language and belongs to the
 * dictionaries and to lib/mueen/greeting.ts, not to a media provider — a live
 * avatar reads text it is handed rather than shipping its own. What the
 * provider DOES declare is `spoken`: the language actually on the tape, which
 * is how the panel knows to tell an English reader that the voice they are
 * about to hear is Arabic. Deriving that from the filename would have been one
 * more place for the two to disagree.
 */

/**
 * One encoding of a clip. `type` is given so the browser picks ONE file and
 * downloads only that — `<source>` elements are tried in order and the first
 * supported one wins, so the pair costs the larger of the two, never the sum.
 */
export interface MueenVideoSource {
  src: string;
  type: 'video/mp4' | 'video/webm';
}

/** The resting face: a short silent loop, with a frame to show before it. */
export interface MueenIdleLoop {
  sources: readonly MueenVideoSource[];
  poster: string;
}

/**
 * A recording of the assistant saying one fixed thing.
 *
 * NO POSTER FIELD, unlike the idle loop. A `<video poster>` is fetched even
 * under `preload="none"` — 19.3 KB on every panel open, measured — and this
 * one would never be seen, because the element is invisible until play is
 * pressed and by then it is showing real frames. The stage keeps the resting
 * loop behind the clip instead. See components/mueen/MueenStage.tsx.
 */
export interface MueenRecording {
  sources: readonly MueenVideoSource[];
  /**
   * The language SPOKEN on the tape — not the reader's. When the two differ
   * the panel says so rather than letting Arabic audio arrive unannounced
   * under English copy.
   */
  spoken: Locale;
}

/** The still circle. Two sizes, because 512px for a 36px button is waste. */
export interface MueenFace {
  /** 128×128 — the floating launcher. */
  small: string;
  /** 512×512 — the panel's stage, and the reduced-motion still. */
  large: string;
  /** Intrinsic square edge of `large`, in px. */
  largeSize: number;
  /** Intrinsic square edge of `small`, in px. */
  smallSize: number;
}

/** Utterances the panel can ask for. Ids, not sentences. */
export const MUEEN_GREETING = 'greeting';

export interface MueenAvatarProvider {
  /** For the record, and for a future setting. Never shown to a reader. */
  readonly id: string;
  readonly face: MueenFace;
  /** null → this provider has no moving presence; the stage shows `face`. */
  readonly idle: MueenIdleLoop | null;
  /** The clip for this utterance, or null when none was ever filmed. */
  recording(utterance: string): MueenRecording | null;
}

const BASE = '/brand/meezan/muin';

/**
 * The provider the demo ships: one filmed greeting and one idle loop.
 *
 * ENCODING NOTES, because the numbers are the whole story — see
 * public/brand/meezan/muin/README.md for how they were produced. The sources
 * were 960×960 at 8.3 Mbps (greeting) and 3.3 Mbps (idle); both are 480×480
 * here, which is still 2x on the 240px stage, and that single change is where
 * ~98% of the saving came from.
 *
 * mp4 IS LISTED FIRST ON PURPOSE. h.264/AAC in mp4 plays in every browser that
 * plays video at all, and for the greeting it is also the smaller file
 * (127.7 KB against 133.9 KB of VP9). The webm is a genuine fallback that in
 * practice almost never downloads; it is kept because a browser that refuses
 * mp4 should still get a face rather than a poster.
 *
 * THE IDLE LOOP HAS NO AUDIO TRACK AT ALL. It is rendered muted and looping,
 * so its audio would be bytes nobody could ever hear — and a muted autoplaying
 * element that still carries audio is the thing browsers block.
 */
export const recordedMueen: MueenAvatarProvider = {
  id: 'meezan-recorded-2026-10',

  face: {
    small: `${BASE}/muin-avatar-128.webp`,
    large: `${BASE}/muin-avatar-512.webp`,
    smallSize: 128,
    largeSize: 512,
  },

  idle: {
    sources: [
      { src: `${BASE}/muin-idle.mp4`, type: 'video/mp4' },
      { src: `${BASE}/muin-idle.webm`, type: 'video/webm' },
    ],
    poster: `${BASE}/muin-idle-poster.webp`,
  },

  recording(utterance) {
    if (utterance !== MUEEN_GREETING) return null;
    return {
      sources: [
        { src: `${BASE}/muin-greeting-ar.mp4`, type: 'video/mp4' },
        { src: `${BASE}/muin-greeting-ar.webm`, type: 'video/webm' },
      ],
      // Filmed in Arabic. There is no English take.
      spoken: 'ar',
    };
  },
};
