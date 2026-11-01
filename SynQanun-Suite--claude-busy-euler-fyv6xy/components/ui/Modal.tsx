'use client';

import * as React from 'react';
import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Overlay, type OverlaySize } from './Overlay';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  /** Modal heading. Sentence case — design.md §3. */
  title: string;
  /** Optional supporting line under the title. */
  description?: string;
  /** Footer actions. Put the confirming action LAST so it lands at the end
   *  side in both directions. */
  footer?: React.ReactNode;
  size?: OverlaySize;
  /** Prevent backdrop-click and Escape from dismissing. Use only when closing
   *  would lose work. */
  dismissible?: boolean;
  children?: React.ReactNode;
}

/**
 * Overlay dialog with a title, a body and a footer.
 *
 * design.md §5 notes that centring is reserved for empty states and modals, so
 * this is one of the two components permitted to centre itself on screen; its
 * *content* is still start-aligned.
 *
 * The portal, the scrim, Escape, the focus trap and the scroll lock all moved to
 * <Overlay> when the global search overlay became the kit's second one — see the
 * note there. This file is now the layout that sits inside it, and its API has
 * not changed.
 *
 * The dialog panel does not set `dir` — it inherits from <html>, so it mirrors
 * with the rest of the interface. The close button is positioned with a logical
 * property, which is what moves it to the correct corner in Arabic without a
 * second rule.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  footer,
  size = 'md',
  dismissible = true,
  children,
}: ModalProps) {
  const t = useTranslations('common');
  const titleId = React.useId();
  const descriptionId = React.useId();

  return (
    <Overlay
      open={open}
      onClose={onClose}
      size={size}
      dismissible={dismissible}
      labelledBy={titleId}
      describedBy={description ? descriptionId : undefined}
      className="overflow-y-auto"
    >
      <div className="flex items-start justify-between gap-4 p-6 pb-3">
        <div className="min-w-0">
          {/* Section-heading scale: Cairo 700, 20px/28px — design.md §3. */}
          <h2 id={titleId} className="font-display text-heading text-gray-700">
            {title}
          </h2>
          {description ? (
            <p id={descriptionId} className="mt-1 text-caption text-gray-500">
              {description}
            </p>
          ) : null}
        </div>
        {dismissible ? (
          <button
            type="button"
            onClick={onClose}
            aria-label={t('close')}
            // Logical property: end side in both LTR and RTL.
            className="-me-1 -mt-1 shrink-0 rounded-sm p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
          >
            <X aria-hidden size={18} />
          </button>
        ) : null}
      </div>

      {/* Body content stays start-aligned — design.md §7 forbids centred
          body copy even inside a centred modal. */}
      <div className="px-6 pb-6 text-start text-body text-gray-600">{children}</div>

      {footer ? (
        <div className="flex items-center justify-end gap-2 border-t border-gray-200 px-6 py-4">
          {footer}
        </div>
      ) : null}
    </Overlay>
  );
}

export default Modal;
