/**
 * The kind of work a legal matter is. See the note over `MatterWorkType` in
 * fixtures/matters.ts for where the five values come from.
 *
 * Its own module, with nothing imported, so a client component (the register's
 * filter, the New matter form) can use the list without bundling fixture data.
 */
export type MatterWorkType = 'case' | 'consultation' | 'contract' | 'enforcement' | 'otherProject';

/** In the order the client's sidebar lists them. */
export const MATTER_WORK_TYPES: MatterWorkType[] = [
  'case',
  'consultation',
  'contract',
  'enforcement',
  'otherProject',
];

/** `?type=` from a URL, or undefined for anything that is not a kind of work. */
export function toMatterWorkType(value: string | undefined): MatterWorkType | undefined {
  return MATTER_WORK_TYPES.find((type) => type === value);
}
