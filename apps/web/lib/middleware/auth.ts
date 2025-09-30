/**
 * Authentication Middleware
 *
 * Provides authentication protection for API routes using NextAuth.
 * Ensures only authenticated users can access protected resources.
 * Respects the AUTH_SECRET environment variable - if not set, authentication is bypassed.
 */

import { auth } from "@/auth"
import { NextResponse } from "next/server"
import { ApiErrorCode, ErrorResponse } from "@/lib/types"
import type { EnhancedRequest } from "./api-logger"

/**
 * Wraps an API route handler with authentication protection.
 * Checks for a valid NextAuth session before allowing access.
 * If AUTH_SECRET is not set, authentication is bypassed (development mode).
 *
 * @param handler - The API route handler to protect
 * @returns A wrapped handler that enforces authentication
 *
 * @example
 * ```typescript
 * export const GET = withAuthentication(
 *   withApiLogging(handler, { endpoint: "/api/tasks" })
 * )
 * ```
 */
export function withAuthentication<T>(
  handler: (request: EnhancedRequest) => Promise<NextResponse<T | ErrorResponse>>,
): (request: EnhancedRequest) => Promise<NextResponse<T | ErrorResponse>> {
  return async (request: EnhancedRequest) => {
    // Check if authentication is enabled via AUTH_SECRET environment variable
    // This matches the behavior in middleware.ts
    const isAuthEnabled = Boolean(process.env.AUTH_SECRET)

    // If authentication is disabled (no AUTH_SECRET), bypass auth check
    if (!isAuthEnabled) {
      return handler(request)
    }

    // Get current session using NextAuth
    const session = await auth()

    // Check if session exists and has a valid user
    if (!session || !session.user) {
      const errorResponse: ErrorResponse = {
        code: ApiErrorCode.AUTHENTICATION_REQUIRED,
        error: "Authentication required",
        message: "You must be authenticated to access this resource",
      }
      return NextResponse.json<ErrorResponse>(errorResponse, { status: 401 })
    }

    // Session is valid, proceed with handler
    return handler(request)
  }
}
