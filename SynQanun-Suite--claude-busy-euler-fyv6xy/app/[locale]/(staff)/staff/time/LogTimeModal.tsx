'use client';

import * as React from 'react';
import { Clock } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button, Field, Input, Modal, Select, Textarea } from '@/components/ui';
import { useRouter } from '@/lib/i18n/navigation';
import { cn } from '@/lib/utils';
import { logTime } from './log-time-action';

/**
 * "Log time" — the entry, and the number it moves.
 *
 * BUILD_PLAN.md §3, Batch 6. No Stitch export was supplied; built from §3 and
 * design.md against the patterns Add Team Member and New Document set.
 *
 * ===========================================================================
 * IT MOVES A FIGURE SOMEBODY ELSE IS ALREADY READING
 * ===========================================================================
 * §5.1 category 1, and the first write in the product that feeds an existing
 * number rather than its own list. `billing()` sums the stated weekly baseline
 * plus this session's entries, so an hour logged here moves the hours card by
 * an hour — on the dashboard, not just in a list underneath this dialog.
 *
 * That also retired a line. The hours card used to say the timer in the corner
 * does not feed the figure, because nothing did; it now says what does, and
 * still says the timer does not, because the timer still throws its seconds
 * away (UIStateProvider).
 *
 * ===========================================================================
 * NO RATE, NO AMOUNT, NO TOTAL IN MONEY
 * ===========================================================================
 * The single most load-bearing refusal on this screen, and it is not new — the
 * firm-side billing header settled it before this dialog existed: there is no
 * rate card in this product, and "hours without a rate are not money".
 *
 * `DEFAULT_HOURLY_RATES` in lib/ranks.ts is not the missing rate card. It seeds
 * the onboarding wizard's billing step with values that step presents as
 * editable, and its own MOCK note says the real thing is the tenant's
 * configured rate card. Reading it here would turn a placeholder somebody was
 * invited to overwrite into the firm's charge-out rate, on the record a client
 * would eventually be billed from. A hand-typed rate would be worse again: a
 * figure with no authority behind it, entered under time pressure, that
 * everything downstream would then treat as agreed.
 *
 * So this dialog records WHAT WAS DONE, FOR HOW LONG, AND WHETHER IT CAN BE
 * CHARGED. Pricing it is a different act with a different authority behind it,
 * and the invoice builder is where that lands.
 *
 * ===========================================================================
 * BILLABLE IS A CHOICE, NOT A TOGGLE WITH A DEFAULT
 * ===========================================================================
 * §3 calls this a toggle, and a toggle has to start somewhere. Both starting
 * points are wrong in a way that matters:
 *
 *   · Defaulting to BILLABLE puts work on a client's statement because nobody
 *     looked at the last control on the form.
 *   · Defaulting to NON-BILLABLE quietly writes off chargeable work, which
 *     reads as generosity and is actually a firm losing money it earned.
 *
 * Neither is a safe accident, so it is two options with neither selected and a
 * validation error if the form is submitted without one — the rule the rank
 * field earned in Add Team Member and the type cards inherited in New
 * Document.
 *
 * ===========================================================================
 * THE DATE IS BOUNDED IN THE TENANT'S ZONE, NOT THE BROWSER'S
 * ===========================================================================
 * `today` arrives as a prop, computed by `tenantToday()` on the server. A
 * `new Date()` here would be the VIEWER's today: someone in Dubai at 00:30 is
 * already on tomorrow, and would be offered a date the Cairo firm has not
 * reached. The floor is the hours chart's window, because an entry older than
 * that would be a real record with nowhere on any screen to appear, which is
 * indistinguishable from a write that failed.
 *
 * Both bounds are enforced again in the data layer. An `<input max>` is a
 * suggestion to a browser, not a rule.
 *
 * ===========================================================================
 * HOURS AND MINUTES, NOT DECIMAL HOURS
 * ===========================================================================
 * A tenth of an hour is six minutes. Asking for "1.3" and storing it invites
 * the reader to mean 1h30 and the ledger to record 1h18 — a twelve-minute
 * error per entry, in the firm's favour or the client's depending on the
 * rounding. Two fields, multiplied to minutes, and nothing rounds.
 *
 * There is also no billing increment. Rounding every entry up to six or
 * fifteen minutes is a real and defensible firm policy, and this product has
 * nowhere to configure one — so applying it would be inventing the policy and
 * the setting behind it, the same reason the domain allow-list keeps being
 * refused on the invite dialogs.
 */

