'use client';

import * as React from 'react';
import { Plus, Send, Trash2, CheckCircle2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button, buttonClasses, Card, Field, Input, Select } from '@/components/ui';
import { formatMoney } from '@/lib/format';
import { Link, useRouter } from '@/lib/i18n/navigation';
import type { Locale } from '@/lib/i18n/routing';
import { saveInvoiceDraft, sendInvoiceToClient } from './save-draft-action';

/**
 * The invoice builder.
 *
 * BUILD_PLAN.md §3, Batch 6. No Stitch export; built from §3 and design.md.
 *
 * ===========================================================================
 * THE FLOW SPLITS EXACTLY WHERE §5.1 SAYS IT DOES
 * ===========================================================================
 * "Sending an invoice" is §5.1's FIRST example of a category 2 act, and
 * assembling one is its clearest category 1. So this screen has two buttons and
 * they behave differently on purpose:
 *
 *   · SAVE DRAFT writes. The draft really exists for the rest of the session,
 *     it appears on the billing screen, and the time it consumed is marked
 *     billed so it cannot be drawn into a second statement.
 *   · SEND TO CLIENT does nothing, and says so where it was pressed. No mail
 *     leaves, no statement is issued, and — the part worth checking rather than
 *     asserting — the client portal's Invoices list does not change.
 *
 * That last point is structural rather than a filter somebody remembered:
 * fixtures/invoices.ts holds drafts in a different collection from statements,
 * and the portal's read does not name it.
 *
 * ===========================================================================
 * THE TOTAL IS SUMMED, NEVER TYPED
 * ===========================================================================
 * There is no total field, here or in the payload. It is computed from the
 * lines on screen and computed again server-side when the draft is read. A fee
 * statement whose stated total disagrees with its own breakdown is the single
 * worst thing fixtures/invoices.ts can hold, and the only way to produce one is
 * to let somebody write it down.
 *
 * ===========================================================================
 * THE AMOUNTS ARE TYPED, AND THAT IS NOT A SHORTCUT
 * ===========================================================================
 * Each line carries the MINUTES behind it and an empty amount. Nothing
 * multiplies the two, because there is nothing to multiply by: this product has
 * no rate card, `DEFAULT_HOURLY_RATES` is an editable onboarding seed whose own
 * MOCK note says so, and the firm-side billing header refused the WIP figure and
 * the realization rate on exactly that ground.
 *
 * The alternative — pricing the lines from that constant — would have produced
 * a screen that looks finished and a number that means nothing, on the document
 * a client is asked to pay. Showing the hours and asking the person raising the
 * bill to price them is what a firm without a configured rate card actually
 * does.
 *
 * ===========================================================================
 * AND THERE IS NO EXPENSE LEDGER TO READ
 * ===========================================================================
 * §3 asks for unbilled time AND expenses. The time is real — it is the ledger
 * the hours card sums. There are no expenses: nothing in this product records a
 * court fee paid on a client's behalf, a courier, or a translator. Rather than
 * invent a disbursement collection so that a button had something to read, a
 * line can be added by hand, which is what that firm does today. The empty
 * state says which of the two is missing rather than showing an empty list of
 * both.
 */

export interface UnbilledEntry {
  id: string;
  on: string;
  minutes: number;
  description: string;
  staffName: string;
}

interface Line {
  key: string;
  description: string;
  minutes: number | null;
  fromEntryIds: string[];
  /** Kept as the raw string so an empty box is distinguishable from a zero. */
  amount: string;
}

export interface InvoiceBuilderProps {
  locale: Locale;
  engagements: { value: string; label: string }[];
  engagementRef: string;
  unbilled: UnbilledEntry[];
  currency: string;
  /** Where the billing ledger lives, for the link after a draft is saved. */
  ledgerHref: string;
}

