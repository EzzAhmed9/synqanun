'use client';

import * as React from 'react';
import { ArrowRight, Check } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button, Card, Field, Input, Select, Textarea } from '@/components/ui';
import { Link, useRouter } from '@/lib/i18n/navigation';

/**
 * The form.
 *
 * Three fields, because a client in this product is three fields. The export
 * asks for fourteen — entity type, registered legal name, a logo, a primary
 * contact with title and direct line, a relationship partner, a governing
 * jurisdiction and a portal toggle — and the page header sets out which of
 * those the record cannot hold and why inventing a place for them would make
 * two screens disagree.
 *
 * NO FAKE SUCCESS. The export's own script is the clearest statement of what
 * this screen must not do: on submit it disables the button, shows
 * "Verifying & Initializing…" with a spinner for 1,200ms, then turns the
 * button green and says "Client Created! Redirecting…". Nothing is verified,
 * nothing is initialised and nothing is created. Here the button is pending
 * while a real write runs, and the panel that replaces the form says exactly
 * what now exists and what does not.
 */
export function AddClientForm({
  standings,
}: {
  standings: { value: string; label: string }[];
}) {
  const t = useTranslations('clients.add');
  const router = useRouter();

  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const [added, setAdded] = React.useState<{ id: string; name: string } | null>(null);

  const [name, setName] = React.useState('');
  const [summary, setSummary] = React.useState('');
  const [standing, setStanding] = React.useState('');

  const submit = (event: React.FormEvent) => {
    // Without this the browser posts the form and a prospective client's name
    // lands in the address bar before the firm has agreed to act for them.
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const { createClient } = await import('./create-client-action');
      const result = await createClient({ name, summary, standing });

      if (result.ok) {
        setAdded({ id: result.id, name: name.trim() });
        // The CRM behind this is server-rendered.
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  };

  /* ---- After it exists -------------------------------------------------- */
  if (added !== null) {
    return (
      <Card padding="lg">
        <div className="flex items-start gap-3">
          <span
            aria-hidden
            className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-success/10 text-success"
          >
            <Check size={16} />
          </span>
          <div className="min-w-0">
            <h2 className="font-sans text-title text-gray-900">{t('done.title')}</h2>
            <p className="mt-1 text-body text-gray-700">
              <bdi>{t('done.body', { name: added.name })}</bdi>
            </p>
          </div>
        </div>

        {/* What did NOT happen, listed where somebody would assume it had. */}
        <div className="mt-4 rounded-card border border-gray-300 bg-gray-100 p-4">
          <p className="text-caption font-medium text-gray-700">{t('done.notDoneTitle')}</p>
          <ul className="mt-2 flex flex-col gap-1 text-caption text-gray-600">
            <li>{t('done.noPortal')}</li>
            <li>{t('done.noConflict')}</li>
            <li>{t('done.noMail')}</li>
          </ul>
        </div>

        <div className="mt-4 rounded-card border border-gray-300 bg-gray-100 p-4">
          <p className="text-caption text-gray-600">{t('done.session')}</p>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Link href={`/staff/clients/${added.id}`}>
            <Button
              variant="primary"
              size="md"
              iconEnd={<ArrowRight aria-hidden size={15} className="rtl:rotate-180" />}
            >
              {t('done.open')}
            </Button>
          </Link>
          <Link href="/staff/clients">
            <Button variant="secondary" size="md">
              {t('done.list')}
            </Button>
          </Link>
        </div>
      </Card>
    );
  }

  /* ---- The form --------------------------------------------------------- */
  return (
    <Card padding="lg">
      <form onSubmit={submit} noValidate className="flex flex-col gap-5">
        <Field htmlFor="client-name" label={t('name')} hint={t('nameHint')}>
          <Input
            id="client-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={t('namePlaceholder')}
          />
        </Field>

        {/* The three values the type permits, passed in from the fixture so
            this component cannot offer a fourth. */}
        <Field htmlFor="client-standing" label={t('standing')} hint={t('standingHint')}>
          <Select
            id="client-standing"
            value={standing}
            onChange={(event) => setStanding(event.target.value)}
          >
            <option value="">{t('choose')}</option>
            {standings.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field htmlFor="client-summary" label={t('summary')} hint={t('summaryHint')}>
          <Textarea
            id="client-summary"
            rows={2}
            value={summary}
            onChange={(event) => setSummary(event.target.value)}
            placeholder={t('summaryPlaceholder')}
          />
        </Field>

        {error ? (
          <p role="alert" className="text-caption text-error">
            {t(`errors.${error}`)}
          </p>
        ) : null}

        <p className="rounded-card border border-warning/30 bg-warning/5 p-3 text-caption text-gray-700">
          {t('beforeYouAdd')}
        </p>

        <div className="flex flex-wrap justify-end gap-2">
          <Link href="/staff/clients">
            <Button variant="secondary" size="md" disabled={pending}>
              {t('cancel')}
            </Button>
          </Link>
          <Button type="submit" variant="primary" size="md" loading={pending}>
            {t('submit')}
          </Button>
        </div>
      </form>
    </Card>
  );
}

export default AddClientForm;
