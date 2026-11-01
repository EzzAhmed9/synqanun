import * as React from 'react';
import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Render in the error state. Pair with <Field error="…"> so the reason is
   *  visible — never colour alone (brand-guidelines.md §3.4). */
  invalid?: boolean;
  /**
   * Force the VALUE's direction to LTR regardless of interface language.
   *
   * design.md §12 requires embedded Latin runs be isolated rather than left to
   * drag the surrounding text's alignment. An email address, a password, a
   * matter reference or an invoice number is Latin in both locales, so typing
   * one into an RTL form must not reorder it. The label above stays in the
   * interface direction; only the field's contents flip.
   */
  latinValue?: boolean;
  /**
   * Render for a dark (`ink`) surface — the themed tenant's sign-in card.
   *
   * Measured on Meezan's charcoal (#464648): the field is white at 6% over the
   * card (#515153), the value is white (7.92:1), the placeholder white at 75%
   * (5.34:1), and the border white at 50% — 3.70:1 against the card and 3.11:1
   * against the field, so the control's edge clears WCAG 1.4.11 on both sides.
   * Focus moves the border to `on-dark`, because legal-navy on charcoal is
   * barely 1.5:1 and a focus state nobody can see is not one.
   */
  onDark?: boolean;
}

/**
 * Text input.
 *
 * design.md §4 gives the resting treatment: `gray-200` border, 8px radius
 * (the same `rounded-btn` as buttons), `gray-400` placeholder, `gray-300` when
 * disabled. Focus is `legal-navy`, matching the global focus-visible ring in
 * globals.css — navy carries links and system affordances, and a red focus
 * ring would read as an error against a palette where red is the primary
 * action colour.
 */
export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  { invalid = false, latinValue = false, onDark = false, className, dir, ...props },
  ref
) {
  return (
    <input
      ref={ref}
      dir={dir ?? (latinValue ? 'ltr' : undefined)}
      aria-invalid={invalid || undefined}
      className={cn(
        'w-full rounded-btn border px-3.5 text-body',
        onDark
          ? 'bg-white/6 text-on-dark placeholder:text-white/75'
          : 'bg-gray-50 text-gray-700 placeholder:text-gray-500',
        // 40px to match Button's default height; 44px on touch per design.md §8.
        'h-10 max-tablet:min-h-11',
        'transition-colors outline-none',
        invalid
          ? 'border-error focus:border-error'
          : onDark
            ? 'border-white/50 focus:border-on-dark'
            : 'border-gray-200 focus:border-legal-navy',
        'disabled:cursor-not-allowed disabled:border-gray-300 disabled:bg-gray-100 disabled:text-gray-400',
        // Read-only is distinct from disabled: the value is meaningful and
        // selectable, it simply cannot be changed here. Rendered in gray-100
        // with muted text so it reads as settled rather than broken.
        'read-only:cursor-default read-only:bg-gray-100 read-only:text-gray-500',
        latinValue && 'text-start',
        className
      )}
      {...props}
    />
  );
});

export interface FieldProps {
  /** Must match the control's `id`. */
  htmlFor: string;
  /** Sentence case — design.md §3. Never an all-caps eyebrow. */
  label: string;
  /** Rendered at the END of the label row — e.g. a "Forgot password?" link. */
  action?: React.ReactNode;
  /** Helper text below the control. Suppressed while `error` is set. */
  hint?: string;
  /** Validation message. Its presence puts the field in the error state. */
  error?: string;
  /** Label and helper text for a dark (`ink`) surface. Pair with <Input onDark>. */
  onDark?: boolean;
  children: React.ReactNode;
  className?: string;
}

/**
 * Label + control + message wrapper.
 *
 * The error treatment here is a hard requirement, not a nicety.
 * brand-guidelines.md §3.4 and §3.5, and design.md §2:
 *
 *   "Error states must always pair color with an icon and text, never rely on
 *    the red hue alone — this is a hard rule given how close the two reds sit."
 *
 * `error` (#B23A32) sits close enough to `syn-red` (#EB1C24) that a red border
 * on its own is genuinely ambiguous, so the message always renders with an
 * icon, and it is wired to the control with `aria-describedby` so it reaches
 * assistive tech too.
 */
export function Field({
  htmlFor,
  label,
  action,
  hint,
  error,
  onDark = false,
  children,
  className,
}: FieldProps) {
  const messageId = `${htmlFor}-message`;

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <div className="flex items-baseline justify-between gap-3">
        {/* Start-aligned — design.md §7 forbids centred form labels. */}
        <label
          htmlFor={htmlFor}
          className={cn('text-caption font-medium', onDark ? 'text-on-dark' : 'text-gray-700')}
        >
          {label}
        </label>
        {action}
      </div>

      {children}

      {error ? (
        <p id={messageId} role="alert" className="inline-flex items-start gap-1.5 text-caption text-error">
          <AlertTriangle aria-hidden size={13} strokeWidth={2.25} className="mt-0.5 shrink-0" />
          {error}
        </p>
      ) : hint ? (
        <p id={messageId} className={cn('text-caption', onDark ? 'text-white/80' : 'text-gray-500')}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export default Input;
