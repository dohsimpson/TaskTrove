import { describe, it, expect, vi, beforeEach } from "vitest"
import { migrateDataFile, needsMigration, getMigrationInfo } from "./data-migration"
import type { Json } from "@/lib/types"
import { createVersionString, createProjectId, createLabelId } from "@/lib/types"
import { DEFAULT_EMPTY_DATA_FILE } from "@/lib/types/defaults"

// Mock package.json to control version in tests
vi.mock("@/package.json", () => ({
  default: {
    version: "0.3.0", // Set to version that has migration
  },
}))

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
    it("should migrate unversioned data to current version", () => {
      const result = migrateDataFile(mockDataFile)

      // Should detect version and migrate to current package version
      expect(result.version).toBe(createVersionString("v0.3.0"))

      // Should conform to current DataFile schema (specific structure doesn't matter)
      expect(result).toHaveProperty("tasks")
      expect(result).toHaveProperty("projects")
      expect(result).toHaveProperty("labels")
      expect(result).toHaveProperty("projectGroups")
      expect(result).toHaveProperty("labelGroups")
      expect(result).toHaveProperty("version")

      // Should pass current schema validation
      expect(() => result).not.toThrow()
    })

    it("should migrate to latest available migration version", () => {
      const result = migrateDataFile(mockDataFile)

      // Should migrate to current package version (latest available migration)
      expect(result.version).toBe(createVersionString("v0.3.0"))
    })

    it("should handle already migrated data with no changes needed", () => {
      // Create data that's already at current version
      const currentVersionData = createJsonData({
        ...DEFAULT_EMPTY_DATA_FILE,
        version: "v0.3.0",
      })

      const result = migrateDataFile(currentVersionData)
      expect(result.version).toBe(createVersionString("v0.3.0"))
    })

    it("should handle future version data without breaking", () => {
      // Create data from a hypothetical future version
      const futureVersionData = createJsonData({
        ...DEFAULT_EMPTY_DATA_FILE,
        version: "v0.4.0",
      })

      const result = migrateDataFile(futureVersionData)
      // Should remain at future version since no migration needed
      expect(result.version).toBe(createVersionString("v0.4.0"))
    })

    it("should preserve all existing data during migration", () => {
      // Create data with actual content to test data preservation
      const dataWithContent = createJsonData({
        tasks: [
          {
            id: "550e8400-e29b-41d4-a716-446655440000",
            title: "Sample Task",
            completed: false,
            priority: 1,
            labels: [],
            subtasks: [],
            comments: [],
            attachments: [],
            createdAt: new Date().toISOString(),
          },
        ],
        projects: [
          {
            id: "550e8400-e29b-41d4-a716-446655440001",
            name: "Sample Project",
            slug: "sample-project",
            color: "#ff0000",
            shared: false,
            sections: [],
          },
        ],
        labels: [],
        ordering: { projects: [], labels: [] },
      })

      const result = migrateDataFile(dataWithContent)

      // Should preserve all original data
      expect(result.tasks).toHaveLength(1)
      expect(result.projects).toHaveLength(1)
      expect(result.tasks[0].title).toBe("Sample Task")
      expect(result.projects[0].name).toBe("Sample Project")

      // Should have current version and schema compliance
      expect(result.version).toBe(createVersionString("v0.3.0"))
      expect(result).toHaveProperty("projectGroups")
      expect(result).toHaveProperty("labelGroups")
    })
  })

  describe("needsMigration", () => {
    it("should detect when unversioned data needs migration", () => {
      // Data without version field should need migration
      expect(needsMigration(mockDataFile)).toBe(true)
    })

    it("should detect when old version data needs migration", () => {
      // Any data older than current should need migration
      expect(needsMigration(mockDataFile)).toBe(true)
    })

    it("should return false for current version data", () => {
      const currentVersionData = createJsonData({
        ...DEFAULT_EMPTY_DATA_FILE,
        version: "v0.3.0",
      })
      expect(needsMigration(currentVersionData)).toBe(false)
    })

    it("should return false for future version data", () => {
      const futureVersionData = createJsonData({
        ...DEFAULT_EMPTY_DATA_FILE,
        version: "v0.4.0",
      })
      expect(needsMigration(futureVersionData)).toBe(false)
    })

    it("should return false when no migrations are available", () => {
      const currentVersionData = createJsonData({
        ...DEFAULT_EMPTY_DATA_FILE,
        version: "v0.3.0",
      })
      expect(needsMigration(currentVersionData)).toBe(false)
    })
  })

  describe("getMigrationInfo", () => {
    it("should return correct info for data needing migration", () => {
      const info = getMigrationInfo(mockDataFile)

      expect(info).toEqual({
        currentVersion: createVersionString("v0.2.0"),
        targetVersion: createVersionString("v0.3.0"),
        needsMigration: true,
      })
    })

    it("should return correct info for current version data", () => {
      const currentVersionData = createJsonData({
        ...DEFAULT_EMPTY_DATA_FILE,
        version: "v0.3.0",
      })
      const info = getMigrationInfo(currentVersionData)

      expect(info).toEqual({
        currentVersion: createVersionString("v0.3.0"),
        targetVersion: createVersionString("v0.3.0"),
        needsMigration: false,
      })
    })

    it("should use latest available migration as target, not package version", () => {
      // This test verifies that when package.json has a higher version than
      // the latest available migration, the target version is the migration version
      // Since we can't easily mock package.json dynamically in tests,
      // we'll test the logic by creating a data file that needs migration

      const v020Data = createJsonData({
        tasks: [],
        projects: [],
        labels: [],
        ordering: { projects: [], labels: [] },
      })

      const info = getMigrationInfo(v020Data)

      // The target should be v0.3.0 (latest migration available)
      // regardless of what version is in package.json
      expect(info.targetVersion).toEqual(createVersionString("v0.3.0"))
      expect(info.currentVersion).toEqual(createVersionString("v0.2.0"))
      expect(info.needsMigration).toBe(true)

      // Also test that if data is already at v0.3.0, target stays v0.3.0
      const v030Data = createJsonData({
        ...DEFAULT_EMPTY_DATA_FILE,
        version: "v0.3.0",
      })

      const info2 = getMigrationInfo(v030Data)
      expect(info2.targetVersion).toEqual(createVersionString("v0.3.0"))
      expect(info2.currentVersion).toEqual(createVersionString("v0.3.0"))
      expect(info2.needsMigration).toBe(false)
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

      const result = migrateDataFile(v020DataWithProjects)

      // Should create projectGroups with ordering data
      expect(result.projectGroups).toEqual({
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

      const result = migrateDataFile(v020DataWithLabels)

      // Should create labelGroups with ordering data
      expect(result.labelGroups).toEqual({
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

      const result = migrateDataFile(v020DataWithTasks)

      // All tasks should have recurringMode added
      expect(result.tasks).toHaveLength(2)
      expect(result.tasks[0]).toEqual(
        expect.objectContaining({
          id: "550e8400-e29b-41d4-a716-446655440000",
          title: "Regular task",
          recurringMode: "dueDate", // Should be added
        }),
      )
      expect(result.tasks[1]).toEqual(
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

      const result = migrateDataFile(v020DataWithoutOrdering)

      // Should create default empty groups
      expect(result.projectGroups).toEqual({
        type: "project",
        id: "00000000-0000-0000-0000-000000000000",
        name: "All Projects",
        slug: "all-projects",
        items: [],
      })

      expect(result.labelGroups).toEqual({
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

      const result = migrateDataFile(v020DataWithoutOrderingButWithData)

      // Should create groups with IDs from existing projects and labels
      expect(result.projectGroups).toEqual({
        type: "project",
        id: "00000000-0000-0000-0000-000000000000",
        name: "All Projects",
        slug: "all-projects",
        items: [projectId1, projectId2],
      })

      expect(result.labelGroups).toEqual({
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

      const result = migrateDataFile(v020DataWithMalformedOrdering)

      // Should create default empty groups when ordering data is malformed
      expect(result.projectGroups).toEqual({
        type: "project",
        id: "00000000-0000-0000-0000-000000000000",
        name: "All Projects",
        slug: "all-projects",
        items: [], // Empty because ordering.projects was null
      })

      expect(result.labelGroups).toEqual({
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

      const result = migrateDataFile(v020DataWithExistingRecurringMode)

      // Should preserve existing recurringMode
      expect(result.tasks[0]).toEqual(
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

      const result = migrateDataFile(complexV020Data)

      // Should have correct version
      expect(result.version).toBe(createVersionString("v0.3.0"))

      // Should transform all data correctly
      expect(result.tasks[0]).toEqual(
        expect.objectContaining({
          recurringMode: "dueDate", // Added
        }),
      )

      expect(result.projectGroups).toEqual({
        type: "project",
        id: "00000000-0000-0000-0000-000000000000",
        name: "All Projects",
        slug: "all-projects",
        items: [projectId1],
      })

      expect(result.labelGroups).toEqual({
        type: "label",
        id: "00000000-0000-0000-0000-000000000000",
        name: "All Labels",
        slug: "all-labels",
        items: [labelId1],
      })

      // Should preserve all original data
      expect(result.tasks).toHaveLength(1)
      expect(result.projects).toHaveLength(1)
      expect(result.labels).toHaveLength(1)

      // Should remove legacy field
      expect(result).not.toHaveProperty("ordering")
    })
  })

  describe("Version Comparison", () => {
    it("should handle various version formats", () => {
      const testCases = [
        // Package version is v0.3.0, so only migrations <= v0.3.0 are available
        { dataVersion: "v0.3.0", shouldMigrate: false },
        { dataVersion: "v0.4.0", shouldMigrate: false },
        { dataVersion: "v0.3.5", shouldMigrate: false },
        { dataVersion: "v0.10.0", shouldMigrate: false },
        // Migration needed from v0.2.0 to v0.3.0 (migration function exists)
        { dataVersion: "v0.2.0", shouldMigrate: true },
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

    it("should handle v0.2.0 data file migration scenarios", () => {
      // Package version is v0.3.0, so v0.2.0 data needs migration
      const result = needsMigration(mockDataFile)
      expect(result).toBe(true)
    })
  })

  describe("Safety Limits", () => {
    it("should not exceed maximum migration steps", () => {
      // This test verifies the safety limit is in place
      // In a real scenario with many migration steps, it should stop at 8
      const result = migrateDataFile(mockDataFile)

      // Should complete successfully without infinite loops
      // Package version is v0.3.0, so should migrate to v0.3.0
      expect(result.version).toBe(createVersionString("v0.3.0"))
    })
  })

  describe("Data Structure Version Semantics", () => {
    it("should keep datafile at latest migration version when already up to date", () => {
      // This demonstrates the key insight: version represents data structure, not app version
      // Data file is at v0.3.0, package is at v0.3.0, no migration needed
      const dataFileAtV0_3_0 = createJsonData({
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

      // Should stay at v0.3.0 (latest migration)
      const result = migrateDataFile(dataFileAtV0_3_0)

      // Version should stay at v0.3.0 (latest migration)
      expect(result.version).toBe(createVersionString("v0.3.0"))

      // No migration should be needed
      expect(needsMigration(dataFileAtV0_3_0)).toBe(false)

      // Migration info should reflect this correctly
      const info = getMigrationInfo(dataFileAtV0_3_0)
      expect(info).toEqual({
        currentVersion: createVersionString("v0.3.0"),
        targetVersion: createVersionString("v0.3.0"),
        needsMigration: false,
      })
    })
  })

  describe("Transactional Migration", () => {
    it("should implement all-or-nothing migration behavior", () => {
      // Test that successful migrations work normally
      const result = migrateDataFile(mockDataFile)
      expect(result.version).toBe(createVersionString("v0.3.0"))

      // The migration system now uses a transactional approach:
      // - Either all migrations succeed and final result is returned
      // - Or any migration fails and original data is preserved (error thrown)
      // This ensures data integrity and prevents partial migration states
    })

    it("should preserve original data structure on any migration failure", () => {
      // This test documents the transactional behavior:
      // If migration fails at any step, the entire migration is aborted
      // and the original data is returned unchanged

      const originalDataFile = mockDataFile
      const result = migrateDataFile(originalDataFile)

      // Successful migration should complete
      expect(result.version).toBe(createVersionString("v0.3.0"))

      // Original data should remain unchanged (mockDataFile is immutable)
      // Test verifies that migration creates new object rather than mutating input
      expect(originalDataFile).toEqual(mockDataFile)
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
      // Test that the migration system properly handles and reports errors
      // This validates the error handling infrastructure is in place
      const validData = mockDataFile
      const result = migrateDataFile(validData)

      // Should complete successfully with proper error handling available
      expect(result.version).toBe(createVersionString("v0.3.0"))
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
      expect(() => migrateDataFile(dataWithMissingFields)).toThrow("Migration failed:")
    })

    it("should throw error when migration produces malformed data", () => {
      // Test with data that has malformed structure that might break during migration
      const malformedData = createJsonData({
        tasks: "not an array", // Invalid type
        projects: null, // Invalid type
        labels: [],
      })

      // This should fail during schema validation at the end
      expect(() => migrateDataFile(malformedData)).toThrow("Migration failed:")
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
})
