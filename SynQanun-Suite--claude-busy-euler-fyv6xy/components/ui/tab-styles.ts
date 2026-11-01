import { cn } from '@/lib/utils';

/**
 * The tab strip's visual treatment.
 *
 * WHY THIS IS ITS OWN FILE
 * ---------------------------------------------------------------------------
 * It lived in Tabs.tsx first, which does not work: that file carries
 * `'use client'`, so every one of its exports is a client module, and a Server
 * Component calling this function got "Attempted to call tabTriggerClasses()
 * from the server but tabTriggerClasses is on the client." A pure string
 * helper has no business being client-only, so it moved to a module with no
 * directive — importable from either side.
 *
 * WHY IT IS SHARED AT ALL
 * ---------------------------------------------------------------------------
 * There are two kinds of tab in this product and they cannot be one component.
 *
 * <Tabs> switches panels in place: every panel is on the page, one is shown,
 * and `role="tablist"` is the correct semantics.
 *
 * A matter detail's tabs are each their own URL, so they have to be a <nav> of
 * real links — otherwise the back button, "open in new tab" and bookmarking all
 * stop working, and a screen reader is told these are in-page panels when they
 * are navigation.
 *
 * Two interaction models, two sets of semantics, one look. Sharing the class
 * string is what stops the look from drifting apart — the failure BUILD_PLAN.md
 * §3 names, where the second screen restyles its own tabs and they quietly stop
 * matching.
 */
export function tabTriggerClasses(isActive: boolean, disabled = false): string {
  return cn(
    'inline-flex items-center gap-2 px-3 py-2 text-body font-medium',
    '-mb-px border-b-2 transition-colors',
    // design.md §8's touch-target minimum on tablet and mobile.
    'max-tablet:min-h-11',
    // design.md §4: a syn-red edge indicator, never a filled red tab — it
    // "keeps red rare/meaningful rather than everywhere".
    isActive
      ? 'border-syn-red text-gray-700'
      : 'border-transparent text-gray-500 hover:text-gray-700',
    disabled && 'cursor-not-allowed text-gray-400 hover:text-gray-400'
  );
}
