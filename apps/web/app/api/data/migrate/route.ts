import { NextResponse } from "next/server"
import { promises as fs } from "fs"
import { DEFAULT_DATA_FILE_PATH } from "@tasktrove/constants"
import { migrateDataFile } from "@/lib/utils/data-migration"
import { withMutexProtection } from "@/lib/utils/api-mutex"
import { safeWriteDataFile } from "@/lib/utils/safe-file-operations"
import type { Json } from "@/lib/types"

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
    return NextResponse.json(
      {
        success: false,
        message: `Migration failed: ${error instanceof Error ? error.message : String(error)}`,
      },
      { status: 500 },
    )
  }
}

export const POST = withMutexProtection(migrateData)
