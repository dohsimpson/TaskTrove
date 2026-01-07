import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import fs from "fs/promises"
import { z } from "zod"
import {
  safeReadJsonFile,
  safeWriteJsonFile,
  safeReadDataFile,
  safeWriteDataFile,
  safeWriteUserFile,
  saveBase64ToAvatarFile,
} from "./safe-file-operations"
import { type DataFile, type UserFile, UserFileSchema } from "@tasktrove/types/data-file"
import { createUserId } from "@tasktrove/types/id"
import {
  TEST_TASK_ID_1,
  TEST_PROJECT_ID_1,
  TEST_LABEL_ID_1,
  TEST_GROUP_ID_1,
} from "@tasktrove/types/test-constants"

const TEST_USER_ID_1 = createUserId("550e8400-e29b-41d4-a716-446655440000")
import {
  DEFAULT_PROJECT_GROUP,
  DEFAULT_LABEL_GROUP,
  DEFAULT_USER_SETTINGS,
  DEFAULT_USER,
  DEFAULT_DATA_VERSION,
} from "@tasktrove/types/defaults"

// Mock fs/promises
vi.mock("fs/promises", () => ({
  default: {
    readFile: vi.fn(),
    writeFile: vi.fn(),
    mkdir: vi.fn(),
  },
}))

// Mock uuid
vi.mock("uuid", () => ({
  v4: vi.fn(),
}))

