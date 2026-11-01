import { TenantHeaderMark } from '@/components/brand/TenantMark';
import type { Locale } from '@/lib/i18n/routing';
import { demoFirm, isThemedTenant } from '@/fixtures/firm';
import * as React from 'react';
import { Logo } from '@/components/brand/Logo';
import { LanguageToggle } from './LanguageToggle';
import { cn } from '@/lib/utils';

/**
 * Header bar for pre-auth screens.
 *
 * TWO VARIANTS, AND THE SPLIT IS A BRAND RULE
 * ---------------------------------------------------------------------------
 * `AuthHeader` is tenant-branded, for CLIENT-facing screens. `StaffAuthHeader`
 * is SynQanun-branded, for INTERNAL screens. They share the bar chrome below
 * but are separate components on purpose.
 *
 * brand-guidelines.md §7.1 scopes a client's brand to four locations, all of
 * them client-facing — the login/splash screen, the sidebar slot, exported
 * client documents, and the client-portal accent. A firm's own staff gateway
 * is none of those: it is SynQanun's product surface, shown to SynQanun's
 * users, and it carries SynQanun's mark.
 *
 * Making that a prop (`brand="tenant" | "synqanun"`) would have left a client
 * logo one careless argument away from a staff screen. Two components with
 * disjoint props means `StaffAuthHeader` has no way to accept a tenant logo or
 * a tenant name — the rule is enforced by the type, not by remembering it.
 *
 * Neither variant reads /fixtures. Tenant data arrives as props, so
 * components/chrome/ stays fixture-free and both work unchanged once a real
 * tenant-configuration layer replaces the demo data.
 */

interface HeaderShellProps {
  /** Identity block at the inline-start side. */
  start: React.ReactNode;
  /** Optional metadata rendered before the language toggle. */
  end?: React.ReactNode;
  className?: string;
}

/**
 * The bar itself: white surface, bottom border, content measure, and the
 * language toggle that design.md §12 requires be persistent and never buried.
 * Nothing here is positioned with left/right — the row mirrors via
 * `justify-between` and logical spacing.
 */
function HeaderShell({ start, end, className }: HeaderShellProps) {
  return (
    <header className={cn('border-b border-gray-200 bg-white', className)}>
      <div className="mx-auto flex max-w-content flex-wrap items-center justify-between gap-4 px-6 py-4">
        {start}
        <div className="flex items-center gap-4">
          {end}
          <LanguageToggle />
        </div>
      </div>
    </header>
  );
}

export interface AuthHeaderProps {
  /** Tenant display name, already resolved for the locale via firmName(). */
  firmName: string;
  /**
   * The firm's own descriptor — {{CLIENT_ABOUT_TEXT}}.tagline, design.md §10.1.
   * Just the descriptor: the per-screen context is the `context` prop.
   */
  tagline: string;
  /**
   * Per-screen context appended after the tagline — "Client access",
   * "Client onboarding". PRODUCT copy from the dictionaries, never tenant
   * configuration.
   */
  context: string;
  /** Short status line at the end side, e.g. "Encrypted portal channel". */
  status?: string;
  /** Support link label. Omit to hide the link entirely. */
  helpdeskLabel?: string;
  /** MOCK: defaults to a placeholder anchor until tenant support routing exists. */
  helpdeskHref?: string;
  className?: string;
}

/**
 * Tenant-branded header, for client-facing pre-auth screens.
 *
 * The tenant is the dominant identity here (brand-guidelines.md §7.1), which
 * is why the firm name is set at heading scale rather than as caption text.
 */
export function AuthHeader({
  firmName,
  tagline,
  context,
  status,
  helpdeskLabel,
  helpdeskHref = '#helpdesk',
  className,
}: AuthHeaderProps) {
  /*
    Read here rather than taken as a prop, for the same reason StaffAuthHeader
    has no logo prop: a caller may not decide whose brand leads a gateway.
  */
  const themedMark = isThemedTenant() ? demoFirm.logoLight : null;

  return (
    <HeaderShell
      className={className}
      start={
        <div className="min-w-0">
          {/*
            THE TENANT'S LOCKUP REPLACES ITS NAME-AS-TEXT IN THEMED MODE.

            design.md §10.2 names the gateway as one of three screens where the
            tenant's mark leads. A firm's name set in Cairo 700 is not that
            mark — it is the product typesetting the firm's name, which is what
            accent mode correctly does when there is no logo to show.

            The tagline and context line stay in both modes: they are product
            copy and tenant content respectively, and neither is branding.
          */}
          {themedMark ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={themedMark}
              alt={firmName}
              className="h-9 w-auto max-w-[220px] object-contain object-left rtl:object-right"
            />
          ) : (
            // Section-heading scale: Cairo 700 — design.md §3.
            <p className="truncate font-display text-heading text-gray-700">{firmName}</p>
          )}
          <p className="mt-0.5 truncate text-caption text-gray-500">
            {tagline} · {context}
          </p>
        </div>
      }
      end={
        <>
          {status ? (
            <span className="hidden items-center gap-2 text-caption text-gray-500 tablet:inline-flex">
              {/* `success`, never Stitch's emerald — design.md §2 has no
                  emerald. Paired with a text label, so the state is not
                  carried by colour alone (brand-guidelines.md §3.5). */}
              <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-pill bg-success" />
              {status}
            </span>
          ) : null}

          {status && helpdeskLabel ? (
            <span aria-hidden className="hidden h-4 w-px bg-gray-200 tablet:inline-block" />
          ) : null}

          {helpdeskLabel ? (
            <a
              href={helpdeskHref}
              className="text-caption font-medium text-legal-navy hover:underline"
            >
              {helpdeskLabel}
            </a>
          ) : null}
        </>
      }
    />
  );
}

export interface StaffAuthHeaderProps {
  /**
   * What this workspace is — "Enterprise legal workspace". Product copy.
   *
   * There is still no `firmName`, no `tagline` and no logo prop, and that is
   * still deliberate — a screen may not override whose surface this is.
   *
   * WHAT CHANGED, AND WHY IT IS NOT AN OVERRIDE. This used to say flatly that
   * a staff gateway is SynQanun's surface. design.md §10.2 now makes that true
   * only in ACCENT mode: in a themed tenant the firm's lockup leads here, as it
   * does on the splash and the login. The mark is chosen by <TenantHeaderMark>
   * from tenant configuration — so the hierarchy still cannot be set by a
   * caller, it is simply read from the tenant rather than hardcoded.
   */
  label: string;
  /** The reader's locale, so the tenant's name can be its alt text. */
  locale: Locale;
  /** Optional metadata at the end side, e.g. the release version. */
  meta?: React.ReactNode;
  className?: string;
}

/**
 * SynQanun-branded header, for internal staff screens.
 *
 * The wordmark follows the interface language and never mirrors
 * (brand-guidelines.md §2.5) — that is handled inside <Logo>.
 */
export function StaffAuthHeader({ label, locale, meta, className }: StaffAuthHeaderProps) {
  return (
    <HeaderShell
      className={className}
      start={
        <div className="flex min-w-0 items-center gap-3">
          <TenantHeaderMark height={22} locale={locale} />
          <span aria-hidden className="h-5 w-px shrink-0 bg-gray-200" />
          <span className="truncate text-caption text-gray-500">{label}</span>
        </div>
      }
      end={meta}
    />
  );
}

export default AuthHeader;
