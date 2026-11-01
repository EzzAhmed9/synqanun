import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { formatCalendarDate, formatClockTime, tenantNow } from '@/lib/format';
import type { Locale } from '@/lib/i18n/routing';
import { mockApi, type AgendaEntry, type AssistantEngagementFacts } from '@/lib/mock-api';
import { StaffTopBar } from '../../../StaffChrome';
import type { ScriptedExchange } from '../ScriptedChat';
import { VoiceDigest } from '../VoiceDigest';
import { MUEEN_HANDOFF_KEY } from '../../mueen-handoff';

/**
 * The Digest — BUILD_PLAN.md §3, Batch 5.
 *
 * ===========================================================================
 * IT READS THE CALENDAR THE CALENDAR READS
 * ===========================================================================
 * `staff.agenda()` is what the Partner Dashboard's AgendaCard and the Calendar
 * screen already call: firm events the reader is an attendee of, plus court
 * dates read off the engagements' own timelines. The briefing counts THAT, and
 * there is no digest fixture anywhere in this repo — a second copy of today
 * would be free to disagree with the first, and the one people would notice is
 * the one that was wrong on the morning it mattered.
 *
 * Same for the review count: `staff.approvalQueue()` is the approvals screen's
 * own call, scoped to this reader by `assignedToId`, and `counts.pending` is
 * the same figure that screen's tab shows.
 *
 * ===========================================================================
 * "GOOD MORNING" IS NOT A CONSTANT
 * ===========================================================================
 * A briefing that says "Good morning" at nine in the evening is the smallest
 * possible lie and still a lie. The salutation is chosen from `tenantNow()` —
 * the firm's own wall clock in Africa/Cairo, the same helper the rest of the
 * product uses, so a Cairo firm is never told what hour it is in the reader's
 * browser. The Stitch exports stamp "09:42 GST" on this tenant throughout,
 * which is the Gulf: a different time zone from the firm being demonstrated.
 *
 * ===========================================================================
 * THREE BRANCHES, AND THE THIRD ONE ADMITS IT
 * ===========================================================================
 * Today's detail; the state of a matter; and everything else, which gets told
 * plainly that this demo has nothing on it and what it CAN answer. It does not
 * fall back to the nearest script and it does not stay silent — see
 * ScriptedChat's note on why those two are the same failure.
 *
 * The matter branch reuses `ai.matterStatus.*`, the Assistant's sentences,
 * moved up a level for this screen. The brief asked for "the same pattern as
 * the AI Assistant matter-status response"; the same words, resolved through
 * the same `assistantFacts()` call, is what that means in practice.
 *
 * ===========================================================================
 * WHAT THE EXPORT SHIPS THAT THIS DOES NOT
 * ===========================================================================
 * A voice. The export's Digest is an audio briefing — a pulsing red orb,
 * "Digest is speaking…", a waveform, and a "3m 40s" runtime on the dashboard
 * card. There is no voice model in Track A and none scheduled in A.5. The
 * screen now WEARS the voice agent's clothes (VoiceDigest: orb, waveform, a
 * word-by-word caption, mic and stop) but plays this same script, and says so
 * under its controls: no microphone is opened, nothing is heard and nothing is
 * spoken. The colour is not carried over: design.md §7 reserves syn-red for
 * the human's action, so the orb is legal-navy with the feather.
 */

export const dynamic = 'force-dynamic';

/** How many matters the briefing offers to speak to. */
const MATTER_BRANCHES = 2;

export default async function DigestPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const me = await mockApi.staff.currentStaff();

  const [agenda, queue, register] = await Promise.all([
    mockApi.staff.agenda(me.id),
    mockApi.staff.approvalQueue(me.id),
    mockApi.staff.matters(me.id),
  ]);

  /*
    The matters the briefing can speak to, and the order is the point: a file
    that is in court today comes before one that merely exists. Derived from
    the agenda rather than named here, so the briefing follows the day.
  */
  const references = [
    ...new Set([
      ...agenda
        .map((entry) => entry.engagementRef)
        .filter((reference): reference is string => Boolean(reference)),
      ...register.items.map((row) => row.reference),
    ]),
  ].slice(0, MATTER_BRANCHES);

  const facts = (
    await Promise.all(references.map((reference) => mockApi.staff.assistantFacts(reference)))
  ).filter((row): row is AssistantEngagementFacts => row !== null);

  return (
    <Digest
      locale={locale as Locale}
      agenda={agenda}
      pending={queue.counts.pending}
      // The first PENDING row, not the first row: the queue is unfiltered
      // here, so items[0] could be something already signed off.
      firstPending={queue.items.find((row) => row.state === 'pending')?.title ?? null}
      facts={facts}
      // The firm's hour, not the browser's. See the header.
      hour={Number(tenantNow().slice(0, 2))}
    />
  );
}

