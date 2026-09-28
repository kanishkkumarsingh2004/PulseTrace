/**
 * Normalizes raw URL paths (e.g., /users/123e4567-e89b-12d3-a456-426614174000/orders/42)
 * into template routes (/users/:id/orders/:id) if route wasn't explicitly supplied.
 */
export function normalizeRoutePattern(path: string): string {
  if (!path) return '/';
  
  // Strip query strings
  const cleanPath = path.split('?')[0];

  // Regex patterns for common path variables (UUIDs, integer IDs, hashes)
  const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
  const numericIdRegex = /^\d+$/;
  const hashIdRegex = /^[0-9a-fA-F]{24,}$/;

  const segments = cleanPath.split('/').map((segment) => {
    if (uuidRegex.test(segment) || numericIdRegex.test(segment) || hashIdRegex.test(segment)) {
      return ':id';
    }
    return segment;
  });

  return segments.join('/') || '/';
}
