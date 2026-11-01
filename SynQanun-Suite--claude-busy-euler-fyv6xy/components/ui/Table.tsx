import * as React from 'react';
import { ChevronDown, ChevronUp, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Tables carry a lot of this product — billing, DMS, matter lists — so
 * design.md §4 specifies them tightly:
 *
 *   · Row height 44px (also the §8 touch-target minimum).
 *   · gray-200 HORIZONTAL dividers only. No vertical grid lines —
 *     "Office-style, not spreadsheet-style".
 *   · gray-100 zebra striping optional, for long tables only.
 *   · Sortable headers: gray-500 label, gray-700 when that column is the
 *     active sort.
 *
 * And design.md §7: never centre-align table content. Every cell here is
 * start-aligned, which resolves to left in English and right in Arabic through
 * `text-start` rather than a hardcoded side.
 *
 * BELOW 768px — design.md §8 requires that "tables convert to stacked cards
 * (row → card, columns → labeled rows)". Batch 0 deferred that transform to the
 * first screen with a real table, so the column metadata would come from
 * something real instead of being guessed; the client Matters list is that
 * screen, and it is built now.
 *
 * The mechanism is `<TableCell label>`, which writes the column's name onto the
 * cell as `data-label`. Above 768px nothing reads it. Below, a rule in
 * globals.css restyles each row as a card and prints that label beside its
 * value, so a column heading a phone can no longer show still reaches the cell
 * that needed it. A cell with no `label` renders as a full-width block in card
 * mode — right for the row's title, wrong for everything else.
 */

export interface TableProps extends React.TableHTMLAttributes<HTMLTableElement> {
  /** Apply gray-100 zebra striping. design.md §4 marks it optional and scopes
   *  it to long tables — leave it off for short ones. */
  striped?: boolean;
  /**
   * Convert to stacked cards below 768px, per design.md §8. On by default,
   * because §8 states it as the behaviour rather than as an option.
   *
   * Turn it off only for a table that is genuinely a grid of numbers, where
   * comparing DOWN a column is the point and a horizontal scroll preserves more
   * than a stack of cards would.
   */
  stackOnMobile?: boolean;
}

export function Table({ striped = false, stackOnMobile = true, className, ...props }: TableProps) {
  return (
    // Horizontal scroll is contained here so a wide table never makes the
    // whole page scroll sideways.
    <div className="w-full overflow-x-auto">
      <table
        data-striped={striped || undefined}
        data-stacked={stackOnMobile || undefined}
        className={cn('w-full border-collapse text-body', className)}
        {...props}
      />
    </div>
  );
}

export function TableHead({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn('border-b border-gray-200', className)} {...props} />;
}

export function TableBody({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody
      className={cn(
        // Horizontal dividers only — no vertical grid lines (design.md §4).
        // Zebra striping is driven by the parent table's `data-striped`
        // attribute via a rule in globals.css, so a single `striped` prop on
        // <Table> reaches every row without being threaded through each one.
        '[&>tr]:border-b [&>tr]:border-gray-200',
        className
      )}
      {...props}
    />
  );
}

export interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  /** Mark the row as selected — gray-100 fill with a syn-red start-edge
   *  indicator, matching the active-nav treatment in design.md §4. */
  selected?: boolean;
}

export function TableRow({ selected, className, ...props }: TableRowProps) {
  return (
    <tr
      aria-selected={selected || undefined}
      className={cn(
        // design.md §4: row height 44px.
        'h-11',
        selected && 'bg-gray-100',
        'hover:bg-gray-50',
        className
      )}
      {...props}
    />
  );
}

export type SortDirection = 'asc' | 'desc' | null;

export interface TableHeaderCellProps
  extends Omit<React.ThHTMLAttributes<HTMLTableCellElement>, 'onClick'> {
  /** Make the header sortable. Requires `onSort`. */
  sortable?: boolean;
  /** Current sort direction for THIS column. `null` means it isn't the active
   *  sort column. */
  sortDirection?: SortDirection;
  onSort?: () => void;
  /** Right-align numeric columns (amounts, counts). Resolves to the END side,
   *  so it mirrors correctly in RTL. */
  numeric?: boolean;
}

