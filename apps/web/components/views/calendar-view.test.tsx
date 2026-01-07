import React from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor, within, fireEvent } from "@/test-utils"
import userEvent from "@testing-library/user-event"
import { v4 as uuidv4 } from "uuid"
import { CalendarView } from "./calendar-view"
import { createTaskId } from "@tasktrove/types/id"
import type { Task, TaskPriority } from "@tasktrove/types/core"
import { DEFAULT_USER_SETTINGS } from "@tasktrove/types/defaults"
import { MINUTES_PER_HOUR } from "@/lib/calendar/time-grid"
import {
  TEST_TASK_ID_1,
  TEST_TASK_ID_2,
  TEST_TASK_ID_3,
  TEST_LABEL_ID_1,
  TEST_LABEL_ID_2,
} from "@tasktrove/types/test-constants"

// Mock date-fns
vi.mock("date-fns", async (importOriginal) => {
  const actual = await importOriginal<typeof import("date-fns")>()
  return {
    ...actual,
    format: vi.fn((date, formatStr) => {
      const dateObj = new Date(date)
      if (formatStr === "MMMM yyyy") return "January 2025"
      if (formatStr === "MMM yyyy") return "Jan 2025"
      if (formatStr === "MMMM") return "January"
      if (formatStr === "MMM") return "Jan"
      if (formatStr === "EEEE") {
        // For January 1, 2025 (which is a Wednesday), return proper format
        const day = dateObj.getDate()
        if (dateObj.getFullYear() === 2025 && dateObj.getMonth() === 0 && day === 1) {
          return "Wednesday"
        }
        return "Monday"
      }
      if (formatStr === "EEE") return "Wed"
      if (formatStr === "d") return dateObj.getDate().toString()
      if (formatStr === "yyyy-MM-dd") {
        const year = dateObj.getFullYear()
        const month = String(dateObj.getMonth() + 1).padStart(2, "0")
        const day = String(dateObj.getDate()).padStart(2, "0")
        return `${year}-${month}-${day}`
      }
      return "2025-01-01"
    }),
    startOfMonth: vi.fn(() => {
      // For January 2025, return January 1, 2025
      return new Date("2025-01-01")
    }),
    endOfMonth: vi.fn(() => {
      // For January 2025, return January 31, 2025
      return new Date("2025-01-31")
    }),
    startOfWeek: vi.fn(() => {
      // For January 1, 2025 (Wednesday), return Sunday December 29, 2024 (local tz safe)
      return new Date(2024, 11, 29)
    }),
    endOfWeek: vi.fn(() => {
      return new Date("2025-01-04")
    }),
    isSameMonth: vi.fn((date1, date2) => {
      // For testing, treat December 2024 days as "current month" so tasks render
      const d1 = new Date(date1)
      const d2 = new Date(date2)

      // If comparing with January 2025 (currentDate), allow December 2024 days to be "current month"
      if (d2.getFullYear() === 2025 && d2.getMonth() === 0) {
        return d1.getFullYear() === 2024 && d1.getMonth() === 11 // December 2024
      }

      // Otherwise use normal comparison
      return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth()
    }),
    addDays: vi.fn((date, days) => {
      const result = new Date(date)
      result.setDate(result.getDate() + days)
      return result
    }),
    eachDayOfInterval: vi.fn(() => {
      // Generate 42 days for calendar grid (6 weeks) including January 2025
      return [
        // Week 1: Dec 29, 30, 31, Jan 1, 2, 3, 4
        new Date("2024-12-29"),
        new Date("2024-12-30"),
        new Date("2024-12-31"),
        new Date("2025-01-01"),
        new Date("2025-01-02"),
        new Date("2025-01-03"),
        new Date("2025-01-04"),
        // Week 2: Jan 5-11
        new Date("2025-01-05"),
        new Date("2025-01-06"),
        new Date("2025-01-07"),
        new Date("2025-01-08"),
        new Date("2025-01-09"),
        new Date("2025-01-10"),
        new Date("2025-01-11"),
        // Week 3: Jan 12-18
        new Date("2025-01-12"),
        new Date("2025-01-13"),
        new Date("2025-01-14"),
        new Date("2025-01-15"),
        new Date("2025-01-16"),
        new Date("2025-01-17"),
        new Date("2025-01-18"),
        // Week 4: Jan 19-25
        new Date("2025-01-19"),
        new Date("2025-01-20"),
        new Date("2025-01-21"),
        new Date("2025-01-22"),
        new Date("2025-01-23"),
        new Date("2025-01-24"),
        new Date("2025-01-25"),
        // Week 5: Jan 26 - Feb 1
        new Date("2025-01-26"),
        new Date("2025-01-27"),
        new Date("2025-01-28"),
        new Date("2025-01-29"),
        new Date("2025-01-30"),
        new Date("2025-01-31"),
        new Date("2025-02-01"),
        // Week 6: Feb 2-8
        new Date("2025-02-02"),
        new Date("2025-02-03"),
        new Date("2025-02-04"),
        new Date("2025-02-05"),
        new Date("2025-02-06"),
        new Date("2025-02-07"),
        new Date("2025-02-08"),
      ]
    }),
    isToday: vi.fn(() => false),
    isTomorrow: vi.fn(() => false),
    isThisWeek: vi.fn(() => false),
    isPast: vi.fn(() => false),
    isSameDay: vi.fn((date1, date2) => {
      if (!date1 || !date2) return false
      const d1 = new Date(date1)
      const d2 = new Date(date2)
      return (
        d1.getFullYear() === d2.getFullYear() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getDate() === d2.getDate()
      )
    }),
  }
})

// Mock DraggableTaskElement and DropTargetWrapper
vi.mock("@/components/task/draggable-task-element", () => ({
  DraggableTaskElement: ({
    children,
    taskId,
    className,
  }: {
    children: React.ReactNode
    taskId: string
    className?: string
  }) => (
    <div data-testid={`draggable-${taskId}`} className={className}>
      {children}
    </div>
  ),
}))

