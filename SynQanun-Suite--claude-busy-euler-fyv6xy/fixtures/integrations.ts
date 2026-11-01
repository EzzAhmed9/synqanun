/**
 * fixtures/integrations.ts — what the firm's workspace is wired into.
 *
 * ===========================================================================
 * "CONNECTED" HERE MEANS A FIXTURE SAYS SO, AND NOTHING ELSE
 * ===========================================================================
 * BUILD_PLAN.md §5 is explicit about this one: integrations are "shown as
 * already 'connected' in fixture data — no real OAuth flow in Track A". §6
 * then puts the real flows in TRACK B rather than A.5, because they need
 * provider-side business verification and a security review, not just
 * implementation time.
 *
 * So a row marked connected here is not describing a live token. It is
 * describing the state the demo starts in, and the screen that renders it says
 * so in words rather than leaving the badge to imply otherwise.
 *
 * ===========================================================================
 * NO CREDENTIALS, NOT EVEN MASKED ONES
 * ===========================================================================
 * The Stitch export shows "API Account: ••••-9821" for the signature provider
 * and "•••• Stripe Connect" for payments. A masked credential is still a claim
 * that a credential exists: it tells a reader an account was provisioned, a key
 * was issued and somebody is holding it. None of that has happened, and the
 * masking makes it unfalsifiable rather than safe.
 *
 * The one identifier here is the mail account, and it is the firm's own
 * address at its own domain — a fact this repo already holds — not a login at
 * a third party.
 *
 * ===========================================================================
 * THE PROVIDER VOCABULARY IS THE WIZARD'S
 * ===========================================================================
 * `mail` and `meetings` use exactly the values
 * components/onboarding/OnboardingProvider.tsx already defines in
 * `IntegrationsState`: google | microsoft for mail, zoom | teams | meet for
 * meetings. The onboarding wizard collects the choice and this records the
 * result, so the two screens cannot disagree about what the product can talk
 * to. Signature and payments are additional categories rather than a second
 * naming of the same ones.
 *
 * ===========================================================================
 * WHAT IS NOT IN THIS FILE
 * ===========================================================================
 * Escrow. The Stitch exports have now asked for it fourteen times across the
 * project, most recently as "Stripe Connect (AED/USD Primary Escrow)" with a
 * "Live Payouts" badge. This product does not operate a client-money account,
 * and a settings screen claiming one is connected would be the most consequential
 * version of that claim yet — it says client funds are moving through a
 * facility the firm would be legally answerable for.
 *
 * ===========================================================================
 * THE PROVIDER NAMES APPEAR TWICE, AND THAT IS THE LESSER EVIL
 * ===========================================================================
 * "Google Workspace" is also in the dictionaries, under
 * `onboarding.integrations.google`, because the wizard offers the choice
 * before any tenant record exists for it to read from — at that point in the
 * product there is nothing to look up.
 *
 * The alternative was to make this file carry ids only and have the settings
 * screen translate them through the wizard's namespace, which would tie a
 * staff settings page to onboarding copy. A brand name is not translatable
 * content anyway: "Zoom" is Zoom in both locales, which is why it is stored
 * here as data rather than as a string a translator could change.
 *
 * The ids are the part that must not drift, and they do not — they are the
 * same union `IntegrationsState` uses.
 *
 * MOCK: Track B replaces this with the real provider connections and the
 * per-tenant token store behind them. At that point `connected` stops being a
 * boolean in a file and starts meaning a token that can expire, be revoked, or
 * fail — which is why the screen renders no Connect and no Disconnect today.
 */

import { demoFirm } from './firm';
import type { Locale } from '@/lib/i18n/routing';

/** The categories the product would talk to. */
export type IntegrationCategory =
  | 'mail'
  | 'meetings'
  | 'signature'
  | 'payments'
  /**
   * Saudi government e-services — ناجز (Najiz, the Ministry of Justice's
   * litigation portal) and واثق (Wathq, the Ministry of Commerce's commercial
   * registry verification service).
   *
   * ADDED NOT CONNECTED, AND THAT IS THE ONLY HONEST WAY TO ADD THEM. These
   * are the two systems a Saudi firm actually files and verifies through, so
   * their absence from this screen would read as an oversight. Their presence
   * marked "connected" would be far worse: it would tell a partner that the
   * hearing dates on their register came from Najiz and that a client's CR had
   * been checked against Wathq. Neither is true, and both are the kind of
   * claim somebody acts on.
   *
   * Real access to either is a government integration with its own onboarding,
   * which puts it in Track B alongside the e-signature and payment providers.
   */
  | 'government';

