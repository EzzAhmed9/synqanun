'use client';

import * as React from 'react';
import { CalendarPlus, UserRound } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { Button, Field, Modal, Select, Textarea } from '@/components/ui';
import {
  formatCalendarDate,
  formatClockTime,
  formatDayOfMonth,
  formatWeekday,
  tenantZoneOffset,
} from '@/lib/format';
import type { Locale } from '@/lib/i18n/routing';
import type { ConsultationAvailability } from '@/lib/mock-api';
import { cn } from '@/lib/utils';
import { usePortalEngagements } from './ClientPortalChrome';

/**
 * "Book a call" — the last of the three dashboard quick actions to get a
 * destination.
 *
 * ===========================================================================
 * THE BOOKING DECISION: CLEAR NO-OP
 * ===========================================================================
 * The fifth time this question has been asked, and the easiest of the five to
 * answer. WHAT DOES THE STATE ASSERT?
 *
 *   · An echoed message asserts the interface received your words. True, so
 *     Messages shows it (labelled "Not sent").
 *   · A payment receipt asserts money moved. False, so Invoices does not.
 *   · A saved setting asserts the system will remember. False, so Settings does
 *     not.
 *   · A new documents row asserts the firm has your file. False, so Upload does
 *     not.
 *   · A CONFIRMED BOOKING ASSERTS THAT A NAMED LAWYER WILL BE ON A CALL WITH
 *     YOU AT 14:00 ON THURSDAY.
 *
 * That is not a claim about this interface. It is a claim about a third party's
 * diary, and about a promise someone else has supposedly made. Every earlier
 * false state in this list at least concerned the client's own data; this one
 * would commit a person who has never heard of it.
 *
 * And it fails worse than the others. An unsent message is visibly unsent. An
 * unuploaded file is still on your device, and the modal says where. But a
 * client who believes a consultation is booked does the one thing that makes it
 * unrecoverable: nothing. They stop chasing, they hold the afternoon, and at
 * 14:00 nobody dials in. There is no later screen that would contradict them.
 *
 * So "Confirm booking" books nothing, and says so where the button is.
 *
 * What IS real: the working week, the firm's consultation hours, which slots are
 * already committed, the 45-minute duration, and the fee earner who would
 * actually take the call — all read from fixtures rather than asserted in
 * markup, and all of it changes when the client changes the engagement.
 *
 * THE BUTTON SAYS "REQUEST THIS TIME", NOT "CONFIRM BOOKING"
 * ---------------------------------------------------------------------------
 * A deliberate departure from the export, and it is not only about the missing
 * backend. A client does not confirm a partner's diary; the firm does. Even
 * fully built, this flow ends with the firm accepting — a law firm consultation
 * is a request, not a self-service slot the way a Calendly link is. "Confirm
 * booking" would still be the wrong word on the day this ships for real.
 *
 * Flagged rather than assumed: if the intended product genuinely auto-accepts,
 * this is a one-string change in both dictionaries.
 *
 * MOCK: replace with POST /api/consultations, which must re-check the slot is
 * still free at write time (the availability this modal was opened with is
 * already stale), hold it against the fee earner's calendar, and send the
 * confirmation. Track A.5 for the route; the calendar itself is Track B
 * (BUILD_PLAN.md §6).
 *
 * ===========================================================================
 * THE TIMEZONE, WHICH THE EXPORT GOT WRONG
 * ===========================================================================
 * Both exports label the slots "GST / UTC+4" — Gulf Standard Time. The demo firm
 * is in Cairo (fixtures/firm.ts; TENANT_TIME_ZONE is 'Africa/Cairo'), which is
 * GMT+2 or GMT+3 depending on the season. So the export offered a Cairo firm's
 * appointments on a Dubai clock, two hours out.
 *
 * This is the third instance of one specific error: a Gulf default applied to an
 * Egyptian firm. The others were the UAE VAT line on the invoices and the UAE
 * mobile number on a Cairo lawyer's contact card. It is worth naming as a
 * pattern rather than fixing quietly a third time — the exports appear to assume
 * a UAE tenant throughout, and every screen with a jurisdictional fact on it
 * needs checking against fixtures/firm.ts rather than read off the export.
 *
 * A consultation is also the one kind of time in this product that is a true
 * INSTANT rather than a calendar date (lib/format.ts draws that distinction for
 * deadlines). Two people on a call are at the same moment on two different wall
 * clocks, and the demo client's own number is a UAE one — so this client really
 * would be an hour out from the firm.
 *
 * The honest minimum is therefore: show the FIRM's clock, and state the offset
 * beside it, derived rather than written down. What is deliberately NOT done is
 * silently converting into the reader's browser zone — lib/format.ts explains
 * why the browser's zone is the wrong source everywhere else in this product,
 * and a booking screen that shows one time while the firm's diary holds another
 * is the Accept Invite bug with higher stakes.
 *
 * MOCK: the real screen shows BOTH zones — the client's and the firm's — with
 * the client's resolved from a profile setting rather than from the browser.
 * That setting does not exist yet; Settings › Profile is where it goes. Track
 * A.5.
 *
 * ---------------------------------------------------------------------------
 * NOT CARRIED OVER FROM THE STITCH EXPORT
 * ---------------------------------------------------------------------------
 *  · "جلسة استشارية رسمية ومحمية بالحصانة المهنية للمحامين والموكلين (معيار
 *    SHA-256 المعتمد)" — a consultation "protected by attorney-client privilege
 *    (certified SHA-256 standard)". SHA-256 is a hash function and has nothing
 *    to do with a phone call; privilege is a legal status, not a product
 *    feature. Seventh screen running for this category, and the English export
 *    does not make the claim at all.
 *  · "Video / Teleconference via Secure Portal" and "اجتماع مرئي مشفر عبر
 *    البوابة" ("encrypted video meeting via the portal"). There is no video
 *    calling in this product, encrypted or otherwise. How the call happens is
 *    something the firm confirms; the modal does not invent a channel.
 *  · "Schedule a privileged consultation with your assigned legal team" as the
 *    subtitle — same unearned claim in softer wording.
 *  · "Adv. R. Al-Khatib (Senior Partner)" / "المستشار ر. الخطيب (شريك رئيسي)",
 *    hardcoded as the lead for every option in the dropdown. The name is real —
 *    Rami Al-Khatib leads two of the demo projects — but pinning it to all of
 *    them meant changing the matter did not change the lawyer. It is derived per
 *    engagement now. The honorifics go for the reason fixtures/engagements.ts
 *    gives: "Adv." and "المستشار/المستشارة" are gendered in Arabic, and the
 *    export gets them right by inference rather than by data.
 *  · MARCH 2025, hardcoded, on a grid offering **Friday**. The firm is in Cairo,
 *    where Friday is the weekend — see fixtures/availability.ts. The dates are
 *    derived from the tenant's clock and skip the jurisdiction's closed days.
 *  · THE PRESELECTED DATE AND TIME in the markup of both versions, so the modal
 *    ships with an appointment nobody chose — the same defect as the upload
 *    modal's prefilled file.
 *  · The two languages disagreeing about the screen: the English grid offers
 *    five days and four engagements, the Arabic four days and three. The Arabic
 *    states the 45-minute duration and the English does not — that one was worth
 *    keeping, so both say it.
 */

