import { ArrowLeft, Info, Users } from 'lucide-react';
import { notFound } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import {
  Badge,
  EmptyState,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '@/components/ui';
import { Link } from '@/lib/i18n/navigation';
import type { Locale } from '@/lib/i18n/routing';
import { mockApi, type ClientContactsRecord } from '@/lib/mock-api';
import { initialsOf } from '@/lib/utils';
import { StaffTopBar } from '../../../../StaffChrome';
import { canInviteClientContact } from '../../permissions';
import { InviteContactButton } from './InviteContactModal';

/**
 * A client's portal contacts — BUILD_PLAN.md §3, Batch 6, the invite flow.
 *
 * ===========================================================================
 * ITS OWN ROUTE, NOT A TAB
 * ===========================================================================
 * The export hangs this off the client record as the fifth of six tabs. Five of
 * those six are not built — Overview, Matters, Billing & Invoices, Documents,
 * Activity Log — and the client record already renders three of them inline as
 * cards. Building a tab strip would mean drawing five controls that go nowhere
 * in order to reach the one that goes somewhere.
 *
 * So it is a route, reached from the "portal access" line on the client record,
 * which is the fact it elaborates. The link is drawn whether or not the client
 * has a portal: "nobody here can sign in" is a real answer and worth being able
 * to look at, not a reason to hide the screen.
 *
 * ===========================================================================
 * ONE LIST, READ FROM THE CLIENT'S OWN
 * ===========================================================================
 * These are the same rows the CLIENT sees in their portal settings, through the
 * same fixture — so the firm and the client cannot end up holding two different
 * answers to "who has access". That required fixtures/accounts.ts to say which
 * organisation a roster member belongs to; it had been implicit, because the
 * portal only ever showed you your own. Writing it down also let the client-side
 * read start filtering instead of returning the array whole, which is the
 * scoping that fixture's own MOCK note had been asking for.
 *
 * FOUR OF THE FIVE CLIENTS HAVE NOBODY HERE, and that is the honest state of a
 * law firm rather than a gap in the fixtures — `hasPortal` has meant exactly
 * this since engagements stopped pointing at portal accounts. The empty state
 * says so in those terms instead of apologising.
 *
 * ===========================================================================
 * WHAT THE EXPORT PUT AROUND THE TABLE
 * ===========================================================================
 * The dialog's own refusals are in InviteContactModal.tsx, including why
 * sending is a stated no-op even though a real invitation fixture exists. What
 * surrounds it here:
 *
 *   · NO PER-ROW "RESEND" OR "REVOKE". Both are outbound acts on an invitation
 *     this product never sent — you cannot resend mail that did not go, and
 *     withdrawing access that nothing grants is a button that reports success
 *     for doing nothing. The scope note says neither is built, which is a
 *     shorter and truer thing than two disabled menu items.
 *   · NO SECURITY COLUMN. The export gives every row "2FA مفعّل" with a green
 *     lock, and the pending rows "بانتظار التأكيد". There is no authentication
 *     in Track A at all, let alone a second factor per person (BUILD_PLAN §6
 *     defers 2FA to Track B), so the column would be a per-person claim about a
 *     control that does not exist.
 *   · NO PORTAL TELEMETRY. "42 interactive document sessions" over a
 *     three-colour bar, "Last active: 2 hours ago" per row, "SSO enforcement:
 *     Active (Azure AD / Okta SAML 2.0)". Nothing records when anyone signed in
 *     — Settings → Activity & Audit Log says in its own scope note that sign-in
 *     is not modelled — and there is no SSO. "Last active" is the column a
 *     reader would most reasonably believe, which is what makes it the worst to
 *     fabricate.
 *   · NO COMPLIANCE CARD. "Encryption certificate valid (DIFC / ADGM)",
 *     "AES-256", "SEC-AUDIT: OK-2024-Q3", "Active 100%". Fourth screen this
 *     batch to be handed a certification panel, on a Cairo firm cited to Dubai
 *     regulators.
 *   · NO AI PERMISSIONS REVIEWER, which concludes "لا يوجد تضارب مصالح مسجل
 *     وفق بيانات سوق أبوظبي للأوراق المالية" — no recorded conflict of interest
 *     per Abu Dhabi securities-exchange data. The firm's conflicts register was
 *     built one commit ago and it is a register of THIS FIRM's own parties; it
 *     does not read an exchange, and /staff/conflicts refuses to report a clean
 *     search as a clearance. A claim like this one, in a corner of an unrelated
 *     screen, is precisely how a refusal made on the proper screen gets undone.
 *   · NO SEAT LICENCE. "Showing 5 of 6 authorized portal seats" over five rows,
 *     and "Enterprise tier allows up to 25 verified representatives". A count
 *     that contradicts its own table, and a licensing model that does not exist.
 *     The count here is over what is on the list.
 *   · NO "EXPORT DIRECTORY" OR "AI AUDIT TRAIL" BUTTONS — two documents that do
 *     not exist — and no "98.4% corporate compliance rate", "AED 45,000,000
 *     approval ceiling", "Tier-1 Institutional", or VAT number, none of which
 *     the client record holds.
 *   · GENERATED PORTRAITS for three of the five rows with the image prompts
 *     left in the markup as `data-alt`, a "Tariq J. Kabbani" and a "Sarah
 *     Al-Hashemi" who are not this client's people, `CLI-9042` for a client
 *     whose id is `cli-001`, and the timer once more on MAT-2201.
 *
 * ===========================================================================
 * READING IS OPEN; INVITING IS NOT
 * ===========================================================================
 * The route is ungated, like the CRM it hangs off: a paralegal who corresponds
 * with the client's finance manager needs to know whether that person can see
 * an invoice for themselves. The button is gated. See ../../permissions.ts.
 */

export const dynamic = 'force-dynamic';

export default async function ClientContactsPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const me = await mockApi.staff.currentStaff();
  const record = await mockApi.staff.clientContacts(id);
  // An id that names nothing gets the translated 404, not an empty list — the
  // same rule the client record and the engagement screens follow.
  if (!record) notFound();

  return (
    <Contacts
      locale={locale as Locale}
      record={record}
      canInvite={canInviteClientContact(me.rank)}
    />
  );
}

