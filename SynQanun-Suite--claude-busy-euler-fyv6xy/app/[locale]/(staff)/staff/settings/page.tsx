import { setRequestLocale } from 'next-intl/server';
import { redirect } from '@/lib/i18n/navigation';
import { mockApi } from '@/lib/mock-api';
import { firstSettingsTabFor } from './tabs';

/**
 * /staff/settings — sends the reader to the first sub-area they may open.
 *
 * Settings has no content of its own: it is four screens behind one nav row,
 * and an index page would be a menu of links duplicating the tab strip that is
 * about to render anyway.
 *
 * THE DESTINATION DEPENDS ON THE RANK, which is why this is not a static
 * redirect in next.config. `firstSettingsTabFor` reads the same allow-list the
 * strip and the routes read, so nobody is ever sent to a tab that will then
 * refuse them — see tabs.ts.
 *
 * This closes the /staff/settings 404 that has been in the sidebar since
 * Batch 4.
 */

export const dynamic = 'force-dynamic';

export default async function SettingsIndexPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const me = await mockApi.staff.currentStaff();
  redirect({ href: firstSettingsTabFor(me.rank), locale });
}
