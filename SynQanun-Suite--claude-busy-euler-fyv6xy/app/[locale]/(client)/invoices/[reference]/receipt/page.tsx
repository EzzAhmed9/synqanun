import { ArrowLeft, CheckCircle2, Download } from 'lucide-react';
import { notFound } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { Badge, Button, Card } from '@/components/ui';
import { formatCalendarDate, formatMoney } from '@/lib/format';
import { Link } from '@/lib/i18n/navigation';
import type { Locale } from '@/lib/i18n/routing';
import { mockApi } from '@/lib/mock-api';
import { ClientTopBar } from '../../../ClientPortalChrome';

/**
 * The receipt for an invoice the ledger already holds as settled.
 *
 * ===========================================================================
 * THIS IS A RECORD, NOT A CONFIRMATION — AND THAT IS THE WHOLE DECISION
 * ===========================================================================
 * The export is a "Payment successful" screen: the destination of the Pay now
 * button, reached the instant a card is submitted, announcing that a
 * transaction "has been processed and applied immediately to your active legal
 * billing account".
 *
 * That screen is not built, and it will not be, because it is the exact thing
 * refused five times already and once by explicit instruction: "Don't invent a
 * fake success state or silently redirect anywhere; leave the actual submit
 * action as a clear no-op." PaymentPanel.tsx already names this export's
 * contents in advance — the masked card, the bank transaction ID, the VAT
 * receipt in a vault — as what a confirmation screen would have to fabricate.
 * Pay now still ends in a notice saying nothing was charged.
 *
 * But there IS an honest screen hiding inside this export, and it is worth
 * having. The distinction is WHEN the claim is made and WHO made it:
 *
 *   · "Payment successful", shown immediately after submitting a card, asserts
 *     that THIS SYSTEM just took money. False, and nothing can make it true.
 *
 *   · "This invoice was settled on 14 February", shown against an invoice the
 *     ledger already records as paid, asserts that THE FIRM'S RECORDS SAY SO.
 *     That is true in exactly the sense that "INV-2026-089 is overdue" is
 *     true — both are read from the same ledger, and the portal is reporting
 *     rather than claiming.
 *
 * So this route only ever renders for an invoice that was ALREADY paid before
 * the client arrived, it is reached from the invoice detail rather than from a
 * payment form, and its heading says "Payment record" rather than "Payment
 * successful". Two of the five demo invoices qualify; the other three land on
 * the not-settled state below.
 *
 * It also clears a real debt: the detail view has shown a "Download receipt"
 * button since Batch 2 with a MOCK note and nothing behind it.
 *
 * WHAT THE LEDGER DOES NOT KNOW, AND SO IS NOT SHOWN
 * ---------------------------------------------------------------------------
 * The export lists a payment method ("Corporate Visa •••• 8842"), a bank
 * transaction ID ("TXN-9042-8812-ADGM") and a time of day ("14:32 GST"). The
 * fixture holds none of those — an invoice knows the day it was settled and
 * nothing else — so the receipt shows the day and stops. Inventing a card and a
 * transaction reference to fill a row is the same move as inventing an amount,
 * and a masked card number on screen also teaches a demo audience that this
 * portal keeps instruments on file, which the payment panel deliberately
 * refuses to imply.
 *
 * MOCK: the real receipt is issued by the payment provider, not assembled here.
 * It carries the provider's own reference, the instrument used, the settlement
 * timestamp from the provider's clock, and a downloadable document the firm's
 * accounts can reconcile against. The provider is Track B (BUILD_PLAN.md §6);
 * the storage and the route are Track A.5.
 *
 * ---------------------------------------------------------------------------
 * NOT CARRIED OVER FROM THE EXPORT
 * ---------------------------------------------------------------------------
 *  · "Client Trust Account #ADGM-9921" in the footer and "Settlement cleared
 *    via Client Trust Account" in the header pill. The escrow account, for the
 *    FOURTH time — after the invoice list, the invoice detail and the empty
 *    state. It was called the most important catch in this project, and it
 *    keeps coming back.
 *  · "An official VAT/tax receipt has been deposited in your Documents vault."
 *    Three claims in one line: a tax document this build deliberately does not
 *    produce (fixtures/invoices.ts settled that no tax line is better than a
 *    guessed one), a vault, and a file that was created and filed.
 *  · "End-to-end encrypted transaction • SHA-256 Verified Ledger" and
 *    "Privileged Client Enclave". Thirteenth screen for this category.
 *  · "Corporate Visa •••• 8842" and "TXN-9042-8812-ADGM" — see above.
 *  · "14:32 GST" — Gulf time on a Cairo firm, fifth instance of the
 *    wrong-jurisdiction pattern, and a precision the record does not have.
 *  · $12,500.00 against INV-2025-104, an invoice and amount from neither
 *    the fixtures nor the year the ledger uses.
 *  · ITS OWN HEADER AND FOOTER. The export renders this as a standalone page
 *    with a bespoke top bar and a second "Powered by SynQanun". It is a screen
 *    inside the portal, so it uses the portal's chrome.
 */

export const dynamic = 'force-dynamic';

export default async function InvoiceReceiptPage({
  params,
}: {
  params: Promise<{ locale: string; reference: string }>;
}) {
  const { locale, reference } = await params;
  setRequestLocale(locale);

  const invoice = await mockApi.invoices.getByReference(reference);
  if (!invoice) notFound();

  const typedLocale = locale as Locale;

  return (
    <Receipt
      reference={invoice.reference}
      description={invoice.description[typedLocale]}
      engagementRef={invoice.engagementRef}
      engagementTitle={invoice.engagementTitle[typedLocale]}
      engagementHref={
        invoice.engagementKind === 'matter'
          ? `/matters/${invoice.engagementRef}`
          : `/projects/${invoice.engagementRef}`
      }
      amountLabel={formatMoney(invoice.amount, invoice.currency, typedLocale)}
      issuedLabel={formatCalendarDate(invoice.issuedOn, typedLocale)}
      paidOn={invoice.paidOn}
      paidLabel={invoice.paidOn ? formatCalendarDate(invoice.paidOn, typedLocale) : null}
    />
  );
}

