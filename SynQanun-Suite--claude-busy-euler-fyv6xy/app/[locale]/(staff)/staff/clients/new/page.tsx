import { Info, UserPlus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { CLIENT_STANDINGS } from '@/fixtures/clients';
import { mockApi } from '@/lib/mock-api';
import { StaffTopBar } from '../../../StaffChrome';
import { RouteNotPermitted } from '../../RouteNotPermitted';
import { canAddClient } from '../permissions';
import { AddClientForm } from './AddClientForm';

/**
 * Add Client — BUILD_PLAN.md §3, Batch 6.
 *
 * ===========================================================================
 * THREE FIELDS, BECAUSE A CLIENT IS THREE FIELDS
 * ===========================================================================
 * `FirmClient` holds a name, a one-line summary of what the firm is doing for
 * them, a standing, and when their file last moved. The form collects the
 * first three and derives the fourth. Everything the export asks for beyond
 * that has no place to go, and giving each one a home would mean inventing a
 * model this product deliberately does not have:
 *
 *   · A PRIMARY CONTACT with a title, an email and a direct line. Contacts are
 *     fixtures/accounts.ts — people who can sign in — and creating one is the
 *     invite-client-contact flow BUILD_PLAN §3 lists as its own Batch 6 item.
 *     Collecting a contact here would build half of that flow in the wrong
 *     screen, and the half it built would be the half that stores a person's
 *     email without telling them.
 *   · A RELATIONSHIP PARTNER. The CRM already answers "who runs this client's
 *     work" by naming the lead on each engagement. A second field on the client
 *     record would be a second answer, free to disagree with the first — the
 *     duplication this codebase removed when `clientAccountId` came off the
 *     invoices.
 *   · A GOVERNING JURISDICTION. Also already answered, per engagement, by
 *     `forum` — a client can be sued in Cairo and arbitrate in Dubai, and one
 *     field on the client cannot hold both.
 *   · AN ENTITY TYPE, corporate or individual. fixtures/clients.ts says this
 *     file "holds organisations the firm acts for", and the portal's account
 *     record carries an `organisation`. Acting for individuals is a real thing
 *     a firm does and a real model change — a radio button that silently means
 *     nothing downstream is not it.
 *   · A LOGO. There is nowhere to put a file. The client portal's upload modal
 *     already refuses this for the same reason and says where the file stayed.
 *
 * ===========================================================================
 * THE EXPORT PROMISES THE CONFLICT CHECK NEW MATTER JUST REFUSED
 * ===========================================================================
 * Its callout reads: "Client profile creation is immediate. Conflict of
 * interest verification runs automatically during subsequent matter onboarding
 * via the SynQanun Regulatory Engine."
 *
 * That is a promise about the screen this batch has already declined to fake.
 * Read together, the two exports hand the duty back and forth — this one says
 * the matter screen will check, and the matter screen shows a gate that checks
 * nothing. Both are false, and the pair is worse than either, because each
 * makes the other look like it has been handled. Both screens now say the same
 * thing instead: no conflict check runs anywhere in this product.
 *
 * ===========================================================================
 * THE REST OF WHAT THE EXPORT SHIPPED
 * ===========================================================================
 *   · A RESERVED RECORD ID — "CLI-9042, Auto-Reserved", printed above an empty
 *     form. Same refusal as the matter reference: an identifier handed out for
 *     a record that may never exist. Ours is assigned on save.
 *   · A SIMULATED SUCCESS. The export's own script disables the button, shows
 *     "Verifying & Initializing…" for 1,200ms, then turns it green and says
 *     "Client Created! Redirecting…". Nothing is verified, initialised or
 *     created — it is a setTimeout. It is the clearest example in any export
 *     of the false state this project exists to refuse.
 *   · SECURITY THEATRE, four claims: "AES-256 Vault Initialized", "AML & KYC
 *     Tier-1" as a verification level, "خادم التسجيل المشفر جاهز (TLS 1.3)",
 *     and a portal toggle promising "cryptographic key exchange instructions"
 *     with "Dual-Factor Hardware Token & Passkey enforced". There is no vault,
 *     no screening, no key exchange and no second factor.
 *   · A PORTAL TOGGLE DEFAULTED ON, which would email a stranger on save.
 *     fixtures/clients.ts notes that four of five clients have no account and
 *     that this "is an ordinary state for a law firm" — so a new client
 *     starting without portal access is the common case, not an omission.
 *   · NAMED COMPETITOR PRODUCTS — "bulk client CSV import or API sync from
 *     Aderant / Elite 3E ... Launch Enterprise Migration Toolkit". A migration
 *     path from two real practice-management systems, offered as a working
 *     link.
 *   · A GENERATED LOGO IMAGE with its prompt left in the markup as `data-alt`,
 *     a contact at `globalenergy.com` with a Dubai direct line, and a
 *     jurisdiction list of six forums for a Cairo firm.
 *
 * ===========================================================================
 * PARTNER AND SENIOR ASSOCIATE
 * ===========================================================================
 * Reading the CRM is open to every rank; accepting a client commits the firm.
 * See ../permissions.ts for why that list is kept apart from the matters one
 * even though the two agree today.
 */

export const dynamic = 'force-dynamic';

export default async function AddClientPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const me = await mockApi.staff.currentStaff();

  // Before anything is fetched.
  if (!canAddClient(me.rank)) {
    const t = await getTranslations('clients.add');
    const tRank = await getTranslations('ranks');
    return (
      <RouteNotPermitted
        icon={UserPlus}
        pageTitle={t('heading')}
        subtitle={t('subtitle')}
        title={t('notPermitted.title')}
        // The BARE category, not `holder` — it lands inside a sentence.
        body={t('notPermitted.body', { rank: tRank(me.rank) })}
      />
    );
  }

  return <AddClient />;
}

function AddClient() {
  const t = useTranslations('clients.add');

  return (
    <>
      <StaffTopBar title={t('heading')} subtitle={t('subtitle')} />

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-5 px-6 py-6">
        <div className="flex items-start gap-3 rounded-card border border-gray-300 bg-gray-100 p-4">
          <Info aria-hidden size={16} className="mt-0.5 shrink-0 text-gray-500" />
          <div className="min-w-0">
            <p className="text-caption font-medium text-gray-700">{t('intro.heading')}</p>
            <p className="mt-1 text-caption text-gray-600">{t('intro.body')}</p>
            <p className="mt-2 text-caption text-gray-600">{t('intro.contacts')}</p>
            <p className="mt-2 text-caption text-gray-600">{t('intro.locales')}</p>
          </div>
        </div>

        {/* The standings come from the fixture, so the form cannot offer a
            value `ClientStanding` does not have. */}
        <AddClientForm
          standings={CLIENT_STANDINGS.map((value) => ({
            value,
            label: t(`standings.${value}`),
          }))}
        />
      </main>
    </>
  );
}
