import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import { createUserId } from "@tasktrove/types/id"
import { EnsureUserFile } from "./ensure-user-file"

// Mock the safe-file-operations module
vi.mock("@/lib/utils/safe-file-operations", () => ({
  safeReadUserFile: vi.fn(),
}))

describe("EnsureUserFile", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should render children without error banner when user file is valid", async () => {
    const { safeReadUserFile } = await import("@/lib/utils/safe-file-operations")
    vi.mocked(safeReadUserFile).mockResolvedValue({
      user: {
        id: createUserId("123e4567-e89b-12d3-a456-426614174000"),
        username: "testuser",
        password: "hashedpassword",
        avatar: undefined,
      },
    })

    render(
      await EnsureUserFile({
        children: <div>Test Content</div>,
      }),
    )

    expect(screen.getByText("Test Content")).toBeInTheDocument()
    expect(screen.queryByText("Data File Error")).not.toBeInTheDocument()
  })

  it("should render children and show error banner when user file cannot be read", async () => {
    const { safeReadUserFile } = await import("@/lib/utils/safe-file-operations")
    vi.mocked(safeReadUserFile).mockResolvedValue(undefined)

    render(
      await EnsureUserFile({
        children: <div>Test Content</div>,
      }),
    )

    // Children should still render
    expect(screen.getByText("Test Content")).toBeInTheDocument()

    // Error banner should be visible
    expect(screen.getByText("Data File Error")).toBeInTheDocument()
    expect(screen.getByText(/Unable to read or validate the user data file/)).toBeInTheDocument()
  })

  it("should show possible causes in error banner", async () => {
    const { safeReadUserFile } = await import("@/lib/utils/safe-file-operations")
    vi.mocked(safeReadUserFile).mockResolvedValue(undefined)

    render(
      await EnsureUserFile({
        children: <div>Test Content</div>,
      }),
    )

    expect(screen.getByText("Possible causes:")).toBeInTheDocument()
    expect(screen.getByText(/Data file does not exist/)).toBeInTheDocument()
    expect(screen.getByText(/Data file is corrupted or has invalid format/)).toBeInTheDocument()
    expect(screen.getByText(/Insufficient file permissions/)).toBeInTheDocument()
  })
})
