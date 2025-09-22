import { NextRequest, NextResponse } from "next/server"
import acceptLanguage from "accept-language"
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

export function middleware(req: NextRequest) {
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
}
