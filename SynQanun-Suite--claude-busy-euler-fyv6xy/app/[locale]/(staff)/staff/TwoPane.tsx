import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * A list beside the thing the list selects.
 *
 * ===========================================================================
 * EXTRACTED AT THE SECOND INSTANCE
 * ===========================================================================
 * The Unified Inbox built this layout; the approvals queue is the second
 * screen that needs it, which is where this codebase extracts. Both put a
 * scrollable list of records next to whichever one the URL names, and both
 * have to behave the same way when the window is too narrow to hold both.
 *
 * ===========================================================================
 * BELOW 1280px THE PANES TAKE TURNS
 * ===========================================================================
 * Two columns need roughly 360px of list plus a readable reading column, and
 * below the `desktop` breakpoint there is not room for both. So the selection
 * lives in the URL and the panes swap: no selection shows the list, a
 * selection shows the record, and the back link in the reading pane is a real
 * link that removes the parameter.
 *
 * That is why `selectionInUrl` is a prop rather than `Boolean(selected)` — a
 * URL naming a record that no longer exists must still show the reading pane,
 * so it can say the record is not there instead of silently bouncing to a
 * list that looks like nothing was clicked.
 */
export function TwoPane({
  listLabel,
  readingLabel,
  selectionInUrl,
  list,
  reading,
}: {
  listLabel: string;
  readingLabel: string;
  /** Whether the URL names a record — NOT whether one was found. */
  selectionInUrl: boolean;
  list: React.ReactNode;
  reading: React.ReactNode;
}) {
  return (
    <div className="mt-5 flex min-h-0 flex-1 gap-0 rounded-card border border-gray-200 bg-white">
      <section
        aria-label={listLabel}
        className={cn(
          'flex min-w-0 flex-1 flex-col',
          // Logical border: the divider sits between the panes in both
          // directions, which `border-e` gives and `border-r` would not.
          'desktop:w-[360px] desktop:flex-none desktop:shrink-0 desktop:border-e desktop:border-gray-200',
          selectionInUrl && 'max-desktop:hidden'
        )}
      >
        {list}
      </section>

      <section
        aria-label={readingLabel}
        className={cn('flex min-w-0 flex-1 flex-col', !selectionInUrl && 'max-desktop:hidden')}
      >
        {reading}
      </section>
    </div>
  );
}

export default TwoPane;
