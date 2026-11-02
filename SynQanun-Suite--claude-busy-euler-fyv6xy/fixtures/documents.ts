import { demoFirm } from './firm';

/**
 * fixtures/documents.ts — files the firm has shared into the client portal.
 *
 * SHARED documents only. design.md §11 item 6 scopes the client portal to
 * "shared documents, invoices, matter status only, no internal firm data" — the
 * firm's own DMS (internal drafts, privileged notes, other clients' files) is a
 * different collection that this one is a deliberately narrow view onto. The
 * separation has to hold server-side; see the MOCK note below.
 *
 * FILENAMES ARE NOT TRANSLATED, AND THAT IS THE POINT
 * ---------------------------------------------------------------------------
 * `name` is a single string, not a `Record<Locale, string>` like every other
 * display field in these fixtures. A filename belongs to the file, not to the
 * reader: a client who receives "Apollo_Hearing_Skeleton_Argument.docx" by
 * email must find that same name in the portal, in either language, or the
 * portal is lying about what it holds.
 *
 * So the list below mixes scripts the way a real Egyptian/Gulf firm's actually
 * does — an English-named PDF sitting next to an Arabic-named DOCX — and it
 * mixes them in BOTH locales. That also makes this the screen where design.md
 * §12's mixed-direction rule earns its keep: "an Arabic matter name containing
 * a Latin case citation should isolate the embedded run's direction rather than
 * let it drag the surrounding text's alignment." A Latin filename inside the
 * Arabic list is exactly that case, and it is rendered isolated.
 *
 * The firm is not restated; `firmId` points at fixtures/firm.ts.
 */

export type DocumentKind = 'pdf' | 'docx' | 'xlsx';

/**
 * Where a shared file stands, from the CLIENT's point of view.
 *
 * Three values, and they partition the collection exactly, so the library's
 * filter counts always sum to the total. The vocabulary is deliberately short:
 * a client portal answers "does this need me, or is it just here?", and the
 * procedural detail behind a document lives on its engagement's timeline.
 *
 *   · `awaitingSignature` — the client has to sign it. The one value that is a
 *     request rather than a state.
 *   · `draft` — not yet operative. A draft agreement, a statement still being
 *     settled, an application prepared but not yet filed.
 *   · `final` — executed, issued or filed. Nothing further is expected.
 *
 * The Stitch export instead offered five ad-hoc statuses ("Review copy",
 * "Executed order", "Executed document", "Awaiting submission", "Needs
 * signature") and a fourth filter, "Archived (1)", that no row in its own table
 * matched — the same phantom-option defect as the matters list's forums. There
 * is no archive in this model, so there is no archive filter.
 */
export type DocumentStatus = 'awaitingSignature' | 'draft' | 'final';

/**
 * One saved version of a document.
 *
 * ===========================================================================
 * METADATA ONLY, AND THE OMISSION IS THE DESIGN
 * ===========================================================================
 * A label, a date and a person. That is the whole record, and everything a
 * version history normally carries besides those three is deliberately absent:
 *
 *   · NO CHANGE NOTE. "Incorporated DIFC arbitration clause feedback and
 *     revised liability cap schedule" describes an edit to text that does not
 *     exist. A summary of a change is a claim about content, and this file has
 *     never held content — only a name, a size, a status and an engagement.
 *   · NO DIFF, and no way to ask for one. The same reason: there is nothing on
 *     either side to compare.
 *   · NO RESTORE. Restoring means replacing the current text with an earlier
 *     one, and there is no text. A button that reported "restored" would be
 *     the emptiest possible version of the lie this project keeps refusing.
 *   · NO SIZE PER VERSION. `sizeBytes` belongs to the file as it stands; a
 *     per-version byte count would be an invented measurement of a file that
 *     was never written.
 *
 * What remains is true and useful: this document has been saved five times,
 * here is when, and here is who. That is the question a version list is
 * actually asked on a file — who touched this, and when.
 *
 * ===========================================================================
 * THE LABEL IS A LABEL
 * ===========================================================================
 * "v1", "v2" — a counter, not semantic versioning, and not a claim that v2 is
 * a minor change and v3 a major one. The export badges its versions "MAJOR
 * MILESTONE" and "BASELINE", which grades edits nobody recorded.
 */
