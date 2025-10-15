import { NextResponse } from "next/server"
import {
  User,
  UserSerializationSchema,
  UpdateUserRequestSchema,
  UpdateUserResponse,
  ErrorResponse,
  ApiErrorCode,
  GetUserResponse,
  DataFileSerializationSchema,
} from "@/lib/types"
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
import { withAuthentication } from "@/lib/middleware/auth"
import { withApiVersion } from "@/lib/middleware/api-version"
import {
  processAvatarUpdate,
  processPasswordUpdate,
  processApiTokenUpdate,
} from "@/lib/utils/user-update-helpers"
import { clearNullValues } from "@tasktrove/utils"

/**
 * GET /api/user
 *
 * Fetches only user data with metadata.
 * Returns user object with count, timestamp, and version information.
 */
async function getUser(
  request: EnhancedRequest,
): Promise<NextResponse<GetUserResponse | ErrorResponse>> {
  const fileData = await withFileOperationLogging(
    () => safeReadDataFile(),
    "read-data-file",
    request.context,
  )

  if (!fileData) {
    return createErrorResponse(
      "Failed to read data file",
      "File reading or validation failed",
      500,
      ApiErrorCode.DATA_FILE_READ_ERROR,
    )
  }

  const dataSerializationResult = DataFileSerializationSchema.safeParse(fileData)
  if (!dataSerializationResult.success) {
    return createErrorResponse(
      "Failed to serialize data file",
      "Serialization failed",
      500,
      ApiErrorCode.DATA_FILE_VALIDATION_ERROR,
    )
  }

  const serializedData = dataSerializationResult.data

  const serializationResult = UserSerializationSchema.safeParse(serializedData.user)
  if (!serializationResult.success) {
    return createErrorResponse(
      "Failed to serialize user data",
      "Serialization failed",
      500,
      ApiErrorCode.DATA_FILE_VALIDATION_ERROR,
    )
  }

  const serializedUser = serializationResult.data

  logBusinessEvent(
    "user_fetched",
    {
      username: serializedUser.username,
    },
    request.context,
  )

  // Build response with only user and metadata
  const response: GetUserResponse = {
    user: serializedUser,
    meta: {
      count: 1, // One user object
      timestamp: new Date().toISOString(),
      version: serializedData.version || "v0.7.0",
    },
  }

  return NextResponse.json<GetUserResponse>(response, {
    headers: {
      "Cache-Control": "no-cache, no-store, must-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    },
  })
}

export const GET = withApiVersion(
  withMutexProtection(
    withAuthentication(
      withApiLogging(getUser, {
        endpoint: "/api/user",
        module: "api-v1-user",
      }),
    ),
  ),
)

/**
 * PATCH /api/user
 *
 * Updates user data by merging provided data with existing user.
 * Supports partial updates for username, password, and avatar.
 */
async function updateUser(
  request: EnhancedRequest,
): Promise<NextResponse<UpdateUserResponse | ErrorResponse>> {
  // Validate request body
  const validation = await validateRequestBody(request, UpdateUserRequestSchema)
  if (!validation.success) {
    return validation.error
  }

  const partialUser = validation.data

  // Process avatar update
  const avatarResult = await processAvatarUpdate(partialUser.avatar)
  if (!avatarResult.success) {
    return createErrorResponse(
      avatarResult.error,
      avatarResult.error,
      avatarResult.code || 500,
      ApiErrorCode.DATA_FILE_WRITE_ERROR,
    )
  }
  const avatarPath = avatarResult.avatarPath

  // Process password update
  const passwordResult = processPasswordUpdate(partialUser.password)
  if (!passwordResult.success) {
    return createErrorResponse(
      passwordResult.error,
      passwordResult.error,
      500,
      ApiErrorCode.INTERNAL_SERVER_ERROR,
    )
  }
  if (passwordResult.hashedPassword) {
    partialUser.password = passwordResult.hashedPassword
  }

  // Read current data file
  const fileData = await withFileOperationLogging(
    () => safeReadDataFile(),
    "read-data-file",
    request.context,
  )

  if (!fileData) {
    return createErrorResponse(
      "Failed to read data file",
      "File reading failed",
      500,
      ApiErrorCode.DATA_FILE_READ_ERROR,
    )
  }

  // Merge partial user data with current user data, preserving required fields
  // Use processed avatar path if avatar was updated, otherwise keep existing avatar
  const updatedUser = {
    ...fileData.user,
    ...Object.fromEntries(
      Object.entries(partialUser).filter(([key]) => key !== "avatar" && key !== "apiToken"),
    ),
  }

  // Handle avatar update separately (convert null to undefined)
  if (avatarPath !== undefined) {
    updatedUser.avatar = avatarPath === null ? undefined : avatarPath
  }

  // Handle apiToken update separately (convert null to undefined)
  const processedApiToken = processApiTokenUpdate(partialUser.apiToken, "apiToken" in partialUser)
  if (processedApiToken !== undefined) {
    updatedUser.apiToken = processedApiToken === null ? undefined : processedApiToken
  }

  // Clean null values and ensure required fields are present
  // For password: if not provided, preserve existing password (password is required)
  const cleanedUser: User = clearNullValues({
    ...updatedUser,
    password: updatedUser.password || fileData.user.password,
  })

  // Update the data file with new user data
  const updatedFileData = {
    ...fileData,
    user: cleanedUser,
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
    "user_updated",
    {
      username: cleanedUser.username,
      fieldsUpdated: Object.keys(partialUser),
    },
    request.context,
  )

  const response: UpdateUserResponse = {
    success: true,
    user: cleanedUser,
    message: "User updated successfully",
  }

  return NextResponse.json<UpdateUserResponse>(response)
}

export const PATCH = withApiVersion(
  withMutexProtection(
    withAuthentication(
      withApiLogging(updateUser, {
        endpoint: "/api/user",
        module: "api-v1-user",
      }),
    ),
  ),
)
