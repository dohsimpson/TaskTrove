import { NextResponse } from "next/server"
import type { EnhancedRequest } from "./api-logger"
import type { ErrorResponse } from "@tasktrove/types/api-responses"
import { ApiErrorCode } from "@tasktrove/types/api-errors"

/**
 * Current API version
 */
export const CURRENT_API_VERSION = "1"

/**
 * Supported API versions
 */
export const SUPPORTED_API_VERSIONS = ["1"]

/**
 * API version negotiation middleware
 *
 * Extracts API version from X-API-Version header, validates it,
 * and adds version information to response headers.
 */
export function withApiVersion<T>(
  handler: (request: EnhancedRequest) => Promise<NextResponse<T | ErrorResponse>>,
): (request: EnhancedRequest) => Promise<NextResponse<T | ErrorResponse>> {
  return async (request: EnhancedRequest) => {
    // Extract version from header, default to current version
    const requestedVersion = request.headers.get("X-API-Version") || CURRENT_API_VERSION

    // Validate requested version
    if (!SUPPORTED_API_VERSIONS.includes(requestedVersion)) {
      return NextResponse.json(
        {
          code: ApiErrorCode.UNSUPPORTED_API_VERSION,
          error: "Unsupported API version",
          message: `API version ${requestedVersion} is not supported. Supported versions: ${SUPPORTED_API_VERSIONS.join(", ")}`,
        },
        { status: 400 },
      )
    }

    // Call the handler
    const response = await handler(request)

    // Add version headers to response
    response.headers.set("X-API-Version", requestedVersion)

    return response
  }
}

/**
 * Middleware to add deprecation warning header
 * Used for legacy route aliases
 */
export function withDeprecationWarning<T>(
  handler: (request: EnhancedRequest) => Promise<NextResponse<T | ErrorResponse>>,
  newEndpoint: string,
): (request: EnhancedRequest) => Promise<NextResponse<T | ErrorResponse>> {
  return async (request: EnhancedRequest) => {
    const response = await handler(request)

    // Add deprecation warning header
    response.headers.set(
      "X-Deprecation-Warning",
      `This endpoint is deprecated. Please use ${newEndpoint} instead.`,
    )
    response.headers.set("Deprecation", "true")

    return response
  }
}
