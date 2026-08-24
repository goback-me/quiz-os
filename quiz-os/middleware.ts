import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

// Reuses the Clerk setup pattern from Coach OS. Everything except /admin is public —
// quiz pages and the submit API must stay reachable with zero auth for embeds to work.
const isAdminRoute = createRouteMatcher(['/admin(.*)', '/api/admin(.*)'])

export default clerkMiddleware((auth, req) => {
  if (isAdminRoute(req)) auth().protect()
})

export const config = {
  matcher: ['/((?!_next|.*\\..*).*)'],
}
