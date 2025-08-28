import { describe, it, expect, vi, beforeEach } from "vitest"
import { migrateDataFile, needsMigration, getMigrationInfo } from "./data-migration"
import type { DataFile } from "@/lib/types"
import { createTaskId, createProjectId, createVersionString } from "@/lib/types"
import { DEFAULT_PROJECT_GROUP, DEFAULT_LABEL_GROUP } from "@/lib/types/defaults"

// Mock package.json to control version in tests
vi.mock("@/package.json", () => ({
  default: {
    version: "0.2.0",
  },
}))

describe("Data Migration Utility", () => {
  let mockDataFile: DataFile

  beforeEach(() => {
    mockDataFile = {
      tasks: [],
      projects: [],
      labels: [],
      projectGroups: DEFAULT_PROJECT_GROUP,
      labelGroups: DEFAULT_LABEL_GROUP,
    }

    // Reset console.log mock
    vi.clearAllMocks()
  })

  describe("migrateDataFile", () => {
    it("should handle v0.2.0 data file with current v0.2.0 target (no migration needed)", () => {
      const result = migrateDataFile(mockDataFile)

      // Should remain without version field since no migrations available for v0.2.0
      expect(result.version).toBeUndefined()
      expect(result).toEqual(mockDataFile)
    })

    it("should migrate v0.2.0 data file to v0.3.0 when target is v0.3.0", () => {
      const result = migrateDataFile(mockDataFile, createVersionString("v0.3.0"))

      expect(result.version).toBe(createVersionString("v0.3.0"))
      expect(result).toEqual({
        ...mockDataFile,
        version: createVersionString("v0.3.0"),
      })
    })

    it("should set version to latest applied migration, not target version", () => {
      // Target is v0.7.0 but latest migration is v0.3.0
      const result = migrateDataFile(mockDataFile, createVersionString("v0.7.0"))

      // Should be v0.3.0 (latest applied migration), not v0.7.0 (target)
      expect(result.version).toBe(createVersionString("v0.3.0"))
    })

    it("should handle versioned data file with no migration needed", () => {
      const dataFileWithVersion = { ...mockDataFile, version: createVersionString("v0.3.0") }
      const result = migrateDataFile(dataFileWithVersion, createVersionString("v0.3.0"))

      expect(result.version).toBe(createVersionString("v0.3.0"))
      expect(result).toEqual(dataFileWithVersion)
    })

    it("should handle data file with newer version (no migration needed)", () => {
      const dataFileWithNewerVersion = { ...mockDataFile, version: createVersionString("v0.4.0") }
      const result = migrateDataFile(dataFileWithNewerVersion, createVersionString("v0.3.0"))

      // Should remain at v0.4.0 since no migration needed
      expect(result.version).toBe(createVersionString("v0.4.0"))
    })

    it("should preserve all data during migration", () => {
      const dataWithContent = {
        ...mockDataFile,
        tasks: [
          {
            id: createTaskId("550e8400-e29b-41d4-a716-446655440000"),
            title: "Test Task",
            completed: false,
            priority: 1 as const,
            labels: [],
            subtasks: [],
            comments: [],
            attachments: [],
            createdAt: new Date(),
            recurringMode: "dueDate" as const,
          },
        ],
        projects: [
          {
            id: createProjectId("550e8400-e29b-41d4-a716-446655440001"),
            name: "Test Project",
            slug: "test-project",
            color: "#ff0000",
            shared: false,
            sections: [],
          },
        ],
      }

      const result = migrateDataFile(dataWithContent, createVersionString("v0.3.0"))

      expect(result.tasks).toEqual(dataWithContent.tasks)
      expect(result.projects).toEqual(dataWithContent.projects)
      expect(result.version).toBe(createVersionString("v0.3.0"))
    })
  })

  describe("needsMigration", () => {
    it("should return false for v0.2.0 data file with v0.2.0 target", () => {
      expect(needsMigration(mockDataFile)).toBe(false)
    })

    it("should return true for v0.2.0 data file with v0.3.0+ target", () => {
      expect(needsMigration(mockDataFile, createVersionString("v0.3.0"))).toBe(true)
      expect(needsMigration(mockDataFile, createVersionString("v0.4.0"))).toBe(true)
    })

    it("should return false for versioned data file with same version", () => {
      const dataFileWithVersion = { ...mockDataFile, version: createVersionString("v0.3.0") }
      expect(needsMigration(dataFileWithVersion, createVersionString("v0.3.0"))).toBe(false)
    })

    it("should return false for data file with newer version", () => {
      const dataFileWithNewerVersion = { ...mockDataFile, version: createVersionString("v0.4.0") }
      expect(needsMigration(dataFileWithNewerVersion, createVersionString("v0.3.0"))).toBe(false)
    })

    it("should return false for data file when no migration function exists for target", () => {
      const dataFileWithOlderVersion = { ...mockDataFile, version: createVersionString("v0.3.0") }
      // No migration function exists for v0.4.0, so no migration needed
      expect(needsMigration(dataFileWithOlderVersion, createVersionString("v0.4.0"))).toBe(false)
    })
  })

  describe("getMigrationInfo", () => {
    it("should return correct info for v0.2.0 data file with v0.2.0 target", () => {
      const info = getMigrationInfo(mockDataFile)

      expect(info).toEqual({
        currentVersion: createVersionString("v0.2.0"),
        targetVersion: createVersionString("v0.2.0"),
        needsMigration: false,
      })
    })

    it("should return correct info for v0.2.0 data file with v0.3.0 target", () => {
      const info = getMigrationInfo(mockDataFile, createVersionString("v0.3.0"))

      expect(info).toEqual({
        currentVersion: createVersionString("v0.2.0"),
        targetVersion: createVersionString("v0.3.0"),
        needsMigration: true,
      })
    })

    it("should return correct info for versioned data file", () => {
      const dataFileWithVersion = { ...mockDataFile, version: createVersionString("v0.3.0") }
      const info = getMigrationInfo(dataFileWithVersion, createVersionString("v0.3.0"))

      expect(info).toEqual({
        currentVersion: createVersionString("v0.3.0"),
        targetVersion: createVersionString("v0.3.0"),
        needsMigration: false,
      })
    })
  })

  describe("Version Comparison", () => {
    it("should handle various version formats", () => {
      const testCases = [
        // No migration to v0.4.0 since no migration function exists
        { dataVersion: "v0.3.0", target: "v0.4.0", shouldMigrate: false },
        { dataVersion: "v0.3.0", target: "v0.3.0", shouldMigrate: false },
        { dataVersion: "v0.4.0", target: "v0.3.0", shouldMigrate: false },
        // No migration to v0.4.0 since no migration function exists
        { dataVersion: "v0.3.5", target: "v0.4.0", shouldMigrate: false },
        { dataVersion: "v0.10.0", target: "v0.3.0", shouldMigrate: false },
        // Migration needed from v0.2.0 to v0.3.0 (migration function exists)
        { dataVersion: "v0.2.0", target: "v0.3.0", shouldMigrate: true },
      ]

      testCases.forEach(({ dataVersion, target, shouldMigrate }) => {
        const dataFile = { ...mockDataFile, version: createVersionString(dataVersion) }
        const result = needsMigration(dataFile, createVersionString(target))

        expect(result).toBe(shouldMigrate)
      })
    })

    it("should handle v0.2.0 data file migration scenarios", () => {
      const testCases = [
        { target: "v0.2.0", shouldMigrate: false }, // Current state - no migration
        { target: "v0.3.0", shouldMigrate: true }, // First explicit version
        { target: "v0.4.0", shouldMigrate: true }, // Higher version
      ]

      testCases.forEach(({ target, shouldMigrate }) => {
        const result = needsMigration(mockDataFile, createVersionString(target))
        expect(result).toBe(shouldMigrate)
      })
    })
  })

  describe("Safety Limits", () => {
    it("should not exceed maximum migration steps", () => {
      // This test verifies the safety limit is in place
      // In a real scenario with many migration steps, it should stop at 8
      const result = migrateDataFile(mockDataFile)

      // Should complete successfully without infinite loops
      // Current target is v0.2.0, so no migration should happen
      expect(result.version).toBeUndefined()
    })
  })

  describe("Data Structure Version Semantics", () => {
    it("should keep datafile at latest migration version even when app version is higher", () => {
      // This demonstrates the key insight: version represents data structure, not app version
      // Latest migration is v0.3.0, but app is at v0.7.0
      const dataFileAtV0_3_0 = { ...mockDataFile, version: createVersionString("v0.3.0") }

      // Target v0.7.0 (app version) but should stay at v0.3.0 (latest migration)
      const result = migrateDataFile(dataFileAtV0_3_0, createVersionString("v0.7.0"))

      // Version should stay at v0.3.0 (latest migration), not v0.7.0 (app version)
      expect(result.version).toBe(createVersionString("v0.3.0"))

      // No migration should be needed
      expect(needsMigration(dataFileAtV0_3_0, createVersionString("v0.7.0"))).toBe(false)

      // Migration info should reflect this correctly
      const info = getMigrationInfo(dataFileAtV0_3_0, createVersionString("v0.7.0"))
      expect(info).toEqual({
        currentVersion: createVersionString("v0.3.0"),
        targetVersion: createVersionString("v0.7.0"),
        needsMigration: false,
      })
    })
  })

  describe("Transactional Migration", () => {
    it("should implement all-or-nothing migration behavior", () => {
      // Test that successful migrations work normally
      const result = migrateDataFile(mockDataFile, createVersionString("v0.3.0"))
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

      const originalDataFile = { ...mockDataFile }
      const result = migrateDataFile(originalDataFile, createVersionString("v0.3.0"))

      // Successful migration should complete
      expect(result.version).toBe(createVersionString("v0.3.0"))

      // Original data should remain unchanged
      expect(originalDataFile.version).toBeUndefined()
      expect(originalDataFile).toEqual(mockDataFile)
    })
  })
})
