import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = new Set(["/login", "/favicon.ico"]);

type Role = "admin" | "merchant" | "consumer";
type Session = { role: Role; id: string | null };

function parseSession(raw: string | undefined): Session | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/api/") ||
    PUBLIC_PATHS.has(pathname)
  ) {
    return NextResponse.next();
  }

  const session = parseSession(request.cookies.get("ps")?.value);

  if (!session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Root redirect based on role
  if (pathname === "/") {
    if (session.role === "admin")    return NextResponse.redirect(new URL("/admin/dashboard", request.url));
    if (session.role === "merchant") return NextResponse.redirect(new URL("/merchant/dashboard", request.url));
    if (session.role === "consumer") return NextResponse.redirect(new URL("/consumer/dashboard", request.url));
  }

  // Strict role-based route guards — cross-role access → back to login
  if (pathname.startsWith("/admin")    && session.role !== "admin")    return NextResponse.redirect(new URL("/login", request.url));
  if (pathname.startsWith("/merchant") && session.role !== "merchant") return NextResponse.redirect(new URL("/login", request.url));
  if (pathname.startsWith("/consumer") && session.role !== "consumer") return NextResponse.redirect(new URL("/login", request.url));

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
