'use client';

import * as React from 'react';

/**
 * Cross-cutting UI state.
 *
 * BUILD_PLAN.md §1: "React Context for cross-cutting UI state (language,
 * sidebar collapse, active timer); no heavier state library needed for the
 * prototype."
 *
 * Language is deliberately absent from this context — next-intl already owns
 * it through the `[locale]` route segment, and duplicating it here would
 * create two sources of truth that can disagree. That leaves two concerns:
 * sidebar collapse and the billable-hours timer.
 *
 * Track A.5 note: this context stays. It is UI state, not server state. When
 * the real API arrives, BUILD_PLAN.md §1 puts data-fetching state in React
 * Query alongside this, not instead of it. The one thing that must change is
 * the timer's persistence — see the MOCK comment on `stopTimer`.
 */

const SIDEBAR_STORAGE_KEY = 'synqanun.sidebar.collapsed';

export interface TimerState {
  /** Whether the clock is currently advancing. */
  running: boolean;
  /** Total recorded seconds, including time from previous run segments. */
  elapsedSeconds: number;
  /** Matter this time is being recorded against, or null when unassigned. */
  matterRef: string | null;
  /** Whether the time logging dialog is requested */
  modalOpen: boolean;
}

interface UIStateValue {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;

  timer: TimerState;
  startTimer: (matterRef?: string) => void;
  pauseTimer: () => void;
  stopTimer: () => void;
  discardTimer: () => void;
  closeTimerModal: () => void;
  resetTimer: () => void;
}

const UIStateContext = React.createContext<UIStateValue | null>(null);

export function UIStateProvider({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);
  const [timer, setTimer] = React.useState<TimerState>({
    running: false,
    elapsedSeconds: 0,
    matterRef: null,
    modalOpen: false,
  });

  // Restore the user's sidebar preference; fall back to design.md §8's
  // responsive rule — below 1280px the sidebar collapses to an icon rail.
  React.useEffect(() => {
    let stored: string | null = null;
    try {
      stored = window.localStorage.getItem(SIDEBAR_STORAGE_KEY);
    } catch {
      // Private browsing or blocked storage — fall through to the breakpoint.
    }

    if (stored === 'true' || stored === 'false') {
      setSidebarCollapsed(stored === 'true');
    } else {
      setSidebarCollapsed(window.innerWidth < 1280);
    }
  }, []);

  const persistSidebar = React.useCallback((collapsed: boolean) => {
    setSidebarCollapsed(collapsed);
    try {
      window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(collapsed));
    } catch {
      // Preference simply won't survive a reload. Not worth surfacing.
    }
  }, []);

  const toggleSidebar = React.useCallback(() => {
    persistSidebar(!sidebarCollapsed);
  }, [persistSidebar, sidebarCollapsed]);

  // Tick once a second while running.
  React.useEffect(() => {
    if (!timer.running) return;
    const id = window.setInterval(() => {
      setTimer((prev) => ({ ...prev, elapsedSeconds: prev.elapsedSeconds + 1 }));
    }, 1000);
    return () => window.clearInterval(id);
  }, [timer.running]);

  const startTimer = React.useCallback((matterRef?: string) => {
    setTimer((prev) => ({
      running: true,
      elapsedSeconds: prev.elapsedSeconds,
      matterRef: matterRef ?? prev.matterRef,
      modalOpen: false,
    }));
  }, []);

  const pauseTimer = React.useCallback(() => {
    setTimer((prev) => ({ ...prev, running: false }));
  }, []);

  const stopTimer = React.useCallback(() => {
    setTimer((prev) => {
      if (prev.elapsedSeconds > 0) {
        return { ...prev, running: false, modalOpen: true };
      }
      return { running: false, elapsedSeconds: 0, matterRef: null, modalOpen: false };
    });
  }, []);

  const discardTimer = React.useCallback(() => {
    setTimer({ running: false, elapsedSeconds: 0, matterRef: null, modalOpen: false });
  }, []);

  const closeTimerModal = React.useCallback(() => {
    setTimer((prev) => ({ ...prev, modalOpen: false }));
  }, []);

  const resetTimer = React.useCallback(() => {
    setTimer({ running: false, elapsedSeconds: 0, matterRef: null, modalOpen: false });
  }, []);

  const value = React.useMemo<UIStateValue>(
    () => ({
      sidebarCollapsed,
      toggleSidebar,
      setSidebarCollapsed: persistSidebar,
      timer,
      startTimer,
      pauseTimer,
      stopTimer,
      discardTimer,
      closeTimerModal,
      resetTimer,
    }),
    [
      sidebarCollapsed,
      toggleSidebar,
      persistSidebar,
      timer,
      startTimer,
      pauseTimer,
      stopTimer,
      discardTimer,
      closeTimerModal,
      resetTimer,
    ]
  );

  return <UIStateContext.Provider value={value}>{children}</UIStateContext.Provider>;
}

export function useUIState(): UIStateValue {
  const context = React.useContext(UIStateContext);
  if (!context) {
    throw new Error('useUIState must be used inside <UIStateProvider>.');
  }
  return context;
}

/**
 * Format seconds as H:MM:SS.
 *
 * design.md §12: Western (0–9) digits in BOTH languages for dates, currency
 * and IDs — "standard practice in Egyptian/GCC legal and financial documents;
 * don't switch to Arabic-Indic numerals even in full-Arabic screens." Plain
 * `padStart` on Latin digits is therefore correct here, and using
 * `Intl.NumberFormat` with an `ar-EG` locale would be a bug.
 */
export function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
