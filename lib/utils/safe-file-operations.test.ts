import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import fs from "fs/promises"
import { z } from "zod"
import {
  safeReadJsonFile,
  safeWriteJsonFile,
  safeReadDataFile,
  safeWriteDataFile,
  safeReadSettingsFile,
  safeWriteSettingsFile,
} from "./safe-file-operations"
import { type DataFile, type SettingsFile } from "@/lib/types"
import {
  TEST_TASK_ID_1,
  TEST_PROJECT_ID_1,
  TEST_LABEL_ID_1,
  TEST_SECTION_ID_1,
} from "@/lib/utils/test-constants"

// Mock fs/promises
vi.mock("fs/promises", () => ({
  default: {
    readFile: vi.fn(),
    writeFile: vi.fn(),
  },
}))

// Mock logger to avoid noise in tests
vi.mock("./logger", () => ({
  log: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

// Test schemas for generic function testing
const TestSchema = z.object({
  id: z.string(),
  name: z.string(),
  count: z.number(),
  date: z.string().transform((str) => new Date(str)),
})

const TestSerializationSchema = z.object({
  id: z.string(),
  name: z.string(),
  count: z.number(),
  date: z.union([z.string(), z.date().transform((date) => date.toISOString())]),
})

type TestData = z.infer<typeof TestSchema>

describe("safe-file-operations", () => {
  const mockFs = vi.mocked(fs)
  const testFilePath = "/test/path/test-file.json"

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe("safeReadJsonFile", () => {
    const validTestData: TestData = {
      id: "test-123",
      name: "Test Item",
      count: 42,
      date: new Date("2024-01-15T10:00:00Z"),
    }

    const validJsonString = JSON.stringify({
      id: "test-123",
      name: "Test Item",
      count: 42,
      date: "2024-01-15T10:00:00.000Z",
    })

    it("should successfully read and parse a valid JSON file", async () => {
      mockFs.readFile.mockResolvedValue(validJsonString)

      const result = await safeReadJsonFile({
        filePath: testFilePath,
        schema: TestSchema,
      })

      expect(mockFs.readFile).toHaveBeenCalledWith(testFilePath, "utf-8")
      expect(result).toEqual(validTestData)
    })

    it("should return default value when file not found", async () => {
      const defaultValue: TestData = {
        id: "default",
        name: "Default",
        count: 0,
        date: new Date("2024-01-01T00:00:00Z"),
      }

      mockFs.readFile.mockRejectedValue(new Error("ENOENT: no such file or directory"))

      const result = await safeReadJsonFile({
        filePath: testFilePath,
        schema: TestSchema,
        defaultValue,
      })

      expect(result).toEqual(defaultValue)
    })

    it("should return undefined when file not found and no default value", async () => {
      mockFs.readFile.mockRejectedValue(new Error("ENOENT: no such file or directory"))

      const result = await safeReadJsonFile({
        filePath: testFilePath,
        schema: TestSchema,
      })

      expect(result).toBeUndefined()
    })

    it("should return default value when JSON parsing fails", async () => {
      const defaultValue: TestData = {
        id: "default",
        name: "Default",
        count: 0,
        date: new Date("2024-01-01T00:00:00Z"),
      }

      mockFs.readFile.mockResolvedValue("invalid json {")

      const result = await safeReadJsonFile({
        filePath: testFilePath,
        schema: TestSchema,
        defaultValue,
      })

      expect(result).toEqual(defaultValue)
    })

    it("should return undefined when JSON parsing fails and no default value", async () => {
      mockFs.readFile.mockResolvedValue("invalid json {")

      const result = await safeReadJsonFile({
        filePath: testFilePath,
        schema: TestSchema,
      })

      expect(result).toBeUndefined()
    })

    it("should return default value when Zod validation fails", async () => {
      const defaultValue: TestData = {
        id: "default",
        name: "Default",
        count: 0,
        date: new Date("2024-01-01T00:00:00Z"),
      }

      const invalidData = JSON.stringify({
        id: "test-123",
        name: 42, // Should be string
        count: "invalid", // Should be number
        // Missing date field
      })

      mockFs.readFile.mockResolvedValue(invalidData)

      const result = await safeReadJsonFile({
        filePath: testFilePath,
        schema: TestSchema,
        defaultValue,
      })

      expect(result).toEqual(defaultValue)
    })

    it("should return undefined when Zod validation fails and no default value", async () => {
      const invalidData = JSON.stringify({
        id: "test-123",
        name: 42, // Should be string
        count: "invalid", // Should be number
      })

      mockFs.readFile.mockResolvedValue(invalidData)

      const result = await safeReadJsonFile({
        filePath: testFilePath,
        schema: TestSchema,
      })

      expect(result).toBeUndefined()
    })

    it("should handle unknown errors gracefully", async () => {
      mockFs.readFile.mockRejectedValue("Unknown error")

      const result = await safeReadJsonFile({
        filePath: testFilePath,
        schema: TestSchema,
      })

      expect(result).toBeUndefined()
    })
  })

  describe("safeWriteJsonFile", () => {
    const testData: TestData = {
      id: "test-123",
      name: "Test Item",
      count: 42,
      date: new Date("2024-01-15T10:00:00Z"),
    }

    const expectedSerialized = {
      id: "test-123",
      name: "Test Item",
      count: 42,
      date: "2024-01-15T10:00:00.000Z",
    }

    it("should successfully write valid data to file", async () => {
      mockFs.writeFile.mockResolvedValue(undefined)

      const result = await safeWriteJsonFile({
        filePath: testFilePath,
        data: testData,
        serializationSchema: TestSerializationSchema,
      })

      expect(result).toBe(true)
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        testFilePath,
        JSON.stringify(expectedSerialized, null, 2),
        "utf-8",
      )
    })

    it("should fail when serialization validation fails", async () => {
      // Create data that will fail serialization validation
      const invalidData = {
        id: "test-123",
        name: 42, // Should be string
        count: "invalid", // Should be number
        date: new Date("2024-01-15T10:00:00Z"),
      }

      const result = await safeWriteJsonFile({
        filePath: testFilePath,
        data: invalidData,
        serializationSchema: TestSerializationSchema,
      })

      expect(result).toBe(false)
      expect(mockFs.writeFile).not.toHaveBeenCalled()
    })

    it("should fail when file write fails", async () => {
      mockFs.writeFile.mockRejectedValue(new Error("EACCES: permission denied"))

      const result = await safeWriteJsonFile({
        filePath: testFilePath,
        data: testData,
        serializationSchema: TestSerializationSchema,
      })

      expect(result).toBe(false)
    })

    it("should handle JSON stringify errors", async () => {
      // Create circular reference to cause JSON.stringify to fail
      const circularData: { id: string; self?: unknown } = { id: "test" }
      circularData.self = circularData

      const result = await safeWriteJsonFile({
        filePath: testFilePath,
        data: circularData,
        serializationSchema: z.any(),
      })

      expect(result).toBe(false)
      expect(mockFs.writeFile).not.toHaveBeenCalled()
    })

    it("should handle unknown errors gracefully", async () => {
      mockFs.writeFile.mockRejectedValue("Unknown error")

      const result = await safeWriteJsonFile({
        filePath: testFilePath,
        data: testData,
        serializationSchema: TestSerializationSchema,
      })

      expect(result).toBe(false)
    })
  })

  describe("safeReadDataFile", () => {
    const validDataFile: DataFile = {
      tasks: [
        {
          id: TEST_TASK_ID_1,
          title: "Test Task",
          completed: false,
          priority: 1,
          labels: [],
          subtasks: [],
          comments: [],
          attachments: [],
          createdAt: new Date("2024-01-15T10:00:00Z"),
          projectId: TEST_PROJECT_ID_1,
          sectionId: TEST_SECTION_ID_1,
        },
      ],
      projects: [
        {
          id: TEST_PROJECT_ID_1,
          name: "Test Project",
          slug: "test-project",
          color: "#FF0000",
          shared: false,
          sections: [
            {
              id: TEST_SECTION_ID_1,
              name: "Test Section",
              color: "#CCCCCC",
            },
          ],
        },
      ],
      labels: [
        {
          id: TEST_LABEL_ID_1,
          name: "Test Label",
          slug: "test-label",
          color: "#00FF00",
        },
      ],
      ordering: {
        projects: [],
        labels: [],
      },
    }

    it("should successfully read a valid data file", async () => {
      const jsonString = JSON.stringify({
        ...validDataFile,
        tasks: validDataFile.tasks.map((task) => ({
          ...task,
          createdAt: task.createdAt.toISOString(),
        })),
      })

      mockFs.readFile.mockResolvedValue(jsonString)

      const result = await safeReadDataFile({
        filePath: testFilePath,
      })

      expect(result).toBeDefined()
      expect(result?.tasks).toHaveLength(1)
      expect(result?.projects).toHaveLength(1)
      expect(result?.labels).toHaveLength(1)
    })

    it("should return undefined when file reading fails", async () => {
      mockFs.readFile.mockRejectedValue(new Error("File not found"))

      const result = await safeReadDataFile({
        filePath: testFilePath,
      })

      expect(result).toBeUndefined()
    })

    it("should use default file path when none provided", async () => {
      mockFs.readFile.mockRejectedValue(new Error("File not found"))

      await safeReadDataFile()

      expect(mockFs.readFile).toHaveBeenCalledWith(expect.stringContaining("data.json"), "utf-8")
    })
  })

  describe("safeWriteDataFile", () => {
    const testDataFile: DataFile = {
      tasks: [],
      projects: [],
      labels: [],
      ordering: {
        projects: [],
        labels: [],
      },
    }

    it("should successfully write a valid data file", async () => {
      mockFs.writeFile.mockResolvedValue(undefined)

      const result = await safeWriteDataFile({
        filePath: testFilePath,
        data: testDataFile,
      })

      expect(result).toBe(true)
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        testFilePath,
        expect.stringContaining('"tasks": []'),
        "utf-8",
      )
    })

    it("should use default file path when none provided", async () => {
      mockFs.writeFile.mockResolvedValue(undefined)

      await safeWriteDataFile({
        data: testDataFile,
      })

      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining("data.json"),
        expect.any(String),
        "utf-8",
      )
    })

    it("should fail when write operation fails", async () => {
      mockFs.writeFile.mockRejectedValue(new Error("Write failed"))

      const result = await safeWriteDataFile({
        filePath: testFilePath,
        data: testDataFile,
      })

      expect(result).toBe(false)
    })
  })

  describe("safeReadSettingsFile", () => {
    const validSettingsFile: SettingsFile = {
      userSettings: {
        integrations: {
          imports: {
            supportedSources: ["ticktick", "todoist"],
          },
        },
      },
      version: "1.0.0",
      lastModified: new Date("2024-01-15T10:00:00Z"),
    }

    it("should successfully read a valid settings file", async () => {
      const jsonString = JSON.stringify({
        ...validSettingsFile,
        lastModified: validSettingsFile.lastModified.toISOString(),
      })

      mockFs.readFile.mockResolvedValue(jsonString)

      const result = await safeReadSettingsFile({
        filePath: testFilePath,
      })

      expect(result).toBeDefined()
      expect(result.userSettings.integrations.imports.supportedSources).toEqual([
        "ticktick",
        "todoist",
      ])
      expect(result.version).toBe("1.0.0")
    })

    it("should return default settings when file reading fails", async () => {
      mockFs.readFile.mockRejectedValue(new Error("File not found"))

      const result = await safeReadSettingsFile({
        filePath: testFilePath,
      })

      expect(result).toBeDefined()
      expect(result.userSettings.integrations.imports.supportedSources).toEqual([
        "ticktick",
        "todoist",
        "asana",
        "trello",
      ])
      expect(result.version).toBe("1.0.0")
    })

    it("should return default settings when validation fails", async () => {
      const invalidSettings = JSON.stringify({
        userSettings: "invalid", // Should be object
        version: 123, // Should be string
      })

      mockFs.readFile.mockResolvedValue(invalidSettings)

      const result = await safeReadSettingsFile({
        filePath: testFilePath,
      })

      expect(result).toBeDefined()
      expect(result.userSettings.integrations.imports.supportedSources).toEqual([
        "ticktick",
        "todoist",
        "asana",
        "trello",
      ])
    })

    it("should use default file path when none provided", async () => {
      mockFs.readFile.mockRejectedValue(new Error("File not found"))

      await safeReadSettingsFile()

      expect(mockFs.readFile).toHaveBeenCalledWith(
        expect.stringContaining("settings.json"),
        "utf-8",
      )
    })
  })

  describe("safeWriteSettingsFile", () => {
    const testSettingsFile: SettingsFile = {
      userSettings: {
        integrations: {
          imports: {
            supportedSources: ["ticktick"],
          },
        },
      },
      version: "1.0.0",
      lastModified: new Date("2024-01-15T10:00:00Z"),
    }

    it("should successfully write a valid settings file", async () => {
      mockFs.writeFile.mockResolvedValue(undefined)

      const result = await safeWriteSettingsFile({
        filePath: testFilePath,
        data: testSettingsFile,
      })

      expect(result).toBe(true)
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        testFilePath,
        expect.stringContaining('"supportedSources": [\n          "ticktick"\n        ]'),
        "utf-8",
      )
    })

    it("should use default file path when none provided", async () => {
      mockFs.writeFile.mockResolvedValue(undefined)

      await safeWriteSettingsFile({
        data: testSettingsFile,
      })

      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining("settings.json"),
        expect.any(String),
        "utf-8",
      )
    })

    it("should fail when write operation fails", async () => {
      mockFs.writeFile.mockRejectedValue(new Error("Write failed"))

      const result = await safeWriteSettingsFile({
        filePath: testFilePath,
        data: testSettingsFile,
      })

      expect(result).toBe(false)
    })
  })

  describe("error handling and edge cases", () => {
    it("should handle Zod errors properly in read operations", async () => {
      mockFs.readFile.mockResolvedValue('{"invalid": "data"}')

      const result = await safeReadJsonFile({
        filePath: testFilePath,
        schema: TestSchema,
      })

      expect(result).toBeUndefined()
    })

    it("should handle concurrent file operations via mutex", async () => {
      const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

      mockFs.readFile.mockImplementation(async () => {
        await delay(10)
        return '{"id":"test","name":"Test","count":1,"date":"2024-01-15T10:00:00.000Z"}'
      })

      // Start multiple read operations concurrently
      const promises = Array(5)
        .fill(0)
        .map(() =>
          safeReadJsonFile({
            filePath: testFilePath,
            schema: TestSchema,
          }),
        )

      const results = await Promise.all(promises)

      // All should succeed
      results.forEach((result) => {
        expect(result).toBeDefined()
        expect(result?.id).toBe("test")
      })

      // Should have made 5 read calls
      expect(mockFs.readFile).toHaveBeenCalledTimes(5)
    })
  })
})
