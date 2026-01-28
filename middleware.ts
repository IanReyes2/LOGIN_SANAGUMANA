import { type NextRequest, NextResponse } from "next/server"
import { jwtVerify } from "jose"

const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || "fallback-secret")

// Define protected routes that require authentication
const protectedRoutes = ["/dashboard", "/profile", "/settings"]

// Define public routes that should redirect to dashboard if authenticated
const publicRoutes = ["/login", "/register"]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get("auth-token")?.value

 //CORS FOR API
  if (pathname.startsWith("/api")) {
    // Handle preflight requests
    if (request.method === "OPTIONS") {
      return new NextResponse(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "http://localhost:3001",
          "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Allow-Credentials": "true",
        },
      })
    }

    // Set CORS headers on normal API requests
    const res = NextResponse.next()
    res.headers.set("Access-Control-Allow-Origin", "http://localhost:3001")
    res.headers.set("Access-Control-Allow-Credentials", "true");
    return res
  }

  // Check if the current path is protected
  const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route))
  const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route))

  // Verify token if it exists
  let isAuthenticated = false
  if (token) {
    try {
      await jwtVerify(token, secret)
      isAuthenticated = true
    } catch (error) {
      // Token is invalid, clear it
      const response = NextResponse.next()
      response.cookies.set("auth-token", "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 0,
        path: "/",
      })
      isAuthenticated = false
    }
  }

  // Redirect logic
  if (isProtectedRoute && !isAuthenticated) {
    // Redirect to login if trying to access protected route without auth
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("redirect", pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (isPublicRoute && isAuthenticated) {
    // Redirect to dashboard if trying to access login/register while authenticated
    const redirectUrl = request.nextUrl.searchParams.get("redirect") || "/dashboard"
    return NextResponse.redirect(new URL(redirectUrl, request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!api|_next/static|_next/image|favicon.ico|public).*)",
  ],
}
