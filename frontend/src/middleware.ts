import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Port-based routing middleware.
 *
 * Port 3000 → Customer site  (landing page, /order, /login, /signup)
 * Port 3001 → Admin site     (admin landing, /admin/*, /login)
 *
 * Cross-port requests are redirected to the correct site.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = request.headers.get("host") || "";
  const port = host.split(":")[1] || "3000";

  // ── Admin site (port 3001) ──────────────────────────────────────
  if (port === "3001") {
    // Root "/" → show admin landing page
    if (pathname === "/") {
      return NextResponse.rewrite(new URL("/admin-landing", request.url));
    }

    // Allow admin routes, login, and API/static assets
    if (
      pathname.startsWith("/admin") ||
      pathname.startsWith("/login") ||
      pathname.startsWith("/signup") ||
      pathname.startsWith("/_next") ||
      pathname.startsWith("/api") ||
      pathname.includes(".")
    ) {
      return NextResponse.next();
    }

    // Customer routes → redirect to port 3000
    if (pathname.startsWith("/order")) {
      const url = new URL(pathname, `http://localhost:3000`);
      url.search = request.nextUrl.search;
      return NextResponse.redirect(url);
    }

    // Everything else → admin dashboard
    return NextResponse.rewrite(new URL("/admin" + pathname, request.url));
  }

  // ── Customer site (port 3000) ───────────────────────────────────
  if (pathname.startsWith("/admin")) {
    const url = new URL(pathname, `http://localhost:3001`);
    url.search = request.nextUrl.search;
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all routes except static files and Next.js internals
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
