import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"
import { mkdtemp, readFile } from "fs/promises"
import { tmpdir } from "os"
import { join } from "path"

import { GET } from "./[...path]/route"
import { getSecureAssetPath } from "@/lib/utils/path-validation"
import { createMockEnhancedRequest } from "@/lib/utils/test-helpers"

vi.mock("fs/promises", async () => {
  const actual = await vi.importActual<typeof import("fs/promises")>("fs/promises")
  return {
    ...actual,
    readFile: vi.fn(),
  }
})

vi.mock("@/lib/utils/path-validation", () => ({
  getSecureAssetPath: vi.fn(),
}))

const mockGetSecureAssetPath = vi.mocked(getSecureAssetPath)

describe("GET /api/v1/assets when path points to a directory", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns 404 and does not attempt to read the directory", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "asset-dir-"))

    mockGetSecureAssetPath.mockReturnValue(tempDir)

    const readFileSpy = vi.mocked(readFile)

    const request = new NextRequest("http://localhost:3000/api/v1/assets/avatar/test")
    const enhancedRequest = createMockEnhancedRequest(request)
    const response = await GET(enhancedRequest, {
      params: Promise.resolve({ path: ["avatar", "test"] }),
    })

    expect(response.status).toBe(404)

    const body = await response.json()
    expect(body).toEqual({
      code: "ASSET_NOT_FOUND",
      error: "Asset not found",
      message: "Requested asset path is not a file",
    })

    expect(readFileSpy).not.toHaveBeenCalled()
  })
})
