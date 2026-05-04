/**
 * API endpoint security flag for /api/ai/offer-brain.
 *
 * Strict opt-in: only the literal string 'true' enables the endpoint.
 * All other values (absent, 'false', 'TRUE', '1', '') keep it disabled.
 *
 * The function is in its own module so the API route file stays clean
 * (Next.js only allows specific named exports from route.ts files).
 */

export function endpointEnabled(): boolean {
  return process.env.OFFER_BRAIN_API_ENABLED === 'true';
}
