'use client';

import * as React from 'react';
import { ArrowRight, Check } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button, Card, Field, Input, Select, Textarea } from '@/components/ui';
import { Link, useRouter } from '@/lib/i18n/navigation';
import { MATTER_WORK_TYPES } from '@/lib/matter-work-types';

/**
 * The form itself.
 *
 * ===========================================================================
 * ONE STEP, BECAUSE THE SECOND ONE WOULD BE A LIE
 * ===========================================================================
 * The Stitch export makes this a two-step flow ending in an "AI Conflict Check
 * Screening" gate. A conflicts register exists now and the gate is still
 * refused — the page header explains why having data changed what a search can
 * find without changing who decides. So the form opens the matter, and the
 * confirmation says plainly that no check ran here and points at the screen
 * where one is run.
 *
 * ===========================================================================
 * PICKERS WHERE THE ARABIC MATTERS, TEXT WHERE IT CANNOT
 * ===========================================================================
 * Client, practice area, forum and lead are chosen from what the firm already
 * has, so each arrives carrying both locales — picked from a record that had
 * them. Title and scope are free text and can only ever hold what was typed,
 * which is why the form says so before it is submitted rather than leaving an
 * Arabic reader to find a stray English line on their own file.
 *
 * ===========================================================================
 * THE REFERENCE IS NOT SHOWN BEFOREHAND
 * ===========================================================================
 * The export displays "AI Case Identifier: MAT-2205 — Auto-Generated" above
 * the empty form, which reserves a file number for a matter that may never be
 * created. It is generated on save and appears in the confirmation.
 */
