import type { DataFile, VersionString } from "@/lib/types"
import { createVersionString } from "@/lib/types"
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
 * Migration function type
 */
type MigrationFunction = (dataFile: DataFile) => DataFile

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
    migrate: (dataFile: DataFile): DataFile => {
      console.log("Migrating data file from v0.2.0 to v0.3.0...")
      console.log("Adding explicit version field to data file")
      // Add actual migration logic here when v0.3.0 requires data changes
      // Note: Version is set by main migration logic, not here
      return {
        ...dataFile,
        // Add any actual data structure changes here
      }
    },
  },

  // Future migration placeholders (define as needed):
  // {
  //   version: createVersionString("v0.4.0"),
  //   migrate: (dataFile: DataFile): DataFile => {
  //     console.log("Migrating data to version v0.4.0...")
  //     return { ...dataFile, /* Add actual data structure changes here */ }
  //   }
  // },
  // { version: createVersionString("v0.5.0"), migrate: (dataFile: DataFile) => { ... } },
  // { version: createVersionString("v0.6.0"), migrate: (dataFile: DataFile) => { ... } },
  // { version: createVersionString("v0.7.0"), migrate: (dataFile: DataFile) => { ... } },
  // { version: createVersionString("v0.8.0"), migrate: (dataFile: DataFile) => { ... } },
  // { version: createVersionString("v0.9.0"), migrate: (dataFile: DataFile) => { ... } },
]

/**
 * Main migration function - performs staged version upgrades
 *
 * @param dataFile - The data file to migrate
 * @param targetVersion - Target version (defaults to current package.json version)
 * @returns Migrated data file with version set to latest applied migration
 */
export function migrateDataFile(dataFile: DataFile, targetVersion?: VersionString): DataFile {
  const target = targetVersion || createVersionString(`v${packageJson.version}`)
  const originalData = { ...dataFile }

  // Treat undefined version as v0.2.0
  const currentVersion = originalData.version || createVersionString("v0.2.0")

  console.log(`Starting data migration from version ${currentVersion} with target ${target}`)

  // Find the first migration step after current version
  const startIndex = migrationFunctions.findIndex((step) =>
    isVersionLessThan(currentVersion, step.version),
  )

  if (startIndex === -1) {
    console.log(`No migrations needed from ${currentVersion} to ${target}`)
    return originalData // Return as-is, don't change version
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
      workingData = step.migrate(workingData)
      // Set version immediately after each successful migration step
      workingData.version = step.version
      console.log(`✓ Successfully migrated to version ${step.version}`)
    }

    console.log(`Data migration completed. Final version: ${workingData.version || currentVersion}`)
    return workingData
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
 * @param dataFile - The data file to check
 * @param targetVersion - Target version (defaults to current package.json version)
 * @returns True if migration is needed
 */
export function needsMigration(dataFile: DataFile, targetVersion?: VersionString): boolean {
  const target = targetVersion || createVersionString(`v${packageJson.version}`)

  // Treat undefined version as v0.2.0
  const currentVersion = dataFile.version || createVersionString("v0.2.0")

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
 * @param dataFile - The data file to analyze
 * @param targetVersion - Target version (defaults to current package.json version)
 * @returns Migration information
 */
export function getMigrationInfo(dataFile: DataFile, targetVersion?: VersionString) {
  const target = targetVersion || createVersionString(`v${packageJson.version}`)

  // Treat undefined version as v0.2.0
  const currentVersion = dataFile.version || createVersionString("v0.2.0")

  return {
    currentVersion,
    targetVersion: target,
    needsMigration: needsMigration(dataFile, target),
  }
}