export interface BookCallModalProps {
  open: boolean;
  onClose: () => void;
  availability: ConsultationAvailability;
  /** Preselect the engagement — set when opened from a matter or project. */
  defaultEngagementRef?: string;
}

export function BookCallModal({
  open,
  onClose,
  availability,
  defaultEngagementRef,
}: BookCallModalProps) {
  const t = useTranslations('bookCall');
  const locale = useLocale() as Locale;
  const engagements = usePortalEngagements();

  // The first day with anything left on it. Opening on a fully-committed day
  // would show the modal's emptiest state first and make the firm look shut.
  const firstOpenDay = availability.days.find((day) => day.slots.length > 0)?.date ?? '';

  const [engagement, setEngagement] = React.useState(defaultEngagementRef ?? '');
  const [date, setDate] = React.useState(firstOpenDay);
  const [time, setTime] = React.useState<string | null>(null);
  const [topic, setTopic] = React.useState('');
  const [engagementError, setEngagementError] = React.useState<string | null>(null);
  const [attempted, setAttempted] = React.useState(false);

  // Reopening should not show the previous attempt's selection or messages.
  React.useEffect(() => {
    if (open) return;
    setEngagement(defaultEngagementRef ?? '');
    setDate(firstOpenDay);
    setTime(null);
    setTopic('');
    setEngagementError(null);
    setAttempted(false);
  }, [open, defaultEngagementRef, firstOpenDay]);

  const selectedDay = availability.days.find((day) => day.date === date);
  const selectedEngagement = engagements.find((option) => option.reference === engagement);

  function submit(event: React.FormEvent) {
    // No `action`, no `method`, and preventDefault here. Without it this is a
    // GET that puts the engagement reference and whatever the client typed about
    // their legal problem into the query string, browser history and the next
    // Referer header. Same omission the Client Gateway shipped with a password.
    event.preventDefault();

    if (!engagement) {
      setEngagementError(t('errorEngagement'));
      return;
    }

    setEngagementError(null);
    setAttempted(true);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('title')}
      description={t('description')}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('cancel')}
          </Button>
          {/*
            The one syn-red primary in this modal. design.md §2: red is the
            human's own action. Disabled until a time is chosen — there is
            nothing to confirm before that, which is the same reason Upload stays
            disabled until a file is staged.
          */}
          <Button
            type="submit"
            form="book-call-form"
            variant="primary"
            disabled={time === null}
            icon={<CalendarPlus aria-hidden size={15} />}
          >
            {t('submit')}
          </Button>
        </>
      }
    >
      <form id="book-call-form" onSubmit={submit} className="flex flex-col gap-5" noValidate>
        <Field
          htmlFor="call-engagement"
          label={t('engagementLabel')}
          hint={t('engagementHint')}
          error={engagementError ?? undefined}
        >
          <Select
            id="call-engagement"
            value={engagement}
            invalid={Boolean(engagementError)}
            onChange={(event) => {
              setEngagement(event.target.value);
              setEngagementError(null);
              setAttempted(false);
            }}
          >
            <option value="">{t('engagementPlaceholder')}</option>
            {engagements.map((option) => (
              <option key={option.reference} value={option.reference}>
                {option.reference} — {option.title}
              </option>
            ))}
          </Select>
        </Field>

        {/*
          Who you would actually be speaking to, derived from the selection
          above. Absent until an engagement is chosen, rather than showing a
          placeholder lawyer: the export's version named the same partner
          whatever you picked.
        */}
        {selectedEngagement ? (
          <div className="flex items-start gap-2.5 rounded-card border border-gray-200 bg-gray-50 p-3">
            <UserRound
              aria-hidden
              size={16}
              strokeWidth={1.8}
              className="mt-0.5 shrink-0 text-legal-navy"
            />
            <p className="text-caption text-gray-600">
              <span className="font-medium text-gray-700">{t('leadLabel')}</span>{' '}
              {selectedEngagement.lead.name} · {selectedEngagement.lead.role}
            </p>
          </div>
        ) : null}

        {/* Date ---------------------------------------------------------- */}
        <fieldset className="min-w-0">
          <legend className="mb-1.5 text-caption font-medium text-gray-700">
            {t('dateLabel')}
          </legend>

          {/* Scrolls rather than wrapping: five day tiles do not fit at 375px,
              and a second row of two reads as a different week. */}
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {availability.days.map((day) => {
              const full = day.slots.length === 0;
              const active = day.date === date;

              return (
                <button
                  key={day.date}
                  type="button"
                  disabled={full}
                  aria-pressed={active}
                  onClick={() => {
                    setDate(day.date);
                    setTime(null);
                    setAttempted(false);
                  }}
                  className={cn(
                    'flex min-w-[4.5rem] flex-1 shrink-0 flex-col items-center gap-0.5 rounded-btn border px-2 py-2.5 transition-colors',
                    active
                      ? 'border-legal-navy bg-legal-navy text-white'
                      : full
                        ? 'cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400'
                        : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-gray-300 hover:bg-gray-100'
                  )}
                >
                  <span className={cn('text-caption', active ? 'text-white/80' : 'text-gray-500')}>
                    {formatWeekday(day.date, locale)}
                  </span>
                  {/* Isolated, not direction-forced — see lib/format.ts. */}
                  <span className="text-body font-medium [unicode-bidi:isolate]">
                    {formatDayOfMonth(day.date, locale)}
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>

        {/* Time ---------------------------------------------------------- */}
        <fieldset className="min-w-0">
          <legend className="mb-1.5 text-caption font-medium text-gray-700">
            {t('timeLabel')}
          </legend>

          {selectedDay && selectedDay.slots.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {selectedDay.slots.map((slot) => {
                const active = slot === time;

                return (
                  <button
                    key={slot}
                    type="button"
                    aria-pressed={active}
                    onClick={() => {
                      setTime(slot);
                      setAttempted(false);
                    }}
                    className={cn(
                      // JetBrains Mono, per design.md §3 — a row of times is a
                      // column of figures and should align like one.
                      'rounded-btn border px-3 py-2 font-mono text-reference transition-colors max-tablet:min-h-11',
                      '[unicode-bidi:isolate]',
                      active
                        ? 'border-legal-navy bg-legal-navy text-white'
                        : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-gray-300 hover:bg-gray-100'
                    )}
                  >
                    {formatClockTime(slot, locale)}
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-caption text-gray-500">{t('noSlots')}</p>
          )}

          {/* The offset is derived, and the wording says "the firm's local
              time" rather than naming a city — the city is tenant
              configuration. See the timezone note at the top of this file. */}
          <p className="mt-2 text-caption text-gray-500">
            {t('timeNote', {
              offset: tenantZoneOffset(locale),
              minutes: availability.durationMinutes,
            })}
          </p>
        </fieldset>

        <Field htmlFor="call-topic" label={t('topicLabel')} hint={t('topicHint')}>
          <Textarea
            id="call-topic"
            rows={3}
            value={topic}
            onChange={(event) => {
              setTopic(event.target.value);
              setAttempted(false);
            }}
            placeholder={t('topicPlaceholder')}
          />
        </Field>

        {/* The clear no-op. Stated where the action was taken, naming what did
            not happen and what to do instead — Messages is built, so there is a
            real alternative to point at rather than a dead end. */}
        {attempted ? (
          <p role="status" className="text-caption text-gray-600">
            {t('notBooked', {
              date: formatCalendarDate(date, locale),
              time: time ? formatClockTime(time, locale) : '',
            })}
          </p>
        ) : null}
      </form>
    </Modal>
  );
}

export default BookCallModal;
