import * as React from 'react';
import { cn } from '@/lib/utils';

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  /**
   * Sentence case — design.md §3. Accepts nodes so a consent label can carry
   * inline links (terms, privacy policy) without the caller rebuilding the
   * control.
   */
  label: React.ReactNode;
  /** Label colour for a dark (`ink`) surface — `on-dark`, 9.42:1 on charcoal. */
  onDark?: boolean;
}

/**
 * Checkbox with its label.
 *
 * The control and its label ship together because a bare checkbox is an
 * accessibility bug waiting to happen; there is no variant that renders the
 * box alone.
 *
 * `accent-action` tints the checked state with the primary action colour:
 * ticking a box is the user's own action, which design.md §2 puts firmly on the
 * human side of the human/AI split. Anything the agent had decided would be
 * navy. `action` is syn-red in accent mode, so nothing changes there; in a
 * themed tenant it is the tenant's action colour, as it is on Button.
 *
 * The 44px minimum tap area on touch comes from design.md §8; the visible box
 * stays 16px so desktop density is unaffected.
 */
export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { label, onDark = false, className, id, ...props },
  ref
) {
  const generatedId = React.useId();
  const inputId = id ?? generatedId;

  return (
    // items-start, not items-center: a consent label wraps to several lines,
    // and the box must stay aligned to the first one.
    <div className={cn('flex items-start gap-2 max-tablet:min-h-11', className)}>
      <input
        ref={ref}
        id={inputId}
        type="checkbox"
        className={cn(
          'mt-0.5 h-4 w-4 shrink-0 rounded-sm border border-gray-300 accent-action',
          'disabled:cursor-not-allowed disabled:border-gray-300'
        )}
        {...props}
      />
      <label
        htmlFor={inputId}
        className={cn(
          'cursor-pointer text-caption select-none',
          onDark ? 'text-on-dark' : 'text-gray-600'
        )}
      >
        {label}
      </label>
    </div>
  );
});

export default Checkbox;
