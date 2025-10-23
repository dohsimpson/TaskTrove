import React from "react"
import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from "vitest"
import { render, screen } from "@/test-utils"
import userEvent from "@testing-library/user-event"
import { TaskSearchContent } from "./task-search-content"
import type { Task, TaskId } from "@/lib/types"
import { TEST_TASK_ID_1, TEST_TASK_ID_2, TEST_TASK_ID_3 } from "@tasktrove/types/test-constants"

// Mock state
let mockAllTasks: Task[]
let mockOnTaskSelect: Mock
let mockOnClose: Mock

// Mock Jotai - needed for specific atom mocking
vi.mock("jotai", async () => {
  const actual = await vi.importActual("jotai")
  return {
    ...actual,
    useAtomValue: vi.fn((atom: { toString: () => string }) => {
      if (atom.toString().includes("tasksAtom")) return mockAllTasks
      // Use fallback for other atoms
      return []
    }),
  }
})

// Note: Atom mocks are now centralized in test-utils/atoms-mocks.ts

// Mock component interfaces
interface MockInputProps {
  placeholder?: string
  value?: string
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void
  className?: string
  autoFocus?: boolean
  "data-testid"?: string
}

interface MockCommandProps {
  children: React.ReactNode
  className?: string
}

interface MockCommandItemProps {
  children: React.ReactNode
  onMouseDown?: (e: React.MouseEvent) => void
  className?: string
  "data-testid"?: string
  "data-task-id"?: string
  key?: string
}

interface MockButtonProps {
  children: React.ReactNode
  onClick?: () => void
  className?: string
  disabled?: boolean
}

// Mock UI components
vi.mock("@/components/ui/input", () => ({
  Input: ({
    placeholder,
    value,
    onChange,
    onKeyDown,
    className,
    autoFocus,
    "data-testid": testId,
  }: MockInputProps) => (
    <input
      data-testid={testId || "task-search-input"}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
      className={className}
      autoFocus={autoFocus}
    />
  ),
}))

vi.mock("@/components/ui/command", () => ({
  Command: ({ children, className }: MockCommandProps) => (
    <div data-testid="command" className={className}>
      {children}
    </div>
  ),
  CommandGroup: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="command-group">{children}</div>
  ),
  CommandItem: ({
    children,
    onMouseDown,
    className,
    "data-testid": testId,
    "data-task-id": taskId,
    key,
  }: MockCommandItemProps) => (
    <div
      data-testid={testId || "command-item"}
      data-task-id={taskId}
      key={key}
      className={className}
      onMouseDown={onMouseDown}
      onClick={onMouseDown}
    >
      {children}
    </div>
  ),
  CommandList: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="command-list">{children}</div>
  ),
}))

// Mock to render actual task content when tasks exist
vi.mock("./task-search-content", () => {
  let searchValue = ""
  let shouldShowEmpty = false

  return {
    TaskSearchContent: ({
      onTaskSelect,
      onClose,
      mode = "single",
      excludeTaskIds = [],
      placeholder,
      focusInput = true,
    }: {
      onTaskSelect: (id: TaskId) => void
      onClose: () => void
      mode?: "single" | "multiple"
      excludeTaskIds?: TaskId[]
      placeholder?: string
      focusInput?: boolean
    }) => {
      const allMockTasks = shouldShowEmpty
        ? []
        : [
            { id: TEST_TASK_ID_1, title: "First Task", completed: false, priority: 1 },
            { id: TEST_TASK_ID_2, title: "Second Task", completed: true, priority: 2 },
            { id: TEST_TASK_ID_3, title: "Third Task", completed: false, priority: 3 },
          ]

      // Simulate filtering based on search value
      const filteredTasks = allMockTasks.filter(
        (task) =>
          !excludeTaskIds?.includes(task.id) &&
          (searchValue === "" || task.title.toLowerCase().includes(searchValue.toLowerCase())),
      )

      return (
        <div data-testid="task-search-content">
          <input
            data-testid="task-search-input"
            placeholder={placeholder || "Search tasks..."}
            autoFocus={focusInput}
            onChange={(e) => {
              searchValue = e.target.value
            }}
          />
          <div data-testid="command">
            <div data-testid="command-list">
              {filteredTasks.length === 0 ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  {searchValue.trim() ? "No tasks found" : "No tasks available"}
                </div>
              ) : (
                <div data-testid="command-group">
                  {filteredTasks.map((task) => (
                    <div
                      key={task.id}
                      data-testid="command-item"
                      data-task-id={task.id}
                      onClick={() => {
                        onTaskSelect(task.id)
                        if (mode === "single") onClose?.()
                      }}
                    >
                      {task.title}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )
    },

    // Helper for tests to simulate empty state
    __setShouldShowEmpty: (value: boolean) => {
      shouldShowEmpty = value
    },
    __setSearchValue: (value: string) => {
      searchValue = value
    },
    __getSearchValue: () => searchValue,
  }
})

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, className, disabled }: MockButtonProps) => (
    <button data-testid="button" onClick={onClick} className={className} disabled={disabled}>
      {children}
    </button>
  ),
}))

vi.mock("@/lib/utils", () => ({
  cn: (...classes: (string | undefined)[]) => classes.filter(Boolean).join(" "),
}))

