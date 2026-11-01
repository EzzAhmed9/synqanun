'use client';

import * as React from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Card, Field, Input } from '@/components/ui';
import { localeLabels, type Locale } from '@/lib/i18n/routing';
import { SaveRow } from './SaveRow';

/**
 * Profile — the client's own contact details, plus the facts about how the
 * portal is localised for them.
 *
 * WHAT IS EDITABLE AND WHAT IS NOT
 * ---------------------------------------------------------------------------
 * Name, role and phone are the account holder's own description of themselves,
 * so they are fields. Two things are not:
 *
 *   · THE ORGANISATION. It is the firm's record of who instructed them, and it
 *     appears on invoices and filings. A client renaming their own entity in a
 *     law firm's records is not a preference. The export calls this "Locked",
 *     which is right; what is missing is saying who can change it, so the hint
 *     does.
 *
 *   · THE EMAIL. It is the sign-in address. Letting it be typed over in a
 *     settings form, with no verification step and no confirmation to the old
 *     address, is how an account gets taken over — and the export pairs the
 *     editable field with a green "Verified" badge, which is the claim that
 *     makes it worse rather than better. Read-only, with a line saying how it
 *     actually changes.
 *
 * NO PHOTO UPLOAD. The export offers "Change Photo" with a 5MB limit and a
 * recommended 400×400. There is no file storage in Track A and none scheduled
 * before Track A.5, and the avatar everywhere else in this portal is initials —
 * see lib/utils.ts `initialsOf`, and brand-guidelines.md §5 on why a human's
 * avatar is never the feather.
 */

export interface ProfilePanelProps {
  name: string;
  title: string;
  phone: string;
  email: string;
  organisation: string;
}

export function ProfilePanel(initial: ProfilePanelProps) {
  const t = useTranslations('settings.profile');
  const locale = useLocale() as Locale;

  const [name, setName] = React.useState(initial.name);
  const [title, setTitle] = React.useState(initial.title);
  const [phone, setPhone] = React.useState(initial.phone);
  const [attempted, setAttempted] = React.useState(false);

  const dirty =
    name !== initial.name || title !== initial.title || phone !== initial.phone;

  function discard() {
    setName(initial.name);
    setTitle(initial.title);
    setPhone(initial.phone);
    setAttempted(false);
  }

  return (
    <div className="flex flex-col gap-6">
      <Card padding="lg">
        <div className="border-b border-gray-200 pb-3">
          <h2 className="font-sans text-title text-gray-700">{t('heading')}</h2>
          <p className="mt-0.5 text-caption text-gray-500">{t('caption')}</p>
        </div>

        {/*
          No <form>. There is nothing to submit — SaveRow's button is a plain
          button, not a submit — so there is no default GET to suppress and
          nothing that could serialise a phone number into the query string.
          The Client Gateway's bug is avoided by not creating the surface for it.
        */}
        <div className="mt-5 grid grid-cols-1 gap-5 tablet:grid-cols-2">
          <Field htmlFor="profile-name" label={t('name')}>
            <Input
              id="profile-name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="name"
            />
          </Field>

          <Field htmlFor="profile-title" label={t('title')} hint={t('titleHint')}>
            <Input
              id="profile-title"
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              autoComplete="organization-title"
            />
          </Field>

          <Field htmlFor="profile-phone" label={t('phone')}>
            {/* `latinValue` forces the VALUE to LTR while the label stays in the
                interface direction — a dialling code and number is Latin in both
                locales and must not reorder in an RTL form. */}
            <Input
              id="profile-phone"
              type="tel"
              inputMode="tel"
              latinValue
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              autoComplete="tel"
            />
          </Field>

          <Field htmlFor="profile-email" label={t('email')} hint={t('emailHint')}>
            <Input id="profile-email" type="email" value={initial.email} readOnly latinValue />
          </Field>

          <Field
            htmlFor="profile-organisation"
            label={t('organisation')}
            hint={t('organisationHint')}
            className="tablet:col-span-2"
          >
            <Input
              id="profile-organisation"
              type="text"
              value={initial.organisation}
              readOnly
            />
          </Field>
        </div>

        <SaveRow
          dirty={dirty}
          attempted={attempted}
          onSave={() => setAttempted(true)}
          onDiscard={discard}
        />
      </Card>

      {/* Language and region --------------------------------------------- */}
      <Card padding="lg">
        <div className="border-b border-gray-200 pb-3">
          <h2 className="font-sans text-title text-gray-700">{t('region.heading')}</h2>
          <p className="mt-0.5 text-caption text-gray-500">{t('region.caption')}</p>
        </div>

        {/*
          FACTS, NOT CONTROLS — and this is the one place the export contradicts
          design.md outright rather than merely overreaching.

            · LANGUAGE. §12: "Language toggle lives in the top nav, persistent,
              NEVER BURIED IN A SETTINGS SCREEN." The export buries it here as a
              radio group, which would also be a second control over a value the
              top bar already owns — two switches for one setting, free to
              disagree. This states which language is active and points at the
              toggle.

            · TIME ZONE. The export offers a picker (Gulf / Riyadh / London). A
              hearing listed for 14 March is on 14 March in the court's
              jurisdiction; it does not become 13 March because the reader moved.
              That is the whole calendar-date model in lib/format.ts, and a
              client-settable zone would either do nothing or break it. Stated,
              not offered.

            · NUMERALS. The export offers Arabic-Indic (٠–٩) as an alternative.
              §12 requires Western digits in BOTH languages — standard in
              Egyptian and Gulf legal and financial documents — so the choice
              the export offers is one the design has already made.
        */}
        <dl className="mt-5 flex flex-col gap-4">
          <Fact label={t('region.language')} value={localeLabels[locale]} hint={t('region.languageHint')} />
          <Fact label={t('region.dates')} value={t('region.datesValue')} hint={t('region.datesHint')} />
          <Fact label={t('region.numerals')} value={t('region.numeralsValue')} hint={t('region.numeralsHint')} />
        </dl>
      </Card>
    </div>
  );
}

function Fact({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-caption text-gray-500">{label}</dt>
      <dd className="text-body text-gray-700">{value}</dd>
      <dd className="text-caption text-gray-500">{hint}</dd>
    </div>
  );
}

export default ProfilePanel;
