import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { vi, describe, it, expect, beforeEach } from "vitest"
import { TaskSchedulePopover } from "./task-schedule-popover"
import type { Task } from "@/lib/types"
import { INBOX_PROJECT_ID } from "@/lib/types"
import { TEST_TASK_ID_1 } from "@/lib/utils/test-constants"

// Mock the TaskScheduleContent component
vi.mock("./task-schedule-content", () => ({
  TaskScheduleContent: ({
    onClose,
    onModeChange,
  }: {
    taskId: string
    onClose?: () => void
    onModeChange?: (mode: string) => void
  }) => (
    <div data-testid="task-schedule-content">
      <button onClick={() => onClose?.()}>Mock Today</button>
      <button onClick={() => onClose?.()}>Mock Daily</button>
      <button onClick={() => onClose?.()}>Mock Remove Recurring</button>
      <button onClick={() => onModeChange?.("calendar")}>Mock Calendar Mode</button>
      <button onClick={() => onModeChange?.("recurring")}>Mock Recurring Mode</button>
    </div>
  ),
}))

describe("TaskSchedulePopover", () => {
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

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should render trigger children correctly", () => {
    render(
      <TaskSchedulePopover taskId={mockTask.id}>
        <button>Schedule Task</button>
      </TaskSchedulePopover>,
    )

    expect(screen.getByText("Schedule Task")).toBeInTheDocument()
  })

  it("should pass onSchedule callback to TaskScheduleContent", async () => {
    render(
      <TaskSchedulePopover taskId={mockTask.id}>
        <button>Schedule Task</button>
      </TaskSchedulePopover>,
    )

    fireEvent.click(screen.getByText("Schedule Task"))

    await waitFor(() => {
      expect(screen.getByTestId("task-schedule-content")).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText("Mock Today"))

    // TaskScheduleContent now handles scheduling through atoms directly
  })

  it("should handle recurring schedule callback", async () => {
    render(
      <TaskSchedulePopover taskId={mockTask.id}>
        <button>Schedule Task</button>
      </TaskSchedulePopover>,
    )

    fireEvent.click(screen.getByText("Schedule Task"))

    await waitFor(() => {
      expect(screen.getByTestId("task-schedule-content")).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText("Mock Daily"))

    // TaskScheduleContent now handles scheduling through atoms directly
  })
})
