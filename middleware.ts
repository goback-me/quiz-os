import { NextResponse } from 'next/server'
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isAdminRoute = createRouteMatcher(['/admin(.*)', '/api/admin(.*)'])

// Signed out: a page visit goes to sign-in; anything else (API calls, form
// submits / server actions) gets a plain 401. Not auth().protect() — for
// non-page requests it answers 404 by fetching /clerk_<n> from our own public
// URL, and a signed-out tab retrying a form looped through Traefik nonstop.
export default clerkMiddleware((auth, req) => {
  if (!isAdminRoute(req) || auth().userId) return
  const isPageVisit = req.method === 'GET' && !req.nextUrl.pathname.startsWith('/api/') && !req.headers.has('next-action')
  if (isPageVisit) return auth().redirectToSignIn()
  return new NextResponse(null, { status: 401 })
})

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*', '/sign-in/:path*'],
}