export interface LogTimeModalProps {
  /** Files that can be logged against, flattened by the server. */
  engagements: { value: string; label: string }[];
  /**
   * Pre-selected file, when the dialog is opened from one.
   *
   * A SELECTOR, not a fixed line — unlike New Document, where the engagement
   * is read-only. The difference is what a wrong answer costs: a draft filed
   * against the wrong matter is privileged work product on another client's
   * record, while an hour logged against the wrong file is a billing error
   * somebody corrects. The commoner case here is also genuinely different —
   * a person logs a day's work from one screen and it spans three files.
   */
  defaultEngagementRef?: string;
  /** Today in the TENANT's zone. See the header. */
  today: string;
  /** How far back the hours chart reaches, in weeks. Bounds the date field. */
  weeksShown: number;
  /** Rendered inside a card header rather than as a page action. */
  size?: 'sm' | 'md';
}

export function LogTimeModal({
  engagements,
  defaultEngagementRef,
  today,
  weeksShown,
  size = 'sm',
}: LogTimeModalProps) {
  const t = useTranslations('logTime');
  const router = useRouter();

  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState<{ minutes: number; billable: boolean } | null>(null);

  const [engagementRef, setEngagementRef] = React.useState(defaultEngagementRef ?? '');
  // Today is a safe default for a date: it is the commonest answer and it
  // cannot be the most consequential one, because every allowed value is a day
  // the work could have been done on.
  const [on, setOn] = React.useState(today);
  const [hours, setHours] = React.useState('');
  const [minutes, setMinutes] = React.useState('');
  const [description, setDescription] = React.useState('');
  // No default. See the header.
  const [billable, setBillable] = React.useState<boolean | null>(null);

  const earliest = React.useMemo(() => {
    const parsed = new Date(`${today}T00:00:00Z`);
    parsed.setUTCDate(parsed.getUTCDate() - (weeksShown * 7 - 1));
    return parsed.toISOString().slice(0, 10);
  }, [today, weeksShown]);

  const totalMinutes = (Number(hours) || 0) * 60 + (Number(minutes) || 0);

  const reset = () => {
    setEngagementRef(defaultEngagementRef ?? '');
    setOn(today);
    setHours('');
    setMinutes('');
    setDescription('');
    setBillable(null);
    setError(null);
    setDone(null);
  };

  const close = () => {
    setOpen(false);
    window.setTimeout(reset, 200);
  };

  const submit = (event: React.FormEvent) => {
    // Without this the browser posts the form and a description of privileged
    // work lands in the address bar.
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await logTime({
        engagementRef,
        on,
        minutes: totalMinutes,
        description,
        billable,
      });

      if (result.ok) {
        setDone({ minutes: result.entry.minutes, billable: result.entry.billable });
        // The hours card is server-rendered; without this the chart behind the
        // dialog still shows the figure from before the entry.
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  };

  return (
    <>
      <Button
        variant="secondary"
        size={size}
        icon={<Clock aria-hidden size={15} />}
        onClick={() => setOpen(true)}
      >
        {t('open')}
      </Button>

      <Modal
        open={open}
        onClose={close}
        title={done ? t('done.title') : t('title')}
        description={done ? undefined : t('description')}
      >
        {done ? (
          <div className="flex flex-col gap-4 p-6 pt-0">
            <div className="min-w-0">
              <p className="text-caption text-gray-500">{t('done.lead')}</p>
              {/* Mono and tabular, like every other duration in the product —
                  design.md §3 and §9. */}
              <p className="mt-1 font-mono text-title font-medium tabular-nums text-gray-900 [unicode-bidi:isolate]">
                {t('duration', {
                  hours: Math.floor(done.minutes / 60),
                  minutes: done.minutes % 60,
                })}
              </p>
              <p className="mt-0.5 text-caption text-gray-500">
                {done.billable ? t('billableYes') : t('billableNo')}
              </p>
            </div>

            <div className="rounded-card border border-gray-300 bg-gray-100 p-4">
              <p className="text-caption font-medium text-gray-700">{t('done.scopeTitle')}</p>
              <p className="mt-1 text-caption text-gray-600">{t('done.moved')}</p>
              <p className="mt-2 text-caption text-gray-600">{t('done.noMoney')}</p>
              <p className="mt-2 text-caption text-gray-600">{t('done.session')}</p>
            </div>

            <div className="flex justify-end gap-2">
              {/* Logging one entry usually means logging several. */}
              <Button variant="secondary" size="md" onClick={reset}>
                {t('done.another')}
              </Button>
              <Button variant="primary" size="md" onClick={close}>
                {t('done.close')}
              </Button>
            </div>
          </div>
        ) : engagements.length === 0 ? (
          /*
            No file to bill an hour to, so no form. Same call as the new-matter
            form's missing client list: absent rather than present with a dead
            dropdown and a submit disabled for an unstated reason.

            This is reachable for a real person, not only an empty tenant — a
            fee earner who has just joined is on nothing yet, and `engagements`
            is scoped to their own files.
          */
          <div className="flex flex-col gap-2 p-6 pt-0">
            <p className="text-body text-gray-700">{t('noFiles.title')}</p>
            <p className="text-caption text-gray-500">{t('noFiles.body')}</p>
          </div>
        ) : (
          <form onSubmit={submit} noValidate className="flex flex-col gap-4 p-6 pt-0">
            <Field htmlFor="time-engagement" label={t('fileLabel')}>
              <Select
                id="time-engagement"
                value={engagementRef}
                onChange={(event) => {
                  setEngagementRef(event.target.value);
                  setError(null);
                }}
              >
                {/* No file is preselected unless the dialog was opened from
                    one. A first-in-the-list default would attach the hour to
                    whichever matter happens to sort first. */}
                <option value="">{t('filePlaceholder')}</option>
                {engagements.map((engagement) => (
                  <option key={engagement.value} value={engagement.value}>
                    {engagement.label}
                  </option>
                ))}
              </Select>
            </Field>

            <div className="grid grid-cols-1 gap-4 tablet:grid-cols-2">
              <Field htmlFor="time-date" label={t('dateLabel')} hint={t('dateHint')}>
                {/*
                  `min` and `max` are the tenant's window, not the browser's —
                  see the header. Both are re-checked server-side, because an
                  input attribute is a suggestion to a browser.
                */}
                <Input
                  id="time-date"
                  type="date"
                  latinValue
                  min={earliest}
                  max={today}
                  value={on}
                  onChange={(event) => {
                    setOn(event.target.value);
                    setError(null);
                  }}
                />
              </Field>

              <fieldset className="min-w-0">
                <legend className="text-caption font-medium text-gray-700">
                  {t('durationLabel')}
                </legend>
                <div className="mt-1.5 flex items-center gap-2">
                  <Input
                    aria-label={t('hoursLabel')}
                    type="number"
                    latinValue
                    min={0}
                    max={24}
                    inputMode="numeric"
                    value={hours}
                    onChange={(event) => {
                      setHours(event.target.value);
                      setError(null);
                    }}
                    placeholder="0"
                  />
                  <span className="shrink-0 text-caption text-gray-500">{t('hoursSuffix')}</span>
                  <Input
                    aria-label={t('minutesLabel')}
                    type="number"
                    latinValue
                    min={0}
                    max={59}
                    inputMode="numeric"
                    value={minutes}
                    onChange={(event) => {
                      setMinutes(event.target.value);
                      setError(null);
                    }}
                    placeholder="00"
                  />
                  <span className="shrink-0 text-caption text-gray-500">{t('minutesSuffix')}</span>
                </div>
                <p className="mt-1.5 text-caption text-gray-500">{t('durationHint')}</p>
              </fieldset>
            </div>

            <Field
              htmlFor="time-description"
              label={t('descriptionLabel')}
              hint={t('descriptionHint')}
            >
              <Textarea
                id="time-description"
                rows={2}
                value={description}
                onChange={(event) => {
                  setDescription(event.target.value);
                  setError(null);
                }}
                placeholder={t('descriptionPlaceholder')}
              />
            </Field>

            {/* Two options, neither preselected. See the header. */}
            <fieldset className="min-w-0">
              <legend className="text-caption font-medium text-gray-700">
                {t('billableLabel')}
              </legend>
              <div className="mt-2 grid grid-cols-1 gap-2 tablet:grid-cols-2">
                {[
                  { value: true, label: t('billableYes'), hint: t('billableYesHint') },
                  { value: false, label: t('billableNo'), hint: t('billableNoHint') },
                ].map((option) => (
                  <label
                    key={String(option.value)}
                    className={cn(
                      'flex cursor-pointer items-start gap-2.5 rounded-card border p-3 transition-colors',
                      billable === option.value
                        ? 'border-action bg-action/5'
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    )}
                  >
                    <input
                      type="radio"
                      name="time-billable"
                      checked={billable === option.value}
                      onChange={() => {
                        setBillable(option.value);
                        setError(null);
                      }}
                      className="mt-1 h-4 w-4 shrink-0 accent-action"
                    />
                    <span className="min-w-0">
                      <span className="block text-body text-gray-900">{option.label}</span>
                      <span className="mt-0.5 block text-caption text-gray-500">{option.hint}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            {error ? (
              <p role="alert" className="text-caption text-error">
                {t(`errors.${error}`)}
              </p>
            ) : null}

            {/* Said before the button. The absence of money on this form is a
                property of the product, not of this dialog. */}
            <p className="text-caption text-gray-500">{t('beforeYouLog')}</p>

            <div className="flex justify-end gap-2">
              <Button variant="secondary" size="md" onClick={close} disabled={pending}>
                {t('cancel')}
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="md"
                loading={pending}
                disabled={
                  !engagementRef ||
                  totalMinutes <= 0 ||
                  description.trim().length === 0 ||
                  billable === null
                }
              >
                {t('submit')}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}

export default LogTimeModal;
