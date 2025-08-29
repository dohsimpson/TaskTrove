import type { DataFile, VersionString, Json } from "@/lib/types"
import { createVersionString, DataFileSchema } from "@/lib/types"
import packageJson from "@/package.json"

/**
 * Data Migration Utility for TaskTrove Data Files
 *
 * Performs staged version upgrades (1 version at a time) to ensure data compatibility.
 * Supports up to 8 version migrations with automatic version bumping.
 *
 * Note: We don't strictly follow semantic versioning - migration stages are only
 * defined when actual data structure changes are needed.
 *
 * CURRENT STATE: v0.2.0 (data files without explicit version field)
 * FIRST EXPLICIT VERSION: v0.3.0 (data files with version field)
 *
 * Data files without version field are treated as v0.2.0.
 * Data file version reflects the ACTUAL data structure version (latest applied migration).
 *
 * HOW TO ADD NEW MIGRATIONS:
 * 1. Add migration function to migrationFunctions object (key = version)
 * 2. Update package.json version
 * 3. Call migrateDataFile() before using data files
 *
 * ONLY define migration functions for versions that actually change data structure.
 * Version-only bumps (no data changes) don't need migration functions.
 *
 * Example: App v0.7.0, latest migration v0.5.0 → data files stay at v0.5.0
 */

/**
 * Simple version comparison utility
 * Returns: -1 if a < b, 0 if a === b, 1 if a > b
 */
function compareVersions(a: VersionString, b: VersionString): number {
  const parseVersion = (v: VersionString) => v.replace(/^v/, "").split(".").map(Number)
  const versionA = parseVersion(a)
  const versionB = parseVersion(b)

  for (let i = 0; i < Math.max(versionA.length, versionB.length); i++) {
    const numA = versionA[i] || 0
    const numB = versionB[i] || 0

    if (numA < numB) return -1
    if (numA > numB) return 1
  }

  return 0
}

/**
 * Check if version A is less than version B
 */
function isVersionLessThan(a: VersionString, b: VersionString): boolean {
  return compareVersions(a, b) < 0
}

/**
 * Migration function type - works with unknown JSON data structures
 * Input and output are Json types since we're dealing with potentially malformed data
 */
type MigrationFunction = (dataFile: Json) => Json

/**
 * Migration step definition
 */
interface MigrationStep {
  version: VersionString
  migrate: MigrationFunction
}

/**
 * Migration functions for each version upgrade
 * Only define functions for versions that actually require data structure changes
 * Array is ordered sequentially - no need for sorting or complex filtering
 */
const migrationFunctions: MigrationStep[] = [
  // Migration from v0.2.0 to v0.3.0 - first introduction of explicit version field
  {
    version: createVersionString("v0.3.0"),
    migrate: (dataFile: Json): Json => {
      console.log("Migrating data file from v0.2.0 to v0.3.0...")
      console.log("Adding explicit version field to data file")
      // Add actual migration logic here when v0.3.0 requires data changes
      // Note: Version is set by main migration logic, not here
      // Safely handle Json object type
      if (typeof dataFile !== "object" || dataFile === null || Array.isArray(dataFile)) {
        throw new Error("Migration input must be a JSON object")
      }

      const result: Record<string, unknown> = {}
      for (const [key, value] of Object.entries(dataFile)) {
        result[key] = value
      }

      // Add any actual data structure changes here

      // Return as Json by serializing/deserializing
      return JSON.parse(JSON.stringify(result))
    },
  },

  // Future migration placeholders (define as needed):
  // {
  //   version: createVersionString("v0.4.0"),
  //   migrate: (dataFile: Json): Json => {
  //     console.log("Migrating data to version v0.4.0...")
  //     return { ...dataFile, /* Add actual data structure changes here */ }
  //   }
  // },
  // { version: createVersionString("v0.5.0"), migrate: (dataFile: Json) => { ... } },
  // { version: createVersionString("v0.6.0"), migrate: (dataFile: Json) => { ... } },
  // { version: createVersionString("v0.7.0"), migrate: (dataFile: Json) => { ... } },
  // { version: createVersionString("v0.8.0"), migrate: (dataFile: Json) => { ... } },
  // { version: createVersionString("v0.9.0"), migrate: (dataFile: Json) => { ... } },
]

/**
 * Main migration function - performs staged version upgrades
 *
 * @param dataFile - The raw JSON data file to migrate (unknown structure from previous versions)
 * @returns Migrated and validated data file conforming to current DataFile schema
 */
