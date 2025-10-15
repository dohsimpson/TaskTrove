import type { DataFile, VersionString, Json } from "@/lib/types"
import { createVersionString, DataFileSchema } from "@/lib/types"
import { DEFAULT_UUID, DEFAULT_SECTION_NAME, DEFAULT_SECTION_COLOR } from "@tasktrove/constants"
import { DEFAULT_USER_SETTINGS, DEFAULT_USER } from "@/lib/types"
import packageJson from "@/package.json"

/**
 * Data Migration Utility for TaskTrove Data Files
 *
 * Performs staged version upgrades (1 version at a time) to ensure data compatibility.
 *
 * Note: We don't strictly follow semantic versioning - migration stages are only
 * defined when actual data structure changes are needed.
 *
 * Data files without version field are treated as v0.2.0.
 * Data file version reflects the ACTUAL data structure version (latest applied migration).
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
 * Individual migration functions for testing
 *
 * CRITICAL CONSTRAINT - DO NOT MODIFY RELEASED MIGRATION FUNCTIONS:
 * Once package.json version is >= a migration function's version, that function becomes IMMUTABLE.
 *
 * Example: If package.json is at v0.3.0 or above, v030Migration function is FORBIDDEN to modify.
 * Reason: Users may have data files migrated using the original function. Changing it breaks data integrity.
 *
 * If you need to fix a migration, create a NEW migration function for the next version instead.
 */
export const v030Migration = (dataFile: Json): Json => {
  console.log("Migrating data file from v0.2.0 to v0.3.0...")
  console.log("Converting ordering system to groups system and adding recurringMode to tasks")

  // Safely handle Json object type
  if (typeof dataFile !== "object" || dataFile === null || Array.isArray(dataFile)) {
    throw new Error("Migration input must be a JSON object")
  }

  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(dataFile)) {
    result[key] = value
  }

  // 1. Transform ordering.projects array to projectGroups structure
  if (result.ordering && typeof result.ordering === "object" && !Array.isArray(result.ordering)) {
    const ordering: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(result.ordering)) {
      ordering[key] = value
    }

    // Create default project group with items from ordering.projects
    const projectsArray = Array.isArray(ordering.projects) ? ordering.projects : []
    result.projectGroups = {
      type: "project",
      id: DEFAULT_UUID,
      name: "All Projects",
      slug: "all-projects",
      items: projectsArray, // Array of ProjectIds
    }

    // Create default label group with items from ordering.labels
    const labelsArray = Array.isArray(ordering.labels) ? ordering.labels : []
    result.labelGroups = {
      type: "label",
      id: DEFAULT_UUID,
      name: "All Labels",
      slug: "all-labels",
      items: labelsArray, // Array of LabelIds
    }

    // Remove the old ordering field
    delete result.ordering
  } else {
    // If no ordering exists, create groups from existing projects and labels
    const projectIds: unknown[] = []
    if (Array.isArray(result.projects)) {
      for (const project of result.projects) {
        if (typeof project === "object" && project !== null && "id" in project) {
          projectIds.push(project.id)
        }
      }
    }

    const labelIds: unknown[] = []
    if (Array.isArray(result.labels)) {
      for (const label of result.labels) {
        if (typeof label === "object" && label !== null && "id" in label) {
          labelIds.push(label.id)
        }
      }
    }

    result.projectGroups = {
      type: "project",
      id: DEFAULT_UUID,
      name: "All Projects",
      slug: "all-projects",
      items: projectIds,
    }
    result.labelGroups = {
      type: "label",
      id: DEFAULT_UUID,
      name: "All Labels",
      slug: "all-labels",
      items: labelIds,
    }
  }

  // 2. Add recurringMode to all existing tasks (default to "dueDate")
  if (Array.isArray(result.tasks)) {
    result.tasks = result.tasks.map((task) => {
      if (typeof task === "object" && task !== null && !Array.isArray(task)) {
        const taskObj: Record<string, unknown> = {}
        for (const [key, value] of Object.entries(task)) {
          taskObj[key] = value
        }
        // Add recurringMode if not already present
        if (!("recurringMode" in taskObj)) {
          taskObj.recurringMode = "dueDate"
        }
        return taskObj
      }
      return task
    })
  }

  console.log("✓ Transformed ordering to groups system")
  console.log("✓ Added recurringMode to tasks")

  // Return as Json by serializing/deserializing
  return JSON.parse(JSON.stringify(result))
}

