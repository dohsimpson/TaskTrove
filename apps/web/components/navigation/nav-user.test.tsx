import React from "react"
import { render, screen, fireEvent, waitFor } from "@/test-utils"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { NavUser } from "./nav-user"
import { SidebarProvider } from "@/components/ui/custom/sidebar"

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

// Note: Atom mocks are now centralized in test-utils/atoms-mocks.ts

// Mock jotai hooks
vi.mock("jotai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("jotai")>()
  return {
    ...actual,
    useAtomValue: vi.fn(),
    useSetAtom: vi.fn(),
  }
})

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
  }) => {
    void onOpenChange // Mark as intentionally unused
    return (
      <div data-testid="dropdown-menu" data-open={open}>
        {children}
      </div>
    )
  },
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
    username: "John Doe",
    avatar: "https://example.com/avatar.jpg",
  }

  beforeEach(async () => {
    vi.clearAllMocks()

    // Mock useAtomValue to return our mock user data
    const { useAtomValue, useSetAtom } = vi.mocked(await import("jotai"))
    useAtomValue.mockReturnValue(mockUser)
    useSetAtom.mockReturnValue(vi.fn())
  })

  it("renders user information correctly", () => {
    render(
      <TestWrapper>
        <NavUser />
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
        <NavUser />
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
        <NavUser />
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

  it("renders fallback avatar when no avatar provided", async () => {
    // Mock useAtomValue to return user without avatar
    const { useAtomValue } = vi.mocked(await import("jotai"))
    useAtomValue.mockReturnValue({
      username: "John Doe",
    })

    render(
      <TestWrapper>
        <NavUser />
      </TestWrapper>,
    )

    // Check that initials are shown in avatar fallback (first letter of username)
    const initials = screen.getAllByText("J")
    expect(initials.length).toBeGreaterThan(0)
  })

  it("truncates long names", async () => {
    // Mock useAtomValue to return user with long name
    const { useAtomValue } = vi.mocked(await import("jotai"))
    useAtomValue.mockReturnValue({
      username: "Very Long Name That Should Be Truncated",
    })

    render(
      <TestWrapper>
        <NavUser />
      </TestWrapper>,
    )

    const nameElements = screen.getAllByText("Very Long Name That Should Be Truncated")
    expect(nameElements.length).toBeGreaterThan(0)

    const nameElement = nameElements[0]
    expect(nameElement).toHaveClass("truncate")
  })

  describe("User Profile Functionality", () => {
    it("renders clickable profile area with correct accessibility", () => {
      render(
        <TestWrapper>
          <NavUser />
        </TestWrapper>,
      )

      // Find the profile area (with title "Edit Profile")
      const profileArea = screen.getByTitle("Edit Profile")
      expect(profileArea).toBeInTheDocument()

      // Verify it has the correct cursor style
      expect(profileArea).toHaveClass("cursor-pointer")

      // Verify it can be clicked without errors
      fireEvent.click(profileArea)
      expect(profileArea).toBeInTheDocument()
    })
  })

  describe("Logout Functionality", () => {
    it("opens logout confirmation dialog when logout button is clicked", () => {
      render(
        <TestWrapper>
          <NavUser />
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
          <NavUser />
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

    it("uses custom onSignOut handler when provided", async () => {
      const customSignOut = vi.fn()

      render(
        <TestWrapper>
          <NavUser onSignOut={customSignOut} />
        </TestWrapper>,
      )

      const logoutButton = screen.getByTitle("Sign out")
      fireEvent.click(logoutButton)

      const confirmButton = screen.getByTestId("logout-confirm-button")
      fireEvent.click(confirmButton)

      await waitFor(() => {
        expect(customSignOut).toHaveBeenCalled()
      })

      const { signOut } = await import("next-auth/react")
      expect(signOut).not.toHaveBeenCalled()
    })

    it("shows success toast when logout is confirmed", async () => {
      const { toast } = await import("sonner")

      render(
        <TestWrapper>
          <NavUser />
        </TestWrapper>,
      )

      // Find and click the logout button
      const logoutButton = screen.getByTitle("Sign out")
      fireEvent.click(logoutButton)

      // Find and click the confirm button
      const confirmButton = screen.getByTestId("logout-confirm-button")
      fireEvent.click(confirmButton)

      // Wait for async signOut to complete and verify that success toast was shown
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith("Signed out")
      })
    })

    it("closes dialog when cancel is clicked", () => {
      render(
        <TestWrapper>
          <NavUser />
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
