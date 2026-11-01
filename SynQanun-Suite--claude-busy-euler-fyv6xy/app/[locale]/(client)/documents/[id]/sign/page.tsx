import { ArrowLeft, Download, FileText } from 'lucide-react';
import { notFound } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { Badge, Button, Card } from '@/components/ui';
import { formatCalendarDate, formatFileSize } from '@/lib/format';
import { Link } from '@/lib/i18n/navigation';
import type { Locale } from '@/lib/i18n/routing';
import { mockApi } from '@/lib/mock-api';
import { DOCUMENT_STATUS_TONE } from '@/lib/status-tones';
import { ClientTopBar } from '../../../ClientPortalChrome';
import { SignaturePanel } from './SignaturePanel';

/**
 * Review and sign — the destination the documents library has been pointing at
 * since Batch 2.
 *
 * ===========================================================================
 * THE DOCUMENT IS NOT RENDERED, FOR THE SECOND TIME
 * ===========================================================================
 * The export fills the left two-thirds of this screen with a complete, typeset
 * board resolution: "GULF HOLDINGS (ADGM) LIMITED, Registration No. 000004921",
 * a transfer of "four million two hundred thousand (4,200,000) Class-A voting
 * equity shares" to "SPV-Omega", recitals citing the ADGM Companies Regulations
 * 2020, a document reference, a hash, and three pages of numbered clauses.
 *
 * This was already refused once. The Batch 2 documents library shipped with an
 * honest "No preview yet" placeholder precisely because the same export
 * rendered the same invented instrument in its side panel, and the note in
 * documents/page.tsx says why it is worse than an invented count. Nothing has
 * changed except that the fabrication is now full-page and has a signature
 * button attached to it.
 *
 * There is no document store in Track A. There is no file behind
 * `Shareholders_Resolution_SPV_Final.pdf` — only a name, a size and a date. A
 * screen that shows a client the contents of a legal instrument they are about
 * to execute, when those contents were written by a design tool, is the single
 * most dangerous thing this product could render. So the viewer shows the
 * document's real metadata and says plainly that the file is not readable here
 * yet, which is the same thing the library's panel says.
 *
 * AND THE COUNTER-SIGNATURE IS WORSE STILL
 * ---------------------------------------------------------------------------
 * The export's document arrives ALREADY EXECUTED by the other party: "Mansoor
 * Al-Farooq" rendered in a cursive face over the caption "Executed via SynQanun
 * SHA-256 Vault on 14 Mar 2025". That is a fabricated signature attributed to a
 * named individual on a fabricated corporate resolution. Inventing a count is a
 * wrong number; drawing a person's signature on an instrument they never signed
 * is a different kind of object altogether, and it is not in this build.
 *
 * The client's own signature is pre-drawn in the same block, before they have
 * touched anything — so the export ships showing the client as having already
 * signed the document it is asking them to sign.
 *
 * ---------------------------------------------------------------------------
 * ALSO NOT CARRIED OVER
 * ---------------------------------------------------------------------------
 *  · "compliant with UAE Federal Law No. 46 of 2021 on Electronic Transactions
 *    and Trust Services" and "legally binding under ADGM jurisdiction". A
 *    specific statutory compliance claim about a signature with no provider,
 *    no identity binding and no storage behind it. Stripped from the documents
 *    library once already.
 *  · THE SUCCESS PANEL, which the export renders ALWAYS VISIBLE and labels
 *    "Always Visible for Inspection" — so the screen simultaneously reads
 *    "Signature Pending" in the header and "Signature Verified • Signed on 14
 *    Mar 2025" in the sidebar. It also claims "Audit certificate #AQ-9402 has
 *    been generated and archived" and that "all parties have received notarized
 *    electronic copies": a certificate, an archive, a notarisation and a
 *    distribution to third parties, none of which exist.
 *  · "Tamper-Proof Digital Seal • SHA-256 Vault Enclave • SOC 2 Type II",
 *    "SHA-256 Client Vault Authenticated", "Hash ID: 8f9b7c...394e", and
 *    "Timestamp and SHA-256 integrity hash will be recorded upon confirmation".
 *    Twelfth screen for this category.
 *  · THE CURSIVE SIGNATURE FONTS — see SignaturePanel.tsx, which explains why a
 *    script face on a typed name is itself a false claim.
 *  · "Draw Signature" as a second mode. A canvas nobody can submit anywhere.
 *  · ADGM, Abu Dhabi and UAE Federal Law throughout, on a Cairo firm's portal.
 *    Fourth instance of the wrong-jurisdiction pattern.
 *  · "Adv. Mansoor Al-Farooq (Senior Partner)" — the gendered honorific.
 *  · "v2.4 LTS", the green pulsing "Formal Legal Document (ADGM Registered)"
 *    dot, and a second "Powered by SynQanun" inside the panel footer.
 *  · THE PDF CHROME — page 1 of 3, zoom controls, next/previous. Controls for a
 *    viewer that is not there.
 */

export const dynamic = 'force-dynamic';

