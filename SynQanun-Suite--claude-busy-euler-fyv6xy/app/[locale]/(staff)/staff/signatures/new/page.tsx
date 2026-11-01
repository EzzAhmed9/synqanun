import { ArrowLeft, Info, PenLine } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/lib/i18n/navigation';
import type { Locale } from '@/lib/i18n/routing';
import { mockApi, type SignatureRequestContext } from '@/lib/mock-api';
import { StaffTopBar } from '../../../StaffChrome';
import { RouteNotPermitted } from '../../RouteNotPermitted';
import { canRequestSignature } from '../permissions';
import { SignatureRequestForm } from '../SignatureRequestForm';

/**
 * Prepare a signature request — BUILD_PLAN.md §3, Batch 6.
 *
 * ===========================================================================
 * NOT A NAV ENTRY, AND REACHED FROM THE DOCUMENT
 * ===========================================================================
 * The sidebar has no "Signatures" item and does not get one. There is no
 * signature provider connected (fixtures/integrations.ts says so on a shipped
 * screen), so a permanent workspace section for signatures would advertise a
 * capability the product does not have — and would need an inbox of pending
 * requests, which is precisely the thing that must not exist while nothing has
 * been sent.
 *
 * It is reached from the engagement record's shared-documents card, which is
 * where somebody actually is when they decide to ask for a signature, and the
 * document is prefilled from there.
 *
 * ===========================================================================
 * THE PANEL ABOVE THE FORM IS THE MOST IMPORTANT ELEMENT
 * ===========================================================================
 * It says what preparing a request is and is not, BEFORE anything is chosen —
 * the same placement New Matter uses for the conflict-check refusal. Somebody
 * assembling an execution pack should know the client will not be told, rather
 * than finding out on the confirmation.
 */

export const dynamic = 'force-dynamic';

export default async function NewSignatureRequestPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ document?: string }>;
}) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  setRequestLocale(locale);

  const me = await mockApi.staff.currentStaff();

  // Before the query. A rank that may not ask for a signature does not need the
  // client's roster in its payload to be told so.
  if (!canRequestSignature(me.rank)) {
    const t = await getTranslations('signatureRequest');
    const tRank = await getTranslations('ranks');
    return (
      <RouteNotPermitted
        icon={PenLine}
        pageTitle={t('title')}
        subtitle={t('subtitle')}
        title={t('notPermitted.title')}
        // The BARE category, not `holder` — it lands inside a sentence.
        body={t('notPermitted.body', { rank: tRank(me.rank) })}
      />
    );
  }

  const context = await mockApi.staff.signatureRequestContext(query.document);

  return (
    <Prepare
      locale={locale as Locale}
      context={context}
      documentId={query.document ?? ''}
    />
  );
}

function Prepare({
  locale,
  context,
  documentId,
}: {
  locale: Locale;
  context: SignatureRequestContext;
  documentId: string;
}) {
  const t = useTranslations('signatureRequest');

  const chosen = context.documents.find((document) => document.id === documentId);
  const backHref = chosen
    ? `/staff/matters/${chosen.engagementRef}`
    : '/staff/matters';

  return (
    <>
      <StaffTopBar title={t('title')} subtitle={t('subtitle')} />

      <main className="mx-auto flex w-full max-w-content flex-1 flex-col gap-5 px-6 py-6">
        <Link
          href={backHref}
          className="inline-flex w-fit items-center gap-1.5 text-caption text-legal-navy hover:underline"
        >
          {/* A direction, so it mirrors. design.md §12. */}
          <ArrowLeft aria-hidden size={14} className="rtl:rotate-180" />
          {t('back')}
        </Link>

        {/*
          What this does and does not do, before anything is chosen. Gray and
          an Info icon: a system note about the product, not the product
          speaking as an agent.
        */}
        <div className="flex items-start gap-3 rounded-card border border-gray-300 bg-gray-100 p-4">
          <Info aria-hidden size={16} className="mt-0.5 shrink-0 text-gray-500" />
          <div className="min-w-0">
            <p className="text-caption font-medium text-gray-700">{t('scope.heading')}</p>
            <p className="mt-1 text-caption text-gray-600">{t('scope.body')}</p>
            <p className="mt-2 text-caption text-gray-600">{t('scope.noProvider')}</p>
          </div>
        </div>

        <SignatureRequestForm
          // Flattened here, because this is where the locale is. A filename is
          // not translated — fixtures/documents.ts, on why — so the label pairs
          // it with the engagement's title, which is.
          documents={context.documents.map((document) => ({
            id: document.id,
            label: `${document.name} · ${document.engagementTitle[locale]}`,
            engagementRef: document.engagementRef,
          }))}
          documentId={documentId}
          contacts={context.contacts.map((contact) => ({
            id: contact.id,
            name: contact.name[locale],
            email: contact.email,
          }))}
          fields={context.fields}
        />
      </main>
    </>
  );
}
