/**
 * Origin validation utilities for API security
 */

/**
 * Validate if the request origin is allowed
 */
export function isValidOrigin(
  origin: string | null,
  referer: string | null,
  host: string | null,
): boolean {
  // Allow requests with no origin and no referer (direct server-to-server calls)
  if (!origin && !referer) return true;

  // Check if origin matches host
  if (origin) {
    try {
      const originUrl = new URL(origin);
      return originUrl.host === host;
    } catch {
      return false;
    }
  }

  // Check referer as fallback
  if (referer) {
    try {
      const refererUrl = new URL(referer);
      return refererUrl.host === host;
    } catch {
      return false;
    }
  }

  return false;
}
