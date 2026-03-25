/**
 * User-scoped localStorage utilities.
 *
 * Every localStorage key is namespaced by the user's email so that
 * different Google accounts on the same browser get isolated data.
 */

/** Build a per-user localStorage key */
export function userKey(base: string, email: string | null): string {
  if (!email) return base // fallback for legacy / password users
  return `${base}__${email}`
}

/**
 * One-time migration: copy data stored under the old (global) key
 * into the new user-scoped key so existing users keep their data.
 * Only runs if the new key is empty AND the old key has data.
 */
export function migrateIfNeeded(base: string, email: string | null) {
  if (!email) return
  const scoped = userKey(base, email)
  if (localStorage.getItem(scoped)) return // already migrated
  const old = localStorage.getItem(base)
  if (old) {
    localStorage.setItem(scoped, old)
  }
}
