import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { hasClerkConfigured } from '@/lib/auth';

const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/api/chat(.*)',
  '/api/upload(.*)',
  '/studio(.*)',
  '/api/studio(.*)',
]);

export default hasClerkConfigured
  ? clerkMiddleware(async (auth, req) => {
      if (isProtectedRoute(req)) {
        await auth.protect();
      }
    })
  : function passthroughMiddleware() {
      return NextResponse.next();
    };

export const config = {
  matcher: ['/((?!.+\\.[\\w]+$|_next).*)', '/', '/(api|trpc)(.*)'],
};
