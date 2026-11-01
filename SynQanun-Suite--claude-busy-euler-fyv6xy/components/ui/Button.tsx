import * as React from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * design.md §2 "Assignment logic" is the reason this component has both a
 * `primary` and an `ai` variant rather than one "filled" variant with a colour
 * prop:
 *
 *   Red is for the human's actions. Navy is for the AI's actions.
 *   "a user should be able to tell, by colour alone, whether something came
 *    from them or from the AI."
 *
 * design.md §7 calls the inverse — red on anything AI-generated — "the single
 * most important rule in this file". Keeping the split in the variant names,
 * with no escape hatch for arbitrary colours, is what stops that collision
 * from being one careless `className` away.
 */
export type ButtonVariant =
  /** syn-red fill, white text, syn-garnet on hover/press. design.md §4: used
   *  ONCE per view, for the one main action. */
  | 'primary'
  /** gray-50 fill, gray-200 border, gray-700 text. The default for everything
   *  that isn't the single main action. */
  | 'secondary'
  /** legal-navy fill — "Ask SynQanun to draft this", "Regenerate". Any action
   *  handed to the agent. */
  | 'ai'
  /** legal-navy outline — a lower-emphasis agent action sitting beside a
   *  filled one. design.md §4 permits "legal-navy fill or outline". */
  | 'ai-outline'
  /** Outline, error text/border. design.md §4: destructive actions stay in
   *  outline form UNTIL a confirmation step. */
  | 'destructive'
  /** Solid error fill — ONLY for the confirm button inside the confirmation
   *  step that `destructive` opened. Never the first thing a user sees. */
  | 'destructive-confirm';

export type ButtonSize = 'sm' | 'md' | 'lg';

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  /*
    `action`, not `syn-red` — and this one line is what makes themed-tenant
    mode real rather than declared.

    The token resolves to syn-red in accent mode, which is every tenant that
    has no theme, so nothing changes for them. In a themed tenant it resolves
    to that firm's action colour, and the primary button recolours everywhere
    at once rather than screen by screen. design.md §10.2 is explicit that this
    is the one SynQanun-fixed colour a theme may replace, and that the colour
    replacing it must hold white text at 4.5:1 — which is checked where the
    palette is defined, in fixtures/firm.ts, not asserted here.
  */
  primary:
    'bg-action text-white hover:bg-action-pressed active:bg-action-pressed border border-transparent',
  /*
    `action` for the border, NOT `ornament` — and this is a correction, made
    after measuring what shipped rather than after reasoning about it.

    The brief asked for gold-outlined secondary buttons and the first version
    used `ornament`, on the argument that a 1px rule is decoration and so
    escapes WCAG 1.4.11's 3:1 floor. Measured in the browser, that argument
    does not survive: the button's surface is gray-50 (#f7f7f8) on a cream
    canvas (#fbf8f3), which is a contrast of roughly 1:1 — so the border is
    not decorating a boundary the surface already draws, it IS the boundary.
    Gold against cream is 2.76:1, under the 3:1 floor, and a control whose
    only edge a low-vision reader cannot find is not a control.

    `action` is the tenant's bronze at 4.58:1 on cream. Against #b0935b it is
    a slightly deeper warm gold — the visual difference in a 1px line is
    marginal and the accessibility difference is the whole rule.

    The TEXT stays gray-700 at 10.52:1. Unthemed, `action` falls back to
    syn-red; the old border was gray-200, so this is a visible change in
    accent mode too — a red hairline on a secondary button reads as a warning,
    so accent mode keeps gray-200 explicitly.
  */
  secondary:
    'bg-gray-50 text-gray-700 border border-gray-200 themed:border-action hover:bg-gray-100 active:bg-gray-200',
  ai: 'bg-legal-navy text-white border border-transparent hover:bg-legal-navy-pressed active:bg-legal-navy-pressed',
  'ai-outline': 'bg-transparent text-legal-navy border border-legal-navy hover:bg-legal-navy/8 active:bg-legal-navy/12',
  destructive: 'bg-transparent text-error border border-error hover:bg-error/8 active:bg-error/12',
  'destructive-confirm': 'bg-error text-white border border-transparent hover:bg-error-pressed active:bg-error-pressed',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  // `max-tablet:min-h-11` enforces design.md §8's "Touch targets ≥44px on
  // tablet/mobile" without inflating desktop density, which §1 explicitly
  // wants kept medium-high.
  sm: 'h-8 px-3 text-caption gap-1.5 max-tablet:min-h-11',
  md: 'h-10 px-4 text-body gap-2 max-tablet:min-h-11',
  lg: 'h-11 px-6 text-body gap-2',
};

