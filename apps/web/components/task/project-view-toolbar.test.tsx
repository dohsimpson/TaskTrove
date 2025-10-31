import React from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@/test-utils"
import userEvent from "@testing-library/user-event"
import { Provider } from "jotai"
import { ProjectViewToolbar } from "./project-view-toolbar"
import { isValidProjectId } from "@/lib/utils/routing"

// Create hoisted mocks
const mockJotai = vi.hoisted(() => ({
  useSetAtom: vi.fn(),
  useAtomValue: vi.fn(),
  atom: vi.fn(),
  Provider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

// Mock jotai
vi.mock("jotai", () => mockJotai)

// Mock the individual components
vi.mock("./task-filter-controls", () => ({
  TaskFilterControls: ({ className }: { className?: string }) => (
    <div data-testid="task-filter-controls" className={className}>
      <button>Filter</button>
    </div>
  ),
}))

vi.mock("./task-filter-badges", () => ({
  TaskFilterBadges: ({ className }: { className?: string }) => (
    <div data-testid="task-filter-badges" className={className}>
      <span data-testid="active-filter-badge">Active</span>
    </div>
  ),
}))

vi.mock("./task-search-input", () => ({
  TaskSearchInput: ({ className }: { className?: string }) => (
    <div data-testid="task-search-input" className={className}>
      <button>Search</button>
    </div>
  ),
}))

// Note: Atom mocks are now centralized in test-utils/atoms-mocks.ts

vi.mock("@/lib/atoms", () => ({
  // Empty - atoms moved to @tasktrove/atoms
}))

// Mock UI components
vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    className,
    variant,
    size,
    ...props
  }: {
    children: React.ReactNode
    onClick?: () => void
    className?: string
    variant?: string
    size?: string
    [key: string]: unknown
  }) => (
    <button
      onClick={onClick}
      className={className}
      data-variant={variant}
      data-size={size}
      {...props}
    >
      {children}
    </button>
  ),
}))

// Mock lucide-react
vi.mock("lucide-react", () => ({
  Plus: () => <svg data-testid="plus-icon">Plus Icon</svg>,
  FolderPlus: () => <svg data-testid="folder-plus-icon">FolderPlus Icon</svg>,
}))

// Mock routing utils
vi.mock("@/lib/utils/routing", () => ({
  isValidProjectId: vi.fn(),
}))

// Mock types
vi.mock("@/lib/types", () => ({
  createProjectId: vi.fn((id) => id),
}))

// Test wrapper component
const TestWrapper = ({ children }: { children: React.ReactNode }) => <Provider>{children}</Provider>

