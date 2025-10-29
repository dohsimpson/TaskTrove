import { NextResponse } from "next/server"
import { checkDataFile } from "@/lib/startup-checks"
import { isValidOrigin } from "@/lib/utils/origin-validation"
import { withMutexProtection } from "@/lib/utils/api-mutex"
import { withApiVersion } from "@/lib/middleware/api-version"
import { writeInitialDataFile } from "@/lib/utils/data-initialization"
import { withApiLogging, type EnhancedRequest } from "@/lib/middleware/api-logger"
import { ApiErrorCode, ErrorResponse, API_ROUTES } from "@/lib/types"
import { DataInitializeRequestSchema } from "@tasktrove/types/api-requests"
import { validateRequestBody, createErrorResponse } from "@/lib/utils/validation"

async function initializeData(request: EnhancedRequest) {
  // Validate origin first
  const origin = request.headers.get("origin")
  const referer = request.headers.get("referer")
  const host = request.headers.get("host")

  if (!isValidOrigin(origin, referer, host)) {
    const errorResponse: ErrorResponse = {
      code: ApiErrorCode.INVALID_ORIGIN,
      error: "Forbidden",
      message: "Invalid request origin",
    }
    return NextResponse.json<ErrorResponse>(errorResponse, { status: 403 })
  }

  // Validate request body
  const validation = await validateRequestBody(request, DataInitializeRequestSchema)
  if (!validation.success) {
    return validation.error
  }

  const { authSecret } = validation.data

  // Verify AUTH_SECRET if it's configured
  const configuredAuthSecret = process.env.AUTH_SECRET
  if (configuredAuthSecret) {
    // If AUTH_SECRET is set, require it to match
    if (authSecret !== configuredAuthSecret) {
      return createErrorResponse(
        "Invalid authentication secret",
        "The provided authentication secret does not match the configured AUTH_SECRET",
        403,
        ApiErrorCode.AUTHENTICATION_REQUIRED,
      )
    }
  }
  // If no AUTH_SECRET is configured, allow initialization without secret

  try {
    // Check if data file already exists
    const dataFileCheck = await checkDataFile()

    if (dataFileCheck.exists) {
      const errorResponse: ErrorResponse = {
        code: ApiErrorCode.INITIALIZATION_FORBIDDEN,
        error: "Data file already exists",
        message: "Data file initialization is only allowed when no existing data file is present",
      }
      return NextResponse.json<ErrorResponse>(errorResponse, { status: 400 })
    }

    // Initialize with tutorial data
    await writeInitialDataFile()

    return NextResponse.json({
      status: "success",
      message: "Data file initialized successfully",
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error("Failed to initialize data file:", errorMessage)

    const errorResponse: ErrorResponse = {
      code: ApiErrorCode.INITIALIZATION_FAILED,
      error: "Failed to initialize data file",
      message: errorMessage,
    }
    return NextResponse.json<ErrorResponse>(errorResponse, { status: 500 })
  }
}

export const POST = withApiVersion(
  withMutexProtection(
    withApiLogging(initializeData, {
      endpoint: API_ROUTES.DATA_INITIALIZE,
      module: "api-v1-data-initialize",
    }),
  ),
)