function Digest({
  locale,
  agenda,
  pending,
  firstPending,
  facts,
  hour,
}: {
  locale: Locale;
  agenda: AgendaEntry[];
  pending: number;
  firstPending: Record<Locale, string> | null;
  facts: AssistantEngagementFacts[];
  hour: number;
}) {
  const t = useTranslations('ai.digest');
  /*
    The matter-status sentences and the source labels live at ai.* rather than
    under either screen, because the Assistant answers the same question from
    the same records and has to say it in the same words.
  */
  const status = useTranslations('ai.matterStatus');
  const source = useTranslations('ai.sources');

  const partOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';

  const opening = t('opening', {
    salutation: t(`salutation.${partOfDay}`),
    events: agenda.length,
    review: pending,
  });

  const keywords = (key: string) =>
    t(`${key}.keywords`)
      .split('|')
      .map((word) => word.trim().toLowerCase())
      .filter(Boolean);

  const exchanges: ScriptedExchange[] = [];

  /* ---- 1. "Want the details?" ----------------------------------------- */
  const todayLines =
    agenda.length === 0
      ? [t('today.none')]
      : [
          t('today.heading', { count: agenda.length }),
          ...agenda.map((entry) =>
            /*
              A court date carries a calendar date and no hour — the timeline
              does not hold one, and this does not invent one to make the list
              look tidier. `agenda()` sets `at` to null for exactly that case.
            */
            entry.at
              ? t('today.entryTimed', {
                  time: formatClockTime(entry.at, locale),
                  title: entry.title[locale],
                  detail: entry.detail[locale],
                })
              : t('today.entryUntimed', {
                  title: entry.title[locale],
                  detail: entry.detail[locale],
                })
          ),
        ];

  exchanges.push({
    id: 'today',
    prompt: t('today.prompt'),
    match: keywords('today'),
    lines: [
      ...todayLines,
      pending === 0 || firstPending === null
        ? t('today.reviewNone')
        : t('today.review', { count: pending, first: firstPending[locale] }),
    ],
    // Both of these are screens in this product, and both are one click away.
    sources: [
      { ref: t('today.calendarRef'), label: source('calendar'), href: '/staff/calendar' },
      { ref: t('today.approvalsRef'), label: source('approvals'), href: '/staff/approvals' },
    ],
  });

  /* ---- 2. "Any updates on MAT-xxxx?" ---------------------------------- */
  for (const engagement of facts) {
    exchanges.push({
      id: `matter-${engagement.reference}`,
      prompt: t('matter.prompt', { ref: engagement.reference }),
      // A clicked chip bypasses this entirely — see ScriptedChat's note on the
      // Arabic chips that fell through to the fallback when it did not.
      match: [engagement.reference.toLowerCase(), ...keywords('matter')],
      lines: [
        status('line1', {
          ref: engagement.reference,
          title: engagement.title[locale],
          status: engagement.status[locale],
          client: engagement.clientName[locale],
        }),
        // No single Arabic verb agrees with an interpolated name, so the
        // missing-lead case gets its own sentence rather than a noun phrase
        // dropped into a slot shaped for a person. See ai.matterStatus.
        engagement.leadName
          ? status('line2', {
              lead: engagement.leadName[locale],
              phase: engagement.currentPhase[locale],
            })
          : status('line2NoLead', { phase: engagement.currentPhase[locale] }),
        engagement.nextDate
          ? status('line3', {
              title: engagement.nextDate.title[locale],
              date: formatCalendarDate(engagement.nextDate.on, locale, { month: 'long' }),
            })
          : status('noNext'),
        status('line4', {
          documents: engagement.documents,
          tasks: engagement.tasks,
          approvals: engagement.approvals,
        }),
      ],
      sources: [
        {
          ref: engagement.reference,
          label: source('engagement'),
          href: `/staff/matters/${engagement.reference}`,
        },
        {
          ref: engagement.clientName[locale],
          label: source('client'),
          href: `/staff/clients/${engagement.clientId}`,
        },
      ],
    });
  }

  return (
    <>
      <StaffTopBar title={t('title')} subtitle={t('subtitle')} />
      <main className="mx-auto flex w-full min-h-0 max-w-3xl flex-1 flex-col px-6 py-6">
        <VoiceDigest
          exchanges={exchanges}
          // The briefing IS the opening line — counted, not written.
          greeting={opening}
          unmatched={t('unmatched')}
          placeholder={t('placeholder')}
          sendLabel={t('send')}
          suggestionsLabel={t('suggestions')}
          sourcesLabel={t('sourcesLabel')}
          youLabel={t('you')}
          handoffKey={MUEEN_HANDOFF_KEY}
        />
      </main>
    </>
  );
}
