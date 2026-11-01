'use client';

import * as React from 'react';
import Image from 'next/image';
import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/lib/i18n/navigation';
import { recordedMueen, type MueenAvatarProvider } from '@/lib/mueen/avatar';
import { cn } from '@/lib/utils';
import { launcherAppliesTo } from './launcher-visibility';
import { MueenGreetingControls, MUEEN_ANSWER_BOX, MUEEN_SECONDARY } from './MueenGreeting';
import { MueenSoundBars, MueenStage } from './MueenStage';
import { useMueenGreeting } from './use-mueen-greeting';
import { usePrefersReducedMotion } from './use-reduced-motion';

/**
 * The assistant's floating launcher, and the panel behind it — STAFF ONLY.
 *
 * Mounted once in app/[locale]/(staff)/layout.tsx, beside <StaffTimer> and
 * <StaffTabBar>, so it survives navigation between staff screens and appears
 * on none of the client portal's. design.md §11 item 6 keeps the assistant off
 * the client side entirely, and design.md §6 already reserved elevation level
 * 2 for "modals and the floating AI chat panel" — this is that panel.
 *
 * ===========================================================================
 * THE GREETING PLAYS WHEN THE PANEL OPENS
 * ===========================================================================
 * Every way into the assistant greets you, because that is what a greeting is
 * for. The playback itself belongs to `useMueenGreeting`, which the Digest and
 * the Assistant screen call too — so the floating panel has no <video> logic
 * of its own and cannot drift from them.
 *
 * ===========================================================================
 * WHAT IS REAL
 * ===========================================================================
 * One recording. A real person was filmed saying one greeting, once, in
 * Arabic, and that clip is the only thing on this surface that was ever
 * spoken aloud. Everything else the assistant says in this product is
 * assembled from the firm's own records and is not voiced at all.
 *
 * So the panel distinguishes the two in words, not just in pixels:
 *
 *   · the greeting carries "Demo: pre-recorded response"
 *   · the written answer carries "Demo: a written answer; nothing is spoken"
 *
 * and the stage refuses to wear the face for the second one. See MueenStage.
 *
 * No microphone is opened here, nothing is transcribed, and the panel holds no
 * conversation — real questions go to the Digest, which is one link away and
 * is the same assistant with the same script.
 *
 * ===========================================================================
 * KEYBOARD AND SCREEN READER
 * ===========================================================================
 * Built on the same mechanics as StaffNotificationsPanel: role="dialog",
 * aria-modal, focus moved in on open, Tab and Shift+Tab held inside, Escape
 * and the close button hand focus back to the launcher. A click outside closes
 * it without stealing focus from whatever was clicked. The stage carries one
 * accessible name per state; the frames and the sound bars are aria-hidden,
 * and the caption is ordinary text in a polite live region.
 */

/** Diameter of the floating launcher, in px. Mirrored in globals.css. */
const LAUNCHER_PX = 56;
/** Diameter of the panel's stage, in px — 3x the 480px source at this size. */
const STAGE_PX = 152;
/**
 * How long the rings run for a written answer: the Digest's own word pace, so
 * the two surfaces take the same time to "say" the same sentence.
 */
const WORD_MS = 130;

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

export interface MueenLauncherProps {
  /**
   * Where the face comes from. Swap this for a live avatar provider and
   * nothing below changes — see lib/mueen/avatar.ts.
   */
  provider?: MueenAvatarProvider;
}