export function NewMatterForm({
  clients,
  practiceAreas,
  forums,
  leads,
}: {
  clients: { value: string; label: string }[];
  practiceAreas: { value: string; label: string }[];
  forums: { value: string; label: string }[];
  leads: { value: string; label: string }[];
}) {
  const t = useTranslations('staffMatters.new');
  const tType = useTranslations('staffMatters.types');
  const router = useRouter();

  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const [opened, setOpened] = React.useState<string | null>(null);

  const [title, setTitle] = React.useState('');
  const [workType, setWorkType] = React.useState('');
  const [clientId, setClientId] = React.useState('');
  const [practiceArea, setPracticeArea] = React.useState('');
  const [forum, setForum] = React.useState('');
  const [leadId, setLeadId] = React.useState('');
  const [scope, setScope] = React.useState('');

  const submit = (event: React.FormEvent) => {
    // Without this the browser posts the form and a client's name, the
    // practice area and the scope all land in the address bar.
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      // Imported lazily so the action's module is not pulled into the bundle
      // for a reader who only ever looks at the page.
      const { createMatter } = await import('./create-matter-action');
      const result = await createMatter({
        title,
        workType,
        clientId,
        practiceArea,
        forum,
        leadId,
        scope,
      });

      if (result.ok) {
        setOpened(result.reference);
        // The register behind this is server-rendered; pull it again so the
        // new row is there when the reader navigates back to it.
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  };

  /* ---- After it is open ------------------------------------------------ */
  if (opened !== null) {
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
            {/*
              The reference ends the sentence in both locales, so it is
              appended rather than interpolated — no rich-text threading, and
              it keeps the mono treatment every reference in this product has.
              Isolated because it is Latin inside an Arabic sentence.
            */}
            <p className="mt-1 text-body text-gray-700 [unicode-bidi:isolate]">
              {t('done.body')}{' '}
              <span dir="ltr" className="font-mono text-reference text-legal-navy">
                {opened}
              </span>
            </p>
          </div>
        </div>

        {/*
          The check that did not happen, stated where the matter was opened.
          A file is exactly where somebody would assume it had been cleared.
        */}
        <div className="mt-4 rounded-card border border-warning/30 bg-warning/5 p-4">
          <p className="text-caption font-medium text-gray-700">{t('done.noConflictTitle')}</p>
          <p className="mt-1 text-caption text-gray-600">{t('done.noConflict')}</p>
        </div>

        <div className="mt-4 rounded-card border border-gray-300 bg-gray-100 p-4">
          <p className="text-caption text-gray-600">{t('done.session')}</p>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Link href={`/staff/matters/${opened}`}>
            <Button variant="primary" size="md" iconEnd={<ArrowRight aria-hidden size={15} className="rtl:rotate-180" />}>
              {t('done.open')}
            </Button>
          </Link>
          <Link href="/staff/matters">
            <Button variant="secondary" size="md">
              {t('done.register')}
            </Button>
          </Link>
        </div>
      </Card>
    );
  }

  /*
    ===========================================================================
    A MATTER NEEDS A CLIENT, SO WITH NO CLIENTS THERE IS NO FORM TO FILL IN
    ===========================================================================
    Without this the form rendered anyway: a client dropdown holding nothing but
    its own placeholder, every other field live, and a submit button disabled
    for a reason nothing on screen gave. The reader is left to work out that the
    dependency is the client list and that the fix is on a different screen.

    So the form is ABSENT rather than present-and-dead — the same rule the nav
    and the bulk bar follow for a control somebody cannot use — and it points at
    the screen that unblocks it, which is built.

    This is the product's genuine first-run state: a new tenant has no clients,
    and "open a matter" is the thing they will reach for first.
  */
  if (clients.length === 0) {
    return (
      <Card padding="lg">
        <p className="text-body font-medium text-gray-700">{t('noClients.title')}</p>
        <p className="mt-1 text-caption text-gray-500">{t('noClients.body')}</p>
        <div className="mt-4">
          <Link href="/staff/clients/new">
            <Button variant="primary" size="md">
              {t('noClients.action')}
            </Button>
          </Link>
        </div>
      </Card>
    );
  }

  /* ---- The form -------------------------------------------------------- */
  return (
    <Card padding="lg">
      <form onSubmit={submit} noValidate className="flex flex-col gap-5">
        <Field htmlFor="matter-title" label={t('title')} hint={t('titleHint')}>
          <Input
            id="matter-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={t('titlePlaceholder')}
          />
        </Field>

        {/* Required: the register files every matter under one of the
            client's five kinds of work — lib/matter-work-types.ts. */}
        <Field htmlFor="matter-type" label={t('workType')} hint={t('workTypeHint')}>
          <Select
            id="matter-type"
            required
            aria-required="true"
            value={workType}
            onChange={(event) => setWorkType(event.target.value)}
          >
            <option value="">{t('choose')}</option>
            {MATTER_WORK_TYPES.map((value) => (
              <option key={value} value={value}>
                {tType(value)}
              </option>
            ))}
          </Select>
        </Field>

        <div className="grid grid-cols-1 gap-5 tablet:grid-cols-2">
          <Field htmlFor="matter-client" label={t('client')}>
            <Select
              id="matter-client"
              value={clientId}
              onChange={(event) => setClientId(event.target.value)}
            >
              <option value="">{t('choose')}</option>
              {clients.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>

          <Field htmlFor="matter-lead" label={t('lead')} hint={t('leadHint')}>
            <Select
              id="matter-lead"
              value={leadId}
              onChange={(event) => setLeadId(event.target.value)}
            >
              <option value="">{t('choose')}</option>
              {leads.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>

          {/* Both lists are the firm's own, so no option can be a category
              this practice does not work in. */}
          <Field htmlFor="matter-area" label={t('practiceArea')} hint={t('derivedHint')}>
            <Select
              id="matter-area"
              value={practiceArea}
              onChange={(event) => setPracticeArea(event.target.value)}
            >
              <option value="">{t('choose')}</option>
              {practiceAreas.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>

          <Field htmlFor="matter-forum" label={t('forum')} hint={t('derivedHint')}>
            <Select
              id="matter-forum"
              value={forum}
              onChange={(event) => setForum(event.target.value)}
            >
              <option value="">{t('choose')}</option>
              {forums.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field htmlFor="matter-scope" label={t('scope')} hint={t('scopeHint')}>
          <Textarea
            id="matter-scope"
            rows={3}
            value={scope}
            onChange={(event) => setScope(event.target.value)}
            placeholder={t('scopePlaceholder')}
          />
        </Field>

        {error ? (
          <p role="alert" className="text-caption text-error">
            {t(`errors.${error}`)}
          </p>
        ) : null}

        {/* Said before the button is pressed. Somebody about to take on a
            client should know the screen has not checked anything. */}
        <p className="rounded-card border border-warning/30 bg-warning/5 p-3 text-caption text-gray-700">
          {t('beforeYouOpen')}
        </p>

        <div className="flex flex-wrap justify-end gap-2">
          <Link href="/staff/matters">
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

export default NewMatterForm;
