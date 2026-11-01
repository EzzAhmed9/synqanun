import type { Locale } from '@/lib/i18n/routing';

/**
 * What معين actually says in the one recording this demo has.
 *
 * ===========================================================================
 * ⚠ NOT SUPPLIED YET. BOTH STRINGS ARE EMPTY ON PURPOSE.
 * ===========================================================================
 * `muin-greeting-ar.mp4` is a recording of a real person's voice. The Arabic
 * line below is the verbatim transcript of it, and NOBODY MAY WRITE IT FROM
 * MEMORY, FROM THE CONTEXT, OR FROM A GUESS. A caption is a claim about what
 * was said; inventing one under a photoreal speaking face is exactly the
 * failure this codebase refuses everywhere else — the invented hearing dates,
 * the invented confidence scores, the invented filing-efficiency rate.
 *
 * `en` is a TRANSLATION of `ar`, so it is blocked on the same line. It is not
 * a second greeting, and it is not a transcript of anything: no English take
 * was ever filmed. See `MueenRecording.spoken`, which is what makes the panel
 * tell an English reader that the voice is Arabic.
 *
 * ===========================================================================
 * WHAT HAPPENS WHILE THEY ARE EMPTY
 * ===========================================================================
 * The clip PLAYS, and the caption slot says no transcript has been supplied.
 *
 * It did not, at first: the control was disabled, on the reasoning that audio
 * with no text alternative fails WCAG 1.2.2. That is still true, and it is a
 * KNOWN GAP recorded here and in public/brand/meezan/muin/README.md rather
 * than a thing nobody noticed. But a greeting that refuses to greet is a
 * broken demo rather than a careful one, and the honest alternative to words
 * nobody said is not silence — it is saying, on screen, that the words have
 * not been written down yet.
 *
 * What stays refused is the part that was never about accessibility: NOBODY
 * WRITES THIS LINE FROM MEMORY, FROM THE CONTEXT, OR FROM A GUESS. An invented
 * caption under a photoreal face would be a claim about what a real person
 * said.
 *
 * TO CLOSE THE GAP: paste the recorded line into `ar`, its English translation
 * into `en`, and nothing else anywhere. Every surface picks it up.
 */
export const GREETING_TRANSCRIPT: Readonly<Record<Locale, string>> = {
  ar: '',
  en: '',
};

/**
 * The caption for this reader, or null when there is none.
 *
 * Null is what puts the "no transcript yet" sentence in the caption's place —
 * see the header. Trimmed, because a line of whitespace pasted in by accident
 * is the same as no line at all and must not read as a caption.
 */
export function greetingTranscript(locale: Locale): string | null {
  const line = GREETING_TRANSCRIPT[locale]?.trim();
  return line ? line : null;
}
