import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const COOKIE = "ttm_session";
const PUBLIC = ["/login", "/api/auth/login", "/api/auth/forgot"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (
    PUBLIC.some((p) => pathname === p || pathname.startsWith(p + "/")) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/avatars") ||
    pathname === "/favicon.ico" ||
    pathname.endsWith(".svg") ||
    pathname.endsWith(".png")
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE)?.value;
  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    const secret = new TextEncoder().encode(
      process.env.AUTH_SECRET || "dev-ttm-secret-change-me-in-production",
    );
    await jwtVerify(token, secret);
    return NextResponse.next();
  } catch {
    const res = NextResponse.redirect(new URL("/login", request.url));
    res.cookies.delete(COOKIE);
    return res;
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};