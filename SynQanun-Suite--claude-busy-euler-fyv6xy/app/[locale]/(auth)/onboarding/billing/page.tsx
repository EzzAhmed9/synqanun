'use client';

import * as React from 'react';
import { CreditCard } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useOnboarding } from '@/components/onboarding/OnboardingProvider';
import { WizardShell } from '@/components/onboarding/WizardShell';
import {
  Badge,
  Button,
  Card,
  Field,
  Input,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '@/components/ui';
import { CURRENCIES, RANKS, type Currency, type Rank } from '@/lib/ranks';

/**
 * Step 4 — billing setup.
 *
 * NO DATE OR TIME FIELD EXISTS ON THIS STEP, so no timezone handling is
 * involved. The step as specified is currency, per-rank hourly rates, and a
 * payment gateway placeholder — none of which is a moment in time. That was
 * checked rather than assumed, and a date field was deliberately not invented
 * just to have one. When Batch 6's invoice builder introduces real issue and
 * due dates, they need the explicit-timezone treatment the Accept Invite
 * expiry already uses: formatting in the runtime's zone drifts by a day near
 * midnight and desynchronises the server and client renders.
 *
 * Amounts use Western digits in both languages — design.md §12, standard in
 * Egyptian and GCC legal and financial documents.
 */
export default function BillingStep() {
  const t = useTranslations('onboarding.billing');
  const { billing, setBilling } = useOnboarding();

  function setRate(rank: Rank, raw: string) {
    // Digits only. An hourly rate is a plain number; letting anything else in
    // means the review step has to decide what a non-numeric rate means.
    const digits = raw.replace(/[^\d]/g, '');
    setBilling({ rates: { ...billing.rates, [rank]: digits === '' ? 0 : Number(digits) } });
  }

  return (
    <WizardShell step="billing" title={t('title')}>
      <div className="flex flex-col gap-6">
        <Card padding="lg">
          <h2 className="text-title text-gray-700">{t('currencyTitle')}</h2>
          <p className="mt-1 text-caption text-gray-500">{t('currencyBody')}</p>

          <div className="mt-4 max-w-[240px]">
            <Field htmlFor="billing-currency" label={t('currency')}>
              <Select
                id="billing-currency"
                value={billing.currency}
                onChange={(e) => setBilling({ currency: e.target.value as Currency })}
              >
                {CURRENCIES.map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        </Card>

        <Card padding="lg">
          <h2 className="text-title text-gray-700">{t('ratesTitle')}</h2>
          <p className="mt-1 text-caption text-gray-500">{t('ratesBody')}</p>

          <div className="mt-4">
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>{t('rankColumn')}</TableHeaderCell>
                  <TableHeaderCell numeric>
                    {t('rateColumn')} ({billing.currency})
                  </TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {RANKS.map((rank) => (
                  <RateRow
                    key={rank}
                    rank={rank}
                    currency={billing.currency}
                    value={billing.rates[rank]}
                    onChange={(raw) => setRate(rank, raw)}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>

        <Card padding="lg">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm border border-gray-200 bg-gray-50 text-legal-navy">
                <CreditCard aria-hidden size={16} />
              </span>
              <span className="min-w-0">
                <span className="block text-title text-gray-700">{t('gatewayTitle')}</span>
                <span className="mt-0.5 block text-caption text-gray-500">{t('gatewayBody')}</span>
              </span>
            </div>
            <Badge tone={billing.gatewayConnected ? 'success' : 'neutral'}>
              {billing.gatewayConnected ? t('gatewayConnected') : t('gatewayNotConnected')}
            </Badge>
          </div>

          <div className="mt-4">
            {/* legal-navy, like the other integrations: connecting a gateway
                hands off to the provider's own flow. design.md §2.
                MOCK: real payment gateway onboarding is Track B — it needs
                provider business verification, not just an API call. */}
            <Button
              variant={billing.gatewayConnected ? 'secondary' : 'ai'}
              size="sm"
              onClick={() => setBilling({ gatewayConnected: !billing.gatewayConnected })}
            >
              {billing.gatewayConnected ? t('gatewayNotConnected') : t('gatewayConnect')}
            </Button>
          </div>
        </Card>
      </div>
    </WizardShell>
  );
}

function RateRow({
  rank,
  currency,
  value,
  onChange,
}: {
  rank: Rank;
  currency: Currency;
  value: number;
  onChange: (raw: string) => void;
}) {
  const t = useTranslations('onboarding.billing');
  const tRanks = useTranslations('ranks');
  const id = `rate-${rank}`;

  return (
    <TableRow>
      <TableCell>
        <label htmlFor={id}>{tRanks(rank)}</label>
      </TableCell>
      <TableCell numeric className="py-1.5">
        <div className="flex justify-end">
          <Input
            id={id}
            // `inputMode` gives touch keyboards the numeric pad without the
            // spinner and locale-parsing surprises of type="number".
            inputMode="numeric"
            value={String(value)}
            onChange={(e) => onChange(e.target.value)}
            aria-label={t('rateFor', { rank: tRanks(rank) })}
            latinValue
            className="h-9 max-w-[140px] text-end font-mono"
          />
          <span className="sr-only">{currency}</span>
        </div>
      </TableCell>
    </TableRow>
  );
}