export function InvoiceBuilder({
  locale,
  engagements,
  engagementRef,
  unbilled,
  currency,
  ledgerHref,
}: InvoiceBuilderProps) {
  const t = useTranslations('invoiceBuilder');
  const router = useRouter();

  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const [saved, setSaved] = React.useState<{ total: number; lines: number } | null>(null);
  const [issuedInfo, setIssuedInfo] = React.useState<{ reference: string; total: number; lines: number } | null>(null);
  const [sendAttempted, setSendAttempted] = React.useState(false);

  const [description, setDescription] = React.useState('');
  const [lines, setLines] = React.useState<Line[]>([]);

  /*
    The seeded lines come from the server, so changing the file re-fetches
    rather than filtering a list the browser already holds.

    KEYED ON THE FILE, NOT ON `unbilled`. That was the first version and it was
    wrong in a way only the happy path shows: saving a draft marks its time
    billed and calls `router.refresh()`, so `unbilled` changes BECAUSE the save
    succeeded — and an effect watching it wiped the confirmation panel the save
    had just produced. The form emptied itself and said nothing. The file is the
    thing whose change should reset the form; a refresh of the same file is not.

    Read through a ref so the latest server data is used without the effect
    depending on its identity.
  */
  const latestUnbilled = React.useRef(unbilled);
  latestUnbilled.current = unbilled;

  React.useEffect(() => {
    setLines(
      latestUnbilled.current.map((entry) => ({
        key: entry.id,
        description:
          typeof entry.description === 'string'
            ? entry.description
            : (entry.description as any)?.[locale] ||
              (entry.description as any)?.ar ||
              (entry.description as any)?.en ||
              '',
        minutes: entry.minutes,
        fromEntryIds: [entry.id],
        amount: '',
      }))
    );
    setError(null);
    setSaved(null);
    setSendAttempted(false);
  }, [engagementRef]);

  // Summed from what is on screen. There is no total field — see the header.
  const total = lines.reduce((running, line) => {
    const amount = Number(line.amount);
    return running + (Number.isFinite(amount) ? amount : 0);
  }, 0);

  const unpriced = lines.filter((line) => line.amount.trim() === '').length;

  const updateLine = (key: string, patch: Partial<Line>) => {
    setLines((current) =>
      current.map((line) => (line.key === key ? { ...line, ...patch } : line))
    );
    setError(null);
    setSendAttempted(false);
  };

  const addLine = () => {
    setLines((current) => [
      ...current,
      {
        // Not from the ledger: no minutes and no entry behind it. This is the
        // disbursement case — see the header.
        key: `manual-${current.length + 1}-${Date.now()}`,
        description: '',
        minutes: null,
        fromEntryIds: [],
        amount: '',
      },
    ]);
    setSendAttempted(false);
  };

  const removeLine = (key: string) => {
    setLines((current) => current.filter((line) => line.key !== key));
    setError(null);
    setSendAttempted(false);
  };

  const handleSendToClient = () => {
    setError(null);
    if (!engagementRef) {
      setError('engagementInvalid');
      return;
    }
    if (lines.length === 0) {
      setError('noLines');
      return;
    }
    const finalDesc =
      description.trim() ||
      (locale === 'ar'
        ? `فاتورة أتعاب قانونية - ${engagementRef}`
        : `Legal Services Invoice - ${engagementRef}`);

    startTransition(async () => {
      const result = await sendInvoiceToClient({
        engagementRef,
        description: finalDesc,
        lines: lines.map((line) => {
          const d =
            typeof line.description === 'string'
              ? line.description.trim()
              : (line.description as any)?.[locale] ||
                (line.description as any)?.ar ||
                '';
          return {
            description: d || (locale === 'ar' ? 'أتعاب واستشارات قانونية' : 'Legal professional services'),
            minutes: line.minutes,
            fromEntryIds: line.fromEntryIds,
            amount: line.amount.trim() === '' ? null : Number(line.amount),
          };
        }),
      });

      if (result.ok && result.draft) {
        setIssuedInfo({
          reference: result.reference || (result.draft as any).reference || result.draft.id,
          total: result.draft.total,
          lines: result.draft.lines.length,
        });
        router.refresh();
      } else {
        setError((result as any).error || 'حدث خطأ أثناء إصدار الفاتورة');
      }
    });
  };

  const save = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    const finalDesc =
      description.trim() ||
      (locale === 'ar'
        ? `فاتورة أتعاب قانونية - ${engagementRef}`
        : `Legal Services Invoice - ${engagementRef}`);

    startTransition(async () => {
      const result = await saveInvoiceDraft({
        engagementRef,
        description: finalDesc,
        lines: lines.map((line) => {
          const d =
            typeof line.description === 'string'
              ? line.description.trim()
              : (line.description as any)?.[locale] ||
                (line.description as any)?.ar ||
                '';
          return {
            description: d || (locale === 'ar' ? 'أتعاب واستشارات قانونية' : 'Legal professional services'),
            minutes: line.minutes,
            fromEntryIds: line.fromEntryIds,
            amount: line.amount.trim() === '' ? null : Number(line.amount),
          };
        }),
      });

      if (result.ok) {
        setSaved({ total: result.draft.total, lines: result.draft.lines.length });
        router.refresh();
      } else {
        setError((result as any).error || 'حدث خطأ أثناء إصدار الفاتورة');
      }
    });
  };

  if (issuedInfo) {
    return (
      <Card padding="lg">
        <div className="flex items-center gap-3 text-emerald-700">
          <CheckCircle2 size={24} className="shrink-0" />
          <h2 className="font-sans text-title font-semibold text-emerald-800">
            {locale === 'ar'
              ? 'تم إصدار الفاتورة واعتمادها للعميل بنجاح'
              : 'Invoice Issued and Sent to Client Successfully'}
          </h2>
        </div>
        <p className="mt-1 text-caption text-gray-500">
          {t('saved.lines', { count: issuedInfo.lines })}
        </p>
        <p className="mt-2 font-mono text-display font-medium tabular-nums text-gray-900 [unicode-bidi:isolate]">
          {formatMoney(issuedInfo.total, currency, locale)}
        </p>
        <div className="mt-4 rounded-card border border-emerald-200 bg-emerald-50/70 p-4">
          <p className="text-body font-medium text-emerald-900">
            {locale === 'ar'
              ? `صدرت الفاتورة رسمياً برقم ${issuedInfo.reference} وأصبحت مستحقة في حساب العميل.`
              : `Invoice ${issuedInfo.reference} was officially issued and is now active on the client ledger.`}
          </p>
          <p className="mt-1 text-caption text-emerald-700">
            {locale === 'ar'
              ? 'تم ربط ساعات العمل المدرجة في الفاتورة وتحديث حالتها إلى مفوترة بنجاح.'
              : 'All associated billable hours have been linked and marked as billed.'}
          </p>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Link href={ledgerHref} className={buttonClasses({ variant: 'primary', size: 'md' })}>
            {t('saved.toLedger')}
          </Link>
          <Link href="/invoices" className={buttonClasses({ variant: 'secondary', size: 'md' })}>
            {locale === 'ar' ? 'عرض في بوابة العميل' : 'View in Client Portal'}
          </Link>
          <Button variant="secondary" size="md" onClick={() => router.refresh()}>
            {t('saved.another')}
          </Button>
        </div>
      </Card>
    );
  }

  if (saved) {
    return (
      <Card padding="lg">
        <h2 className="font-sans text-title text-gray-900">{t('saved.title')}</h2>
        <p className="mt-1 text-caption text-gray-500">
          {t('saved.lines', { count: saved.lines })}
        </p>
        <p className="mt-2 font-mono text-display font-medium tabular-nums text-gray-900 [unicode-bidi:isolate]">
          {formatMoney(saved.total, currency, locale)}
        </p>

        <div className="mt-4 rounded-card border border-gray-300 bg-gray-100 p-4">
          <p className="text-caption font-medium text-gray-700">{t('saved.scopeTitle')}</p>
          <p className="mt-1 text-caption text-gray-600">{t('saved.notIssued')}</p>
          <p className="mt-2 text-caption text-gray-600">{t('saved.timeConsumed')}</p>
          <p className="mt-2 text-caption text-gray-600">{t('saved.session')}</p>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Link href={ledgerHref} className={buttonClasses({ variant: 'primary', size: 'md' })}>
            {t('saved.toLedger')}
          </Link>
          <Button variant="secondary" size="md" onClick={() => router.refresh()}>
            {t('saved.another')}
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <form onSubmit={save} noValidate className="flex flex-col gap-5">
      <Card padding="lg">
        <div className="grid grid-cols-1 gap-4 tablet:grid-cols-2">
          <Field htmlFor="draft-engagement" label={t('fileLabel')} hint={t('fileHint')}>
            <Select
              id="draft-engagement"
              value={engagementRef}
              onChange={(event) => {
                /*
                  The FILE is a navigation, not client state: its unbilled time
                  has to be fetched, and the alternative is shipping every
                  engagement's ledger to the browser so a <select> can filter
                  it. A reference is not sensitive — it is already in the path
                  on the matter's own screen.
                */
                const next = new URLSearchParams();
                if (event.target.value) next.set('engagement', event.target.value);
                router.replace(`/staff/billing/new?${next.toString()}`);
              }}
            >
              <option value="">{t('filePlaceholder')}</option>
              {engagements.map((engagement) => (
                <option key={engagement.value} value={engagement.value}>
                  {engagement.label}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            htmlFor="draft-description"
            label={t('descriptionLabel')}
            hint={t('descriptionHint')}
          >
            <Input
              id="draft-description"
              value={description}
              onChange={(event) => {
                setDescription(event.target.value);
                setError(null);
                setSendAttempted(false);
              }}
              placeholder={t('descriptionPlaceholder')}
              disabled={!engagementRef}
            />
          </Field>
        </div>
      </Card>

      {engagementRef ? (
        <Card padding="none" className="overflow-hidden">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 p-5">
            <div className="min-w-0">
              <h2 className="font-sans text-title text-gray-900">{t('lines.heading')}</h2>
              <p className="mt-0.5 text-caption text-gray-500">{t('lines.caption')}</p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              icon={<Plus aria-hidden size={15} />}
              onClick={addLine}
            >
              {t('lines.add')}
            </Button>
          </header>

          {lines.length === 0 ? (
            <div className="p-5">
              <p className="text-body text-gray-700">{t('lines.emptyTitle')}</p>
              {/*
                Says which of the two sources is missing rather than showing an
                empty list of both. There is no unbilled time on this file, and
                there is no expense ledger anywhere — see the header.
              */}
              <p className="mt-1 text-caption text-gray-500">{t('lines.emptyTime')}</p>
              <p className="mt-2 text-caption text-gray-500">{t('lines.emptyExpenses')}</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {lines.map((line) => (
                <li key={line.key} className="flex flex-wrap items-end gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <label
                      htmlFor={`line-desc-${line.key}`}
                      className="block text-caption text-gray-500"
                    >
                      {t('lines.description')}
                    </label>
                    <Input
                      id={`line-desc-${line.key}`}
                      value={line.description}
                      onChange={(event) =>
                        updateLine(line.key, { description: event.target.value })
                      }
                      placeholder={t('lines.descriptionPlaceholder')}
                    />
                    {/*
                      The hours behind the line, shown so the person pricing it
                      can see what they are pricing. Nothing multiplies it.
                    */}
                    {line.minutes !== null ? (
                      <p className="mt-1 text-caption text-gray-500 [unicode-bidi:isolate]">
                        {t('lines.recorded', {
                          hours: Math.floor(line.minutes / 60),
                          minutes: line.minutes % 60,
                        })}
                      </p>
                    ) : (
                      <p className="mt-1 text-caption text-gray-500">{t('lines.noTime')}</p>
                    )}
                  </div>

                  <div className="w-36">
                    <label
                      htmlFor={`line-amount-${line.key}`}
                      className="block text-caption text-gray-500"
                    >
                      {t('lines.amount', { currency })}
                    </label>
                    <Input
                      id={`line-amount-${line.key}`}
                      type="number"
                      latinValue
                      min={0}
                      step="0.01"
                      inputMode="decimal"
                      value={line.amount}
                      onChange={(event) => updateLine(line.key, { amount: event.target.value })}
                      placeholder="0.00"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => removeLine(line.key)}
                    aria-label={t('lines.remove')}
                    title={t('lines.remove')}
                    className="mb-1.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-btn text-gray-500 hover:bg-gray-100 hover:text-error"
                  >
                    <Trash2 aria-hidden size={15} />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {lines.length > 0 ? (
            <footer className="flex flex-wrap items-baseline justify-between gap-3 border-t border-gray-200 bg-gray-50 p-5">
              <div className="min-w-0">
                <p className="text-caption text-gray-500">{t('lines.total')}</p>
                {unpriced > 0 ? (
                  <p className="mt-0.5 text-caption text-warning-text">
                    {t('lines.unpriced', { count: unpriced })}
                  </p>
                ) : null}
              </div>
              {/* Summed from the rows above. Mono and tabular — design.md §9. */}
              <p className="font-mono text-headline font-medium tabular-nums text-gray-900 [unicode-bidi:isolate]">
                {formatMoney(total, currency, locale)}
              </p>
            </footer>
          ) : null}
        </Card>
      ) : null}

      {error ? (
        <p role="alert" className="text-caption text-error">
          {t(`errors.${error}`)}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-xl text-caption text-gray-500">{t('beforeYouSave')}</p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            size="md"
            icon={<Send aria-hidden size={15} className="rtl:rotate-180" />}
            onClick={handleSendToClient}
            loading={pending}
            disabled={!engagementRef || lines.length === 0 || unpriced > 0}
          >
            {t('send')}
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="md"
            loading={pending}
            disabled={
              !engagementRef ||
              lines.length === 0 ||
              unpriced > 0
            }
          >
            {t('save')}
          </Button>
        </div>
      </div>
    </form>
  );
}

export default InvoiceBuilder;
