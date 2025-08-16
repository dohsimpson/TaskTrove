import React from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@/test-utils"
import { SidebarNav } from "./sidebar-nav"

// Mock component props interfaces
interface MockUtilsArgs {
  [key: string]: unknown
}

interface MockButtonProps {
  children: React.ReactNode
  onClick?: () => void
  className?: string
  variant?: string
  [key: string]: unknown
}

interface MockButtonVariantProps {
  variant?: string
}

// Mock the cn utility
vi.mock("@/lib/utils", () => ({
  cn: (...args: MockUtilsArgs[]) => args.filter(Boolean).join(" "),
}))

// Mock the Button component
vi.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, className, variant, ...props }: MockButtonProps) => (
    <button onClick={onClick} className={className} data-variant={variant} {...props}>
      {children}
    </button>
  ),
  buttonVariants: ({ variant }: MockButtonVariantProps) => `button-${variant}`,
}))

describe("SidebarNav", () => {
  const mockItems = [
    { id: "profile", title: "Profile" },
    { id: "notifications", title: "Notifications" },
    { id: "appearance", title: "Appearance" },
  ]

  const mockOnSectionChange = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders navigation with all items", () => {
    render(
      <SidebarNav
        items={mockItems}
        activeSection="profile"
        onSectionChange={mockOnSectionChange}
      />,
    )

    expect(screen.getByRole("navigation")).toBeInTheDocument()
    expect(screen.getByText("Profile")).toBeInTheDocument()
    expect(screen.getByText("Notifications")).toBeInTheDocument()
    expect(screen.getByText("Appearance")).toBeInTheDocument()
  })

  it("renders correct number of navigation items", () => {
    render(
      <SidebarNav
        items={mockItems}
        activeSection="profile"
        onSectionChange={mockOnSectionChange}
      />,
    )

    const buttons = screen.getAllByRole("button")
    expect(buttons).toHaveLength(3)
  })

  it("applies active styling to current section", () => {
    render(
      <SidebarNav
        items={mockItems}
        activeSection="notifications"
        onSectionChange={mockOnSectionChange}
      />,
    )

    const buttons = screen.getAllByRole("button")
    const notificationsButton = buttons.find((button) => button.textContent === "Notifications")
    const profileButton = buttons.find((button) => button.textContent === "Profile")

    expect(notificationsButton).toHaveClass("bg-muted hover:bg-muted")
    expect(profileButton).toHaveClass("hover:bg-transparent hover:underline")
  })

  it("calls onSectionChange when item is clicked", () => {
    render(
      <SidebarNav
        items={mockItems}
        activeSection="profile"
        onSectionChange={mockOnSectionChange}
      />,
    )

    fireEvent.click(screen.getByText("Notifications"))
    expect(mockOnSectionChange).toHaveBeenCalledWith("notifications")
  })

  it("calls onSectionChange with correct id for each item", () => {
    render(
      <SidebarNav
        items={mockItems}
        activeSection="profile"
        onSectionChange={mockOnSectionChange}
      />,
    )

    fireEvent.click(screen.getByText("Profile"))
    expect(mockOnSectionChange).toHaveBeenCalledWith("profile")

    fireEvent.click(screen.getByText("Appearance"))
    expect(mockOnSectionChange).toHaveBeenCalledWith("appearance")
  })

  it("renders with custom className", () => {
    render(
      <SidebarNav
        items={mockItems}
        activeSection="profile"
        onSectionChange={mockOnSectionChange}
        className="custom-nav-class"
      />,
    )

    const nav = screen.getByRole("navigation")
    expect(nav).toHaveClass("custom-nav-class")
  })

  it("passes through additional props", () => {
    render(
      <SidebarNav
        items={mockItems}
        activeSection="profile"
        onSectionChange={mockOnSectionChange}
        data-testid="sidebar-nav"
      />,
    )

    expect(screen.getByTestId("sidebar-nav")).toBeInTheDocument()
  })

  it("has proper navigation structure", () => {
    render(
      <SidebarNav
        items={mockItems}
        activeSection="profile"
        onSectionChange={mockOnSectionChange}
      />,
    )

    const nav = screen.getByRole("navigation")
    expect(nav).toHaveClass("flex space-x-2 lg:flex-col lg:space-x-0 lg:space-y-1")
  })

  it("all buttons have ghost variant", () => {
    render(
      <SidebarNav
        items={mockItems}
        activeSection="profile"
        onSectionChange={mockOnSectionChange}
      />,
    )

    const buttons = screen.getAllByRole("button")
    buttons.forEach((button) => {
      expect(button).toHaveAttribute("data-variant", "ghost")
    })
  })

  it("all buttons have justify-start class", () => {
    render(
      <SidebarNav
        items={mockItems}
        activeSection="profile"
        onSectionChange={mockOnSectionChange}
      />,
    )

    const buttons = screen.getAllByRole("button")
    buttons.forEach((button) => {
      expect(button).toHaveClass("justify-start")
    })
  })

  it("handles empty items array", () => {
    render(<SidebarNav items={[]} activeSection="profile" onSectionChange={mockOnSectionChange} />)

    expect(screen.getByRole("navigation")).toBeInTheDocument()
    expect(screen.queryByRole("button")).not.toBeInTheDocument()
  })

  it("handles different active section", () => {
    render(
      <SidebarNav
        items={mockItems}
        activeSection="appearance"
        onSectionChange={mockOnSectionChange}
      />,
    )

    const buttons = screen.getAllByRole("button")
    const appearanceButton = buttons.find((button) => button.textContent === "Appearance")
    const profileButton = buttons.find((button) => button.textContent === "Profile")

    expect(appearanceButton).toHaveClass("bg-muted hover:bg-muted")
    expect(profileButton).toHaveClass("hover:bg-transparent hover:underline")
  })

  it("handles multiple clicks correctly", () => {
    render(
      <SidebarNav
        items={mockItems}
        activeSection="profile"
        onSectionChange={mockOnSectionChange}
      />,
    )

    fireEvent.click(screen.getByText("Notifications"))
    fireEvent.click(screen.getByText("Appearance"))
    fireEvent.click(screen.getByText("Profile"))

    expect(mockOnSectionChange).toHaveBeenCalledTimes(3)
    expect(mockOnSectionChange).toHaveBeenNthCalledWith(1, "notifications")
    expect(mockOnSectionChange).toHaveBeenNthCalledWith(2, "appearance")
    expect(mockOnSectionChange).toHaveBeenNthCalledWith(3, "profile")
  })

  it("renders items in correct order", () => {
    render(
      <SidebarNav
        items={mockItems}
        activeSection="profile"
        onSectionChange={mockOnSectionChange}
      />,
    )

    const buttons = screen.getAllByRole("button")
    expect(buttons[0]).toHaveTextContent("Profile")
    expect(buttons[1]).toHaveTextContent("Notifications")
    expect(buttons[2]).toHaveTextContent("Appearance")
  })
})
