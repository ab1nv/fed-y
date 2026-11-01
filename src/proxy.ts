import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const SESSION_COOKIE = "fedy_session";

async function sessionRole(request: NextRequest): Promise<string | null> {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(process.env.SESSION_SECRET));
    return (payload.role as string) ?? null;
  } catch {
    return null;
  }
}

function homeFor(role: string) {
  return role === "DRIVER" ? "/driver" : "/dashboard";
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const role = await sessionRole(request);

  if (pathname === "/login" || pathname === "/signup") {
    if (role) return NextResponse.redirect(new URL(homeFor(role), request.url));
    return;
  }
  if (!role) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  if (pathname.startsWith("/admin") && role !== "ADMIN")
    return NextResponse.redirect(new URL("/dashboard", request.url));
  if (pathname.startsWith("/driver") && role !== "DRIVER")
    return NextResponse.redirect(new URL(homeFor(role), request.url));
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/driver/:path*", "/login", "/signup"],
};
