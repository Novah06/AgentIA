import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { hasClerkConfigured } from '@/lib/auth';

const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/api/chat(.*)',
  '/api/upload(.*)',
  '/studio(.*)',
  '/api/studio(.*)',
  '/tcg(.*)',
  '/api/tcg(.*)',
]);

/**
 * Routes des bots du portefeuille : elles ne portent pas de session utilisateur
 * (elles sont appelées par un planificateur) et s'authentifient avec
 * CRON_SECRET, vérifié dans les routes elles-mêmes.
 */
const isMachineRoute = createRouteMatcher(['/api/tcg/cron(.*)', '/api/tcg/prix/import']);

export default hasClerkConfigured
  ? clerkMiddleware(async (auth, req) => {
      if (isProtectedRoute(req) && !isMachineRoute(req)) {
        await auth.protect();
      }
    })
  : function passthroughMiddleware() {
      return NextResponse.next();
    };

export const config = {
  matcher: ['/((?!.+\\.[\\w]+$|_next).*)', '/', '/(api|trpc)(.*)'],
};