export const v040Migration = (dataFile: Json): Json => {
  console.log("Migrating data file from v0.3.0 to v0.4.0...")
  console.log("Adding settings structure to data file")

  // Safely handle Json object type
  if (typeof dataFile !== "object" || dataFile === null || Array.isArray(dataFile)) {
    throw new Error("Migration input must be a JSON object")
  }

  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(dataFile)) {
    result[key] = value
  }

  // Add default settings structure if not present
  if (!("settings" in result)) {
    result.settings = DEFAULT_USER_SETTINGS
  }

  console.log("✓ Added default settings structure")

  // Return as Json by serializing/deserializing
  return JSON.parse(JSON.stringify(result))
}

export function v050Migration(dataFile: Json): Json {
  console.log("Migrating data file from v0.4.0 to v0.5.0...")
  console.log("Adding general settings and migrating behavior settings")

  // Safely handle Json object type
  if (typeof dataFile !== "object" || dataFile === null || Array.isArray(dataFile)) {
    throw new Error("Migration input must be a JSON object")
  }

  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(dataFile)) {
    result[key] = value
  }

  // Handle settings migration
  if (
    typeof result.settings === "object" &&
    result.settings !== null &&
    !Array.isArray(result.settings)
  ) {
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    const settings = result.settings as Record<string, unknown>

    // If there's an old 'behavior' property, migrate it to 'general'
    if (
      "behavior" in settings &&
      typeof settings.behavior === "object" &&
      settings.behavior !== null
    ) {
      console.log("✓ Migrating behavior settings to general settings")
      settings.general = settings.behavior
      delete settings.behavior
    }

    // Ensure general settings exist with defaults
    if (!("general" in settings)) {
      console.log("✓ Adding default general settings")
      settings.general = {
        startView: "all", // Corresponds to DEFAULT_ROUTE "/all"
      }
    }
  } else {
    // If no settings exist at all, use defaults (this shouldn't happen after v0.4.0 migration)
    console.log("✓ Adding complete default settings structure")
    result.settings = DEFAULT_USER_SETTINGS
  }

  console.log("✓ General settings migration completed")

  // Return as Json by serializing/deserializing
  return JSON.parse(JSON.stringify(result))
}

export function v060Migration(dataFile: Json): Json {
  console.log("Migrating data file from v0.5.0 to v0.6.0...")
  console.log(
    "Adding soundEnabled, linkifyEnabled, and popoverHoverOpen fields to general settings",
  )

  // Safely handle Json object type
  if (typeof dataFile !== "object" || dataFile === null || Array.isArray(dataFile)) {
    throw new Error("Migration input must be a JSON object")
  }

  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(dataFile)) {
    result[key] = value
  }

  // Handle settings migration
  if (
    typeof result.settings === "object" &&
    result.settings !== null &&
    !Array.isArray(result.settings)
  ) {
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    const settings = result.settings as Record<string, unknown>

    // Ensure general settings exist
    if (
      typeof settings.general === "object" &&
      settings.general !== null &&
      !Array.isArray(settings.general)
    ) {
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      const general = settings.general as Record<string, unknown>

      // Add soundEnabled if it doesn't exist
      if (!("soundEnabled" in general)) {
        console.log("✓ Adding soundEnabled field to general settings")
        general.soundEnabled = true // Default to enabled
      }

      // Add linkifyEnabled if it doesn't exist
      if (!("linkifyEnabled" in general)) {
        console.log("✓ Adding linkifyEnabled field to general settings")
        general.linkifyEnabled = true // Default to enabled
      }

      // Add popoverHoverOpen if it doesn't exist
      if (!("popoverHoverOpen" in general)) {
        console.log("✓ Adding popoverHoverOpen field to general settings")
        general.popoverHoverOpen = false // Default to disabled
      }
    } else {
      // If general settings don't exist, create them with all required fields
      console.log(
        "✓ Creating general settings with soundEnabled, linkifyEnabled, and popoverHoverOpen fields",
      )
      settings.general = {
        startView: "all",
        soundEnabled: true,
        linkifyEnabled: true,
        popoverHoverOpen: false,
      }
    }
  } else {
    // If no settings exist at all, use defaults
    console.log(
      "✓ Adding complete default settings structure with soundEnabled, linkifyEnabled, and popoverHoverOpen",
    )
    result.settings = DEFAULT_USER_SETTINGS
  }

  console.log("✓ soundEnabled, linkifyEnabled, and popoverHoverOpen migration completed")

  // Return as Json by serializing/deserializing
  return JSON.parse(JSON.stringify(result))
}

