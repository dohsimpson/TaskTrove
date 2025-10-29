/**
 * Tests for the /api/data/initialize endpoint
 *
 * This file tests the data file initialization endpoint security and functionality.
 */

import { describe, it, expect, beforeEach, vi } from "vitest"
import { NextRequest } from "next/server"
import { POST } from "./route"
import { checkDataFile } from "@/lib/startup-checks"
import { isValidOrigin } from "@/lib/utils/origin-validation"

// Mock the startup checks
vi.mock("@/lib/startup-checks")

// Mock fs completely
vi.mock("fs", () => {
  const mockPromises = {
    writeFile: vi.fn().mockResolvedValue(undefined),
    access: vi.fn().mockRejectedValue(new Error("ENOENT")),
    readFile: vi.fn(),
    stat: vi.fn(),
    unlink: vi.fn(),
    mkdir: vi.fn().mockResolvedValue(undefined),
  }

  return {
    default: {
      promises: mockPromises,
    },
    promises: mockPromises,
  }
})

// Mock the logger
vi.mock("@/lib/utils/logger", () => ({
  log: {
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

// Mock the origin validation
vi.mock("@/lib/utils/origin-validation", () => ({
  isValidOrigin: vi.fn(),
}))

describe("/api/data/initialize", () => {
  const mockCheckDataFile = vi.mocked(checkDataFile)
  const mockIsValidOrigin = vi.mocked(isValidOrigin)
  let mockWriteFile: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    vi.clearAllMocks()
    // Get the mocked fs from the module
    const mockFs = vi.mocked(await import("fs"))
    mockWriteFile = vi.mocked(mockFs.promises.writeFile)

    // Default to valid origin unless specified otherwise
    mockIsValidOrigin.mockReturnValue(true)
  })

  describe("POST - Security Tests", () => {
    it("should reject requests from external origins", async () => {
      // Mock invalid origin
      mockIsValidOrigin.mockReturnValue(false)

      const request = new NextRequest("http://localhost:3000/api/data/initialize", {
        method: "POST",
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.code).toBe("INVALID_ORIGIN")
      expect(data.error).toBe("Forbidden")
      expect(data.message).toBe("Invalid request origin")
    })

    it("should accept requests from same origin", async () => {
      // Mock valid origin (already set in beforeEach)
      // Mock that no data file exists
      mockCheckDataFile.mockResolvedValue({
        exists: false,
        needsInitialization: true,
      })
      // Mock successful write
      mockWriteFile.mockResolvedValue(undefined)

      const request = new NextRequest("http://localhost:3000/api/data/initialize", {
        method: "POST",
        body: JSON.stringify({}),
        headers: { "Content-Type": "application/json" },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.status).toBe("success")
      expect(data.message).toBe("Data file initialized successfully")
    })

    it("should allow requests with no origin (server-to-server)", async () => {
      // Mock valid origin (already set in beforeEach)
      // Mock that no data file exists
      mockCheckDataFile.mockResolvedValue({
        exists: false,
        needsInitialization: true,
      })
      // Mock successful write
      mockWriteFile.mockResolvedValue(undefined)

      const request = new NextRequest("http://localhost:3000/api/data/initialize", {
        method: "POST",
        body: JSON.stringify({}),
        headers: { "Content-Type": "application/json" },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.status).toBe("success")
    })

    it("should reject requests with mismatched referer", async () => {
      // Mock invalid origin
      mockIsValidOrigin.mockReturnValue(false)

      const request = new NextRequest("http://localhost:3000/api/data/initialize", {
        method: "POST",
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.code).toBe("INVALID_ORIGIN")
      expect(data.error).toBe("Forbidden")
      expect(data.message).toBe("Invalid request origin")
    })
  })

  describe("POST - Functionality Tests", () => {
    it("should reject initialization when data file already exists", async () => {
      // Mock that data file already exists
      mockCheckDataFile.mockResolvedValue({
        exists: true,
      })

      const request = new NextRequest("http://localhost:3000/api/data/initialize", {
        method: "POST",
        body: JSON.stringify({}),
        headers: { "Content-Type": "application/json" },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.code).toBe("INITIALIZATION_FORBIDDEN")
      expect(data.error).toBe("Data file already exists")
      expect(data.message).toBe(
        "Data file initialization is only allowed when no existing data file is present",
      )
    })

    it("should handle data file check errors gracefully", async () => {
      // Mock data file check error
      mockCheckDataFile.mockRejectedValue(new Error("File system error"))

      const request = new NextRequest("http://localhost:3000/api/data/initialize", {
        method: "POST",
        body: JSON.stringify({}),
        headers: { "Content-Type": "application/json" },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.code).toBe("INITIALIZATION_FAILED")
      expect(data.error).toBe("Failed to initialize data file")
      expect(data.message).toContain("File system error")
    })

    it("should accept initialization when no data file exists", async () => {
      // Mock that no data file exists
      mockCheckDataFile.mockResolvedValue({
        exists: false,
        needsInitialization: true,
      })
      // Mock successful write
      mockWriteFile.mockResolvedValue(undefined)

      const request = new NextRequest("http://localhost:3000/api/data/initialize", {
        method: "POST",
        body: JSON.stringify({}),
        headers: { "Content-Type": "application/json" },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.status).toBe("success")
      expect(data.message).toBe("Data file initialized successfully")
    })
  })
})
