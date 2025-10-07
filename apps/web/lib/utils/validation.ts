/**
 * Validation utilities for API endpoints
 *
 * This module provides validation helpers that use Zod schemas to validate
 * API requests and provide consistent error responses.
 */

import { z } from "zod"
import { NextResponse } from "next/server"
import { ErrorResponse, ApiErrorCode } from "@/lib/types"
import { formatZodErrors } from "@tasktrove/utils/validation"

// Re-export pure validation utilities from @tasktrove/utils package
export {
  shouldTaskBeInInbox,
  formatZodErrors,
  normalizeTaskUpdate,
} from "@tasktrove/utils/validation"

/**
 * Validation result type
 */
export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; error: NextResponse<ErrorResponse> }

/**
 * Validates request body against a Zod schema
 * Returns validated data or a NextResponse with validation errors
 */
export async function validateRequestBody<T>(
  request: Request,
  schema: z.ZodSchema<T>,
): Promise<ValidationResult<T>> {
  try {
    const body = await request.json()
    const result = schema.safeParse(body)

    if (!result.success) {
      // Use the pure formatZodErrors function from @tasktrove/utils
      const { formatZodErrors } = await import("@tasktrove/utils/validation")
      const errorResponse: ErrorResponse = {
        code: ApiErrorCode.VALIDATION_ERROR,
        error: "Validation failed",
        message: formatZodErrors(result.error),
      }

      return {
        success: false,
        error: NextResponse.json(errorResponse, { status: 400 }),
      }
    }

    return {
      success: true,
      data: result.data,
    }
  } catch (parseError) {
    const errorResponse: ErrorResponse = {
      code: ApiErrorCode.INVALID_REQUEST_BODY,
      error: "Invalid JSON in request body",
      message: parseError instanceof Error ? parseError.message : "Unknown parsing error",
    }

    return {
      success: false,
      error: NextResponse.json(errorResponse, { status: 400 }),
    }
  }
}

/**
 * Validates data against a Zod schema
 * Returns validated data or formatted error message
 */
export function validateData<T>(data: unknown, schema: z.ZodSchema<T>): ValidationResult<T> {
  const result = schema.safeParse(data)

  if (!result.success) {
    const errorResponse: ErrorResponse = {
      code: ApiErrorCode.VALIDATION_ERROR,
      error: "Validation failed",
      message: formatZodErrors(result.error),
    }

    return {
      success: false,
      error: NextResponse.json(errorResponse, { status: 400 }),
    }
  }

  return {
    success: true,
    data: result.data,
  }
}

/**
 * Creates a standardized error response
 *
 * @param error - Human-readable error title
 * @param message - Detailed error message
 * @param status - HTTP status code (default: 500)
 * @param code - Machine-readable error code (default: INTERNAL_SERVER_ERROR)
 * @param additionalData - Optional additional error context
 * @returns NextResponse with typed ErrorResponse
 */
export function createErrorResponse(
  error: string,
  message: string,
  status: number = 500,
  code: ApiErrorCode = ApiErrorCode.INTERNAL_SERVER_ERROR,
  additionalData?: Record<string, unknown>,
): NextResponse<ErrorResponse> {
  const errorResponse: ErrorResponse = {
    code,
    error,
    message,
    ...additionalData,
  }

  return NextResponse.json<ErrorResponse>(errorResponse, { status })
}

/**
 * Creates a standardized success response
 */
export function createSuccessResponse<T>(
  data: T,
  message?: string,
  meta?: Record<string, unknown>,
): NextResponse {
  const response = {
    success: true,
    ...(message && { message }),
    ...(meta && { meta: { timestamp: new Date().toISOString(), ...meta } }),
    ...data,
  }

  return NextResponse.json(response, {
    headers: {
      "Cache-Control": "no-cache, no-store, must-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    },
  })
}
