import { DEFAULT_PROJECT_SECTION } from "@/lib/types"
import React from "react"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen } from "@/test-utils"
import userEvent from "@testing-library/user-event"
import { TaskFilterBadges } from "./task-filter-badges"
import type { Project, Label } from "@/lib/types"
import { createProjectId, createLabelId } from "@/lib/types"

// Mock the atoms
const mockActiveFilters = vi.fn()
const mockHasActiveFilters = vi.fn()
const mockUpdateFilters = vi.fn()
const mockAllProjects: Project[] = []
const mockAllLabels: Label[] = []

// Note: Atom mocks are now centralized in test-utils/atoms-mocks.ts

// Mock @tasktrove/i18n
vi.mock("@tasktrove/i18n", () => ({
  useTranslation: vi.fn(() => ({
    t: vi.fn((key: string, defaultValue: string) => defaultValue),
  })),
  LanguageProvider: ({ children }: { children: React.ReactNode }) => children,
  useLanguage: vi.fn(() => ({ language: "en", setLanguage: vi.fn() })),
}))

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
  getCustomRangeLabel: vi.fn(() => "Custom Range"),
}))

// Mock jotai
vi.mock("jotai", () => ({
  useAtomValue: vi.fn((atom) => {
    const atomStr = atom.toString()

    if (atomStr.includes("activeFilters")) return mockActiveFilters()
    if (atomStr.includes("hasActiveFilters")) return mockHasActiveFilters()
    if (atomStr.includes("allProjects")) return mockAllProjects
    if (atomStr.includes("labels")) return mockAllLabels

    return {}
  }),
  useSetAtom: vi.fn((atom) => {
    const atomStr = atom.toString()
    if (atomStr.includes("updateFilters")) return mockUpdateFilters
    return vi.fn()
  }),
  Provider: vi.fn(({ children }) => children), // Add this for @/test-utils compatibility
}))

// Mock UI components
vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <span className={className} data-testid="badge">
      {children}
    </span>
  ),
}))

// Mock icons
vi.mock("lucide-react", () => ({
  X: ({ className }: { className?: string }) => (
    <span className={className} data-testid="x-icon">
      ×
    </span>
  ),
  Flag: ({ className }: { className?: string }) => (
    <span className={className} data-testid="flag-icon">
      ⚑
    </span>
  ),
  Calendar: ({ className }: { className?: string }) => (
    <span className={className} data-testid="calendar-icon">
      📅
    </span>
  ),
  CheckCircle: ({ className }: { className?: string }) => (
    <span className={className} data-testid="check-circle-icon">
      ✓
    </span>
  ),
  Clock: ({ className }: { className?: string }) => (
    <span className={className} data-testid="clock-icon">
      🕒
    </span>
  ),
  Folder: ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
    <span className={className} style={style} data-testid="folder-icon">
      📁
    </span>
  ),
  Tag: ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
    <span className={className} style={style} data-testid="tag-icon">
      🏷️
    </span>
  ),
}))