export function v070Migration(dataFile: Json): Json {
  console.log("Migrating data file from v0.6.0 to v0.7.0...")
  console.log("Adding user field and converting sections to items-based ordering")

  // Safely handle Json object type
  if (typeof dataFile !== "object" || dataFile === null || Array.isArray(dataFile)) {
    throw new Error("Migration input must be a JSON object")
  }

  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(dataFile)) {
    result[key] = value
  }

  // 1. Add default user structure if not present
  if (!("user" in result)) {
    console.log("✓ Adding default user structure")
    result.user = DEFAULT_USER
  }

  // 2. Migrate projects: convert sections and remove taskOrder
  if (Array.isArray(result.projects)) {
    result.projects = result.projects.map((project) => {
      if (typeof project !== "object" || project === null || Array.isArray(project)) {
        return project
      }

      const projectObj: Record<string, unknown> = {}
      for (const [key, value] of Object.entries(project)) {
        projectObj[key] = value
      }

      // Get project's taskOrder array (may be undefined)
      const taskOrder = Array.isArray(projectObj.taskOrder) ? projectObj.taskOrder : []

      // Build a map of tasks by ID for quick lookup
      const taskMap = new Map<unknown, unknown>()
      if (Array.isArray(result.tasks)) {
        for (const task of result.tasks) {
          if (typeof task === "object" && task !== null && "id" in task) {
            taskMap.set(task.id, task)
          }
        }
      }

      // Build section items by processing taskOrder and tasks
      const sectionTasksMap = new Map<unknown, unknown[]>()
      const defaultSectionTasks: unknown[] = []

      // Process tasks in taskOrder first (preserving order)
      for (const taskId of taskOrder) {
        const task = taskMap.get(taskId)
        if (!task || typeof task !== "object") {
          continue // Skip orphaned task IDs
        }

        const sectionId = "sectionId" in task ? task.sectionId : undefined
        // Treat undefined, null, and DEFAULT_UUID as default section
        if (sectionId !== undefined && sectionId !== null && sectionId !== DEFAULT_UUID) {
          // Add to specific section
          const existing = sectionTasksMap.get(sectionId)
          if (existing) {
            existing.push(taskId)
          } else {
            sectionTasksMap.set(sectionId, [taskId])
          }
        } else {
          // Add to default section
          defaultSectionTasks.push(taskId)
        }
      }

      // Process tasks not in taskOrder (add to end of appropriate section)
      const tasksInOrder = new Set(taskOrder)
      if (Array.isArray(result.tasks)) {
        for (const task of result.tasks) {
          if (typeof task !== "object" || task === null || !("id" in task)) {
            continue
          }

          // Skip if task doesn't belong to this project
          if ("projectId" in task && task.projectId !== projectObj.id) {
            continue
          }

          // Skip if already processed
          if (tasksInOrder.has(task.id)) {
            continue
          }

          const sectionId = "sectionId" in task ? task.sectionId : undefined
          // Treat undefined, null, and DEFAULT_UUID as default section
          if (sectionId !== undefined && sectionId !== null && sectionId !== DEFAULT_UUID) {
            // Add to end of specific section
            const existing = sectionTasksMap.get(sectionId)
            if (existing) {
              existing.push(task.id)
            } else {
              sectionTasksMap.set(sectionId, [task.id])
            }
          } else {
            // Add to end of default section
            defaultSectionTasks.push(task.id)
          }
        }
      }

      // Transform sections to new structure
      const newSections: unknown[] = []

      // Always create default section first (at the top)
      newSections.push({
        id: DEFAULT_UUID,
        name: DEFAULT_SECTION_NAME,
        slug: "",
        type: "section",
        color: DEFAULT_SECTION_COLOR,
        items: defaultSectionTasks,
      })

      // Then add other sections
      if (Array.isArray(projectObj.sections)) {
        for (const section of projectObj.sections) {
          if (typeof section !== "object" || section === null || !("id" in section)) {
            continue
          }

          const sectionObj: Record<string, unknown> = {}
          for (const [key, value] of Object.entries(section)) {
            sectionObj[key] = value
          }

          // Skip DEFAULT_UUID section - already created above
          if (sectionObj.id === DEFAULT_UUID) {
            continue
          }

          // Create new section with items-based ordering
          const newSection: Record<string, unknown> = {
            id: sectionObj.id, // Keep same UUID
            name: sectionObj.name,
            slug: "",
            type: "section",
            items: sectionTasksMap.get(sectionObj.id) || [],
          }

          // Add optional color field if it exists
          if ("color" in sectionObj && sectionObj.color !== undefined) {
            newSection.color = sectionObj.color
          }

          // Add optional description field if it exists
          if ("description" in sectionObj && sectionObj.description !== undefined) {
            newSection.description = sectionObj.description
          }

          newSections.push(newSection)
        }
      }

      // Update project object
      projectObj.sections = newSections
      delete projectObj.taskOrder

      return projectObj
    })

    console.log("✓ Converted project sections to items-based ordering")
  }

  // 3. Remove sectionId from all tasks
  if (Array.isArray(result.tasks)) {
    result.tasks = result.tasks.map((task) => {
      if (typeof task !== "object" || task === null || Array.isArray(task)) {
        return task
      }

      const taskObj: Record<string, unknown> = {}
      for (const [key, value] of Object.entries(task)) {
        taskObj[key] = value
      }

      // Remove sectionId field
      delete taskObj.sectionId

      return taskObj
    })

    console.log("✓ Removed sectionId from tasks")
  }

  console.log("✓ User field and sections migration completed")

  // Return as Json by serializing/deserializing
  return JSON.parse(JSON.stringify(result))
}

