import { NextResponse } from "next/server"
import { promises as fs } from "fs"
import { DEFAULT_DATA_FILE_PATH } from "@tasktrove/constants"
import { migrateDataFile } from "@/lib/utils/data-migration"
import { withMutexProtection } from "@/lib/utils/api-mutex"
import { withAuthentication } from "@/lib/middleware/auth"
import { withApiVersion } from "@/lib/middleware/api-version"
import { withApiLogging } from "@/lib/middleware/api-logger"
import { safeWriteDataFile } from "@/lib/utils/safe-file-operations"
import type { Json } from "@tasktrove/types/constants"
import type { ErrorResponse } from "@tasktrove/types/api-responses"
import { ApiErrorCode } from "@tasktrove/types/api-errors"
import { API_ROUTES } from "@tasktrove/types/constants"

async function migrateData() {
  try {
    // Read current data file
    const dataContent = await fs.readFile(DEFAULT_DATA_FILE_PATH, "utf8")
    const jsonData: Json = JSON.parse(dataContent)

    // Perform migration
    const migratedData = migrateDataFile(jsonData)

    // Backup original file
    const backupPath = DEFAULT_DATA_FILE_PATH + `.backup-${Date.now()}`
    await fs.writeFile(backupPath, dataContent)

    // Write migrated data using serialization
    const writeSuccess = await safeWriteDataFile({
      filePath: DEFAULT_DATA_FILE_PATH,
      data: migratedData,
    })

    if (!writeSuccess) {
      throw new Error("Failed to write migrated data file")
    }

    return NextResponse.json({
      success: true,
      message: "Data migration completed successfully",
      version: migratedData.version,
      backupPath: backupPath,
    })
  } catch (error) {
    console.error("Migration failed:", error)
    const errorResponse: ErrorResponse = {
      code: ApiErrorCode.MIGRATION_FAILED,
      error: "Migration failed",
      message: error instanceof Error ? error.message : String(error),
    }
    return NextResponse.json<ErrorResponse>(errorResponse, { status: 500 })
  }
}

export const POST = withApiVersion(
  withMutexProtection(
    withAuthentication(
      withApiLogging(migrateData, {
        endpoint: API_ROUTES.DATA_MIGRATE,
        module: "api-v1-data-migrate",
      }),
    ),
  ),
)