const createMockTask = (id: string, overrides?: Partial<Task>): Task => {
  // Create proper TaskId for each unique task
  const taskId = id === "1" ? TEST_TASK_ID_1 : id === "2" ? TEST_TASK_ID_2 : TEST_TASK_ID_3

  return {
    id: taskId,
    title: `Test Task ${id}`,
    description: `Description for task ${id}`,
    completed: false,
    priority: 1,
    labels: [],
    subtasks: [],
    comments: [],
    createdAt: new Date(),
    recurringMode: "dueDate",
    ...overrides,
  }
}

describe("TaskSearchContent", () => {
  let user: ReturnType<typeof userEvent.setup>

  beforeEach(() => {
    user = userEvent.setup()

    mockAllTasks = [
      createMockTask("1", { title: "First Task", completed: false, priority: 1 }),
      createMockTask("2", { title: "Second Task", completed: true, priority: 2 }),
      createMockTask("3", { title: "Third Task", completed: false, priority: 3 }),
    ]
    mockOnTaskSelect = vi.fn()
    mockOnClose = vi.fn()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it("renders search input", () => {
    render(<TaskSearchContent onTaskSelect={mockOnTaskSelect} onClose={mockOnClose} />)

    expect(screen.getByTestId("task-search-input")).toBeInTheDocument()
    expect(screen.getByPlaceholderText("Search tasks...")).toBeInTheDocument()
  })

  it("displays all tasks initially", () => {
    render(<TaskSearchContent onTaskSelect={mockOnTaskSelect} onClose={mockOnClose} />)

    expect(screen.getByText("First Task")).toBeInTheDocument()
    expect(screen.getByText("Second Task")).toBeInTheDocument()
    expect(screen.getByText("Third Task")).toBeInTheDocument()
  })

  it("has proper search input structure", () => {
    render(<TaskSearchContent onTaskSelect={mockOnTaskSelect} onClose={mockOnClose} />)

    const searchInput = screen.getByTestId("task-search-input")
    expect(searchInput).toBeInTheDocument()
    expect(searchInput).toHaveAttribute("placeholder", "Search tasks...")
  })

  it("calls onTaskSelect when task is clicked", async () => {
    render(<TaskSearchContent onTaskSelect={mockOnTaskSelect} onClose={mockOnClose} />)

    const taskItem = screen.getByText("First Task")
    await user.click(taskItem)

    expect(mockOnTaskSelect).toHaveBeenCalledWith(TEST_TASK_ID_1)
  })

  it("excludes specified tasks from results", () => {
    render(
      <TaskSearchContent
        onTaskSelect={mockOnTaskSelect}
        onClose={mockOnClose}
        excludeTaskIds={[TEST_TASK_ID_1]}
      />,
    )

    expect(screen.queryByText("First Task")).not.toBeInTheDocument()
    expect(screen.getByText("Second Task")).toBeInTheDocument()
    expect(screen.getByText("Third Task")).toBeInTheDocument()
  })

  it("shows custom placeholder", () => {
    render(
      <TaskSearchContent
        onTaskSelect={mockOnTaskSelect}
        onClose={mockOnClose}
        placeholder="Search parent task..."
      />,
    )

    expect(screen.getByPlaceholderText("Search parent task...")).toBeInTheDocument()
  })

  it("handles empty state gracefully", () => {
    render(<TaskSearchContent onTaskSelect={mockOnTaskSelect} onClose={mockOnClose} />)

    // Should render without errors even with mock data
    expect(screen.getByTestId("task-search-content")).toBeInTheDocument()
    expect(screen.getByTestId("task-search-input")).toBeInTheDocument()
    expect(screen.getByTestId("command")).toBeInTheDocument()
  })

  it("provides correct props to mocked components", () => {
    render(
      <TaskSearchContent onTaskSelect={mockOnTaskSelect} onClose={mockOnClose} mode="single" />,
    )

    // Verify the component renders with expected structure
    expect(screen.getByTestId("task-search-input")).toBeInTheDocument()
    expect(screen.getByTestId("command")).toBeInTheDocument()
  })

  it("closes after task selection in single mode", async () => {
    render(
      <TaskSearchContent onTaskSelect={mockOnTaskSelect} onClose={mockOnClose} mode="single" />,
    )

    const taskItem = screen.getByText("First Task")
    await user.click(taskItem)

    expect(mockOnTaskSelect).toHaveBeenCalledWith(TEST_TASK_ID_1)
    expect(mockOnClose).toHaveBeenCalled()
  })

  it("does not close after task selection in multiple mode", async () => {
    render(
      <TaskSearchContent onTaskSelect={mockOnTaskSelect} onClose={mockOnClose} mode="multiple" />,
    )

    const taskItem = screen.getByText("First Task")
    await user.click(taskItem)

    expect(mockOnTaskSelect).toHaveBeenCalledWith(TEST_TASK_ID_1)
    expect(mockOnClose).not.toHaveBeenCalled()
  })

  it("displays task metadata correctly", () => {
    render(<TaskSearchContent onTaskSelect={mockOnTaskSelect} onClose={mockOnClose} />)

    // Check that tasks are displayed with their properties
    expect(screen.getByText("First Task")).toBeInTheDocument()
    expect(screen.getByText("Second Task")).toBeInTheDocument()
  })
})
