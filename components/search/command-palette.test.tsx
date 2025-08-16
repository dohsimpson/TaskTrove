import React from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { CommandPalette } from "./command-palette"

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    pathname: "/",
  }),
}))

// Mock next-themes
vi.mock("next-themes", () => ({
  useTheme: () => ({
    theme: "light",
    setTheme: vi.fn(),
  }),
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

// Mock cmdk components
vi.mock("@/components/ui/command", () => ({
  CommandDialog: ({
    children,
    open,
    onOpenChange,
  }: {
    children: React.ReactNode
    open: boolean
    onOpenChange: (open: boolean) => void
  }) =>
    open ? (
      <div data-testid="command-dialog" onClick={() => onOpenChange(false)}>
        {children}
      </div>
    ) : null,
  CommandInput: ({
    placeholder,
    value,
    onValueChange,
  }: {
    placeholder?: string
    value?: string
    onValueChange?: (value: string) => void
  }) => (
    <input
      data-testid="command-input"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onValueChange?.(e.target.value)}
    />
  ),
  CommandList: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="command-list">{children}</div>
  ),
  CommandEmpty: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="command-empty">{children}</div>
  ),
  CommandGroup: ({ children, heading }: { children: React.ReactNode; heading?: string }) => (
    <div data-testid="command-group">
      {heading && <div data-testid="command-group-heading">{heading}</div>}
      {children}
    </div>
  ),
  CommandItem: ({ children, onSelect }: { children: React.ReactNode; onSelect?: () => void }) => (
    <button data-testid="command-item" onClick={onSelect}>
      {children}
    </button>
  ),
  CommandShortcut: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="command-shortcut">{children}</div>
  ),
}))

// Mock use-toast
vi.mock("@/hooks/use-toast", () => ({
  toast: vi.fn(),
}))

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
  Search: () => <div data-testid="search-icon" />,
  Plus: () => <div data-testid="plus-icon" />,
  Calendar: () => <div data-testid="calendar-icon" />,
  List: () => <div data-testid="list-icon" />,
  LayoutDashboard: () => <div data-testid="layout-dashboard-icon" />,
  Settings: () => <div data-testid="settings-icon" />,
  Sun: () => <div data-testid="sun-icon" />,
  Moon: () => <div data-testid="moon-icon" />,
  Monitor: () => <div data-testid="monitor-icon" />,
  Star: () => <div data-testid="star-icon" />,
  Archive: () => <div data-testid="archive-icon" />,
  Target: () => <div data-testid="target-icon" />,
  TrendingUp: () => <div data-testid="trending-up-icon" />,
  Home: () => <div data-testid="home-icon" />,
  User: () => <div data-testid="user-icon" />,
  Bell: () => <div data-testid="bell-icon" />,
  Filter: () => <div data-testid="filter-icon" />,
  Clock: () => <div data-testid="clock-icon" />,
  CheckSquare: () => <div data-testid="check-square-icon" />,
  Flag: () => <div data-testid="flag-icon" />,
  FolderPlus: () => <div data-testid="folder-plus-icon" />,
}))

