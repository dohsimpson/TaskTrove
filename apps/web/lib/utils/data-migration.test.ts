/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/consistent-type-assertions */
import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  migrateDataFile,
  needsMigration,
  getMigrationInfo,
  getLatestAvailableMigration,
  v080Migration,
  v0100Migration,
  getRegisteredMigrationVersions,
} from "./data-migration"
import { compareVersions } from "@tasktrove/utils/version"
import type { Json } from "@tasktrove/types/constants"
import { createVersionString, createTaskId } from "@tasktrove/types/id"
import {
  DEFAULT_EMPTY_DATA_FILE,
  DEFAULT_USER_SETTINGS,
  DEFAULT_USER,
  DEFAULT_GENERAL_SETTINGS,
} from "@tasktrove/types/defaults"
import { DEFAULT_UUID } from "@tasktrove/constants"
import { LATEST_DATA_VERSION } from "@tasktrove/types/schema-version"
import {
  TEST_TASK_ID_1,
  TEST_TASK_ID_2,
  TEST_PROJECT_ID_1,
  TEST_LABEL_ID_1,
} from "@tasktrove/types/test-constants"

// Don't mock package.json - let it use the real version
// This prevents issues where schema expectations don't match mocked version during development

describe("Data Migration Utility", () => {
  let mockDataFile: Json

  // Helper function to create Json data without type assertions
  function createJsonData(data: Record<string, unknown>): Json {
    return JSON.parse(JSON.stringify(data))
  }

  beforeEach(() => {
    // Create generic legacy data (intentionally missing version for targeted tests)
    const unmigrated = {
      tasks: [],
      projects: [],
      labels: [],
      ordering: { projects: [], labels: [] }, // Legacy field that should be migrated
    }

    mockDataFile = createJsonData(unmigrated)
    vi.clearAllMocks()
  })

  it("keeps schema version in sync with latest migration", () => {
    const versions = getRegisteredMigrationVersions()
    expect(versions[versions.length - 1]).toBe(LATEST_DATA_VERSION)
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

    it("should reject migration attempts for versions below v0.8.0", () => {
      const legacyData = createJsonData({
        tasks: [],
        projects: [],
        labels: [],
        ordering: { projects: [], labels: [] },
        version: "v0.7.9",
      })

      expect(() => migrateDataFile(legacyData)).toThrow(/Minimum supported version is v0\.8\.0/)
    })

    it("should migrate v0.8.0 data to the latest schema", () => {
      const oldData = createJsonData({
        ...DEFAULT_EMPTY_DATA_FILE,
        version: "v0.8.0",
        settings: {
          ...DEFAULT_USER_SETTINGS,
          general: {
            ...DEFAULT_GENERAL_SETTINGS,
            markdownEnabled: undefined,
          },
        },
      })

      const result = migrateDataFile(oldData)
      expect(result.version).toBe(getLatestAvailableMigration())
      expect(result.settings.general.markdownEnabled).toBeDefined()
    })
  })

  describe("needsMigration", () => {
    it("should throw when version field is missing", () => {
      expect(() => needsMigration(mockDataFile)).toThrow(/version property/)
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
    it("should throw when version field is missing", () => {
      expect(() => getMigrationInfo(mockDataFile)).toThrow(/version property/)
    })

    it("should return correct info pattern for old data needing migration", () => {
      const info = getMigrationInfo(
        createJsonData({
          ...(mockDataFile as Record<string, unknown>),
          version: "v0.2.0",
        }),
      )

      // Should correctly identify old version
      expect(info.currentVersion).toEqual(createVersionString("v0.2.0"))

      // Target should be later than current (flexible about exact version)
      expect(info.targetVersion).toMatch(/^v\d+\.\d+\.\d+$/)

      // Should need migration
      expect(info.needsMigration).toBe(true)

      // Target should be higher than current
      expect(compareVersions(info.targetVersion, info.currentVersion) > 0).toBe(true)
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
        version: "v0.2.0",
      })

      const info = getMigrationInfo(v020Data)

      // Should detect old version
      expect(info.currentVersion).toEqual(createVersionString("v0.2.0"))

      // Should need migration
      expect(info.needsMigration).toBe(true)

      // Target should be valid version format and higher than v0.2.0
      expect(info.targetVersion).toMatch(/^v\d+\.\d+\.\d+$/)
      expect(compareVersions(info.targetVersion, createVersionString("v0.2.0")) > 0).toBe(true)
    })
  })

  describe("v0.8.0 Migration Function", () => {
    it("should add userId to all task comments", () => {
      const taskId1 = TEST_TASK_ID_1
      const taskId2 = TEST_TASK_ID_2

      const v070Data = createJsonData({
        tasks: [
          {
            id: taskId1,
            title: "Task with comments",
            projectId: TEST_PROJECT_ID_1,
            completed: false,
            priority: 1,
            labels: [],
            subtasks: [],
            comments: [
              {
                id: "comment-1",
                content: "First comment",
                createdAt: new Date().toISOString(),
                // No userId - should be added
              },
              {
                id: "comment-2",
                content: "Second comment",
                createdAt: new Date().toISOString(),
                // No userId - should be added
              },
            ],
            createdAt: new Date().toISOString(),
            recurringMode: "dueDate",
          },
          {
            id: taskId2,
            title: "Task without comments",
            projectId: TEST_PROJECT_ID_1,
            completed: false,
            priority: 2,
            labels: [],
            subtasks: [],
            comments: [],
            createdAt: new Date().toISOString(),
            recurringMode: "dueDate",
          },
        ],
        projects: [],
        labels: [],
        projectGroups: {
          type: "project",
          id: DEFAULT_UUID,
          name: "All Projects",
          slug: "all-projects",
          items: [],
        },
        labelGroups: {
          type: "label",
          id: DEFAULT_UUID,
          name: "All Labels",
          slug: "all-labels",
          items: [],
        },
        settings: DEFAULT_USER_SETTINGS,
        user: {
          username: "admin",
          password: "",
          // No id field - should be added
        },
        version: "v0.7.0",
      })

      const result = v080Migration(v070Data)

      // Verify userId was added to all comments
      const tasks = (result as any).tasks
      expect(tasks).toHaveLength(2)

      const task1 = tasks[0]
      expect(task1.comments).toHaveLength(2)
      expect(task1.comments[0]).toHaveProperty("userId", DEFAULT_UUID)
      expect(task1.comments[1]).toHaveProperty("userId", DEFAULT_UUID)

      // Verify id was added to user object
      expect(result).toHaveProperty("user")
      const user = (result as any).user
      expect(user).toHaveProperty("id", DEFAULT_UUID)
      expect(user).toHaveProperty("username", "admin")
    })

    it("should preserve existing userId in comments", () => {
      const existingUserId = "existing-user-id"
      const v070Data = createJsonData({
        tasks: [
          {
            id: TEST_TASK_ID_1,
            title: "Task with existing userId in comments",
            projectId: TEST_PROJECT_ID_1,
            completed: false,
            priority: 1,
            labels: [],
            subtasks: [],
            comments: [
              {
                id: "comment-1",
                userId: existingUserId, // Already has userId
                content: "Comment with existing userId",
                createdAt: new Date().toISOString(),
              },
            ],
            createdAt: new Date().toISOString(),
            recurringMode: "dueDate",
          },
        ],
        projects: [],
        labels: [],
        projectGroups: {
          type: "project",
          id: DEFAULT_UUID,
          name: "All Projects",
          slug: "all-projects",
          items: [],
        },
        labelGroups: {
          type: "label",
          id: DEFAULT_UUID,
          name: "All Labels",
          slug: "all-labels",
          items: [],
        },
        settings: DEFAULT_USER_SETTINGS,
        user: DEFAULT_USER,
        version: "v0.7.0",
      })

      const result = v080Migration(v070Data)

      // Verify existing userId is preserved
      const tasks = (result as any).tasks
      expect(tasks[0].comments[0]).toHaveProperty("userId", existingUserId)
    })

    it("should add id to user object when missing", () => {
      const v070Data = createJsonData({
        tasks: [],
        projects: [],
        labels: [],
        projectGroups: {
          type: "project",
          id: DEFAULT_UUID,
          name: "All Projects",
          slug: "all-projects",
          items: [],
        },
        labelGroups: {
          type: "label",
          id: DEFAULT_UUID,
          name: "All Labels",
          slug: "all-labels",
          items: [],
        },
        settings: DEFAULT_USER_SETTINGS,
        user: {
          username: "testuser",
          password: "hashedpassword",
          // No id field
        },
        version: "v0.7.0",
      })

      const result = v080Migration(v070Data)

      // Verify id was added to user
      const user = (result as any).user
      expect(user).toHaveProperty("id", DEFAULT_UUID)
      expect(user).toHaveProperty("username", "testuser")
      expect(user).toHaveProperty("password", "hashedpassword")
    })

    it("should preserve existing id in user object", () => {
      const existingUserId = "existing-user-id-123"
      const v070Data = createJsonData({
        tasks: [],
        projects: [],
        labels: [],
        projectGroups: {
          type: "project",
          id: DEFAULT_UUID,
          name: "All Projects",
          slug: "all-projects",
          items: [],
        },
        labelGroups: {
          type: "label",
          id: DEFAULT_UUID,
          name: "All Labels",
          slug: "all-labels",
          items: [],
        },
        settings: DEFAULT_USER_SETTINGS,
        user: {
          id: existingUserId, // Already has id
          username: "testuser",
          password: "hashedpassword",
        },
        version: "v0.7.0",
      })

      const result = v080Migration(v070Data)

      // Verify existing id is preserved
      const user = (result as any).user
      expect(user).toHaveProperty("id", existingUserId)
    })

    it("should create user object with id when missing entirely", () => {
      const v070Data = createJsonData({
        tasks: [],
        projects: [],
        labels: [],
        projectGroups: {
          type: "project",
          id: DEFAULT_UUID,
          name: "All Projects",
          slug: "all-projects",
          items: [],
        },
        labelGroups: {
          type: "label",
          id: DEFAULT_UUID,
          name: "All Labels",
          slug: "all-labels",
          items: [],
        },
        settings: DEFAULT_USER_SETTINGS,
        // No user field at all (shouldn't happen after v0.7.0 but handle gracefully)
        version: "v0.7.0",
      })

      const result = v080Migration(v070Data)

      // Verify user was created with id
      const user = (result as any).user
      expect(user).toHaveProperty("id", DEFAULT_UUID)
      expect(user).toHaveProperty("username")
      expect(user).toHaveProperty("password")
    })

    it("should handle tasks without comments gracefully", () => {
      const v070Data = createJsonData({
        tasks: [
          {
            id: TEST_TASK_ID_1,
            title: "Task without comments array",
            projectId: TEST_PROJECT_ID_1,
            completed: false,
            priority: 1,
            labels: [],
            subtasks: [],
            // No comments field at all
            createdAt: new Date().toISOString(),
            recurringMode: "dueDate",
          },
        ],
        projects: [],
        labels: [],
        projectGroups: {
          type: "project",
          id: DEFAULT_UUID,
          name: "All Projects",
          slug: "all-projects",
          items: [],
        },
        labelGroups: {
          type: "label",
          id: DEFAULT_UUID,
          name: "All Labels",
          slug: "all-labels",
          items: [],
        },
        settings: DEFAULT_USER_SETTINGS,
        user: DEFAULT_USER,
        version: "v0.7.0",
      })

      const result = v080Migration(v070Data)

      // Should not crash and task should remain unchanged
      const tasks = (result as any).tasks
      expect(tasks).toHaveLength(1)
      expect(tasks[0]).not.toHaveProperty("comments")
    })
  })

  describe("v0.10.0 Migration Function", () => {
    it("should add markdownEnabled flag to general settings when missing", () => {
      const v080DataWithoutMarkdownEnabled = createJsonData({
        tasks: [],
        projects: [],
        labels: [],
        projectGroups: {
          type: "project",
          id: DEFAULT_UUID,
          name: "All Projects",
          slug: "all-projects",
          items: [],
        },
        labelGroups: {
          type: "label",
          id: DEFAULT_UUID,
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
            soundEnabled: true,
            linkifyEnabled: true,
            popoverHoverOpen: false,
            // No markdownEnabled field - should be added
          },
        },
        user: DEFAULT_USER,
        version: "v0.8.0",
      })

      const result = v0100Migration(v080DataWithoutMarkdownEnabled)

      expect(result).toHaveProperty("settings")
      const settings = (result as any).settings
      expect(settings).toHaveProperty("general")
      expect(settings.general).toHaveProperty(
        "markdownEnabled",
        DEFAULT_GENERAL_SETTINGS.markdownEnabled,
      )
    })

    it("should preserve existing markdownEnabled flag when present", () => {
      const v080DataWithMarkdownEnabled = createJsonData({
        tasks: [],
        projects: [],
        labels: [],
        projectGroups: {
          type: "project",
          id: DEFAULT_UUID,
          name: "All Projects",
          slug: "all-projects",
          items: [],
        },
        labelGroups: {
          type: "label",
          id: DEFAULT_UUID,
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
            soundEnabled: true,
            linkifyEnabled: true,
            popoverHoverOpen: false,
            markdownEnabled: false, // Already has markdownEnabled set to false
          },
        },
        user: DEFAULT_USER,
        version: "v0.8.0",
      })

      const result = v0100Migration(v080DataWithMarkdownEnabled)

      expect(result).toHaveProperty("settings")
      const settings = (result as any).settings
      expect(settings).toHaveProperty("general")
      expect(settings.general).toHaveProperty("markdownEnabled", false) // Should preserve existing value
    })

    it("should restore default settings when settings are missing", () => {
      const v080DataWithoutSettings = createJsonData({
        tasks: [],
        projects: [],
        labels: [],
        projectGroups: {
          type: "project",
          id: DEFAULT_UUID,
          name: "All Projects",
          slug: "all-projects",
          items: [],
        },
        labelGroups: {
          type: "label",
          id: DEFAULT_UUID,
          name: "All Labels",
          slug: "all-labels",
          items: [],
        },
        user: DEFAULT_USER,
        // No settings field - should add complete default settings
        version: "v0.8.0",
      })

      const result = v0100Migration(v080DataWithoutSettings)

      expect(result).toHaveProperty("settings")
      const settings = (result as any).settings
      expect(settings).toEqual(DEFAULT_USER_SETTINGS)
    })

    it("should restore default general settings when general settings are invalid", () => {
      const v080DataWithInvalidGeneralSettings = createJsonData({
        tasks: [],
        projects: [],
        labels: [],
        projectGroups: {
          type: "project",
          id: DEFAULT_UUID,
          name: "All Projects",
          slug: "all-projects",
          items: [],
        },
        labelGroups: {
          type: "label",
          id: DEFAULT_UUID,
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
          general: null, // Invalid - should restore defaults
        },
        user: DEFAULT_USER,
        version: "v0.8.0",
      })

      const result = v0100Migration(v080DataWithInvalidGeneralSettings)

      expect(result).toHaveProperty("settings")
      const settings = (result as any).settings
      expect(settings).toHaveProperty("general")
      expect(settings.general).toEqual(DEFAULT_GENERAL_SETTINGS)
    })

    it("should preserve other general settings when adding markdownEnabled", () => {
      const v080DataWithOtherSettings = createJsonData({
        tasks: [],
        projects: [],
        labels: [],
        projectGroups: {
          type: "project",
          id: DEFAULT_UUID,
          name: "All Projects",
          slug: "all-projects",
          items: [],
        },
        labelGroups: {
          type: "label",
          id: DEFAULT_UUID,
          name: "All Labels",
          slug: "all-labels",
          items: [],
        },
        settings: {
          data: {
            autoBackup: {
              enabled: true,
              backupTime: "09:00",
              maxBackups: 7,
            },
          },
          notifications: {
            enabled: false,
            requireInteraction: false,
          },
          general: {
            startView: "lastViewed",
            soundEnabled: false,
            linkifyEnabled: false,
            popoverHoverOpen: true,
            // No markdownEnabled - should be added
          },
        },
        user: DEFAULT_USER,
        version: "v0.8.0",
      })

      const result = v0100Migration(v080DataWithOtherSettings)

      expect(result).toHaveProperty("settings")
      const settings = (result as any).settings
      expect(settings).toHaveProperty("general")

      // Should preserve existing settings
      expect(settings.general.startView).toBe("lastViewed")
      expect(settings.general.soundEnabled).toBe(false)
      expect(settings.general.linkifyEnabled).toBe(false)
      expect(settings.general.popoverHoverOpen).toBe(true)

      // Should add markdownEnabled with default value
      expect(settings.general.markdownEnabled).toBe(DEFAULT_GENERAL_SETTINGS.markdownEnabled)
    })

    it("should handle missing settings object gracefully", () => {
      const v080DataWithoutSettingsObject = createJsonData({
        tasks: [],
        projects: [],
        labels: [],
        projectGroups: {
          type: "project",
          id: DEFAULT_UUID,
          name: "All Projects",
          slug: "all-projects",
          items: [],
        },
        labelGroups: {
          type: "label",
          id: DEFAULT_UUID,
          name: "All Labels",
          slug: "all-labels",
          items: [],
        },
        user: DEFAULT_USER,
        settings: null, // Invalid - should restore complete default settings
        version: "v0.8.0",
      })

      const result = v0100Migration(v080DataWithoutSettingsObject)

      expect(result).toHaveProperty("settings")
      const settings = (result as any).settings
      expect(settings).toEqual(DEFAULT_USER_SETTINGS)
    })

    it("should rebase trackingId to the active recurring anchor when group contains an incomplete task", () => {
      const originalTrackingId = createTaskId("550e8400-e29b-41d4-a716-446655440001")
      const activeTaskId = createTaskId("550e8400-e29b-41d4-a716-446655440002")
      const historyTaskId = createTaskId("550e8400-e29b-41d4-a716-446655440003")

      const data = createJsonData({
        tasks: [
          {
            id: activeTaskId,
            trackingId: originalTrackingId,
            recurring: "RRULE:FREQ=DAILY",
            completed: false,
          },
          {
            id: historyTaskId,
            trackingId: originalTrackingId,
            completed: true,
          },
        ],
        projects: [],
        labels: [],
        projectGroups: DEFAULT_EMPTY_DATA_FILE.projectGroups,
        labelGroups: DEFAULT_EMPTY_DATA_FILE.labelGroups,
        settings: DEFAULT_USER_SETTINGS,
        user: DEFAULT_USER,
        version: "v0.8.0",
      })

      const result = v0100Migration(data)
      const tasks = (result as any).tasks as Array<Record<string, unknown>>
      const updatedActive = tasks.find((task) => task.id === activeTaskId)
      const updatedHistory = tasks.find((task) => task.id === historyTaskId)

      expect(updatedActive?.trackingId).toBe(activeTaskId)
      expect(updatedHistory?.trackingId).toBe(activeTaskId)
    })

    it("should leave trackingIds unchanged when no active recurring task exists in a group", () => {
      const trackingId = createTaskId("550e8400-e29b-41d4-a716-446655440004")
      const completedTaskId = createTaskId("550e8400-e29b-41d4-a716-446655440005")

      const data = createJsonData({
        tasks: [
          {
            id: completedTaskId,
            trackingId,
            completed: true,
          },
        ],
        projects: [],
        labels: [],
        projectGroups: DEFAULT_EMPTY_DATA_FILE.projectGroups,
        labelGroups: DEFAULT_EMPTY_DATA_FILE.labelGroups,
        settings: DEFAULT_USER_SETTINGS,
        user: DEFAULT_USER,
        version: "v0.8.0",
      })

      const result = v0100Migration(data)
      const tasks = (result as any).tasks as Array<Record<string, unknown>>
      const completedTask = tasks.find((task) => task.id === completedTaskId)

      expect(completedTask?.trackingId).toBe(trackingId)
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
      // Missing version is now a hard error (no implicit fallback)
      expect(() => needsMigration(mockDataFile)).toThrow(/version property/)
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
        user: DEFAULT_USER,
        version: "v8.8.8", // High version to ensure no migration needed
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
      expect(info.currentVersion).toEqual(createVersionString("v8.8.8"))
      expect(info.needsMigration).toBe(false)
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

    it("should handle data with missing required fields", () => {
      // Create data with truly missing required fields that can't be fixed by migration
      const dataWithMissingFields = createJsonData({
        version: "v0.8.0",
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
        version: "v0.8.0",
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
    it("should refuse to migrate legacy data structures older than v0.8.0", () => {
      const legacyDataFile = createJsonData({
        tasks: [],
        projects: [],
        labels: [],
        ordering: {
          projects: [TEST_PROJECT_ID_1],
          labels: [TEST_LABEL_ID_1],
        },
        projectGroups: undefined,
        labelGroups: undefined,
        version: "v0.2.0",
      })

      expect(() => migrateDataFile(legacyDataFile)).toThrow(/Minimum supported version is v0\.8\.0/)
    })
  })
})
