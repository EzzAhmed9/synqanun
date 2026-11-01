import * as React from 'react';
import { AlertTriangle, CheckCircle2, Clock, Info } from 'lucide-react';
import { FeatherMark } from '@/components/brand/FeatherMark';
import { cn } from '@/lib/utils';

export type BadgeTone =
  /** success #1E7A4C — completed steps, confirmations. */
  | 'success'
  /** warning #B4740E — deadlines approaching, drafts pending review. */
  | 'warning'
  /** error #B23A32 — validation errors, failed actions. */
  | 'error'
  /** info #1E3A5F (= legal-navy) — neutral system messages. */
  | 'info'
  /** No state meaning — a plain label, a count, a category. */
  | 'neutral'
  /**
   * AI-authored. legal-navy + the feather mark. brand-guidelines.md §5: the
   * feather "appears next to every AI-generated suggestion, draft, or action
   * across the product, so a user always knows 'this came from SynQanun's AI',
   * even inside a fully white-labeled client instance."
   */
  | 'ai';

/*
  OPAQUE TINTS, mixed over white, rather than `bg-success/10`.

  A translucent tint takes on whatever it sits on, so the same badge measured
  differently on a white card, a gray-50 strip and a gray-100 highlighted row —
  success fell to 4.03:1 and error to 4.43:1 on gray-100, under the 4.5 a 12px
  label needs. Mixed over white, a badge measures the same everywhere, and on
  white it looks exactly as it did.

  Measured on these fills: success 4.65, warning 5.51 (with `warning-text`),
  error 5.09, info 9.62, ai 9.99, neutral 6.27.
*/
const TONE_CLASSES: Record<BadgeTone, string> = {
  success: 'bg-[color-mix(in_srgb,var(--color-success)_10%,white)] text-success border-success/25',
  // `warning-text`, not `warning`: the amber itself is 3.44:1 on this tint,
  // under AA for a 12px label. See globals.css.
  warning: 'bg-[color-mix(in_srgb,var(--color-warning)_10%,white)] text-warning-text border-warning/25',
  error: 'bg-[color-mix(in_srgb,var(--color-error)_10%,white)] text-error border-error/25',
  info: 'bg-[color-mix(in_srgb,var(--color-info)_10%,white)] text-info border-info/25',
  neutral: 'bg-gray-100 text-gray-600 border-gray-200',
  ai: 'bg-[color-mix(in_srgb,var(--color-legal-navy)_8%,white)] text-legal-navy border-legal-navy/25',
};

/**
 * Default icon per tone.
 *
 * This is not styling — it is the mechanism for a hard accessibility rule.
 * brand-guidelines.md §3.5 and §3.4, and design.md §2:
 *
 *   "Never use color alone to convey state (error/success/warning) — pair with
 *    icon + label, required for both accessibility and the red/error collision"
 *
 * `error` (#B23A32) and `syn-red` (#EB1C24) are close enough that hue alone is
 * genuinely ambiguous, so the icon is load-bearing. Passing `icon={null}`
 * suppresses it and is only correct for the `neutral` tone, which carries no
 * state.
 */
const TONE_ICONS: Record<BadgeTone, React.ReactNode> = {
  success: <CheckCircle2 aria-hidden size={13} strokeWidth={2.25} />,
  warning: <Clock aria-hidden size={13} strokeWidth={2.25} />,
  error: <AlertTriangle aria-hidden size={13} strokeWidth={2.25} />,
  info: <Info aria-hidden size={13} strokeWidth={2.25} />,
  neutral: null,
  ai: <FeatherMark height={16} />,
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  /** Override the tone's default icon. `null` removes it — only valid for
   *  `neutral`, which conveys no state. */
  icon?: React.ReactNode | null;
}

/**
 * Status pill. design.md §9: "status pills using success/warning/error tokens
 * with icon + label."
 *
 * Always give it a text label. A badge containing only an icon or only a
 * colour is a bug, not a compact variant.
 */
export function Badge({ tone = 'neutral', icon, className, children, ...props }: BadgeProps) {
  const resolvedIcon = icon === undefined ? TONE_ICONS[tone] : icon;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-pill border px-2 py-0.5',
        // Caption scale, weight 500 — dense enough for table cells without
        // dropping below design.md §3's 12px floor.
        'text-caption font-medium',
        // Never break across lines in a table row, where a two-line pill would
        // shove the row height out of design.md §4's 44px. Below 768px that
        // reverses: a table is a stack of cards by then (§8), rows size to
        // their content, and a long status — "Draft disclosure pending your
        // approval" — would otherwise run off the edge of the screen and put a
        // horizontal scrollbar back on the very list that converting to cards
        // was meant to take it off.
        'whitespace-nowrap max-tablet:whitespace-normal',
        TONE_CLASSES[tone],
        className
      )}
      {...props}
    >
      {resolvedIcon}
      {children}
    </span>
  );
}

export default Badge;