export interface DocumentVersion {
  /** What the firm calls it. A counter — see the header. */
  label: string;
  /**
   * Days before the tenant's today that it was saved. 0 means today.
   *
   * The NEWEST version of a shared document is dated the day it was shared,
   * because the version the client received is by definition the one that was
   * current when it went out. A newer save than the share date would mean the
   * client is holding something the firm has since moved past — a real state,
   * and one this product cannot represent, so it is not represented.
   */
  daysAgo: number;
  /** Who saved it — an id into fixtures/practice.ts. */
  byStaffId: string;
}

export interface SharedDocument {
  id: string;
  /** The real filename. See the header — not per-locale, on purpose. */
  name: string;
  kind: DocumentKind;
  /** Decimal bytes, formatted by lib/format.ts. */
  sizeBytes: number;
  /**
   * Days before the tenant's today that the firm shared it. 0 means today.
   * Relative for the same reason matters' key dates are — see
   * fixtures/matters.ts, `KeyDateSeed`.
   */
  sharedDaysAgo: number;
  /**
   * Matter or project reference this file belongs to.
   *
   * Every file in this collection has one. The export's upload modal offers a
   * "General Client Vault (Unassigned)" option, which would need this to be
   * nullable and would need a home for files belonging to no engagement — a
   * real product question, but upload is Batch 3 (BUILD_PLAN.md §3), so the
   * model is left as it is rather than widened speculatively.
   */
  engagementRef: string;
  /**
   * Where it stands. `awaitingSignature` is the one the client must act on.
   *
   * MOCK: Track A has no e-signature integration, so this is a field on a
   * fixture. The real `awaitingSignature` is a signature-request record held by
   * the e-signature provider, with its own signer list, audit trail and expiry;
   * the signing flow itself is Batch 3, and the provider integration is Track B
   * (BUILD_PLAN.md §6, "e-signature"), not Track A.5.
   */
  status: DocumentStatus;
  /**
   * Saved versions, oldest first.
   *
   * Never empty: a document that exists was saved at least once. The last
   * entry is dated `sharedDaysAgo` — see `DocumentVersion`.
   */
  versions: DocumentVersion[];
  firmId: string;
  downloadUrl?: string;
  createdAt?: string;
  updatedAt?: string;
  timeFormatted?: string;
}

