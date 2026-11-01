import Image from 'next/image';
import { demoFirm, isThemedTenant } from '@/fixtures/firm';
import type { Locale } from '@/lib/i18n/routing';
import { cn } from '@/lib/utils';
import { FeatherMark } from './FeatherMark';
import { Logo } from './Logo';
import { FEATHER } from './assets';

/**
 * The mark that leads a pre-auth screen — whichever brand that is.
 *
 * ===========================================================================
 * ONE PLACE DECIDES THE HIERARCHY, BECAUSE IT INVERTS
 * ===========================================================================
 * design.md §10.2 inverts §10's rule for a themed tenant: on the splash, the
 * gateways and the login, the TENANT's lockup is the largest mark on screen and
 * no SynQanun lockup appears beside it. In accent mode the opposite holds and
 * the SynQanun lockup leads.
 *
 * That is one decision, and it belongs in one component. Spread across five
 * screens it would be five chances for a screen to get the hierarchy backwards
 * — and getting it backwards is not a style bug, it is the product claiming to
 * be a brand it is not.
 *
 * ===========================================================================
 * WHAT THIS DELIBERATELY DOES NOT TOUCH
 * ===========================================================================
 * THE FEATHER, wherever it signifies the agent. brand-guidelines.md §7.4 is
 * explicit that the feather is always SynQanun's, is never recoloured and is
 * never swapped for a tenant mark. This component replaces the SynQanun
 * *brand lockup* on three screens; it does not touch the feather on an agent
 * avatar, a "working" state or any AI surface, and nothing in the staff or
 * client workspace routes through here.
 *
 * THE CREDIT. "Powered by SynQanun" is rendered by each screen's own footer
 * via <PoweredBy>, in every mode, and is not a toggle (§7.2). This component
 * never renders it and never suppresses it.
 *
 * MOCK: the tenant's asset paths come from fixtures/firm.ts, which is the
 * demo's stand-in for the tenant-configuration layer. Track A.5.
 */
export function TenantMark({
  /** Rendered height of the tenant lockup, in px. */
  height = 44,
  locale,
  className,
}: {
  height?: number;
  locale: Locale;
  className?: string;
}) {
  const themed = isThemedTenant();
  const logo = demoFirm.logoLight;

  if (themed && logo) {
    return (
      <Image
        src={logo}
        alt={demoFirm.name[locale]}
        /*
          An SVG with no intrinsic size needs both, and the width is generous:
          `h-auto w-auto` below lets the real aspect ratio win, so these are a
          hint to the optimiser rather than a box the mark is squeezed into.
        */
        width={height * 6}
        height={height}
        priority
        className={cn('h-auto w-auto', className)}
        style={{ height, width: 'auto' }}
      />
    );
  }

  /*
    Accent mode — unchanged from what every other tenant sees: the feather
    above the SynQanun wordmark, which together are the product's own lockup.
  */
  return (
    <span className={cn('flex flex-col items-center', className)}>
      <FeatherMark height={FEATHER.maxHeight ?? 34} priority />
      <span className="h-6" />
      <Logo height={height} clearSpace={false} priority />
    </span>
  );
}

/**
 * The same decision for a HEADER BAR, where the mark sits inline beside a
 * label rather than leading a centred column.
 *
 * Separate from the above rather than a `variant` prop, because the two differ
 * in more than size: the stacked form has the feather over the wordmark, and
 * this one has a single horizontal mark with a rule and a label after it.
 */
export function TenantHeaderMark({
  height = 22,
  locale,
}: {
  height?: number;
  locale: Locale;
}) {
  const themed = isThemedTenant();
  const logo = demoFirm.logoLight;

  if (themed && logo) {
    return (
      <Image
        src={logo}
        alt={demoFirm.name[locale]}
        width={height * 6}
        height={height}
        priority
        className="h-auto w-auto shrink-0"
        style={{ height, width: 'auto' }}
      />
    );
  }

  return <Logo height={height} clearSpace={false} priority />;
}

export default TenantMark;
