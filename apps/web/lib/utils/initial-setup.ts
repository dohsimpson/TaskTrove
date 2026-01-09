import { NextResponse } from "next/server"
import { InitialSetupRequestSchema } from "@tasktrove/types/api-requests"
import { InitialSetupResponse } from "@tasktrove/types/api-responses"
import { ErrorResponse } from "@tasktrove/types/api-responses"
import { ApiErrorCode } from "@tasktrove/types/api-errors"
import { validateRequestBody, createErrorResponse } from "@/lib/utils/validation"
import { logBusinessEvent, type EnhancedRequest } from "@/lib/middleware/api-logger"
import { saltAndHashPassword } from "@tasktrove/utils"

type InitialSetupResult<T> = {
  updatedData: T
  logEvent?: Record<string, unknown>
}

type InitialSetupHandlerOptions<T> = {
  request: EnhancedRequest
  readData: () => Promise<T | null>
  initializeIfNeeded?: () => Promise<boolean>
  isPasswordSet: (data: T) => boolean
  buildUpdatedData: (
    data: T,
    args: { passwordHash: string; username?: string },
  ) => InitialSetupResult<T>
  writeData: (data: T) => Promise<boolean>
  passwordAlreadySetMessage: string
}

export async function runInitialSetup<T>(
  options: InitialSetupHandlerOptions<T>,
): Promise<NextResponse<InitialSetupResponse | ErrorResponse>> {
  const { request } = options

  const validation = await validateRequestBody(request, InitialSetupRequestSchema)
  if (!validation.success) {
    return validation.error
  }

  const { password, username } = validation.data

  let fileData = await options.readData()
  if (!fileData && options.initializeIfNeeded) {
    const initSuccess = await options.initializeIfNeeded()
    if (!initSuccess) {
      return createErrorResponse(
        "Failed to initialize data file",
        "Data file initialization failed",
        500,
      )
    }

    fileData = await options.readData()
    if (!fileData) {
      return createErrorResponse(
        "Failed to read data file after initialization",
        "File reading failed after initialization",
        500,
      )
    }
  }

  if (!fileData) {
    return createErrorResponse("Failed to read data file", "File reading failed", 500)
  }

  if (options.isPasswordSet(fileData)) {
    return createErrorResponse("Password already set", options.passwordAlreadySetMessage, 409)
  }

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

  const { updatedData, logEvent } = options.buildUpdatedData(fileData, {
    passwordHash: hashedPassword,
    username,
  })

  const writeSuccess = await options.writeData(updatedData)
  if (!writeSuccess) {
    return createErrorResponse(
      "Failed to save data",
      "File writing failed",
      500,
      ApiErrorCode.DATA_FILE_WRITE_ERROR,
    )
  }

  logBusinessEvent("initial_setup_completed", logEvent ?? { username }, request.context)

  return NextResponse.json({ success: true })
}