export function migrateDataFile(dataFile: Json): DataFile {
  const target = createVersionString(`v${packageJson.version}`)

  // Convert Json to a workable object type
  if (typeof dataFile !== "object" || dataFile === null || Array.isArray(dataFile)) {
    throw new Error("Data file must be a JSON object")
  }

  const originalData: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(dataFile)) {
    originalData[key] = value
  }

  // Safely extract version from potentially malformed data
  const currentVersion =
    (typeof originalData.version === "string" ? createVersionString(originalData.version) : null) ||
    createVersionString("v0.2.0")

  console.log(`Starting data migration from version ${currentVersion} with target ${target}`)

  // Find the first migration step after current version
  const startIndex = migrationFunctions.findIndex((step) =>
    isVersionLessThan(currentVersion, step.version),
  )

  if (startIndex === -1) {
    console.log(`No migrations needed from ${currentVersion} to ${target}`)
    // Validate and return the original data as DataFile
    const result = DataFileSchema.parse(originalData)
    return result
  }

  // Create a working copy for migrations (transactional approach)
  let workingData = { ...originalData }

  try {
    // Apply migrations sequentially up to target
    for (let i = startIndex; i < migrationFunctions.length; i++) {
      const step = migrationFunctions[i]

      // Stop if we exceed the target version
      if (isVersionLessThan(target, step.version)) {
        break
      }

      console.log(`Applying migration to version ${step.version}...`)

      // Create Json-compatible input for migration
      const inputData: Json = JSON.parse(JSON.stringify(workingData))
      const migratedData = step.migrate(inputData)

      // Ensure the migrated data is an object we can work with
      if (
        typeof migratedData !== "object" ||
        migratedData === null ||
        Array.isArray(migratedData)
      ) {
        throw new Error(`Migration to ${step.version} returned invalid data structure`)
      }

      // Copy migrated data back to working data
      const newWorkingData: Record<string, unknown> = {}
      for (const [key, value] of Object.entries(migratedData)) {
        newWorkingData[key] = value
      }
      workingData = newWorkingData

      // Set version immediately after each successful migration step
      workingData.version = step.version
      console.log(`✓ Successfully migrated to version ${step.version}`)
    }

    // Validate the final result against the current DataFile schema
    const result = DataFileSchema.parse(workingData)
    console.log(`Data migration completed. Final version: ${result.version || currentVersion}`)
    return result
  } catch (error) {
    console.error(`✗ Migration failed:`, error)
    console.error(`Aborting migration - returning to original state (${currentVersion})`)

    // Return original data unchanged on any failure
    throw new Error(
      `Migration failed: ${error instanceof Error ? error.message : String(error)}. Data reverted to original state.`,
    )
  }
}

/**
 * Check if a data file needs migration
 *
 * @param dataFile - The raw JSON data file to check (unknown structure)
 * @returns True if migration is needed
 */
export function needsMigration(dataFile: Json): boolean {
  const target = createVersionString(`v${packageJson.version}`)

  // Convert Json to workable object type
  if (typeof dataFile !== "object" || dataFile === null || Array.isArray(dataFile)) {
    throw new Error("Data file must be a JSON object")
  }

  // Safely extract version from potentially malformed data
  const currentVersion =
    (typeof dataFile.version === "string" ? createVersionString(dataFile.version) : null) ||
    createVersionString("v0.2.0")

  // Find latest available migration that's <= target
  let latestAvailableMigration: VersionString | null = null

  for (const step of migrationFunctions) {
    if (!isVersionLessThan(target, step.version)) {
      latestAvailableMigration = step.version
    } else {
      break // Since array is sorted, no need to continue
    }
  }

  // Need migration if current version < latest available migration
  return latestAvailableMigration
    ? isVersionLessThan(currentVersion, latestAvailableMigration)
    : false
}

/**
 * Get migration info for a data file
 *
 * @param dataFile - The raw JSON data file to analyze (unknown structure)
 * @returns Migration information
 */
export function getMigrationInfo(dataFile: Json) {
  const target = createVersionString(`v${packageJson.version}`)

  // Convert Json to workable object type
  if (typeof dataFile !== "object" || dataFile === null || Array.isArray(dataFile)) {
    throw new Error("Data file must be a JSON object")
  }

  // Safely extract version from potentially malformed data
  const currentVersion =
    (typeof dataFile.version === "string" ? createVersionString(dataFile.version) : null) ||
    createVersionString("v0.2.0")

  return {
    currentVersion,
    targetVersion: target,
    needsMigration: needsMigration(dataFile),
  }
}