export function TableHeaderCell({
  sortable = false,
  sortDirection = null,
  onSort,
  numeric = false,
  className,
  children,
  ...props
}: TableHeaderCellProps) {
  const isActiveSort = sortDirection !== null;

  return (
    <th
      scope="col"
      // Communicates the sort state to assistive tech, not just visually.
      aria-sort={
        !sortable ? undefined : sortDirection === 'asc' ? 'ascending' : sortDirection === 'desc' ? 'descending' : 'none'
      }
      className={cn(
        'h-11 px-3 align-middle',
        // Sentence case, never an all-caps eyebrow — design.md §3 and §7.
        'text-caption font-medium',
        // design.md §4: gray-500 label, gray-700 on active sort.
        isActiveSort ? 'text-gray-700' : 'text-gray-500',
        numeric ? 'text-end' : 'text-start',
        className
      )}
      {...props}
    >
      {sortable ? (
        <button
          type="button"
          onClick={onSort}
          className={cn(
            'inline-flex items-center gap-1 rounded-sm hover:text-gray-700',
            numeric && 'flex-row-reverse'
          )}
        >
          {children}
          {sortDirection === 'asc' ? (
            <ChevronUp aria-hidden size={14} />
          ) : sortDirection === 'desc' ? (
            <ChevronDown aria-hidden size={14} />
          ) : (
            <ChevronsUpDown aria-hidden size={14} className="text-gray-500" />
          )}
        </button>
      ) : (
        children
      )}
    </th>
  );
}

export interface TableCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  /** Right-align and set JetBrains Mono. design.md §3 reserves the mono face
   *  for references and IDs; §9's billing example also sets amounts in it so
   *  digits stay tabular and column-aligned. */
  numeric?: boolean;
  /** Set in JetBrains Mono without changing alignment — clause numbers, doc
   *  IDs, invoice numbers, AI citations. */
  reference?: boolean;
  /** The one value in the row that matters — a due date, a total. design.md §3
   *  is explicit that this is for meaning, "not decoration". */
  emphasis?: boolean;
  /**
   * This cell's column name, for the sub-768px card layout — see the note at
   * the top of this file. Invisible above 768px.
   *
   * Pass the SAME string the column header shows, from the same translation
   * key, so the two cannot drift apart. Omit it on the cell that carries the
   * row's identity (its title or reference): that one reads as the card's
   * heading and a label in front of it would be noise.
   */
  label?: string;
}

export function TableCell({
  numeric = false,
  reference = false,
  emphasis = false,
  label,
  className,
  ...props
}: TableCellProps) {
  return (
    <td
      data-label={label}
      className={cn(
        'px-3 py-2 align-middle',
        // Never centred — design.md §7.
        numeric ? 'text-end' : 'text-start',
        // Colour, size/family and weight are set on separate axes rather than
        // in overlapping bundles. Bundling them meant `text-body` (14px) and
        // `text-reference` (13px) both landed on a mono cell, and whichever
        // came last silently won — reference cells were rendering at the body
        // size. Mutually exclusive branches make that impossible.
        emphasis ? 'text-gray-700' : 'text-gray-600',
        numeric || reference
          ? 'font-mono text-reference'
          : emphasis
            ? 'text-body-emphasis'
            : 'text-body',
        // design.md §3 allows the mono face at 400–500; an emphasised value
        // keeps its weight whichever family it is set in.
        emphasis && 'font-medium',
        className
      )}
      {...props}
    />
  );
}

export function TableCaption({ className, ...props }: React.HTMLAttributes<HTMLTableCaptionElement>) {
  return <caption className={cn('pb-2 text-start text-caption text-gray-500', className)} {...props} />;
}
