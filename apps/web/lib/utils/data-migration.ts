import type { DataFile } from "@tasktrove/types/data-file"
import type { VersionString } from "@tasktrove/types/id"
import type { Json } from "@tasktrove/types/constants"
import { DataFileSchema } from "@tasktrove/types/data-file"
import { LATEST_DATA_VERSION } from "@tasktrove/types/schema-version"
import { createVersionString } from "@tasktrove/types/id"
import { DEFAULT_UUID, DEFAULT_SECTION_NAME, DEFAULT_SECTION_COLOR } from "@tasktrove/constants"
import {
  DEFAULT_USER_SETTINGS,
  DEFAULT_USER,
  DEFAULT_GENERAL_SETTINGS,
} from "@tasktrove/types/defaults"
import { cleanupAllDanglingTasks } from "@tasktrove/types/utils"
import { getAppVersion } from "@/lib/utils/version"
import { isVersionLessThan } from "@tasktrove/utils/version"

/**
 * Data Migration Utility for TaskTrove Data Files
 *
 * Performs staged version upgrades (1 version at a time) to ensure data compatibility.
 *
 * Note: We don't strictly follow semantic versioning - migration stages are only
 * defined when actual data structure changes are needed.
 *
 * Data files must include a version field that reflects their data structure version.
 * Data file version reflects the ACTUAL data structure version (latest applied migration).
 * ONLY define migration functions for versions that actually change data structure.
 * Version-only bumps (no data changes) don't need migration functions.
 *
 * Example: App v0.7.0, latest migration v0.5.0 → data files stay at v0.5.0
 */

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

const MIN_SUPPORTED_VERSION = createVersionString("v0.8.0")

function resolveDataFileVersion(record: Json): VersionString {
  // Ensure we have a proper record object with version property
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

/**
 * Individual migration functions for testing
 *
 * CRITICAL CONSTRAINT - DO NOT MODIFY RELEASED MIGRATION FUNCTIONS:
 * Once package.json version is >= a migration function's version, that function becomes IMMUTABLE.
 *
 * Example: If package.json is at v0.10.0 or above, v0100Migration function is FORBIDDEN to modify.
 * Reason: Users may have data files migrated using the original function. Changing it breaks data integrity.
 *
 * If you need to fix a migration, create a NEW migration function for the next version instead.
 */
export function v080Migration(dataFile: Json): Json {
  console.log("Migrating data file from v0.7.0 to v0.8.0...")
  console.log(
    "Adding userId to task comments, id to user object, and ensuring projects have sections",
  )

  // Safely handle Json object type
  if (typeof dataFile !== "object" || dataFile === null || Array.isArray(dataFile)) {
    throw new Error("Migration input must be a JSON object")
  }

  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(dataFile)) {
    result[key] = value
  }

  // 1. Add userId to all comments in tasks
  if (Array.isArray(result.tasks)) {
    result.tasks = result.tasks.map((task) => {
      if (typeof task !== "object" || task === null || Array.isArray(task)) {
        return task
      }

      const taskObj: Record<string, unknown> = {}
      for (const [key, value] of Object.entries(task)) {
        taskObj[key] = value
      }

      // Process comments array
      if (Array.isArray(taskObj.comments)) {
        taskObj.comments = taskObj.comments.map((comment) => {
          if (typeof comment !== "object" || comment === null || Array.isArray(comment)) {
            return comment
          }

          const commentObj: Record<string, unknown> = {}
          for (const [key, value] of Object.entries(comment)) {
            commentObj[key] = value
          }

          // Add userId if not already present
          if (!("userId" in commentObj)) {
            commentObj.userId = DEFAULT_UUID
          }

          return commentObj
        })
      }

      return taskObj
    })

    console.log("✓ Added userId to task comments")
  }

  // 2. Add id to user object
  if (typeof result.user === "object" && result.user !== null && !Array.isArray(result.user)) {
    const user: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(result.user)) {
      user[key] = value
    }

    // Add id if not already present
    if (!("id" in user)) {
      console.log("✓ Adding id field to user object")
      user.id = DEFAULT_UUID
    }

    result.user = user
  } else {
    // If no user exists at all, create one with default values (shouldn't happen after v0.7.0)
    console.log("✓ Creating user object with id field")
    result.user = {
      ...DEFAULT_USER,
      id: DEFAULT_UUID,
    }
  }

  // 3. Ensure all projects have at least one section (sections.min(1) requirement)
  if (Array.isArray(result.projects)) {
    let projectsFixed = 0
    result.projects = result.projects.map((project) => {
      if (typeof project !== "object" || project === null || Array.isArray(project)) {
        return project
      }

      const projectObj: Record<string, unknown> = {}
      for (const [key, value] of Object.entries(project)) {
        projectObj[key] = value
      }

      // Check if project has no sections or empty sections array
      if (!Array.isArray(projectObj.sections) || projectObj.sections.length === 0) {
        console.log(`✓ Adding default section to project ${projectObj.id}`)
        projectObj.sections = [
          {
            id: DEFAULT_UUID,
            name: DEFAULT_SECTION_NAME,
            slug: "",
            color: DEFAULT_SECTION_COLOR,
            type: "section",
            items: [],
            isDefault: true,
          },
        ]
        projectsFixed++
      }

      return projectObj
    })

    if (projectsFixed > 0) {
      console.log(`✓ Added default sections to ${projectsFixed} project(s)`)
    }
  }

  // 4. Clean up dangling tasks (tasks belonging to projects but not in any section.items)
  // This needs to happen after projects have been fixed with default sections
  try {
    if (Array.isArray(result.tasks) && Array.isArray(result.projects)) {
      // Parse to proper types for the cleanup function
      const parsedData = DataFileSchema.parse(result)
      const cleanedProjects = cleanupAllDanglingTasks(parsedData.tasks, parsedData.projects)

      // Convert back to Json format
      result.projects = JSON.parse(JSON.stringify(cleanedProjects))
      console.log("✓ Cleaned up dangling task section assignments")
    }
  } catch (error) {
    console.warn("⚠ Could not clean up dangling tasks:", error)
    // Non-fatal - continue with migration
  }

  console.log("✓ v0.8.0 migration completed")

  // Return as Json by serializing/deserializing
  return JSON.parse(JSON.stringify(result))
}

