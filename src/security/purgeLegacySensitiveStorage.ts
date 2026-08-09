const LEGACY_EXACT_KEYS = new Set([
  'dermahealth:v1:auth:accessToken',
  'dermahealth:v1:auth:accessTokenExpiresAt',
  'dermahealth:reception-device:id',
  'dermahealth:reception-device:secret',
]);

const LEGACY_PREFIXES = [
  'dermahealth:store:',
  'dermahealth:workflow-layout:',
];

/** One-way migration: remove PHI, bearer tokens and device credentials left
 * by older releases. Failure is intentionally non-fatal for locked-down
 * browsers; the current release never writes these values back. */
export function purgeLegacySensitiveStorage(): void {
  if (typeof localStorage !== 'undefined') {
    try {
      const keys = Array.from({ length: localStorage.length }, (_, index) =>
        localStorage.key(index),
      ).filter((key): key is string => key !== null);
      keys
        .filter(
          (key) =>
            LEGACY_EXACT_KEYS.has(key) ||
            LEGACY_PREFIXES.some((prefix) => key.startsWith(prefix)),
        )
        .forEach((key) => localStorage.removeItem(key));
    } catch {
      // Storage can be unavailable in private/restricted browsing.
    }
  }

  if (typeof sessionStorage !== 'undefined') {
    try {
      sessionStorage.removeItem('dermahealth:returnTo');
    } catch {
      // Storage can be unavailable in private/restricted browsing.
    }
  }
}
