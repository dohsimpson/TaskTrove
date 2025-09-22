import React from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@/test-utils"
import { ComingSoonModal } from "./coming-soon-modal"

// Mock window.open
const mockWindowOpen = vi.fn()
Object.defineProperty(window, "open", {
  writable: true,
  value: mockWindowOpen,
})

describe("ComingSoonModal", () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    featureName: "Kanban Board",
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders modal when open", () => {
    render(<ComingSoonModal {...defaultProps} />)

    expect(screen.getByText("Kanban Board")).toBeInTheDocument()
    expect(screen.getByText("is cooking!")).toBeInTheDocument()
    expect(screen.getByText("Subscribe to Mailing List")).toBeInTheDocument()
    expect(screen.getByText("Maybe later")).toBeInTheDocument()
  })

  it("does not render modal when closed", () => {
    render(<ComingSoonModal {...defaultProps} isOpen={false} />)

    expect(screen.queryByText("Kanban Board")).not.toBeInTheDocument()
  })

  it("displays feature name in title", () => {
    render(<ComingSoonModal {...defaultProps} featureName="Calendar View" />)

    expect(screen.getByText("Calendar View")).toBeInTheDocument()
    expect(screen.getByText("is cooking!")).toBeInTheDocument()
  })

  it("opens mailing list when subscribe button is clicked", () => {
    render(<ComingSoonModal {...defaultProps} />)

    const subscribeButton = screen.getByText("Subscribe to Mailing List")
    fireEvent.click(subscribeButton)

    expect(mockWindowOpen).toHaveBeenCalledWith(
      "https://mailing.tasktrove.io/",
      "_blank",
      "noopener,noreferrer",
    )
  })

  it("calls onClose when Maybe later button is clicked", () => {
    const onClose = vi.fn()
    render(<ComingSoonModal {...defaultProps} onClose={onClose} />)

    const laterButton = screen.getByText("Maybe later")
    fireEvent.click(laterButton)

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it("displays animated mail icon", () => {
    render(<ComingSoonModal {...defaultProps} />)

    // Check for mail icon by looking for SVG with mail-specific class
    const mailIcon = document.querySelector(".lucide-mail")
    expect(mailIcon).toBeInTheDocument()
  })

  it("shows description about joining mailing list", () => {
    render(<ComingSoonModal {...defaultProps} />)

    expect(screen.getByText(/We're working hard on this feature/i)).toBeInTheDocument()
    expect(
      screen.getByText(/Join our mailing list to get news and updates about TaskTrove!/i),
    ).toBeInTheDocument()
  })
})
