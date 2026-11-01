import { ArrowLeft, Info, MessageSquareOff } from 'lucide-react';
import { notFound } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { Badge, Card } from '@/components/ui';
import { formatCalendarDate, formatClockTime } from '@/lib/format';
import { Link } from '@/lib/i18n/navigation';
import type { Locale } from '@/lib/i18n/routing';
import { mockApi, type MeetingTranscriptRecord } from '@/lib/mock-api';
import { cn } from '@/lib/utils';
import { StaffTopBar } from '../../../../StaffChrome';

/**
 * Meeting transcript reader — BUILD_PLAN.md §3, Batch 7.
 *
 * ===========================================================================
 * THE ONE SCREEN IN THE PRODUCT THAT SHOWS CONTENT NOBODY SAID
 * ===========================================================================
 * Every other screen that could have invented readable content was stopped from
 * doing it: the law reader renders Lorem Ipsum, the document preview has no
 * body, the canvas marks up a placeholder. BUILD_PLAN.md §5 makes one exception
 * — "Meeting transcripts/minutes: static realistic sample content tied to the
 * demo's fixture meetings" — and this is the screen it was written for.
 *
 * So the content is here, and the label is the price of it. It is STICKY: it
 * stays under the top bar for the whole scroll, because a disclaimer at the top
 * of a document is read once and then scrolled away from, and the thing it
 * disclaims is dialogue attributed by name to lawyers at this firm in a
 * privileged internal meeting. Somebody arriving at the middle of this page by
 * link, or coming back to it, should not have to scroll up to find out that
 * nobody said any of it.
 *
 * It follows the LAW READER's notice rather than <AIDemoNotice>, and that is a
 * deliberate choice between two precedents. The AI notice is navy with the
 * feather, because design.md §2 gives navy to the product's own voice and AI
 * output is the product speaking. A sample transcript is not the product
 * speaking; it is placeholder content, the same species as the legal database's
 * Lorem Ipsum, and it takes the same gray treatment that screen uses. Putting it
 * in navy would file it under "the product's analysis", which is the one thing
 * it must not be mistaken for.
 *
 * ===========================================================================
 * WHO MAY READ IT, AND WHY A REFUSAL IS A 404
 * ===========================================================================
 * `staff.meetingTranscript` returns null unless the signed-in person was in the
 * room, and this renders the translated 404 for that exactly as it does for an
 * event id that names nothing. No "you do not have access" screen: minutes of an
 * internal meeting are among the most sensitive records here, and a page that
 * says "you were not in this one" has confirmed to somebody trying event ids
 * that a meeting they were excluded from took place.
 *
 * Both halves of that are reachable in the demo. `evt-08` has the signed-in
 * partner in it and opens; `evt-05` does not and 404s, from a URL nothing on
 * screen offers — see fixtures/transcripts.ts on why the fixture holds one of
 * each.
 *
 * ===========================================================================
 * WHAT THE STITCH EXPORT PUT ON THIS SCREEN
 * ===========================================================================
 * It is the AI Meeting Companion the calendar refused in Batch 4, built out into
 * a whole page, and it asserts a recording that does not exist in six separate
 * ways:
 *
 *   · AN AUDIO PLAYER WITH A WAVEFORM, a playhead, a scrubber, playback speed
 *     and a 48-minute duration. There is no audio. A play button over silence is
 *     the most direct claim on the page and the easiest to click.
 *
 *   · "99.4% speech recognition accuracy" and "دقة التعرّف على الكلام" — the
 *     confidence score for the eighth export running, now measuring the fidelity
 *     of a transcription that never happened against an original that does not
 *     exist. <AIDemoNotice> has thirty lines on why that number can never appear
 *     in this product.
 *
 *   · "Biometric voice-signature authentication — speakers verified" with a
 *     per-speaker verified tick. That is a claim that a named lawyer's identity
 *     was cryptographically established from their voice, on a page where the
 *     speakers are a fixture array.
 *
 *   · "Integrity: sha256-7b21f0c4…" and an "immutable audit stamp" under the
 *     transcript. Nothing is hashed and nothing is immutable; the Approvals and
 *     e-signature exports were refused for the same theatre.
 *
 *   · AI-GENERATED MINUTES, DECISIONS AND ACTION ITEMS — a numbered summary, a
 *     decisions list, and five action items each with an assignee and a due date.
 *     Two of the assignees are not on this firm's roster. An action item with an
 *     assignee is an assignment write, and there is no assignment write in this
 *     product; the calendar's header made that refusal in Batch 4 and the bulk
 *     reassignment in Batch 7 is still careful to say that nobody is told
 *     anything.
 *
 *   · "Export to matter DMS", with a `setTimeout` and a green success toast
 *     reading "Minutes filed to MAT-2204". There is no DMS, MAT-2204 is not on
 *     this firm's register, and a fake success state is the specific thing this
 *     project does not build.
 *
 * And the content itself, which is worse than the chrome around it. Speakers are
 * given lines citing UAE Civil Code Articles 390 and 559, DIFC Law No. 5 of 2018
 * and DIAC Rules 2022 Article 14, plus an escrow account "held at HSBC Dubai".
 * Invented statutory text was the law reader's worst finding; putting it in a
 * named partner's mouth removes even the Lorem Ipsum that disqualified it on
 * sight. See fixtures/transcripts.ts for the rule the dialogue here follows
 * instead — administrative only, no instrument, no conclusion, no figure.
 *
 * Also, for the record: generated speaker portraits carrying their own `data-alt`
 * prompts, per-speaker talk-time percentages, `{{CLIENT_LOGO}}` rendered
 * literally for the third export running, and — the same fault as the statute —
 * an English transcript and an Arabic transcript of the same meeting containing
 * substantively different conversations.
 */

