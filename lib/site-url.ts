// Single place that turns NEXT_PUBLIC_SITE_URL into the base URL used for public quiz links
// and embed snippets — forces https so a misconfigured env var (or one left as `http://...`)
// never leaks an insecure link into a client's site. localhost is exempt so local dev still works.
export function getPublicSiteUrl(): string {
  const raw = (process.env.NEXT_PUBLIC_SITE_URL ?? '').trim().replace(/\/+$/, '')
  if (!raw || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(raw)) return raw
  return raw.replace(/^http:\/\//, 'https://')
}
