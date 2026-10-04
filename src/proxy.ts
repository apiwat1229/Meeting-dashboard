import { NextResponse, type NextRequest } from "next/server";
import {
  dashboardAuthIsRequired,
  getDashboardSessionCookieName,
  isDashboardAuthConfigured,
  verifyDashboardSession,
} from "@/lib/dashboard-auth";

export function proxy(request: NextRequest) {
  if (!isDashboardAuthConfigured()) {
    if (!dashboardAuthIsRequired()) return NextResponse.next();
    return new Response("Dashboard authentication is not configured.", {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }

  const session = verifyDashboardSession(request.cookies.get(getDashboardSessionCookieName())?.value);
  const isLoginRoute = request.nextUrl.pathname === "/login";

  if (!session && !isLoginRoute) {
    if (request.nextUrl.pathname.startsWith("/api/")) {
      return NextResponse.json({ message: "Authentication required." }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (session && isLoginRoute) return NextResponse.redirect(new URL("/", request.url));
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