export const dynamic = 'force-dynamic';

export default async function MeetingTranscriptPage({
  params,
}: {
  params: Promise<{ locale: string; event: string }>;
}) {
  const { locale, event } = await params;
  setRequestLocale(locale);

  const record = await mockApi.staff.meetingTranscript(decodeURIComponent(event));
  // Null covers four different things — no such event, no minutes, not over yet,
  // and not yours. All four answer the same way; see the header.
  if (!record) notFound();

  return <Reader locale={locale as Locale} record={record} />;
}

function Reader({ locale, record }: { locale: Locale; record: MeetingTranscriptRecord }) {
  const t = useTranslations('meetingTranscript');
  const tCal = useTranslations('calendar');
  const tRank = useTranslations('ranks');

  return (
    <>
      <StaffTopBar title={record.title[locale]} subtitle={t('subtitle')} />

      {/*
        The notice is OUTSIDE <main>'s padding and pinned under the top bar,
        which is itself `sticky top-0 z-10` (see StaffChrome). `--syn-topbar-height`
        is the offset rather than a literal 64px so the two cannot drift apart,
        and z-9 keeps it under the bar it hangs from rather than over it.
      */}
      <div className="sticky top-[var(--syn-topbar-height)] z-[9] border-b border-gray-300 bg-gray-100 px-6 py-3 shadow-sm">
        <div className="mx-auto flex w-full max-w-content items-start gap-3">
          <Info aria-hidden size={16} className="mt-0.5 shrink-0 text-gray-500" />
          <div className="min-w-0">
            <p className="text-caption font-medium text-gray-700">{t('notice.heading')}</p>
            <p className="mt-1 text-caption text-gray-600">{t('notice.body')}</p>
          </div>
        </div>
      </div>

      <main className="mx-auto flex w-full max-w-content flex-1 flex-col gap-5 px-6 py-6">
        {/*
          Back to the exact panel this was opened from — the day, and the entry
          selected inside it. The calendar keeps all three in the URL, which is
          what makes a return trip possible at all.
        */}
        <Link
          href={{
            pathname: '/staff/calendar',
            query: { view: 'day', date: record.on, event: record.eventId },
          }}
          className="inline-flex w-fit items-center gap-1.5 text-caption text-legal-navy hover:underline"
        >
          {/* A direction, so it mirrors. design.md §12. */}
          <ArrowLeft aria-hidden size={14} className="rtl:rotate-180" />
          {t('back')}
        </Link>

        {/* The meeting, read from demoFirmEvents rather than restated ------- */}
        <Card padding="lg">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="neutral" icon={null}>
              {tCal(`kinds.${record.kind}`)}
            </Badge>
            <span className="text-caption text-gray-500 [unicode-bidi:isolate]">
              {formatCalendarDate(record.on, locale, { month: 'long' })}
              {' · '}
              {formatClockTime(record.at, locale)}
            </span>
            <span className="text-caption text-gray-500">
              {t('meeting.length', { count: record.minutes })}
            </span>
          </div>

          <h2 className="mt-2 font-sans text-title text-gray-900">
            <bdi>{record.title[locale]}</bdi>
          </h2>

          <dl className="mt-3 grid grid-cols-1 gap-3 border-t border-gray-200 pt-3 tablet:grid-cols-2">
            <div>
              <dt className="text-caption text-gray-500">{t('meeting.where')}</dt>
              <dd className="mt-0.5 text-body text-gray-700">
                <bdi>{record.location[locale]}</bdi>
              </dd>
            </div>
            <div>
              {/* Not `turns.heading` — that is the section below, and using it
                  here put "What was said" on the screen twice. */}
              <dt className="text-caption text-gray-500">{t('meeting.contents')}</dt>
              {/* Both numbers counted off the turns, neither stated. */}
              <dd className="mt-0.5 text-body text-gray-700">
                {t('meeting.counts', {
                  turns: record.turns.length,
                  speakers: record.speakerCount,
                })}
              </dd>
            </div>
          </dl>
        </Card>

        {/* Who was in the room -------------------------------------------- */}
        <Card padding="lg">
          <h2 className="font-sans text-heading text-gray-700">{t('attendees.heading')}</h2>
          <p className="mt-1 text-caption text-gray-500">{t('attendees.note')}</p>

          <ul className="mt-4 flex flex-col gap-2">
            {record.attendees.map((person) => (
              <li
                key={person.id}
                className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-2 last:border-0 last:pb-0"
              >
                <span className="min-w-0 text-body text-gray-700">
                  <bdi>{person.name[locale]}</bdi>
                  {person.isYou ? (
                    <span className="ms-2 text-caption text-gray-500">({t('attendees.you')})</span>
                  ) : null}
                  {/*
                    `holder.` and not the bare rank, which is the variant every
                    other screen uses when a rank sits beside a PERSON. The bare
                    Arabic labels are person-nouns and agree with a masculine
                    holder — "محامٍ أول" — and three of the four people in this
                    room are women. The holder forms are nominal ("درجة: محامٍ
                    أول", literally "rank: senior associate") and agree with
                    nobody. This screen was written with the bare key first and
                    the Arabic read caught it.

                    A caption either way, never interpolated into a sentence: a
                    rank label dropped into prose reads as a capitalised noun
                    mid-sentence in English and has to agree with a grammatical
                    frame it does not know in Arabic.
                  */}
                  <span className="ms-2 text-caption text-gray-500">
                    {tRank(`holder.${person.rank}`)}
                  </span>
                </span>

                {/*
                  Derived by asking whether this person has a turn. The silent
                  attendee is the reason the two lists are not collapsed into one
                  — see MeetingTranscriptRecord.

                  A badge for one state and plain text for the other, rather than
                  two badges: Badge has no low-emphasis tone, and two `neutral`
                  ones would put the same weight on "is in the minutes" and "is
                  not". Both states are still spelled out in words — the badge
                  carries no meaning on its own.
                */}
                {person.spoke ? (
                  <Badge tone="neutral" icon={null}>
                    {t('attendees.spoke')}
                  </Badge>
                ) : (
                  <span className="text-caption text-gray-500">{t('attendees.silent')}</span>
                )}
              </li>
            ))}
          </ul>
        </Card>

        {/* The minutes ---------------------------------------------------- */}
        <Card padding="lg">
          <h2 className="font-sans text-heading text-gray-700">{t('turns.heading')}</h2>
          <p className="mt-1 text-caption text-gray-500">
            {t('notice.extract', { minutes: record.minutes })}
          </p>

          <ol className="mt-5 flex flex-col gap-4">
            {record.turns.map((turn) => (
              <li
                key={`${turn.speakerId}-${turn.atSeconds}`}
                className={cn(
                  'flex items-start gap-4',
                  // Consecutive turns by the same person sit closer together, so
                  // a reader can see it is one person still talking without the
                  // name being repeated at them.
                  turn.continues && '-mt-2'
                )}
              >
                {/*
                  An ELAPSED offset, not a time of day — see formatElapsed in
                  lib/format.ts on why it does not go through the clock
                  formatter. `dir="ltr"` because it is a single digit-colon token
                  and would otherwise break apart in a right-to-left line.
                */}
                <span
                  dir="ltr"
                  className="mt-0.5 w-14 shrink-0 text-end font-mono text-reference text-gray-500"
                >
                  {turn.elapsed}
                </span>

                <div className="min-w-0 flex-1">
                  {turn.continues ? null : (
                    <p className="text-caption font-medium text-gray-700">
                      <bdi>{turn.speakerName[locale]}</bdi>
                      <span className="ms-2 font-normal text-gray-500">
                        {tRank(`holder.${turn.speakerRank}`)}
                      </span>
                    </p>
                  )}
                  <p className="mt-1 text-body text-gray-700">{turn.text[locale]}</p>
                </div>
              </li>
            ))}
          </ol>

          <p className="mt-5 border-t border-gray-200 pt-4 text-caption text-gray-500">
            {t('turns.extractEnds', {
              at: record.turns[record.turns.length - 1].elapsed,
            })}
          </p>
        </Card>

        {/*
          The rest of the refusals, at the end rather than in the sticky banner.
          The banner carries the one claim a reader must not miss — that nobody
          said this. These three are what the export's buttons offered and this
          screen does not have, and they belong where somebody who has finished
          reading would go looking for them.
        */}
        <Card padding="lg">
          <h2 className="flex items-center gap-2 font-sans text-heading text-gray-700">
            <MessageSquareOff aria-hidden size={16} className="shrink-0 text-gray-500" />
            {t('footer.heading')}
          </h2>
          <div className="mt-3 flex flex-col gap-2 text-caption text-gray-600">
            <p>{t('notice.noRecording')}</p>
            <p>{t('footer.noSummary')}</p>
            <p>{t('footer.noAssignment')}</p>
            <p>{t('footer.noExport')}</p>
          </div>
        </Card>
      </main>
    </>
  );
}
