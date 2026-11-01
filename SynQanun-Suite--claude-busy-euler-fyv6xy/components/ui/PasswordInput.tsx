'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Input, type InputProps } from './Input';
import { cn } from '@/lib/utils';

export interface PasswordInputProps extends Omit<InputProps, 'type' | 'latinValue'> {
  className?: string;
}

/**
 * Password field with a show/hide toggle.
 *
 * The toggle is a real accessibility affordance, not a flourish: a locked
 * field with a strength requirement is exactly where typos happen, and the
 * alternative is forcing people to retype. It is a `button`, announces its
 * state with `aria-pressed`, and sits at the INLINE-END of the field so it
 * lands on the right in English and the left in Arabic.
 *
 * The value is always typed left-to-right (`latinValue`) — a password is a
 * Latin/symbol run in both locales, and design.md §12 requires such runs be
 * isolated rather than reordered by the surrounding paragraph direction.
 *
 * NOTE: the Stitch export ships this field with `value="LegalSecure#2025!"`
 * hardcoded into the markup. Prefilling a real-looking credential — even in a
 * prototype that will be screen-shared with prospects — teaches the wrong
 * thing and risks someone reusing it. The field starts empty.
 */
export function PasswordInput({ className, onDark = false, ...props }: PasswordInputProps) {
  const t = useTranslations('common');
  const [visible, setVisible] = React.useState(false);

  return (
    /*
      `dir="ltr"` on the WRAPPER, not just the input.

      The value is Latin, so the input carries dir="ltr" and its `pe-16`
      reserve resolves to padding-RIGHT. If the wrapper stayed RTL, the
      toggle's `insetInlineEnd` would resolve to the LEFT — the reserved space
      and the button would end up on opposite sides, and in Arabic the button
      sat directly on top of the first characters of the password (measured:
      button at x 57–97, text starting at x 63).

      Pinning the wrapper makes the value, its padding and its adornment agree
      on which end is the end. The label above is outside this wrapper and
      stays in the interface direction.
    */
    <div className="relative" dir="ltr">
      <Input
        {...props}
        type={visible ? 'text' : 'password'}
        latinValue
        onDark={onDark}
        // Room for the toggle at the end side.
        className={cn('pe-16', className)}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-pressed={visible}
        aria-label={visible ? t('hidePassword') : t('showPassword')}
        className={cn(
          'absolute top-1/2 -translate-y-1/2 rounded-sm px-2 py-1',
          'text-caption font-medium',
          // White at 80% on the dark field is 6.04:1; the light pair is unchanged.
          onDark ? 'text-white/80 hover:text-on-dark' : 'text-gray-500 hover:text-gray-700'
        )}
        // Logical inset: end side in both directions.
        style={{ insetInlineEnd: '0.5rem' }}
      >
        {visible ? t('hide') : t('show')}
      </button>
    </div>
  );
}

export default PasswordInput;