describe("TaskFilterBadges", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockActiveFilters.mockReturnValue({})
    mockHasActiveFilters.mockReturnValue(false)
    mockAllProjects.length = 0
    mockAllLabels.length = 0
  })

  afterEach(() => {
    vi.clearAllMocks()
    mockAllProjects.length = 0
    mockAllLabels.length = 0
  })

  it("renders nothing when no active filters", () => {
    mockHasActiveFilters.mockReturnValue(false)

    const { container } = render(<TaskFilterBadges />)

    expect(container.firstChild).toBeNull()
  })

  it("renders priority filter badges", () => {
    mockHasActiveFilters.mockReturnValue(true)
    mockActiveFilters.mockReturnValue({
      priorities: [1, 3],
    })

    render(<TaskFilterBadges />)

    expect(screen.getByText("Priority 1")).toBeInTheDocument()
    expect(screen.getByText("Priority 3")).toBeInTheDocument()
    expect(screen.getAllByTestId("flag-icon")).toHaveLength(2)
  })

  it("renders completion status filter badges", () => {
    mockHasActiveFilters.mockReturnValue(true)
    mockActiveFilters.mockReturnValue({
      completed: true,
    })

    render(<TaskFilterBadges />)

    expect(screen.getByText("Completed")).toBeInTheDocument()
    expect(screen.getByTestId("check-circle-icon")).toBeInTheDocument()
  })

  it("renders active completion status filter badge", () => {
    mockHasActiveFilters.mockReturnValue(true)
    mockActiveFilters.mockReturnValue({
      completed: false,
    })

    render(<TaskFilterBadges />)

    expect(screen.getByText("Active")).toBeInTheDocument()
    expect(screen.getByTestId("clock-icon")).toBeInTheDocument()
  })

  it("renders project filter badges", () => {
    const projectId1 = createProjectId("87654321-4321-4321-8321-876543210987")
    const projectId2 = createProjectId("87654321-4321-4321-8321-876543210988")

    mockAllProjects.push(
      {
        id: projectId1,
        name: "Work Project",
        color: "#3b82f6",
        slug: "work",
        sections: [DEFAULT_PROJECT_SECTION],
      },
      {
        id: projectId2,
        name: "Personal Project",
        color: "#10b981",
        slug: "personal",
        sections: [DEFAULT_PROJECT_SECTION],
      },
    )

    mockHasActiveFilters.mockReturnValue(true)
    mockActiveFilters.mockReturnValue({
      projectIds: [projectId1, projectId2],
    })

    render(<TaskFilterBadges />)

    expect(screen.getByText("Work Project")).toBeInTheDocument()
    expect(screen.getByText("Personal Project")).toBeInTheDocument()
    expect(screen.getAllByTestId("folder-icon")).toHaveLength(2)
  })

  it("renders regular label filter badges", () => {
    const labelId1 = createLabelId("abcdefab-abcd-4bcd-8bcd-abcdefabcdef")
    const labelId2 = createLabelId("abcdefab-abcd-4bcd-8bcd-abcdefabcde0")

    mockAllLabels.push(
      {
        id: labelId1,
        name: "urgent",
        color: "#ef4444",
        slug: "urgent",
      },
      {
        id: labelId2,
        name: "important",
        color: "#f59e0b",
        slug: "important",
      },
    )

    mockHasActiveFilters.mockReturnValue(true)
    mockActiveFilters.mockReturnValue({
      labels: ["urgent", "important"],
    })

    render(<TaskFilterBadges />)

    expect(screen.getByText("urgent")).toBeInTheDocument()
    expect(screen.getByText("important")).toBeInTheDocument()
    expect(screen.getAllByTestId("tag-icon")).toHaveLength(2)
  })

  // New tests for "No Labels" functionality
  describe("No Labels Filter", () => {
    it('renders "No labels" badge when labels filter is null', () => {
      mockHasActiveFilters.mockReturnValue(true)
      mockActiveFilters.mockReturnValue({
        labels: null,
      })

      render(<TaskFilterBadges />)

      expect(screen.getByText("No labels")).toBeInTheDocument()
      expect(screen.getByTestId("tag-icon")).toBeInTheDocument()
    })

    it('calls removeNoLabelsFilter when "No labels" badge is clicked', async () => {
      mockHasActiveFilters.mockReturnValue(true)
      mockActiveFilters.mockReturnValue({
        labels: null,
      })

      render(<TaskFilterBadges />)

      const removeButton = screen.getByTestId("x-icon")
      await userEvent.click(removeButton)

      expect(mockUpdateFilters).toHaveBeenCalledWith({
        labels: [],
      })
    })

    it("does not render regular label badges when labels is null", () => {
      const labelId1 = createLabelId("abcdefab-abcd-4bcd-8bcd-abcdefabcdef")

      mockAllLabels.push({
        id: labelId1,
        name: "urgent",
        color: "#ef4444",
        slug: "urgent",
      })

      mockHasActiveFilters.mockReturnValue(true)
      mockActiveFilters.mockReturnValue({
        labels: null, // "no labels" filter is active
      })

      render(<TaskFilterBadges />)

      expect(screen.getByText("No labels")).toBeInTheDocument()
      expect(screen.queryByText("urgent")).not.toBeInTheDocument()
      // Should only have one tag icon for "No labels"
      expect(screen.getAllByTestId("tag-icon")).toHaveLength(1)
    })

    it("renders regular label badges when labels is an array", () => {
      const labelId1 = createLabelId("abcdefab-abcd-4bcd-8bcd-abcdefabcdef")

      mockAllLabels.push({
        id: labelId1,
        name: "urgent",
        color: "#ef4444",
        slug: "urgent",
      })

      mockHasActiveFilters.mockReturnValue(true)
      mockActiveFilters.mockReturnValue({
        labels: ["urgent"], // array of specific labels
      })

      render(<TaskFilterBadges />)

      expect(screen.getByText("urgent")).toBeInTheDocument()
      expect(screen.queryByText("No labels")).not.toBeInTheDocument()
      expect(screen.getAllByTestId("tag-icon")).toHaveLength(1)
    })
  })

  it("renders due date filter badges with preset", () => {
    mockHasActiveFilters.mockReturnValue(true)
    mockActiveFilters.mockReturnValue({
      dueDateFilter: {
        preset: "today",
      },
    })

    render(<TaskFilterBadges />)

    expect(screen.getByText("Today")).toBeInTheDocument()
    expect(screen.getByTestId("calendar-icon")).toBeInTheDocument()
  })

  it("renders due date filter badges with custom range", () => {
    mockHasActiveFilters.mockReturnValue(true)
    mockActiveFilters.mockReturnValue({
      dueDateFilter: {
        customRange: {
          start: new Date("2024-01-01"),
          end: new Date("2024-01-31"),
        },
      },
    })

    render(<TaskFilterBadges />)

    expect(screen.getByText("Custom Range")).toBeInTheDocument()
    expect(screen.getByTestId("calendar-icon")).toBeInTheDocument()
  })

  describe("Remove functionality", () => {
    it("calls removePriorityFilter when priority badge is removed", async () => {
      mockHasActiveFilters.mockReturnValue(true)
      mockActiveFilters.mockReturnValue({
        priorities: [1, 2],
      })

      render(<TaskFilterBadges />)

      const removeButtons = screen.getAllByTestId("x-icon")
      const firstRemoveButton = removeButtons[0]
      if (!firstRemoveButton) {
        throw new Error("Expected to find remove button")
      }
      await userEvent.click(firstRemoveButton)

      expect(mockUpdateFilters).toHaveBeenCalled()
    })

    it("calls removeProjectFilter when project badge is removed", async () => {
      const projectId1 = createProjectId("87654321-4321-4321-8321-876543210987")

      mockAllProjects.push({
        id: projectId1,
        name: "Work Project",
        color: "#3b82f6",
        slug: "work",
        sections: [DEFAULT_PROJECT_SECTION],
      })

      mockHasActiveFilters.mockReturnValue(true)
      mockActiveFilters.mockReturnValue({
        projectIds: [projectId1],
      })

      render(<TaskFilterBadges />)

      const removeButton = screen.getByTestId("x-icon")
      await userEvent.click(removeButton)

      expect(mockUpdateFilters).toHaveBeenCalled()
    })

    it("calls removeLabelFilter when regular label badge is removed", async () => {
      const labelId1 = createLabelId("abcdefab-abcd-4bcd-8bcd-abcdefabcdef")

      mockAllLabels.push({
        id: labelId1,
        name: "urgent",
        color: "#ef4444",
        slug: "urgent",
      })

      mockHasActiveFilters.mockReturnValue(true)
      mockActiveFilters.mockReturnValue({
        labels: ["urgent"],
      })

      render(<TaskFilterBadges />)

      const removeButton = screen.getByTestId("x-icon")
      await userEvent.click(removeButton)

      expect(mockUpdateFilters).toHaveBeenCalled()
    })

    it("calls removeCompletionFilter when completion badge is removed", async () => {
      mockHasActiveFilters.mockReturnValue(true)
      mockActiveFilters.mockReturnValue({
        completed: true,
      })

      render(<TaskFilterBadges />)

      const removeButton = screen.getByTestId("x-icon")
      await userEvent.click(removeButton)

      expect(mockUpdateFilters).toHaveBeenCalledWith({
        completed: undefined,
      })
    })

    it("calls removeDueDateFilter when due date badge is removed", async () => {
      mockHasActiveFilters.mockReturnValue(true)
      mockActiveFilters.mockReturnValue({
        dueDateFilter: {
          preset: "today",
        },
      })

      render(<TaskFilterBadges />)

      const removeButton = screen.getByTestId("x-icon")
      await userEvent.click(removeButton)

      expect(mockUpdateFilters).toHaveBeenCalledWith({
        dueDateFilter: undefined,
      })
    })
  })

  describe("Color styling", () => {
    it("applies project colors to folder icons", () => {
      const projectId1 = createProjectId("87654321-4321-4321-8321-876543210987")

      mockAllProjects.push({
        id: projectId1,
        name: "Work Project",
        color: "#3b82f6",
        slug: "work",
        sections: [DEFAULT_PROJECT_SECTION],
      })

      mockHasActiveFilters.mockReturnValue(true)
      mockActiveFilters.mockReturnValue({
        projectIds: [projectId1],
      })

      render(<TaskFilterBadges />)

      const folderIcon = screen.getByTestId("folder-icon")
      expect(folderIcon).toHaveStyle("color: #3b82f6")
    })

    it("applies label colors to tag icons", () => {
      const labelId1 = createLabelId("abcdefab-abcd-4bcd-8bcd-abcdefabcdef")

      mockAllLabels.push({
        id: labelId1,
        name: "urgent",
        color: "#ef4444",
        slug: "urgent",
      })

      mockHasActiveFilters.mockReturnValue(true)
      mockActiveFilters.mockReturnValue({
        labels: ["urgent"],
      })

      render(<TaskFilterBadges />)

      const tagIcon = screen.getByTestId("tag-icon")
      expect(tagIcon).toHaveStyle("color: #ef4444")
    })

    it('applies muted color to "No labels" tag icon', () => {
      mockHasActiveFilters.mockReturnValue(true)
      mockActiveFilters.mockReturnValue({
        labels: null,
      })

      render(<TaskFilterBadges />)

      const tagIcon = screen.getByTestId("tag-icon")
      expect(tagIcon).toHaveClass("text-muted-foreground")
    })
  })
})
