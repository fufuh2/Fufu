import { NextResponse } from 'next/server';

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'https://deeptradescan.com,http://localhost:3000')
  .split(',').map(o => o.trim());

export function proxy(request) {
  const { pathname } = request.nextUrl;
  const origin = request.headers.get('origin') || '';

  if (pathname.startsWith('/api/')) {
    const res = NextResponse.next();

    // ── Security headers ──────────────────────────────────────────────────────
    res.headers.set('X-Content-Type-Options', 'nosniff');
    res.headers.set('X-Frame-Options', 'DENY');
    res.headers.set('X-XSS-Protection', '1; mode=block');
    res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

    // ── CORS — only allow known origins ──────────────────────────────────────
    const isAllowed = ALLOWED_ORIGINS.some(o => origin === o || origin === '');
    if (isAllowed && origin) {
      res.headers.set('Access-Control-Allow-Origin', origin);
      res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
      res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Internal-Secret');
      res.headers.set('Access-Control-Max-Age', '86400');
      res.headers.set('Vary', 'Origin');
    }

    // ── Handle preflight ──────────────────────────────────────────────────────
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, { status: 204, headers: res.headers });
    }

    return res;
  }

  // ── Page-level security headers ───────────────────────────────────────────
  const res = NextResponse.next();
  res.headers.set('X-Frame-Options', 'SAMEORIGIN');
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  return res;
}

export const config = {
  matcher: ['/api/:path*', '/((?!_next/static|_next/image|favicon.ico|.*\\.svg|.*\\.webp|.*\\.png).*)'],
};
