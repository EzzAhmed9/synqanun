import { ArrowLeft, Briefcase, Inbox, Users } from 'lucide-react';
import { notFound } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { Badge, Card, EmptyState } from '@/components/ui';
import { formatCalendarDate, formatRelativeDays } from '@/lib/format';
import { Link } from '@/lib/i18n/navigation';
import type { Locale } from '@/lib/i18n/routing';
import { mockApi, type ClientRecord } from '@/lib/mock-api';
import { StaffTopBar } from '../../../StaffChrome';
import { CardHead } from '../../cards';
import { ApprovalsCard, EngagementsCard } from '../../work-cards';

/**
 * One client's record.
 *
 * ===========================================================================
 * FOUR SECTIONS, ALL OF THEM COUNTED
 * ===========================================================================
 * Who they are, what the firm is doing for them, what has come in, and what is
 * waiting on a decision. Three of the four reuse components the staff
 * dashboards already render — `EngagementsCard`, `ApprovalsCard`, the inbox
 * row treatment — so a matter looks the same on a client's record as it does on
 * the person's own screen.
 *
 * ===========================================================================
 * WHAT IS NOT HERE, AND WHY IT IS THE MAJORITY OF THE EXPORT
 * ===========================================================================
 * No billing snapshot: "Outstanding Invoiced $148,500", "YTD Billed
 * $1,840,000 ↑14% vs 2024", "Lifetime Realized $9,420,000", "Unbilled WIP 42.5
 * Billable Hours ($48,875 at $1,150/hr)". Seven figures the fixtures do not
 * record. Invoices exist in fixtures/invoices.ts but they are the CLIENT's
 * statements, not the firm's revenue ledger, and reading them as one would be
 * the same category error as reading the documents library as a DMS.
 *
 * No "Authorized Contacts (3 of 14)": fixtures/accounts.ts holds one portal
 * account, for one of the five clients. Four of them have matters and projects
 * and no way to sign in, which is the ordinary case for a law firm and was not
 * representable at all until an engagement could name its client
 * independently of portal access. No "Export Client Dossier (PDF)". No "AI Client
 * Intelligence Brief". No "+ New Engagement / Matter" — a write, Batch 6.
 *
 * And no AI Risk & Opportunity Digest, which on this screen prices unbilled
 * work at "$420,000 USD", declares a clause "under active review", and cites
 * "ADGM Court of Appeal ruling 2024-CFI-009". Third screen running with
 * invented AI analysis; second with a fabricated citation.
 */

export const dynamic = 'force-dynamic';

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const record = await mockApi.staff.client(id);
  // An id that names nothing gets the translated 404, not an error page — the
  // same rule the engagement detail screens follow.
  if (!record) notFound();

  return <ClientDetail locale={locale as Locale} record={record} />;
}