import { v4 as uuidv4 } from "uuid"

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
    // Clear call history and reset implementations
    vi.clearAllMocks()
    mockFs.readFile.mockReset()
    mockFs.writeFile.mockReset()
    mockFs.mkdir.mockReset()

    // Set default successful implementations
    mockFs.readFile.mockResolvedValue("")
    mockFs.writeFile.mockResolvedValue(undefined)
    mockFs.mkdir.mockResolvedValue(undefined)
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
          createdAt: new Date("2024-01-15T10:00:00Z"),
          recurringMode: "dueDate",
          projectId: TEST_PROJECT_ID_1,
        },
      ],
      projects: [
        {
          id: TEST_PROJECT_ID_1,
          name: "Test Project",
          color: "#FF0000",
          sections: [
            {
              id: TEST_GROUP_ID_1,
              name: "Test Section",
              type: "section" as const,
              items: [],
              color: "#CCCCCC",
            },
          ],
        },
      ],
      labels: [
        {
          id: TEST_LABEL_ID_1,
          name: "Test Label",
          color: "#00FF00",
        },
      ],
      projectGroups: DEFAULT_PROJECT_GROUP,
      labelGroups: DEFAULT_LABEL_GROUP,
      settings: DEFAULT_USER_SETTINGS,
      user: DEFAULT_USER,
      version: DEFAULT_DATA_VERSION,
    }

    it("should successfully read a valid data file", async () => {
      const jsonString = JSON.stringify({
        ...validDataFile,
        tasks: validDataFile.tasks.map((task) => ({
          ...task,
          createdAt: task.createdAt.toISOString(),
        })),
        version: DEFAULT_DATA_VERSION,
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
      projectGroups: DEFAULT_PROJECT_GROUP,
      labelGroups: DEFAULT_LABEL_GROUP,
      settings: DEFAULT_USER_SETTINGS,
      user: DEFAULT_USER,
      version: DEFAULT_DATA_VERSION,
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

  describe("safeWriteUserFile", () => {
    const testUserData: UserFile = {
      user: {
        id: TEST_USER_ID_1,
        username: "testuser",
        password: "hashedpassword123",
      },
    }

    const existingDataFile = {
      tasks: [
        {
          id: TEST_TASK_ID_1,
          title: "Existing Task",
          completed: false,
          priority: 1,
          labels: [],
          subtasks: [],
          comments: [],
          createdAt: "2024-01-15T10:00:00Z",
          recurringMode: "dueDate",
          projectId: TEST_PROJECT_ID_1,
        },
      ],
      projects: [
        {
          id: TEST_PROJECT_ID_1,
          name: "Existing Project",
          color: "#FF0000",
          sections: [],
        },
      ],
      labels: [
        {
          id: TEST_LABEL_ID_1,
          name: "Existing Label",
          color: "#00FF00",
        },
      ],
      projectGroups: DEFAULT_PROJECT_GROUP,
      labelGroups: DEFAULT_LABEL_GROUP,
      settings: DEFAULT_USER_SETTINGS,
      user: {
        id: TEST_USER_ID_1,
        username: "olduser",
        password: "oldpassword",
      },
    }

    it("should update only the user field and preserve all other fields", async () => {
      mockFs.readFile.mockResolvedValue(JSON.stringify(existingDataFile))
      mockFs.writeFile.mockResolvedValue(undefined)

      const result = await safeWriteUserFile({
        filePath: testFilePath,
        data: testUserData,
        schema: UserFileSchema,
      })

      expect(result).toBe(true)
      expect(mockFs.readFile).toHaveBeenCalledWith(testFilePath, "utf-8")
      expect(mockFs.writeFile).toHaveBeenCalledTimes(1)

      // Parse the written data
      const callArgs = mockFs.writeFile.mock.calls[0]
      expect(callArgs).toBeDefined()
      const writtenData = JSON.parse(String(callArgs?.[1]))

      // Verify user field was updated
      expect(writtenData.user).toEqual(testUserData.user)

      // Verify all other fields were preserved
      expect(writtenData.tasks).toHaveLength(1)
      expect(writtenData.projects).toHaveLength(1)
      expect(writtenData.labels).toHaveLength(1)
      expect(writtenData.projectGroups).toBeDefined()
      expect(writtenData.labelGroups).toBeDefined()
      expect(writtenData.settings).toBeDefined()
    })

    it("should preserve extra fields not in the schema", async () => {
      const dataWithExtraFields = {
        ...existingDataFile,
        customField: "custom value",
        anotherField: { nested: "data" },
      }

      mockFs.readFile.mockResolvedValue(JSON.stringify(dataWithExtraFields))
      mockFs.writeFile.mockResolvedValue(undefined)

      const result = await safeWriteUserFile({
        filePath: testFilePath,
        data: testUserData,
        schema: UserFileSchema,
      })

      expect(result).toBe(true)

      const callArgs = mockFs.writeFile.mock.calls[0]
      expect(callArgs).toBeDefined()
      const writtenData = JSON.parse(String(callArgs?.[1]))

      // Verify user field was updated
      expect(writtenData.user).toEqual(testUserData.user)

      // Verify extra fields were preserved
      expect(writtenData.customField).toBe("custom value")
      expect(writtenData.anotherField).toEqual({ nested: "data" })
    })

    it("should fail when user data validation fails", async () => {
      const invalidUserData = {
        user: {
          username: 123, // Should be string
          displayName: "Test User",
          email: "invalid-email", // Invalid email format
          avatar: null,
        },
      }

      const result = await safeWriteUserFile({
        filePath: testFilePath,
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        data: invalidUserData as unknown as UserFile,
        schema: UserFileSchema,
      })

      expect(result).toBe(false)
      expect(mockFs.readFile).not.toHaveBeenCalled()
      expect(mockFs.writeFile).not.toHaveBeenCalled()
    })

    it("should fail when file read fails", async () => {
      mockFs.readFile.mockRejectedValue(new Error("ENOENT: file not found"))

      const result = await safeWriteUserFile({
        filePath: testFilePath,
        data: testUserData,
        schema: UserFileSchema,
      })

      expect(result).toBe(false)
      expect(mockFs.writeFile).not.toHaveBeenCalled()
    })

    it("should fail when JSON parsing fails", async () => {
      mockFs.readFile.mockResolvedValue("invalid json {")

      const result = await safeWriteUserFile({
        filePath: testFilePath,
        data: testUserData,
        schema: UserFileSchema,
      })

      expect(result).toBe(false)
      expect(mockFs.writeFile).not.toHaveBeenCalled()
    })

    it("should fail when file write fails", async () => {
      mockFs.readFile.mockResolvedValue(JSON.stringify(existingDataFile))
      mockFs.writeFile.mockRejectedValue(new Error("EACCES: permission denied"))

      const result = await safeWriteUserFile({
        filePath: testFilePath,
        data: testUserData,
        schema: UserFileSchema,
      })

      expect(result).toBe(false)
    })

    it("should use default file path when none provided", async () => {
      mockFs.readFile.mockResolvedValue(JSON.stringify(existingDataFile))
      mockFs.writeFile.mockResolvedValue(undefined)

      await safeWriteUserFile({
        data: testUserData,
        schema: UserFileSchema,
      })

      expect(mockFs.readFile).toHaveBeenCalledWith(expect.stringContaining("data.json"), "utf-8")
    })

    it("should handle concurrent updates via mutex", async () => {
      const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

      mockFs.readFile.mockImplementation(async () => {
        await delay(10)
        return JSON.stringify(existingDataFile)
      })
      mockFs.writeFile.mockResolvedValue(undefined)

      // Start multiple write operations concurrently
      const userData1: UserFile = {
        user: {
          id: TEST_USER_ID_1,
          username: "user1",
          password: "pass1",
        },
      }
      const userData2: UserFile = {
        user: {
          id: TEST_USER_ID_1,
          username: "user2",
          password: "pass2",
        },
      }
      const userData3: UserFile = {
        user: {
          id: TEST_USER_ID_1,
          username: "user3",
          password: "pass3",
        },
      }

      const promises = [
        safeWriteUserFile({ filePath: testFilePath, data: userData1, schema: UserFileSchema }),
        safeWriteUserFile({ filePath: testFilePath, data: userData2, schema: UserFileSchema }),
        safeWriteUserFile({ filePath: testFilePath, data: userData3, schema: UserFileSchema }),
      ]

      const results = await Promise.all(promises)

      // All operations should succeed
      expect(results).toEqual([true, true, true])

      // Should have called readFile and writeFile 3 times each (once per operation)
      expect(mockFs.readFile).toHaveBeenCalledTimes(3)
      expect(mockFs.writeFile).toHaveBeenCalledTimes(3)
    })
  })

  describe("saveBase64ToAvatarFile", () => {
    const mockUuidV4 = vi.mocked(uuidv4)

    beforeEach(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/consistent-type-assertions
      ;(mockUuidV4 as any).mockReturnValue("test-uuid-123")
      mockFs.mkdir.mockResolvedValue(undefined)
      mockFs.writeFile.mockResolvedValue(undefined)
    })

    it("should save a base64 PNG image successfully", async () => {
      const base64Data =
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="
      const mimeType = "image/png"

      const result = await saveBase64ToAvatarFile(base64Data, mimeType)

      expect(result).toBe("assets/avatar/test-uuid-123.png")
      expect(mockFs.mkdir).toHaveBeenCalledWith(expect.stringContaining("data/assets/avatar"), {
        recursive: true,
      })
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining("test-uuid-123.png"),
        expect.any(Buffer),
      )
    })

    it("should save a base64 JPEG image successfully", async () => {
      const base64Data =
        "/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/VQAAAAAAA"
      const mimeType = "image/jpeg"

      const result = await saveBase64ToAvatarFile(base64Data, mimeType)

      expect(result).toBe("assets/avatar/test-uuid-123.jpg")
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining("test-uuid-123.jpg"),
        expect.any(Buffer),
      )
    })

    it("should return null for unsupported MIME type", async () => {
      const base64Data = "someBase64Data"
      const mimeType = "image/unsupported"

      const result = await saveBase64ToAvatarFile(base64Data, mimeType)

      expect(result).toBeNull()
      expect(mockFs.writeFile).not.toHaveBeenCalled()
    })

    it("should return null when file write fails", async () => {
      const base64Data = "someBase64Data"
      const mimeType = "image/png"
      mockFs.writeFile.mockRejectedValue(new Error("Write failed"))

      const result = await saveBase64ToAvatarFile(base64Data, mimeType)

      expect(result).toBeNull()
    })

    it("should return null when directory creation fails", async () => {
      const base64Data = "someBase64Data"
      const mimeType = "image/png"
      mockFs.mkdir.mockRejectedValue(new Error("mkdir failed"))

      const result = await saveBase64ToAvatarFile(base64Data, mimeType)

      expect(result).toBeNull()
    })
  })
})
