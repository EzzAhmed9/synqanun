/**
 * Artificial network delay, shared by every fake API surface.
 *
 * SPLIT OUT OF lib/mock-api.ts, AND THE REASON MATTERS
 * ---------------------------------------------------------------------------
 * `mock-api.ts` became server-only when `currentStaff()` started reading the
 * demo viewer cookie: `next/headers` cannot be imported into a client bundle,
 * and three password-reset forms are Client Components that call the fake API.
 *
 * Those forms moved to lib/password-reset.ts, which needs this delay too — and
 * importing it back out of mock-api.ts would have pulled the whole server-only
 * module into the client bundle again, which is the thing the split exists to
 * prevent. So the one genuinely shared, environment-neutral piece lives here.
 *
 * BUILD_PLAN.md §1: "a thin fake-API layer (lib/mock-api.ts) with artificial
 * delay, so swapping to real endpoints later is a one-file change."
 */

/** Tunable so a demo can be slowed down to show off loading states, or zeroed
 *  out to make tests fast. */
export const MOCK_LATENCY_MS = { min: 180, max: 460 } as const;

export function latency(
  { min, max }: { min: number; max: number } = MOCK_LATENCY_MS
): Promise<void> {
  const ms = min + Math.random() * (max - min);
  return new Promise((resolve) => setTimeout(resolve, ms));
}
