import { AlertTriangle, ChevronRight, type LucideIcon } from 'lucide-react';
import { Badge, Card } from '@/components/ui';
import type { EngagementStatusTone } from '@/fixtures/matters';
import { Link } from '@/lib/i18n/navigation';

/**
 * One row's worth of engagement, flattened for display.
 *
 * Both matters and projects reduce to this shape. The page does the flattening
 * so this component never has to know which of the two it is holding — a matter
 * has a lead counsel and a forum, a project has a manager and a jurisdiction,
 * and by the time they arrive here both are just `metaPrimary` and
 * `metaSecondary`.
 */
export interface EngagementRow {
  id: string;
  reference: string;
  title: string;
  metaPrimary: string;
  metaSecondary: string;
  status: string;
  // Imported rather than restated. This union was written out by hand here and
  // immediately went stale when the matters list added `info` — the fixture is
  // where the set of tones is decided, so it is where the type lives.
  statusTone: EngagementStatusTone;
  needsAttention: boolean;
}

export interface EngagementCardProps {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  /** e.g. "4 active files" — already pluralised by the caller. */
  countLabel: string;
  rows: EngagementRow[];
  /** e.g. "Showing 4 of 4". */
  showingLabel: string;
  viewAllLabel: string;
  viewAllHref: string;
  needsAttentionLabel: string;
  emptyLabel: string;
}

/**
 * The "My matters" / "My projects" card.
 *
 * ONE COMPONENT, TWO SECTIONS — and why that is not premature
 * ---------------------------------------------------------------------------
 * The standing rule on this project is to extract at the SECOND real instance,
 * not the first plus a guess. Both instances are on this screen, side by side,
 * with identical structure down to the footer row. Building them separately
 * would guarantee they drift the first time either is touched.
 *
 * NEEDS-ATTENTION IS A BADGE, NOT A SECTION
 * ---------------------------------------------------------------------------
 * Items waiting on the client are marked where they live rather than lifted
 * into a separate "action required" list. A second list is a second thing to
 * reconcile against the first, and it goes stale in a way a badge cannot: the
 * badge is a property of the row, so it cannot survive the row being resolved.
 *
 * COLOUR
 * ---------------------------------------------------------------------------
 * No syn-red anywhere in here. design.md §2 reserves red for the human's own
 * actions and the active nav state; a warning about an approaching deadline is
 * `warning`, and the badge carries an icon and a text label as §2 requires
 * ("never use colour alone to convey state") — which also keeps `warning` from
 * being confused with `error`, whose hue sits close to syn-red.
 */
export function EngagementCard({
  icon: Icon,
  title,
  subtitle,
  countLabel,
  rows,
  showingLabel,
  viewAllLabel,
  viewAllHref,
  needsAttentionLabel,
  emptyLabel,
}: EngagementCardProps) {
  return (
    <Card padding="none" className="flex flex-col overflow-hidden">
      <header className="flex items-start justify-between gap-3 border-b border-gray-200 p-5">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm bg-gray-100 text-gray-600">
            <Icon aria-hidden size={16} strokeWidth={1.8} />
          </span>
          <div className="min-w-0">
            <h2 className="font-sans text-title text-gray-700">{title}</h2>
            <p className="text-caption text-gray-500">{subtitle}</p>
          </div>
        </div>
        <span className="shrink-0 text-caption text-gray-500">{countLabel}</span>
      </header>

      {rows.length === 0 ? (
        <p className="p-5 text-body text-gray-500">{emptyLabel}</p>
      ) : (
        <ul className="divide-y divide-gray-200">
          {rows.map((row) => (
            // Stacked, not a two-column row. The export puts the status badges
            // opposite the title, which works at the width a single full-bleed
            // card has and not at the width these have — two of these sit in a
            // half-width grid, and a pair of badges there starves the title
            // column until it wraps one word per line. Title first, badges
            // under it, at every width.
            <li key={row.id} className="flex flex-col gap-2 p-4">
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  {/* Latin reference inside what may be Arabic copy — isolated
                      so the bidi algorithm does not reorder it (design.md §12).
                      Mono at 13px, per §3's reference scale. */}
                  <span
                    dir="ltr"
                    className="font-mono text-reference font-medium text-gray-900 [unicode-bidi:isolate]"
                  >
                    {row.reference}
                  </span>
                  <h3 className="text-body-emphasis text-gray-700">{row.title}</h3>
                </div>
                <p className="text-caption text-gray-500">
                  {row.metaPrimary}
                  {/* A neutral separator rather than a hardcoded "•" glued into
                      a translated string — it stays out of the dictionaries and
                      sits correctly in both directions. */}
                  <span aria-hidden className="mx-1.5">
                    ·
                  </span>
                  {row.metaSecondary}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={row.statusTone}>{row.status}</Badge>
                {row.needsAttention ? (
                  <Badge
                    tone="warning"
                    icon={<AlertTriangle aria-hidden size={13} strokeWidth={2.25} />}
                  >
                    {needsAttentionLabel}
                  </Badge>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}

      <footer className="mt-auto flex items-center justify-between gap-3 border-t border-gray-200 bg-gray-50 px-4 py-3">
        <span className="text-caption text-gray-500">{showingLabel}</span>
        <Link
          href={viewAllHref}
          className="inline-flex items-center gap-1 text-caption font-medium text-legal-navy hover:underline"
        >
          {viewAllLabel}
          {/* Directional icon — design.md §12 flips these while logos never
              flip. `rtl:rotate-180` is the whole mechanism. */}
          <ChevronRight aria-hidden size={14} strokeWidth={2} className="rtl:rotate-180" />
        </Link>
      </footer>
    </Card>
  );
}

export default EngagementCard;