describe("ProjectViewToolbar", () => {
  const mockOpenQuickAdd = vi.fn()
  const mockOpenSectionDialog = vi.fn()
  const mockRouteContext = { viewId: "project-123", routeType: "project" }

  beforeEach(() => {
    vi.clearAllMocks()

    // Default: non-project context
    vi.mocked(isValidProjectId).mockReturnValue(false)

    mockJotai.useSetAtom.mockImplementation((atom) => {
      const label = String(atom?.debugLabel ?? "")
      if (label === "openQuickAddAtom") return mockOpenQuickAdd
      if (label === "openSectionDialogAtom") return mockOpenSectionDialog
      return vi.fn()
    })

    mockJotai.useAtomValue.mockImplementation((atom) => {
      const label = String(atom?.debugLabel ?? "")
      if (label === "currentRouteContextAtom") return mockRouteContext
      if (label === "selectedTasksAtom") return []
      return undefined
    })
  })

  describe("Rendering", () => {
    it("renders all toolbar components", () => {
      render(
        <TestWrapper>
          <ProjectViewToolbar />
        </TestWrapper>,
      )

      expect(screen.getByTestId("task-filter-controls")).toBeInTheDocument()
      expect(screen.getByTestId("task-search-input")).toBeInTheDocument()
      expect(screen.getByTestId("task-filter-badges")).toBeInTheDocument()
      expect(screen.getByText("Add Task")).toBeInTheDocument()
      expect(screen.getByTestId("plus-icon")).toBeInTheDocument()
    })

    it("renders with custom className", () => {
      render(
        <TestWrapper>
          <ProjectViewToolbar className="custom-class" />
        </TestWrapper>,
      )

      // The className is applied to the outermost container
      const filterControls = screen.getByTestId("task-filter-controls")
      const flexContainer = filterControls.parentElement // Inner flex div
      const toolbar = flexContainer?.parentElement // Outer container with className
      expect(toolbar).toHaveClass("custom-class")
    })

    it("renders Add Task button with correct props in non-project context", () => {
      render(
        <TestWrapper>
          <ProjectViewToolbar />
        </TestWrapper>,
      )

      const addTaskButton = screen.getByText("Add Task")
      expect(addTaskButton).toHaveAttribute("data-variant", "default")
      expect(addTaskButton).toHaveAttribute("data-size", "sm")
      expect(addTaskButton).toHaveClass("shadow-sm", "shrink-0", "ml-auto")
    })

    it("does not show Add Section button in non-project context", () => {
      render(
        <TestWrapper>
          <ProjectViewToolbar />
        </TestWrapper>,
      )

      expect(screen.queryByText("Add Section")).not.toBeInTheDocument()
    })

    it("shows Add Section button in project context", () => {
      vi.mocked(isValidProjectId).mockReturnValue(true)

      render(
        <TestWrapper>
          <ProjectViewToolbar />
        </TestWrapper>,
      )

      expect(screen.getByText("Add Section")).toBeInTheDocument()
      expect(screen.getByTestId("folder-plus-icon")).toBeInTheDocument()
    })

    it("renders Add Section button with correct props in project context", () => {
      vi.mocked(isValidProjectId).mockReturnValue(true)

      render(
        <TestWrapper>
          <ProjectViewToolbar />
        </TestWrapper>,
      )

      const addSectionButton = screen.getByText("Add Section")
      expect(addSectionButton).toHaveAttribute("data-variant", "outline")
      expect(addSectionButton).toHaveAttribute("data-size", "sm")
      expect(addSectionButton).toHaveClass("shadow-sm", "shrink-0", "ml-auto")
    })
  })

  describe("Layout", () => {
    it("positions filter controls and search input on the left", () => {
      render(
        <TestWrapper>
          <ProjectViewToolbar />
        </TestWrapper>,
      )

      const filterControls = screen.getByTestId("task-filter-controls")
      const searchInput = screen.getByTestId("task-search-input")
      const addTaskButton = screen.getByText("Add Task")

      // Filter controls and search should be in the same flex container
      const flexContainer = filterControls.parentElement
      expect(flexContainer).toContainElement(searchInput)
      expect(flexContainer).toContainElement(addTaskButton)

      // Add Task button should have ml-auto class to push it right
      expect(addTaskButton).toHaveClass("ml-auto")
    })

    it("places filter badges below the main row", () => {
      render(
        <TestWrapper>
          <ProjectViewToolbar />
        </TestWrapper>,
      )

      const filterBadges = screen.getByTestId("task-filter-badges")
      const filterControls = screen.getByTestId("task-filter-controls")

      // Filter badges should not be in the same flex container as the controls
      const flexContainer = filterControls.parentElement
      expect(flexContainer).not.toContainElement(filterBadges)

      // They should be siblings in the main container
      const mainContainer = flexContainer?.parentElement
      expect(mainContainer).toContainElement(filterBadges)
    })

    it("uses correct flex layout classes", () => {
      render(
        <TestWrapper>
          <ProjectViewToolbar />
        </TestWrapper>,
      )

      const filterControls = screen.getByTestId("task-filter-controls")
      const flexContainer = filterControls.parentElement

      // Should have flex items-center gap-2 classes
      expect(flexContainer).toHaveClass("flex", "items-center", "gap-2")
    })
  })

  describe("Add Task Functionality", () => {
    it("calls openQuickAddAction when Add Task button is clicked", async () => {
      const user = userEvent.setup()

      render(
        <TestWrapper>
          <ProjectViewToolbar />
        </TestWrapper>,
      )

      const addTaskButton = screen.getByText("Add Task")
      await user.click(addTaskButton)

      expect(mockOpenQuickAdd).toHaveBeenCalledTimes(1)
    })

    it("displays Plus icon in Add Task button", () => {
      render(
        <TestWrapper>
          <ProjectViewToolbar />
        </TestWrapper>,
      )

      const addTaskButton = screen.getByText("Add Task")
      const plusIcon = screen.getByTestId("plus-icon")

      expect(addTaskButton).toContainElement(plusIcon)
    })
  })

  describe("Component Integration", () => {
    it("includes TaskFilterControls component", () => {
      render(
        <TestWrapper>
          <ProjectViewToolbar />
        </TestWrapper>,
      )

      expect(screen.getByTestId("task-filter-controls")).toBeInTheDocument()
      expect(screen.getByText("Filter")).toBeInTheDocument()
    })

    it("includes TaskSearchInput component", () => {
      render(
        <TestWrapper>
          <ProjectViewToolbar />
        </TestWrapper>,
      )

      expect(screen.getByTestId("task-search-input")).toBeInTheDocument()
      expect(screen.getByText("Search")).toBeInTheDocument()
    })

    it("includes TaskFilterBadges component", () => {
      render(
        <TestWrapper>
          <ProjectViewToolbar />
        </TestWrapper>,
      )

      expect(screen.getByTestId("task-filter-badges")).toBeInTheDocument()
      expect(screen.getByTestId("active-filter-badge")).toBeInTheDocument()
    })
  })

  describe("Accessibility", () => {
    it("maintains proper button semantics for Add Task", () => {
      render(
        <TestWrapper>
          <ProjectViewToolbar />
        </TestWrapper>,
      )

      const addTaskButton = screen.getByRole("button", { name: /add task/i })
      expect(addTaskButton).toBeInTheDocument()
      expect(addTaskButton).toBeEnabled()
    })

    it("supports keyboard interaction", async () => {
      const user = userEvent.setup()

      render(
        <TestWrapper>
          <ProjectViewToolbar />
        </TestWrapper>,
      )

      const addTaskButton = screen.getByText("Add Task")

      // Focus the button and press Enter
      addTaskButton.focus()
      await user.keyboard("{Enter}")

      expect(mockOpenQuickAdd).toHaveBeenCalledTimes(1)
    })

    it("supports space key activation", async () => {
      const user = userEvent.setup()

      render(
        <TestWrapper>
          <ProjectViewToolbar />
        </TestWrapper>,
      )

      const addTaskButton = screen.getByText("Add Task")

      // Focus the button and press Space
      addTaskButton.focus()
      await user.keyboard(" ")

      expect(mockOpenQuickAdd).toHaveBeenCalledTimes(1)
    })
  })

  describe("Style Classes", () => {
    it("applies correct classes to the main container", () => {
      render(
        <TestWrapper>
          <ProjectViewToolbar className="test-class" />
        </TestWrapper>,
      )

      // The className is applied to the outermost container
      const filterControls = screen.getByTestId("task-filter-controls")
      const flexContainer = filterControls.parentElement // Inner flex div
      const container = flexContainer?.parentElement // Outer container with className
      expect(container).toHaveClass("test-class")
    })

    it("applies correct classes to the flex container", () => {
      render(
        <TestWrapper>
          <ProjectViewToolbar />
        </TestWrapper>,
      )

      const filterControls = screen.getByTestId("task-filter-controls")
      const flexContainer = filterControls.parentElement

      expect(flexContainer).toHaveClass("flex", "items-center", "gap-2")
    })

    it("applies correct classes to Add Task button in non-project context", () => {
      render(
        <TestWrapper>
          <ProjectViewToolbar />
        </TestWrapper>,
      )

      const addTaskButton = screen.getByText("Add Task")
      expect(addTaskButton).toHaveClass("shadow-sm", "shrink-0", "ml-auto")
    })

    it("applies correct classes to Add Task button in project context", () => {
      vi.mocked(isValidProjectId).mockReturnValue(true)

      render(
        <TestWrapper>
          <ProjectViewToolbar />
        </TestWrapper>,
      )

      const addTaskButton = screen.getByText("Add Task")
      expect(addTaskButton).toHaveClass("shadow-sm", "shrink-0")
      expect(addTaskButton).not.toHaveClass("ml-auto")
    })
  })

  describe("Add Section Functionality", () => {
    it("calls openSectionDialog when Add Section button is clicked", async () => {
      vi.mocked(isValidProjectId).mockReturnValue(true)
      const user = userEvent.setup()

      render(
        <TestWrapper>
          <ProjectViewToolbar />
        </TestWrapper>,
      )

      const addSectionButton = screen.getByText("Add Section")
      await user.click(addSectionButton)

      expect(mockOpenSectionDialog).toHaveBeenCalledTimes(1)
      expect(mockOpenSectionDialog).toHaveBeenCalledWith({ projectId: "project-123" })
    })

    it("displays FolderPlus icon in Add Section button", () => {
      vi.mocked(isValidProjectId).mockReturnValue(true)

      render(
        <TestWrapper>
          <ProjectViewToolbar />
        </TestWrapper>,
      )

      const addSectionButton = screen.getByText("Add Section")
      const folderPlusIcon = screen.getByTestId("folder-plus-icon")

      expect(addSectionButton).toContainElement(folderPlusIcon)
    })

    it("does not render Add Section button outside project context", () => {
      vi.mocked(isValidProjectId).mockReturnValue(false)

      render(
        <TestWrapper>
          <ProjectViewToolbar />
        </TestWrapper>,
      )

      expect(screen.queryByText("Add Section")).not.toBeInTheDocument()
      expect(screen.queryByTestId("folder-plus-icon")).not.toBeInTheDocument()
    })
  })

  describe("Error Handling", () => {
    it("renders safely when openQuickAddAtom is not available", () => {
      mockJotai.useSetAtom.mockImplementation(() => vi.fn())

      render(
        <TestWrapper>
          <ProjectViewToolbar />
        </TestWrapper>,
      )

      expect(screen.getByText("Add Task")).toBeInTheDocument()
    })

    it("handles missing className gracefully", () => {
      render(
        <TestWrapper>
          <ProjectViewToolbar />
        </TestWrapper>,
      )

      const container = screen.getByTestId("task-filter-controls").closest("div")
      expect(container).toBeInTheDocument()
    })
  })
})
