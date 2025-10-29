import { NextRequest, NextResponse } from "next/server"
import acceptLanguage from "accept-language"
import { auth } from "@/auth"
import { languages, fallbackLng, cookieName } from "./lib/i18n/settings"
import { NextAuthRequest } from "next-auth"
import { isAuthEnabled } from "@/lib/utils/env"

acceptLanguage.languages([...languages])

export const config = {
  runtime: "nodejs",
  // matcher: '/*' will match all paths including API routes
  // We want to exclude _next static files and other assets
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|.*\\..*|public).*)",
  ],
}

// const isAPIAuthEnabled = Boolean(process.env.API_SECRET_TOKEN)
//
// function checkBearerToken(req: NextRequest): boolean {
//   const authHeader = req.headers.get("authorization")
//   if (!authHeader?.startsWith("Bearer ")) {
//     return false
//   }
//
//   const token = authHeader.slice(7) // Remove "Bearer " prefix
//   const validToken = process.env.API_SECRET_TOKEN
//
//   // If no valid token is configured, reject bearer auth
//   if (!validToken) {
//     return false
//   }
//
//   return token === validToken
// }

function handleI18n(req: NextRequest) {
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

  return lng
}

function setI18nResponse(response: NextResponse, lng: string, req: NextRequest) {
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

function middleware(req: NextRequest) {
  const lng = handleI18n(req)
  const authReq = req as NextAuthRequest

  const isAPIRoute = req.nextUrl.pathname.startsWith("/api/")
  const isAuthRoute = req.nextUrl.pathname.startsWith("/api/auth")
  const isSignInRoute = req.nextUrl.pathname.startsWith("/signin")
  const isInitialSetupAPIRoute = req.nextUrl.pathname.startsWith("/api/initial-setup")
  const isHealthAPIRoute = req.nextUrl.pathname.startsWith("/api/health")
  const isDataInitializeAPIRoute = req.nextUrl.pathname.startsWith("/api/data/initialize")
  // const isAsset = req.nextUrl.pathname.match(/\.(ico|png|jpg|jpeg|gif|svg|css|js)$/)

  if (
    isAuthRoute ||
    isSignInRoute ||
    isInitialSetupAPIRoute ||
    isHealthAPIRoute ||
    isDataInitializeAPIRoute
  ) {
    return setI18nResponse(NextResponse.next(), lng, req)
  }

  if (isAuthEnabled()) {
    if (authReq.auth) {
      return setI18nResponse(NextResponse.next(), lng, req)
    } else {
      // For API routes, let route handlers handle authentication with proper JSON responses
      // For UI routes, redirect to sign-in page
      if (isAPIRoute) {
        return setI18nResponse(NextResponse.next(), lng, req)
      } else {
        return setI18nResponse(NextResponse.redirect(new URL("/signin", req.url)), lng, req)
      }
    }
  }

  // When auth is disabled, still handle i18n
  return setI18nResponse(NextResponse.next(), lng, req)
}

export default isAuthEnabled() ? auth(middleware) : middleware
