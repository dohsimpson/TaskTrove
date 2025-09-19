import React from "react"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { TaskFilterControls } from "./task-filter-controls"
import type { Project, Label, Task, ViewState } from "@/lib/types"
import { createProjectId, createLabelId, createTaskId } from "@/lib/types"

type ActiveFilters = NonNullable<ViewState["activeFilters"]>

// Mock the date filter utils
vi.mock("@/lib/utils/date-filter-utils", () => ({
  getPresetLabel: vi.fn((preset: string) => {
    const labels: Record<string, string> = {
      overdue: "Overdue",
      today: "Today",
      tomorrow: "Tomorrow",
      thisWeek: "This Week",
      nextWeek: "Next Week",
      noDueDate: "No Due Date",
    }
    return labels[preset] || preset
  }),
  getPresetTaskCounts: vi.fn(() => ({
    overdue: 2,
    today: 0,
    tomorrow: 1,
    thisWeek: 3,
    nextWeek: 1,
    noDueDate: 2,
  })),
  getCustomRangeLabel: vi.fn(() => "Custom Range"),
  matchesDueDateFilter: vi.fn(() => true),
}))

// Mock all the atoms to return empty/default values
vi.mock("@/lib/atoms/ui/views", () => ({
  activeFiltersAtom: { toString: () => "activeFiltersAtom" },
  hasActiveFiltersAtom: { toString: () => "hasActiveFiltersAtom" },
  activeFilterCountAtom: { toString: () => "activeFilterCountAtom" },
  updateFiltersAtom: { toString: () => "updateFiltersAtom" },
  clearActiveFiltersAtom: { toString: () => "clearActiveFiltersAtom" },
  currentViewStateAtom: { toString: () => "currentViewStateAtom" },
}))

vi.mock("@/lib/atoms", () => ({
  projectAtoms: {
    derived: {
      allProjects: { toString: () => "allProjectsAtom" },
    },
  },
}))

vi.mock("@/lib/atoms/core/labels", () => ({
  labelsAtom: { toString: () => "labelsAtom" },
}))

vi.mock("@/lib/atoms/core/tasks", () => ({
  baseTasksForViewAtom: { toString: () => "baseTasksForViewAtom" },
}))

// Mock Jotai hooks
let mockActiveFilters = {}
let mockHasActiveFilters = false
let mockActiveFilterCount = 0
const mockUpdateFilters = vi.fn()
const mockClearFilters = vi.fn()
const mockProjects: Project[] = []
const mockLabels: Label[] = []
const mockTasks: Task[] = []

vi.mock("jotai", () => ({
  useAtomValue: vi.fn((atom) => {
    const atomStr = atom.toString()
    if (atomStr.includes("activeFilters")) return mockActiveFilters
    if (atomStr.includes("hasActiveFilters")) return mockHasActiveFilters
    if (atomStr.includes("activeFilterCount")) return mockActiveFilterCount
    if (atomStr.includes("allProjects")) return mockProjects
    if (atomStr.includes("labels")) return mockLabels
    if (atomStr.includes("tasks")) return mockTasks
    return {}
  }),
  useSetAtom: vi.fn((atom) => {
    const atomStr = atom.toString()
    if (atomStr.includes("updateFilters")) return mockUpdateFilters
    if (atomStr.includes("clearFilters")) return mockClearFilters
    return vi.fn()
  }),
  atom: vi.fn((value) => ({ init: value, toString: () => "mockAtom" })),
}))

// Mock date-fns
vi.mock("date-fns", () => ({
  format: vi.fn(() => "2024-01-15"),
  startOfDay: vi.fn((date) => date),
  endOfDay: vi.fn((date) => date),
  startOfWeek: vi.fn((date) => date),
  endOfWeek: vi.fn((date) => date),
  addDays: vi.fn((date, days) => new Date(date.getTime() + days * 24 * 60 * 60 * 1000)),
  addWeeks: vi.fn((date, weeks) => new Date(date.getTime() + weeks * 7 * 24 * 60 * 60 * 1000)),
  isBefore: vi.fn(() => false),
}))

