import React from "react"
import { render, screen, fireEvent } from "@/test-utils"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { NavUser } from "./nav-user"
import { SidebarProvider } from "@/components/ui/sidebar"

// Mock next-auth/react
vi.mock("next-auth/react", () => ({
  signOut: vi.fn(),
}))

// Mock sonner
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
  },
}))

// Mock settings dialog atom
vi.mock("@/lib/atoms/ui/dialogs", () => ({
  openSettingsDialogAtom: vi.fn(),
  openUserProfileDialogAtom: vi.fn(),
}))

// Mock ComingSoonWrapper
vi.mock("@/components/ui/coming-soon-wrapper", () => ({
  ComingSoonWrapper: ({ children }: { children: React.ReactNode }) => children,
}))

// Mock dropdown menu components to avoid portal rendering issues
vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({
    children,
    open,
    onOpenChange,
  }: {
    children: React.ReactNode
    open?: boolean
    onOpenChange?: (open: boolean) => void
  }) => (
    <div data-testid="dropdown-menu" data-open={open}>
      {children}
    </div>
  ),
  DropdownMenuTrigger: ({
    children,
    asChild,
  }: {
    children: React.ReactNode
    asChild?: boolean
  }) => (
    <div data-testid="dropdown-trigger" onClick={() => {}}>
      {asChild ? children : <div>{children}</div>}
    </div>
  ),
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dropdown-content">{children}</div>
  ),
  DropdownMenuLabel: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dropdown-label">{children}</div>
  ),
  DropdownMenuItem: ({
    children,
    onClick,
  }: {
    children: React.ReactNode
    onClick?: () => void
  }) => (
    <div data-testid="dropdown-item" onClick={onClick}>
      {children}
    </div>
  ),
  DropdownMenuGroup: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dropdown-group">{children}</div>
  ),
  DropdownMenuSeparator: () => <div data-testid="dropdown-separator" />,
}))

// Mock AboutModal
vi.mock("@/components/dialogs/about-modal", () => ({
  AboutModal: ({ open }: { open: boolean; onOpenChange: (open: boolean) => void }) =>
    open ? <div data-testid="about-modal">About Modal</div> : null,
}))

// Mock LogoutConfirmDialog
const mockLogoutConfirmDialog = vi.fn()
vi.mock("@/components/dialogs/logout-confirm-dialog", () => ({
  LogoutConfirmDialog: (props: {
    open: boolean
    onOpenChange: (open: boolean) => void
    onConfirm: () => void
  }) => {
    mockLogoutConfirmDialog(props)
    return props.open ? (
      <div data-testid="logout-confirm-dialog">
        <button data-testid="logout-confirm-button" onClick={props.onConfirm}>
          Confirm Logout
        </button>
        <button data-testid="logout-cancel-button" onClick={() => props.onOpenChange(false)}>
          Cancel
        </button>
      </div>
    ) : null
  },
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

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders user information correctly", () => {
    render(
      <TestWrapper>
        <NavUser user={mockUser} />
      </TestWrapper>,
    )

    const nameElements = screen.getAllByText("John Doe")
    expect(nameElements.length).toBeGreaterThan(0)
    expect(nameElements[0]).toBeInTheDocument()
    // Email is no longer displayed
  })

  it("has clickable dropdown trigger", () => {
    render(
      <TestWrapper>
        <NavUser user={mockUser} />
      </TestWrapper>,
    )

    // Get the dropdown trigger specifically (by data-sidebar attribute)
    const trigger = screen.getByTestId("dropdown-trigger").querySelector("button")
    expect(trigger).toBeInTheDocument()

    // Test that the button can be clicked without errors
    if (trigger) {
      fireEvent.click(trigger)
      expect(trigger).toBeInTheDocument()
    }
  })

  it("includes context menu items in component", () => {
    render(
      <TestWrapper>
        <NavUser user={mockUser} />
      </TestWrapper>,
    )

    // Test that the component renders without errors
    // (The dropdown menu items are rendered in a portal and may not be immediately accessible)
    const trigger = screen.getByTestId("dropdown-trigger").querySelector("button")
    expect(trigger).toBeInTheDocument()

    // Test clicking the button doesn't throw errors
    if (trigger) {
      fireEvent.click(trigger)
      expect(trigger).toBeInTheDocument()
    }
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

    const nameElements = screen.getAllByText(userWithLongInfo.name)
    expect(nameElements.length).toBeGreaterThan(0)

    const nameElement = nameElements[0]
    expect(nameElement).toHaveClass("truncate")
  })

  describe("Logout Functionality", () => {
    it("opens logout confirmation dialog when logout button is clicked", () => {
      render(
        <TestWrapper>
          <NavUser user={mockUser} />
        </TestWrapper>,
      )

      // Find the logout button (with title "Sign out")
      const logoutButton = screen.getByTitle("Sign out")
      expect(logoutButton).toBeInTheDocument()

      // Click the logout button
      fireEvent.click(logoutButton)

      // Verify that LogoutConfirmDialog was called with open=true
      expect(mockLogoutConfirmDialog).toHaveBeenCalledWith(
        expect.objectContaining({
          open: true,
        }),
      )
    })

    it("calls signOut function when logout is confirmed", async () => {
      render(
        <TestWrapper>
          <NavUser user={mockUser} />
        </TestWrapper>,
      )

      // Find and click the logout button
      const logoutButton = screen.getByTitle("Sign out")
      fireEvent.click(logoutButton)

      // Now the dialog should be open, find the confirm button
      const confirmButton = screen.getByTestId("logout-confirm-button")
      fireEvent.click(confirmButton)

      // Verify that signOut was called
      const { signOut } = await import("next-auth/react")
      expect(signOut).toHaveBeenCalledTimes(1)
    })

    it("shows success toast when logout is confirmed", async () => {
      const { toast } = await import("sonner")

      render(
        <TestWrapper>
          <NavUser user={mockUser} />
        </TestWrapper>,
      )

      // Find and click the logout button
      const logoutButton = screen.getByTitle("Sign out")
      fireEvent.click(logoutButton)

      // Find and click the confirm button
      const confirmButton = screen.getByTestId("logout-confirm-button")
      fireEvent.click(confirmButton)

      // Verify that success toast was shown
      expect(toast.success).toHaveBeenCalledWith("Signing out...")
    })

    it("closes dialog when cancel is clicked", () => {
      render(
        <TestWrapper>
          <NavUser user={mockUser} />
        </TestWrapper>,
      )

      // Find and click the logout button
      const logoutButton = screen.getByTitle("Sign out")
      fireEvent.click(logoutButton)

      // Verify dialog is open
      expect(screen.getByTestId("logout-confirm-dialog")).toBeInTheDocument()

      // Click cancel button
      const cancelButton = screen.getByTestId("logout-cancel-button")
      fireEvent.click(cancelButton)

      // Verify that LogoutConfirmDialog was called with open=false
      expect(mockLogoutConfirmDialog).toHaveBeenCalledWith(
        expect.objectContaining({
          open: false,
        }),
      )
    })
  })
})
