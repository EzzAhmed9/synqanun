import { Clock, Mail } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { cookies } from 'next/headers';
import { Card } from '@/components/ui';
import { Link } from '@/lib/i18n/navigation';
import { RESET_LINK_TTL_MINUTES, mockApi } from '@/lib/mock-api';
import { ResendEmailButton } from '@/components/auth/ResendEmailButton';

/**
 * Password reset, state 2 of 3 — check your email.
 *
 * A single narrow centred card, not the split layout of states 1 and 3.
 * design.md §5 reserves centring for empty states and modals; a screen whose
 * only content is "we have sent you something, go and look" is an empty state
 * in the strict sense — there is nothing here to do.
 *
 * THE ENVELOPE IS NOT THE FEATHER, deliberately. brand-guidelines.md §5 makes
 * the feather the mark for "the AI is present/acting", and nothing here is the
 * agent doing anything. A muted envelope in a gray-100 disc says what the
 * screen is about without turning a transactional wait into a brand moment.
 *
 * ---------------------------------------------------------------------------
 * NOT CARRIED OVER FROM THE STITCH EXPORT
 * ---------------------------------------------------------------------------
 *  · "Protected by privileged attorney-client credential policies (SHA-256
 *    standard)" — a cryptographic claim on a screen that has sent nothing.
 *  · "We've sent an ENCRYPTED password reset link" — dropped the adjective.
 *    Mail in transit is not encrypted in any sense the recipient controls, and
 *    the word does no work for the reader.
 *  · "request a refreshed authentication token below" — the control below is a
 *    button that says "Resend email". Describing it as a different thing in
 *    heavier words makes the screen harder to follow, not more serious.
 *  · The {{CLIENT_LOGO}} slot above the card.
 */
export default async function ResetSentPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  /*
    MOCK: the address is read from the demo account fixture, not carried from
    state 1.

    The real flow knows it from the server-side reset session. It must NOT
    arrive as a query parameter — that would put the user's email in the URL,
    in history, and in the referrer of anything this page links to, which is
    the defect already fixed on both gateway forms.
  */
  const cookieStore = await cookies();
  const resetToken = cookieStore.get('syn_reset_token')?.value || 'reset_demo_token';
  const account = await mockApi.passwordReset.resolveToken(resetToken);

  return <ResetSent email={account.email} />;
}

function ResetSent({ email }: { email: string }) {
  const t = useTranslations('passwordReset');

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-10">
      <div className="w-full max-w-[440px]">
        <Card padding="lg" className="text-center">
          <span className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-pill border border-gray-200 bg-gray-100 text-gray-600">
            <Mail aria-hidden size={22} strokeWidth={1.8} />
          </span>

          <h1 className="font-display text-heading text-gray-700">{t('sentHeading')}</h1>

          <p className="mt-2 text-body text-gray-600">
            {t.rich('sentBody', {
              email,
              // The address is a Latin run inside what may be an Arabic
              // sentence. Isolating it stops the bidi algorithm reordering the
              // local part and the domain around the @ — design.md §12.
              addr: (chunks) => (
                <span
                  dir="ltr"
                  className="font-mono text-reference text-gray-700 [unicode-bidi:isolate]"
                >
                  {chunks}
                </span>
              ),
            })}
          </p>

          {/* Start-aligned inside a centred card: design.md §7 forbids centred
              body copy, and this block is instructions, not a headline. */}
          <div className="mt-6 rounded-card border border-gray-200 bg-gray-100 p-3.5 text-start">
            <p className="inline-flex items-center gap-2 text-caption font-medium text-gray-700">
              <Clock aria-hidden size={14} strokeWidth={2} className="text-legal-navy" />
              {t('expiryTitle', { minutes: RESET_LINK_TTL_MINUTES })}
            </p>
            <p className="mt-1.5 text-caption text-gray-500">{t('expiryBody')}</p>
          </div>

          <div className="mt-6">
            <ResendEmailButton email={email} />
          </div>

          <p className="mt-4 border-t border-gray-200 pt-4 text-caption text-gray-500">
            <Link href="/gateway/client" className="font-medium text-legal-navy hover:underline">
              {t('backToSignIn')}
            </Link>
          </p>
        </Card>

        {/*
          Demo affordance, not part of the design. In the real flow the user
          reaches state 3 by clicking the link in their email; there is no mail
          here, so the prototype needs a visible way through. Delete this when
          the flow is driven by a real message.
        */}
        <p className="mt-4 text-center text-caption text-gray-500">
          <Link href="/reset/client/new" className="underline hover:text-gray-600">
            {t('demoOpenLink')}
          </Link>
        </p>
      </div>
    </main>
  );
}