function Contacts({
  locale,
  record,
  canInvite,
}: {
  locale: Locale;
  record: ClientContactsRecord;
  canInvite: boolean;
}) {
  const t = useTranslations('clients.contacts');

  return (
    <>
      <StaffTopBar title={record.clientName[locale]} subtitle={t('subtitle')} />

      <main className="mx-auto flex w-full max-w-content flex-1 flex-col gap-5 px-6 py-6">
        <Link
          href={`/staff/clients/${record.clientId}`}
          className="inline-flex w-fit items-center gap-1.5 text-caption text-legal-navy hover:underline"
        >
          {/* A direction, so it mirrors. design.md §12. */}
          <ArrowLeft aria-hidden size={14} className="rtl:rotate-180" />
          {t('back')}
        </Link>

        {/*
          What the list is and what this screen cannot do, before the table.
          Gray and an Info icon: a system note about the data, not the product
          speaking as an agent.
        */}
        <div className="flex items-start gap-3 rounded-card border border-gray-300 bg-gray-100 p-4">
          <Info aria-hidden size={16} className="mt-0.5 shrink-0 text-gray-500" />
          <div className="min-w-0">
            <p className="text-caption font-medium text-gray-700">{t('scope.heading')}</p>
            <p className="mt-1 text-caption text-gray-600">{t('scope.body')}</p>
            <p className="mt-2 text-caption text-gray-600">{t('scope.omits')}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Counted over the rows below, never a headline with a different
              number beneath it — and dropped entirely when there are none,
              because the empty state says the same sentence and saying it
              twice reads as two different facts. */}
          {record.contacts.length > 0 ? (
            <p className="text-caption text-gray-500">
              {t('count', { count: record.contacts.length })}
            </p>
          ) : (
            <span />
          )}
          {/* Rendered only for a rank that may use it — absent, never disabled.
              The real endpoint checks again; see the modal's MOCK note. */}
          {canInvite ? (
            <InviteContactButton
              label={t('invite.open')}
              takenEmails={record.takenEmails}
              clientId={record.clientId}
            />
          ) : null}
        </div>

        {record.contacts.length === 0 ? (
          <EmptyState icon={Users} title={t('empty.title')} body={t('empty.body')} />
        ) : (
          <div className="overflow-hidden rounded-card border border-gray-200 bg-white">
            <Table striped className="tablet:min-w-[44rem]">
              <TableHead>
                <TableRow>
                  <TableHeaderCell>{t('columns.contact')}</TableHeaderCell>
                  <TableHeaderCell>{t('columns.email')}</TableHeaderCell>
                  <TableHeaderCell>{t('columns.role')}</TableHeaderCell>
                  <TableHeaderCell>{t('columns.status')}</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {record.contacts.map((contact) => (
                  <TableRow key={contact.id}>
                    <TableCell>
                      <span className="flex items-center gap-2.5">
                        <span
                          aria-hidden
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-pill bg-gray-100 text-caption font-medium text-gray-600"
                        >
                          {initialsOf(contact.name[locale])}
                        </span>
                        <span className="min-w-0">
                          <span className="block text-body text-gray-900">
                            <bdi>{contact.name[locale]}</bdi>
                          </span>
                          {/* Their job at their OWN organisation, which is the
                              only thing that distinguishes two people on a
                              four-row list. */}
                          <span className="block text-caption text-gray-500">
                            <bdi>{contact.title[locale]}</bdi>
                          </span>
                        </span>
                      </span>
                    </TableCell>

                    <TableCell>
                      {/* Latin in every locale — lib/format.ts's identifier
                          rule, the same treatment the roster gives an address. */}
                      <span dir="ltr" className="block text-start text-caption text-gray-600">
                        {contact.email}
                      </span>
                    </TableCell>

                    <TableCell>
                      {/*
                        The same words the CLIENT's own roster uses for the same
                        record — "Can manage" / "Can view", not "Admin" /
                        "Member". Two wordings for one row is how the firm and
                        the client end up describing a person's access
                        differently.

                        They are capability phrases rather than person-nouns,
                        which Arabic needs here: مسؤول and عضو agree with a
                        masculine holder, and three of this roster's four people
                        are women. إدارة كاملة describes the access, so it
                        agrees with nobody.
                      */}
                      <Badge tone="neutral" icon={null}>
                        {t(`roles.${contact.role}`)}
                      </Badge>
                    </TableCell>

                    <TableCell>
                      <Badge tone={contact.status === 'active' ? 'success' : 'neutral'} icon={null}>
                        {t(`status.${contact.status}`)}
                      </Badge>
                      {contact.status === 'invited' ? (
                        // No expiry countdown and no resend. The fixture records
                        // that an invitation went out and was not taken up; it
                        // does not record when, and nothing here could act on it
                        // if it did. The label makes the INVITATION the subject
                        // for the same reason the role does the access — "دُعي"
                        // would agree with a masculine invitee, and this row is
                        // a woman.
                        <span className="mt-1 block text-caption text-gray-500">
                          {t('invitedNote')}
                        </span>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </main>
    </>
  );
}
