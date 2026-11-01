import { PoweredBy } from '@/components/brand/PoweredBy';
import { cn } from '@/lib/utils';

export interface TenantFooterProps {
  /** Tenant display name, already resolved for the locale via firmName(). */
  firmName: string;
  /**
   * The tenant's rights sentence, e.g. "All legal rights reserved.
   * Confidential client portal." Product copy from the dictionaries.
   */
  copyright: string;
  /**
   * Copyright year. Defaults to the current year.
   *
   * These pages are statically prerendered, so the default freezes at build
   * time — which is the ordinary behaviour for a © line on a static site, and
   * still better than a literal that nobody remembers to bump. Pass it
   * explicitly if a screen ever needs a fixed year.
   */
  year?: number;
  className?: string;
}

/**
 * The tenant's footer: their copyright at the start, the SynQanun credit at
 * the end. On every screen that has a tenant to name.
 *
 * RENAMED FROM `AuthFooter`, BECAUSE THAT NAME HAD STOPPED BEING TRUE
 * ---------------------------------------------------------------------------
 * It was extracted from two pre-auth screens and named for where it happened
 * to live. It is now in seven places, and five of them are not pre-auth: both
 * workspace layouts render it under every signed-in screen in the product.
 *
 * A name that describes where a component was first used is a name that goes
 * stale silently — nothing breaks, the comment above it just quietly stops
 * matching, and the next person reads "auth" and assumes the client portal's
 * footer is something else. `TenantFooter` says what it is: the footer that
 * names the tenant. Renamed during the Track A close-out, while the codebase
 * is being read by somebody who did not write it.
 *
 * EXTRACTED FROM TWO REAL INSTANCES
 * ---------------------------------------------------------------------------
 * The Client Gateway and Accept Invite rendered an identical row. Same
 * threshold that justified AuthHeader — two concrete screens, not one plus a
 * guess. The workspace layouts came later and confirmed it.
 *
 * Splash is NOT one of them and deliberately does not use this. Its footer
 * carries a brand descriptor and the app version instead, and it has no tenant
 * to name. That is also why this is a component rather than part of the (auth)
 * layout: Splash shares the route group and would have to fight the frame.
 *
 * ---------------------------------------------------------------------------
 * THE CREDIT IS NOT OPTIONAL
 * ---------------------------------------------------------------------------
 * <PoweredBy /> is rendered unconditionally. There is no `showCredit`,
 * `hideCredit` or `enabled` prop, and none may be added.
 *
 * brand-guidelines.md §7.2 lists the credit under "What never changes, in any
 * client instance": it "appears in the main app footer, every exported
 * document, and the login screen, in every instance, permanently. It is not a
 * toggle the client can disable." design.md §10 repeats it.
 *
 * Sharing a component is exactly the moment that rule is most likely to erode
 * — the first screen that wants a slightly different footer asks for a flag,
 * and the flag becomes the toggle the brand guide forbids. A screen that
 * genuinely needs a different footer writes its own, as Splash does; it does
 * not get one by switching the credit off here.
 */
export function TenantFooter({
  firmName,
  copyright,
  year = new Date().getFullYear(),
  className,
}: TenantFooterProps) {
  return (
    <footer className={cn('border-t border-gray-200 bg-white', className)}>
      <div className="mx-auto flex max-w-content flex-col items-center justify-between gap-3 px-6 py-5 tablet:flex-row">
        <p className="text-caption text-gray-500">
          {/*
            The © and year are a Latin run inside what may be an Arabic
            sentence. design.md §12 requires such runs be isolated rather than
            left to be reordered by the surrounding paragraph direction —
            without this the symbol detaches from the digits in Arabic.
            Western digits in both locales, also §12.
          */}
          <span dir="ltr" className="[unicode-bidi:isolate]">
            © {year}
          </span>{' '}
          {firmName}. {copyright}
        </p>

        {/* Permanent, every tenant — brand-guidelines.md §7.2, design.md §10.
            See the note above before considering a prop that hides this. */}
        <PoweredBy withMark />
      </div>
    </footer>
  );
}

export default TenantFooter;
