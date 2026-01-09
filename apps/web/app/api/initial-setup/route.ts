import { NextResponse } from "next/server"
import { User } from "@tasktrove/types/core"
import { InitialSetupResponse } from "@tasktrove/types/api-responses"
import { ErrorResponse } from "@tasktrove/types/api-responses"
import { safeReadDataFile, safeWriteDataFile } from "@/lib/utils/safe-file-operations"
import {
  withApiLogging,
  withFileOperationLogging,
  withPerformanceLogging,
  type EnhancedRequest,
} from "@/lib/middleware/api-logger"
import { withMutexProtection } from "@/lib/utils/api-mutex"
import { initializeDataFileIfNeeded } from "@/lib/utils/data-initialization"
import { runInitialSetup } from "@/lib/utils/initial-setup"

/**
 * POST /api/(auth)/initial-setup
 *
 * Sets up initial password for new users. Only works when no password is currently set.
 * This endpoint will be made public to allow first-time setup without authentication.
 */
async function initialSetup(
  request: EnhancedRequest,
): Promise<NextResponse<InitialSetupResponse | ErrorResponse>> {
  type SafeDataFile = NonNullable<Awaited<ReturnType<typeof safeReadDataFile>>>

  return runInitialSetup<SafeDataFile>({
    request,
    readData: () =>
      withFileOperationLogging(
        async () => (await safeReadDataFile()) ?? null,
        "read-data-file",
        request.context,
      ),
    initializeIfNeeded: () => initializeDataFileIfNeeded(),
    isPasswordSet: (fileData) => fileData.user.password !== "",
    buildUpdatedData: (fileData, { passwordHash, username }) => {
      const updatedUser: User = {
        ...fileData.user,
        ...(username && { username }),
        password: passwordHash,
      }

      return {
        updatedData: {
          ...fileData,
          user: updatedUser,
        },
        logEvent: {
          username: updatedUser.username,
        },
      }
    },
    writeData: (updatedFileData) =>
      withPerformanceLogging(
        () => safeWriteDataFile({ data: updatedFileData }),
        "write-data-file",
        request.context,
        500,
      ),
    passwordAlreadySetMessage: "Initial setup is only allowed when no password is currently set",
  })
}

export const POST = withMutexProtection(
  withApiLogging(initialSetup, {
    endpoint: "/api/(auth)/initial-setup",
    module: "api-auth-initial-setup",
  }),
)
