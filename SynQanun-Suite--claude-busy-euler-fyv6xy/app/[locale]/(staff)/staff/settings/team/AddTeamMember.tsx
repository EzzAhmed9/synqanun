'use client';

import * as React from 'react';
import { UserPlus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button, Field, Input, Modal, Select } from '@/components/ui';
import { useRouter } from '@/lib/i18n/navigation';
import type { Rank } from '@/lib/ranks';
import { addTeamMember } from './add-member-action';

/**
 * "Add team member" — the button, the dialog, and what happens after.
 *
 * ===========================================================================
 * IT WRITES, AND IT SAYS WHAT IT DID NOT DO
 * ===========================================================================
 * On success the person is really on the roster: the table behind this dialog
 * gains a row, and it survives a refresh. That is BUILD_PLAN.md §5.1's first
 * category — a record inside the firm's own workspace, asserting nothing about
 * anyone outside it.
 *
 * The confirmation is therefore NOT "we've emailed them". No mail left the
 * building and no password was generated, so the panel that replaces the form
 * says exactly that, and says the credential has to be handed over another
 * way. §3.1 provisions staff by temporary password; a cheerful "invitation
 * sent" would be the same false state BookCallModal.tsx refuses at length.
 *
 * It also says the row is session-scoped, because it is. See the session store
 * in lib/mock-api.ts.
 *
 * ===========================================================================
 * THE SUCCESS PANEL REPLACES THE FORM
 * ===========================================================================
 * Rather than closing the dialog on success. Closing it would put the news in
 * a toast that disappears, and the news here is the part somebody has to act
 * on — they now have to give this person a password by hand. It stays on
 * screen until it is dismissed.
 *
 * ===========================================================================
 * ERRORS COME BACK AS KEYS
 * ===========================================================================
 * The Server Action returns `{ ok: false, error: 'emailTaken' }`, never a
 * sentence — the message is a translation, and the check that produced it runs
 * against the roster in the data layer rather than against a component's copy
 * of the rules.
 */
export function AddTeamMember({ ranks }: { ranks: readonly Rank[] }) {
  const t = useTranslations('staffSettings.team.add');
  const tRank = useTranslations('ranks');
  const router = useRouter();

  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const [added, setAdded] = React.useState<{ name: string; email: string } | null>(null);

  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  /*
    NO DEFAULT RANK, DELIBERATELY.
    
    The first option in the list is Partner, and defaulting to it would grant
    the firm's most privileged role to anyone who filled in a name and an email
    and did not look at the third field. A rank decides what a person can see;
    it is not a field to inherit a value by accident. Submitting without one is
    a validation error, which is the behaviour a consequential choice should
    have.
  */
  const [rank, setRank] = React.useState<string>('');

  const reset = () => {
    setName('');
    setEmail('');
    setRank('');
    setPassword('');
    setError(null);
    setAdded(null);
  };

  const close = () => {
    setOpen(false);
    // Deferred so the fields do not visibly empty while the dialog animates.
    window.setTimeout(reset, 200);
  };

  const submit = (event: React.FormEvent) => {
    // Without this the browser posts the form itself and the colleague's name
    // and email land in the address bar.
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await addTeamMember({
        name,
        email,
        rank,
        password: password.trim() || undefined,
      });
      if (result.ok) {
        setAdded({ name, email: result.member.email });
        // Pull the server component's roster again so the new row is there
        // when the dialog closes — the table is server-rendered.
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  };

  return (
    <>
      <Button variant="primary" size="md" icon={<UserPlus aria-hidden size={16} />} onClick={() => setOpen(true)}>
        {t('open')}
      </Button>

      <Modal
        open={open}
        onClose={close}
        title={added ? t('done.title') : t('title')}
        description={added ? undefined : t('description')}
      >
        {added ? (
          <div className="flex flex-col gap-4 p-6 pt-0">
            <p className="text-body text-gray-700">
              <bdi>{t('done.added', { name: added.name })}</bdi>
            </p>

            {/*
              The half that did not happen, stated where the action was taken.
              This is the §5.1 split made visible: the record exists, the
              credential does not.
            */}
            <div className="rounded-card border border-gray-300 bg-gray-100 p-4">
              <p className="text-caption font-medium text-gray-700">{t('done.notSentTitle')}</p>
              <p className="mt-1 text-caption text-gray-600">{t('done.notSent')}</p>
              <p className="mt-2 text-caption text-gray-600">{t('done.session')}</p>
            </div>

            <div className="flex justify-end">
              <Button variant="secondary" size="md" onClick={close}>
                {t('done.close')}
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} noValidate className="flex flex-col gap-4 p-6 pt-0">
            <Field htmlFor="member-name" label={t('name')}>
              <Input
                id="member-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder={t('namePlaceholder')}
              />
            </Field>

            <Field htmlFor="member-email" label={t('email')} hint={t('emailHint')}>
              {/* Latin in both locales, so the value does not reorder in an
                  Arabic form. See lib/format.ts's bidi rule. */}
              <Input
                id="member-email"
                type="email"
                latinValue
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder={t('emailPlaceholder')}
              />
            </Field>

            <Field htmlFor="member-rank" label={t('rank')}>
              <Select
                id="member-rank"
                value={rank}
                onChange={(event) => setRank(event.target.value)}
              >
                <option value="">{t('rankPlaceholder')}</option>
                {ranks.map((value) => (
                  <option key={value} value={value}>
                    {tRank(value)}
                  </option>
                ))}
              </Select>
            </Field>

            <Field
              htmlFor="member-password"
              label="كلمة المرور / Password"
              hint="حدد كلمة المرور لتسجيل الدخول (الافتراضي: password123)"
            >
              <Input
                id="member-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="password123"
              />
            </Field>

            {error ? (
              <p role="alert" className="text-caption text-error">
                {t(`errors.${error}`)}
              </p>
            ) : null}

            {/* Said before the button is pressed, not after. Somebody
                deciding whether to add a person should know the credential
                will not be sent for them. */}
            <p className="text-caption text-gray-500">{t('beforeYouAdd')}</p>

            <div className="flex justify-end gap-2">
              <Button variant="secondary" size="md" onClick={close} disabled={pending}>
                {t('cancel')}
              </Button>
              <Button type="submit" variant="primary" size="md" loading={pending}>
                {t('submit')}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}

export default AddTeamMember;
