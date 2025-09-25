import { NextRequest, NextResponse } from "next/server"
import acceptLanguage from "accept-language"
import { auth } from "@/auth"
import { languages, fallbackLng, cookieName } from "./lib/i18n/settings"

acceptLanguage.languages([...languages])

export const config = {
  // matcher: '/*' will match all paths including API routes
  // We want to exclude API routes, _next static files, and other assets
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*|public).*)",
  ],
}

export default auth(function middleware(req) {
  let lng: string | undefined | null

  // Check if language is already in cookie
  if (req.cookies.has(cookieName)) {
    lng = acceptLanguage.get(req.cookies.get(cookieName)?.value)
  }

  // If no language in cookie, try to detect from Accept-Language header
  if (!lng) {
    lng = acceptLanguage.get(req.headers.get("Accept-Language"))
  }

  // Fallback to default language
  if (!lng) {
    lng = fallbackLng
  }

  // Check authentication for protected routes
  const isAuthPage = req.nextUrl.pathname.startsWith("/signin")
  const isPublicAsset = req.nextUrl.pathname.match(/\.(ico|png|jpg|jpeg|gif|svg|css|js)$/)

  if (!req.auth && !isAuthPage && !isPublicAsset) {
    // Redirect to signin page if not authenticated
    const signInUrl = new URL("/signin", req.url)
    return NextResponse.redirect(signInUrl)
  }

  if (req.auth && isAuthPage) {
    // Redirect to home if already authenticated and trying to access auth pages
    const homeUrl = new URL("/", req.url)
    return NextResponse.redirect(homeUrl)
  }

  // Create response
  const response = NextResponse.next()

  // Set language cookie if it doesn't exist or is different
  if (!req.cookies.has(cookieName) || req.cookies.get(cookieName)?.value !== lng) {
    response.cookies.set(cookieName, lng, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365, // 1 year
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    })
  }

  // Add language to headers for use in app
  response.headers.set("x-lng", lng)

  return response
})