// MOCK: replace with GET /api/documents?shared=true — scoped server-side to
// this tenant AND this client account. A client-side filter over the firm's
// whole DMS would be a privilege breach dressed as a UI state; the scoping has
// to be in the query. Track A.5.
export const demoSharedDocuments: SharedDocument[] = [
  {
    id: 'doc-4471',
    name: 'Shareholders_Resolution_SPV_Final.pdf',
    kind: 'pdf',
    sizeBytes: 1_400_000,
    sharedDaysAgo: 0,
    engagementRef: 'PRJ-3902',
    status: 'awaitingSignature',
    versions: [
      { label: 'v1', daysAgo: 9, byStaffId: 'stf-005' },
      { label: 'v2', daysAgo: 4, byStaffId: 'stf-003' },
      { label: 'v3', daysAgo: 0, byStaffId: 'stf-001' },
    ],
    firmId: demoFirm.id,
  },
  {
    // Added with the matter detail view, so MAT-2201's Documents tab filters
    // this shared collection down to something real rather than being given a
    // parallel fixture of its own.
    id: 'doc-4468',
    name: 'Witness_Statement_Draft_v1.4_Apollo.pdf',
    kind: 'pdf',
    sizeBytes: 1_800_000,
    // A witness signs their own statement, so "draft" in the filename and
    // "awaiting signature" in the status are both true at once.
    sharedDaysAgo: 3,
    engagementRef: 'MAT-2201',
    status: 'awaitingSignature',
    versions: [
      { label: 'v1', daysAgo: 11, byStaffId: 'stf-006' },
      { label: 'v2', daysAgo: 6, byStaffId: 'stf-005' },
      { label: 'v3', daysAgo: 4, byStaffId: 'stf-005' },
      { label: 'v4', daysAgo: 3, byStaffId: 'stf-003' },
    ],
    firmId: demoFirm.id,
  },
  {
    // Arabic filename, rendered as-is in the English list too. See the header.
    id: 'doc-4463',
    name: 'مذكرة_الدفاع_جلسة_أبولو.docx',
    kind: 'docx',
    sizeBytes: 840_000,
    sharedDaysAgo: 6,
    engagementRef: 'MAT-2201',
    status: 'draft',
    versions: [
      { label: 'v1', daysAgo: 21, byStaffId: 'stf-006' },
      { label: 'v2', daysAgo: 6, byStaffId: 'stf-005' },
    ],
    firmId: demoFirm.id,
  },
  {
    id: 'doc-4421',
    name: 'DIFC_Court_Order_Directions_CFI-042.pdf',
    kind: 'pdf',
    sizeBytes: 320_000,
    sharedDaysAgo: 35,
    engagementRef: 'MAT-2201',
    status: 'final',
    versions: [
      { label: 'v1', daysAgo: 35, byStaffId: 'stf-003' },
    ],
    firmId: demoFirm.id,
  },
  {
    id: 'doc-4402',
    name: 'Commercial_Registry_Certificate.pdf',
    kind: 'pdf',
    sizeBytes: 520_000,
    sharedDaysAgo: 11,
    engagementRef: 'PRJ-4410',
    status: 'final',
    versions: [
      { label: 'v1', daysAgo: 20, byStaffId: 'stf-007' },
      { label: 'v2', daysAgo: 11, byStaffId: 'stf-002' },
    ],
    firmId: demoFirm.id,
  },

  /* ---- Added with the project detail view, for the same reason the MAT-2201
     files were added with the matter detail: so a project's Documents tab
     filters this shared collection down to something real, rather than being
     handed a parallel fixture of its own. ------------------------------------ */
  {
    id: 'doc-4479',
    name: 'قرار_الشركاء_لإعادة_الهيكلة_v2.1.pdf',
    kind: 'pdf',
    sizeBytes: 1_900_000,
    sharedDaysAgo: 4,
    engagementRef: 'PRJ-4410',
    status: 'awaitingSignature',
    versions: [
      { label: 'v1', daysAgo: 12, byStaffId: 'stf-002' },
      { label: 'v2', daysAgo: 7, byStaffId: 'stf-004' },
      { label: 'v3', daysAgo: 5, byStaffId: 'stf-002' },
      { label: 'v4', daysAgo: 4, byStaffId: 'stf-001' },
    ],
    firmId: demoFirm.id,
  },
  {
    id: 'doc-4455',
    name: 'Cross_Border_Asset_Transfer_Agreement_Draft.docx',
    kind: 'docx',
    sizeBytes: 940_000,
    sharedDaysAgo: 13,
    engagementRef: 'PRJ-4410',
    status: 'draft',
    versions: [
      { label: 'v1', daysAgo: 16, byStaffId: 'stf-004' },
      { label: 'v2', daysAgo: 13, byStaffId: 'stf-002' },
    ],
    firmId: demoFirm.id,
  },
  {
    id: 'doc-4430',
    name: 'MISA_Foreign_Investment_Licence_Application.pdf',
    kind: 'pdf',
    sizeBytes: 3_200_000,
    // Prepared and sitting with the firm, not yet lodged with MISA. Not final,
    // and nothing for the client to sign.
    sharedDaysAgo: 21,
    engagementRef: 'PRJ-4410',
    status: 'draft',
    versions: [
      { label: 'v1', daysAgo: 30, byStaffId: 'stf-007' },
      { label: 'v2', daysAgo: 26, byStaffId: 'stf-004' },
      { label: 'v3', daysAgo: 21, byStaffId: 'stf-004' },
    ],
    firmId: demoFirm.id,
  },
];

/* ===========================================================================
 * The firm's own drafts — deliberately NOT the collection above
 * ======================================================================== */