/**
 * The button's own styling, without the <button>.
 *
 * Exists for the one case <Button> cannot serve: a control that LOOKS like a
 * button but IS a link, because it navigates somewhere. The codebase's earlier
 * answer was `<Link><Button/></Link>`, which nests interactive content inside
 * an anchor — invalid HTML, and assistive technology announces it as a link
 * wrapping a button.
 *
 * Same shape as `tabTriggerClasses` in ./tab-styles.ts and for the same
 * reason: the styling stays in exactly one place, so a link that looks like a
 * button cannot drift from a button that is one. Nothing in app/ should
 * assemble these class strings itself — BUILD_PLAN.md §3.
 */
export function buttonClasses({
  variant = 'secondary',
  size = 'md',
  fullWidth = false,
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  className?: string;
} = {}): string {
  return cn(
    'inline-flex items-center justify-center rounded-btn font-medium',
    'transition-colors duration-150 select-none',
    VARIANT_CLASSES[variant],
    SIZE_CLASSES[size],
    fullWidth && 'w-full',
    className
  );
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Icon rendered at the start side. Mirrors automatically in RTL because it
   *  is laid out by flex order, not by a hardcoded margin-left. */
  icon?: React.ReactNode;
  /** Icon rendered at the end side. */
  iconEnd?: React.ReactNode;
  /** Show a spinner and block interaction. */
  loading?: boolean;
  /** Stretch to the container's width. */
  fullWidth?: boolean;
}

/**
 * The one button component. design.md §4 and BUILD_PLAN.md §3 both require
 * buttons come from here rather than being styled inline per screen — that
 * per-screen drift is exactly what BUILD_PLAN.md §"Build order" names as the
 * cause of the Stitch inconsistencies.
 *
 * Sentence case only, per design.md §3: "Sentence case everywhere — nav
 * labels, buttons, headings. No tracked-out all-caps eyebrows." Nothing here
 * applies `uppercase`, and nothing added later should.
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'secondary',
    size = 'md',
    icon,
    iconEnd,
    loading = false,
    fullWidth = false,
    className,
    children,
    disabled,
    type = 'button',
    ...props
  },
  ref
) {
  const isDestructive = variant === 'destructive' || variant === 'destructive-confirm';

  // brand-guidelines.md §3.4 and design.md §2: error state must ALWAYS pair
  // colour with an icon and a text label, never rely on the red hue alone —
  // a hard rule given how close `error` (#B23A32) sits to `syn-red` (#EB1C24).
  // A destructive button with no icon supplied gets one rather than shipping
  // as colour-only.
  const resolvedIcon =
    icon ?? (isDestructive ? <AlertTriangle aria-hidden size={16} strokeWidth={2} /> : undefined);

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        buttonClasses({ variant, size, fullWidth }),
        // Only a real <button> has a disabled state, so this stays out of
        // `buttonClasses` — an anchor has nothing for it to style.
        'disabled:cursor-not-allowed disabled:border-gray-300 disabled:bg-gray-100 disabled:text-gray-400',
        className
      )}
      {...props}
    >
      {loading ? (
        <Loader2 aria-hidden size={16} className="animate-spin" />
      ) : (
        resolvedIcon
      )}
      {children}
      {iconEnd}
    </button>
  );
});

export default Button;
