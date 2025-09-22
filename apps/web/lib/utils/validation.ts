/**
 * Validation utilities for API endpoints
 *
 * This module provides validation helpers that use Zod schemas to validate
 * API requests and provide consistent error responses.
 */

import { z } from "zod"
import { NextResponse } from "next/server"
import { ErrorResponse, Task, UpdateTaskRequest, CreateTaskRequest } from "@/lib/types"

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
      const errorResponse: ErrorResponse = {
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
 * Formats Zod validation errors into a readable string
 */
function formatZodErrors(error: z.ZodError): string {
  return error.issues
    .map((err: z.ZodIssue) => {
      const path = err.path.length > 0 ? `${err.path.join(".")}: ` : ""
      return `${path}${err.message}`
    })
    .join("; ")
}

/**
 * Creates a standardized error response
 */
export function createErrorResponse(
  error: string,
  message: string,
  status: number = 500,
  additionalData?: Record<string, unknown>,
): NextResponse<ErrorResponse> {
  const errorResponse: ErrorResponse = {
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

/**
 * Normalizes null values to undefined for API consistency
 * This function converts null values for specific task fields to undefined
 * to match the backend API behavior and ensure optimistic updates align with server responses
 */
export function normalizeTaskUpdate<T extends Task | CreateTaskRequest | UpdateTaskRequest>(
  task: T,
): T {
  return {
    ...task,
    dueDate: task.dueDate === null ? undefined : task.dueDate,
    dueTime: task.dueTime === null ? undefined : task.dueTime,
    recurring: task.recurring === null ? undefined : task.recurring,
  }
}
