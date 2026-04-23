/**
 * Returns a storage-safe filename for Supabase Storage.
 * Storage keys must not contain spaces, non-ASCII (e.g. Cyrillic), or symbols like +.
 * We keep the original extension and use timestamp + random string for the base.
 * The original display name is stored in file_name/title in the DB.
 */
export function getSafeStorageFileName(originalName: string): string {
  const ext = (originalName.split('.').pop()?.toLowerCase() || 'bin').replace(/[^a-z0-9]/g, '')
  const safeExt = ext || 'bin'
  const randomPart = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID().slice(0, 8)
    : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
  return `${Date.now()}-${randomPart}.${safeExt}`
}
