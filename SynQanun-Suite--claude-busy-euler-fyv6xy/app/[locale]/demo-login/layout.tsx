import { setRequestLocale } from 'next-intl/server';

/**
 * Canvas for the demo gate.
 *
 * The same one line the pre-auth shell provides — gray-50, full viewport
 * height, a column so the footer sits at the bottom.
 *
 * NOT reused from (auth) by putting this screen inside that group, and the
 * reason is the middleware rather than the design. The gate exempts exactly one
 * path, so that path has to be stable and obvious: `/[locale]/demo-login`.
 * Filing it under a route group would leave the exemption depending on a group
 * name that does not appear in the URL, which is the kind of coupling that
 * breaks silently the day somebody reorganises the folders — and breaking
 * silently here means either locking everybody out or letting everybody in.
 */
export default async function DemoLoginLayout({
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