export const INTEGRATION_CATEGORIES: IntegrationCategory[] = [
  'mail',
  'meetings',
  'government',
  'signature',
  'payments',
];

export interface IntegrationProvider {
  /** Matches the onboarding wizard's vocabulary where one exists. */
  id: string;
  /** The provider's own name. Latin in both locales — it is a product name. */
  name: string;
  connected: boolean;
}

export interface IntegrationRecord {
  category: IntegrationCategory;
  /**
   * The providers this category can use, and which are on.
   *
   * A category with one connected provider reads as connected; `meetings`
   * carries several because a firm genuinely uses more than one.
   */
  providers: IntegrationProvider[];
  /**
   * The firm's own account, where the category has one. NOT a credential —
   * see the header. `null` where there is nothing truthful to show.
   */
  account: string | null;
  /**
   * Why this category is not connected, when it is not. Per locale, because
   * it is product copy rather than a provider's name.
   *
   * `null` when the category has a connected provider.
   */
  unavailable: Record<Locale, string> | null;
}

export const demoIntegrations: IntegrationRecord[] = [
  {
    category: 'mail',
    providers: [
      { id: 'google', name: 'Google Workspace', connected: false },
      { id: 'microsoft', name: 'Microsoft 365', connected: true },
    ],
    // The firm's own address at the firm's own domain. fixtures/firm.ts owns
    // the domain; this is not a login at Microsoft.
    account: `chambers@${demoFirm.domain}`,
    unavailable: null,
  },
  {
    category: 'government',
    providers: [
      // Latin ids, Arabic-and-Latin names: these are Saudi government services
      // and a Saudi lawyer calls them by their Arabic names.
      { id: 'najiz', name: 'ناجز · Najiz', connected: false },
      { id: 'wathq', name: 'واثق · Wathq', connected: false },
    ],
    account: null,
    unavailable: {
      en: 'Neither service is connected. Hearing dates on the register were entered by the firm, not pulled from Najiz, and no commercial registration here has been checked against Wathq. Connecting to either is a government integration with its own onboarding.',
      ar: 'لا خدمة منهما متصلة. فمواعيد الجلسات في السجل أدخلها المكتب ولم تُجلب من ناجز، ولم يُتحقق من أي سجل تجاري هنا عبر واثق. والربط بأي منهما تكامل حكومي له إجراءات اعتماد خاصة به.',
    },
  },
  {
    category: 'meetings',
    providers: [
      { id: 'zoom', name: 'Zoom', connected: true },
      { id: 'teams', name: 'Microsoft Teams', connected: true },
      { id: 'meet', name: 'Google Meet', connected: false },
    ],
    account: null,
    unavailable: null,
  },
  {
    /*
     * Deliberately NOT connected, and it is the honest row on this screen.
     *
     * fixtures/documents.ts already carries an `awaitingSignature` status with
     * a MOCK note saying the real thing "is a signature-request record held by
     * the e-signature provider, with its own signer list, audit trail and
     * expiry", and that the provider integration is Track B. Marking this
     * connected would tell a partner that documents sitting at "Needs
     * signature" are with a provider chasing them. They are not.
     */
    category: 'signature',
    providers: [],
    account: null,
    unavailable: {
      en: 'No signature provider is connected, so a document marked “needs signature” is a status in this workspace rather than a request somebody has been sent.',
      ar: 'لا يوجد مزوّد توقيع إلكتروني متصل، فالمستند المؤشَّر بـ«بانتظار التوقيع» حالةٌ في مساحة العمل لا طلبٌ أُرسل إلى أحد.',
    },
  },
  {
    /*
     * Also not connected. The client portal's invoice screens already refuse
     * to assert that money moved — see the payment-receipt note in
     * BookCallModal.tsx's list — and a connected payment gateway here would
     * contradict that from the other side of the product.
     */
    category: 'payments',
    providers: [],
    account: null,
    unavailable: {
      en: 'No payment gateway is connected. Fee statements record what is owed and what has been settled; nothing in this workspace takes a payment.',
      ar: 'لا توجد بوابة دفع متصلة. تسجّل كشوف الأتعاب ما هو مستحق وما جرى سداده؛ ولا شيء في مساحة العمل يستقبل مدفوعات.',
    },
  },
];
