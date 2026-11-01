import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * design.md §6 allows exactly three elevation levels. Not two, not five.
 * "Three levels only — resist adding more."
 */
export type Elevation =
  /** Level 0 — cards, panels, table rows. Border only, NO shadow. The default. */
  | 'resting'
  /** Level 1 — dropdowns, popovers, tooltips. */
  | 'raised'
  /** Level 2 — modals, the AI chat panel in floating mode. */
  | 'overlay';

const ELEVATION_CLASSES: Record<Elevation, string> = {
  resting: 'shadow-resting',
  raised: 'shadow-raised',
  overlay: 'shadow-overlay',
};

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Leave at 'resting' unless the element genuinely floats above the page.
   *
   * design.md §4: "no drop shadow at rest… Don't apply the same shadow to
   * every card; flat + bordered is the default resting state, matching the
   * 'calm, not glossy' theme." §7 is blunter: the rounded-card-plus-soft-shadow
   * treatment applied to everything is "the generic SaaS-template look this
   * product should read as more serious than."
   */
  elevation?: Elevation;
  /** White (default) or the gray-100 panel tint. design.md §9 lists both as
   *  valid card backgrounds. */
  surface?: 'white' | 'muted';
  /** Built-in padding. Set `none` when the card contains a full-bleed table. */
  padding?: 'none' | 'sm' | 'md' | 'lg';
  /**
   * Tint the surface with the AI-agent wash — legal-navy at ~6% opacity
   * (design.md §4 "AI Agent Chat Panel"). Use for anything the agent
   * generated or is generating. Never combine with a syn-red accent.
   */
  aiSurface?: boolean;
  as?: 'div' | 'section' | 'article' | 'aside';
}

const PADDING_CLASSES = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
} as const;

/**
 * Card / panel surface.
 *
 * design.md §4: "gray-50/white surface, 1px gray-200 border, 8px radius, no
 * drop shadow at rest."
 */
export function Card({
  elevation = 'resting',
  surface = 'white',
  padding = 'md',
  aiSurface = false,
  as: Tag = 'div',
  className,
  style,
  ...props
}: CardProps) {
  return (
    <Tag
      className={cn(
        'rounded-card border border-gray-200',
        surface === 'white' ? 'bg-white' : 'bg-gray-100',
        ELEVATION_CLASSES[elevation],
        PADDING_CLASSES[padding],
        className
      )}
      style={aiSurface ? { background: 'var(--syn-ai-surface)', ...style } : style}
      {...props}
    />
  );
}

/** Card header row. Start-aligned — design.md §5 and §7 forbid centred content
 *  outside empty states and modals. */
export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('mb-3 flex items-center justify-between gap-3', className)} {...props} />;
}

/**
 * Card / subsection title — design.md §3: Inter / IBM Plex Sans Arabic 600,
 * 16px/24px. Sentence case, and never an all-caps eyebrow (§3, §7).
 */
export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn('font-sans text-title text-gray-700', className)} {...props} />;
}

/** Optional supporting line under a CardTitle. Caption scale, gray-500. */
export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-caption text-gray-500', className)} {...props} />;
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('text-body text-gray-600', className)} {...props} />;
}

/** Card footer — actions sit at the END side so they mirror correctly in RTL. */
export function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('mt-4 flex items-center justify-end gap-2 border-t border-gray-200 pt-3', className)}
      {...props}
    />
  );
}

export default Card;
