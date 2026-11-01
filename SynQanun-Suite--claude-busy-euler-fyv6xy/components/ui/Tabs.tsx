'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { tabTriggerClasses } from './tab-styles';

export interface TabItem {
  id: string;
  /** Already-translated label. Sentence case — design.md §3. */
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export interface TabsProps {
  items: TabItem[];
  /** Controlled active tab id. Omit to let Tabs manage its own state. */
  value?: string;
  defaultValue?: string;
  onValueChange?: (id: string) => void;
  /** Accessible name for the tab list. */
  label?: string;
  className?: string;
  children?: React.ReactNode;
}

/**
 * Tab strip.
 *
 * Active tab takes a syn-red underline plus gray-700 text. This follows
 * design.md §4's navigation treatment — a red edge indicator rather than a
 * filled red tab, which "keeps red rare/meaningful rather than everywhere".
 *
 * RTL: arrow-key navigation is direction-aware. In Arabic the visual order is
 * reversed, so ArrowLeft must move to the NEXT tab and ArrowRight to the
 * previous one — otherwise keyboard navigation runs backwards relative to what
 * the user sees. This is exactly the kind of thing design.md §12 means by
 * flipping directional behaviour, and it is why the handler reads `dir` from
 * the document rather than assuming left = previous.
 */
export function Tabs({
  items,
  value,
  defaultValue,
  onValueChange,
  label,
  className,
  children,
}: TabsProps) {
  const [internal, setInternal] = React.useState(defaultValue ?? items[0]?.id);
  const active = value ?? internal;
  const listRef = React.useRef<HTMLDivElement>(null);

  function select(id: string) {
    if (value === undefined) setInternal(id);
    onValueChange?.(id);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight' && event.key !== 'Home' && event.key !== 'End') {
      return;
    }
    event.preventDefault();

    const enabled = items.filter((item) => !item.disabled);
    if (enabled.length === 0) return;

    const isRtl = listRef.current
      ? getComputedStyle(listRef.current).direction === 'rtl'
      : false;

    let nextIndex: number;
    if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = enabled.length - 1;
    } else {
      const currentIndex = Math.max(
        0,
        enabled.findIndex((item) => item.id === active)
      );
      // Flip the step in RTL so the caret follows what the eye sees.
      const forward = isRtl ? event.key === 'ArrowLeft' : event.key === 'ArrowRight';
      const step = forward ? 1 : -1;
      nextIndex = (currentIndex + step + enabled.length) % enabled.length;
    }

    const next = enabled[nextIndex];
    select(next.id);
    listRef.current?.querySelector<HTMLButtonElement>(`[data-tab-id="${next.id}"]`)?.focus();
  }

  return (
    <div className={className}>
      <div
        ref={listRef}
        role="tablist"
        aria-label={label}
        onKeyDown={handleKeyDown}
        // Divider runs the full width beneath the strip; the active tab's red
        // underline sits on top of it.
        className="flex items-stretch gap-1 border-b border-gray-200"
      >
        {items.map((item) => {
          const isActive = item.id === active;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              data-tab-id={item.id}
              id={`tab-${item.id}`}
              aria-selected={isActive}
              aria-controls={`tabpanel-${item.id}`}
              // Roving tabindex: only the active tab is in the tab order.
              tabIndex={isActive ? 0 : -1}
              disabled={item.disabled}
              onClick={() => select(item.id)}
              className={tabTriggerClasses(isActive, item.disabled)}
            >
              {item.icon}
              {item.label}
            </button>
          );
        })}
      </div>
      {children}
    </div>
  );
}

export interface TabPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Must match the TabItem id this panel belongs to. */
  id: string;
  /** The currently active tab id. */
  active: string;
}

export function TabPanel({ id, active, className, children, ...props }: TabPanelProps) {
  if (id !== active) return null;
  return (
    <div
      role="tabpanel"
      id={`tabpanel-${id}`}
      aria-labelledby={`tab-${id}`}
      tabIndex={0}
      className={cn('pt-4 text-body text-gray-600', className)}
      {...props}
    >
      {children}
    </div>
  );
}

export default Tabs;
