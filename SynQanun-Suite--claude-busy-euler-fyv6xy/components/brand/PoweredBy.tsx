import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { FeatherMark } from './FeatherMark';

export interface PoweredByProps {
  /** Show the feather beside the credit. Used where the credit stands alone
   *  without another SynQanun mark already on screen. */
  withMark?: boolean;
  className?: string;
}

/**
 * The "Powered by SynQanun" credit.
 *
 * This is not decoration and it is not optional. brand-guidelines.md §7.2
 * lists it under "What never changes, in any client instance":
 *
 *   "The 'Powered by SynQanun' credit — appears in the main app footer, every
 *    exported document, and the login screen, in every instance, permanently.
 *    It is not a toggle the client can disable."
 *
 * design.md §10 repeats it in the same terms. It exists as a component rather
 * than as three copies of a string precisely so that "permanently, in every
 * instance" is a property of the codebase and not of anyone's memory — there
 * is deliberately no `hidden` or `enabled` prop, and none should be added.
 *
 * Three required placements:
 *   1. Main app footer
 *   2. Every exported client-facing document (invoices, contracts, portal)
 *   3. Login / splash screen
 */
export function PoweredBy({ withMark = false, className }: PoweredByProps) {
  const t = useTranslations('common');

  return (
    <span className={cn('inline-flex items-center gap-1.5 text-caption text-gray-500', className)}>
      {withMark ? <FeatherMark height={16} /> : null}
      {t('poweredBy')}
    </span>
  );
}

export default PoweredBy;
