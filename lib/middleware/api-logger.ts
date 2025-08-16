/**
 * API Logging Middleware
 *
 * Provides centralized request/response logging for API routes.
 * Automatically handles request timing, error logging, and consistent formatting.
 */

import { NextRequest, NextResponse } from "next/server"
import { log } from "@/lib/utils/logger"
import { v4 as uuidv4 } from "uuid"

/**
 * Request context that gets passed through the middleware chain
 */
export interface RequestContext {
  requestId: string
  startTime: number
  method: string
  endpoint: string
}

/**
 * Enhanced request object with context
 */
export interface EnhancedRequest extends NextRequest {
  context?: RequestContext
}

/**
 * Type for API route handlers
 */
export type ApiHandler = (request: EnhancedRequest) => Promise<NextResponse>

/**
 * Configuration options for the logging middleware
 */
export interface LoggingOptions {
  /** Override the endpoint name for logging */
  endpoint?: string
  /** Module name for logging context */
  module?: string
  /** Whether to log request body (be careful with sensitive data) */
  logRequestBody?: boolean
  /** Whether to log response body (be careful with large responses) */
  logResponseBody?: boolean
  /** Custom fields to add to all log entries */
  customFields?: Record<string, unknown>
}

/**
 * Wraps an API route handler with comprehensive logging
 */
export function withApiLogging(handler: ApiHandler, options: LoggingOptions = {}): ApiHandler {
  return async (request: EnhancedRequest) => {
    const requestId = uuidv4()
    const startTime = Date.now()
    const method = request.method || "UNKNOWN"
    const endpoint = options.endpoint || extractEndpointFromUrl(request.url)
    const moduleContext = options.module || "api"

    // Add context to request for use in handlers
    request.context = {
      requestId,
      startTime,
      method,
      endpoint,
    }

    const baseLogContext = {
      method,
      endpoint,
      requestId,
      module: moduleContext,
      ...options.customFields,
    }

    // Log request start
    const requestLogContext = {
      ...baseLogContext,
      contentType: request.headers.get("content-type"),
      userAgent: request.headers.get("user-agent"),
      ...(options.logRequestBody && { requestBody: await safeGetRequestBody(request) }),
    }

    log.info(requestLogContext, "API request received")

    try {
      // Execute the handler
      const response = await handler(request)
      const duration = Date.now() - startTime

      // Log successful response
      const responseLogContext = {
        ...baseLogContext,
        statusCode: response.status,
        responseTime: duration,
        ...(options.logResponseBody && { responseBody: await safeGetResponseBody(response) }),
      }

      log.info(responseLogContext, "API request completed successfully")

      // Add request ID to response headers for traceability
      response.headers.set("X-Request-ID", requestId)

      return response
    } catch (error) {
      const duration = Date.now() - startTime

      // Log error response
      const errorLogContext = {
        ...baseLogContext,
        responseTime: duration,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        errorType: error instanceof Error ? error.constructor.name : "Unknown",
      }

      log.error(errorLogContext, "API request failed with error")

      // Re-throw to let Next.js handle the error response
      throw error
    }
  }
}

/**
 * Middleware specifically for file operations with enhanced logging
 */
export function withFileOperationLogging<T>(
  operation: () => Promise<T>,
  operationName: string,
  context: Partial<RequestContext> = {},
): Promise<T> {
  return new Promise(async (resolve, reject) => {
    const startTime = Date.now()
    const logContext = {
      operation: operationName,
      requestId: context.requestId,
      module: "api-file-ops",
    }

    log.debug(logContext, `Starting file operation: ${operationName}`)

    try {
      const result = await operation()
      const duration = Date.now() - startTime

      log.info(
        {
          ...logContext,
          duration,
          success: true,
        },
        `File operation completed: ${operationName}`,
      )

      resolve(result)
    } catch (error) {
      const duration = Date.now() - startTime

      log.error(
        {
          ...logContext,
          duration,
          error: error instanceof Error ? error.message : String(error),
          success: false,
        },
        `File operation failed: ${operationName}`,
      )

      reject(error)
    }
  })
}

/**
 * Logs business events with consistent formatting
 */
export function logBusinessEvent(
  event: string,
  data: Record<string, unknown>,
  context?: Partial<RequestContext>,
): void {
  const logContext = {
    event,
    requestId: context?.requestId,
    module: "api-business",
    ...data,
  }

  log.info(logContext, `Business event: ${event}`)
}

/**
 * Logs security events with enhanced details
 */
export function logSecurityEvent(
  event: string,
  severity: "low" | "medium" | "high" | "critical",
  details: Record<string, unknown>,
  context?: Partial<RequestContext>,
): void {
  const logContext = {
    securityEvent: event,
    severity,
    requestId: context?.requestId,
    endpoint: context?.endpoint,
    module: "api-security",
    timestamp: new Date().toISOString(),
    ...details,
  }

  const logMethod = severity === "critical" || severity === "high" ? log.error : log.warn
  logMethod(logContext, `Security event: ${event}`)
}

/**
 * Performance monitoring wrapper for operations
 */
export function withPerformanceLogging<T>(
  operation: () => Promise<T>,
  operationName: string,
  context?: Partial<RequestContext>,
  thresholdMs: number = 1000,
): Promise<T> {
  return new Promise(async (resolve, reject) => {
    const startTime = Date.now()

    try {
      const result = await operation()
      const duration = Date.now() - startTime

      const logContext = {
        operation: operationName,
        duration,
        requestId: context?.requestId,
        module: "api-performance",
        slow: duration > thresholdMs,
      }

      if (duration > thresholdMs) {
        log.warn(logContext, `Slow operation detected: ${operationName}`)
      } else {
        log.debug(logContext, `Operation completed: ${operationName}`)
      }

      resolve(result)
    } catch (error) {
      const duration = Date.now() - startTime

      log.error(
        {
          operation: operationName,
          duration,
          requestId: context?.requestId,
          module: "api-performance",
          error: error instanceof Error ? error.message : String(error),
        },
        `Operation failed: ${operationName}`,
      )

      reject(error)
    }
  })
}

// Helper functions

/**
 * Extracts endpoint name from URL for logging
 */
function extractEndpointFromUrl(url: string): string {
  try {
    const urlObj = new URL(url)
    return urlObj.pathname
  } catch {
    return url || "unknown"
  }
}

/**
 * Safely gets request body for logging (with size limits)
 */
async function safeGetRequestBody(request: NextRequest): Promise<unknown> {
  try {
    const contentType = request.headers.get("content-type")
    if (!contentType?.includes("application/json")) {
      return "[Non-JSON Body]"
    }

    // Clone the request to avoid consuming the original body
    const cloned = request.clone()
    const text = await cloned.text()

    // Limit body size for logging
    if (text.length > 1000) {
      return "[Large Body - Truncated]"
    }

    return JSON.parse(text)
  } catch {
    return "[Unable to parse body]"
  }
}

/**
 * Safely gets response body for logging (with size limits)
 */
async function safeGetResponseBody(response: NextResponse): Promise<unknown> {
  try {
    const contentType = response.headers.get("content-type")
    if (!contentType?.includes("application/json")) {
      return "[Non-JSON Response]"
    }

    // Clone the response to avoid consuming the original body
    const cloned = response.clone()
    const text = await cloned.text()

    // Limit body size for logging
    if (text.length > 1000) {
      return "[Large Response - Truncated]"
    }

    return JSON.parse(text)
  } catch {
    return "[Unable to parse response]"
  }
}
