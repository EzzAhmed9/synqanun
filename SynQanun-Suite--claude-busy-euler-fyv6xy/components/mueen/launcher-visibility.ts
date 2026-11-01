/**
 * Where the floating launcher appears — asked by two components, so it is
 * written once.
 *
 * <MueenLauncher> asks in order to render nothing, and <StaffTimer> asks in
 * order to know whether to stack itself above it. When those two disagreed,
 * the timer reserved 68px for a launcher that was not on the screen: the rule
 * lives here so they cannot.
 *
 * A plain module with no React and no imports, so the layout, the chrome and
 * the launcher can all reach it without pulling anything else along.
 */

/**
 * Routes that ARE the assistant, at full size, and carry the face themselves.
 * A launcher there would open a small copy of the screen it is sitting on.
 */
const OWN_SCREENS = ['/staff/ai/digest', '/staff/ai/assistant'];

/** Whether the floating launcher is rendered on this path (locale stripped). */
export function launcherAppliesTo(pathname: string): boolean {
  return !OWN_SCREENS.some((route) => pathname.startsWith(route));
}
