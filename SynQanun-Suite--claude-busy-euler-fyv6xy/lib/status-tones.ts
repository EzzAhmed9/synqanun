import type { BadgeTone } from '@/components/ui/Badge';
import type { DocumentStatus } from '@/fixtures/documents';
import type { InvoiceStatus } from '@/fixtures/invoices';

/**
 * lib/status-tones.ts — which colour a status wears, decided once per status.
 *
 * WHY THESE MOVED HERE
 * ---------------------------------------------------------------------------
 * The invoice map lived in app/[locale]/(client)/invoices/status-tone.ts, split
 * out of the list screen when the detail screen became its second reader. The
 * document map lived as a private `const` inside DocumentsLibrary.tsx.
 *
 * Global search is the third reader of one and the second of the other, and it
 * is a SERVER caller — so the invoice map's old home would have meant lib/
 * importing from app/, which is backwards, and the document map's old home was
 * inside a 'use client' module entirely.
 *
 * Both are now here: no directive, no React, importable from either side. The
 * point is not tidiness. An overdue invoice that is red on the list, red on the
 * detail and amber in the search results is a bug that only shows up when
 * someone happens to look at all three, and the way to not have it is to have
 * one map. That is not hypothetical — before the invoice map was extracted, the
 * engagement detail's Invoices tab painted `overdue` as `warning` while the
 * ledger painted it `error`, so one invoice read amber on a matter and red on
 * the list.
 *
 * NO DIRECTIVE, DELIBERATELY. A plain object exported from a 'use client'
 * module becomes a client reference when a Server Component imports it — the
 * failure `tabTriggerClasses` hit when it lived in Tabs.tsx ("Attempted to call
 * tabTriggerClasses() from the server"). Both the invoice detail page and
 * lib/mock-api.ts read these from the server, so neither map may live beside a
 * component.
 *
 * design.md §2 for the tones themselves: success = completed and confirmed,
 * warning = waiting on someone or approaching, error = failed or breached.
 */

/**
 * Document status → tone. `awaitingSignature` is the only one asking the client
 * for anything, so it is the only one that warns.
 */
export const DOCUMENT_STATUS_TONE: Record<DocumentStatus, BadgeTone> = {
  awaitingSignature: 'warning',
  draft: 'info',
  final: 'success',
};

/**
 * Invoice status → tone.
 *
 * `overdue` is the one `error` in the client portal that is not a validation
 * failure: a passed due date is a real breach of the engagement's payment terms,
 * not a UI mistake, and softening it to a warning would put it in the same
 * visual class as "due next week".
 */
export const INVOICE_STATUS_TONE: Record<string, BadgeTone> = {
  paid: 'success',
  due: 'warning',
  overdue: 'error',
  draft: 'neutral',
};
