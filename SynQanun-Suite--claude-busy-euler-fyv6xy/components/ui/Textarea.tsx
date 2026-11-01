import * as React from 'react';
import { cn } from '@/lib/utils';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** Render in the error state. Pair with <Field error="…"> so the reason is
   *  visible — never colour alone (brand-guidelines.md §3.4). */
  invalid?: boolean;
}

/**
 * Multi-line text input.
 *
 * EXTRACTED AT THE SECOND INSTANCE, which is the rule on this project. The
 * message composer wrote the first one inline and said so in a comment:
 * "the kit has no Textarea yet and this is its first instance, so it is not
 * extracted… If Settings or the staff side needs one, it moves to
 * components/ui." The booking modal is that second need, so here it is, and the
 * composer now imports it.
 *
 * Styled to match <Input> exactly — same border, radius, fill, placeholder and
 * focus treatment — so a form mixing the two reads as one set of controls. The
 * differences are deliberate: `p-3` rather than a fixed height, because the
 * control is sized by `rows`, and `resize-y` so a client writing a long note can
 * make room without the panel's width moving.
 *
 * No `latinValue` twin of <Input>'s. That prop exists for identifiers — an email
 * address, a matter reference — which are single-line by definition. Prose typed
 * into a textarea is in whatever language the writer is using, and forcing a
 * direction on it is exactly the mistake lib/format.ts's rendering rule warns
 * about. `dir="auto"` lets the browser judge it from the first strong character,
 * which is correct for a field that may hold either language.
 */
export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { invalid = false, className, dir, ...props },
  ref
) {
  return (
    <textarea
      ref={ref}
      dir={dir ?? 'auto'}
      aria-invalid={invalid || undefined}
      className={cn(
        'w-full resize-y rounded-btn border bg-gray-50 p-3 text-body text-gray-700',
        'placeholder:text-gray-500',
        'transition-colors outline-none',
        invalid
          ? 'border-error focus:border-error'
          : 'border-gray-200 focus:border-legal-navy',
        'disabled:cursor-not-allowed disabled:border-gray-300 disabled:bg-gray-100 disabled:text-gray-400',
        className
      )}
      {...props}
    />
  );
});

export default Textarea;
