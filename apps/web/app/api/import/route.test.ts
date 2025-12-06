import { describe, it, expect, beforeEach, vi } from "vitest"
import { POST } from "./route"
import { DEFAULT_EMPTY_DATA_FILE } from "@tasktrove/types/defaults"
import { createVersionString } from "@tasktrove/types/id"
import { LATEST_DATA_VERSION } from "@tasktrove/types/schema-version"
import { safeReadDataFile, safeWriteDataFile } from "@/lib/utils/safe-file-operations"
import { createMockEnhancedRequest } from "@/lib/utils/test-helpers"

vi.mock("@/lib/utils/safe-file-operations")

vi.mock("@/lib/utils/logger", () => ({
  log: {
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

vi.mock("@/lib/middleware/api-logger", () => ({
  withApiLogging: (handler: (...args: unknown[]) => unknown) => handler,
  withFileOperationLogging: async (operation: () => Promise<unknown>) => operation(),
  logBusinessEvent: vi.fn(),
}))

vi.mock("@/lib/middleware/auth", () => ({
  withAuthentication: (handler: (...args: unknown[]) => unknown) => handler,
}))

vi.mock("@/lib/utils/api-mutex", () => ({
  withMutexProtection: (handler: (...args: unknown[]) => unknown) => handler,
}))

vi.mock("@/lib/middleware/api-version", () => ({
  withApiVersion: (handler: (...args: unknown[]) => unknown) => handler,
}))

const mockSafeReadDataFile = vi.mocked(safeReadDataFile)
const mockSafeWriteDataFile = vi.mocked(safeWriteDataFile)

describe("/api/import", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSafeWriteDataFile.mockResolvedValue(true)
  })

  const buildRequest = (body: unknown) =>
    createMockEnhancedRequest(
      new Request("http://localhost:3000/api/import", {
        method: "POST",
        body: JSON.stringify(body),
        headers: { "Content-Type": "application/json" },
      }),
    )

  const baseImportPayload = {
    ...DEFAULT_EMPTY_DATA_FILE,
    user: {
      ...DEFAULT_EMPTY_DATA_FILE.user,
      id: DEFAULT_EMPTY_DATA_FILE.user.id,
    },
  }

  it("rejects import when current data version differs", async () => {
    mockSafeReadDataFile.mockResolvedValue({
      ...DEFAULT_EMPTY_DATA_FILE,
      version: createVersionString("v0.8.0"),
    })

    const request = buildRequest({
      ...baseImportPayload,
      version: LATEST_DATA_VERSION,
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(409)
    expect(data.code).toBe("RESOURCE_CONFLICT")
    expect(data.message).toContain("does not match current data version")
    expect(mockSafeWriteDataFile).not.toHaveBeenCalled()
  })

  it("allows import when versions match", async () => {
    mockSafeReadDataFile.mockResolvedValue({
      ...DEFAULT_EMPTY_DATA_FILE,
      version: LATEST_DATA_VERSION,
    })

    const request = buildRequest({
      ...baseImportPayload,
      version: LATEST_DATA_VERSION,
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(mockSafeWriteDataFile).toHaveBeenCalledTimes(1)
  })
})
