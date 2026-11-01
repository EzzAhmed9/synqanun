import * as React from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface EmptyStateProps {
  /**
   * A neutral lucide glyph naming what is absent — a document, a receipt, a
   * conversation. NOT the feather; see below.
   */
  icon: LucideIcon;
  /** One sentence saying what is not there. Sentence case — design.md §3. */
  title: string;
  /** One line saying what would put something here. Optional. */
  body?: string;
  /**
   * A call to action, for the rare empty state the reader can actually resolve.
   * Most client-portal emptiness is the firm's to fill, not the client's — see
   * below.
   */
  action?: React.ReactNode;
  className?: string;
}

/**
 * The "there is nothing here" panel, for a collection with no records at all.
 *
 * NOT THE SAME THING AS "YOUR FILTER MATCHED NOTHING"
 * ---------------------------------------------------------------------------
 * These are two different messages and the portal was only saying one of them.
 * Every list already handled the filter case ("No documents match 'x'"), which
 * is the common one; none handled a client who genuinely has no documents yet,
 * because the fixtures always have some.
 *
 * The difference is not cosmetic. "No documents match your filter" over a
 * client's very first visit reads as though something is being hidden from
 * them, and it sits under a filter bar whose every option leads to another
 * empty list. So when the collection itself is empty, the filter bar is not
 * rendered at all and this panel says plainly that the firm has not shared
 * anything yet.
 *
 * The Stitch export takes the opposite approach: it keeps the search box and
 * DISABLES it. A disabled control with a placeholder still invites the click,
 * and a greyed-out field reads as "broken" rather than "not needed yet". If
 * there is nothing to filter, there is no filter.
 *
 * ===========================================================================
 * WHY THE FEATHER IS NOT THE EMPTY-STATE ICON
 * ===========================================================================
 * All ten of the export's empty and error screens centre the SynQanun feather,
 * muted and outlined, and label it "Centered Muted Feather Outline Icon
 * (Matching Established Pattern)" and "Strict DESIGN.md §5 / empty-state rule".
 * There is no such rule, and the pattern it claims to match is the opposite of
 * the real one.
 *
 * brand-guidelines.md §5 makes the feather EXCLUSIVELY the AI's identity: it
 * "appears next to every AI-generated suggestion, draft, or action across the
 * product, so a user always knows 'this came from SynQanun's AI', even inside a
 * fully white-labeled client instance." That signal only works if the mark
 * appears nowhere else. Putting it on an empty documents list teaches a client
 * that the feather means "SynQanun" generally — and the next time it appears
 * beside something an agent actually drafted, it will not read as a warning
 * that a machine wrote it.
 *
 * The client portal has no AI surfaces at all (design.md §11 item 6), which is
 * exactly why it is the worst place to spend the mark. This is the same class
 * of contradiction as the export burying the language toggle in Settings
 * against design.md §12 — an export asserting compliance with a rule while
 * breaking it.
 *
 * So each caller passes an ordinary lucide glyph for the thing that is missing.
 * The only feather in this product is <FeatherMark>, and Badge's `ai` tone is
 * the only component that reaches for it.
 *
 * CTAs ARE THE EXCEPTION, NOT THE DEFAULT
 * ---------------------------------------------------------------------------
 * `action` exists for Messages and very little else. A client cannot make the
 * firm share a document or issue an invoice, so a button on those screens would
 * be an invitation to do something impossible. Messages is different — a client
 * can start a conversation — which is why it is the one that gets a button.
 *
 * design.md §5: "centering is reserved for empty states and modals only." This
 * is one of the two.
 */
export function EmptyState({ icon: Icon, title, body, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-card border border-gray-200 bg-white px-6 py-16 text-center',
        className
      )}
    >
      <span className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-pill border border-gray-200 bg-gray-50 text-gray-500">
        <Icon aria-hidden size={24} strokeWidth={1.5} />
      </span>

      {/* Not an <h1>: every screen that renders this already has one in its top
          bar, and a second would leave the page with two document titles. */}
      <p className="max-w-[34rem] text-body font-medium text-gray-700">{title}</p>

      {body ? <p className="mt-1.5 max-w-[34rem] text-caption text-gray-500">{body}</p> : null}

      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export default EmptyState;
