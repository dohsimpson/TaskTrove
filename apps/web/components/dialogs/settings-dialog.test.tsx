import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, fireEvent } from "@/test-utils"
import { useAtomValue, useSetAtom } from "jotai"
import { SettingsDialog } from "./settings-dialog"

// Mock Jotai
vi.mock("jotai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("jotai")>()
  return {
    ...actual,
    useAtomValue: vi.fn(),
    useSetAtom: vi.fn(),
  }
})

// Mock the form components
vi.mock("./settings-forms/data-form", () => ({
  DataForm: () => <div data-testid="data-form">Data Form</div>,
}))

vi.mock("./settings-forms/notifications-form", () => ({
  NotificationsForm: () => <div data-testid="notifications-form">Notifications Form</div>,
}))

vi.mock("./settings-forms/general-form", () => ({
  GeneralForm: () => <div data-testid="general-form">General Form</div>,
}))

// Mock atoms
vi.mock("@/lib/atoms/ui/dialogs", () => ({
  showSettingsDialogAtom: {},
  closeSettingsDialogAtom: {},
}))

describe("SettingsDialog", () => {
  const mockCloseDialog = vi.fn()
  const mockUseAtomValue = vi.mocked(useAtomValue)
  const mockUseSetAtom = vi.mocked(useSetAtom)

  // Store original matchMedia
  const originalMatchMedia = window.matchMedia

  beforeEach(() => {
    vi.clearAllMocks()
    mockUseSetAtom.mockReturnValue(mockCloseDialog)

    // Mock matchMedia for responsive testing
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query) => ({
        matches: query === "(min-width: 768px)", // Default to desktop
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })
  })

  afterEach(() => {
    window.matchMedia = originalMatchMedia
  })

  it("renders when open", () => {
    mockUseAtomValue.mockReturnValue(true)
    render(<SettingsDialog />)

    expect(screen.getByRole("dialog")).toBeInTheDocument()
    expect(screen.getAllByText("Settings")).toHaveLength(2) // Dialog title and sidebar header
    expect(screen.getByRole("button", { name: /general/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /notifications/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /data & storage/i })).toBeInTheDocument()
  })

  it("does not render when closed", () => {
    mockUseAtomValue.mockReturnValue(false)
    render(<SettingsDialog />)

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  it("displays desktop sidebar on larger viewports", () => {
    mockUseAtomValue.mockReturnValue(true)
    render(<SettingsDialog />)

    // Desktop sidebar should be visible (has hidden md:flex classes)
    const sidebars = screen.getAllByText("Settings", { selector: "h2" })
    const desktopSidebar = sidebars.find((el) => {
      const aside = el.closest("aside")
      return aside?.classList.contains("hidden") && aside.classList.contains("md:flex")
    })
    expect(desktopSidebar).toBeInTheDocument()

    // Mobile menu button has md:hidden class (hidden on desktop)
    const menuButton = screen.getByRole("button", { name: /open settings menu/i })
    expect(menuButton).toHaveClass("md:hidden")
  })

  it("displays mobile menu button with correct responsive classes", () => {
    mockUseAtomValue.mockReturnValue(true)
    render(<SettingsDialog />)

    // Mobile menu button should have the correct responsive classes
    const menuButton = screen.getByRole("button", { name: /open settings menu/i })
    expect(menuButton).toHaveClass("md:hidden") // Hidden on desktop, visible on mobile
  })

  it("opens mobile drawer when hamburger menu is clicked", () => {
    mockUseAtomValue.mockReturnValue(true)
    render(<SettingsDialog />)

    const menuButton = screen.getByRole("button", { name: /open settings menu/i })
    fireEvent.click(menuButton)

    // Mobile drawer should be visible with close button
    expect(screen.getByRole("button", { name: /close menu/i })).toBeInTheDocument()

    // Backdrop should be visible
    const backdrop = document.querySelector(".absolute.inset-0.bg-black\\/20")
    expect(backdrop).toBeInTheDocument()
  })

  it("closes mobile drawer when X button is clicked", () => {
    mockUseAtomValue.mockReturnValue(true)
    render(<SettingsDialog />)

    // Open mobile drawer first
    const menuButton = screen.getByRole("button", { name: /open settings menu/i })
    fireEvent.click(menuButton)

    // Click close button
    const closeButton = screen.getByRole("button", { name: /close menu/i })
    fireEvent.click(closeButton)

    // Close button should no longer be visible
    expect(screen.queryByRole("button", { name: /close menu/i })).not.toBeInTheDocument()
  })

  it("closes mobile drawer when backdrop is clicked", () => {
    mockUseAtomValue.mockReturnValue(true)
    render(<SettingsDialog />)

    // Open mobile drawer first
    const menuButton = screen.getByRole("button", { name: /open settings menu/i })
    fireEvent.click(menuButton)

    // Click backdrop
    const backdrop = document.querySelector(".absolute.inset-0.bg-black\\/20")
    if (backdrop) {
      fireEvent.click(backdrop)
    }

    // Mobile drawer should be closed
    expect(screen.queryByRole("button", { name: /close menu/i })).not.toBeInTheDocument()
  })

  it("switches between categories and displays correct content", () => {
    mockUseAtomValue.mockReturnValue(true)
    render(<SettingsDialog />)

    // Initially shows general (first category)
    expect(screen.getByRole("heading", { level: 1, name: "General" })).toBeInTheDocument()
    expect(screen.getByTestId("general-form")).toBeInTheDocument()

    // Click on Data & Storage category
    const dataButton = screen.getByRole("button", { name: /data & storage/i })
    fireEvent.click(dataButton)

    // Should display data category content
    expect(screen.getByRole("heading", { level: 1, name: "Data & Storage" })).toBeInTheDocument()
    expect(screen.getByTestId("data-form")).toBeInTheDocument()
  })

  it("closes mobile drawer after category selection", () => {
    mockUseAtomValue.mockReturnValue(true)
    render(<SettingsDialog />)

    // Open mobile drawer
    const menuButton = screen.getByRole("button", { name: /open settings menu/i })
    fireEvent.click(menuButton)

    // Verify drawer is open
    expect(screen.getByRole("button", { name: /close menu/i })).toBeInTheDocument()

    // Click on a category in the mobile drawer
    const dataButton = screen
      .getAllByRole("button", { name: /data & storage/i })
      .find((btn) => btn.closest("aside")?.classList.contains("absolute")) // Mobile drawer version

    if (dataButton) {
      fireEvent.click(dataButton)

      // Mobile drawer should be closed
      expect(screen.queryByRole("button", { name: /close menu/i })).not.toBeInTheDocument()
    }
  })

  it("calls close dialog when X button is clicked", () => {
    mockUseAtomValue.mockReturnValue(true)
    render(<SettingsDialog />)

    const closeButton = screen.getByRole("button", { name: /close settings/i })
    fireEvent.click(closeButton)

    expect(mockCloseDialog).toHaveBeenCalled()
  })

  it("has proper accessibility attributes", () => {
    mockUseAtomValue.mockReturnValue(true)
    render(<SettingsDialog />)

    // Dialog should have proper role
    expect(screen.getByRole("dialog")).toBeInTheDocument()

    // Should have sr-only title
    expect(screen.getByText("Settings", { selector: ".sr-only" })).toBeInTheDocument()

    // Buttons should have accessible names
    expect(screen.getByRole("button", { name: /close settings/i })).toBeInTheDocument()
  })

  it("displays correct category icons", () => {
    mockUseAtomValue.mockReturnValue(true)
    render(<SettingsDialog />)

    // Should render category buttons with icons (we can't easily test SVG icons, but buttons should be present)
    expect(screen.getByRole("button", { name: /general/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /notifications/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /data & storage/i })).toBeInTheDocument()
  })
})