export function v0100Migration(dataFile: Json): Json {
  console.log("Migrating data file to ensure markdown settings are present (v0.10.0)...")

  if (typeof dataFile !== "object" || dataFile === null || Array.isArray(dataFile)) {
    throw new Error("Migration input must be a JSON object")
  }

  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(dataFile)) {
    result[key] = value
  }

  let settings: Record<string, unknown>
  if (
    typeof result.settings === "object" &&
    result.settings !== null &&
    !Array.isArray(result.settings)
  ) {
    const clonedSettings: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(result.settings)) {
      clonedSettings[key] = value
    }
    settings = clonedSettings
  } else {
    console.log("⚠️ Settings missing or invalid - restoring defaults")
    settings = { ...DEFAULT_USER_SETTINGS }
  }

  let general: Record<string, unknown>
  if (
    typeof settings.general === "object" &&
    settings.general !== null &&
    !Array.isArray(settings.general)
  ) {
    const clonedGeneral: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(settings.general)) {
      clonedGeneral[key] = value
    }
    general = clonedGeneral
  } else {
    console.log("⚠️ General settings missing or invalid - restoring defaults")
    general = { ...DEFAULT_GENERAL_SETTINGS }
  }

  if (!("markdownEnabled" in general)) {
    console.log("✓ Adding markdownEnabled flag to general settings")
    general.markdownEnabled = DEFAULT_GENERAL_SETTINGS.markdownEnabled
  }

  settings.general = general
  result.settings = settings

  // Clean up dangling tasks (tasks belonging to projects but not in any section.items)
  // This needs to happen after projects have been fixed with default sections
  try {
    if (Array.isArray(result.tasks) && Array.isArray(result.projects)) {
      // Parse to proper types for the cleanup function
      const parsedData = DataFileSchema.parse(result)
      const cleanedProjects = cleanupAllDanglingTasks(parsedData.tasks, parsedData.projects)

      // Convert back to Json format
      result.projects = JSON.parse(JSON.stringify(cleanedProjects))
      console.log("✓ Cleaned up dangling task section assignments")
    }
  } catch (error) {
    console.warn("⚠ Could not clean up dangling tasks:", error)
    // Non-fatal - continue with migration
  }

  if (Array.isArray(result.tasks)) {
    type MutableTask = {
      [key: string]: unknown
      id?: string
      trackingId?: string
      recurring?: unknown
      completed?: unknown
    }
    const tasksArray: MutableTask[] = result.tasks
    const trackingGroups = new Map<string, MutableTask[]>()

    for (const task of tasksArray) {
      if (typeof task !== "object" || Array.isArray(task)) continue
      const taskId = typeof task.id === "string" ? task.id : undefined
      const trackingKey = typeof task.trackingId === "string" ? task.trackingId : taskId

      if (!trackingKey) continue
      const group = trackingGroups.get(trackingKey)
      if (group) {
        group.push(task)
      } else {
        trackingGroups.set(trackingKey, [task])
      }
    }

    let rebasedCount = 0
    for (const groupTasks of trackingGroups.values()) {
      const anchorTask = groupTasks.find((task) => task.recurring && task.completed !== true)

      if (!anchorTask) {
        continue
      }

      const anchorId =
        typeof anchorTask.id === "string"
          ? anchorTask.id
          : typeof anchorTask.trackingId === "string"
            ? anchorTask.trackingId
            : undefined

      if (!anchorId) {
        continue
      }

      for (const task of groupTasks) {
        if (task.trackingId !== anchorId) {
          task.trackingId = anchorId
          rebasedCount++
        }
      }
    }

    if (rebasedCount > 0) {
      console.log(`✓ Rebased tracking IDs for ${rebasedCount} recurring task(s)`)
    }
  }

  return JSON.parse(JSON.stringify(result))
}

