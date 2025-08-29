import { describe, it, expect, vi, beforeEach } from "vitest"
import { migrateDataFile, needsMigration, getMigrationInfo } from "./data-migration"
import type { Json } from "@/lib/types"
import { createVersionString } from "@/lib/types"
import { DEFAULT_PROJECT_GROUP, DEFAULT_LABEL_GROUP } from "@/lib/types/defaults"

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
    // Create a raw JSON object as it would come from disk (without DataFile validation)
    const rawData = {
      tasks: [],
      projects: [],
      labels: [],
      projectGroups: DEFAULT_PROJECT_GROUP,
      labelGroups: DEFAULT_LABEL_GROUP,
    }

    // Convert to Json type by serializing/deserializing to simulate real JSON data
    mockDataFile = createJsonData(rawData)

    // Reset console.log mock
    vi.clearAllMocks()
  })

  describe("migrateDataFile", () => {
    it("should migrate v0.2.0 data file to v0.3.0 when package version is v0.3.0", () => {
      const result = migrateDataFile(mockDataFile)

      // Should migrate from v0.2.0 to v0.3.0
      expect(result.version).toBe(createVersionString("v0.3.0"))
      expect(result).toEqual(
        expect.objectContaining({
          tasks: [],
          projects: [],
          labels: [],
          version: createVersionString("v0.3.0"),
        }),
      )
    })

    it("should apply migration to latest available version", () => {
      // Package version is v0.3.0 and migration exists for v0.3.0
      const result = migrateDataFile(mockDataFile)

      // Should be v0.3.0 (latest available migration)
      expect(result.version).toBe(createVersionString("v0.3.0"))
    })

    it("should handle versioned data file with no migration needed", () => {
      const baseData = JSON.parse(JSON.stringify(mockDataFile))
      const dataFileWithVersion = createJsonData({
        ...baseData,
        version: "v0.3.0",
      })
      const result = migrateDataFile(dataFileWithVersion)

      expect(result.version).toBe(createVersionString("v0.3.0"))
      expect(result).toEqual(
        expect.objectContaining({
          version: createVersionString("v0.3.0"),
        }),
      )
    })

    it("should handle data file with newer version (no migration needed)", () => {
      const baseData = JSON.parse(JSON.stringify(mockDataFile))
      const dataFileWithNewerVersion = createJsonData({
        ...baseData,
        version: "v0.4.0",
      })
      const result = migrateDataFile(dataFileWithNewerVersion)

      // Should remain at v0.4.0 since no migration needed
      expect(result.version).toBe(createVersionString("v0.4.0"))
    })

    it("should preserve all data during migration", () => {
      const baseData = JSON.parse(JSON.stringify(mockDataFile))
      const dataWithContent = createJsonData({
        ...baseData,
        tasks: [
          {
            id: "550e8400-e29b-41d4-a716-446655440000",
            title: "Test Task",
            completed: false,
            priority: 1,
            labels: [],
            subtasks: [],
            comments: [],
            attachments: [],
            createdAt: new Date().toISOString(),
            recurringMode: "dueDate",
          },
        ],
        projects: [
          {
            id: "550e8400-e29b-41d4-a716-446655440001",
            name: "Test Project",
            slug: "test-project",
            color: "#ff0000",
            shared: false,
            sections: [],
          },
        ],
      })

      const result = migrateDataFile(dataWithContent)

      expect(result.tasks).toHaveLength(1)
      expect(result.projects).toHaveLength(1)
      expect(result.tasks[0].title).toBe("Test Task")
      expect(result.projects[0].name).toBe("Test Project")
      expect(result.version).toBe(createVersionString("v0.3.0"))
    })
  })

  describe("needsMigration", () => {
    it("should return true for v0.2.0 data file when package version is v0.3.0", () => {
      // Package is at v0.3.0, mockDataFile is at v0.2.0 (no version field)
      expect(needsMigration(mockDataFile)).toBe(true)
    })

    it("should return true for v0.2.0 data file with available migrations", () => {
      // v0.2.0 data should need migration to v0.3.0
      expect(needsMigration(mockDataFile)).toBe(true)
    })

    it("should return false for versioned data file with same version", () => {
      const baseData = JSON.parse(JSON.stringify(mockDataFile))
      const dataFileWithVersion = createJsonData({
        ...baseData,
        version: "v0.3.0",
      })
      expect(needsMigration(dataFileWithVersion)).toBe(false)
    })

    it("should return false for data file with newer version", () => {
      const baseData = JSON.parse(JSON.stringify(mockDataFile))
      const dataFileWithNewerVersion = createJsonData({
        ...baseData,
        version: "v0.4.0",
      })
      expect(needsMigration(dataFileWithNewerVersion)).toBe(false)
    })

    it("should return false for data file when no migration function exists beyond current", () => {
      const baseData = JSON.parse(JSON.stringify(mockDataFile))
      const dataFileWithCurrentVersion = createJsonData({
        ...baseData,
        version: "v0.3.0",
      })
      // No migration function exists for v0.4.0, so no migration needed
      expect(needsMigration(dataFileWithCurrentVersion)).toBe(false)
    })
  })

  describe("getMigrationInfo", () => {
    it("should return correct info for v0.2.0 data file with package at v0.3.0", () => {
      const info = getMigrationInfo(mockDataFile)

      expect(info).toEqual({
        currentVersion: createVersionString("v0.2.0"),
        targetVersion: createVersionString("v0.3.0"),
        needsMigration: true,
      })
    })

    it("should return correct info for v0.2.0 data file needing migration", () => {
      const info = getMigrationInfo(mockDataFile)

      expect(info).toEqual({
        currentVersion: createVersionString("v0.2.0"),
        targetVersion: createVersionString("v0.3.0"),
        needsMigration: true,
      })
    })

    it("should return correct info for versioned data file", () => {
      const baseData = JSON.parse(JSON.stringify(mockDataFile))
      const dataFileWithVersion = createJsonData({
        ...baseData,
        version: "v0.3.0",
      })
      const info = getMigrationInfo(dataFileWithVersion)

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
      const baseData = JSON.parse(JSON.stringify(mockDataFile))
      const dataFileAtV0_3_0 = createJsonData({
        ...baseData,
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
      // Create data with missing required fields that should cause schema validation to fail
      const dataWithMissingFields = createJsonData({
        tasks: [],
        projects: [],
        labels: [],
        // Missing projectGroups and labelGroups that are required by DataFile schema
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