export default async function SignDocumentPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const [document, account] = await Promise.all([
    mockApi.documents.getById(id),
    mockApi.session.currentClient(),
  ]);

  // Same response for a document that does not exist and one that is not this
  // client's — see app/[locale]/not-found.tsx for why that matters.
  if (!document) notFound();

  const typedLocale = locale as Locale;

  return (
    <SignDocument
      locale={typedLocale}
      name={document.name}
      kind={document.kind}
      status={document.status}
      needsSignature={document.needsSignature}
      engagementRef={document.engagementRef}
      engagementTitle={document.engagementTitle[typedLocale]}
      engagementHref={
        document.engagementKind === 'matter'
          ? `/matters/${document.engagementRef}`
          : `/projects/${document.engagementRef}`
      }
      sharedOn={document.sharedOn}
      sharedLabel={formatCalendarDate(document.sharedOn, typedLocale)}
      sizeLabel={formatFileSize(document.sizeBytes, typedLocale)}
      signatoryName={account.name[typedLocale]}
    />
  );
}

function SignDocument({
  name,
  kind,
  status,
  needsSignature,
  engagementRef,
  engagementTitle,
  engagementHref,
  sharedOn,
  sharedLabel,
  sizeLabel,
  signatoryName,
}: {
  locale: Locale;
  name: string;
  kind: string;
  status: 'awaitingSignature' | 'draft' | 'final';
  needsSignature: boolean;
  engagementRef: string;
  engagementTitle: string;
  engagementHref: string;
  sharedOn: string;
  sharedLabel: string;
  sizeLabel: string;
  signatoryName: string;
}) {
  const t = useTranslations('sign');
  const tDocuments = useTranslations('documents');

  return (
    <>
      <ClientTopBar title={t('title')} subtitle={name} />

      <main className="mx-auto flex w-full max-w-content flex-1 flex-col gap-5 px-6 py-6">
        <Link
          href="/documents"
          className="inline-flex w-fit items-center gap-1.5 text-caption text-legal-navy hover:underline"
        >
          {/* Direction, not an object — mirrored in Arabic. design.md §12. */}
          <ArrowLeft aria-hidden size={14} className="rtl:rotate-180" />
          {t('back')}
        </Link>

        {/*
          Two panes on desktop, stacked below. The document is the wider one
          even though it has no preview to show: it is what the screen is about,
          and giving the signature panel the larger half would invert that.
        */}
        <div className="grid grid-cols-1 gap-5 desktop:grid-cols-[minmax(0,1fr)_380px]">
          {/* The document ------------------------------------------------ */}
          <Card padding="lg" className="flex flex-col">
            <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-gray-200 pb-3">
              <h2 className="font-sans text-title text-gray-700">{t('documentHeading')}</h2>
              <Badge tone={DOCUMENT_STATUS_TONE[status]}>{tDocuments(`status.${status}`)}</Badge>
            </div>

            <p className="mt-4 text-body-emphasis text-gray-700 [overflow-wrap:anywhere]">
              <bdi>{name}</bdi>
            </p>

            <dl className="mt-4 flex flex-col gap-2.5 border-t border-gray-200 pt-4">
              <Fact label={tDocuments('panel.engagement')}>
                <Link href={engagementHref} className="text-legal-navy hover:underline">
                  <bdi>{engagementTitle}</bdi>
                </Link>
              </Fact>
              <Fact label={tDocuments('panel.reference')}>
                {/* Latin in both locales — see lib/format.ts. */}
                <span dir="ltr" className="font-mono text-reference text-gray-700">
                  {engagementRef}
                </span>
              </Fact>
              <Fact label={tDocuments('panel.shared')}>
                <time dateTime={sharedOn} className="text-gray-700 [unicode-bidi:isolate]">
                  {sharedLabel}
                </time>
              </Fact>
              <Fact label={tDocuments('panel.file')}>
                <span className="text-gray-700 [unicode-bidi:isolate]">
                  {kind.toUpperCase()} · {sizeLabel}
                </span>
              </Fact>
            </dl>

            {/* The honest placeholder, in the space the export fills with an
                invented instrument. Same words the library's panel uses. */}
            <div className="mt-4 flex flex-1 flex-col items-center justify-center gap-2 rounded-card border border-dashed border-gray-300 bg-gray-50 px-6 py-12 text-center">
              <FileText aria-hidden size={22} strokeWidth={1.6} className="text-gray-500" />
              <p className="text-body font-medium text-gray-700">
                {tDocuments('panel.previewHeading')}
              </p>
              <p className="max-w-[26rem] text-caption text-gray-500">
                {tDocuments('panel.previewBody')}
              </p>

              {/* MOCK: no file to fetch — there is no document store in Track A.
                  The real version streams the file from object storage behind
                  an authorisation check. Track A.5. */}
              <Button
                variant="secondary"
                size="sm"
                className="mt-2"
                icon={<Download aria-hidden size={15} />}
              >
                {tDocuments('panel.download')}
              </Button>
            </div>
          </Card>

          {/* The signature ---------------------------------------------- */}
          <Card padding="lg" className="flex flex-col self-start">
            <div className="border-b border-gray-200 pb-3">
              <h2 className="font-sans text-title text-gray-700">{t('panelHeading')}</h2>
              <p className="mt-1 text-caption text-gray-500">{t('panelSubtitle')}</p>
            </div>

            {needsSignature ? (
              <div className="mt-4">
                <SignaturePanel defaultName={signatoryName} />
              </div>
            ) : (
              /* Reached by editing the URL to a document nobody asked you to
                 sign. Saying so is better than rendering a signature form for a
                 file that does not need one. */
              <p className="mt-4 text-body text-gray-600">{t('notRequested')}</p>
            )}
          </Card>
        </div>
      </main>
    </>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="shrink-0 text-caption text-gray-500">{label}</dt>
      <dd className="min-w-0 text-end text-caption">{children}</dd>
    </div>
  );
}
