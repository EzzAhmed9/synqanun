import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  /** Render in the error state. Pair with <Field error="…"> so the reason is
   *  visible — never colour alone (brand-guidelines.md §3.4). */
  invalid?: boolean;
}

/**
 * Dropdown, built on a native `<select>`.
 *
 * Native on purpose. A custom listbox would need its own focus management,
 * type-ahead, and touch behaviour, and would have to be re-solved for RTL —
 * the platform control already does all of that correctly in both directions
 * and matches what the Office-literate audience in design.md §1 expects.
 *
 * Styled to match Input exactly (same height, radius, border and focus
 * treatment) so a form mixing the two reads as one set of controls.
 *
 * The chevron is positioned with a logical property and the native arrow is
 * suppressed via `appearance-none`, so the indicator sits at the inline-end in
 * both directions rather than wherever the platform would put it.
 */
export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { invalid = false, className, children, ...props },
  ref
) {
  return (
    <div className="relative">
      <select
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(
          'w-full appearance-none rounded-btn border bg-gray-50 text-body text-gray-700',
          // Room for the chevron at the end side; normal padding at the start.
          'h-10 ps-3.5 pe-9 max-tablet:min-h-11',
          'transition-colors outline-none',
          invalid ? 'border-error focus:border-error' : 'border-gray-200 focus:border-legal-navy',
          'disabled:cursor-not-allowed disabled:border-gray-300 disabled:bg-gray-100 disabled:text-gray-400',
          className
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden
        size={16}
        className="pointer-events-none absolute top-1/2 -translate-y-1/2 text-gray-500"
        style={{ insetInlineEnd: '0.75rem' }}
      />
    </div>
  );
});

export default Select;
