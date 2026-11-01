'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { demoStaff } from '@/fixtures/practice';
import { DEMO_VIEWER_COOKIE } from '@/lib/demo-viewer';

/**
 * Switch which fixture person the demo renders as.
 *
 * ===========================================================================
 * THE ONE WRITE IN THIS PRODUCT THAT IS NOT ABOUT THE FIRM'S RECORDS
 * ===========================================================================
 * BUILD_PLAN.md §5.1 splits writes by what they assert. This asserts nothing
 * at all: no record changes, nothing is created, nobody is told, and the firm's
 * data is identical before and after. It changes one thing — which of the
 * fixture people the reader is looking through — and it is a demo device
 * rather than a feature, which is why the control that calls it says so out
 * loud instead of looking like an account switcher.
 *
 * It is still a Server Action rather than a client-side cookie write, because a
 * Server Component has to be able to read the result on the very next render.
 *
 * ===========================================================================
 * IT VALIDATES, EVEN THOUGH IT LOOKS HARMLESS
 * ===========================================================================
 * A Server Action is a public endpoint — the same reasoning every other action
 * in this codebase carries. This one grants nothing, so the worst an arbitrary
 * value could do is render a broken screen, but an allow-list against the
 * roster costs one line and keeps the habit intact. `demoStaff`, not
 * `allStaff()`: somebody added to the roster this session is a record, not
 * somebody to be viewed as.
 *
 * MOCK: deleted at Track A.5 along with lib/demo-viewer.ts. Seeing the product
 * as another rank then means signing in as somebody who holds it.
 */
export async function setDemoViewer(staffId: string): Promise<{ ok: boolean }> {
  if (!demoStaff.some((member) => member.id === staffId)) {
    return { ok: false };
  }

  const jar = await cookies();
  jar.set(DEMO_VIEWER_COOKIE, staffId, {
    path: '/',
    sameSite: 'lax',
    // Not readable from JavaScript. The switcher posts here and re-reads
    // through the server, so nothing in the browser needs the value.
    httpOnly: true,
    // Vercel serves https; local dev does not, and a `secure` cookie would
    // silently never be set there.
    secure: process.env.NODE_ENV === 'production',
    // A review session, not a persistent identity.
    maxAge: 60 * 60 * 8,
  });

  // Every staff screen is force-dynamic, but the layout caches the rank it was
  // handed — without this the sidebar keeps the old rank's entries until a hard
  // reload.
  revalidatePath('/', 'layout');
  return { ok: true };
}
