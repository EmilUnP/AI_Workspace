/**
 * Generate a random ID (standalone export for packages that must not load UI-dependent utils)
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}
