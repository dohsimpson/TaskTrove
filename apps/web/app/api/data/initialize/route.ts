import { NextResponse } from "next/server"
import { checkDataFile } from "@/lib/startup-checks"
import { isValidOrigin } from "@/lib/utils/origin-validation"
import { withMutexProtection } from "@/lib/utils/api-mutex"
import { writeInitialDataFile } from "@/lib/utils/data-initialization"
import { withApiLogging, type EnhancedRequest } from "@/lib/middleware/api-logger"
import { ApiErrorCode, ErrorResponse } from "@/lib/types"

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

export const POST = withMutexProtection(
  withApiLogging(initializeData, {
    endpoint: "/api/data/initialize",
    module: "api-data-initialize",
  }),
)