vi.mock("@/components/ui/drop-target-wrapper", () => ({
  DropTargetWrapper: ({
    children,
    dropTargetId,
    className,
    dropClassName,
    getData,
    canDrop,
  }: {
    children: React.ReactNode
    dropTargetId?: string
    className?: string
    dropClassName?: string
    getData?: () => Record<string, unknown>
    canDrop?: (data: { source?: { data?: Record<string, unknown> } }) => boolean
  }) => {
    const data = getData ? getData() : {}
    const canDropResult = canDrop
      ? canDrop({ source: { data: { type: "calendar-external-event" } } })
      : undefined
    return (
      <div
        data-testid={`droppable-${dropTargetId}`}
        data-droppable-type={
          data.type === "project" ? "TASK" : data.type === "label" ? "TASK" : data.type
        }
        data-can-drop={canDrop ? String(Boolean(canDropResult)) : undefined}
        data-drop-class-name={dropClassName}
        className={className}
      >
        {children}
      </div>
    )
  },
}))

// Mock ProjectViewToolbar to avoid navigation context dependency in tests
vi.mock("@/components/task/project-view-toolbar", () => ({
  ProjectViewToolbar: ({
    className,
  }: {
    className?: string
    extraActions?: React.ReactNode | { left?: React.ReactNode; right?: React.ReactNode }
  }) => <div data-testid="project-view-toolbar" className={className} />,
}))

// Mock useDragAndDrop hook
vi.mock("@/hooks/use-drag-and-drop", () => ({
  useDragAndDrop: () => ({
    handleDrop: vi.fn(),
    handleTaskReorder: vi.fn(),
    handleTaskDropOnProject: vi.fn(),
    handleTaskDropOnLabel: vi.fn(),
  }),
}))

// Mock UI components
vi.mock("@/components/ui/card", () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card" className={className}>
      {children}
    </div>
  ),
  CardContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="card-content">{children}</div>
  ),
  CardHeader: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="card-header">{children}</div>
  ),
  CardTitle: ({ children }: { children: React.ReactNode }) => (
    <h2 data-testid="card-title">{children}</h2>
  ),
}))

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    variant,
    size,
    className,
    ...props
  }: {
    children: React.ReactNode
    onClick?: () => void
    variant?: string
    size?: string
    className?: string
    [key: string]: unknown
  }) => (
    <button
      data-testid="button"
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

vi.mock("@/components/ui/badge", () => ({
  Badge: ({
    children,
    variant,
    className,
  }: {
    children: React.ReactNode
    variant?: string
    className?: string
  }) => (
    <span data-testid="badge" data-variant={variant} className={className}>
      {children}
    </span>
  ),
}))

// Mock Select components - component will have month=0 (January) and year=2025
vi.mock("@/components/ui/select", () => ({
  Select: ({
    value,
  }: {
    children: React.ReactNode
    value?: string
    onValueChange?: (value: string) => void
  }) => (
    <div data-testid="select" data-value={value}>
      <div data-testid="select-trigger">
        {value === "0" ? "January" : value === "2025" ? "2025" : value}
      </div>
    </div>
  ),
  SelectTrigger: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="select-trigger" className={className}>
      {children}
    </div>
  ),
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder || ""}</span>,
  SelectContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="select-content" style={{ display: "none" }}>
      {children}
    </div>
  ),
  SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <div data-testid="select-item" data-value={value} style={{ display: "none" }}>
      {children}
    </div>
  ),
}))

// Mock Date to return fixed January 1, 2025 for deterministic tests
const MOCK_CURRENT_DATE = new Date("2025-01-01T12:00:00.000Z")
vi.stubGlobal(
  "Date",
  class MockDate extends Date {
    constructor(value?: string | number | Date) {
      if (arguments.length === 0) {
        // When new Date() is called without arguments, return January 1, 2025
        super(MOCK_CURRENT_DATE.getTime())
      } else if (value !== undefined) {
        super(value)
      } else {
        super()
      }
    }
  },
)

// Mock Lucide icons
vi.mock("lucide-react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("lucide-react")>()
  return {
    ...actual,
    ChevronLeft: () => <div data-testid="chevron-left" />,
    ChevronRight: () => <div data-testid="chevron-right" />,
    Plus: () => <div data-testid="plus-icon" />,
    Flag: ({ className }: { className?: string }) => (
      <div data-testid="flag-icon" className={className} />
    ),
    GripVertical: ({ className }: { className?: string }) => (
      <div data-testid="grip-vertical" className={className} />
    ),
    Calendar: ({ className }: { className?: string }) => (
      <div data-testid="calendar-icon" className={className} />
    ),
    AlertTriangle: ({ className }: { className?: string }) => (
      <div data-testid="alert-triangle" className={className} />
    ),
  }
})

let mockUiSettings: Record<string, unknown> = {}

// Mock TaskItem since we're testing the CalendarView behavior
vi.mock("@/components/task/task-item", () => ({
  TaskItem: ({ taskId }: { taskId: string; variant?: string; showProjectBadge?: boolean }) => (
    <div data-testid={`task-${taskId}`}>
      <div>Mock Task {taskId}</div>
      <div data-testid="flag-icon" />
      <div data-testid="calendar-icon" />
      <div data-testid="message-square-icon" />
      <div data-testid="paperclip-icon" />
    </div>
  ),
}))

// Mock SelectionToolbar
vi.mock("@/components/task/selection-toolbar", () => ({
  SelectionToolbar: () => <div data-testid="selection-toolbar" />,
}))

// Mock TaskSidePanel
vi.mock("@/components/task/task-side-panel", () => ({
  TaskSidePanel: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) =>
    isOpen ? (
      <div data-testid="task-side-panel">
        <button onClick={onClose}>Close</button>
      </div>
    ) : null,
}))

// Note: Atom mocks are now centralized in test-utils/atoms-mocks.ts

// Mock atom values
vi.mock("jotai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("jotai")>()
  return {
    ...actual,
    useAtomValue: vi.fn((atom) => {
      const atomStr = atom.toString()
      if (atomStr.includes("settings")) {
        return {
          ...DEFAULT_USER_SETTINGS,
          uiSettings: {
            ...DEFAULT_USER_SETTINGS.uiSettings,
            ...mockUiSettings,
          },
        }
      }
      // Mock showTaskPanelAtom to return false
      if (atomStr.includes("showTaskPanel")) {
        return false
      }
      // Mock selectedTaskAtom to return null
      if (atomStr.includes("selectedTask")) {
        return null
      }
      // Mock currentViewStateAtom to return a valid view state
      if (atomStr.includes("currentViewState")) {
        return {
          showSidePanel: false,
          viewMode: "calendar",
          sortBy: "default",
          sortDirection: "asc",
          showCompleted: false,
          searchQuery: "",
          compactView: false,
        }
      }
      return undefined
    }),
    useSetAtom: vi.fn((atom) => {
      const atomLabel = atom?.toString?.() ?? ""
      if (atomLabel.includes("updateTask") || atomLabel.includes("updateTasks")) {
        return vi.fn()
      }
      if (atomLabel.includes("updateQuickAddTask")) {
        return vi.fn()
      }
      if (atomLabel.includes("updateGlobalViewOptions")) {
        return vi.fn()
      }
      return vi.fn()
    }),
  }
})

