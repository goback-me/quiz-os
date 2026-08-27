/**
 * Turns arbitrary input into a safe URL slug — strips protocols, slashes, spaces, and anything
 * that isn't a-z/0-9/hyphen. Prevents someone pasting a full URL (e.g. "https://client.com/")
 * into a slug field and silently breaking every generated link, which is exactly what happened
 * without this: the slug ended up containing literal slashes, producing a URL-inside-a-URL.
 */
export function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '') // strip protocol if someone pasted a full URL
    .replace(/[^a-z0-9]+/g, '-') // anything that isn't alphanumeric becomes a hyphen
    .replace(/^-+|-+$/g, '') // trim leading/trailing hyphens
    .slice(0, 80) // sane length cap
}
