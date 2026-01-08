/**
 * Tests for the /api/v1/settings endpoint
 *
 * Tests for settings retrieval and full-payload updates.
 */

import { describe, it, expect, beforeEach, vi } from "vitest"
import { NextRequest } from "next/server"
import { GET, PATCH } from "./route"
import { safeReadDataFile, safeWriteDataFile } from "@/lib/utils/safe-file-operations"
import { DEFAULT_EMPTY_DATA_FILE } from "@tasktrove/types/defaults"
import type { UserSettings } from "@tasktrove/types/settings"

// Mock the safe file operations
vi.mock("@/lib/utils/safe-file-operations")

// Mock the logger
vi.mock("@/lib/utils/logger", () => ({
  log: {
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

// Mock the middleware
vi.mock("@/lib/middleware/api-logger", () => ({
  withApiLogging: (handler: (...args: unknown[]) => unknown) => handler,
  logBusinessEvent: vi.fn(),
  withFileOperationLogging: async (operation: () => Promise<unknown>) => {
    return await operation()
  },
  withPerformanceLogging: async (operation: () => Promise<unknown>) => {
    return await operation()
  },
}))

// Mock auth middleware
vi.mock("@/lib/middleware/auth", () => ({
  withAuthentication: (handler: (...args: unknown[]) => unknown) => handler,
}))

// Mock API version middleware
vi.mock("@/lib/middleware/api-version", () => ({
  withApiVersion: (handler: (...args: unknown[]) => unknown) => handler,
}))

// Mock mutex protection
vi.mock("@/lib/utils/api-mutex", () => ({
  withMutexProtection: (handler: (...args: unknown[]) => unknown) => handler,
}))

const mockSafeReadDataFile = vi.mocked(safeReadDataFile)
const mockSafeWriteDataFile = vi.mocked(safeWriteDataFile)

const DEFAULT_SETTINGS: UserSettings = {
  data: {
    autoBackup: {
      enabled: true,
      backupTime: "02:00",
      maxBackups: 5,
    },
  },
  notifications: {
    enabled: true,
    requireInteraction: false,
  },
  general: {
    startView: "inbox",
    soundEnabled: true,
    linkifyEnabled: true,
    markdownEnabled: true,
    popoverHoverOpen: false,
    preferDayMonthFormat: false,
  },
  uiSettings: {
    weekStartsOn: undefined,
  },
}

describe("GET /api/v1/settings", () => {
  beforeEach(() => {
    vi.clearAllMocks()

    const mockFileData = {
      ...DEFAULT_EMPTY_DATA_FILE,
      settings: DEFAULT_SETTINGS,
    }

    mockSafeReadDataFile.mockResolvedValue(mockFileData)
  })

  it("should fetch settings successfully", async () => {
    const request = new NextRequest("http://localhost:3000/api/v1/settings", {
      method: "GET",
    })

    const response = await GET(request)
    const responseData = await response.json()

    expect(response.status).toBe(200)
    expect(responseData.settings).toEqual(DEFAULT_SETTINGS)
    expect(responseData.meta).toBeDefined()
    expect(responseData.meta.count).toBe(1)
    expect(responseData.meta.timestamp).toBeDefined()
  })

  it("should return cache control headers", async () => {
    const request = new NextRequest("http://localhost:3000/api/v1/settings", {
      method: "GET",
    })

    const response = await GET(request)

    expect(response.headers.get("Cache-Control")).toBe("no-cache, no-store, must-revalidate")
    expect(response.headers.get("Pragma")).toBe("no-cache")
    expect(response.headers.get("Expires")).toBe("0")
  })

  it("should handle file read failure gracefully", async () => {
    mockSafeReadDataFile.mockResolvedValue(undefined)

    const request = new NextRequest("http://localhost:3000/api/v1/settings", {
      method: "GET",
    })

    const response = await GET(request)
    const responseData = await response.json()

    expect(response.status).toBe(500)
    expect(responseData.error).toBeDefined()
  })
})

describe("PATCH /api/v1/settings", () => {
  beforeEach(() => {
    vi.clearAllMocks()

    const mockFileData = {
      ...DEFAULT_EMPTY_DATA_FILE,
      settings: DEFAULT_SETTINGS,
    }

    mockSafeReadDataFile.mockResolvedValue(mockFileData)
    mockSafeWriteDataFile.mockResolvedValue(true)
  })

  it("should update settings successfully with a full payload", async () => {
    const updatedSettings: UserSettings = {
      ...DEFAULT_SETTINGS,
      general: {
        ...DEFAULT_SETTINGS.general,
        soundEnabled: false,
      },
    }

    const updateData = {
      settings: updatedSettings,
    }

    const request = new NextRequest("http://localhost:3000/api/v1/settings", {
      method: "PATCH",
      body: JSON.stringify(updateData),
      headers: {
        "Content-Type": "application/json",
      },
    })

    const response = await PATCH(request)
    const responseData = await response.json()

    expect(response.status).toBe(200)
    expect(responseData.success).toBe(true)
    expect(responseData.settings).toEqual(updatedSettings)
    expect(responseData.message).toBe("Settings updated successfully")
  })

  it("should reject partial settings payloads", async () => {
    const updateData = {
      settings: {
        general: {
          soundEnabled: false,
        },
      },
    }

    const request = new NextRequest("http://localhost:3000/api/v1/settings", {
      method: "PATCH",
      body: JSON.stringify(updateData),
      headers: {
        "Content-Type": "application/json",
      },
    })

    const response = await PATCH(request)
    const responseData = await response.json()

    expect(response.status).toBe(400)
    expect(responseData.error).toBeDefined()
  })

  it("should handle file write failure gracefully", async () => {
    mockSafeWriteDataFile.mockResolvedValue(false)

    const updatedSettings: UserSettings = {
      ...DEFAULT_SETTINGS,
      general: {
        ...DEFAULT_SETTINGS.general,
        soundEnabled: false,
      },
    }

    const updateData = {
      settings: updatedSettings,
    }

    const request = new NextRequest("http://localhost:3000/api/v1/settings", {
      method: "PATCH",
      body: JSON.stringify(updateData),
      headers: {
        "Content-Type": "application/json",
      },
    })

    const response = await PATCH(request)
    const responseData = await response.json()

    expect(response.status).toBe(500)
    expect(responseData.error).toBeDefined()
  })

  it("should handle file read failure gracefully", async () => {
    mockSafeReadDataFile.mockResolvedValue(undefined)

    const updatedSettings: UserSettings = {
      ...DEFAULT_SETTINGS,
      general: {
        ...DEFAULT_SETTINGS.general,
        soundEnabled: false,
      },
    }

    const updateData = {
      settings: updatedSettings,
    }

    const request = new NextRequest("http://localhost:3000/api/v1/settings", {
      method: "PATCH",
      body: JSON.stringify(updateData),
      headers: {
        "Content-Type": "application/json",
      },
    })

    const response = await PATCH(request)
    const responseData = await response.json()

    expect(response.status).toBe(500)
    expect(responseData.error).toBeDefined()
  })

  it("should verify provided settings are persisted to file", async () => {
    const updatedSettings: UserSettings = {
      ...DEFAULT_SETTINGS,
      general: {
        ...DEFAULT_SETTINGS.general,
        soundEnabled: false,
      },
    }

    const updateData = {
      settings: updatedSettings,
    }

    const request = new NextRequest("http://localhost:3000/api/v1/settings", {
      method: "PATCH",
      body: JSON.stringify(updateData),
      headers: {
        "Content-Type": "application/json",
      },
    })

    const response = await PATCH(request)
    await response.json()

    expect(response.status).toBe(200)
    expect(mockSafeWriteDataFile).toHaveBeenCalled()

    const writeCall = mockSafeWriteDataFile.mock.calls[0]
    if (!writeCall || !writeCall[0]) {
      throw new Error("Expected mockSafeWriteDataFile to have been called with arguments")
    }

    const writtenData = writeCall[0].data

    // Verify settings were written exactly as provided
    expect(writtenData.settings).toEqual(updatedSettings)
  })
})
