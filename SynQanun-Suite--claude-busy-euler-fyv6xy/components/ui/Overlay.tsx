'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

export type OverlaySize = 'sm' | 'md' | 'lg' | 'xl';

export interface OverlayProps {
  open: boolean;
  onClose: () => void;
  size?: OverlaySize;
  /**
   * Where the panel sits in the viewport.
   *
   * `center` is design.md §5's modal treatment and the default. `top` exists for
   * one case: a panel whose height changes as the user types. A search overlay
   * that is vertically centred grows and shrinks around its own middle, so the
   * input under the cursor moves every time the result count changes. Pinning
   * the top edge keeps the input still and lets results grow downwards.
   */
  align?: 'center' | 'top';
  /** Prevent backdrop-click and Escape from dismissing. Use only when closing
   *  would lose work. */
  dismissible?: boolean;
  /** Wired to the panel's `aria-labelledby`. */
  labelledBy?: string;
  /** Wired to the panel's `aria-describedby`. */
  describedBy?: string;
  /**
   * Move focus to the first focusable child on open.
   *
   * Off for the search overlay, which focuses its own input — letting this run
   * first would put focus on whatever the panel happens to render first and then
   * move it, which screen readers announce twice.
   */
  autoFocus?: boolean;
  className?: string;
  children: React.ReactNode;
}

const SIZE_CLASSES: Record<OverlaySize, string> = {
  sm: 'max-w-[400px]',
  md: 'max-w-[560px]',
  lg: 'max-w-[760px]',
  xl: 'max-w-[840px]',
};

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * The mechanics every overlay needs: a portal, the scrim, Escape, a focus trap,
 * a background-scroll lock, and returning focus to whatever opened it.
 *
 * WHY THIS IS SEPARATE FROM <Modal>
 * ---------------------------------------------------------------------------
 * <Modal> was the only overlay in the kit, so all of this lived inside it
 * alongside the title/description/footer layout. The global search overlay is
 * the second, and its header is a text input rather than a heading — it wants
 * none of that layout and all of this behaviour.
 *
 * Copying a focus trap is not the same class of duplication as copying a border
 * radius. A trap that is subtly different in one overlay is a keyboard user
 * escaping into the page behind a dialog, which is a defect nobody sees until
 * they are the one using a keyboard. So the behaviour is extracted at its second
 * instance, the same rule <Textarea> followed, and <Modal> is now this plus a
 * header and a footer.
 *
 * design.md §6 puts overlays at elevation level 2 — the shadow is applied here
 * so both callers land on it.
 */
export function Overlay({
  open,
  onClose,
  size = 'md',
  align = 'center',
  dismissible = true,
  labelledBy,
  describedBy,
  autoFocus = true,
  className,
  children,
}: OverlayProps) {
  const panelRef = React.useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  // Escape to dismiss, and a focus trap so Tab cannot wander behind the overlay
  // into the page underneath.
  React.useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && dismissible) {
        onClose();
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

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, dismissible, onClose]);

  // Lock background scroll and restore focus to whatever opened the overlay.
  React.useEffect(() => {
    if (!open) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    if (autoFocus) {
      const target = panelRef.current?.querySelector<HTMLElement>(FOCUSABLE) ?? panelRef.current;
      target?.focus();
    }

    return () => {
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
  }, [open, autoFocus]);

  if (!mounted || !open) return null;

  return createPortal(
    <div
      // Scrim: gray-900 at 45%, a token rather than an rgba() literal, and
      // gray-900 rather than pure black — design.md §2 is explicit that #000
      // is logo-only and UI black is gray-900.
      className={cn(
        'fixed inset-0 z-50 flex justify-center bg-gray-900/45 p-4',
        align === 'top' ? 'items-start pt-[8vh] max-tablet:pt-4' : 'items-center'
      )}
      onMouseDown={(event) => {
        if (dismissible && event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        tabIndex={-1}
        className={cn(
          'relative flex w-full flex-col rounded-card border border-gray-200 bg-white',
          // Elevation level 2 — design.md §6.
          'shadow-overlay',
          'max-h-[calc(100vh-32px)]',
          SIZE_CLASSES[size],
          className
        )}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}

export default Overlay;