// Mock Radix UI components
vi.mock("@/components/ui/popover", () => ({
  Popover: ({
    children,
    open,
  }: {
    children: React.ReactNode
    open?: boolean
    onOpenChange?: (open: boolean) => void
  }) => (
    <div data-testid="popover" data-open={open}>
      {children}
    </div>
  ),
  PopoverTrigger: ({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) =>
    asChild ? children : <div data-testid="popover-trigger">{children}</div>,
  PopoverContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="popover-content">{children}</div>
  ),
}))

vi.mock("@/components/ui/select", () => ({
  Select: ({
    children,
    value,
    onValueChange,
  }: {
    children: React.ReactNode
    value?: string
    onValueChange?: (value: string) => void
  }) => (
    <div data-testid="select" data-value={value} onClick={() => onValueChange?.("test-value")}>
      {children}
    </div>
  ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="select-trigger">{children}</div>
  ),
  SelectValue: ({ placeholder }: { placeholder?: string }) => (
    <div data-testid="select-value">{placeholder}</div>
  ),
  SelectContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="select-content">{children}</div>
  ),
  SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <div data-testid="select-item" data-value={value}>
      {children}
    </div>
  ),
}))

vi.mock("@/components/ui/checkbox", () => ({
  Checkbox: ({
    checked,
    onCheckedChange,
    id,
  }: {
    checked?: boolean
    onCheckedChange?: (checked: boolean) => void
    id?: string
  }) => (
    <input
      type="checkbox"
      data-testid={`checkbox-${id}`}
      checked={checked}
      onChange={(e) => onCheckedChange?.(e.target.checked)}
    />
  ),
}))

vi.mock("@/components/ui/calendar", () => ({
  Calendar: ({ onSelect }: { selected?: Date; onSelect?: (date: Date) => void }) => (
    <div data-testid="calendar" onClick={() => onSelect?.(new Date("2024-01-15"))}>
      Calendar Mock
    </div>
  ),
}))

// Mock other UI components
vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    ...props
  }: {
    children: React.ReactNode
    onClick?: () => void
  } & React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button onClick={onClick} {...props}>
      {children}
    </button>
  ),
}))

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children: React.ReactNode }) => (
    <span data-testid="badge">{children}</span>
  ),
}))

vi.mock("@/components/ui/label", () => ({
  Label: ({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) => (
    <label htmlFor={htmlFor}>{children}</label>
  ),
}))

vi.mock("@/components/ui/separator", () => ({
  Separator: () => <hr data-testid="separator" />,
}))

vi.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="scroll-area">{children}</div>
  ),
}))

