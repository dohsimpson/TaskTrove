/**
 * Tests for the /api/v1/settings endpoint
 *
 * Critical tests for the settings merge logic to ensure Pro fields are preserved.
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

  it("should update a single setting successfully", async () => {
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

    expect(response.status).toBe(200)
    expect(responseData.success).toBe(true)
    expect(responseData.settings.general.soundEnabled).toBe(false)
    expect(responseData.message).toBe("Settings updated successfully")
  })

  it("should preserve untouched fields during partial update", async () => {
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

    expect(response.status).toBe(200)
    expect(responseData.success).toBe(true)

    // Verify untouched fields are preserved
    expect(responseData.settings.general.startView).toBe(DEFAULT_SETTINGS.general.startView)
    expect(responseData.settings.general.linkifyEnabled).toBe(
      DEFAULT_SETTINGS.general.linkifyEnabled,
    )
    expect(responseData.settings.general.popoverHoverOpen).toBe(
      DEFAULT_SETTINGS.general.popoverHoverOpen,
    )
    expect(responseData.settings.notifications).toEqual(DEFAULT_SETTINGS.notifications)
    expect(responseData.settings.data).toEqual(DEFAULT_SETTINGS.data)
  })

  it("should deep merge nested autoBackup settings correctly", async () => {
    const updateData = {
      settings: {
        data: {
          autoBackup: {
            enabled: false,
            backupTime: "03:00",
            maxBackups: 10,
          },
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

    expect(response.status).toBe(200)
    expect(responseData.settings.data.autoBackup.enabled).toBe(false)
    expect(responseData.settings.data.autoBackup.backupTime).toBe("03:00")
    expect(responseData.settings.data.autoBackup.maxBackups).toBe(10)
    // Other top-level settings should be preserved
    expect(responseData.settings.notifications).toEqual(DEFAULT_SETTINGS.notifications)
    expect(responseData.settings.general).toEqual(DEFAULT_SETTINGS.general)
  })

  it("should update multiple settings categories at once", async () => {
    const updateData = {
      settings: {
        general: {
          soundEnabled: false,
          startView: "today",
        },
        notifications: {
          enabled: false,
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

    expect(response.status).toBe(200)
    expect(responseData.success).toBe(true)
    expect(responseData.settings.general.soundEnabled).toBe(false)
    expect(responseData.settings.general.startView).toBe("today")
    expect(responseData.settings.notifications.enabled).toBe(false)
    // Untouched notification field should be preserved
    expect(responseData.settings.notifications.requireInteraction).toBe(
      DEFAULT_SETTINGS.notifications.requireInteraction,
    )
  })

  it("should CRITICAL: preserve Pro productivity field during base field updates", async () => {
    // Simulate Pro settings with productivity field
    const proSettings = {
      ...DEFAULT_SETTINGS,
      productivity: {
        rewardTheme: "space",
        rewardsEnabled: true,
      },
    } as const

    mockSafeReadDataFile.mockResolvedValue({
      ...DEFAULT_EMPTY_DATA_FILE,
      settings: proSettings,
    })

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

    expect(response.status).toBe(200)
    expect(responseData.success).toBe(true)

    // CRITICAL: productivity field must be preserved
    expect(responseData.settings.productivity).toBeDefined()
    expect(responseData.settings.productivity.rewardTheme).toBe("space")
    expect(responseData.settings.productivity.rewardsEnabled).toBe(true)
  })

  it("should CRITICAL: preserve Pro general.newTaskOwnership field", async () => {
    // Simulate Pro settings with extended general field
    const proSettings = {
      ...DEFAULT_SETTINGS,
      general: {
        ...DEFAULT_SETTINGS.general,
        newTaskOwnership: "currentUser",
      },
    } as const

    mockSafeReadDataFile.mockResolvedValue({
      ...DEFAULT_EMPTY_DATA_FILE,
      settings: proSettings,
    })

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

    expect(response.status).toBe(200)
    expect(responseData.success).toBe(true)

    // CRITICAL: newTaskOwnership field must be preserved
    expect(responseData.settings.general.newTaskOwnership).toBe("currentUser")
    expect(responseData.settings.general.soundEnabled).toBe(false)
  })

  it("should handle empty partial settings gracefully", async () => {
    const updateData = {
      settings: {},
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
    // Settings should remain unchanged
    expect(responseData.settings).toEqual(DEFAULT_SETTINGS)
  })

  it("should handle file write failure gracefully", async () => {
    mockSafeWriteDataFile.mockResolvedValue(false)

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

    expect(response.status).toBe(500)
    expect(responseData.error).toBeDefined()
  })

  it("should handle file read failure gracefully", async () => {
    mockSafeReadDataFile.mockResolvedValue(undefined)

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

    expect(response.status).toBe(500)
    expect(responseData.error).toBeDefined()
  })

  it("should verify merged data is persisted to file", async () => {
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
    await response.json()

    expect(response.status).toBe(200)
    expect(mockSafeWriteDataFile).toHaveBeenCalled()

    const writeCall = mockSafeWriteDataFile.mock.calls[0]
    if (!writeCall || !writeCall[0]) {
      throw new Error("Expected mockSafeWriteDataFile to have been called with arguments")
    }

    const writtenData = writeCall[0].data

    // Verify all settings were written correctly
    expect(writtenData.settings.general.soundEnabled).toBe(false)
    expect(writtenData.settings.general.startView).toBe(DEFAULT_SETTINGS.general.startView)
    expect(writtenData.settings.notifications).toEqual(DEFAULT_SETTINGS.notifications)
    expect(writtenData.settings.data).toEqual(DEFAULT_SETTINGS.data)
  })
})