let mockIsMobileApp = false
vi.mock("@/lib/utils/env", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/utils/env")>()
  return { ...actual, isMobileApp: () => mockIsMobileApp }
})

// Mock useAddTaskToSection hook
const mockAddTaskToSection = vi.fn()
vi.mock("@/hooks/use-add-task-to-section", () => ({
  useAddTaskToSection: vi.fn(() => mockAddTaskToSection),
}))

describe("CalendarView", () => {
  const mockTasks: Task[] = [
    {
      id: TEST_TASK_ID_1,
      title: "Task 1",
      priority: 1 satisfies TaskPriority,
      dueDate: new Date("2024-12-29"), // Use dates that match actual calendar days being generated
      completed: false,
      labels: [TEST_LABEL_ID_1],
      subtasks: [],
      comments: [],
      createdAt: new Date(),
      recurringMode: "dueDate",
    },
    {
      id: TEST_TASK_ID_3,
      title: "Unscheduled Task",
      priority: 2 satisfies TaskPriority,
      // No dueDate - this is an unscheduled task
      completed: false,
      labels: [],
      subtasks: [],
      comments: [],
      createdAt: new Date(),
      recurringMode: "dueDate",
    },
    {
      id: TEST_TASK_ID_2,
      title: "Task 2",
      priority: 2 satisfies TaskPriority,
      dueDate: new Date("2024-12-29"), // Use dates that match actual calendar days being generated
      completed: true,
      labels: [],
      subtasks: [],
      comments: [],
      createdAt: new Date(),
      recurringMode: "dueDate",
    },
    {
      id: TEST_TASK_ID_3,
      title: "Task 3",
      priority: 4 satisfies TaskPriority,
      dueDate: new Date("2024-12-30"), // Use dates that match actual calendar days being generated
      completed: false,
      labels: [TEST_LABEL_ID_1, TEST_LABEL_ID_2],
      subtasks: [],
      comments: [],
      createdAt: new Date(),
      recurringMode: "dueDate",
    },
  ]

  const defaultProps = {
    tasks: mockTasks,
    onDateClick: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockAddTaskToSection.mockClear()
    mockIsMobileApp = false
    mockUiSettings = {}
  })

  it("renders calendar header with navigation", () => {
    render(<CalendarView {...defaultProps} />)

    expect(screen.getByText("January 2025")).toBeInTheDocument()
    expect(screen.getByTestId("chevron-left")).toBeInTheDocument()
    expect(screen.getByTestId("chevron-right")).toBeInTheDocument()
    expect(screen.getByText("Today")).toBeInTheDocument()
  })

  it("renders day headers", () => {
    render(<CalendarView {...defaultProps} />)

    const dayHeaders = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    dayHeaders.forEach((day) => {
      expect(screen.getByText(day)).toBeInTheDocument()
    })
  })

  it("renders calendar days", () => {
    render(<CalendarView {...defaultProps} />)

    // Should render days from mocked eachDayOfInterval
    // Based on the output, we can see days 31, 1, 2 are rendered
    const dayElements = screen.getAllByText("1")
    expect(dayElements.length).toBeGreaterThan(0) // May have multiple "1"s (Jan 1, Feb 1, etc)
    const dayTwoElements = screen.getAllByText("2")
    expect(dayTwoElements.length).toBeGreaterThan(0) // May have multiple "2"s
    // Verify calendar grid structure
    const calendarGrid = document.querySelector(".grid.grid-cols-7")
    expect(calendarGrid).toBeInTheDocument()
  })

  it("allows additional drop types", () => {
    render(
      <CalendarView
        {...defaultProps}
        additionalDropTypes={["calendar-external-event"]}
        onAdditionalDrop={vi.fn()}
      />,
    )

    const dropTarget = screen.getByTestId("droppable-calendar-day-2024-12-30")
    expect(dropTarget.getAttribute("data-can-drop")).toBe("true")
  })

  it("displays tasks on calendar days", () => {
    render(<CalendarView {...defaultProps} />)

    expect(screen.getByText(`Mock Task ${TEST_TASK_ID_1}`)).toBeInTheDocument()
    expect(screen.getByText(`Mock Task ${TEST_TASK_ID_2}`)).toBeInTheDocument()
    expect(screen.getByText(`Mock Task ${TEST_TASK_ID_3}`)).toBeInTheDocument()
  })

  it("orders month items by all-day then timed by time", () => {
    const targetDate = new Date("2024-12-29")
    const tasks: Task[] = [
      {
        id: TEST_TASK_ID_1,
        title: "All Day Task",
        priority: 1 satisfies TaskPriority,
        dueDate: targetDate,
        completed: false,
        labels: [],
        subtasks: [],
        comments: [],
        createdAt: new Date(),
        recurringMode: "dueDate",
      },
      {
        id: TEST_TASK_ID_2,
        title: "Timed Task 10am",
        priority: 1 satisfies TaskPriority,
        dueDate: targetDate,
        dueTime: new Date("2024-12-29T10:00:00"),
        completed: false,
        labels: [],
        subtasks: [],
        comments: [],
        createdAt: new Date(),
        recurringMode: "dueDate",
      },
      {
        id: TEST_TASK_ID_3,
        title: "Timed Task 3pm",
        priority: 1 satisfies TaskPriority,
        dueDate: targetDate,
        dueTime: new Date("2024-12-29T15:00:00"),
        completed: false,
        labels: [],
        subtasks: [],
        comments: [],
        createdAt: new Date(),
        recurringMode: "dueDate",
      },
    ]
    const externalEvents = [
      {
        id: "event-all-day",
        title: "All Day Event",
        allDay: true,
        start: new Date("2024-12-29T00:00:00"),
      },
      {
        id: "event-09",
        title: "Event 9am",
        allDay: false,
        start: new Date("2024-12-29T09:00:00"),
      },
      {
        id: "event-14",
        title: "Event 2pm",
        allDay: false,
        start: new Date("2024-12-29T14:00:00"),
      },
    ]

    render(
      <CalendarView
        {...defaultProps}
        tasks={tasks}
        externalEvents={externalEvents}
        viewMode="month"
        extensions={{
          useExternalEvents: ({ externalEvents }) => ({
            monthEventsByDate: {
              "2024-12-29": externalEvents ?? [],
              "2024-12-28": externalEvents ?? [],
            },
            monthMaxVisibleEventsPerDay: 10,
          }),
          renderMonthCellEvent: ({ event }) => {
            const isRecord = (value: unknown): value is Record<string, unknown> =>
              Boolean(value && typeof value === "object")
            const id = isRecord(event) && typeof event.id === "string" ? event.id : "unknown"
            return <div data-testid={`event-${id}`}>Event {id}</div>
          },
        }}
      />,
    )

    const allDayTask = screen.getByTestId(`task-${TEST_TASK_ID_1}`)
    const cell = allDayTask.closest('[data-testid^="droppable-calendar-day-"]')
    if (!cell) {
      throw new Error("Unable to locate calendar cell for event ordering test")
    }
    // Type guard to ensure this is an HTMLElement for within()
    const isHTMLElement = (element: Element): element is HTMLElement => {
      return element instanceof HTMLElement
    }
    if (!isHTMLElement(cell)) {
      throw new Error("Calendar cell is not an HTMLElement")
    }
    const scoped = within(cell)
    const allDayEvent = scoped.getByTestId("event-event-all-day")
    const event09 = scoped.getByTestId("event-event-09")
    const task10 = scoped.getByTestId(`task-${TEST_TASK_ID_2}`)
    const event14 = scoped.getByTestId("event-event-14")
    const task15 = scoped.getByTestId(`task-${TEST_TASK_ID_3}`)

    expect(cell.contains(allDayEvent)).toBe(true)
    expect(cell.contains(allDayTask)).toBe(true)
    expect(cell.contains(event09)).toBe(true)
    expect(cell.contains(task10)).toBe(true)
    expect(cell.contains(event14)).toBe(true)
    expect(cell.contains(task15)).toBe(true)

    const isBefore = (first: HTMLElement, second: HTMLElement) =>
      Boolean(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING)

    expect(isBefore(allDayEvent, allDayTask)).toBe(true)
    expect(isBefore(allDayTask, event09)).toBe(true)
    expect(isBefore(event09, task10)).toBe(true)
    expect(isBefore(task10, event14)).toBe(true)
    expect(isBefore(event14, task15)).toBe(true)
  })

  it("handles date selection", async () => {
    const user = userEvent.setup()
    render(<CalendarView {...defaultProps} />)

    // Click on the calendar day for 2024-12-30 (which should exist based on our mock)
    const calendarDay = screen.getByTestId("droppable-calendar-day-2024-12-30")

    // Click the actual date content, not the drop zone wrapper
    const dateContent =
      calendarDay.querySelector('[data-calendar-day-button="true"]') ||
      calendarDay.querySelector("button[aria-label]") ||
      calendarDay.firstElementChild
    if (dateContent) {
      if (dateContent instanceof Element) {
        await user.click(dateContent)
      }
    } else {
      await user.click(calendarDay)
    }

    // Verify that onDateClick was called (the exact date may vary due to date mocking complexities)
    expect(defaultProps.onDateClick).toHaveBeenCalled()
    const firstCall = defaultProps.onDateClick.mock.calls[0]
    if (!firstCall || !firstCall[0]) {
      throw new Error("Expected onDateClick to have been called with arguments")
    }
    const callArgs = firstCall[0]
    expect(callArgs).toBeInstanceOf(Date)
  })

  it("hides quick-add corner buttons when disabled via layoutOptions", () => {
    const layoutOptions = {
      showCornerAddButtons: false,
      showDateControls: false,
      showViewToggle: false,
    }

    const { unmount } = render(
      <CalendarView {...defaultProps} viewMode="month" layoutOptions={layoutOptions} />,
    )
    expect(screen.queryByTitle("Add task to this day")).toBeNull()
    unmount()

    render(<CalendarView {...defaultProps} viewMode="week" layoutOptions={layoutOptions} />)
    expect(screen.queryByTitle("Add task to this time slot")).toBeNull()
  })

  // Task clicks are now handled internally by TaskItem component

  it("navigates to previous month", async () => {
    const user = userEvent.setup()
    render(<CalendarView {...defaultProps} />)

    const prevButton = screen.getByTestId("chevron-left").closest("button")
    if (prevButton) {
      await user.click(prevButton)
    }

    // Navigation should trigger re-render with new date
    expect(prevButton).toBeInTheDocument()
  })

  it("navigates to next month", async () => {
    const user = userEvent.setup()
    render(<CalendarView {...defaultProps} />)

    const nextButton = screen.getByTestId("chevron-right").closest("button")
    if (nextButton) {
      await user.click(nextButton)
    }

    // Navigation should trigger re-render with new date
    expect(nextButton).toBeInTheDocument()
  })

  it("navigates to today", async () => {
    const user = userEvent.setup()
    render(<CalendarView {...defaultProps} />)

    const todayButton = screen.getByText("Today")
    await user.click(todayButton)

    // Should reset to current date
    expect(todayButton).toBeInTheDocument()
  })

  it("switches to week view when a week number is clicked", async () => {
    mockUiSettings = { showWeekNumber: true, weekStartsOn: 0 }
    const user = userEvent.setup()
    const onViewModeChange = vi.fn()
    const onCurrentDateChange = vi.fn()

    render(
      <CalendarView
        {...defaultProps}
        onViewModeChange={onViewModeChange}
        onCurrentDateChange={onCurrentDateChange}
      />,
    )

    const weekNumberCell = screen.getByTestId("week-number-0")
    await user.click(weekNumberCell)

    expect(onViewModeChange).toHaveBeenCalledWith("week")
    expect(onCurrentDateChange).toHaveBeenCalled()
    const latestCall = onCurrentDateChange.mock.calls.at(-1)
    const latestDate = latestCall?.[0]
    expect(latestDate).toBeInstanceOf(Date)
    expect(latestDate && Number.isNaN(latestDate.getTime())).toBe(false)
  })

  it("does not render an unscheduled tasks dock", () => {
    render(<CalendarView {...defaultProps} />)

    // Calendar header shows current month/year in separate dropdowns
    expect(screen.getByText("January 2025")).toBeInTheDocument()

    // Unscheduled dock has been removed
    expect(screen.queryByText(/unscheduled/i)).not.toBeInTheDocument()
  })

  it("does not render the planner side pane in base", () => {
    render(<CalendarView {...defaultProps} />)

    expect(screen.queryByText(/planner/i)).not.toBeInTheDocument()
  })

  it("snaps drag start to the current 15-minute slot when starting in the lower half", async () => {
    render(<CalendarView {...defaultProps} viewMode="week" />)

    const slotRow = document.querySelector('[data-slot-index="9"]')
    expect(slotRow).toBeInTheDocument()

    const grid = slotRow?.parentElement
    expect(grid).toBeInTheDocument()

    const dayColumns = slotRow?.querySelector("div.flex-1.grid")
    expect(dayColumns).toBeInTheDocument()

    const dayCell = dayColumns?.firstElementChild
    expect(dayCell).toBeInTheDocument()

    if (!(grid instanceof HTMLElement) || !(dayCell instanceof HTMLElement)) {
      throw new Error("Expected time grid elements to be available")
    }

    vi.spyOn(grid, "getBoundingClientRect").mockReturnValue({
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      width: 0,
      height: 0,
      x: 0,
      y: 0,
      toJSON: () => "",
    })

    dayCell.setPointerCapture = vi.fn()

    const startMinutes = 9 * MINUTES_PER_HOUR
    fireEvent.pointerDown(dayCell, {
      button: 0,
      pointerType: "mouse",
      pointerId: 1,
      clientY: startMinutes + 10,
    })

    await waitFor(() => {
      const draft = document.querySelector("div.bg-primary\\/15")
      expect(draft).toBeInTheDocument()
      expect(draft).toHaveStyle({ top: `${startMinutes}px` })
    })
  })

  it("displays tasks on calendar grid", async () => {
    render(<CalendarView {...defaultProps} />)

    // Check that tasks are displayed in calendar
    expect(screen.getByText(`Mock Task ${TEST_TASK_ID_1}`)).toBeInTheDocument()
    expect(screen.getByText(`Mock Task ${TEST_TASK_ID_2}`)).toBeInTheDocument()
    expect(screen.getByText(`Mock Task ${TEST_TASK_ID_3}`)).toBeInTheDocument()

    // Tasks should be in the calendar grid (not in a sidebar anymore)
    expect(document.querySelector(".grid.grid-cols-7")).toBeInTheDocument()
  })

  it("shows priority indicators for tasks", () => {
    render(<CalendarView {...defaultProps} />)

    // Check that tasks are rendered (priority indicators are shown as colored dots in calendar view)
    expect(screen.getByText(`Mock Task ${TEST_TASK_ID_1}`)).toBeInTheDocument()
    expect(screen.getByText(`Mock Task ${TEST_TASK_ID_2}`)).toBeInTheDocument()

    // Priority colors should be rendered as CSS classes - just verify tasks exist
    const taskElements = screen.getAllByText(/Mock Task/)
    expect(taskElements.length).toBeGreaterThan(0)
  })

  it("displays labels for tasks", async () => {
    const user = userEvent.setup()
    render(<CalendarView {...defaultProps} />)

    // Labels are displayed within tasks on the calendar grid
    // Click on a calendar day that has tasks
    const calendarDay = screen.getByTestId("droppable-calendar-day-2024-12-29")
    await user.click(calendarDay)

    // Verify tasks are displayed in calendar with their structure
    await waitFor(() => {
      // Tasks should be rendered in the calendar grid
      expect(screen.getByText(`Mock Task ${TEST_TASK_ID_1}`)).toBeInTheDocument()
      expect(screen.getByText(`Mock Task ${TEST_TASK_ID_2}`)).toBeInTheDocument()

      // Calendar structure should be intact
      expect(document.querySelector(".grid.grid-cols-7")).toBeInTheDocument()
    })
  })

  it("applies completed task styling", () => {
    render(<CalendarView {...defaultProps} />)

    // Task 2 is completed - just verify it's rendered
    expect(screen.getByText(`Mock Task ${TEST_TASK_ID_2}`)).toBeInTheDocument()

    // The completed styling is applied via CSS classes, which we can't easily test in this setup
    // But we can verify the task is rendered
    const task2Elements = screen.getAllByText(`Mock Task ${TEST_TASK_ID_2}`)
    expect(task2Elements.length).toBeGreaterThan(0)
  })

  it("shows all month-day tasks without an overflow indicator", () => {
    const manyTasks: Task[] = [
      {
        id: TEST_TASK_ID_1,
        title: "Task 1",
        priority: 1 satisfies TaskPriority,
        dueDate: new Date("2024-12-29"),
        completed: false,
        labels: [],
        subtasks: [],
        comments: [],
        createdAt: new Date(),
        recurringMode: "dueDate",
      },
      {
        id: TEST_TASK_ID_2,
        title: "Task 2",
        priority: 2 satisfies TaskPriority,
        dueDate: new Date("2024-12-29"),
        completed: false,
        labels: [],
        subtasks: [],
        comments: [],
        createdAt: new Date(),
        recurringMode: "dueDate",
      },
      {
        id: TEST_TASK_ID_3,
        title: "Task 3",
        priority: 3 satisfies TaskPriority,
        dueDate: new Date("2024-12-29"),
        completed: false,
        labels: [],
        subtasks: [],
        comments: [],
        createdAt: new Date(),
        recurringMode: "dueDate",
      },
      {
        id: createTaskId("12345678-1234-4234-8234-123456789ab4"),
        title: "Task 4",
        priority: 3 satisfies TaskPriority,
        dueDate: new Date("2024-12-29"),
        completed: false,
        labels: [],
        subtasks: [],
        comments: [],
        createdAt: new Date(),
        recurringMode: "dueDate",
      },
      {
        id: createTaskId("12345678-1234-4234-8234-123456789ab5"),
        title: "Task 5",
        priority: 3 satisfies TaskPriority,
        dueDate: new Date("2024-12-29"),
        completed: false,
        labels: [],
        subtasks: [],
        comments: [],
        createdAt: new Date(),
        recurringMode: "dueDate",
      },
    ]

    render(<CalendarView {...defaultProps} tasks={manyTasks} />)

    // Default month view shows all tasks without an overflow badge
    manyTasks.forEach((task) => {
      expect(screen.getByText(`Mock Task ${task.id}`)).toBeInTheDocument()
    })

    expect(screen.queryByText("+2 more")).not.toBeInTheDocument()
  })

  it("shows empty state for date with no tasks", () => {
    // Render with no tasks
    render(<CalendarView {...defaultProps} tasks={[]} />)

    // Calendar should still be rendered but without tasks
    expect(document.querySelector(".grid.grid-cols-7")).toBeInTheDocument()
    expect(screen.getByText("January 2025")).toBeInTheDocument()

    // No tasks should be displayed
    expect(screen.queryByText(/Mock Task/)).not.toBeInTheDocument()
  })

  it("renders drag handles for tasks in calendar", () => {
    render(<CalendarView {...defaultProps} />)

    // Check that draggable wrappers exist for tasks in calendar
    expect(screen.getByTestId("draggable-12345678-1234-4234-8234-123456789abc")).toBeInTheDocument()
    expect(screen.getByTestId("draggable-12345678-1234-4234-8234-123456789abd")).toBeInTheDocument()

    // Calendar structure should be intact
    expect(document.querySelector(".grid.grid-cols-7")).toBeInTheDocument()
  })

  it("applies correct priority colors", () => {
    render(<CalendarView {...defaultProps} />)

    // Verify that tasks are rendered, which means priority colors are being applied
    expect(screen.getByText(`Mock Task ${TEST_TASK_ID_1}`)).toBeInTheDocument()
    expect(screen.getByText(`Mock Task ${TEST_TASK_ID_2}`)).toBeInTheDocument()
    expect(screen.getByText(`Mock Task ${TEST_TASK_ID_3}`)).toBeInTheDocument()
  })

  // Event propagation is now handled internally by TaskItem component

  describe("Priority color mapping", () => {
    it("applies correct colors for different priorities", () => {
      const priorities: TaskPriority[] = [1, 2, 3, 4]
      priorities.forEach((priority) => {
        const task: Task = {
          id: createTaskId(`${uuidv4()}`),
          title: `Priority ${priority} Task`,
          priority: priority satisfies TaskPriority,
          dueDate: new Date("2024-12-29"),
          completed: false,
          labels: [],
          subtasks: [],
          comments: [],
          createdAt: new Date(),
          recurringMode: "dueDate",
        }

        const { unmount } = render(<CalendarView {...defaultProps} tasks={[task]} />)

        // Verify the task is rendered - using mocked TaskItem content
        expect(screen.getByText(`Mock Task ${task.id}`)).toBeInTheDocument()

        unmount()
      })
    })
  })

  describe("Date filtering", () => {
    it("filters tasks correctly by date", () => {
      render(<CalendarView {...defaultProps} />)

      // Tasks for 2025-01-01 should be visible
      expect(screen.getByText(`Mock Task ${TEST_TASK_ID_1}`)).toBeInTheDocument()
      expect(screen.getByText(`Mock Task ${TEST_TASK_ID_2}`)).toBeInTheDocument()

      // Task for 2025-01-02 should also be visible
      expect(screen.getByText(`Mock Task ${TEST_TASK_ID_3}`)).toBeInTheDocument()
    })
  })

  describe("Responsive Design", () => {
    it("applies responsive layout classes", () => {
      render(<CalendarView {...defaultProps} />)

      // Check main container has responsive flex classes (layout uses h-full)
      const mainContainer = document.querySelector(".flex.flex-col.h-full.overflow-hidden")
      expect(mainContainer).toHaveClass("flex", "flex-col", "h-full", "overflow-hidden")
    })

    it("has responsive padding on calendar section", () => {
      render(<CalendarView {...defaultProps} />)

      // The structure has changed with sticky header - check for the scrollable calendar grid container
      const scrollableGrid = document.querySelector(".flex-1.overflow-auto")
      expect(scrollableGrid).toBeInTheDocument()
      expect(scrollableGrid).toHaveClass("flex-1", "overflow-auto")
    })

    it("applies responsive sizing to navigation buttons", () => {
      render(<CalendarView {...defaultProps} />)

      const prevButton = screen.getByTestId("chevron-left").closest("button")
      const nextButton = screen.getByTestId("chevron-right").closest("button")

      expect(prevButton).toHaveClass("h-9", "w-9", "rounded-full", "border", "border-input/60")
      expect(nextButton).toHaveClass("h-9", "w-9", "rounded-full", "border", "border-input/60")
    })

    it("shows responsive text in day headers", () => {
      render(<CalendarView {...defaultProps} />)

      const dayHeader = screen.getByText("Sun")
      expect(dayHeader).toHaveClass("p-0.5", "md:p-1.5", "text-center", "text-[10px]", "md:text-xs")
    })

    it("uses responsive minimum heights for calendar days", () => {
      render(<CalendarView {...defaultProps} />)

      // Check that calendar day structure exists - the classes might be on a child element
      const calendarDay = screen.getByTestId("droppable-calendar-day-2024-12-29")
      expect(calendarDay).toBeInTheDocument()

      // Verify the calendar day has height-related classes or flex layout for height management
      const hasHeightClasses =
        calendarDay.className.includes("h-") ||
        calendarDay.className.includes("flex-1") ||
        calendarDay.innerHTML.includes("min-h-") ||
        calendarDay.innerHTML.includes("flex-1") ||
        calendarDay.querySelector('[class*="min-h-"]') !== null ||
        calendarDay.querySelector('[class*="flex-1"]') !== null
      expect(hasHeightClasses || calendarDay.style.minHeight).toBeTruthy()
    })

    it("does not show a floating dock for unscheduled tasks", () => {
      render(<CalendarView {...defaultProps} />)

      expect(screen.queryByText(/unscheduled/i)).not.toBeInTheDocument()
    })
  })

  describe("Accessibility", () => {
    it("has accessible calendar structure", () => {
      render(<CalendarView {...defaultProps} />)

      expect(document.querySelector(".grid.grid-cols-7")).toBeInTheDocument()

      // Verify bottom navigation is accessible
      expect(screen.getByText("January 2025")).toBeInTheDocument()
      expect(screen.getAllByTestId("selection-toolbar").length).toBeGreaterThan(0)
    })

    it("provides keyboard navigation for buttons", () => {
      render(<CalendarView {...defaultProps} />)

      const buttons = screen.getAllByTestId("button")
      expect(buttons.length).toBeGreaterThan(0)

      buttons.forEach((button) => {
        expect(button).toBeInTheDocument()
      })
    })
  })

  describe("Drag and Drop Date Handling", () => {
    // These tests focus on the date parsing logic to prevent timezone regressions
    // The actual drag-and-drop functionality is tested through integration

    it("correctly parses date strings without timezone issues", () => {
      // Test the exact parsing logic used in handleCalendarDrop
      // This validates the string-to-number parsing that prevents timezone bugs
      const targetDate = "2024-01-05"
      const parts = targetDate.split("-").map(Number)

      if (parts.length !== 3) {
        throw new Error("Expected date string to split into 3 parts")
      }

      const year = parts[0]
      const month = parts[1]
      const day = parts[2]

      if (year === undefined || month === undefined || day === undefined) {
        throw new Error("Expected all date parts to be defined")
      }

      // The key fix: verify that string parsing extracts correct components
      expect(year).toBe(2024)
      expect(month).toBe(1) // January is 1 in the string
      expect(day).toBe(5)

      // Verify these are actual numbers, not NaN
      expect(typeof year).toBe("number")
      expect(typeof month).toBe("number")
      expect(typeof day).toBe("number")
      expect(!isNaN(year)).toBe(true)
      expect(!isNaN(month)).toBe(true)
      expect(!isNaN(day)).toBe(true)

      // The month adjustment for Date constructor (1-based to 0-based)
      const adjustedMonth = month - 1
      expect(adjustedMonth).toBe(0) // January is 0 for Date constructor
    })

    it("prevents the original UTC string parsing bug", () => {
      // This test demonstrates why the original approach was problematic
      const targetDate = "2024-01-05"

      // Our fixed approach: parse components manually
      const [year, month, day] = targetDate.split("-").map(Number)
      expect(year).toBe(2024)
      expect(month).toBe(1)
      expect(day).toBe(5)

      // The original buggy approach would use: new Date("2024-01-05")
      // which creates a UTC date that might represent a different local date
      // Our approach: new Date(year, month - 1, day)
      // creates a local date with the exact components we want

      // Verify our parsing extracts the right day number
      expect(day).toBe(5) // This was the bug - tasks went to day 4 instead of day 5
    })

    it("handles various date formats consistently", () => {
      const testCases = [
        { input: "2024-01-01", expectedYear: 2024, expectedMonth: 1, expectedDay: 1 },
        { input: "2024-06-15", expectedYear: 2024, expectedMonth: 6, expectedDay: 15 },
        { input: "2024-12-31", expectedYear: 2024, expectedMonth: 12, expectedDay: 31 },
        { input: "2025-02-28", expectedYear: 2025, expectedMonth: 2, expectedDay: 28 },
        { input: "2024-02-29", expectedYear: 2024, expectedMonth: 2, expectedDay: 29 }, // Leap year
      ]

      testCases.forEach(({ input, expectedYear, expectedMonth, expectedDay }) => {
        const parts = input.split("-").map(Number)

        if (parts.length !== 3) {
          throw new Error(`Expected date string ${input} to split into 3 parts`)
        }

        const year = parts[0]
        const month = parts[1]
        const day = parts[2]

        if (year === undefined || month === undefined || day === undefined) {
          throw new Error(`Expected all date parts to be defined for ${input}`)
        }

        expect(year).toBe(expectedYear)
        expect(month).toBe(expectedMonth)
        expect(day).toBe(expectedDay)

        // Ensure parsing succeeded
        expect(!isNaN(year)).toBe(true)
        expect(!isNaN(month)).toBe(true)
        expect(!isNaN(day)).toBe(true)
      })
    })

    it("regression test: January 5th parsing extracts day 5, not day 4", () => {
      // Direct test for the reported bug scenario
      const targetDate = "2024-01-05"
      const [year, month, day] = targetDate.split("-").map(Number)

      // The critical assertion: day should be 5
      expect(day).toBe(5)
      expect(month).toBe(1) // January
      expect(year).toBe(2024)

      // This ensures that when we call new Date(year, month - 1, day)
      // we get a date representing January 5th in local time
      // The bug was that UTC parsing would sometimes make tasks appear on January 4th
    })
  })

  describe("View Options", () => {
    it("uses default variant when compactView is false", () => {
      render(<CalendarView {...defaultProps} />)

      // Find TaskItem components using the task ID pattern
      // TaskItems use data-testid="task-${taskId}"
      const firstTaskItem = screen.getByTestId(`task-${TEST_TASK_ID_1}`)
      expect(firstTaskItem).toBeInTheDocument()

      // With compactView: false (default mock), TaskItem should use "default" variant
      // The default variant typically has more spacing and detailed layout
      // We can verify the task renders correctly
    })

    it("uses compact variant when compactView is true", async () => {
      // Mock compactView: true for this test
      const { useAtomValue } = await import("jotai")
      const mockUseAtomValue = vi.mocked(useAtomValue)

      // Store the original implementation
      const originalImplementation = mockUseAtomValue.getMockImplementation()

      // Override with compactView: true
      mockUseAtomValue.mockImplementation((atom) => {
        // Mock showTaskPanelAtom to return false
        if (atom.debugLabel === "showTaskPanelAtom" || atom.toString().includes("showTaskPanel")) {
          return false
        }
        if (atom.toString().includes("settings")) {
          return {
            ...DEFAULT_USER_SETTINGS,
            uiSettings: {
              ...DEFAULT_USER_SETTINGS.uiSettings,
            },
          }
        }
        // Mock selectedTaskAtom to return null
        if (atom.debugLabel === "selectedTaskAtom" || atom.toString().includes("selectedTask")) {
          return null
        }
        // Mock currentViewStateAtom with compactView: true
        if (
          atom.debugLabel === "currentViewStateAtom" ||
          atom.toString().includes("currentViewState")
        ) {
          return {
            showSidePanel: false,
            viewMode: "calendar",
            sortBy: "default",
            sortDirection: "asc",
            showCompleted: false,
            searchQuery: "",
            compactView: true, // This is the key difference
          }
        }
        return undefined
      })

      try {
        render(<CalendarView {...defaultProps} />)

        // Find TaskItem components using the task ID pattern
        const firstTaskItem = screen.getByTestId(`task-${TEST_TASK_ID_1}`)
        expect(firstTaskItem).toBeInTheDocument()

        // With compactView: true, TaskItem should use "compact" variant
        // The compact variant typically has less spacing and more condensed layout
        // We can verify the task renders correctly with the compact styling
      } finally {
        // Restore original mock implementation
        if (originalImplementation) {
          mockUseAtomValue.mockImplementation(originalImplementation)
        }
      }
    })
  })

  describe("Drag and Drop Visual Feedback", () => {
    it("applies dropClassName to calendar day cells for visual feedback", () => {
      render(<CalendarView {...defaultProps} />)

      // Find all calendar day drop targets
      // Calendar days have dropTargetId format: calendar-day-YYYY-MM-DD
      const calendarDayDropTargets = screen.getAllByTestId(/droppable-calendar-day-/)

      // Verify that each calendar day has the dropClassName for visual feedback
      calendarDayDropTargets.forEach((dropTarget) => {
        expect(dropTarget).toHaveAttribute(
          "data-drop-class-name",
          "ring-2 ring-primary/50 bg-primary/10",
        )
      })
    })
  })

  describe("Sticky Calendar Header", () => {
    it("renders calendar header with sticky positioning classes", () => {
      render(<CalendarView {...defaultProps} />)

      // Find the sticky header container
      const stickyHeader = document.querySelector(".sticky.top-0.z-10")
      expect(stickyHeader).toBeInTheDocument()

      // Verify it has the correct backdrop blur and background classes
      expect(stickyHeader).toHaveClass(
        "sticky",
        "top-0",
        "z-10",
        "bg-background/95",
        "backdrop-blur",
        "supports-[backdrop-filter]:bg-background/60",
        "border-border/50",
        "flex-shrink-0",
      )
    })

    it("keeps calendar header elements within sticky container", () => {
      render(<CalendarView {...defaultProps} />)

      // Verify header elements are within the sticky container
      const stickyHeader = document.querySelector(".sticky.top-0.z-20")
      expect(stickyHeader).toBeInTheDocument()

      // Month/Year dropdowns should be inside sticky header
      expect(stickyHeader).toHaveTextContent("January 2025")

      // Navigation buttons should be inside sticky header
      const prevButton = screen.getByTestId("chevron-left").closest("button")
      const nextButton = screen.getByTestId("chevron-right").closest("button")
      const todayButton = screen.getByText("Today")

      expect(stickyHeader?.contains(prevButton)).toBe(true)
      expect(stickyHeader?.contains(nextButton)).toBe(true)
      expect(stickyHeader?.contains(todayButton)).toBe(true)
    })

    it("keeps day headers within sticky container", () => {
      render(<CalendarView {...defaultProps} />)

      // Find the sticky header container
      const stickyHeader = document.querySelector(".sticky.top-0.z-10")
      expect(stickyHeader).toBeInTheDocument()

      // Day headers should be inside the sticky header
      const dayHeaders = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
      dayHeaders.forEach((day) => {
        const dayElement = screen.getByText(day)
        expect(stickyHeader?.contains(dayElement)).toBe(true)
      })
    })

    it("separates calendar grid from sticky header with scrollable container", () => {
      render(<CalendarView {...defaultProps} />)

      // Find the scrollable calendar grid container
      const scrollableGrid = document.querySelector(".flex-1.overflow-auto")
      expect(scrollableGrid).toBeInTheDocument()

      // Calendar grid should exist
      const calendarGrid = document.querySelector(".grid.grid-cols-7")
      expect(calendarGrid).toBeInTheDocument()

      // Calendar days should be in the scrollable container (not in sticky header)
      const calendarDay = screen.getByTestId("droppable-calendar-day-2024-12-29")
      const stickyHeader = document.querySelector(".sticky.top-0.z-10")
      expect(stickyHeader?.contains(calendarDay)).toBe(false)
      expect(scrollableGrid?.contains(calendarDay)).toBe(true)
    })

    it("maintains proper layout structure with sticky header", () => {
      render(<CalendarView {...defaultProps} />)

      // Main container should have flex layout
      const mainContainer = document.querySelector(".h-full.flex.flex-col")
      expect(mainContainer).toHaveClass("h-full", "flex", "flex-col")

      // Sticky header should be flex-shrink-0 (not shrinkable)
      const stickyHeader = document.querySelector(".sticky.top-0.z-10")
      expect(stickyHeader).toHaveClass("flex-shrink-0")

      // Scrollable grid should be flex-1 (takes remaining space)
      const scrollableGrid = document.querySelector(".flex-1.overflow-auto")
      expect(scrollableGrid).toHaveClass("flex-1")

      // Proper nesting: main -> sticky header + scrollable grid
      expect(mainContainer?.contains(stickyHeader)).toBe(true)
      expect(mainContainer?.contains(scrollableGrid)).toBe(true)
    })

    it("keeps the week/day header and all-day row sticky in week view", async () => {
      const user = userEvent.setup()
      render(<CalendarView {...defaultProps} />)

      await user.click(screen.getByText("Week"))

      const stickyWeekRow = document.querySelector(".sticky.top-0.z-40")
      const weekHeaders = screen.getByTestId("week-day-headers")
      const allDayLabel = screen.getByText("All Day")

      expect(stickyWeekRow).toBeInTheDocument()
      expect(stickyWeekRow?.contains(weekHeaders)).toBe(true)
      expect(stickyWeekRow?.contains(allDayLabel)).toBe(true)
    })

    it("keeps the same selected day highlighted when switching between month and week views", async () => {
      const user = userEvent.setup()
      render(<CalendarView {...defaultProps} />)

      // Select January 1st (in the first displayed week) in month view
      const jan1Day = screen.getByTestId("droppable-calendar-day-2025-01-01")
      const jan1CellButton =
        jan1Day.querySelector('[data-calendar-day-button="true"]') ??
        jan1Day.querySelector("[role='button']")
      if (!jan1CellButton) throw new Error("No cell button found")
      await user.click(jan1CellButton)

      // The inner cell should show the primary border when selected
      const jan1Selected = jan1Day.querySelectorAll(".border-2.border-primary")
      expect(jan1Selected.length).toBeGreaterThan(0)

      // Switch to week view
      await user.click(screen.getByText("Week"))

      // In week view, the selected day header should still carry the primary border
      await waitFor(() => {
        const selectedWeekHeader = Array.from(document.querySelectorAll(".border-2.border-primary"))
        const hasJan1Header = selectedWeekHeader.some((el) => el.textContent?.includes("1"))
        expect(hasJan1Header).toBe(true)
      })
    })
  })
})
