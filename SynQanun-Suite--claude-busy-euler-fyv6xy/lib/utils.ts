import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/**
 * tailwind-merge, taught about this project's custom theme tokens.
 *
 * WHY THIS CONFIGURATION IS REQUIRED (it is not a nicety — it fixes a bug)
 * ---------------------------------------------------------------------------
 * tailwind-merge resolves conflicts by sorting classes into groups. Out of the
 * box it only knows Tailwind's STOCK token names, and it decides what a
 * `text-*` class means by matching those: `text-sm` is a font size, and
 * anything else — `text-white`, `text-gray-600` — is a colour.
 *
 * app/globals.css replaces the stock scale entirely with design.md §3's named
 * levels: `text-body`, `text-caption`, `text-display`, `text-reference` and so
 * on. tailwind-merge has never heard of them, so it filed them as COLOURS.
 *
 * The consequence was live and visible: <Button variant="primary"> composes
 * `text-white` (from the variant) followed by `text-body` (from the size).
 * Believing both to be colours, tailwind-merge dropped `text-white` as the
 * loser and every primary button rendered its label in inherited gray-600 on a
 * syn-red fill — unreadable, and a WCAG failure on the product's single most
 * important action. Badge (`text-caption` vs `text-success`) and TableCell
 * (`text-body` vs `text-gray-600`) had the same collision, silently losing
 * their type scale.
 *
 * Declaring the custom names below puts them back in the font-size group, so a
 * size and a colour stop competing. Any token added to the `@theme` block in
 * globals.css must be mirrored here, or it will resurface the same class of
 * bug.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      // design.md §3 type scale, plus the Arabic +10% line-height variants.
      'font-size': [
        {
          text: [
            'display',
            'heading',
            'title',
            'body',
            'body-emphasis',
            'caption',
            'reference',
            'hero',
            'display-ar',
            'heading-ar',
            'title-ar',
            'body-ar',
            'body-emphasis-ar',
            'caption-ar',
            'reference-ar',
          ],
        },
      ],
      // design.md §4 corner radii.
      rounded: [{ rounded: ['btn', 'card', 'pill'] }],
      // design.md §6 elevation levels.
      shadow: [{ shadow: ['resting', 'raised', 'overlay'] }],
    },
  },
});

/**
 * Merge Tailwind classes, letting later classes win over earlier conflicting
 * ones. Used by every UI-kit component so a caller can override a variant's
 * styling via `className` without fighting specificity.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * First letter of the first two words, for an avatar.
 *
 * Script-agnostic: it assumes word boundaries, not an alphabet, so "Mansoor
 * Al-Farooq" gives "MA" and "منصور الفاروق" gives "ما". `Array.from` rather than
 * `[0]` because a code unit is not a character once you leave the BMP.
 *
 * Extracted at the third real instance — the top bar, the engagement contact
 * card, and now every message bubble and thread row. Three copies of a rule
 * about how a person's name is abbreviated is three chances for one of them to
 * start abbreviating differently.
 *
 * NOT the feather. brand-guidelines.md §5 keeps the feather exclusively the
 * AI's identity, so a human's avatar must never wear it — which is exactly why
 * the client portal's chat bubbles use initials.
 */
export function initialsOf(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => Array.from(word)[0] ?? '')
    .join('');
}
