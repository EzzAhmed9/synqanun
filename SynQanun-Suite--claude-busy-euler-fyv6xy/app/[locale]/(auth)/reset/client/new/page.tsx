import { ShieldCheck } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { cookies } from 'next/headers';
import { NewPasswordForm } from '@/components/auth/NewPasswordForm';
import { Badge, Card } from '@/components/ui';
import { mockApi } from '@/lib/mock-api';

/**
 * Password reset, state 3 of 3 — set the new password.
 *
 * ---------------------------------------------------------------------------
 * NOT CARRIED OVER FROM THE STITCH EXPORT
 * ---------------------------------------------------------------------------
 *  · THE PREFILLED PASSWORDS — again. Both fields ship with
 *    `value="••••••••••••••••"`, sixteen literal bullet CHARACTERS as the
 *    value, so the field looks filled and submits sixteen bullets. Accept
 *    Invite's export did the same thing with a real-looking password. Both
 *    fields start empty.
 *
 *  · "Hardware entropy standard: Minimum 10 characters…" — the requirement is
 *    real, the label is invented. Nothing here involves a hardware entropy
 *    source, and PasswordStrength already states the rule in plain words next
 *    to the field it applies to, which is where a rule belongs.
 *
 *  · "Single-tenant isolation: Password hashes are salted and stored in an
 *    isolated client vault instance", "Single-tenant isolated instance",
 *    "SOC 2 Type II Certified", "Cryptographic Security Standards", and
 *    "Protected by privileged attorney-client credential policies (SHA-256
 *    standard)". Track A stores no password at all — there is no hash, salted
 *    or otherwise. brand-guidelines.md §6.
 *
 *  · THE EMOJI. The export uses a 🔒 glyph as an icon inside a coloured disc.
 *    BUILD_PLAN.md §1 fixes lucide-react as the single neutral icon set;
 *    an emoji renders differently on every platform and is not part of it.
 *
 *  · THE LAVENDER BADGE TINT and the {{CLIENT_LOGO}} slots, as on state 1.
 *
 * What the panel says instead is the one consequence the user actually needs
 * warning about: the old password stops working straight away.
 */
export default async function NewPasswordPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  /*
    MOCK: the token comes from the emailed link — /reset/client/new?token=… in
    the real flow — and must be verified server-side BEFORE this page renders
    anything, including the email address, which is itself a disclosure.

    A reset token in the URL is correct and unavoidable here: that is how an
    emailed link works. It is not the same defect as the sign-in forms, which
    were putting a password in the query string of a page the user was already
    on. The real implementation should still strip it from the address bar
    after exchanging it, so it does not linger in history.
  */
  const cookieStore = await cookies();
  const resetToken = cookieStore.get('syn_reset_token')?.value || 'reset_demo_token';
  const account = await mockApi.passwordReset.resolveToken(resetToken);

  return <NewPassword email={account.email} />;
}

function NewPassword({ email }: { email: string }) {
  const t = useTranslations('passwordReset');

  return (
    <main className="mx-auto w-full max-w-content flex-1 px-6 py-10">
      <div className="grid grid-cols-1 gap-8 desktop:grid-cols-12 desktop:gap-6">
        <div className="desktop:order-2 desktop:col-span-5">
          <Card padding="lg">
            <h1 className="font-display text-heading text-gray-700">{t('newHeading')}</h1>
            <p className="mt-1.5 text-body text-gray-600">{t('newSubtitle')}</p>
            <NewPasswordForm email={email} signInHref="/gateway/client" />
          </Card>
        </div>

        <div className="desktop:order-1 desktop:col-span-7">
          <Card padding="lg">
            <Badge
              tone="neutral"
              icon={<ShieldCheck aria-hidden size={13} strokeWidth={2.25} className="text-legal-navy" />}
            >
              {t('newPanelBadge')}
            </Badge>

            <h2 className="mt-4 font-display text-display text-gray-700">
              {t('newPanelHeading')}
            </h2>
            <p className="mt-3 text-body text-gray-600">{t('newPanelBody')}</p>
          </Card>
        </div>
      </div>
    </main>
  );
}