function ClientDetail({ locale, record }: { locale: Locale; record: ClientRecord }) {
  const t = useTranslations('clients');
  const { client, engagements, correspondence, approvals } = record;

  return (
    <>
      <StaffTopBar
        title={client.name[locale]}
        subtitle={
          ['retainer', 'active', 'prospect', 'goodStanding'].includes(client.standing)
            ? t(`standing.${client.standing}`)
            : t('standing.active')
        }
      />

      <main className="mx-auto flex w-full max-w-content flex-1 flex-col gap-6 px-6 py-6 [&>*]:shrink-0">
        <Link
          href="/staff/clients"
          className="inline-flex w-fit items-center gap-1.5 text-caption text-legal-navy hover:underline"
        >
          {/* A direction, so it mirrors. design.md §12. */}
          <ArrowLeft aria-hidden size={14} className="rtl:rotate-180" />
          {t('detail.back')}
        </Link>

        {/* Who they are ------------------------------------------------- */}
        <Card padding="lg">
          <CardHead icon={Users} heading={t('detail.profile')} />

          <p className="mt-3 text-body text-gray-700">
            <bdi>{client.summary[locale]}</bdi>
          </p>

          <dl className="mt-4 grid grid-cols-1 gap-3 border-t border-gray-200 pt-4 tablet:grid-cols-3">
            <div>
              <dt className="text-caption text-gray-500">{t('detail.lastActivity')}</dt>
              <dd className="mt-0.5 text-body text-gray-700 [unicode-bidi:isolate]">
                {formatCalendarDate(client.lastActivityOn, locale, { month: 'long' })}
              </dd>
            </div>
            <div>
              <dt className="text-caption text-gray-500">{t('detail.engagements')}</dt>
              <dd className="mt-0.5 text-body text-gray-700">
                {client.matters + client.projects > 0
                  ? t('row.engagements', {
                      // One register since October 2026: former projects count.
                      matters: client.matters + client.projects,
                    })
                  : t('row.noEngagements')}
              </dd>
            </div>
            <div>
              <dt className="text-caption text-gray-500">{t('detail.portal')}</dt>
              <dd className="mt-0.5 flex flex-col items-start gap-1.5">
                {/*
                  Says whether this client can sign in, and nothing about what
                  they would see. The export puts "Authorized Contacts (3 of
                  14)" here over one real account.
                */}
                <Badge tone={client.hasPortal ? 'success' : 'neutral'} icon={null}>
                  {client.hasPortal ? t('detail.portalYes') : t('detail.portalNo')}
                </Badge>
                {/* Drawn either way. "Nobody here can sign in" is a fact worth
                    being able to look at, not a reason to hide the screen. */}
                <Link
                  href={`/staff/clients/${client.id}/contacts`}
                  className="text-caption text-legal-navy hover:underline"
                >
                  {t('detail.portalContacts')}
                </Link>
              </dd>
            </div>
          </dl>
        </Card>

        {/* What the firm is doing -------------------------------------- */}
        {engagements.length > 0 ? (
          <EngagementsCard
            engagements={engagements}
            locale={locale}
            heading={t('detail.theirEngagements')}
          />
        ) : (
          <EmptyState
            icon={Briefcase}
            title={t('detail.noEngagements.title')}
            body={t('detail.noEngagements.body')}
            className="border-dashed"
          />
        )}

        {/* What is waiting on a decision -------------------------------- */}
        {approvals.length > 0 ? (
          <ApprovalsCard
            approvals={approvals}
            locale={locale}
            heading={t('detail.theirApprovals')}
          />
        ) : null}

        {/* What has come in --------------------------------------------- */}
        <Card padding="none" className="overflow-hidden">
          <header className="border-b border-gray-200 p-5">
            <CardHead
              icon={Inbox}
              heading={t('detail.correspondence')}
              caption={t('detail.correspondenceCount', { count: correspondence.length })}
            />
          </header>

          {correspondence.length === 0 ? (
            <p className="p-5 text-body text-gray-500">{t('detail.noCorrespondence')}</p>
          ) : (
            <ul className="divide-y divide-gray-200">
              {correspondence.map((item) => (
                <li key={item.id} className="flex items-start gap-3 p-4">
                  <span
                    aria-hidden
                    className={
                      item.unread
                        ? 'mt-1.5 h-2 w-2 shrink-0 rounded-pill bg-action'
                        : 'mt-1.5 h-2 w-2 shrink-0 rounded-pill bg-transparent'
                    }
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                      <span className="text-body text-gray-700">
                        <bdi>{item.subject[locale]}</bdi>
                      </span>
                      <span className="text-caption text-gray-500 [unicode-bidi:isolate]">
                        {formatRelativeDays(item.receivedOn, locale)}
                      </span>
                    </div>
                    <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      {/* The source, on every row — the same discipline the
                          Unified Inbox applies. */}
                      <Badge tone="neutral" icon={null}>
                        {t(`sources.${item.source}`)}
                      </Badge>
                      {item.forStaff ? (
                        <Badge tone="neutral" icon={null}>
                          {t('detail.forStaff', { name: item.forStaff[locale] })}
                        </Badge>
                      ) : null}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </main>
    </>
  );
}
