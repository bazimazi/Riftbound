/** Authored catalogs are looked up by IDs loaded from saves and game events. */
export function defineTable<T>(entries: Record<string, T>): Record<string, T> {
  return entries;
}
