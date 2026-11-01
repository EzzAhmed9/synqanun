/**
 * fixtures/signatures.ts — signature requests the firm has PREPARED.
 *
 * ===========================================================================
 * PREPARED. NOT SENT, NOT PENDING, NOT OUTSTANDING.
 * ===========================================================================
 * Everything about this file's shape follows from one sentence that is already
 * shipped, in fixtures/integrations.ts: "No signature provider is connected, so
 * a document marked 'needs signature' is a status in this workspace rather than
 * a request somebody has been sent."
 *
 * That sentence has to stay true after this file exists. So a record here means
 * the firm has written down who it intends to ask, and what it intends to ask
 * them for — and nothing else. There is no `sentOn`, no `status`, no expiry and
 * no token, because none of those things happened and a field that could hold
 * them is a field somebody will eventually fill in.
 *
 * ===========================================================================
 * IT DOES NOT TOUCH `DocumentStatus`
 * ===========================================================================
 * fixtures/documents.ts has an `awaitingSignature` status, and the client
 * portal's signing screen renders from it. Preparing a request here must NOT
 * flip a document into that state: doing so would put a document in front of a
 * client, in their own portal, asking them to execute it — off the back of a
 * form that sent nothing. That is the single worst false state available in
 * this product, worse than a fabricated invoice, because the client acts on it
 * by signing.
 *
 * So the two are unconnected. A prepared request is visible to the FIRM, on the
 * firm's own screens, and the client's side of the product does not know it
 * exists.
 *
 * ===========================================================================
 * THERE IS NO SEEDED ARRAY
 * ===========================================================================
 * Same reason fixtures/practice.ts has no seeded time entries: a demo request
 * sitting here would be a request nobody prepared, on a screen whose whole
 * subject is the difference between intending something and doing it. The
 * collection starts empty and holds what somebody prepares in the session.
 *
 * MOCK: the real thing is a signature-request record held by the e-signature
 * PROVIDER, with its own signer list, audit trail, expiry and per-signer
 * status — fixtures/documents.ts says exactly that over `DocumentStatus`, and
 * BUILD_PLAN.md §6 puts the provider integration in Track B rather than A.5,
 * because it needs provider-side identity verification. Until then this holds
 * the firm's own note of what it means to ask for.
 */

/**
 * What one signer is being asked to put on the document.
 *
 * ===========================================================================
 * THREE MARKS, AND NOT A PLACEMENT CANVAS
 * ===========================================================================
 * Every e-signature product places these as boxes on a page, and this one
 * cannot: there is no document body anywhere in this build. Document Canvas's
 * header argues that at length, the client's signing screen refuses to render
 * an invented instrument for the same reason, and a drag-and-drop field
 * placement over pages that do not exist would be a coordinate on nothing.
 *
 * What the firm CAN say without a file is what each person is being asked FOR,
 * which is what this list is. Where it goes is a question for the version with
 * a document behind it.
 */
export const SIGNATURE_FIELDS = ['signature', 'initials', 'dateSigned'] as const;

export type SignatureField = (typeof SIGNATURE_FIELDS)[number];

export interface SignatureRequestSigner {
  /**
   * Who is being asked — an id into the client organisation's own roster
   * (fixtures/accounts.ts, `ClientTeamMember`).
   *
   * ONLY SOMEBODY WHO CAN ALREADY SIGN IN. Not a free-text email: a signature
   * request goes to a person who has access to the portal the document is
   * shared in, and typing an address here would invent a route into a
   * privileged file for somebody nobody vetted. A client with no portal
   * contacts has nobody to ask, and the screen says so rather than offering a
   * box.
   */
  contactId: string;
  /** What they are asked to provide. At least one. */
  fields: SignatureField[];
}

export interface SignatureRequest {
  id: string;
  /** The document to be signed — an id into fixtures/documents.ts. */
  documentId: string;
  signers: SignatureRequestSigner[];
  /** An optional note the firm would put in the covering message. */
  note: string;
  /** Who prepared it — an id into fixtures/practice.ts. */
  preparedById: string;
  /** Tenant calendar date it was prepared on. */
  preparedOn: string;
}
