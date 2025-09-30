/**
 * Tests for the /api/data/migrate endpoint
 *
 * This file tests the data file migration endpoint functionality and error handling.
 */

import { describe, it, expect, beforeEach, vi } from "vitest"
import { NextRequest } from "next/server"
import { POST } from "./route"

// Mock the fs module
vi.mock("fs", () => {
  const mockPromises = {
    readFile: vi.fn(),
    writeFile: vi.fn(),
  }

  return {
    default: {
      promises: mockPromises,
    },
    promises: mockPromises,
  }
})

// Mock the data migration function
vi.mock("@/lib/utils/data-migration", () => ({
  migrateDataFile: vi.fn(),
}))

// Mock the safe file operations
vi.mock("@/lib/utils/safe-file-operations", () => ({
  safeWriteDataFile: vi.fn(),
}))

// Mock the API mutex protection
vi.mock("@/lib/utils/api-mutex", () => ({
  withMutexProtection: <T extends (...args: unknown[]) => unknown>(fn: T) => fn,
}))

// Mock the logger
vi.mock("@/lib/utils/logger", () => ({
  log: {
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
  },
}))

describe("/api/data/migrate", () => {
  let mockReadFile: ReturnType<typeof vi.fn>
  let mockWriteFile: ReturnType<typeof vi.fn>
  let mockMigrateDataFile: ReturnType<typeof vi.fn>
  let mockSafeWriteDataFile: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    vi.clearAllMocks()

    // Get the mocked functions
    const mockFs = vi.mocked(await import("fs"))
    mockReadFile = vi.mocked(mockFs.promises.readFile)
    mockWriteFile = vi.mocked(mockFs.promises.writeFile)

    const mockMigration = vi.mocked(await import("@/lib/utils/data-migration"))
    mockMigrateDataFile = vi.mocked(mockMigration.migrateDataFile)

    const mockSafeOps = vi.mocked(await import("@/lib/utils/safe-file-operations"))
    mockSafeWriteDataFile = vi.mocked(mockSafeOps.safeWriteDataFile)
  })

  describe("POST - Migration Tests", () => {
    it("should successfully migrate data when valid", async () => {
      const originalData = {
        version: "v0.2.0",
        tasks: [],
        projects: [],
        labels: [],
      }

      const migratedData = {
        version: "v0.3.0",
        tasks: [],
        projects: [],
        labels: [],
        groups: {
          projects: { id: "default", name: "All Projects", slug: "all-projects", items: [] },
          labels: { id: "default", name: "All Labels", slug: "all-labels", items: [] },
        },
      }

      // Mock successful read
      mockReadFile.mockResolvedValue(JSON.stringify(originalData))

      // Mock successful migration
      mockMigrateDataFile.mockReturnValue(migratedData)

      // Mock successful backup write
      mockWriteFile.mockResolvedValue(undefined)

      // Mock successful data write
      mockSafeWriteDataFile.mockResolvedValue(true)

      const request = new NextRequest("http://localhost:3000/api/data/migrate", {
        method: "POST",
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe("Data migration completed successfully")
      expect(data.version).toBe("v0.3.0")
      expect(data.backupPath).toContain(".backup-")

      // Verify safeWriteDataFile was called with migrated data
      expect(mockSafeWriteDataFile).toHaveBeenCalledWith({
        filePath: expect.any(String),
        data: migratedData,
      })
    })

    it("should handle serialization failure when migrated data is invalid", async () => {
      const originalData = {
        version: "v0.2.0",
        tasks: [],
        projects: [],
        labels: [],
      }

      // Mock migrateDataFile to return invalid data that will fail serialization
      const invalidMigratedData = {
        version: "v0.3.0",
        tasks: [
          {
            // Invalid task - missing required fields or invalid date format
            id: "task-1",
            title: "Test Task",
            createdAt: "invalid-date-format", // This will fail date serialization
            updatedAt: "also-invalid",
          },
        ],
        projects: [],
        labels: [],
        groups: {
          projects: { id: "default", name: "All Projects", slug: "all-projects", items: [] },
          labels: { id: "default", name: "All Labels", slug: "all-labels", items: [] },
        },
      }

      // Mock successful read
      mockReadFile.mockResolvedValue(JSON.stringify(originalData))

      // Mock migration returning invalid data
      mockMigrateDataFile.mockReturnValue(invalidMigratedData)

      // Mock successful backup write
      mockWriteFile.mockResolvedValue(undefined)

      // Mock safeWriteDataFile returning false due to serialization failure
      mockSafeWriteDataFile.mockResolvedValue(false)

      const request = new NextRequest("http://localhost:3000/api/data/migrate", {
        method: "POST",
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.code).toBe("MIGRATION_FAILED")
      expect(data.message).toContain("Failed to write migrated data file")

      // Verify safeWriteDataFile was called and returned false
      expect(mockSafeWriteDataFile).toHaveBeenCalledWith({
        filePath: expect.any(String),
        data: invalidMigratedData,
      })
    })

    it("should handle file read errors", async () => {
      // Mock file read error
      mockReadFile.mockRejectedValue(new Error("File not found"))

      const request = new NextRequest("http://localhost:3000/api/data/migrate", {
        method: "POST",
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.code).toBe("MIGRATION_FAILED")
      expect(data.message).toContain("File not found")
    })

    it("should handle JSON parse errors", async () => {
      // Mock invalid JSON content
      mockReadFile.mockResolvedValue("invalid json content")

      const request = new NextRequest("http://localhost:3000/api/data/migrate", {
        method: "POST",
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.code).toBe("MIGRATION_FAILED")
      expect(data.message).toBeTruthy()
    })

    it("should handle migration function errors", async () => {
      const originalData = {
        version: "v0.2.0",
        tasks: [],
        projects: [],
        labels: [],
      }

      // Mock successful read
      mockReadFile.mockResolvedValue(JSON.stringify(originalData))

      // Mock migration throwing an error
      mockMigrateDataFile.mockImplementation(() => {
        throw new Error("Migration logic failed")
      })

      const request = new NextRequest("http://localhost:3000/api/data/migrate", {
        method: "POST",
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.code).toBe("MIGRATION_FAILED")
      expect(data.message).toContain("Migration logic failed")
    })

    it("should handle backup write errors", async () => {
      const originalData = {
        version: "v0.2.0",
        tasks: [],
        projects: [],
        labels: [],
      }

      const migratedData = {
        version: "v0.3.0",
        tasks: [],
        projects: [],
        labels: [],
        groups: {
          projects: { id: "default", name: "All Projects", slug: "all-projects", items: [] },
          labels: { id: "default", name: "All Labels", slug: "all-labels", items: [] },
        },
      }

      // Mock successful read
      mockReadFile.mockResolvedValue(JSON.stringify(originalData))

      // Mock successful migration
      mockMigrateDataFile.mockReturnValue(migratedData)

      // Mock backup write failure
      mockWriteFile.mockRejectedValue(new Error("Backup write failed"))

      const request = new NextRequest("http://localhost:3000/api/data/migrate", {
        method: "POST",
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.code).toBe("MIGRATION_FAILED")
      expect(data.message).toContain("Backup write failed")
    })
  })
})
