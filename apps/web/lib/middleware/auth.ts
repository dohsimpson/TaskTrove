/**
 * Authentication Middleware
 *
 * Provides authentication protection for API routes using NextAuth session-based auth
 * or Bearer token authentication.
 * Ensures only authenticated users can access protected resources.
 * Respects the AUTH_SECRET environment variable - if not set, authentication is bypassed.
 */

import { auth } from "@/auth"
import { NextResponse } from "next/server"
import { ApiErrorCode, ErrorResponse } from "@/lib/types"
import type { EnhancedRequest } from "./api-logger"
import { safeReadDataFile } from "@/lib/utils/safe-file-operations"
import { isAuthEnabled } from "@/lib/utils/env"

/**
 * Checks if the provided bearer token matches the user's API token
 * @param token - Bearer token from Authorization header
 * @returns true if token is valid, false otherwise
 */
async function isValidBearerToken(token: string): Promise<boolean> {
  try {
    const dataFile = await safeReadDataFile()
    if (!dataFile) return false

    const apiToken = dataFile.user.apiToken
    if (!apiToken) return false

    return token === apiToken
  } catch {
    return false
  }
}

/**
 * Wraps an API route handler with authentication protection.
 * Supports two authentication methods:
 * 1. NextAuth session-based authentication (cookies)
 * 2. Bearer token authentication (Authorization header) - only for /api/v1 routes
 *
 * If AUTH_SECRET is not set, authentication is bypassed (development mode).
 *
 * @param handler - The API route handler to protect
 * @param options - Configuration options
 * @param options.allowApiToken - Whether to allow bearer token auth (default: false, true for v1 routes)
 * @returns A wrapped handler that enforces authentication
 *
 * @example
 * ```typescript
 * // Public API endpoint (v1) - allows bearer token
 * export const GET = withAuthentication(
 *   withApiLogging(handler, { endpoint: "/api/v1/tasks" }),
 *   { allowApiToken: true }
 * )
 *
 * // Private endpoint - session only
 * export const GET = withAuthentication(
 *   withApiLogging(handler, { endpoint: "/api/settings" })
 * )
 * ```
 */
export function withAuthentication<T>(
  handler: (request: EnhancedRequest) => Promise<NextResponse<T | ErrorResponse>>,
  options: { allowApiToken?: boolean } = {},
): (request: EnhancedRequest) => Promise<NextResponse<T | ErrorResponse>> {
  return async (request: EnhancedRequest) => {
    // Check if authentication is enabled via AUTH_SECRET environment variable
    // This matches the behavior in middleware.ts
    // If authentication is disabled (no AUTH_SECRET), bypass auth check
    if (!isAuthEnabled()) {
      return handler(request)
    }

    // Check for bearer token authentication first (only if allowed)
    if (options.allowApiToken) {
      const authHeader = request.headers.get("Authorization")
      if (authHeader?.startsWith("Bearer ")) {
        const token = authHeader.slice(7) // Remove "Bearer " prefix
        if (await isValidBearerToken(token)) {
          // Token is valid, proceed with handler
          return handler(request)
        }
        // Invalid token - fall through to return auth error
      }
    }

    // Fall back to session-based authentication
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
