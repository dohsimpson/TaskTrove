import React from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@/test-utils"
import { Toaster } from "./toaster"
import { useToast } from "@/hooks/use-toast"

// Mock the toast hook
vi.mock("@/hooks/use-toast", () => ({
  useToast: vi.fn(),
}))

const mockUseToast = vi.mocked(useToast)

describe("Toaster", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseToast.mockReturnValue({
      toasts: [],
      toast: vi.fn(),
      dismiss: vi.fn(),
    })
  })

  it("renders without crashing", () => {
    render(<Toaster />)
    // Should render ToastProvider and ToastViewport without errors
  })

  it("renders when no toasts are present", () => {
    mockUseToast.mockReturnValue({
      toasts: [],
      toast: vi.fn(),
      dismiss: vi.fn(),
    })

    render(<Toaster />)

    // Should not show any toast content
    expect(screen.queryByRole("status")).not.toBeInTheDocument()
  })

  it("renders toast with title only", () => {
    mockUseToast.mockReturnValue({
      toasts: [
        {
          id: "1",
          title: "Test Toast",
          open: true,
        },
      ],
      toast: vi.fn(),
      dismiss: vi.fn(),
    })

    render(<Toaster />)

    expect(screen.getByText("Test Toast")).toBeInTheDocument()
  })

  it("renders toast with description only", () => {
    mockUseToast.mockReturnValue({
      toasts: [
        {
          id: "1",
          description: "Test description",
          open: true,
        },
      ],
      toast: vi.fn(),
      dismiss: vi.fn(),
    })

    render(<Toaster />)

    expect(screen.getByText("Test description")).toBeInTheDocument()
  })

  it("renders toast with both title and description", () => {
    mockUseToast.mockReturnValue({
      toasts: [
        {
          id: "1",
          title: "Test Toast",
          description: "Test description",
          open: true,
        },
      ],
      toast: vi.fn(),
      dismiss: vi.fn(),
    })

    render(<Toaster />)

    expect(screen.getByText("Test Toast")).toBeInTheDocument()
    expect(screen.getByText("Test description")).toBeInTheDocument()
  })

  it("renders toast with action button", () => {
    const mockAction = <button>Action</button>

    mockUseToast.mockReturnValue({
      toasts: [
        {
          id: "1",
          title: "Test Toast",
          action: mockAction,
          open: true,
        },
      ],
      toast: vi.fn(),
      dismiss: vi.fn(),
    })

    render(<Toaster />)

    expect(screen.getByText("Test Toast")).toBeInTheDocument()
    expect(screen.getByText("Action")).toBeInTheDocument()
  })

  it("renders close button for all toasts", () => {
    mockUseToast.mockReturnValue({
      toasts: [
        {
          id: "1",
          title: "Test Toast",
          open: true,
        },
      ],
      toast: vi.fn(),
      dismiss: vi.fn(),
    })

    render(<Toaster />)

    // ToastClose should be present
    const closeButton = screen.getByRole("button")
    expect(closeButton).toBeInTheDocument()
    expect(closeButton).toHaveAttribute("toast-close")
  })

  it("renders multiple toasts", () => {
    mockUseToast.mockReturnValue({
      toasts: [
        {
          id: "1",
          title: "First Toast",
          open: true,
        },
        {
          id: "2",
          title: "Second Toast",
          open: true,
        },
      ],
      toast: vi.fn(),
      dismiss: vi.fn(),
    })

    render(<Toaster />)

    expect(screen.getByText("First Toast")).toBeInTheDocument()
    expect(screen.getByText("Second Toast")).toBeInTheDocument()
  })

  it("passes through toast props correctly", () => {
    mockUseToast.mockReturnValue({
      toasts: [
        {
          id: "1",
          title: "Test Toast",
          variant: "destructive",
          open: true,
        },
      ],
      toast: vi.fn(),
      dismiss: vi.fn(),
    })

    render(<Toaster />)

    // Should render with destructive variant
    expect(screen.getByText("Test Toast")).toBeInTheDocument()
  })

  it("handles toast without title or description", () => {
    mockUseToast.mockReturnValue({
      toasts: [
        {
          id: "1",
          open: true,
        },
      ],
      toast: vi.fn(),
      dismiss: vi.fn(),
    })

    render(<Toaster />)

    // Should still render the toast container and close button
    const closeButton = screen.getByRole("button")
    expect(closeButton).toBeInTheDocument()
  })

  it("handles closed toasts", () => {
    mockUseToast.mockReturnValue({
      toasts: [
        {
          id: "1",
          title: "Test Toast",
          open: false,
        },
      ],
      toast: vi.fn(),
      dismiss: vi.fn(),
    })

    render(<Toaster />)

    // When toast is closed, it might not be visible in the DOM
    // We should verify the Toaster still renders without errors
    expect(screen.queryByText("Test Toast")).toBeNull()
  })

  it("renders ToastProvider and ToastViewport", () => {
    const { container } = render(<Toaster />)

    // Should have the viewport structure (check for the region role)
    expect(container.querySelector('[role="region"]')).toBeTruthy()
  })
})
