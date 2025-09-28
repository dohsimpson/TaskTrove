import { NextResponse } from "next/server"
import {
  User,
  UserSerializationSchema,
  UpdateUserRequestSchema,
  UpdateUserResponse,
  ErrorResponse,
} from "@/lib/types"
import { validateRequestBody, createErrorResponse } from "@/lib/utils/validation"
import {
  safeReadDataFile,
  safeWriteDataFile,
  saveBase64ToAvatarFile,
} from "@/lib/utils/safe-file-operations"
import {
  withApiLogging,
  logBusinessEvent,
  withFileOperationLogging,
  withPerformanceLogging,
  type EnhancedRequest,
} from "@/lib/middleware/api-logger"
import { withMutexProtection } from "@/lib/utils/api-mutex"
import { saltAndHashPassword, parseAvatarDataUrl } from "@tasktrove/utils"

/**
 * GET /api/user
 *
 * Fetches the current user data from data.json file.
 * Returns the user object.
 */
async function getUser(request: EnhancedRequest): Promise<NextResponse<User | ErrorResponse>> {
  const fileData = await withFileOperationLogging(
    () => safeReadDataFile(),
    "read-data-file",
    request.context,
  )

  if (!fileData) {
    return createErrorResponse("Failed to read data file", "File reading or validation failed", 500)
  }

  logBusinessEvent(
    "user_fetched",
    {
      username: fileData.user.username,
    },
    request.context,
  )

  const serializationResult = UserSerializationSchema.safeParse(fileData.user)
  if (!serializationResult.success) {
    return createErrorResponse("Failed to serialize user data", "Serialization failed", 500)
  }

  const serializedUser = serializationResult.data

  return NextResponse.json<User>(serializedUser, {
    headers: {
      "Cache-Control": "no-cache, no-store, must-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    },
  })
}

export const GET = withMutexProtection(
  withApiLogging(getUser, {
    endpoint: "/api/user",
    module: "api-user",
  }),
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

  // Process avatar if provided (base64 data URL)
  let avatarPath: string | undefined | null = undefined
  if (partialUser.avatar !== undefined) {
    if (partialUser.avatar === null) {
      // User wants to remove avatar
      avatarPath = null
    } else {
      try {
        // Parse data URL to extract MIME type and base64 data using utility function
        const parsed = parseAvatarDataUrl(partialUser.avatar)
        if (!parsed) {
          return createErrorResponse(
            "Invalid avatar format",
            "Avatar must be a valid data URL",
            400,
          )
        }

        const { mimeType, base64Data } = parsed

        // Save base64 data to file
        avatarPath = await saveBase64ToAvatarFile(base64Data, mimeType)
        if (!avatarPath) {
          return createErrorResponse("Failed to save avatar", "Avatar processing failed", 500)
        }
      } catch {
        return createErrorResponse("Failed to process avatar", "Avatar processing failed", 500)
      }
    }
  }

  // Hash password if provided
  if (partialUser.password && partialUser.password.length > 0) {
    try {
      partialUser.password = saltAndHashPassword(partialUser.password)
    } catch (error) {
      return createErrorResponse("Failed to hash password", "Password hashing failed", 500)
    }
  }

  // Read current data file
  const fileData = await withFileOperationLogging(
    () => safeReadDataFile(),
    "read-data-file",
    request.context,
  )

  if (!fileData) {
    return createErrorResponse("Failed to read data file", "File reading failed", 500)
  }

  // Merge partial user data with current user data, preserving required fields
  // Use processed avatar path if avatar was updated, otherwise keep existing avatar
  const updatedUser = {
    ...fileData.user,
    ...Object.fromEntries(Object.entries(partialUser).filter(([key]) => key !== "avatar")),
  }

  // Handle avatar update separately
  if (avatarPath !== undefined) {
    if (avatarPath === null) {
      updatedUser.avatar = undefined // Remove avatar
    } else {
      updatedUser.avatar = avatarPath // Set new avatar path
    }
  }

  // Clean null values and ensure required fields are present
  // For password: if not provided, preserve existing password (password is required)
  const cleanedUser: User = {
    ...updatedUser,
    password: updatedUser.password || fileData.user.password,
  }

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
    return createErrorResponse("Failed to save data", "File writing failed", 500)
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

export const PATCH = withMutexProtection(
  withApiLogging(updateUser, {
    endpoint: "/api/user",
    module: "api-user",
  }),
)
