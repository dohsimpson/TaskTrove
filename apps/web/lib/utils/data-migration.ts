import type { DataFile } from "@tasktrove/types/data-file"
import type { VersionString } from "@tasktrove/types/id"
import type { Json } from "@tasktrove/types/constants"
import { DataFileSchema } from "@tasktrove/types/data-file"
import { createVersionString } from "@tasktrove/types/id"
import { LATEST_DATA_VERSION } from "@tasktrove/types/schema-version"
import { getAppVersion } from "@/lib/utils/version"
import { isVersionLessThan } from "@tasktrove/utils/version"
import {
  MigrationStep,
  v080Migration,
  v0100Migration,
  v0110Migration,
  v0120Migration,
} from "@/lib/utils/data-migration-functions"

const MIN_SUPPORTED_VERSION = createVersionString("v0.8.0")

export const migrationFunctions: MigrationStep[] = [
  {
    version: createVersionString("v0.8.0"),
    migrate: v080Migration,
  },
  {
    version: createVersionString("v0.10.0"),
    migrate: v0100Migration,
  },
  {
    version: createVersionString("v0.11.0"),
    migrate: v0110Migration,
  },
  {
    version: createVersionString("v0.12.0"),
    migrate: v0120Migration,
  },
]

export function getRegisteredMigrationVersions(): VersionString[] {
  return migrationFunctions.map((step) => step.version)
}

export function getLatestAvailableMigration(): VersionString | null {
  return LATEST_DATA_VERSION
}

export function isUnsupportedVersion(currentVersion: VersionString, minSupported: VersionString) {
  return isVersionLessThan(currentVersion, minSupported)
}

function resolveDataFileVersion(record: Json): VersionString {
  if (
    typeof record !== "object" ||
    record === null ||
    Array.isArray(record) ||
    !("version" in record)
  ) {
    throw new Error("Record must be a JSON object with a version property")
  }

  const versionValue = record.version
  if (typeof versionValue !== "string" || versionValue.trim() === "") {
    throw new Error(
      `Data file is missing a version. Minimum supported version is ${MIN_SUPPORTED_VERSION}. Please ensure the file includes a valid version string (e.g., "v0.8.0").`,
    )
  }

  return createVersionString(versionValue)
}

export async function migrateDataFile(dataFile: Json): Promise<DataFile> {
  const latestAvailableMigration = getLatestAvailableMigration()
  const versionInfo = await getAppVersion()
  const target = latestAvailableMigration || createVersionString(`v${versionInfo.version}`)

  if (typeof dataFile !== "object" || dataFile === null || Array.isArray(dataFile)) {
    throw new Error("Data file must be a JSON object")
  }

  const originalData: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(dataFile)) {
    originalData[key] = value
  }

  const currentVersion = resolveDataFileVersion(dataFile)

  if (isVersionLessThan(currentVersion, MIN_SUPPORTED_VERSION)) {
    throw new Error(
      `Data file version ${currentVersion} is no longer supported. Minimum supported version is ${MIN_SUPPORTED_VERSION}. Please upgrade to TaskTrove v0.8.0 or newer before migrating.`,
    )
  }

  console.log(`Starting data migration from version ${currentVersion} with target ${target}`)

  const startIndex = migrationFunctions.findIndex((step) =>
    isVersionLessThan(currentVersion, step.version),
  )

  if (startIndex === -1) {
    console.log(`No migrations needed from ${currentVersion} to ${target}`)
    return DataFileSchema.parse(originalData)
  }

  let workingData = { ...originalData }

  try {
    for (let i = startIndex; i < migrationFunctions.length; i++) {
      const step = migrationFunctions[i]
      if (!step) {
        console.error(`Migration step at index ${i} is undefined`)
        continue
      }

      if (latestAvailableMigration && isVersionLessThan(target, step.version)) {
        break
      }

      console.log(`Applying migration to version ${step.version}...`)

      const inputData: Json = JSON.parse(JSON.stringify(workingData))
      const migratedData = step.migrate(inputData)

      if (
        typeof migratedData !== "object" ||
        migratedData === null ||
        Array.isArray(migratedData)
      ) {
        throw new Error(`Migration to ${step.version} returned invalid data structure`)
      }

      const newWorkingData: Record<string, unknown> = {}
      for (const [key, value] of Object.entries(migratedData)) {
        newWorkingData[key] = value
      }
      workingData = newWorkingData

      workingData.version = step.version
      console.log(`✓ Successfully migrated to version ${step.version}`)
    }

    const result = DataFileSchema.parse(workingData)
    console.log(`Data migration completed. Final version: ${result.version || currentVersion}`)
    return result
  } catch (error) {
    console.error(`✗ Migration failed:`, error)
    console.error(`Aborting migration - returning to original state (${currentVersion})`)

    throw new Error(
      `Migration failed: ${error instanceof Error ? error.message : String(error)}. Data reverted to original state.`,
    )
  }
}

export function needsMigration(dataFile: Json): boolean {
  if (typeof dataFile !== "object" || dataFile === null || Array.isArray(dataFile)) {
    throw new Error("Data file must be a JSON object")
  }

  const currentVersion = resolveDataFileVersion(dataFile)
  const latestAvailableMigration = getLatestAvailableMigration()

  return latestAvailableMigration
    ? isVersionLessThan(currentVersion, latestAvailableMigration)
    : false
}

export function getMigrationInfo(dataFile: Json) {
  if (typeof dataFile !== "object" || dataFile === null || Array.isArray(dataFile)) {
    throw new Error("Data file must be a JSON object")
  }

  const currentVersion = resolveDataFileVersion(dataFile)
  const latestAvailableMigration = getLatestAvailableMigration()
  const targetVersion = latestAvailableMigration || currentVersion

  return {
    currentVersion,
    targetVersion,
    needsMigration: needsMigration(dataFile),
  }
}