/**
 * Migration functions for each version upgrade
 * Only define functions for versions that actually require data structure changes
 * Array is ordered sequentially - no need for sorting or complex filtering
 *
 * IMMUTABILITY RULE: Once package.json >= migration version, that migration becomes IMMUTABLE.
 */
const migrationFunctions: MigrationStep[] = [
  {
    version: createVersionString("v0.8.0"),
    migrate: v080Migration,
  },
  {
    version: createVersionString("v0.10.0"),
    migrate: v0100Migration,
  },
]

export function getRegisteredMigrationVersions(): VersionString[] {
  return migrationFunctions.map((step) => step.version)
}

/**
 * Main migration function - performs staged version upgrades
 *
 * @param dataFile - The raw JSON data file to migrate (unknown structure from previous versions)
 * @returns Migrated and validated data file conforming to current DataFile schema
 */
export function migrateDataFile(dataFile: Json): DataFile {
  const latestAvailableMigration = getLatestAvailableMigration()
  const target = latestAvailableMigration || createVersionString(`v${getAppVersion()}`)

  // Convert Json to a workable object type
  if (typeof dataFile !== "object" || dataFile === null || Array.isArray(dataFile)) {
    throw new Error("Data file must be a JSON object")
  }

  const originalData: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(dataFile)) {
    originalData[key] = value
  }

  // Safely extract version from potentially malformed data
  const currentVersion = resolveDataFileVersion(dataFile)

  if (isVersionLessThan(currentVersion, MIN_SUPPORTED_VERSION)) {
    throw new Error(
      `Data file version ${currentVersion} is no longer supported. Minimum supported version is ${MIN_SUPPORTED_VERSION}. Please upgrade to TaskTrove v0.8.0 or newer before migrating.`,
    )
  }

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
      if (!step) {
        console.error(`Migration step at index ${i} is undefined`)
        continue
      }

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
    let result
    try {
      result = DataFileSchema.parse(workingData)
    } catch (parseError) {
      // Handle schema validation errors with proper error message format
      console.error(`✗ Migration failed:`, parseError)
      console.error(`Aborting migration - returning to original state (${currentVersion})`)
      throw new Error(
        `Migration failed: ${parseError instanceof Error ? parseError.message : String(parseError)}. Data reverted to original state.`,
      )
    }
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
 * Get the latest available migration version
 *
 * @returns The latest migration version available, or null if no migrations exist
 */
export function getLatestAvailableMigration(): VersionString | null {
  return LATEST_DATA_VERSION
}

/**
 * Check if a data file needs migration
 *
 * @param dataFile - The raw JSON data file to check (unknown structure)
 * @returns True if migration is needed
 */
export function needsMigration(dataFile: Json): boolean {
  // Convert Json to workable object type
  if (typeof dataFile !== "object" || dataFile === null || Array.isArray(dataFile)) {
    throw new Error("Data file must be a JSON object")
  }

  const currentVersion = resolveDataFileVersion(dataFile)

  // Get latest available migration
  const latestAvailableMigration = getLatestAvailableMigration()

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
  // Convert Json to workable object type
  if (typeof dataFile !== "object" || dataFile === null || Array.isArray(dataFile)) {
    throw new Error("Data file must be a JSON object")
  }

  const currentVersion = resolveDataFileVersion(dataFile)

  // Get latest available migration as target
  const latestAvailableMigration = getLatestAvailableMigration()
  const targetVersion = latestAvailableMigration || currentVersion

  return {
    currentVersion,
    targetVersion,
    needsMigration: needsMigration(dataFile),
  }
}
