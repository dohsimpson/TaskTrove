import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, fireEvent, TestJotaiProvider } from "@/test-utils"
import { SettingsDialog } from "./settings-dialog"
import { HydrateValues } from "@/test-utils/jotai-mocks"
import { showSettingsDialogAtom, closeSettingsDialogAtom } from "@tasktrove/atoms/ui/dialogs"
import {
  activeSettingsCategoryAtom,
  mobileSettingsDrawerOpenAtom,
} from "@tasktrove/atoms/ui/settings"

// We now rely on centralized atom mocks via test-utils/atoms-mocks.ts

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

vi.mock("./settings-forms/scheduler-form", () => ({
  SchedulerJobsForm: () => <div data-testid="scheduler-form">Scheduler Form</div>,
}))

// Note: Atom mocks are now centralized in test-utils/atoms-mocks.ts

describe("SettingsDialog", () => {
  const mockCloseDialog = vi.fn()

  // Store original matchMedia
  const originalMatchMedia = window.matchMedia

  beforeEach(() => {
    vi.clearAllMocks()

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

  const renderWithAtoms = (
    initial: Partial<{
      open: boolean
      category: string
      drawerOpen: boolean
    }> = {},
  ) => {
    const initialValues: HydrateValues = [
      [showSettingsDialogAtom, initial.open ?? true],
      [activeSettingsCategoryAtom, initial.category ?? "general"],
      [mobileSettingsDrawerOpenAtom, initial.drawerOpen ?? false],
      [closeSettingsDialogAtom, mockCloseDialog],
    ]
    return render(
      <TestJotaiProvider initialValues={initialValues}>
        <SettingsDialog />
      </TestJotaiProvider>,
    )
  }

  it("renders when open", () => {
    renderWithAtoms({ open: true, category: "general", drawerOpen: false })

    expect(screen.getByRole("dialog")).toBeInTheDocument()
    // We expect at least the dialog title and the desktop sidebar header
    expect(screen.getAllByText("Settings").length).toBeGreaterThanOrEqual(2)
    expect(screen.getByRole("button", { name: /general/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /notifications/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /data/i })).toBeInTheDocument()
  })

  it("does not render when closed", () => {
    renderWithAtoms({ open: false })

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  it("displays desktop sidebar on larger viewports", () => {
    renderWithAtoms({ open: true })

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
    renderWithAtoms({ open: true })

    // Mobile menu button should have the correct responsive classes
    const menuButton = screen.getByRole("button", { name: /open settings menu/i })
    expect(menuButton).toHaveClass("md:hidden") // Hidden on desktop, visible on mobile
  })

  it("opens mobile drawer when hamburger menu is clicked", () => {
    renderWithAtoms({ open: true })

    const menuButton = screen.getByRole("button", { name: /open settings menu/i })
    fireEvent.click(menuButton)

    // Mobile drawer should be visible with close button
    expect(screen.getByRole("button", { name: /close menu/i })).toBeInTheDocument()

    // Backdrop should be visible
    const backdrop = document.querySelector(".absolute.inset-0.bg-black\\/20")
    expect(backdrop).toBeInTheDocument()
  })

  it("closes mobile drawer when X button is clicked", () => {
    renderWithAtoms({ open: true })

    // Open mobile drawer first
    const menuButton = screen.getByRole("button", { name: /open settings menu/i })
    fireEvent.click(menuButton)

    // Click close button - this closes the entire dialog (expected behavior for mobile)
    const closeButton = screen.getByRole("button", { name: /close menu/i })
    fireEvent.click(closeButton)

    // Close function should have been called (closing entire dialog)
    expect(mockCloseDialog).toHaveBeenCalledTimes(1)
  })

  it("closes mobile drawer when backdrop is clicked", () => {
    renderWithAtoms({ open: true })

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
    renderWithAtoms({ open: true })

    // Initially shows general (first category)
    expect(screen.getByRole("heading", { level: 1, name: "General" })).toBeInTheDocument()
    expect(screen.getByTestId("general-form")).toBeInTheDocument()

    // Click on Data category
    const dataButton = screen.getByRole("button", { name: /data/i })
    fireEvent.click(dataButton)

    // Should display data category content
    expect(screen.getByRole("heading", { level: 1, name: "Data" })).toBeInTheDocument()
    expect(screen.getByTestId("data-form")).toBeInTheDocument()
  })

  it("closes mobile drawer after category selection", () => {
    renderWithAtoms({ open: true })

    // Open mobile drawer
    const menuButton = screen.getByRole("button", { name: /open settings menu/i })
    fireEvent.click(menuButton)

    // Verify drawer is open
    expect(screen.getByRole("button", { name: /close menu/i })).toBeInTheDocument()

    // Click on a category in the mobile drawer
    const dataButton = screen
      .getAllByRole("button", { name: /data/i })
      .find((btn) => btn.closest("aside")?.classList.contains("absolute")) // Mobile drawer version

    if (dataButton) {
      fireEvent.click(dataButton)

      // Mobile drawer should be closed
      expect(screen.queryByRole("button", { name: /close menu/i })).not.toBeInTheDocument()
    }
  })

  it("calls close dialog when X button is clicked", () => {
    renderWithAtoms({ open: true })

    const closeButton = screen.getByRole("button", { name: /close settings/i })
    fireEvent.click(closeButton)

    expect(mockCloseDialog).toHaveBeenCalled()
  })

  it("has proper accessibility attributes", () => {
    renderWithAtoms({ open: true })

    // Dialog should have proper role
    expect(screen.getByRole("dialog")).toBeInTheDocument()

    // Should have sr-only title
    expect(screen.getByText("Settings", { selector: ".sr-only" })).toBeInTheDocument()

    // Buttons should have accessible names
    expect(screen.getByRole("button", { name: /close settings/i })).toBeInTheDocument()
  })

  it("displays correct category icons", () => {
    renderWithAtoms({ open: true })

    // Should render category buttons with icons (we can't easily test SVG icons, but buttons should be present)
    expect(screen.getByRole("button", { name: /general/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /notifications/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /data/i })).toBeInTheDocument()
  })
})
