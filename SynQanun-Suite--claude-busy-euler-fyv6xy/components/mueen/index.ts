/**
 * The assistant's face, and the one engine that makes it speak.
 *
 * <MueenLauncher> is the floating chrome, mounted once in
 * app/[locale]/(staff)/layout.tsx. Every other surface that shows معين — the
 * Digest's voice view, the Assistant screen — composes the same three pieces:
 * `useMueenGreeting` for playback, <MueenStage> for the face, and
 * <MueenGreetingControls> for the controls, caption and labels. Nothing else
 * should mount a <video> of its own.
 */
export { MueenLauncher, type MueenLauncherProps } from './MueenLauncher';
// Asked by the launcher and by <StaffTimer>, which stacks above it.
export { launcherAppliesTo } from './launcher-visibility';
export {
  MueenAvatarHeader,
  MueenGreetingControls,
  // Self-contained: owns its own playback, for a server-rendered screen.
  MueenGreetingSurface,
  MUEEN_ANSWER_BOX,
  MUEEN_SECONDARY,
} from './MueenGreeting';
export {
  MueenSoundBars,
  MueenStage,
  type MueenStageMode,
  type MueenStageProps,
} from './MueenStage';
export { useMueenGreeting, type MueenGreeting, type UseMueenGreetingOptions } from './use-mueen-greeting';
export { usePrefersReducedMotion } from './use-reduced-motion';