describe("CommandPalette", () => {
  const mockOnOpenChange = vi.fn()
  const mockOnQuickAdd = vi.fn()
  const mockOnAdvancedSearch = vi.fn()
  const mockOnCreateProject = vi.fn()
  const mockOnSettings = vi.fn()

  const mockTasks = [
    {
      id: "1",
      title: "Test Task 1",
      description: "First test task",
      completed: false,
      priority: 1 as const,
      dueDate: new Date(),
      labels: ["urgent"],
      project: "Test Project",
    },
    {
      id: "2",
      title: "Test Task 2",
      description: "Second test task",
      completed: true,
      priority: 2 as const,
      labels: ["work"],
      project: "Test Project",
    },
    {
      id: "3",
      title: "Another Task",
      completed: false,
      priority: 3 as const,
      labels: ["personal"],
    },
  ]

  const defaultProps = {
    open: true,
    onOpenChange: mockOnOpenChange,
    tasks: mockTasks,
    onQuickAdd: mockOnQuickAdd,
    onAdvancedSearch: mockOnAdvancedSearch,
    onCreateProject: mockOnCreateProject,
    onSettings: mockOnSettings,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders when open is true", () => {
    render(<CommandPalette {...defaultProps} />)

    expect(screen.getByTestId("command-dialog")).toBeInTheDocument()
    expect(screen.getByTestId("command-input")).toBeInTheDocument()
    expect(screen.getByTestId("command-list")).toBeInTheDocument()
  })

  it("does not render when open is false", () => {
    render(<CommandPalette {...defaultProps} open={false} />)

    expect(screen.queryByTestId("command-dialog")).not.toBeInTheDocument()
  })

  it("renders command input with correct placeholder", () => {
    render(<CommandPalette {...defaultProps} />)

    const input = screen.getByTestId("command-input")
    expect(input).toHaveAttribute("placeholder", "Search tasks, navigate, or run commands...")
  })

  it("displays all command groups", () => {
    render(<CommandPalette {...defaultProps} />)

    expect(screen.getByText("Tasks")).toBeInTheDocument()
    expect(screen.getByText("Quick Actions")).toBeInTheDocument()
    expect(screen.getByText("Navigate")).toBeInTheDocument()
    expect(screen.getByText("Theme")).toBeInTheDocument()
  })

  it("displays filtered tasks based on search input", () => {
    render(<CommandPalette {...defaultProps} />)

    const input = screen.getByTestId("command-input")
    fireEvent.change(input, { target: { value: "Test" } })

    expect(screen.getByText("Test Task 1")).toBeInTheDocument()
    expect(screen.getByText("Test Task 2")).toBeInTheDocument()
    expect(screen.queryByText("Another Task")).not.toBeInTheDocument()
  })

  it("displays task descriptions when available", () => {
    render(<CommandPalette {...defaultProps} />)

    expect(screen.getByText("First test task")).toBeInTheDocument()
    expect(screen.getByText("Second test task")).toBeInTheDocument()
  })

  it("displays priority icons for tasks", () => {
    render(<CommandPalette {...defaultProps} />)

    // Should have flag icons for tasks with priority < 4
    expect(screen.getAllByTestId("flag-icon")).toHaveLength(3) // All three tasks have priority < 4
  })

  it("displays quick actions with icons and shortcuts", () => {
    render(<CommandPalette {...defaultProps} />)

    expect(screen.getByText("Add New Task")).toBeInTheDocument()
    expect(screen.getByText("Create Project")).toBeInTheDocument()
    expect(screen.getByText("Search Tasks")).toBeInTheDocument()
    expect(screen.getByText("Settings")).toBeInTheDocument()

    expect(screen.getByText("⌘N")).toBeInTheDocument()
    expect(screen.getByText("⌘⇧F")).toBeInTheDocument()
    expect(screen.getByText("⌘,")).toBeInTheDocument()
  })

  it("displays navigation items", () => {
    render(<CommandPalette {...defaultProps} />)

    expect(screen.getByText("Dashboard")).toBeInTheDocument()
    expect(screen.getByText("Today")).toBeInTheDocument()
    expect(screen.getByText("Upcoming")).toBeInTheDocument()
    expect(screen.getByText("Inbox")).toBeInTheDocument()
    expect(screen.getByText("Completed")).toBeInTheDocument()
    expect(screen.getByText("Projects")).toBeInTheDocument()
    expect(screen.getByText("Analytics")).toBeInTheDocument()
  })

  it("displays theme actions", () => {
    render(<CommandPalette {...defaultProps} />)

    expect(screen.getByText("Light Theme")).toBeInTheDocument()
    expect(screen.getByText("Dark Theme")).toBeInTheDocument()
    expect(screen.getByText("System Theme")).toBeInTheDocument()
  })

  it("shows empty state when no results found", () => {
    render(<CommandPalette {...defaultProps} />)

    const input = screen.getByTestId("command-input")
    fireEvent.change(input, { target: { value: "nonexistent" } })

    expect(screen.getByText("No results found.")).toBeInTheDocument()
  })

  it("calls onQuickAdd when Add New Task is clicked", () => {
    render(<CommandPalette {...defaultProps} />)

    const addTaskButton = screen.getByText("Add New Task").closest("button")
    if (addTaskButton) fireEvent.click(addTaskButton)

    expect(mockOnQuickAdd).toHaveBeenCalled()
    expect(mockOnOpenChange).toHaveBeenCalledWith(false)
  })

  it("calls onCreateProject when Create Project is clicked", () => {
    render(<CommandPalette {...defaultProps} />)

    const createProjectButton = screen.getByText("Create Project").closest("button")
    if (createProjectButton) fireEvent.click(createProjectButton)

    expect(mockOnCreateProject).toHaveBeenCalled()
    expect(mockOnOpenChange).toHaveBeenCalledWith(false)
  })

  it("calls onAdvancedSearch when Search Tasks is clicked", () => {
    render(<CommandPalette {...defaultProps} />)

    const searchButton = screen.getByText("Search Tasks").closest("button")
    if (searchButton) fireEvent.click(searchButton)

    expect(mockOnAdvancedSearch).toHaveBeenCalled()
    expect(mockOnOpenChange).toHaveBeenCalledWith(false)
  })

  it("works without optional props", () => {
    render(<CommandPalette open={true} onOpenChange={mockOnOpenChange} />)

    expect(screen.getByTestId("command-dialog")).toBeInTheDocument()
    expect(screen.getByText("Quick Actions")).toBeInTheDocument()
    expect(screen.getByText("Navigate")).toBeInTheDocument()
    expect(screen.getByText("Theme")).toBeInTheDocument()
  })

  it("limits task results to 5 items", () => {
    const manyTasks = Array.from({ length: 10 }, (_, i) => ({
      id: `task-${i}`,
      title: `Task ${i}`,
      completed: false,
      priority: 1 as const,
      labels: [],
    }))

    render(<CommandPalette {...defaultProps} tasks={manyTasks} />)

    // Should only show 5 tasks (limited in component)
    const taskSection = screen.getByText("Tasks").closest('[data-testid="command-group"]')

    // Count task items within the Tasks section
    const taskButtons = taskSection?.querySelectorAll("button")
    expect(taskButtons).toHaveLength(5)
  })

  it("closes palette when dialog is clicked", () => {
    render(<CommandPalette {...defaultProps} />)

    const dialog = screen.getByTestId("command-dialog")
    fireEvent.click(dialog)

    expect(mockOnOpenChange).toHaveBeenCalledWith(false)
  })

  it("handles task selection", () => {
    render(<CommandPalette {...defaultProps} />)

    const taskButton = screen.getByText("Test Task 1").closest("button")
    if (taskButton) {
      fireEvent.click(taskButton)
    }

    expect(mockOnOpenChange).toHaveBeenCalledWith(false)
  })

  it("handles theme actions", () => {
    render(<CommandPalette {...defaultProps} />)

    const lightThemeButton = screen.getByText("Light Theme").closest("button")
    if (lightThemeButton) {
      fireEvent.click(lightThemeButton)
    }

    expect(mockOnOpenChange).toHaveBeenCalledWith(false)
  })

  it("updates search value when input changes", () => {
    render(<CommandPalette {...defaultProps} />)

    const input = screen.getByTestId("command-input")
    fireEvent.change(input, { target: { value: "test search" } })

    expect(input).toHaveValue("test search")
  })

  it("filters tasks by description as well as title", () => {
    render(<CommandPalette {...defaultProps} />)

    const input = screen.getByTestId("command-input")
    fireEvent.change(input, { target: { value: "First" } })

    expect(screen.getByText("Test Task 1")).toBeInTheDocument()
    expect(screen.queryByText("Test Task 2")).not.toBeInTheDocument()
  })

  it("displays different priority flag colors", () => {
    const tasksWithDifferentPriorities = [
      { id: "1", title: "High Priority", completed: false, priority: 1 as const, labels: [] },
      { id: "2", title: "Medium Priority", completed: false, priority: 2 as const, labels: [] },
      { id: "3", title: "Low Priority", completed: false, priority: 3 as const, labels: [] },
      { id: "4", title: "Lowest Priority", completed: false, priority: 4 as const, labels: [] },
    ]

    render(<CommandPalette {...defaultProps} tasks={tasksWithDifferentPriorities} />)

    // Should have flag icons for first 3 tasks (priority < 4)
    expect(screen.getAllByTestId("flag-icon")).toHaveLength(3)
  })
})
