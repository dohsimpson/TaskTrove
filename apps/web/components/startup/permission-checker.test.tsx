import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { PermissionChecker } from "./permission-checker"
import { useAtomValue } from "jotai"

vi.mock("jotai", async () => {
  const actual = await vi.importActual<typeof import("jotai")>("jotai")
  return {
    ...actual,
    useAtomValue: vi.fn(),
  }
})

describe("PermissionChecker", () => {
  const mockUseAtomValue = vi.mocked(useAtomValue)
  const mockFetch = vi.fn()

  beforeEach(() => {
    mockUseAtomValue.mockReturnValue({ invalidateQueries: vi.fn() })
    vi.stubGlobal("fetch", mockFetch)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it("shows a validation error alert when the health check fails validation", async () => {
    mockFetch.mockResolvedValue({
      json: async () => ({
        status: "error",
        message: "Data file validation failed",
        timestamp: new Date().toISOString(),
      }),
    })

    render(<PermissionChecker />)

    expect(await screen.findByText("Data File Validation Failed")).toBeInTheDocument()
    expect(screen.getByText(/could not validate your data file/i)).toBeInTheDocument()
  })
})
