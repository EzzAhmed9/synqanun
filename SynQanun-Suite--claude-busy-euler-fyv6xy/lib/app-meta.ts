import pkg from '@/package.json';

/**
 * The application version, read from package.json so there is exactly one
 * place it is defined.
 *
 * The Stitch splash export carried a hardcoded "v2.4", which is a number this
 * product has never had. Anything user-visible that claims to state a fact
 * about the system should be derived from the system, not typed into a
 * template — brand-guidelines.md §6, "Precise over persuasive… states what
 * happened".
 */
export const APP_VERSION: string = pkg.version;
