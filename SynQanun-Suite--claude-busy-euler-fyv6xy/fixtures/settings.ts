/**
 * fixtures/settings.ts — the client's own portal preferences.
 *
 * ONE CHANNEL, BECAUSE THERE IS ONE CHANNEL
 * ---------------------------------------------------------------------------
 * The Stitch export offers two columns of switches per category: "Email" and
 * "SMS / WhatsApp". Email is at least the channel this product already assumes
 * everywhere else — invitations and password resets are both emails — so a
 * preference over it describes something the system is meant to do.
 *
 * SMS and WhatsApp appear nowhere else in the product, in no batch of
 * BUILD_PLAN.md, and in no integration Track B is scheduled to build. A switch
 * is a promise that turning it on changes what reaches you; over a channel that
 * does not exist, it is a promise about nothing. The column is gone.
 *
 * THE CATEGORIES ARE THE PORTAL'S OWN SECTIONS
 * ---------------------------------------------------------------------------
 * Four categories, each one naming a part of the portal a client already has:
 * their engagements, their documents, their invoices, their messages. The
 * export instead invents categories that cut across the product — "Secure
 * Messages & Privileged Counsel Dispatches", "escrow deposit receipts" — which
 * describe features that are not there.
 */

export type NotificationCategory = 'engagements' | 'documents' | 'invoices' | 'messages';

export const NOTIFICATION_CATEGORIES: NotificationCategory[] = [
  'engagements',
  'documents',
  'invoices',
  'messages',
];

export interface NotificationPreference {
  category: NotificationCategory;
  /** Send an email when something in this category happens. */
  email: boolean;
}

// MOCK: replace with GET /api/client/preferences and a PATCH to change them,
// stored per ACCOUNT rather than per organisation — two people at the same
// client want different things in their inbox, the same reason a thread's
// unread flag cannot live on the thread (fixtures/messages.ts). Track A.5.
export const demoNotificationPreferences: NotificationPreference[] = [
  { category: 'engagements', email: true },
  { category: 'documents', email: true },
  // Off, so the screen shows both states from a real value rather than from a
  // hardcoded "one of these is grey" in the markup.
  { category: 'invoices', email: false },
  { category: 'messages', email: true },
];
