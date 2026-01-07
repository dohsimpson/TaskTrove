import { describe, it, expect, beforeEach, vi } from "vitest"
import { NextRequest } from "next/server"
import { GET } from "./route"
import { checkStartupPermissions, formatPermissionErrors } from "@/lib/startup-checks"
import { safeReadDataFile } from "@/lib/utils/safe-file-operations"
import { DEFAULT_EMPTY_DATA_FILE } from "@tasktrove/types/defaults"

vi.mock("@/lib/startup-checks", () => ({
  checkStartupPermissions: vi.fn(),
  formatPermissionErrors: vi.fn(),
}))

vi.mock("@/lib/utils/safe-file-operations", () => ({
  safeReadDataFile: vi.fn(),
}))

vi.mock("@/lib/utils/logger", () => ({
  log: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

describe("/api/health", () => {
  const mockCheckStartupPermissions = vi.mocked(checkStartupPermissions)
  const mockFormatPermissionErrors = vi.mocked(formatPermissionErrors)
  const mockSafeReadDataFile = vi.mocked(safeReadDataFile)

  const createRequest = () => new NextRequest("http://localhost:3000/api/health")

  beforeEach(() => {
    vi.clearAllMocks()
    mockFormatPermissionErrors.mockReturnValue("Formatted errors")
  })

  it("returns needs_migration before validating the data file", async () => {
    mockCheckStartupPermissions.mockResolvedValue({
      success: true,
      errors: [],
      dataFileCheck: {
        exists: true,
        needsMigration: true,
        migrationInfo: {
          currentVersion: "v0.1.0",
          targetVersion: "v0.2.0",
          needsMigration: true,
        },
      },
    })

    const response = await GET(createRequest())
    const data = await response.json()

    expect(data.status).toBe("needs_migration")
    expect(mockSafeReadDataFile).not.toHaveBeenCalled()
  })

  it("returns needs_initialization before validating the data file", async () => {
    mockCheckStartupPermissions.mockResolvedValue({
      success: false,
      errors: [],
      dataFileCheck: {
        exists: false,
        needsInitialization: true,
      },
    })

    const response = await GET(createRequest())
    const data = await response.json()

    expect(data.status).toBe("needs_initialization")
    expect(mockSafeReadDataFile).not.toHaveBeenCalled()
  })

  it("returns error when data file validation fails", async () => {
    mockCheckStartupPermissions.mockResolvedValue({
      success: true,
      errors: [],
      dataFileCheck: {
        exists: true,
        needsMigration: false,
      },
    })
    mockSafeReadDataFile.mockResolvedValue(undefined)

    const response = await GET(createRequest())
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.status).toBe("error")
    expect(data.message).toBe("Data file validation failed")
    expect(mockSafeReadDataFile).toHaveBeenCalledTimes(1)
  })

  it("returns healthy when data file validation succeeds", async () => {
    mockCheckStartupPermissions.mockResolvedValue({
      success: true,
      errors: [],
      dataFileCheck: {
        exists: true,
        needsMigration: false,
      },
    })
    mockSafeReadDataFile.mockResolvedValue(DEFAULT_EMPTY_DATA_FILE)

    const response = await GET(createRequest())
    const data = await response.json()

    expect(data.status).toBe("healthy")
    expect(mockSafeReadDataFile).toHaveBeenCalledTimes(1)
  })
})
