import { redirect } from '@/lib/i18n/navigation';

/**
 * /onboarding has no screen of its own — the wizard starts at step 1.
 *
 * Using next-intl's locale-aware redirect rather than next/navigation's, so
 * /ar/onboarding lands on /ar/onboarding/branding and not the English route.
 */
export default async function OnboardingIndex({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect({ href: '/onboarding/branding', locale });
}