export function v080Migration(dataFile: Json): Json {
  console.log("Migrating data file from v0.7.0 to v0.8.0...")
  console.log("Adding userId to task comments and id to user object")

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

  console.log("✓ userId and user id migration completed")

  // Return as Json by serializing/deserializing
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
    version: createVersionString("v0.3.0"),
    migrate: v030Migration,
  },
  {
    version: createVersionString("v0.4.0"),
    migrate: v040Migration,
  },
  {
    version: createVersionString("v0.5.0"),
    migrate: v050Migration,
  },
  {
    version: createVersionString("v0.6.0"),
    migrate: v060Migration,
  },
  {
    version: createVersionString("v0.7.0"),
    migrate: v070Migration,
  },
  {
    version: createVersionString("v0.8.0"),
    migrate: v080Migration,
  },
]

/**
 * Main migration function - performs staged version upgrades
 *
 * @param dataFile - The raw JSON data file to migrate (unknown structure from previous versions)
 * @returns Migrated and validated data file conforming to current DataFile schema
 */
export function migrateDataFile(dataFile: Json): DataFile {
  const latestAvailableMigration = getLatestAvailableMigration()
  const target = latestAvailableMigration || createVersionString(`v${packageJson.version}`)

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
  if (migrationFunctions.length === 0) {
    return null
  }

  // Return the last migration version since array is sorted
  const lastMigration = migrationFunctions[migrationFunctions.length - 1]
  if (!lastMigration) {
    return null
  }
  return lastMigration.version
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

  // Safely extract version from potentially malformed data
  const currentVersion =
    (typeof dataFile.version === "string" ? createVersionString(dataFile.version) : null) ||
    createVersionString("v0.2.0")

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

  // Safely extract version from potentially malformed data
  const currentVersion =
    (typeof dataFile.version === "string" ? createVersionString(dataFile.version) : null) ||
    createVersionString("v0.2.0")

  // Get latest available migration as target
  const latestAvailableMigration = getLatestAvailableMigration()
  const targetVersion = latestAvailableMigration || currentVersion

  return {
    currentVersion,
    targetVersion,
    needsMigration: needsMigration(dataFile),
  }
}