export function MueenLauncher({ provider = recordedMueen }: MueenLauncherProps) {
  const t = useTranslations('mueen');
  const pathname = usePathname();

  const [open, setOpen] = React.useState(false);
  const launcherRef = React.useRef<HTMLButtonElement>(null);

  /*
    The Digest and the Assistant ARE this assistant, at full size, and both now
    carry the face themselves. A launcher that opened a small copy on top of
    one of them would be two Mueens on one screen, so the chrome stands down on
    its own screens. The rule is shared with <StaffTimer>, which stacks itself
    above this button and must not reserve room for it where it is absent.
  */
  if (!launcherAppliesTo(pathname)) return null;

  return (
    <>
      <button
        ref={launcherRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label={open ? t('closeLabel') : t('openLabel')}
        title={open ? t('closeLabel') : t('openLabel')}
        data-mueen-trigger
        className={cn(
          'fixed z-40 overflow-hidden rounded-pill border-2 border-legal-navy bg-white',
          'shadow-raised transition-transform hover:scale-105 motion-reduce:transition-none',
          'motion-reduce:hover:scale-100',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-legal-navy',
          // Above the phone tab bar, exactly as TimerPill is — design.md §8.
          'max-tablet:bottom-[calc(var(--syn-tab-bar-height)+env(safe-area-inset-bottom)+0.75rem)]',
          'tablet:bottom-6'
        )}
        // Logical inset, so the launcher sits in the END corner in both
        // directions: bottom-right in English, bottom-left in Arabic.
        style={{ insetInlineEnd: '1.5rem', width: LAUNCHER_PX, height: LAUNCHER_PX }}
      >
        {/*
          The still circle, not the loop: a face that moved forever in the
          corner of every screen would be the most distracting object in the
          product. 4.8 KB, and the only avatar byte the staff side pays before
          somebody asks for the panel.
        */}
        <Image
          src={provider.face.small}
          alt=""
          width={provider.face.smallSize}
          height={provider.face.smallSize}
          // Already a 128px circle webp — see MueenStage for the measurements
          // behind serving these two untransformed.
          unoptimized
          className="h-full w-full object-cover"
        />
      </button>

      {open ? (
        <MueenPanel
          provider={provider}
          onClose={() => setOpen(false)}
          returnFocusTo={launcherRef}
        />
      ) : null}
    </>
  );
}

/* ===========================================================================
 * The panel
 * ======================================================================== */

function MueenPanel({
  provider,
  onClose,
  returnFocusTo,
}: {
  provider: MueenAvatarProvider;
  onClose: () => void;
  returnFocusTo: React.RefObject<HTMLButtonElement | null>;
}) {
  const t = useTranslations('mueen');
  const reduced = usePrefersReducedMotion();

  // Opening the panel IS the click, so the greeting starts with sound.
  const greeting = useMueenGreeting({ provider, autoPlay: true });

  const panelRef = React.useRef<HTMLDivElement>(null);
  const timer = React.useRef<number | null>(null);
  const headingId = React.useId();

  /** The written answer's own turn — rings, no face, no audio. */
  const [writtenTurn, setWrittenTurn] = React.useState<'none' | 'speaking' | 'done'>('none');
  const written = t('written.line');

  const mode = greeting.speaking ? 'speaking' : writtenTurn === 'speaking' ? 'abstract' : 'idle';

  const dismiss = React.useCallback(() => {
    onClose();
    returnFocusTo.current?.focus?.();
  }, [onClose, returnFocusTo]);

  // Focus in on open; Escape and Tab held inside. Same mechanics as
  // StaffNotificationsPanel — read its header for why focus is trapped.
  React.useEffect(() => {
    panelRef.current?.focus();
  }, []);

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        dismiss();
        return;
      }
      if (event.key !== 'Tab' || !panelRef.current) return;

      const focusable = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const current = document.activeElement;
      const inside = panelRef.current.contains(current);

      if (event.shiftKey && (current === first || current === panelRef.current || !inside)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (current === last || !inside)) {
        event.preventDefault();
        first.focus();
      }
    }

    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (panelRef.current?.contains(target)) return;
      // The launcher toggles on its own; letting this fire too would close
      // and reopen in one click.
      if ((target as HTMLElement).closest?.('[data-mueen-trigger]')) return;
      onClose();
    }

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('mousedown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('mousedown', onPointerDown);
    };
  }, [onClose, dismiss]);

  React.useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    },
    []
  );

  /** The written answer: rings and sound bars, no face, no audio. */
  function sayWritten() {
    if (timer.current !== null) window.clearTimeout(timer.current);
    greeting.stop();
    setWrittenTurn('speaking');
    const words = written.split(/\s+/).filter(Boolean).length;
    timer.current = window.setTimeout(
      () => setWrittenTurn('done'),
      reduced ? 600 : words * WORD_MS
    );
  }

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={headingId}
      tabIndex={-1}
      className={cn(
        'fixed z-40 flex flex-col overflow-hidden',
        'rounded-card border border-gray-200 bg-white shadow-overlay outline-none',
        /*
          Tall enough to be worth opening, short enough to clear the chrome it
          floats above. 11rem is the deepest the bottom offset ever gets — tab
          bar, safe area, launcher and the gaps between them — plus room to
          breathe at the top. `dvh`, not `vh`: this is anchored to the BOTTOM of
          a phone viewport, which is exactly where the two disagree when the
          browser's own bar slides away.
        */
        'max-h-[min(36rem,calc(100dvh-11rem))]',
        /*
          The panel rides above the launcher, which keeps the corner.

          Below 768px it spans the width inside a 0.75rem gutter rather than
          being anchored 1.5rem in — a 23rem panel on a 375px screen hangs off
          the start edge otherwise, which is the bug DemoViewerMenu hit. The
          end inset is a CLASS and not an inline style for the same reason: an
          inline `insetInlineEnd` outranks every stylesheet rule, so the phone
          override could not reach it and the panel came out lopsided, 24px in
          on one side and 12px on the other. The two widths are exclusive media
          queries, so neither has to win on order.
        */
        'tablet:w-[min(23rem,calc(100vw-2rem))] tablet:[inset-inline-end:1.5rem]',
        'max-tablet:[inset-inline:0.75rem]',
        'max-tablet:bottom-[calc(var(--syn-tab-bar-height)+env(safe-area-inset-bottom)+0.75rem+var(--syn-launcher-size)+0.5rem)]',
        'tablet:bottom-[calc(1.5rem+var(--syn-launcher-size)+0.5rem)]'
      )}
    >
      {/* Header: the stage, the name, and what it is -------------------- */}
      {/* `--syn-ai-surface` is the token design.md §4 declares for exactly this
          surface: "AI-agent chat panel… legal-navy at ~6% opacity as a
          background wash, not solid." Read through a variable rather than
          re-tinted here, so the panel cannot drift from <Card aiSurface>. */}
      <div
        className="relative flex flex-col items-center gap-3 border-b border-gray-200 px-5 pb-4 pt-5"
        style={{ background: 'var(--syn-ai-surface)' }}
      >
        <button
          type="button"
          onClick={dismiss}
          aria-label={t('closeLabel')}
          className="absolute top-2 rounded-sm p-1.5 text-gray-600 hover:bg-legal-navy/8 hover:text-gray-700"
          style={{ insetInlineEnd: '0.5rem' }}
        >
          <X aria-hidden size={16} />
        </button>

        <MueenStage
          provider={provider}
          mode={mode}
          recording={greeting.recording}
          size={STAGE_PX}
          muted={greeting.muted}
          reduced={reduced}
          videoRef={greeting.videoRef}
          onEnded={greeting.onEnded}
        />

        {mode === 'abstract' ? <MueenSoundBars /> : null}

        <div className="flex flex-col items-center gap-0.5 text-center">
          <h2 id={headingId} className="font-sans text-title text-legal-navy">
            {t('name')}
          </h2>
          {/* The label, in words, every time the panel is open. */}
          <p className="text-caption text-gray-700">{t('isAI')}</p>
        </div>
      </div>

      {/* Body ----------------------------------------------------------- */}
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        {/* The greeting — the one thing here that was ever spoken. Controls,
            caption and labels all come from the shared component. */}
        <MueenGreetingControls greeting={greeting} />

        {/* A written answer — the mode every other reply takes ----------- */}
        <div className="mt-4 border-t border-gray-200 pt-4">
          <button
            type="button"
            onClick={sayWritten}
            className={cn(
              'inline-flex h-10 items-center rounded-pill px-4 text-caption font-medium',
              MUEEN_SECONDARY
            )}
          >
            {t('written.ask')}
          </button>

          <div aria-live="polite">
            {writtenTurn !== 'none' ? (
              <div className={cn('mt-3', MUEEN_ANSWER_BOX)}>
                <p className="text-body text-gray-700">
                  <bdi>{written}</bdi>
                </p>
                <p className="mt-2 text-caption font-medium text-gray-700">
                  {t('written.notSpoken')}
                </p>
              </div>
            ) : null}
          </div>
        </div>

        {/* Where a real question goes ----------------------------------- */}
        <div className="mt-4 border-t border-gray-200 pt-4">
          <Link
            href="/staff/ai/digest"
            onClick={onClose}
            className="text-caption font-medium text-legal-navy hover:underline"
          >
            {t('openDigest')}
          </Link>
          <p className="mt-1 text-caption text-gray-600">{t('digestNote')}</p>
        </div>
      </div>
    </div>
  );
}

export default MueenLauncher;
