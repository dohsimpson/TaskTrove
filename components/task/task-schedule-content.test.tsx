import { render, screen, fireEvent } from "@testing-library/react"
import { vi, describe, it, expect, beforeEach } from "vitest"
import { TaskScheduleContent } from "./task-schedule-content"
import type { Task } from "@/lib/types"
import { INBOX_PROJECT_ID } from "@/lib/types"
import { TEST_TASK_ID_1 } from "@/lib/utils/test-constants"

// Mock jotai to provide test data
let mockTasks: Task[] = []
let mockQuickAddTask: {
  title: string
  description: string
  dueDate?: Date
  recurring?: string
} | null = null
const mockUpdateTask = vi.fn()
const mockUpdateQuickAddTask = vi.fn()
vi.mock("jotai", () => {
  const createMockAtom = () => {
    const atom = () => null
    atom.debugLabel = ""
    return atom
  }

  return {
    useAtomValue: vi.fn((atom) => {
      // Return appropriate mock data based on which atom is being accessed
      if (atom.debugLabel?.includes("quickAdd") || atom.toString().includes("quickAdd")) {
        return mockQuickAddTask
      }
      return mockTasks
    }),
    useSetAtom: vi.fn((atom) => {
      // Return appropriate mock function based on which atom is being accessed
      if (
        atom.debugLabel?.includes("updateQuickAdd") ||
        atom.toString().includes("updateQuickAdd")
      ) {
        return mockUpdateQuickAddTask
      }
      return mockUpdateTask
    }),
    atom: createMockAtom,
  }
})

// Mock date-fns
vi.mock("date-fns", () => ({
  format: (date: Date | string, formatStr: string) => {
    const d = typeof date === "string" ? new Date(date) : date
    if (formatStr === "MMM d") {
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
    }
    return d.toLocaleDateString()
  },
}))

// Mock the recurring task processor
vi.mock("@/lib/utils/recurring-task-processor", () => ({
  calculateNextDueDate: vi.fn(() => new Date()),
}))

// Mock the CommonRRules and related functions
vi.mock("@/lib/types", async () => {
  const actual = await vi.importActual("@/lib/types")
  return {
    ...actual,
    CommonRRules: {
      daily: () => "RRULE:FREQ=DAILY",
      weekly: () => "RRULE:FREQ=WEEKLY",
      monthly: () => "RRULE:FREQ=MONTHLY",
      everyNDays: (n: number) => `RRULE:FREQ=DAILY;INTERVAL=${n}`,
      everyNWeeks: (n: number) => `RRULE:FREQ=WEEKLY;INTERVAL=${n}`,
    },
    buildRRule: ({ freq, interval }: { freq: string; interval?: number }) =>
      interval ? `RRULE:FREQ=${freq};INTERVAL=${interval}` : `RRULE:FREQ=${freq}`,
  }
})

