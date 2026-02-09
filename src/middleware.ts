import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  const isPublicRoute = pathname.startsWith('/verify') ||
                        pathname.startsWith('/api') ||
                        pathname.startsWith('/_next') ||
                        pathname.includes('.');

  if (isPublicRoute) {
    return NextResponse.next();
  }

  // For protected and auth routes, let the client handle the auth state
  // The actual auth check happens in the React components
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*|api).*)',
  ],
};
