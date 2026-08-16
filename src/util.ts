/** Small shared helpers. */

/** Render any thrown value as a stable single-line diagnostic. */
export function renderThrown(error: unknown): string {
  if (error instanceof Error) return error.message
  return String(error)
}