/**
 * What kind of document the firm is producing.
 *
 * A closed list, so the picker offers exactly the values the type permits. A
 * written-out set of cards in a component is a second vocabulary, free to gain
 * an eighth entry the type has never heard of — the same reason
 * fixtures/clients.ts exports CLIENT_STANDINGS.
 *
 * `other` is last and is not a catch-all apology: a firm produces things that
 * are none of the six, and forcing one of them onto a board minute would put a
 * wrong label on a real file. What it does NOT do is carry a free-text "type"
 * box beside it, which would turn a closed list into an open one and make the
 * picker decorative.
 */
export const DOCUMENT_TYPES = [
  'letter',
  'memo',
  'filing',
  'contract',
  'correspondence',
  'courtSubmission',
  'other',
] as const;

export type DocumentType = (typeof DOCUMENT_TYPES)[number];

/**
 * A document the firm is working on, held by the firm.
 *
 * ===========================================================================
 * WHY THIS IS A SECOND COLLECTION AND NOT A FLAG ON THE FIRST
 * ===========================================================================
 * The obvious shortcut was to give `SharedDocument` a `shared: boolean` and let
 * one collection carry both. It was refused, and the header at the top of this
 * file is the reason: that type is scoped to "files the firm has SHARED into
 * the client portal", and every client-portal read in lib/mock-api.ts leans on
 * that being true of every row it holds.
 *
 * Widening it would make "the client can see this" a field somebody has to
 * remember to filter on, in a collection whose entire job is that the filtering
 * already happened. The first read that forgot would show one client another
 * client's draft. A separate collection cannot be forgotten: there is no query
 * that returns these by accident, because no client-facing endpoint names them.
 *
 * So creating a document here does NOT put it in front of the client. Sharing
 * is a separate act, and an outbound one — BUILD_PLAN.md §5.1 category 2 — so
 * it is not built here either.
 *
 * ===========================================================================
 * A TITLE, NOT A FILENAME
 * ===========================================================================
 * `SharedDocument.name` is a filename because a file that reached the client by
 * mail has to be findable by the name it arrived under. Nothing has been
 * generated here, so there is no file and no extension to claim: a draft the
 * firm has started is titled, and it is titled in whatever language it is being
 * drafted in. Single string for the same reason the filename is — it belongs to
 * the document, not to the reader.
 */
export interface FirmDocument {
  id: string;
  /** What it is called. See the header — one string, not per-locale. */
  title: string;
  type: DocumentType;
  /** Matter or project this belongs to. Every draft is on a file. */
  engagementRef: string;
  /** Days before the tenant's today that it was started. 0 means today. */
  createdDaysAgo: number;
  firmId: string;
  downloadUrl?: string;
  createdAt?: string;
  updatedAt?: string;
  timeFormatted?: string;
}

/**
 * Drafts in progress.
 *
 * Three, across three engagements, so the card that shows them is not empty on
 * every screen before anything is created — and so the difference between "the
 * firm is drafting this" and "the client has been sent this" is visible on a
 * file that has both.
 *
 * MOCK: replace with GET /api/documents?engagement=… against the firm's own
 * DMS, scoped to the tenant and to the caller's access. NOT the endpoint the
 * collection above uses; see the header. Track A.5.
 */
export const demoFirmDocuments: FirmDocument[] = [
  {
    id: 'fdoc-001',
    // MAT-2201 also has two files shared with the client, so its record shows
    // both states at once.
    title: 'Skeleton argument — second draft',
    type: 'courtSubmission',
    engagementRef: 'MAT-2201',
    createdDaysAgo: 2,
    firmId: demoFirm.id,
  },
  {
    id: 'fdoc-002',
    title: 'مذكرة داخلية بشأن شروط الإنهاء',
    type: 'memo',
    engagementRef: 'PRJ-4410',
    createdDaysAgo: 5,
    firmId: demoFirm.id,
  },
  {
    id: 'fdoc-003',
    title: 'Letter to the Registry — extension request',
    type: 'letter',
    engagementRef: 'MAT-4021',
    createdDaysAgo: 1,
    firmId: demoFirm.id,
  },
];
