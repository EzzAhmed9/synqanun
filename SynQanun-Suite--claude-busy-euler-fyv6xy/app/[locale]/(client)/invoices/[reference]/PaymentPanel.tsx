'use client';

import * as React from 'react';
import { CreditCard, Info } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button, Card, Field, Input } from '@/components/ui';

/**
 * "Pay now", and the payment fields it reveals inline underneath itself.
 *
 * THE SUBMIT GOES NOWHERE, ON PURPOSE, AND SAYS SO
 * ---------------------------------------------------------------------------
 * Payment confirmation is a BATCH 3 screen (BUILD_PLAN.md §3) and there is no
 * payment provider behind any of this. So pressing the settle button does one
 * thing: it says the flow is not built. It does not fake a receipt, it does not
 * navigate anywhere, and it does not pretend to have charged anything — a
 * prototype that shows a client a success screen for money it never took is
 * worse than one that admits the gap.
 *
 * The export does exactly that: its confirmation screen states an amount, a
 * masked card, a bank transaction ID ("TXN-9042-8812-ADGM"), a timestamp, and
 * "An official VAT/tax receipt has been deposited in your Documents vault" —
 * a receipt, in a vault, for a payment that did not happen.
 *
 * THE onSubmit IS LOAD-BEARING
 * ---------------------------------------------------------------------------
 * This is the one real <form> in the client portal, and it holds card fields.
 * The Client Gateway shipped a form with no `onSubmit`, which meant submitting
 * it performed a full-page GET and put the typed email and password in the
 * query string. The same omission here would put a card number in the URL, in
 * browser history, and in the Referer header of the next outbound request.
 *
 * So: `onSubmit` preventDefaults unconditionally, no `action` and no `method`
 * are set, no field carries a `name`, and every field is `autoComplete="off"`
 * so the browser is not invited to store or refill any of it either. Nothing
 * typed here leaves the component — there is no state read anywhere else in the
 * tree, and no request is ever made.
 *
 * NOT CARRIED OVER FROM THE EXPORT
 * ---------------------------------------------------------------------------
 *  · PREFILLED CARD DETAILS — "4532 •••• •••• 4092", a CVV of "882", an expiry,
 *    a cardholder name and a full billing address, all hardcoded into the
 *    markup. Fabricated, and it teaches a demo audience that the portal keeps
 *    card numbers on file.
 *  · "256-bit TLS encrypted transaction processed directly under DFSA & Central
 *    Bank of the UAE regulatory sandbox", "بوابة دفع آمنة 256-bit", and the
 *    "Verified Escrow" badge. No transport claim, no regulator and no escrow
 *    are earned here.
 *  · THE THREE PAYMENT-METHOD TABS (card / wire / UAE PASS / Aani). Two of the
 *    three lead to bank details that do not exist; one method is enough to show
 *    the shape of the flow.
 */

export interface PaymentPanelProps {
  /** Formatted for the locale — the button states what it would settle. */
  amountLabel: string;
}

export function PaymentPanel({ amountLabel }: PaymentPanelProps) {
  const t = useTranslations('invoices.detail.pay');

  const [open, setOpen] = React.useState(false);
  const [attempted, setAttempted] = React.useState(false);
  const panelRef = React.useRef<HTMLDivElement>(null);

  function reveal() {
    setOpen(true);
    // The fields appear below the fold on a short window, so bring them into
    // view. Instant rather than smooth: the distance is small and a smooth
    // scroll here competes with the focus move.
    requestAnimationFrame(() => panelRef.current?.scrollIntoView({ block: 'nearest' }));
  }

  return (
    <Card padding="lg">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-gray-200 pb-3">
        <h2 className="font-sans text-title text-gray-700">{t('heading')}</h2>
      </div>

      <p className="mt-3 text-body text-gray-600">{t('body')}</p>

      {!open ? (
        /*
          The ONE syn-red primary on this view. design.md §2: red is the human's
          own action, and settling a fee statement is entirely theirs. §4 spends
          it once — which is why the list's rows link here instead of each
          carrying a "Pay now" of their own.
        */
        <Button
          variant="primary"
          className="mt-4"
          icon={<CreditCard aria-hidden size={15} />}
          onClick={reveal}
        >
          {t('cta', { amount: amountLabel })}
        </Button>
      ) : (
        <div ref={panelRef} className="mt-4">
          {/* Stated before a single field, not after the fact. */}
          <div className="flex items-start gap-2.5 rounded-card border border-info/25 bg-info/10 p-4">
            <Info aria-hidden size={15} strokeWidth={2} className="mt-0.5 shrink-0 text-info" />
            <div>
              <p className="text-caption font-medium text-info">{t('noticeTitle')}</p>
              <p className="mt-1 text-caption text-gray-600">{t('noticeBody')}</p>
            </div>
          </div>

          <form
            // No `action`, no `method`, and preventDefault below. See the note
            // at the top of this file — without it this is a GET that puts a
            // card number in the URL.
            onSubmit={(event) => {
              event.preventDefault();
              setAttempted(true);
            }}
            autoComplete="off"
            className="mt-4 flex flex-col gap-4"
          >
            <Field htmlFor="pay-name" label={t('nameLabel')}>
              <Input
                id="pay-name"
                type="text"
                autoComplete="off"
                placeholder={t('namePlaceholder')}
              />
            </Field>

            <Field htmlFor="pay-card" label={t('cardLabel')}>
              {/* `latinValue` forces the VALUE to LTR while the label above
                  stays in the interface direction — a card number is Latin in
                  both locales and must not reorder in an RTL form. The prop
                  exists on <Input> for exactly this case. */}
              <Input
                id="pay-card"
                type="text"
                inputMode="numeric"
                latinValue
                autoComplete="off"
                placeholder="0000 0000 0000 0000"
              />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field htmlFor="pay-expiry" label={t('expiryLabel')}>
                <Input
                  id="pay-expiry"
                  type="text"
                  inputMode="numeric"
                  latinValue
                  autoComplete="off"
                  placeholder={t('expiryPlaceholder')}
                />
              </Field>

              <Field htmlFor="pay-code" label={t('codeLabel')}>
                <Input
                  id="pay-code"
                  type="text"
                  inputMode="numeric"
                  latinValue
                  autoComplete="off"
                  placeholder="000"
                />
              </Field>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" variant="primary" icon={<CreditCard aria-hidden size={15} />}>
                {t('submit', { amount: amountLabel })}
              </Button>
              <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
                {t('cancel')}
              </Button>
            </div>

            {/* The "clear no-op": pressing settle says what happened, which is
                nothing, and where the flow actually lands. Not a success state,
                and not a silent redirect. */}
            {attempted ? (
              <p role="status" className="text-caption text-gray-600">
                {t('notBuilt')}
              </p>
            ) : null}
          </form>
        </div>
      )}
    </Card>
  );
}

export default PaymentPanel;
