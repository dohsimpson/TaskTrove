/**
 * Middleware Composition Utility
 *
 * Provides utilities to compose multiple middleware functions in a clean,
 * type-safe way. This allows for consistent application of middleware
 * across all API routes.
 */

import type { NextRequest, NextResponse } from "next/server"
import type { EnhancedRequest } from "@/lib/middleware/api-logger"

/**
 * Middleware function type - accepts a request and returns a promise of NextResponse
 */
export type Middleware = (request: NextRequest | EnhancedRequest) => Promise<NextResponse>

/**
 * Middleware wrapper type - accepts a handler and returns a middleware function
 */
export type MiddlewareWrapper = (handler: Middleware) => Middleware

/**
 * Composes multiple middleware wrappers into a single wrapper function.
 * Middleware are applied from left to right (first argument wraps outermost).
 *
 * @example
 * ```typescript
 * // Apply mutex protection first (outermost), then logging (inner)
 * export const POST = composeMiddleware(
 *   withMutexProtection,
 *   withApiLogging(handler, { endpoint: "/api/resource", module: "api-resource" })
 * )
 * ```
 *
 * @param middlewares - Variable number of middleware wrapper functions
 * @returns A composed middleware function
 */
export function composeMiddleware(...middlewares: MiddlewareWrapper[]): MiddlewareWrapper {
  return (handler: Middleware): Middleware => {
    // Apply middleware from right to left (innermost first)
    // This ensures the leftmost middleware wraps all others
    return middlewares.reduceRight(
      (composedHandler, middleware) => middleware(composedHandler),
      handler,
    )
  }
}
