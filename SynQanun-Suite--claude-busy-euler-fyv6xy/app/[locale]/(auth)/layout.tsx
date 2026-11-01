import { setRequestLocale } from 'next-intl/server';

/**
 * Pre-auth shell — deliberately thin.
 *
 * WHY THIS IS ALMOST EMPTY (it was not, and the Gateway is the reason)
 * ---------------------------------------------------------------------------
 * An earlier version of this layout owned a header (language toggle,
 * end-aligned), a vertically-centred `main`, and a footer carrying a brand
 * descriptor, the SynQanun credit and the app version. That shape was
 * extracted from Splash — the only screen that existed at the time.
 *
 * The Client Gateway showed it was wrong. That screen is:
 *
 *   · a firm-identity header bar — white, bordered, firm name at the start,
 *     portal status and helpdesk at the end. Not a bare toggle on a
 *     transparent strip.
 *   · a wide, TOP-aligned 7/5 two-column grid at max-width. Not a vertically
 *     centred single column.
 *   · a footer carrying the tenant's copyright beside the SynQanun credit.
 *     No brand descriptor, no version string.
 *
 * Three out of three structural elements differ. Forcing Splash's centred
 * `main` onto a two-column gateway would have meant every gateway-shaped
 * screen fighting the frame with negative margins and overrides — the exact
 * per-screen drift BUILD_PLAN.md §3 exists to prevent, just relocated into
 * the layout.
 *
 * So what is genuinely common across both screens is only this: the gray-50
 * canvas, full viewport height, and a column that lets a footer sit at the
 * bottom. That is what this layout provides, and nothing more.
 *
 * The other real commonality is not structural and does not belong in a
 * layout — it is a component. Both screens must render the "Powered by
 * SynQanun" credit (brand-guidelines.md §7.2), and both do, via
 * components/brand/PoweredBy.tsx, positioned by each screen's own footer.
 *
 * If Accept Invite and the reset flow turn out to share the Gateway's header
 * bar, that becomes a component (an AuthHeader), not a layout — because the
 * Splash will still not want it.
 */
export default async function AuthLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <div className="flex min-h-screen flex-col bg-canvas">{children}</div>;
}
