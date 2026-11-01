import { Compass } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Card } from '@/components/ui';
import { WorkspaceHome } from './WorkspaceHome';

/**
 * An address under this locale that names nothing — /en/nothing-here.
 *
 * Distinct from the engagement 404s, which live beside their routes and can
 * name what was not found ("that matter"). This one cannot: the URL is the only
 * thing known about it, and echoing a URL back at a reader is not information.
 *
 * ===========================================================================
 * THERE IS NO 403, AND THAT IS THE DECISION
 * ===========================================================================
 * The Stitch export for this batch is a 403 — "Access Restricted", "You may not
 * have permission to view this legal matter". It is not built, and the reason
 * is already written into EngagementNotFound.tsx:
 *
 *   A 403 tells the reader THE THING EXISTS. "You cannot see this matter"
 *   confirms there is a matter to see. On a portal where the records are other
 *   clients' privileged files, that is a disclosure: anyone who could guess or
 *   enumerate references could learn which ones are real by watching whether
 *   they get a 403 or a 404.
 *
 * So a client asking for something that is not theirs gets exactly what a
 * client asking for something that does not exist gets. That is the standard
 * answer for authorisation on private resources, and it is worth stating
 * loudly because the export's screen is the intuitive design and the wrong one.
 *
 * It also could not have been reached: Track A has no authentication, so
 * nothing in this prototype can produce a 403 at all. A screen for a state the
 * system cannot enter is a screen nobody has tested.
 *
 * MOCK: when sessions exist, the authorisation check returns notFound() rather
 * than a forbidden response, and the audit log — not the client — records the
 * attempt. Track A.5.
 *
 * ---------------------------------------------------------------------------
 * NOT CARRIED OVER FROM THE EXPORT
 * ---------------------------------------------------------------------------
 *  · "Protected client enclave • ADGM Compliance & AES-256 Ledger" in the
 *    footer, and its Arabic twin. An invented compliance certification and an
 *    invented encryption standard, on an error page. Eleventh screen for this
 *    category, and the second to name ADGM as a regulator the demo firm is not
 *    regulated by.
 *  · "Client Enclave" / "بوابة العميل المؤمنة" as a header label.
 *  · "Error 403 • Access Restricted" as a mono chip. Even for a real 404 a
 *    status code is for the console, not for a client.
 *  · "Sign in again" beside "Return to Dashboard". There is no session to have
 *    expired, and offering a sign-out-shaped action on a page reached by a typo
 *    is how a client loses their place for no reason.
 *  · The feather as the icon — see components/ui/EmptyState.tsx.
 */
export default function LocaleNotFound() {
  const t = useTranslations('errors');

  return (
    <main className="mx-auto flex w-full max-w-content flex-1 items-center justify-center px-6 py-16">
      <Card padding="lg" className="w-full max-w-[460px] text-center">
        <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-pill border border-gray-200 bg-gray-100 text-gray-500">
          <Compass aria-hidden size={22} strokeWidth={1.8} />
        </span>

        <h1 className="font-display text-heading text-gray-700">{t('notFound.title')}</h1>
        <p className="mt-2 text-body text-gray-600">{t('notFound.body')}</p>

        {/* Where the reader was, not where the portal is. See WorkspaceHome. */}
        <div className="mt-6">
          <WorkspaceHome />
        </div>
      </Card>
    </main>
  );
}