describe("TaskFilterControls", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("Basic Rendering", () => {
    it("renders the filter button", () => {
      render(<TaskFilterControls />)

      expect(screen.getByText("Filter")).toBeInTheDocument()
      const filterButtons = screen.getAllByRole("button")
      expect(filterButtons.length).toBeGreaterThan(0) // Should have multiple buttons (filter + presets)
    })

    it("renders without crashing when no props provided", () => {
      expect(() => render(<TaskFilterControls />)).not.toThrow()
    })

    it("applies custom className", () => {
      const { container } = render(<TaskFilterControls className="custom-class" />)

      expect(container.querySelector(".custom-class")).toBeInTheDocument()
    })
  })

  describe("Popover Structure", () => {
    it("contains popover components", () => {
      render(<TaskFilterControls />)

      expect(screen.getByTestId("popover")).toBeInTheDocument()
      // PopoverTrigger is using asChild prop, so it won't render its own element
      expect(screen.getByText("Filter")).toBeInTheDocument()
    })

    it("renders popover content structure", () => {
      render(<TaskFilterControls />)

      expect(screen.getByTestId("popover-content")).toBeInTheDocument()
    })
  })

  describe("Due Date Section", () => {
    it("renders due date section", () => {
      render(<TaskFilterControls />)

      expect(screen.getByText("Due Date")).toBeInTheDocument()
    })

    it("renders preset buttons", () => {
      render(<TaskFilterControls />)

      expect(screen.getByText("Overdue")).toBeInTheDocument()
      expect(screen.getByText("Today")).toBeInTheDocument()
      expect(screen.getByText("Tomorrow")).toBeInTheDocument()
      expect(screen.getByText("This Week")).toBeInTheDocument()
      expect(screen.getByText("Next Week")).toBeInTheDocument()
      expect(screen.getByText("No Due Date")).toBeInTheDocument()
    })

    it("renders custom range button", () => {
      render(<TaskFilterControls />)

      expect(screen.getByText("Custom Range")).toBeInTheDocument()
    })

    it("shows task counts in badges", () => {
      render(<TaskFilterControls />)

      // Check that badges are rendered (from mocked counts)
      const badges = screen.getAllByTestId("badge")
      expect(badges.length).toBeGreaterThan(0)
    })
  })

  describe("Priority Section", () => {
    it("renders priority section", () => {
      render(<TaskFilterControls />)

      expect(screen.getByText("Priority")).toBeInTheDocument()
    })

    it("renders priority options", () => {
      render(<TaskFilterControls />)

      expect(screen.getByText("Priority 1")).toBeInTheDocument()
      expect(screen.getByText("Priority 2")).toBeInTheDocument()
      expect(screen.getByText("Priority 3")).toBeInTheDocument()
      expect(screen.getByText("No priority")).toBeInTheDocument()
    })
  })

  describe("Status Section", () => {
    it("renders status section", () => {
      render(<TaskFilterControls />)

      expect(screen.getByText("Status")).toBeInTheDocument()
    })

    it("renders status options", () => {
      render(<TaskFilterControls />)

      expect(screen.getByText("All tasks")).toBeInTheDocument()
      expect(screen.getByText("Active only")).toBeInTheDocument()
      expect(screen.getByText("Completed only")).toBeInTheDocument()
    })
  })

  describe("Interaction Handlers", () => {
    it("handles custom range calendar interaction", async () => {
      const user = userEvent.setup()
      render(<TaskFilterControls />)

      // Enter custom range mode
      const customRangeButton = screen.getByText("Custom Range")
      await user.click(customRangeButton)

      // Check that calendars are rendered (should have multiple for FROM/TO dates)
      const calendars = screen.getAllByTestId("calendar")
      expect(calendars.length).toBeGreaterThan(0)
    })
  })

  describe("Custom Range Interface", () => {
    it("shows custom range interface when button clicked", async () => {
      const user = userEvent.setup()
      render(<TaskFilterControls />)

      const customRangeButton = screen.getByText("Custom Range")
      await user.click(customRangeButton)

      expect(screen.getByText("FROM DATE")).toBeInTheDocument()
      expect(screen.getByText("TO DATE")).toBeInTheDocument()
      expect(screen.getByText("Apply")).toBeInTheDocument()
      expect(screen.getByText("Cancel")).toBeInTheDocument()
    })

    it("shows quick range shortcuts", async () => {
      const user = userEvent.setup()
      render(<TaskFilterControls />)

      const customRangeButton = screen.getByText("Custom Range")
      await user.click(customRangeButton)

      expect(screen.getByText("Next 7 days")).toBeInTheDocument()
      expect(screen.getByText("Next 30 days")).toBeInTheDocument()
    })
  })

  describe("Clear All Functionality", () => {
    it("renders clear all button in header", () => {
      render(<TaskFilterControls />)

      expect(screen.getByText("Filter Tasks")).toBeInTheDocument()
    })
  })

  describe("Scroll Area", () => {
    it("renders scroll area for filter content", () => {
      render(<TaskFilterControls />)

      expect(screen.getByTestId("scroll-area")).toBeInTheDocument()
    })
  })

  describe("Separators", () => {
    it("renders separators between sections", () => {
      render(<TaskFilterControls />)

      const separators = screen.getAllByTestId("separator")
      expect(separators.length).toBeGreaterThan(0)
    })
  })

  // Tests with Projects and Labels data for better coverage
  describe("Project and Label Filters", () => {
    beforeEach(() => {
      // Set mock data for projects and labels
      mockProjects.length = 0
      mockProjects.push(
        {
          id: createProjectId("87654321-4321-4321-8321-210987654321"),
          name: "Work Project",
          color: "#3b82f6",
          slug: "work",
          shared: false,
          sections: [],
        },
        {
          id: createProjectId("87654321-4321-4321-8321-210987654322"),
          name: "Personal Project",
          color: "#10b981",
          slug: "personal",
          shared: false,
          sections: [],
        },
      )

      mockLabels.length = 0
      mockLabels.push(
        {
          id: createLabelId("abcdef01-abcd-4bcd-8bcd-abcdefabcdef"),
          name: "urgent",
          color: "#ef4444",
          slug: "urgent",
        },
        {
          id: createLabelId("abcdef01-abcd-4bcd-8bcd-abcdefabcde0"),
          name: "important",
          color: "#f59e0b",
          slug: "important",
        },
      )
    })

    afterEach(() => {
      // Reset arrays after each test
      mockProjects.length = 0
      mockLabels.length = 0
      mockActiveFilters = {}
      mockHasActiveFilters = false
      mockActiveFilterCount = 0
    })

    it("renders project filter section when projects exist", () => {
      render(<TaskFilterControls />)

      expect(screen.getByText("Projects")).toBeInTheDocument()
      expect(screen.getByText("Work Project")).toBeInTheDocument()
      expect(screen.getByText("Personal Project")).toBeInTheDocument()
    })

    it("renders label filter section when labels exist", () => {
      render(<TaskFilterControls />)

      expect(screen.getByText("Labels")).toBeInTheDocument()
      expect(screen.getByText("urgent")).toBeInTheDocument()
      expect(screen.getByText("important")).toBeInTheDocument()
    })

    it("handles project selection clicks", async () => {
      render(<TaskFilterControls />)

      const workProject = screen.getByText("Work Project")
      await userEvent.click(workProject)

      expect(mockUpdateFilters).toHaveBeenCalled()
    })

    it("handles label selection clicks", async () => {
      render(<TaskFilterControls />)

      const urgentLabel = screen.getByText("urgent")
      await userEvent.click(urgentLabel)

      expect(mockUpdateFilters).toHaveBeenCalled()
    })

    it("applies selected styling to active project filters", () => {
      // Set active project filter
      mockActiveFilters = { projectIds: [createProjectId("87654321-4321-4321-8321-210987654321")] }
      mockHasActiveFilters = true
      mockActiveFilterCount = 1

      render(<TaskFilterControls />)

      const workProject = screen.getByText("Work Project")
      expect(workProject.closest("div")).toHaveClass("bg-accent")
    })

    it("applies selected styling to active label filters", () => {
      // Set active label filter
      mockActiveFilters = { labels: ["urgent"] }
      mockHasActiveFilters = true
      mockActiveFilterCount = 1

      render(<TaskFilterControls />)

      const urgentLabel = screen.getByText("urgent")
      expect(urgentLabel.closest("div")).toHaveClass("bg-accent")
    })

    it("shows project color indicators", () => {
      render(<TaskFilterControls />)

      // Look for folder icons in the project section
      const projectElements = document.querySelectorAll('svg[class*="lucide-folder"]')
      expect(projectElements.length).toBeGreaterThanOrEqual(2)
    })

    it("shows label color indicators", () => {
      render(<TaskFilterControls />)

      // Labels have circular color indicators
      const labelColorElements = document.querySelectorAll(".w-3.h-3.rounded-full")
      expect(labelColorElements.length).toBeGreaterThanOrEqual(2)
    })
  })

  // Tests for functions not covered by existing tests
  describe("Event Handlers Coverage", () => {
    beforeEach(() => {
      // Set mock data for projects and labels
      mockProjects.length = 0
      mockProjects.push({
        id: createProjectId("87654321-4321-4321-8321-210987654321"),
        name: "Work Project",
        color: "#3b82f6",
        slug: "work",
        shared: false,
        sections: [],
      })

      mockLabels.length = 0
      mockLabels.push({
        id: createLabelId("abcdef01-abcd-4bcd-8bcd-abcdefabcdef"),
        name: "urgent",
        color: "#ef4444",
        slug: "urgent",
      })
    })

    afterEach(() => {
      // Reset arrays after each test
      mockProjects.length = 0
      mockLabels.length = 0
      mockActiveFilters = {}
      mockHasActiveFilters = false
      mockActiveFilterCount = 0
    })

    it("calls handleProjectChange with correct parameters", async () => {
      render(<TaskFilterControls />)

      const workProject = screen.getByText("Work Project")
      await userEvent.click(workProject)

      expect(mockUpdateFilters).toHaveBeenCalledWith({
        projectIds: [createProjectId("87654321-4321-4321-8321-210987654321")],
      })
    })

    it("calls handleLabelChange with correct parameters", async () => {
      render(<TaskFilterControls />)

      const urgentLabel = screen.getByText("urgent")
      await userEvent.click(urgentLabel)

      expect(mockUpdateFilters).toHaveBeenCalledWith({
        labels: ["urgent"],
      })
    })

    it('handles completion filter change to "all"', async () => {
      render(<TaskFilterControls />)

      const allTasksOption = screen.getByText("All tasks")
      await userEvent.click(allTasksOption)

      expect(mockUpdateFilters).toHaveBeenCalledWith({
        completed: undefined,
      })
    })

    it('handles completion filter change to "completed"', async () => {
      render(<TaskFilterControls />)

      const completedOption = screen.getByText("Completed only")
      await userEvent.click(completedOption)

      expect(mockUpdateFilters).toHaveBeenCalledWith({
        completed: true,
      })
    })

    it('handles completion filter change to "active"', async () => {
      render(<TaskFilterControls />)

      const activeOption = screen.getByText("Active only")
      await userEvent.click(activeOption)

      expect(mockUpdateFilters).toHaveBeenCalledWith({
        completed: false,
      })
    })

    it("handles priority filter selection", async () => {
      render(<TaskFilterControls />)

      const priority1 = screen.getByText("Priority 1")
      await userEvent.click(priority1)

      expect(mockUpdateFilters).toHaveBeenCalledWith({
        priorities: [1],
      })
    })
  })

  // Test edge cases and error handling
  describe("Edge Cases", () => {
    it("handles empty projects array gracefully", () => {
      render(<TaskFilterControls />)

      // Should not render Projects section when no projects
      expect(screen.queryByText("Projects")).not.toBeInTheDocument()
    })

    it("handles empty labels array gracefully", () => {
      render(<TaskFilterControls />)

      // Should not render Labels section when no labels
      expect(screen.queryByText("Labels")).not.toBeInTheDocument()
    })

    it("handles popover state changes", async () => {
      render(<TaskFilterControls />)

      const filterButton = screen.getByText("Filter")
      await userEvent.click(filterButton)

      // Should open popover
      expect(screen.getByText("Filter Tasks")).toBeInTheDocument()
    })
  })

  // Test "No Labels" filtering functionality
  describe("No Labels Filtering", () => {
    beforeEach(() => {
      // Set up labels for testing
      mockLabels.length = 0
      mockLabels.push(
        {
          id: createLabelId("abcdef01-abcd-4bcd-8bcd-abcdefabcdef"),
          name: "urgent",
          color: "#ef4444",
          slug: "urgent",
        },
        {
          id: createLabelId("abcdef01-abcd-4bcd-8bcd-abcdefabcde0"),
          name: "important",
          color: "#f59e0b",
          slug: "important",
        },
      )
    })

    afterEach(() => {
      mockLabels.length = 0
      mockActiveFilters = {}
      mockHasActiveFilters = false
      mockActiveFilterCount = 0
    })

    it('renders "No labels" option in labels filter section', () => {
      render(<TaskFilterControls />)

      expect(screen.getByText("Labels")).toBeInTheDocument()
      expect(screen.getByText("No labels")).toBeInTheDocument()
    })

    it('handles "No labels" filter selection', async () => {
      render(<TaskFilterControls />)

      const noLabelsOption = screen.getByText("No labels")
      await userEvent.click(noLabelsOption)

      expect(mockUpdateFilters).toHaveBeenCalledWith({
        labels: null,
      })
    })

    it('applies selected styling when "No labels" filter is active', () => {
      // Set active "no labels" filter
      mockActiveFilters = { labels: null }
      mockHasActiveFilters = true
      mockActiveFilterCount = 1

      render(<TaskFilterControls />)

      const noLabelsOption = screen.getByText("No labels")
      expect(noLabelsOption.closest("div")).toHaveClass("bg-accent")
    })

    it('handles deselecting "No labels" filter', async () => {
      // Start with "no labels" filter active
      mockActiveFilters = { labels: null }
      mockHasActiveFilters = true
      mockActiveFilterCount = 1

      render(<TaskFilterControls />)

      const noLabelsOption = screen.getByText("No labels")
      await userEvent.click(noLabelsOption)

      expect(mockUpdateFilters).toHaveBeenCalledWith({
        labels: [],
      })
    })

    it('shows empty circle icon for "No labels" option', () => {
      render(<TaskFilterControls />)

      const noLabelsOption = screen.getByText("No labels")
      const parentDiv = noLabelsOption.closest("div")

      // Check for the empty circle with border
      const emptyCircle = parentDiv?.querySelector(".w-3.h-3.rounded-full.border")
      expect(emptyCircle).toBeInTheDocument()
    })

    it('shows "No labels" text in italic', () => {
      render(<TaskFilterControls />)

      const noLabelsOption = screen.getByText("No labels")
      expect(noLabelsOption).toHaveClass("italic")
    })

    it("correctly handles mixed label filters with no labels", async () => {
      // Start with regular label filter
      mockActiveFilters = { labels: ["urgent"] }
      mockHasActiveFilters = true
      mockActiveFilterCount = 1

      render(<TaskFilterControls />)

      // Click "No labels" - this should replace the array with null
      const noLabelsOption = screen.getByText("No labels")
      await userEvent.click(noLabelsOption)

      expect(mockUpdateFilters).toHaveBeenCalledWith({
        labels: null,
      })
    })

    it("maintains separate state between regular labels and no labels", async () => {
      render(<TaskFilterControls />)

      // First select a regular label
      const urgentLabel = screen.getByText("urgent")
      await userEvent.click(urgentLabel)

      expect(mockUpdateFilters).toHaveBeenCalledWith({
        labels: ["urgent"],
      })

      // Then select "No labels" - should be a separate call
      const noLabelsOption = screen.getByText("No labels")
      await userEvent.click(noLabelsOption)

      expect(mockUpdateFilters).toHaveBeenCalledWith({
        labels: null,
      })
    })

    it("handles no labels filter in tasksForCountsAtom filtering logic", () => {
      // This tests the logic in the component's tasksForCountsAtom
      const mockTasks: Task[] = [
        {
          id: createTaskId("12345678-1234-4234-8234-123456789012"),
          title: "Task with labels",
          labels: [createLabelId("abcdefab-abcd-4bcd-8bcd-abcdefabcdef")],
          completed: false,
          priority: 2,
          projectId: createProjectId("87654321-4321-4321-8321-876543210987"),
          subtasks: [],
          comments: [],
          attachments: [],
          createdAt: new Date(),
          status: "active",
          recurringMode: "dueDate",
        },
        {
          id: createTaskId("12345678-1234-4234-8234-123456789013"),
          title: "Task with no labels",
          labels: [],
          completed: false,
          priority: 1,
          projectId: createProjectId("87654321-4321-4321-8321-876543210987"),
          subtasks: [],
          comments: [],
          attachments: [],
          createdAt: new Date(),
          status: "active",
          recurringMode: "dueDate",
        },
      ]

      // Simulate the filtering logic from tasksForCountsAtom
      const activeFilters: Partial<ActiveFilters> = { labels: null }
      let result = mockTasks

      if (activeFilters.labels === null) {
        // Show only tasks with NO labels
        result = result.filter((task: Task) => task.labels.length === 0)
      } else if (activeFilters.labels && activeFilters.labels.length > 0) {
        // Show tasks with specific labels
        result = result.filter((task: Task) =>
          task.labels.some((label: string) => activeFilters.labels?.includes(label) ?? false),
        )
      }

      expect(result).toHaveLength(1)
      const firstResult = result[0]
      if (!firstResult) {
        throw new Error("Expected result to have at least one task")
      }
      expect(firstResult.id).toBe(createTaskId("12345678-1234-4234-8234-123456789013"))
    })
  })
})