function Receipt({
  reference,
  description,
  engagementRef,
  engagementTitle,
  engagementHref,
  amountLabel,
  issuedLabel,
  paidOn,
  paidLabel,
}: {
  reference: string;
  description: string;
  engagementRef: string;
  engagementTitle: string;
  engagementHref: string;
  amountLabel: string;
  issuedLabel: string;
  paidOn: string | null;
  paidLabel: string | null;
}) {
  const t = useTranslations('receipt');

  return (
    <>
      <ClientTopBar title={t('title')} subtitle={reference} />

      <main className="mx-auto flex w-full max-w-content flex-1 flex-col gap-5 px-6 py-6">
        <Link
          href={`/invoices/${reference}`}
          className="inline-flex w-fit items-center gap-1.5 text-caption text-legal-navy hover:underline"
        >
          {/* Direction, not an object — mirrored in Arabic. design.md §12. */}
          <ArrowLeft aria-hidden size={14} className="rtl:rotate-180" />
          {t('back')}
        </Link>

        {/* Narrower than a full list: a receipt is one column of facts, and
            stretching it to the content width would leave the labels and their
            values at opposite ends of the screen. */}
        <Card padding="lg" className="w-full max-w-[34rem]">
          {paidOn && paidLabel ? (
            <>
              <div className="flex items-start gap-3 border-b border-gray-200 pb-4">
                {/* success, not syn-red: design.md §2 gives green to "completed
                    steps, confirmations", and this is a settled fact rather
                    than an action the client is being invited to take. */}
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-pill border border-success/25 bg-success/10 text-success">
                  <CheckCircle2 aria-hidden size={20} strokeWidth={1.9} />
                </span>

                <div className="min-w-0">
                  {/*
                    "Settled" — a statement about the ledger. NOT "Payment
                    successful", which is a statement about a transaction this
                    product did not carry out. See the header of this file.
                  */}
                  <h2 className="font-sans text-title text-gray-700">{t('settledHeading')}</h2>
                  <p className="mt-1 text-caption text-gray-500">
                    {t('settledBody', { date: paidLabel })}
                  </p>
                </div>
              </div>

              <dl className="mt-4 flex flex-col gap-3">
                <Row label={t('amount')}>
                  {/* Mono per design.md §3 and §9. Isolated but NOT
                      direction-forced — the Arabic form puts the ISO code after
                      the number with its own RTL mark. See lib/format.ts. */}
                  <span className="font-mono text-heading font-medium text-gray-900 [unicode-bidi:isolate]">
                    {amountLabel}
                  </span>
                </Row>

                <Row label={t('reference')}>
                  <span dir="ltr" className="font-mono text-reference text-gray-700">
                    {reference}
                  </span>
                </Row>

                <Row label={t('description')}>
                  <span className="text-gray-700">
                    <bdi>{description}</bdi>
                  </span>
                </Row>

                <Row label={t('engagement')}>
                  <Link href={engagementHref} className="text-legal-navy hover:underline">
                    <bdi>{engagementTitle}</bdi>
                  </Link>
                  <span
                    dir="ltr"
                    className="ms-2 font-mono text-reference text-gray-500 [unicode-bidi:isolate]"
                  >
                    {engagementRef}
                  </span>
                </Row>

                <Row label={t('issued')}>
                  <span className="text-gray-700 [unicode-bidi:isolate]">{issuedLabel}</span>
                </Row>

                <Row label={t('paid')}>
                  <time dateTime={paidOn} className="text-gray-700 [unicode-bidi:isolate]">
                    {paidLabel}
                  </time>
                </Row>
              </dl>

              {/*
                Said plainly, because a receipt is the one screen a client is
                most likely to forward to their own accounts department. The
                rows above are the firm's record; the rows a real receipt would
                add are named here rather than invented.
              */}
              <p className="mt-5 rounded-card border border-gray-200 bg-gray-50 p-4 text-caption text-gray-600">
                {t('ledgerNote')}
              </p>

              {/* MOCK: no document is generated in Track A — see the note at the
                  top of this file for what the real receipt carries. */}
              <Button
                variant="secondary"
                className="mt-4"
                icon={<Download aria-hidden size={15} />}
              >
                {t('download')}
              </Button>
            </>
          ) : (
            /*
              An unpaid invoice has no payment to record. Reached by editing the
              URL, or by an old link to an invoice that was never settled.

              A message rather than a 404: the invoice is real and it IS this
              client's, so pretending the address names nothing would be the
              wrong answer. The engagement 404s hide existence because they
              might be someone else's; this one has nothing to hide.
            */
            <>
              <h2 className="font-sans text-title text-gray-700">{t('notSettledHeading')}</h2>
              <p className="mt-2 text-body text-gray-600">{t('notSettledBody')}</p>

              <div className="mt-5">
                <Link href={`/invoices/${reference}`}>
                  <Button variant="secondary">{t('viewInvoice')}</Button>
                </Link>
              </div>
            </>
          )}
        </Card>
      </main>
    </>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b border-gray-100 pb-3 last:border-0 last:pb-0">
      <dt className="shrink-0 text-caption text-gray-500">{label}</dt>
      <dd className="min-w-0 text-end text-body">{children}</dd>
    </div>
  );
}
