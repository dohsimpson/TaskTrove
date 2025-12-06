/* eslint-disable @typescript-eslint/consistent-type-assertions */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { migrateDataFile, needsMigration, getMigrationInfo } from "@/lib/utils/data-migration"
import { getRegisteredMigrationVersions } from "@/lib/utils/data-migration"
import { compareVersions } from "@tasktrove/utils/version"
import type { Json } from "@tasktrove/types/constants"
import { createVersionString } from "@tasktrove/types/id"
import { DEFAULT_EMPTY_DATA_FILE } from "@tasktrove/types/defaults"
import { LATEST_DATA_VERSION } from "@tasktrove/types/schema-version"

describe("Data Migration Utility", () => {
  let mockDataFile: Json

  function createJsonData(data: Record<string, unknown>): Json {
    return JSON.parse(JSON.stringify(data))
  }

  beforeEach(() => {
    const unmigrated = {
      tasks: [],
      projects: [],
      labels: [],
      ordering: { projects: [], labels: [] },
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
      const highVersionData = createJsonData({
        ...DEFAULT_EMPTY_DATA_FILE,
        version: "v9.9.9",
      })

      const result = migrateDataFile(highVersionData)
      expect(result.version).toBe(createVersionString("v9.9.9"))
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
  })

  describe("needsMigration", () => {
    it("should throw when version field is missing", () => {
      expect(() => needsMigration(mockDataFile)).toThrow(/version property/)
    })

    it("should detect when very old version data needs migration", () => {
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
      const futureVersionData = createJsonData({
        ...DEFAULT_EMPTY_DATA_FILE,
        version: "v9.9.9",
      })
      expect(needsMigration(futureVersionData)).toBe(false)
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

      expect(info.currentVersion).toEqual(createVersionString("v0.2.0"))
      expect(info.targetVersion).toMatch(/^v\d+\.\d+\.\d+$/)
      expect(info.needsMigration).toBe(true)
      expect(compareVersions(info.targetVersion, info.currentVersion) > 0).toBe(true)
    })

    it("should return correct info pattern for future version data", () => {
      const futureVersionData = createJsonData({
        ...DEFAULT_EMPTY_DATA_FILE,
        version: "v9.9.9",
      })
      const info = getMigrationInfo(futureVersionData)

      expect(info.currentVersion).toEqual(createVersionString("v9.9.9"))
      expect(info.targetVersion).toMatch(/^v\d+\.\d+\.\d+$/)
      expect(info.needsMigration).toBe(false)
    })
  })
})
