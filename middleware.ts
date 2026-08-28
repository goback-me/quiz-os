import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isAdminRoute = createRouteMatcher(['/admin(.*)', '/api/admin(.*)'])

export default clerkMiddleware((auth, req) => {
  if (isAdminRoute(req)) auth().protect()
})

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*', '/sign-in/:path*'],
}