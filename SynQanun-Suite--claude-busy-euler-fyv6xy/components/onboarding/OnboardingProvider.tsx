'use client';

import * as React from 'react';
import { DEFAULT_HOURLY_RATES, type Currency, type Rank } from '@/lib/ranks';

/**
 * Wizard state for the firm onboarding flow.
 *
 * WHY THIS IS A PROVIDER IN A LAYOUT, NOT PAGE STATE
 * ---------------------------------------------------------------------------
 * The five steps are five routes, so each has a real URL and the browser's own
 * Back button works. But the wizard must not lose what has been typed when the
 * user moves between them.
 *
 * In the App Router a layout does not remount when navigating between its
 * child routes, so state held here survives every step change in both
 * directions. That gets real URLs and preserved data at the same time —
 * whereas one route holding a `step` number would preserve data but give the
 * whole wizard a single URL, and five independent pages would give URLs but
 * drop everything on Back.
 *
 * Nothing is persisted beyond the tab. A full page reload starts over, which
 * is honest for a prototype: "Save and finish later" has nowhere to save to
 * yet, and pretending otherwise would be worse than the MOCK note saying so.
 */

export interface TeamMember {
  /** Local row id. Not an account id — nobody has an account yet. */
  id: string;
  name: string;
  email: string;
  rank: Rank;
}

export interface BrandingState {
  firmName: string;
  subdomain: string;
  /**
   * {{CLIENT_ACCENT}} — design.md §10 item 4 permits it on client-portal
   * washes and card borders ONLY, never on primary actions or AI surfaces.
   * `null` falls back to gray-200 (brand-guidelines.md §7.3).
   */
  accent: string | null;
  /** File names only. Nothing is uploaded in Track A. */
  logoLightName: string | null;
  logoDarkName: string | null;
}

export interface IntegrationsState {
  /** Calendar is not chosen separately — it follows the mail provider. */
  mail: 'google' | 'microsoft' | null;
  meetings: Array<'zoom' | 'teams' | 'meet'>;
}

export interface BillingState {
  currency: Currency;
  rates: Record<Rank, number>;
  gatewayConnected: boolean;
}

export interface OnboardingState {
  branding: BrandingState;
  team: TeamMember[];
  integrations: IntegrationsState;
  billing: BillingState;
}

interface OnboardingValue extends OnboardingState {
  setBranding: (patch: Partial<BrandingState>) => void;
  setTeam: (next: TeamMember[]) => void;
  setIntegrations: (patch: Partial<IntegrationsState>) => void;
  setBilling: (patch: Partial<BillingState>) => void;
}

const OnboardingContext = React.createContext<OnboardingValue | null>(null);

/** Stable id generator for team rows. */
let rowSeq = 0;
export function newTeamRow(): TeamMember {
  rowSeq += 1;
  return { id: `row-${rowSeq}`, name: '', email: '', rank: 'juniorAssociate' };
}

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [branding, setBrandingState] = React.useState<BrandingState>({
    // Starts empty. The Stitch export pre-fills a real firm's name
    // ("Al-Tamimi & Partners"), which is a different, existing law firm — not
    // this demo's tenant, and not ours to put in the product.
    firmName: '',
    subdomain: '',
    accent: null,
    logoLightName: null,
    logoDarkName: null,
  });

  const [team, setTeam] = React.useState<TeamMember[]>([newTeamRow()]);

  const [integrations, setIntegrationsState] = React.useState<IntegrationsState>({
    mail: null,
    meetings: [],
  });

  const [billing, setBillingState] = React.useState<BillingState>({
    currency: 'EGP',
    rates: { ...DEFAULT_HOURLY_RATES },
    gatewayConnected: false,
  });

  const setBranding = React.useCallback((patch: Partial<BrandingState>) => {
    setBrandingState((prev) => ({ ...prev, ...patch }));
  }, []);

  const setIntegrations = React.useCallback((patch: Partial<IntegrationsState>) => {
    setIntegrationsState((prev) => ({ ...prev, ...patch }));
  }, []);

  const setBilling = React.useCallback((patch: Partial<BillingState>) => {
    setBillingState((prev) => ({ ...prev, ...patch }));
  }, []);

  const value = React.useMemo<OnboardingValue>(
    () => ({
      branding,
      team,
      integrations,
      billing,
      setBranding,
      setTeam,
      setIntegrations,
      setBilling,
    }),
    [branding, team, integrations, billing, setBranding, setIntegrations, setBilling]
  );

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

export function useOnboarding(): OnboardingValue {
  const context = React.useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used inside <OnboardingProvider>.');
  }
  return context;
}

/**
 * Rows the user has actually filled in.
 *
 * The team step always shows at least one blank row to type into, and that
 * blank row must not be counted as a team member on the review step or in the
 * "X team members will receive their temporary credentials" line.
 */
export function completedTeam(team: TeamMember[]): TeamMember[] {
  return team.filter((m) => m.name.trim() !== '' && m.email.trim() !== '');
}
