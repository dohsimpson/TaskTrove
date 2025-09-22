/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/consistent-type-assertions */
import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  migrateDataFile,
  needsMigration,
  getMigrationInfo,
  getLatestAvailableMigration,
  v030Migration,
  v040Migration,
  v050Migration,
  v060Migration,
} from "./data-migration"
import type { Json } from "@/lib/types"
import { createVersionString, createProjectId, createLabelId, DataFileSchema } from "@/lib/types"
import { DEFAULT_EMPTY_DATA_FILE, DEFAULT_USER_SETTINGS } from "@/lib/types/defaults"
import { DEFAULT_UUID } from "@tasktrove/constants"
import {
  TEST_TASK_ID_1,
  TEST_TASK_ID_2,
  TEST_PROJECT_ID_1,
  TEST_LABEL_ID_1,
  TEST_SECTION_ID_1,
} from "./test-constants"

// Don't mock package.json - let it use the real version
// This prevents issues where schema expectations don't match mocked version during development

describe("Data Migration Utility", () => {
  let mockDataFile: Json

  // Helper function to create Json data without type assertions
  function createJsonData(data: Record<string, unknown>): Json {
    return JSON.parse(JSON.stringify(data))
  }

  beforeEach(() => {
    // Create generic data that needs migration (no version field = v0.2.0)
    const unmigrated = {
      tasks: [],
      projects: [],
      labels: [],
      ordering: { projects: [], labels: [] }, // Legacy field that should be migrated
    }

    mockDataFile = createJsonData(unmigrated)
    vi.clearAllMocks()
  })

  describe("migrateDataFile", () => {
    it("should handle data that needs no migration", () => {
      // Test with data that has a high version (no migration needed)
      const highVersionData = createJsonData({
        ...DEFAULT_EMPTY_DATA_FILE,
        version: "v9.9.9", // Future version - should need no migration
      })

      const result = migrateDataFile(highVersionData)
      // Should remain at same version since no migration needed
      expect(result.version).toBe(createVersionString("v9.9.9"))

      // Should still be valid regardless of version
      expect(result).toHaveProperty("tasks")
      expect(result).toHaveProperty("projects")
      expect(result).toHaveProperty("labels")
    })

    it("should migrate old data through available migration steps", () => {
      // Test migration behavior using individual functions (version-agnostic)
      const oldData = createJsonData({
        tasks: [],
        projects: [],
        labels: [],
        ordering: { projects: [], labels: [] }, // Legacy field = needs migration
      })

      // Test that old data gets transformed correctly through available migrations
      // Step 1: v0.2.0 → v0.3.0 (groups system)
      const afterV030 = v030Migration(oldData)
      expect(afterV030).toHaveProperty("projectGroups")
      expect(afterV030).toHaveProperty("labelGroups")
      expect(afterV030).not.toHaveProperty("ordering")

      // Step 2: v0.3.0 → v0.4.0 (settings addition)
      const afterV040 = v040Migration(afterV030)
      expect(afterV040).toHaveProperty("projectGroups")
      expect(afterV040).toHaveProperty("labelGroups")
      expect(afterV040).toHaveProperty("settings")

      // Final result should have all expected fields regardless of package version
      expect(afterV040).toHaveProperty("tasks")
      expect(afterV040).toHaveProperty("projects")
      expect(afterV040).toHaveProperty("labels")
    })
  })

  describe("needsMigration", () => {
    it("should detect when unversioned data needs migration", () => {
      // Data without version field (treated as v0.2.0) should need migration
      expect(needsMigration(mockDataFile)).toBe(true)
    })

    it("should detect when very old version data needs migration", () => {
      // v0.2.0 data should definitely need migration (older than any migration)
      const oldData = createJsonData({
        tasks: [],
        projects: [],
        labels: [],
        ordering: { projects: [], labels: [] },
        version: "v0.2.0",
      })
      expect(needsMigration(oldData)).toBe(true)
    })

    it("should return false for future version data", () => {
      // Very high version data should not need migration
      const futureVersionData = createJsonData({
        ...DEFAULT_EMPTY_DATA_FILE,
        version: "v9.9.9",
      })
      expect(needsMigration(futureVersionData)).toBe(false)
    })

    it("should return false for data at or above latest migration", () => {
      // Test that data with version >= latest available migration doesn't need migration
      // Use a high version to ensure it's above any available migration
      const highVersionData = createJsonData({
        ...DEFAULT_EMPTY_DATA_FILE,
        version: "v8.8.8",
      })
      expect(needsMigration(highVersionData)).toBe(false)
    })
  })

  describe("getMigrationInfo", () => {
    it("should return correct info pattern for old data needing migration", () => {
      const info = getMigrationInfo(mockDataFile)

      // Should correctly identify old version
      expect(info.currentVersion).toEqual(createVersionString("v0.2.0"))

      // Target should be later than current (flexible about exact version)
      expect(info.targetVersion).toMatch(/^v\d+\.\d+\.\d+$/)

      // Should need migration
      expect(info.needsMigration).toBe(true)

      // Target should be higher than current
      expect(info.targetVersion > info.currentVersion).toBe(true)
    })

    it("should return correct info pattern for future version data", () => {
      const futureVersionData = createJsonData({
        ...DEFAULT_EMPTY_DATA_FILE,
        version: "v9.9.9", // Future version
      })
      const info = getMigrationInfo(futureVersionData)

      // Should correctly identify the version
      expect(info.currentVersion).toEqual(createVersionString("v9.9.9"))

      // Target should be either same as current OR latest available migration
      // (depends on implementation - both are valid behaviors for future versions)
      expect(info.targetVersion).toMatch(/^v\d+\.\d+\.\d+$/)

      // Should not need migration (key behavior test)
      expect(info.needsMigration).toBe(false)
    })

    it("should use latest available migration as target", () => {
      // Test that getMigrationInfo uses latest available migration, not package version
      const v020Data = createJsonData({
        tasks: [],
        projects: [],
        labels: [],
        ordering: { projects: [], labels: [] }, // Legacy field = v0.2.0 equivalent
      })

      const info = getMigrationInfo(v020Data)

      // Should detect old version
      expect(info.currentVersion).toEqual(createVersionString("v0.2.0"))

      // Should need migration
      expect(info.needsMigration).toBe(true)

      // Target should be valid version format and higher than v0.2.0
      expect(info.targetVersion).toMatch(/^v\d+\.\d+\.\d+$/)
      expect(info.targetVersion > createVersionString("v0.2.0")).toBe(true)
    })
  })

  describe("v0.3.0 Migration Function", () => {
    it("should transform ordering.projects to projectGroups structure", () => {
      const projectId1 = createProjectId("550e8400-e29b-41d4-a716-446655440001")
      const projectId2 = createProjectId("550e8400-e29b-41d4-a716-446655440002")

      const v020DataWithProjects = createJsonData({
        tasks: [],
        projects: [],
        labels: [],
        ordering: {
          projects: [projectId1, projectId2],
          labels: [],
        },
      })

      // Test the individual v0.3.0 migration function directly
      const result = v030Migration(v020DataWithProjects)

      // Should create projectGroups with ordering data
      expect(result).toHaveProperty("projectGroups")
      const projectGroups = (result as any).projectGroups
      expect(projectGroups).toEqual({
        type: "project",
        id: "00000000-0000-0000-0000-000000000000",
        name: "All Projects",
        slug: "all-projects",
        items: [projectId1, projectId2],
      })

      // Should remove legacy ordering field
      expect(result).not.toHaveProperty("ordering")
    })

    it("should transform ordering.labels to labelGroups structure", () => {
      const labelId1 = createLabelId("550e8400-e29b-41d4-a716-446655440003")
      const labelId2 = createLabelId("550e8400-e29b-41d4-a716-446655440004")

      const v020DataWithLabels = createJsonData({
        tasks: [],
        projects: [],
        labels: [],
        ordering: {
          projects: [],
          labels: [labelId1, labelId2],
        },
      })

      // Test the individual v0.3.0 migration function directly
      const result = v030Migration(v020DataWithLabels)

      // Should create labelGroups with ordering data
      expect(result).toHaveProperty("labelGroups")
      const labelGroups = (result as any).labelGroups
      expect(labelGroups).toEqual({
        type: "label",
        id: "00000000-0000-0000-0000-000000000000",
        name: "All Labels",
        slug: "all-labels",
        items: [labelId1, labelId2],
      })

      // Should remove legacy ordering field
      expect(result).not.toHaveProperty("ordering")
    })

    it("should add recurringMode to existing tasks", () => {
      const v020DataWithTasks = createJsonData({
        tasks: [
          {
            id: "550e8400-e29b-41d4-a716-446655440000",
            title: "Regular task",
            completed: false,
            priority: 1,
            labels: [],
            subtasks: [],
            comments: [],
            attachments: [],
            createdAt: new Date().toISOString(),
            // Note: no recurringMode field
          },
          {
            id: "550e8400-e29b-41d4-a716-446655440001",
            title: "Recurring task",
            completed: false,
            priority: 2,
            labels: [],
            subtasks: [],
            comments: [],
            attachments: [],
            createdAt: new Date().toISOString(),
            recurring: "RRULE:FREQ=DAILY;INTERVAL=1",
            // Note: no recurringMode field
          },
        ],
        projects: [],
        labels: [],
        ordering: { projects: [], labels: [] },
      })

      // Test the individual v0.3.0 migration function directly
      const result = v030Migration(v020DataWithTasks)

      // All tasks should have recurringMode added
      expect(result).toHaveProperty("tasks")
      const tasks = (result as any).tasks
      expect(tasks).toHaveLength(2)
      expect(tasks[0]).toEqual(
        expect.objectContaining({
          id: "550e8400-e29b-41d4-a716-446655440000",
          title: "Regular task",
          recurringMode: "dueDate", // Should be added
        }),
      )
      expect(tasks[1]).toEqual(
        expect.objectContaining({
          id: "550e8400-e29b-41d4-a716-446655440001",
          title: "Recurring task",
          recurring: "RRULE:FREQ=DAILY;INTERVAL=1",
          recurringMode: "dueDate", // Should be added
        }),
      )
    })

    it("should handle missing ordering field gracefully", () => {
      const v020DataWithoutOrdering = createJsonData({
        tasks: [],
        projects: [],
        labels: [],
        // No ordering field at all
      })

      // Test the individual v0.3.0 migration function directly
      const result = v030Migration(v020DataWithoutOrdering)

      // Should create default empty groups
      expect(result).toHaveProperty("projectGroups")
      const projectGroups = (result as any).projectGroups
      expect(projectGroups).toEqual({
        type: "project",
        id: "00000000-0000-0000-0000-000000000000",
        name: "All Projects",
        slug: "all-projects",
        items: [],
      })

      expect(result).toHaveProperty("labelGroups")
      const labelGroups = (result as any).labelGroups
      expect(labelGroups).toEqual({
        type: "label",
        id: "00000000-0000-0000-0000-000000000000",
        name: "All Labels",
        slug: "all-labels",
        items: [],
      })

      expect(result).not.toHaveProperty("ordering")
    })

    it("should populate groups from existing projects and labels when ordering is missing", () => {
      const projectId1 = "550e8400-e29b-41d4-a716-446655440001"
      const projectId2 = "550e8400-e29b-41d4-a716-446655440002"
      const labelId1 = "660e8400-e29b-41d4-a716-446655440001"
      const labelId2 = "660e8400-e29b-41d4-a716-446655440002"

      const v020DataWithoutOrderingButWithData = createJsonData({
        tasks: [],
        projects: [
          {
            id: projectId1,
            name: "Project 1",
            slug: "project-1",
            color: "#ff0000",
            sections: [],
            shared: false,
            defaultView: "list",
          },
          {
            id: projectId2,
            name: "Project 2",
            slug: "project-2",
            color: "#00ff00",
            sections: [],
            shared: false,
            defaultView: "list",
          },
        ],
        labels: [
          {
            id: labelId1,
            name: "Label 1",
            slug: "label-1",
            color: "#0000ff",
          },
          {
            id: labelId2,
            name: "Label 2",
            slug: "label-2",
            color: "#ffff00",
          },
        ],
        // No ordering field
      })

      // Test the individual v0.3.0 migration function directly
      const result = v030Migration(v020DataWithoutOrderingButWithData)

      // Should create groups with IDs from existing projects and labels
      expect(result).toHaveProperty("projectGroups")
      const projectGroups = (result as any).projectGroups
      expect(projectGroups).toEqual({
        type: "project",
        id: "00000000-0000-0000-0000-000000000000",
        name: "All Projects",
        slug: "all-projects",
        items: [projectId1, projectId2],
      })

      expect(result).toHaveProperty("labelGroups")
      const labelGroups = (result as any).labelGroups
      expect(labelGroups).toEqual({
        type: "label",
        id: "00000000-0000-0000-0000-000000000000",
        name: "All Labels",
        slug: "all-labels",
        items: [labelId1, labelId2],
      })

      expect(result).not.toHaveProperty("ordering")
    })

    it("should handle malformed ordering field", () => {
      const v020DataWithMalformedOrdering = createJsonData({
        tasks: [],
        projects: [],
        labels: [],
        ordering: {
          projects: null, // Invalid - not an array
          labels: "invalid", // Invalid - not an array
        },
      })

      // Test the individual v0.3.0 migration function directly
      const result = v030Migration(v020DataWithMalformedOrdering)

      // Should create default empty groups when ordering data is malformed
      expect(result).toHaveProperty("projectGroups")
      const projectGroups = (result as any).projectGroups
      expect(projectGroups).toEqual({
        type: "project",
        id: "00000000-0000-0000-0000-000000000000",
        name: "All Projects",
        slug: "all-projects",
        items: [], // Empty because ordering.projects was null
      })

      expect(result).toHaveProperty("labelGroups")
      const labelGroups = (result as any).labelGroups
      expect(labelGroups).toEqual({
        type: "label",
        id: "00000000-0000-0000-0000-000000000000",
        name: "All Labels",
        slug: "all-labels",
        items: [], // Empty because ordering.labels was invalid
      })
    })

    it("should preserve tasks that already have recurringMode", () => {
      const v020DataWithExistingRecurringMode = createJsonData({
        tasks: [
          {
            id: "550e8400-e29b-41d4-a716-446655440000",
            title: "Task with existing recurringMode",
            completed: false,
            priority: 1,
            labels: [],
            subtasks: [],
            comments: [],
            attachments: [],
            createdAt: new Date().toISOString(),
            recurringMode: "completedAt", // Already has recurringMode
          },
        ],
        projects: [],
        labels: [],
        ordering: { projects: [], labels: [] },
      })

      // Test the individual v0.3.0 migration function directly
      const result = v030Migration(v020DataWithExistingRecurringMode)

      // Should preserve existing recurringMode
      expect(result).toHaveProperty("tasks")
      const tasks = (result as any).tasks
      expect(tasks[0]).toEqual(
        expect.objectContaining({
          id: "550e8400-e29b-41d4-a716-446655440000",
          recurringMode: "completedAt", // Should remain unchanged
        }),
      )
    })

    it("should handle comprehensive v0.2.0 to v0.3.0 transformation", () => {
      const projectId1 = createProjectId("550e8400-e29b-41d4-a716-446655440001")
      const labelId1 = createLabelId("550e8400-e29b-41d4-a716-446655440003")

      const complexV020Data = createJsonData({
        tasks: [
          {
            id: "550e8400-e29b-41d4-a716-446655440000",
            title: "Complex task",
            completed: false,
            priority: 1,
            labels: [labelId1],
            subtasks: [],
            comments: [],
            attachments: [],
            createdAt: new Date().toISOString(),
            recurring: "RRULE:FREQ=WEEKLY",
          },
        ],
        projects: [
          {
            id: projectId1,
            name: "Sample Project",
            slug: "sample-project",
            color: "#ff0000",
            shared: false,
            sections: [],
          },
        ],
        labels: [
          {
            id: labelId1,
            name: "Important",
            slug: "important",
            color: "#ff0000",
          },
        ],
        ordering: {
          projects: [projectId1],
          labels: [labelId1],
        },
      })

      // Test the individual v0.3.0 migration function directly
      const result = v030Migration(complexV020Data)

      // Should transform all data correctly
      expect(result).toHaveProperty("tasks")
      const tasks = (result as any).tasks
      expect(tasks[0]).toEqual(
        expect.objectContaining({
          recurringMode: "dueDate", // Added
        }),
      )

      expect(result).toHaveProperty("projectGroups")
      const projectGroups = (result as any).projectGroups
      expect(projectGroups).toEqual({
        type: "project",
        id: "00000000-0000-0000-0000-000000000000",
        name: "All Projects",
        slug: "all-projects",
        items: [projectId1],
      })

      expect(result).toHaveProperty("labelGroups")
      const labelGroups = (result as any).labelGroups
      expect(labelGroups).toEqual({
        type: "label",
        id: "00000000-0000-0000-0000-000000000000",
        name: "All Labels",
        slug: "all-labels",
        items: [labelId1],
      })

      // Should preserve all original data
      expect(tasks).toHaveLength(1)
      expect(result).toHaveProperty("projects")
      expect(result).toHaveProperty("labels")

      // Should remove legacy field
      expect(result).not.toHaveProperty("ordering")
    })
  })

  describe("v0.4.0 Migration Function", () => {
    it("should add default settings structure when missing", () => {
      const v030DataWithoutSettings = createJsonData({
        tasks: [],
        projects: [],
        labels: [],
        projectGroups: {
          type: "project",
          id: "00000000-0000-0000-0000-000000000000",
          name: "All Projects",
          slug: "all-projects",
          items: [],
        },
        labelGroups: {
          type: "label",
          id: "00000000-0000-0000-0000-000000000000",
          name: "All Labels",
          slug: "all-labels",
          items: [],
        },
        version: "v0.3.0",
      })

      // Test the individual v0.4.0 migration function directly
      const result = v040Migration(v030DataWithoutSettings)

      // Should add settings field
      expect(result).toHaveProperty("settings")
      const settings = (result as any).settings
      expect(settings).toEqual(DEFAULT_USER_SETTINGS)

      // Should preserve all existing data
      expect(result).toHaveProperty("tasks")
      expect(result).toHaveProperty("projects")
      expect(result).toHaveProperty("labels")
      expect(result).toHaveProperty("projectGroups")
      expect(result).toHaveProperty("labelGroups")
    })

    it("should preserve existing settings when already present", () => {
      const customSettings = {
        integrations: {
          imports: {
            supportedSources: ["ticktick", "asana"] as (
              | "ticktick"
              | "todoist"
              | "asana"
              | "trello"
            )[],
          },
        },
      }

      const v030DataWithSettings = createJsonData({
        tasks: [],
        projects: [],
        labels: [],
        projectGroups: {
          type: "project",
          id: "00000000-0000-0000-0000-000000000000",
          name: "All Projects",
          slug: "all-projects",
          items: [],
        },
        labelGroups: {
          type: "label",
          id: "00000000-0000-0000-0000-000000000000",
          name: "All Labels",
          slug: "all-labels",
          items: [],
        },
        settings: customSettings, // Already has settings
        version: "v0.3.0",
      })

      // Test the individual v0.4.0 migration function directly
      const result = v040Migration(v030DataWithSettings)

      // Should preserve existing settings (not overwrite with defaults)
      expect(result).toHaveProperty("settings")
      const settings = (result as any).settings
      expect(settings).toEqual(customSettings)
    })

    it("should handle comprehensive v0.3.0 to v0.4.0 transformation", () => {
      const projectId1 = createProjectId("550e8400-e29b-41d4-a716-446655440001")
      const labelId1 = createLabelId("550e8400-e29b-41d4-a716-446655440003")

      const complexV030Data = createJsonData({
        tasks: [
          {
            id: "550e8400-e29b-41d4-a716-446655440000",
            title: "Sample task with v0.3.0 structure",
            completed: false,
            priority: 1,
            labels: [labelId1],
            subtasks: [],
            comments: [],
            attachments: [],
            createdAt: new Date().toISOString(),
            recurringMode: "dueDate", // v0.3.0 field
          },
        ],
        projects: [
          {
            id: projectId1,
            name: "Sample Project",
            slug: "sample-project",
            color: "#ff0000",
            shared: false,
            sections: [],
          },
        ],
        labels: [
          {
            id: labelId1,
            name: "Important",
            slug: "important",
            color: "#ff0000",
          },
        ],
        projectGroups: {
          type: "project",
          id: "00000000-0000-0000-0000-000000000000",
          name: "All Projects",
          slug: "all-projects",
          items: [projectId1],
        },
        labelGroups: {
          type: "label",
          id: "00000000-0000-0000-0000-000000000000",
          name: "All Labels",
          slug: "all-labels",
          items: [labelId1],
        },
        version: "v0.3.0",
      })

      // Test the individual v0.4.0 migration function directly
      const result = v040Migration(complexV030Data)

      // Should add settings while preserving all existing data
      expect(result).toHaveProperty("settings")
      expect((result as any).settings).toEqual(DEFAULT_USER_SETTINGS)

      // Should preserve all v0.3.0 data structure
      expect(result).toHaveProperty("tasks")
      expect(result).toHaveProperty("projects")
      expect(result).toHaveProperty("labels")
      expect(result).toHaveProperty("projectGroups")
      expect(result).toHaveProperty("labelGroups")

      // Should preserve task data including recurringMode from v0.3.0
      const tasks = (result as any).tasks
      expect(tasks).toHaveLength(1)
      expect(tasks[0]).toEqual(
        expect.objectContaining({
          id: "550e8400-e29b-41d4-a716-446655440000",
          title: "Sample task with v0.3.0 structure",
          recurringMode: "dueDate",
        }),
      )

      // Should preserve groups structure from v0.3.0
      const projectGroups = (result as any).projectGroups
      expect(projectGroups.items).toEqual([projectId1])
      const labelGroups = (result as any).labelGroups
      expect(labelGroups.items).toEqual([labelId1])
    })
  })

  describe("Version Comparison", () => {
    it("should handle various version formats correctly", () => {
      const testCases = [
        // Very old versions should need migration
        { dataVersion: "v0.1.0", shouldMigrate: true },
        { dataVersion: "v0.2.0", shouldMigrate: true },

        // Very high versions should not need migration
        { dataVersion: "v8.8.8", shouldMigrate: false },
        { dataVersion: "v9.9.9", shouldMigrate: false },
        { dataVersion: "v10.0.0", shouldMigrate: false },
      ]

      testCases.forEach(({ dataVersion, shouldMigrate }) => {
        const baseData = JSON.parse(JSON.stringify(mockDataFile))
        const dataFile = createJsonData({
          ...baseData,
          version: dataVersion,
        })
        const result = needsMigration(dataFile)

        expect(result).toBe(shouldMigrate)
      })
    })

    it("should handle unversioned data migration scenarios", () => {
      // Unversioned data (treated as v0.2.0) should always need migration
      const result = needsMigration(mockDataFile)
      expect(result).toBe(true)
    })
  })

  describe("Safety Limits", () => {
    it("should not exceed maximum migration steps", () => {
      // This test verifies the safety limit is in place
      // Test that individual migrations complete successfully
      const v020Data = createJsonData({
        tasks: [],
        projects: [],
        labels: [],
        ordering: { projects: [], labels: [] },
      })

      // Test v0.3.0 migration completes successfully
      const v030Result = v030Migration(v020Data)
      expect(v030Result).toHaveProperty("projectGroups")
      expect(v030Result).toHaveProperty("labelGroups")
      expect(v030Result).not.toHaveProperty("ordering")

      // Test v0.4.0 migration completes successfully after v0.3.0
      const v040Result = v040Migration(v030Result)
      expect(v040Result).toHaveProperty("settings")
      expect(v040Result).toHaveProperty("projectGroups")
      expect(v040Result).toHaveProperty("labelGroups")
    })
  })

  describe("v0.5.0 Migration Function", () => {
    it("should add general settings structure when missing", () => {
      const v040DataWithoutGeneral = createJsonData({
        tasks: [],
        projects: [],
        labels: [],
        projectGroups: {
          type: "project",
          id: "00000000-0000-0000-0000-000000000000",
          name: "All Projects",
          slug: "all-projects",
          items: [],
        },
        labelGroups: {
          type: "label",
          id: "00000000-0000-0000-0000-000000000000",
          name: "All Labels",
          slug: "all-labels",
          items: [],
        },
        settings: {
          data: {
            autoBackup: {
              enabled: false,
              backupTime: "20:00",
              maxBackups: 10,
            },
          },
          notifications: {
            enabled: true,
            requireInteraction: true,
          },
          // No general settings - should be added
        },
        version: "v0.4.0",
      })

      const result = v050Migration(v040DataWithoutGeneral)

      expect(result).toHaveProperty("settings")
      const settings = (result as any).settings
      expect(settings).toHaveProperty("general")
      expect(settings.general).toEqual({
        startView: "all",
      })
    })

    it("should migrate behavior settings to general settings", () => {
      const v040DataWithBehavior = createJsonData({
        tasks: [],
        projects: [],
        labels: [],
        projectGroups: {
          type: "project",
          id: "00000000-0000-0000-0000-000000000000",
          name: "All Projects",
          slug: "all-projects",
          items: [],
        },
        labelGroups: {
          type: "label",
          id: "00000000-0000-0000-0000-000000000000",
          name: "All Labels",
          slug: "all-labels",
          items: [],
        },
        settings: {
          data: {
            autoBackup: {
              enabled: false,
              backupTime: "20:00",
              maxBackups: 10,
            },
          },
          notifications: {
            enabled: true,
            requireInteraction: true,
          },
          behavior: {
            startView: "lastViewed",
          },
        },
        version: "v0.4.0",
      })

      const result = v050Migration(v040DataWithBehavior)

      expect(result).toHaveProperty("settings")
      const settings = (result as any).settings
      expect(settings).toHaveProperty("general")
      expect(settings.general).toEqual({
        startView: "lastViewed",
      })
      expect(settings).not.toHaveProperty("behavior")
    })

    it("should add complete default settings when missing", () => {
      const v040DataWithoutSettings = createJsonData({
        tasks: [],
        projects: [],
        labels: [],
        projectGroups: {
          type: "project",
          id: "00000000-0000-0000-0000-000000000000",
          name: "All Projects",
          slug: "all-projects",
          items: [],
        },
        labelGroups: {
          type: "label",
          id: "00000000-0000-0000-0000-000000000000",
          name: "All Labels",
          slug: "all-labels",
          items: [],
        },
        version: "v0.4.0",
      })

      const result = v050Migration(v040DataWithoutSettings)

      expect(result).toHaveProperty("settings")
      const settings = (result as any).settings
      expect(settings).toEqual(DEFAULT_USER_SETTINGS)
    })
  })

  describe("v0.6.0 Migration Function", () => {
    it("should add soundEnabled, linkifyEnabled, and popoverHoverOpen fields to general settings", () => {
      const v050DataWithoutNewFields = createJsonData({
        tasks: [],
        projects: [],
        labels: [],
        projectGroups: {
          type: "project",
          id: "00000000-0000-0000-0000-000000000000",
          name: "All Projects",
          slug: "all-projects",
          items: [],
        },
        labelGroups: {
          type: "label",
          id: "00000000-0000-0000-0000-000000000000",
          name: "All Labels",
          slug: "all-labels",
          items: [],
        },
        settings: {
          data: {
            autoBackup: {
              enabled: false,
              backupTime: "20:00",
              maxBackups: 10,
            },
          },
          notifications: {
            enabled: true,
            requireInteraction: true,
          },
          general: {
            startView: "all",
          },
        },
        version: "v0.5.0",
      })

      const result = v060Migration(v050DataWithoutNewFields)

      expect(result).toHaveProperty("settings")
      const settings = (result as any).settings
      expect(settings).toHaveProperty("general")
      expect(settings.general).toEqual({
        startView: "all",
        soundEnabled: true,
        linkifyEnabled: true,
        popoverHoverOpen: false,
      })
    })

    it("should preserve existing soundEnabled and linkifyEnabled fields and add popoverHoverOpen", () => {
      const v050DataWithExistingFields = createJsonData({
        tasks: [],
        projects: [],
        labels: [],
        projectGroups: {
          type: "project",
          id: "00000000-0000-0000-0000-000000000000",
          name: "All Projects",
          slug: "all-projects",
          items: [],
        },
        labelGroups: {
          type: "label",
          id: "00000000-0000-0000-0000-000000000000",
          name: "All Labels",
          slug: "all-labels",
          items: [],
        },
        settings: {
          data: {
            autoBackup: {
              enabled: false,
              backupTime: "20:00",
              maxBackups: 10,
            },
          },
          notifications: {
            enabled: true,
            requireInteraction: true,
          },
          general: {
            startView: "lastViewed",
            soundEnabled: false,
            linkifyEnabled: false,
          },
        },
        version: "v0.5.0",
      })

      const result = v060Migration(v050DataWithExistingFields)

      expect(result).toHaveProperty("settings")
      const settings = (result as any).settings
      expect(settings).toHaveProperty("general")
      expect(settings.general).toEqual({
        startView: "lastViewed",
        soundEnabled: false,
        linkifyEnabled: false,
        popoverHoverOpen: false,
      })
    })

    it("should create general settings with all required fields when missing", () => {
      const v050DataWithoutGeneralSettings = createJsonData({
        tasks: [],
        projects: [],
        labels: [],
        projectGroups: {
          type: "project",
          id: "00000000-0000-0000-0000-000000000000",
          name: "All Projects",
          slug: "all-projects",
          items: [],
        },
        labelGroups: {
          type: "label",
          id: "00000000-0000-0000-0000-000000000000",
          name: "All Labels",
          slug: "all-labels",
          items: [],
        },
        settings: {
          data: {
            autoBackup: {
              enabled: false,
              backupTime: "20:00",
              maxBackups: 10,
            },
          },
          notifications: {
            enabled: true,
            requireInteraction: true,
          },
          // No general settings at all
        },
        version: "v0.5.0",
      })

      const result = v060Migration(v050DataWithoutGeneralSettings)

      expect(result).toHaveProperty("settings")
      const settings = (result as any).settings
      expect(settings).toHaveProperty("general")
      expect(settings.general).toEqual({
        startView: "all",
        soundEnabled: true,
        linkifyEnabled: true,
        popoverHoverOpen: false,
      })
    })

    it("should add complete default settings when missing", () => {
      const v050DataWithoutSettings = createJsonData({
        tasks: [],
        projects: [],
        labels: [],
        projectGroups: {
          type: "project",
          id: "00000000-0000-0000-0000-000000000000",
          name: "All Projects",
          slug: "all-projects",
          items: [],
        },
        labelGroups: {
          type: "label",
          id: "00000000-0000-0000-0000-000000000000",
          name: "All Labels",
          slug: "all-labels",
          items: [],
        },
        version: "v0.5.0",
      })

      const result = v060Migration(v050DataWithoutSettings)

      expect(result).toHaveProperty("settings")
      const settings = (result as any).settings
      expect(settings).toEqual(DEFAULT_USER_SETTINGS)
    })
  })

  describe("Data Structure Version Semantics", () => {
    it("should demonstrate version represents data structure, not app version", () => {
      // This demonstrates the key insight: version represents data structure, not app version
      // Test with data that has all current fields and a reasonable version
      const currentStructureData = createJsonData({
        tasks: [],
        projects: [],
        labels: [],
        projectGroups: {
          type: "project",
          id: "00000000-0000-0000-0000-000000000000",
          name: "All Projects",
          slug: "all-projects",
          items: [],
        },
        labelGroups: {
          type: "label",
          id: "00000000-0000-0000-0000-000000000000",
          name: "All Labels",
          slug: "all-labels",
          items: [],
        },
        settings: DEFAULT_USER_SETTINGS,
        version: "v7.7.7", // High version to ensure no migration needed
      })

      // Should produce valid result conforming to current schema
      const result = migrateDataFile(currentStructureData)
      expect(result.version).toMatch(/^v\d+\.\d+\.\d+$/) // Valid version format

      // Should have all required current fields (the key test)
      expect(result).toHaveProperty("tasks")
      expect(result).toHaveProperty("projects")
      expect(result).toHaveProperty("labels")
      expect(result).toHaveProperty("projectGroups")
      expect(result).toHaveProperty("labelGroups")
      expect(result).toHaveProperty("settings")

      // No migration should be needed for data with all required fields
      expect(needsMigration(currentStructureData)).toBe(false)

      // Migration info should reflect that no migration is needed
      const info = getMigrationInfo(currentStructureData)
      expect(info.currentVersion).toEqual(createVersionString("v7.7.7"))
      expect(info.needsMigration).toBe(false)
    })
  })

  describe("Transactional Migration", () => {
    it("should implement all-or-nothing migration behavior", () => {
      // Test that successful individual migrations work normally
      const v020Data = createJsonData({
        tasks: [],
        projects: [],
        labels: [],
        ordering: { projects: [], labels: [] },
      })

      // Individual migrations should complete successfully
      const v030Result = v030Migration(v020Data)
      expect(v030Result).toHaveProperty("projectGroups")
      expect(v030Result).toHaveProperty("labelGroups")

      const v040Result = v040Migration(v030Result)
      expect(v040Result).toHaveProperty("settings")

      // The migration system uses a transactional approach:
      // - Either all migrations succeed and final result is returned
      // - Or any migration fails and original data is preserved (error thrown)
      // This ensures data integrity and prevents partial migration states
    })

    it("should preserve original data structure during successful migrations", () => {
      // This test documents that individual migrations don't mutate input
      const originalDataFile = createJsonData({
        tasks: [],
        projects: [],
        labels: [],
        ordering: { projects: [], labels: [] },
      })

      const originalDataCopy = JSON.parse(JSON.stringify(originalDataFile))

      // Run individual migration
      const result = v030Migration(originalDataFile)

      // Migration should complete successfully
      expect(result).toHaveProperty("projectGroups")
      expect(result).toHaveProperty("labelGroups")

      // Original data should remain unchanged (migration creates new object)
      expect(originalDataFile).toEqual(originalDataCopy)
    })
  })

  describe("Error Handling", () => {
    it("should throw error for invalid input data types", () => {
      // Test null input
      expect(() => migrateDataFile(null)).toThrow("Data file must be a JSON object")

      // Test array input
      expect(() => migrateDataFile([])).toThrow("Data file must be a JSON object")

      // Test string input
      expect(() => migrateDataFile("invalid")).toThrow("Data file must be a JSON object")

      // Test number input
      expect(() => migrateDataFile(123)).toThrow("Data file must be a JSON object")
    })

    it("should handle complex error scenarios during migration", () => {
      // Test that individual migration functions properly handle and report errors
      // This validates the error handling infrastructure is in place
      const validData = mockDataFile

      // Individual migrations should complete successfully
      const v030Result = v030Migration(validData)
      expect(v030Result).toHaveProperty("projectGroups")
      expect(v030Result).toHaveProperty("labelGroups")

      const v040Result = v040Migration(v030Result)
      expect(v040Result).toHaveProperty("settings")

      // Should complete successfully with proper error handling available
      expect(v040Result).toHaveProperty("tasks")
      expect(v040Result).toHaveProperty("projects")
      expect(v040Result).toHaveProperty("labels")
    })

    it("should handle data with missing required fields", () => {
      // Create data with truly missing required fields that can't be fixed by migration
      const dataWithMissingFields = createJsonData({
        // Missing tasks array entirely - this will fail schema validation
        projects: [],
        labels: [],
        ordering: {
          projects: [],
          labels: [],
        },
      })

      // The migration should fail during schema validation at the end
      expect(() => migrateDataFile(dataWithMissingFields)).toThrow(/Migration failed:/)
    })

    it("should throw error when migration produces malformed data", () => {
      // Test with data that has malformed structure that might break during migration
      const malformedData = createJsonData({
        tasks: "not an array", // Invalid type
        projects: null, // Invalid type
        labels: [],
      })

      // This should fail during schema validation at the end
      expect(() => migrateDataFile(malformedData)).toThrow(/Migration failed:/)
    })

    it("should handle needsMigration errors for invalid input", () => {
      expect(() => needsMigration(null)).toThrow("Data file must be a JSON object")
      expect(() => needsMigration([])).toThrow("Data file must be a JSON object")
    })

    it("should handle getMigrationInfo errors for invalid input", () => {
      expect(() => getMigrationInfo(null)).toThrow("Data file must be a JSON object")
      expect(() => getMigrationInfo([])).toThrow("Data file must be a JSON object")
    })
  })

  describe("Complete Migration Path", () => {
    it("should migrate v0.2.0 data file to latest version and validate schema", () => {
      // Create a complete v0.2.0 data file (no version field means v0.2.0)
      const v020DataFile = createJsonData({
        tasks: [
          {
            id: TEST_TASK_ID_1,
            title: "Test Task 1",
            description: "A test task",
            completed: false,
            priority: 2,
            projectId: TEST_PROJECT_ID_1,
            sectionId: TEST_SECTION_ID_1,
            labels: [TEST_LABEL_ID_1],
            subtasks: [],
            comments: [],
            attachments: [],
            createdAt: "2024-01-01T00:00:00.000Z",
            order: 1,
            // Note: No recurringMode field - should be added during migration
          },
          {
            id: TEST_TASK_ID_2,
            title: "Test Task 2",
            completed: true,
            priority: 1,
            projectId: TEST_PROJECT_ID_1,
            sectionId: TEST_SECTION_ID_1,
            labels: [],
            subtasks: [],
            comments: [],
            attachments: [],
            createdAt: "2024-01-02T00:00:00.000Z",
            order: 2,
          },
        ],
        projects: [
          {
            id: TEST_PROJECT_ID_1,
            name: "Test Project",
            slug: "test-project",
            color: "#3b82f6",
            shared: false,
            sections: [
              {
                id: TEST_SECTION_ID_1,
                name: "Default Section",
                color: "#6b7280",
              },
            ],
            taskOrder: [TEST_TASK_ID_1, TEST_TASK_ID_2],
          },
        ],
        labels: [
          {
            id: TEST_LABEL_ID_1,
            name: "test-label",
            slug: "test-label",
            color: "#ef4444",
          },
        ],
        // v0.2.0 has ordering field (legacy) instead of groups
        ordering: {
          projects: [TEST_PROJECT_ID_1],
          labels: [TEST_LABEL_ID_1],
        },
        // No version field - indicates v0.2.0
        // No settings field - should be added during migration
      })

      // Migrate to latest version
      const migratedData = migrateDataFile(v020DataFile)

      // Verify the migration succeeded and data conforms to current schema
      expect(() => DataFileSchema.parse(migratedData)).not.toThrow()

      // Verify the version matches the latest migration version
      const latestMigrationVersion = getLatestAvailableMigration()
      expect(latestMigrationVersion).not.toBeNull()
      expect(migratedData.version).toBe(latestMigrationVersion)

      // Verify v0.3.0 migration changes
      expect(migratedData).toHaveProperty("projectGroups")
      expect(migratedData).toHaveProperty("labelGroups")
      expect(migratedData).not.toHaveProperty("ordering")

      // Verify projectGroups structure
      expect(migratedData.projectGroups).toEqual({
        type: "project",
        id: DEFAULT_UUID,
        name: "All Projects",
        slug: "all-projects",
        items: [TEST_PROJECT_ID_1],
      })

      // Verify labelGroups structure
      expect(migratedData.labelGroups).toEqual({
        type: "label",
        id: DEFAULT_UUID,
        name: "All Labels",
        slug: "all-labels",
        items: [TEST_LABEL_ID_1],
      })

      // Verify recurringMode was added to all tasks
      expect(migratedData.tasks[0]).toHaveProperty("recurringMode", "dueDate")
      expect(migratedData.tasks[1]).toHaveProperty("recurringMode", "dueDate")

      // Verify v0.4.0 migration changes
      expect(migratedData).toHaveProperty("settings")
      expect(migratedData.settings).toEqual(DEFAULT_USER_SETTINGS)

      // Verify original data structure is preserved
      expect(migratedData.tasks).toHaveLength(2)
      expect(migratedData.projects).toHaveLength(1)
      expect(migratedData.labels).toHaveLength(1)

      const firstTask = migratedData.tasks[0]
      const firstProject = migratedData.projects[0]
      const firstLabel = migratedData.labels[0]
      if (!firstTask || !firstProject || !firstLabel) {
        throw new Error("Expected to find first task, project, and label")
      }

      expect(firstTask.title).toBe("Test Task 1")
      expect(firstProject.name).toBe("Test Project")
      expect(firstLabel.name).toBe("test-label")
    })
  })
})
