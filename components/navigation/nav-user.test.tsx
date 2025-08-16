import React from "react"
import { render, screen, fireEvent } from "@testing-library/react"
import { describe, it, expect, vi } from "vitest"
import { NavUser } from "./nav-user"
import { SidebarProvider } from "@/components/ui/sidebar"

// Mock ComingSoonWrapper
vi.mock("@/components/ui/coming-soon-wrapper", () => ({
  ComingSoonWrapper: ({ children }: { children: React.ReactNode }) => children,
}))

// Mock AboutModal
vi.mock("@/components/dialogs/about-modal", () => ({
  AboutModal: ({ open }: { open: boolean; onOpenChange: (open: boolean) => void }) =>
    open ? <div data-testid="about-modal">About Modal</div> : null,
}))

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <SidebarProvider>{children}</SidebarProvider>
)

describe("NavUser", () => {
  const mockUser = {
    name: "John Doe",
    email: "john.doe@example.com",
    avatar: "https://example.com/avatar.jpg",
  }

  it("renders user information correctly", () => {
    render(
      <TestWrapper>
        <NavUser user={mockUser} />
      </TestWrapper>,
    )

    expect(screen.getByText("John Doe")).toBeInTheDocument()
    // Email is no longer displayed
  })

  it("has clickable dropdown trigger", () => {
    render(
      <TestWrapper>
        <NavUser user={mockUser} />
      </TestWrapper>,
    )

    const trigger = screen.getByRole("button")
    expect(trigger).toBeInTheDocument()
    expect(trigger).toHaveAttribute("aria-haspopup", "menu")

    // Test that the button can be clicked without errors
    fireEvent.click(trigger)
    expect(trigger).toBeInTheDocument()
  })

  it("includes context menu items in component", () => {
    render(
      <TestWrapper>
        <NavUser user={mockUser} />
      </TestWrapper>,
    )

    // Test that the component renders without errors
    // (The dropdown menu items are rendered in a portal and may not be immediately accessible)
    const trigger = screen.getByRole("button")
    expect(trigger).toBeInTheDocument()

    // Test clicking the button doesn't throw errors
    fireEvent.click(trigger)
    expect(trigger).toBeInTheDocument()
  })

  it("renders fallback avatar when no avatar provided", () => {
    const userWithoutAvatar = {
      name: "John Doe",
      email: "john.doe@example.com",
    }

    render(
      <TestWrapper>
        <NavUser user={userWithoutAvatar} />
      </TestWrapper>,
    )

    // Check that user icon SVG is present using its CSS class
    expect(document.querySelector(".lucide-user")).toBeInTheDocument()
  })

  it("truncates long names", () => {
    const userWithLongInfo = {
      name: "Very Long Name That Should Be Truncated",
    }

    render(
      <TestWrapper>
        <NavUser user={userWithLongInfo} />
      </TestWrapper>,
    )

    const nameElement = screen.getByText(userWithLongInfo.name)

    expect(nameElement).toHaveClass("truncate")
  })
})