describe("TaskScheduleContent", () => {
  const mockTask: Task = {
    id: TEST_TASK_ID_1,
    title: "Test Task",
    description: "",
    completed: false,
    priority: 3,
    projectId: INBOX_PROJECT_ID,
    labels: [],
    subtasks: [],
    comments: [],
    attachments: [],
    createdAt: new Date(),
  }

  const mockOnClose = vi.fn()
  const mockOnModeChange = vi.fn()

  const renderWithTasks = (tasks: Task[], children: React.ReactNode) => {
    mockTasks = tasks
    return render(children)
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockUpdateTask.mockClear()
    mockUpdateQuickAddTask.mockClear()
    mockQuickAddTask = null
  })

  describe("Quick Schedule Mode", () => {
    it("should render schedule options correctly", () => {
      renderWithTasks(
        [mockTask],
        <TaskScheduleContent
          taskId={mockTask.id}
          onClose={mockOnClose}
          onModeChange={mockOnModeChange}
        />,
      )

      expect(screen.getByText("Schedule")).toBeInTheDocument()
      expect(screen.getByText("Today")).toBeInTheDocument()
      expect(screen.getByText("Tomorrow")).toBeInTheDocument()
      expect(screen.getByText("Next Week")).toBeInTheDocument()
      expect(screen.getByText("Custom date")).toBeInTheDocument()
      expect(screen.getByText("Make recurring")).toBeInTheDocument()
    })

    it("should call updateTask with correct parameters for today", () => {
      renderWithTasks(
        [mockTask],
        <TaskScheduleContent
          taskId={mockTask.id}
          onClose={mockOnClose}
          onModeChange={mockOnModeChange}
        />,
      )

      fireEvent.click(screen.getByText("Today"))

      expect(mockUpdateTask).toHaveBeenCalledWith({
        updateRequest: {
          id: TEST_TASK_ID_1,
          dueDate: expect.any(Date),
        },
      })
    })

    it("should call updateTask with correct parameters for tomorrow", () => {
      renderWithTasks(
        [mockTask],
        <TaskScheduleContent
          taskId={mockTask.id}
          onClose={mockOnClose}
          onModeChange={mockOnModeChange}
        />,
      )

      fireEvent.click(screen.getByText("Tomorrow"))

      expect(mockUpdateTask).toHaveBeenCalledWith({
        updateRequest: {
          id: TEST_TASK_ID_1,
          dueDate: expect.any(Date),
        },
      })
    })

    it("should show remove date button when task has due date", () => {
      const taskWithDueDate = { ...mockTask, dueDate: new Date() }

      renderWithTasks(
        [taskWithDueDate],
        <TaskScheduleContent
          taskId={taskWithDueDate.id}
          onClose={mockOnClose}
          onModeChange={mockOnModeChange}
        />,
      )

      expect(screen.getByText("Remove date")).toBeInTheDocument()
    })

    it("should call updateTask to remove date", () => {
      const taskWithDueDate = { ...mockTask, dueDate: new Date() }

      renderWithTasks(
        [taskWithDueDate],
        <TaskScheduleContent
          taskId={taskWithDueDate.id}
          onClose={mockOnClose}
          onModeChange={mockOnModeChange}
        />,
      )

      fireEvent.click(screen.getByText("Remove date"))

      expect(mockUpdateTask).toHaveBeenCalledWith({
        updateRequest: {
          id: TEST_TASK_ID_1,
          dueDate: null,
        },
      })
    })
  })

  describe("Recurring Mode", () => {
    it("should switch to recurring mode when Make recurring is clicked", () => {
      renderWithTasks(
        [mockTask],
        <TaskScheduleContent
          taskId={mockTask.id}
          onClose={mockOnClose}
          onModeChange={mockOnModeChange}
        />,
      )

      fireEvent.click(screen.getByText("Make recurring"))

      expect(mockOnModeChange).toHaveBeenCalledWith("recurring")
      expect(screen.getByText("Make Recurring")).toBeInTheDocument()
    })

    it("should render recurring options in recurring mode", () => {
      renderWithTasks(
        [mockTask],
        <TaskScheduleContent
          taskId={mockTask.id}
          onClose={mockOnClose}
          onModeChange={mockOnModeChange}
        />,
      )

      // Switch to recurring mode
      fireEvent.click(screen.getByText("Make recurring"))

      expect(screen.getByText("Daily")).toBeInTheDocument()
      expect(screen.getByText("Weekly")).toBeInTheDocument()
      expect(screen.getByText("Monthly")).toBeInTheDocument()
      expect(screen.getByText("Custom interval")).toBeInTheDocument()
    })

    it("should call updateTask with daily RRULE when Daily is clicked", () => {
      renderWithTasks(
        [mockTask],
        <TaskScheduleContent
          taskId={mockTask.id}
          onClose={mockOnClose}
          onModeChange={mockOnModeChange}
        />,
      )

      fireEvent.click(screen.getByText("Make recurring"))
      fireEvent.click(screen.getByText("Daily"))

      expect(mockUpdateTask).toHaveBeenCalledWith(
        expect.objectContaining({
          updateRequest: expect.objectContaining({
            id: TEST_TASK_ID_1,
            recurring: "RRULE:FREQ=DAILY",
            dueDate: expect.any(Date),
          }),
        }),
      )
    })

    it("should call updateTask with weekly RRULE when Weekly is clicked", () => {
      renderWithTasks(
        [mockTask],
        <TaskScheduleContent
          taskId={mockTask.id}
          onClose={mockOnClose}
          onModeChange={mockOnModeChange}
        />,
      )

      fireEvent.click(screen.getByText("Make recurring"))
      fireEvent.click(screen.getByText("Weekly"))

      expect(mockUpdateTask).toHaveBeenCalledWith(
        expect.objectContaining({
          updateRequest: expect.objectContaining({
            id: TEST_TASK_ID_1,
            recurring: "RRULE:FREQ=WEEKLY",
            dueDate: expect.any(Date),
          }),
        }),
      )
    })

    it("should call updateTask with monthly RRULE when Monthly is clicked", () => {
      renderWithTasks(
        [mockTask],
        <TaskScheduleContent
          taskId={mockTask.id}
          onClose={mockOnClose}
          onModeChange={mockOnModeChange}
        />,
      )

      fireEvent.click(screen.getByText("Make recurring"))
      fireEvent.click(screen.getByText("Monthly"))

      expect(mockUpdateTask).toHaveBeenCalledWith(
        expect.objectContaining({
          updateRequest: expect.objectContaining({
            id: TEST_TASK_ID_1,
            recurring: "RRULE:FREQ=MONTHLY",
            dueDate: expect.any(Date),
          }),
        }),
      )
    })

    it("should handle custom interval for days", async () => {
      renderWithTasks(
        [mockTask],
        <TaskScheduleContent
          taskId={mockTask.id}
          onClose={mockOnClose}
          onModeChange={mockOnModeChange}
        />,
      )

      fireEvent.click(screen.getByText("Make recurring"))

      // Set custom interval to 3
      const intervalInput = screen.getByPlaceholderText("1")
      fireEvent.change(intervalInput, { target: { value: "3" } })

      // Select days unit (should be default)
      const setButton = screen.getByText("Set")
      fireEvent.click(setButton)

      expect(mockUpdateTask).toHaveBeenCalledWith(
        expect.objectContaining({
          updateRequest: expect.objectContaining({
            id: TEST_TASK_ID_1,
            recurring: "RRULE:FREQ=DAILY;INTERVAL=3",
            dueDate: expect.any(Date),
          }),
        }),
      )
    })

    it("should handle custom interval for weeks", async () => {
      renderWithTasks(
        [mockTask],
        <TaskScheduleContent
          taskId={mockTask.id}
          onClose={mockOnClose}
          onModeChange={mockOnModeChange}
        />,
      )

      fireEvent.click(screen.getByText("Make recurring"))

      // Set custom interval to 2
      const intervalInput = screen.getByPlaceholderText("1")
      fireEvent.change(intervalInput, { target: { value: "2" } })

      // Select weeks unit
      const unitSelect = screen.getByRole("combobox")
      fireEvent.click(unitSelect)
      fireEvent.click(screen.getByText("weeks"))

      const setButton = screen.getByText("Set")
      fireEvent.click(setButton)

      expect(mockUpdateTask).toHaveBeenCalledWith(
        expect.objectContaining({
          updateRequest: expect.objectContaining({
            id: TEST_TASK_ID_1,
            recurring: "RRULE:FREQ=WEEKLY;INTERVAL=2",
            dueDate: expect.any(Date),
          }),
        }),
      )
    })

    it("should show remove recurring button when task has recurring pattern", () => {
      const taskWithRecurring = { ...mockTask, recurring: "RRULE:FREQ=DAILY" }

      renderWithTasks(
        [taskWithRecurring],
        <TaskScheduleContent
          taskId={taskWithRecurring.id}
          onClose={mockOnClose}
          onModeChange={mockOnModeChange}
        />,
      )

      fireEvent.click(screen.getByText("Make recurring"))

      expect(screen.getByText("Remove recurring pattern")).toBeInTheDocument()
    })

    it("should call updateTask to remove recurring pattern", () => {
      const taskWithRecurring = { ...mockTask, recurring: "RRULE:FREQ=DAILY" }

      renderWithTasks(
        [taskWithRecurring],
        <TaskScheduleContent
          taskId={taskWithRecurring.id}
          onClose={mockOnClose}
          onModeChange={mockOnModeChange}
        />,
      )

      fireEvent.click(screen.getByText("Make recurring"))
      fireEvent.click(screen.getByText("Remove recurring pattern"))

      expect(mockUpdateTask).toHaveBeenCalledWith({
        updateRequest: {
          id: TEST_TASK_ID_1,
          recurring: null,
        },
      })
    })

    it("should display current recurring pattern", () => {
      const taskWithRecurring = { ...mockTask, recurring: "RRULE:FREQ=DAILY" }

      renderWithTasks(
        [taskWithRecurring],
        <TaskScheduleContent
          taskId={taskWithRecurring.id}
          onClose={mockOnClose}
          onModeChange={mockOnModeChange}
        />,
      )

      fireEvent.click(screen.getByText("Make recurring"))

      expect(screen.getByText("Current: Daily")).toBeInTheDocument()
    })
  })

  describe("Calendar Mode", () => {
    it("should switch to calendar mode and back", () => {
      renderWithTasks(
        [mockTask],
        <TaskScheduleContent
          taskId={mockTask.id}
          onClose={mockOnClose}
          onModeChange={mockOnModeChange}
        />,
      )

      fireEvent.click(screen.getByText("Custom date"))

      expect(mockOnModeChange).toHaveBeenCalledWith("calendar")
      expect(screen.getByText("Pick Date")).toBeInTheDocument()

      // Go back
      const backButton = screen.getByRole("button", { name: "" }) // ChevronLeft button
      fireEvent.click(backButton)

      expect(screen.getByText("Schedule")).toBeInTheDocument()
    })
  })

  describe("Status Display", () => {
    it("should show remove date button when task has due date", () => {
      const dueDate = new Date("2024-01-15")
      const taskWithDueDate = { ...mockTask, dueDate }

      renderWithTasks(
        [taskWithDueDate],
        <TaskScheduleContent
          taskId={taskWithDueDate.id}
          onClose={mockOnClose}
          onModeChange={mockOnModeChange}
        />,
      )

      // The component should show a "Remove date" button when there's a due date
      expect(screen.getByText("Remove date")).toBeInTheDocument()
    })

    it("should show recurring pattern in status when task has recurring", () => {
      const taskWithRecurring = { ...mockTask, recurring: "RRULE:FREQ=WEEKLY" }

      renderWithTasks(
        [taskWithRecurring],
        <TaskScheduleContent
          taskId={taskWithRecurring.id}
          onClose={mockOnClose}
          onModeChange={mockOnModeChange}
        />,
      )

      expect(screen.getByText("Recurring: Weekly")).toBeInTheDocument()
    })

    it("should show remove buttons when both due date and recurring are present", () => {
      const dueDate = new Date("2024-01-15")
      const taskWithBoth = {
        ...mockTask,
        dueDate,
        recurring: "RRULE:FREQ=DAILY",
      }

      renderWithTasks(
        [taskWithBoth],
        <TaskScheduleContent
          taskId={taskWithBoth.id}
          onClose={mockOnClose}
          onModeChange={mockOnModeChange}
        />,
      )

      // Should show both remove buttons
      expect(screen.getByText("Remove date")).toBeInTheDocument()
      expect(screen.getByText("Remove recurring")).toBeInTheDocument()
      expect(screen.getByText("Recurring: Daily")).toBeInTheDocument()
    })
  })

  describe("Quick Add Task Mode (no taskId)", () => {
    const mockQuickTask = {
      title: "New Task",
      description: "",
    }

    it("should render schedule options for new task", () => {
      mockQuickAddTask = mockQuickTask

      render(<TaskScheduleContent onClose={mockOnClose} onModeChange={mockOnModeChange} />)

      expect(screen.getByText("Schedule")).toBeInTheDocument()
      expect(screen.getByText("Today")).toBeInTheDocument()
      expect(screen.getByText("Tomorrow")).toBeInTheDocument()
      expect(screen.getByText("Next Week")).toBeInTheDocument()
      expect(screen.getByText("Custom date")).toBeInTheDocument()
      expect(screen.getByText("Make recurring")).toBeInTheDocument()
    })

    it("should call updateQuickAddTask when setting due date for new task", () => {
      mockQuickAddTask = mockQuickTask

      render(<TaskScheduleContent onClose={mockOnClose} onModeChange={mockOnModeChange} />)

      fireEvent.click(screen.getByText("Today"))

      expect(mockUpdateQuickAddTask).toHaveBeenCalledWith({
        updateRequest: {
          dueDate: expect.any(Date),
        },
      })
      expect(mockUpdateTask).not.toHaveBeenCalled()
    })

    it("should call updateQuickAddTask when setting recurring pattern for new task", () => {
      mockQuickAddTask = mockQuickTask

      render(<TaskScheduleContent onClose={mockOnClose} onModeChange={mockOnModeChange} />)

      fireEvent.click(screen.getByText("Make recurring"))
      fireEvent.click(screen.getByText("Daily"))

      expect(mockUpdateQuickAddTask).toHaveBeenCalledWith(
        expect.objectContaining({
          updateRequest: expect.objectContaining({
            recurring: "RRULE:FREQ=DAILY",
            dueDate: expect.any(Date),
          }),
        }),
      )
      expect(mockUpdateTask).not.toHaveBeenCalled()
    })

    it("should preserve due date when setting recurring pattern for new task", () => {
      mockQuickAddTask = { ...mockQuickTask, dueDate: new Date("2024-01-15") }

      render(<TaskScheduleContent onClose={mockOnClose} onModeChange={mockOnModeChange} />)

      fireEvent.click(screen.getByText("Make recurring"))
      fireEvent.click(screen.getByText("Weekly"))

      expect(mockUpdateQuickAddTask).toHaveBeenCalledWith(
        expect.objectContaining({
          updateRequest: expect.objectContaining({
            recurring: "RRULE:FREQ=WEEKLY",
            dueDate: expect.any(Date),
          }),
        }),
      )
      // Should not clear the due date
      expect(mockUpdateQuickAddTask).not.toHaveBeenCalledWith(
        expect.objectContaining({
          updateRequest: expect.objectContaining({
            dueDate: null,
          }),
        }),
      )
    })

    it("should preserve recurring pattern when setting due date for new task", () => {
      mockQuickAddTask = { ...mockQuickTask, recurring: "RRULE:FREQ=DAILY" }

      render(<TaskScheduleContent onClose={mockOnClose} onModeChange={mockOnModeChange} />)

      fireEvent.click(screen.getByText("Tomorrow"))

      expect(mockUpdateQuickAddTask).toHaveBeenCalledWith({
        updateRequest: {
          dueDate: expect.any(Date),
        },
      })
      // Should not clear the recurring pattern
      expect(mockUpdateQuickAddTask).not.toHaveBeenCalledWith(
        expect.objectContaining({
          updateRequest: expect.objectContaining({
            recurring: null,
          }),
        }),
      )
    })
  })
})
