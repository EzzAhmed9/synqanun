/*
 * The register's URL vocabulary, in a plain module so the server-rendered
 * segment strip (RegisterView) and the client-side dropdowns (RegisterTable)
 * build their links with the same function. It cannot live in RegisterTable:
 * a function exported from a 'use client' file is a client reference on the
 * server, not something the server can call.
 */

/** The dropdowns' values, as they stand in the URL. */
export interface RegisterSelected {
  /** `archive` for the Archive; absent for the active list. */
  view?: 'archive';
  type?: string;
  client?: string;
  venue?: string;
  lead?: string;
}

/** The query string for a register view, with only the keys that are set. */
export function registerQuery(segment: string | undefined, selected: RegisterSelected) {
  return {
    ...(selected.view ? { view: selected.view } : {}),
    ...(segment ? { segment } : {}),
    ...(selected.type ? { type: selected.type } : {}),
    ...(selected.client ? { client: selected.client } : {}),
    ...(selected.venue ? { venue: selected.venue } : {}),
    ...(selected.lead ? { lead: selected.lead } : {}),
  };
}
