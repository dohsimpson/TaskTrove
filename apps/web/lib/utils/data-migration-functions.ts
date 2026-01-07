import type { VersionString } from "@tasktrove/types/id"
import type { Json } from "@tasktrove/types/constants"
import { DataFileSchema } from "@tasktrove/types/data-file"
import { DEFAULT_UUID, DEFAULT_SECTION_NAME, DEFAULT_SECTION_COLOR } from "@tasktrove/constants"
import {
  DEFAULT_USER_SETTINGS,
  DEFAULT_USER,
  DEFAULT_GENERAL_SETTINGS,
  DEFAULT_UI_SETTINGS,
} from "@tasktrove/types/defaults"
import { cleanupAllDanglingTasks } from "@tasktrove/types/utils"

type MigrationFunction = (dataFile: Json) => Json
export interface MigrationStep {
  version: VersionString
  migrate: MigrationFunction
}

export function v080Migration(dataFile: Json): Json {
  console.log("Migrating data file from v0.7.0 to v0.8.0...")
  console.log(
    "Adding userId to task comments, id to user object, and ensuring projects have sections",
  )

  if (typeof dataFile !== "object" || dataFile === null || Array.isArray(dataFile)) {
    throw new Error("Migration input must be a JSON object")
  }

  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(dataFile)) {
    result[key] = value
  }

  if (Array.isArray(result.tasks)) {
    result.tasks = result.tasks.map((task) => {
      if (typeof task !== "object" || task === null || Array.isArray(task)) {
        return task
      }

      const taskObj: Record<string, unknown> = {}
      for (const [key, value] of Object.entries(task)) {
        taskObj[key] = value
      }

      if (Array.isArray(taskObj.comments)) {
        taskObj.comments = taskObj.comments.map((comment) => {
          if (typeof comment !== "object" || comment === null || Array.isArray(comment)) {
            return comment
          }

          const commentObj: Record<string, unknown> = {}
          for (const [key, value] of Object.entries(comment)) {
            commentObj[key] = value
          }

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

  if (typeof result.user === "object" && result.user !== null && !Array.isArray(result.user)) {
    const user: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(result.user)) {
      user[key] = value
    }

    if (!("id" in user)) {
      console.log("✓ Adding id field to user object")
      user.id = DEFAULT_UUID
    }

    result.user = user
  } else {
    console.log("✓ Creating user object with id field")
    result.user = {
      ...DEFAULT_USER,
      id: DEFAULT_UUID,
    }
  }

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

      if (!Array.isArray(projectObj.sections) || projectObj.sections.length === 0) {
        console.log(`✓ Adding default section to project ${projectObj.id}`)
        projectObj.sections = [
          {
            id: DEFAULT_UUID,
            name: DEFAULT_SECTION_NAME,
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

  try {
    if (Array.isArray(result.tasks) && Array.isArray(result.projects)) {
      const parsedData = DataFileSchema.parse(result)
      const cleanedProjects = cleanupAllDanglingTasks(parsedData.tasks, parsedData.projects)
      result.projects = JSON.parse(JSON.stringify(cleanedProjects))
      console.log("✓ Cleaned up dangling task section assignments")
    }
  } catch (error) {
    console.warn("⚠ Could not clean up dangling tasks:", error)
  }

  console.log("✓ v0.8.0 migration completed")
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

  try {
    if (Array.isArray(result.tasks) && Array.isArray(result.projects)) {
      const parsedData = DataFileSchema.parse(result)
      const cleanedProjects = cleanupAllDanglingTasks(parsedData.tasks, parsedData.projects)
      result.projects = JSON.parse(JSON.stringify(cleanedProjects))
      console.log("✓ Cleaned up dangling task section assignments")
    }
  } catch (error) {
    console.warn("⚠ Could not clean up dangling tasks:", error)
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

export function v0110Migration(dataFile: Json): Json {
  console.log("Migrating data file to add uiSettings (v0.11.0)...")

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
    settings = { ...result.settings }
  } else {
    console.log("⚠️ Settings missing or invalid - restoring defaults")
    settings = { ...DEFAULT_USER_SETTINGS }
  }

  if (
    typeof settings.uiSettings !== "object" ||
    settings.uiSettings === null ||
    Array.isArray(settings.uiSettings)
  ) {
    console.log("✓ Adding uiSettings with defaults")
    settings.uiSettings = { ...DEFAULT_UI_SETTINGS }
  } else {
    type MutableUiSettings = { [key: string]: unknown; weekStartsOn?: unknown }
    const uiSettings: MutableUiSettings = { ...settings.uiSettings }
    if (!("weekStartsOn" in uiSettings) && DEFAULT_UI_SETTINGS.weekStartsOn !== undefined) {
      uiSettings.weekStartsOn = DEFAULT_UI_SETTINGS.weekStartsOn
      console.log("✓ Added weekStartsOn to uiSettings")
    }
    settings.uiSettings = uiSettings
  }

  result.settings = settings

  return JSON.parse(JSON.stringify(result))
}

export function v0120Migration(dataFile: Json): Json {
  console.log("Base migration v0.12.0")

  if (typeof dataFile !== "object" || dataFile === null || Array.isArray(dataFile)) {
    throw new Error("Migration input must be a JSON object")
  }

  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(dataFile)) {
    result[key] = value
  }

  // Ensure uiSettings exists (base defaults to empty object)
  const settingsValue = result.settings
  const hasObjectSettings =
    typeof settingsValue === "object" && settingsValue !== null && !Array.isArray(settingsValue)

  const settingsObj: Record<string, unknown> = hasObjectSettings
    ? { ...settingsValue }
    : { ...DEFAULT_USER_SETTINGS }

  const uiSettingsValue = settingsObj.uiSettings
  const hasObjectUiSettings =
    typeof uiSettingsValue === "object" &&
    uiSettingsValue !== null &&
    !Array.isArray(uiSettingsValue)

  settingsObj.uiSettings = hasObjectUiSettings ? uiSettingsValue : { ...DEFAULT_UI_SETTINGS }

  // Clone general settings
  let general: Record<string, unknown>
  const generalValue = settingsObj.general
  if (typeof generalValue === "object" && generalValue !== null && !Array.isArray(generalValue)) {
    const clonedGeneral: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(generalValue)) {
      clonedGeneral[key] = value
    }
    general = clonedGeneral
  } else {
    general = { ...DEFAULT_GENERAL_SETTINGS }
  }

  if (!("preferDayMonthFormat" in general)) {
    console.log("✓ Adding preferDayMonthFormat flag to general settings")
    general.preferDayMonthFormat = DEFAULT_GENERAL_SETTINGS.preferDayMonthFormat
  }

  settingsObj.general = general
  result.settings = settingsObj

  const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null && !Array.isArray(value)

  const stripSlugFromSection = (section: unknown): unknown => {
    if (!isRecord(section)) return section
    const { slug: _slug, ...rest } = section
    void _slug
    return rest
  }

  const stripSlugFromProject = (project: unknown): unknown => {
    if (!isRecord(project)) return project
    const { slug: _slug, sections, ...rest } = project
    void _slug
    const nextSections = Array.isArray(sections) ? sections.map(stripSlugFromSection) : sections
    return sections === undefined ? rest : { ...rest, sections: nextSections }
  }

  const stripSlugFromGroup = (group: unknown): unknown => {
    if (!isRecord(group)) return group
    const { slug: _slug, items, ...rest } = group
    void _slug
    const nextItems = Array.isArray(items)
      ? items.map((item) => (isRecord(item) ? stripSlugFromGroup(item) : item))
      : items
    return items === undefined ? rest : { ...rest, items: nextItems }
  }

  const projectsValue = result.projects
  if (Array.isArray(projectsValue)) {
    result.projects = projectsValue.map(stripSlugFromProject)
  }

  const labelsValue = result.labels
  if (Array.isArray(labelsValue)) {
    result.labels = labelsValue.map((label) => {
      if (!isRecord(label)) return label
      const { slug: _slug, ...rest } = label
      void _slug
      return rest
    })
  }

  if (isRecord(result.projectGroups)) {
    result.projectGroups = stripSlugFromGroup(result.projectGroups)
  }

  if (isRecord(result.labelGroups)) {
    result.labelGroups = stripSlugFromGroup(result.labelGroups)
  }

  return JSON.parse(JSON.stringify(result))
}
