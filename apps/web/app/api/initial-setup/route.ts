import { NextResponse } from "next/server"
import {
  User,
  InitialSetupResponse,
  ErrorResponse,
  InitialSetupRequestSchema,
  ApiErrorCode,
} from "@tasktrove/types"
import { validateRequestBody, createErrorResponse } from "@/lib/utils/validation"
import { safeReadDataFile, safeWriteDataFile } from "@/lib/utils/safe-file-operations"
import {
  withApiLogging,
  logBusinessEvent,
  withFileOperationLogging,
  withPerformanceLogging,
  type EnhancedRequest,
} from "@/lib/middleware/api-logger"
import { withMutexProtection } from "@/lib/utils/api-mutex"
import { saltAndHashPassword } from "@tasktrove/utils"
import { initializeDataFileIfNeeded } from "@/lib/utils/data-initialization"

/**
 * POST /api/(auth)/initial-setup
 *
 * Sets up initial password for new users. Only works when no password is currently set.
 * This endpoint will be made public to allow first-time setup without authentication.
 */
async function initialSetup(
  request: EnhancedRequest,
): Promise<NextResponse<InitialSetupResponse | ErrorResponse>> {
  // Validate request body
  const validation = await validateRequestBody(request, InitialSetupRequestSchema)
  if (!validation.success) {
    return validation.error
  }

  const { password } = validation.data

  // Read current data file to check existing password
  let fileData = await withFileOperationLogging(
    () => safeReadDataFile(),
    "read-data-file",
    request.context,
  )

  // If data file read failed, try to initialize it and read again
  if (!fileData) {
    const initSuccess = await initializeDataFileIfNeeded()
    if (!initSuccess) {
      return createErrorResponse(
        "Failed to initialize data file",
        "Data file initialization failed",
        500,
      )
    }

    // Retry reading the data file after initialization
    fileData = await withFileOperationLogging(
      () => safeReadDataFile(),
      "read-data-file-retry",
      request.context,
    )

    if (!fileData) {
      return createErrorResponse(
        "Failed to read data file after initialization",
        "File reading failed after initialization",
        500,
      )
    }
  }

  // Check if password is already set - only allow initial setup if password is empty
  if (fileData.user.password !== "") {
    return createErrorResponse(
      "Password already set",
      "Initial setup is only allowed when no password is currently set",
      409, // Conflict
    )
  }

  // Hash the password
  let hashedPassword: string
  try {
    hashedPassword = saltAndHashPassword(password)
  } catch {
    return createErrorResponse(
      "Failed to hash password",
      "Password hashing failed",
      500,
      ApiErrorCode.INTERNAL_SERVER_ERROR,
    )
  }

  // Update user with the new password (keeping existing username and avatar)
  const updatedUser: User = {
    ...fileData.user,
    password: hashedPassword,
  }

  // Update the data file with new user data
  const updatedFileData = {
    ...fileData,
    user: updatedUser,
  }

  // Write updated data to file
  const writeSuccess = await withPerformanceLogging(
    () => safeWriteDataFile({ data: updatedFileData }),
    "write-data-file",
    request.context,
    500, // 500ms threshold for slow file writes
  )

  if (!writeSuccess) {
    return createErrorResponse(
      "Failed to save data",
      "File writing failed",
      500,
      ApiErrorCode.DATA_FILE_WRITE_ERROR,
    )
  }

  logBusinessEvent(
    "initial_setup_completed",
    {
      username: updatedUser.username,
    },
    request.context,
  )

  const response: InitialSetupResponse = {
    success: true,
    user: updatedUser,
  }

  return NextResponse.json(response)
}

export const POST = withMutexProtection(
  withApiLogging(initialSetup, {
    endpoint: "/api/(auth)/initial-setup",
    module: "api-auth-initial-setup",
  }),
)
