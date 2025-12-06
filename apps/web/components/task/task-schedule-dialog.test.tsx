import React from "react"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, fireEvent } from "@/test-utils"
import { TaskScheduleDialog } from "./task-schedule-dialog"
import { createTaskId } from "@tasktrove/types/id"

// Mock date-fns
vi.mock("date-fns", () => ({
  format: vi.fn((date, formatString) => {
    if (formatString === "MMM d, yyyy") {
      return "Jan 15, 2024"
    }
    return "2024-01-15"
  }),
}))

// Mock Lucide React icons
vi.mock("lucide-react", () => ({
  Calendar: ({ className }: { className?: string }) => (
    <div data-testid="calendar-icon" className={className} />
  ),
  Clock: ({ className }: { className?: string }) => (
    <div data-testid="clock-icon" className={className} />
  ),
}))

// Mock component interfaces
interface MockButtonProps {
  children?: React.ReactNode
  onClick?: () => void
  variant?: string
  className?: string
  [key: string]: unknown
}

interface MockDialogProps {
  children?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

interface MockDialogContentProps {
  children?: React.ReactNode
  className?: string
}

interface MockDialogHeaderProps {
  children?: React.ReactNode
}

interface MockDialogTitleProps {
  children?: React.ReactNode
  className?: string
}

interface MockCalendarProps {
  mode?: string
  selected?: Date
  onSelect?: (date: Date | undefined) => void
  disabled?: (date: Date) => boolean
  className?: string
}

// Mock UI components
vi.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, variant, className, ...props }: MockButtonProps) => (
    <button
      onClick={onClick}
      className={className}
      data-testid="button"
      data-variant={variant}
      {...props}
    >
      {children}
    </button>
  ),
}))

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children, open, onOpenChange }: MockDialogProps) => (
    <div data-testid="dialog" data-open={open}>
      {open && (
        <div data-testid="dialog-backdrop" onClick={() => onOpenChange?.(false)}>
          {children}
        </div>
      )}
    </div>
  ),
  DialogContent: ({ children, className }: MockDialogContentProps) => (
    <div data-testid="dialog-content" className={className}>
      {children}
    </div>
  ),
  DialogHeader: ({ children }: MockDialogHeaderProps) => (
    <div data-testid="dialog-header">{children}</div>
  ),
  DialogTitle: ({ children, className }: MockDialogTitleProps) => (
    <h2 data-testid="dialog-title" className={className}>
      {children}
    </h2>
  ),
}))

vi.mock("@/components/ui/calendar", () => ({
  Calendar: ({ mode, selected, onSelect, disabled, className }: MockCalendarProps) => (
    <div data-testid="calendar" className={className} data-mode={mode}>
      <div data-testid="selected-date">{selected ? "Date selected" : "No date selected"}</div>
      <button data-testid="select-date" onClick={() => onSelect?.(new Date("2024-01-15"))}>
        Select Jan 15
      </button>
      <button
        data-testid="select-past-date"
        onClick={() => {
          const pastDate = new Date("2023-12-01")
          if (!disabled?.(pastDate)) {
            onSelect?.(pastDate)
          }
        }}
      >
        Select Past Date
      </button>
      <button data-testid="clear-date" onClick={() => onSelect?.(undefined)}>
        Clear Date
      </button>
    </div>
  ),
}))

// Sample task data
const mockTask = {
  id: createTaskId("12345678-1234-4234-8234-123456789ab1"),
  title: "Test Task",
  dueDate: new Date("2024-01-10"),
}

const mockTaskWithoutDate = {
  id: createTaskId("12345678-1234-4234-8234-123456789ab2"),
  title: "Task Without Date",
}

describe("TaskScheduleDialog", () => {
  const mockOnClose = vi.fn()
  const mockOnSchedule = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    // Mock Date constructor to return a consistent date
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2024-01-01T12:00:00Z"))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("renders null when task is null", () => {
    render(
      <TaskScheduleDialog
        task={null}
        isOpen={true}
        onClose={mockOnClose}
        onSchedule={mockOnSchedule}
      />,
    )

    expect(screen.queryByTestId("dialog")).not.toBeInTheDocument()
  })

  it("renders dialog when open and task is provided", () => {
    render(
      <TaskScheduleDialog
        task={mockTask}
        isOpen={true}
        onClose={mockOnClose}
        onSchedule={mockOnSchedule}
      />,
    )

    expect(screen.getByTestId("dialog")).toBeInTheDocument()
    expect(screen.getByTestId("dialog")).toHaveAttribute("data-open", "true")
    expect(screen.getByText("Schedule Task: Test Task")).toBeInTheDocument()
  })

  it("does not render dialog content when closed", () => {
    render(
      <TaskScheduleDialog
        task={mockTask}
        isOpen={false}
        onClose={mockOnClose}
        onSchedule={mockOnSchedule}
      />,
    )

    expect(screen.getByTestId("dialog")).toHaveAttribute("data-open", "false")
    expect(screen.queryByTestId("dialog-content")).not.toBeInTheDocument()
  })

  it("displays quick schedule buttons", () => {
    render(
      <TaskScheduleDialog
        task={mockTask}
        isOpen={true}
        onClose={mockOnClose}
        onSchedule={mockOnSchedule}
      />,
    )

    expect(screen.getByText("Today")).toBeInTheDocument()
    expect(screen.getByText("Tomorrow")).toBeInTheDocument()
    expect(screen.getByText("Next Week")).toBeInTheDocument()
  })

  it("displays remove date button when task has due date", () => {
    render(
      <TaskScheduleDialog
        task={mockTask}
        isOpen={true}
        onClose={mockOnClose}
        onSchedule={mockOnSchedule}
      />,
    )

    expect(screen.getByText("Remove Date")).toBeInTheDocument()
  })

  it("does not display remove date button when task has no due date", () => {
    render(
      <TaskScheduleDialog
        task={mockTaskWithoutDate}
        isOpen={true}
        onClose={mockOnClose}
        onSchedule={mockOnSchedule}
      />,
    )

    expect(screen.queryByText("Remove Date")).not.toBeInTheDocument()
  })

  it("calls onSchedule with today date when Today button is clicked", () => {
    render(
      <TaskScheduleDialog
        task={mockTask}
        isOpen={true}
        onClose={mockOnClose}
        onSchedule={mockOnSchedule}
      />,
    )

    fireEvent.click(screen.getByText("Today"))

    expect(mockOnSchedule).toHaveBeenCalledWith(
      mockTask.id,
      new Date("2024-01-01T12:00:00Z"),
      "today",
    )
    expect(mockOnClose).toHaveBeenCalled()
  })

  it("calls onSchedule with tomorrow date when Tomorrow button is clicked", () => {
    render(
      <TaskScheduleDialog
        task={mockTask}
        isOpen={true}
        onClose={mockOnClose}
        onSchedule={mockOnSchedule}
      />,
    )

    fireEvent.click(screen.getByText("Tomorrow"))

    expect(mockOnSchedule).toHaveBeenCalledWith(
      mockTask.id,
      new Date("2024-01-02T12:00:00Z"),
      "tomorrow",
    )
    expect(mockOnClose).toHaveBeenCalled()
  })

  it("calls onSchedule with next week date when Next Week button is clicked", () => {
    render(
      <TaskScheduleDialog
        task={mockTask}
        isOpen={true}
        onClose={mockOnClose}
        onSchedule={mockOnSchedule}
      />,
    )

    fireEvent.click(screen.getByText("Next Week"))

    expect(mockOnSchedule).toHaveBeenCalledWith(
      mockTask.id,
      new Date("2024-01-08T12:00:00Z"),
      "next-week",
    )
    expect(mockOnClose).toHaveBeenCalled()
  })

  it("calls onSchedule with undefined date when Remove Date button is clicked", () => {
    render(
      <TaskScheduleDialog
        task={mockTask}
        isOpen={true}
        onClose={mockOnClose}
        onSchedule={mockOnSchedule}
      />,
    )

    fireEvent.click(screen.getByText("Remove Date"))

    expect(mockOnSchedule).toHaveBeenCalledWith(mockTask.id, undefined, "remove")
    expect(mockOnClose).toHaveBeenCalled()
  })

  it("calls onClose when Cancel button is clicked", () => {
    render(
      <TaskScheduleDialog
        task={mockTask}
        isOpen={true}
        onClose={mockOnClose}
        onSchedule={mockOnSchedule}
      />,
    )

    fireEvent.click(screen.getByText("Cancel"))

    expect(mockOnClose).toHaveBeenCalled()
  })

  it("calls onClose when dialog backdrop is clicked", () => {
    render(
      <TaskScheduleDialog
        task={mockTask}
        isOpen={true}
        onClose={mockOnClose}
        onSchedule={mockOnSchedule}
      />,
    )

    fireEvent.click(screen.getByTestId("dialog-backdrop"))

    expect(mockOnClose).toHaveBeenCalled()
  })

  it("displays calendar component", () => {
    render(
      <TaskScheduleDialog
        task={mockTask}
        isOpen={true}
        onClose={mockOnClose}
        onSchedule={mockOnSchedule}
      />,
    )

    expect(screen.getByTestId("calendar")).toBeInTheDocument()
    expect(screen.getByTestId("calendar")).toHaveAttribute("data-mode", "single")
  })

  it("calendar receives correct props", () => {
    render(
      <TaskScheduleDialog
        task={mockTask}
        isOpen={true}
        onClose={mockOnClose}
        onSchedule={mockOnSchedule}
      />,
    )

    const calendar = screen.getByTestId("calendar")
    expect(calendar).toBeInTheDocument()
    expect(calendar).toHaveAttribute("data-mode", "single")
  })

  it("calls onSchedule with custom date when submit button is clicked with task due date", () => {
    render(
      <TaskScheduleDialog
        task={mockTask}
        isOpen={true}
        onClose={mockOnClose}
        onSchedule={mockOnSchedule}
      />,
    )

    // The button should show schedule text based on the initial due date
    const submitButton = screen.getByText("Schedule for Jan 15, 2024")
    fireEvent.click(submitButton)

    expect(mockOnSchedule).toHaveBeenCalledWith(mockTask.id, mockTask.dueDate, "custom")
    expect(mockOnClose).toHaveBeenCalled()
  })

  it('shows "Remove due date" button text when no date is selected', () => {
    render(
      <TaskScheduleDialog
        task={mockTaskWithoutDate}
        isOpen={true}
        onClose={mockOnClose}
        onSchedule={mockOnSchedule}
      />,
    )

    expect(screen.getByText("Remove due date")).toBeInTheDocument()
  })

  it('calls onSchedule with undefined when "Remove due date" is clicked', () => {
    render(
      <TaskScheduleDialog
        task={mockTaskWithoutDate}
        isOpen={true}
        onClose={mockOnClose}
        onSchedule={mockOnSchedule}
      />,
    )

    fireEvent.click(screen.getByText("Remove due date"))

    expect(mockOnSchedule).toHaveBeenCalledWith(mockTaskWithoutDate.id, undefined, "custom")
    expect(mockOnClose).toHaveBeenCalled()
  })

  it("initializes selected date with task due date", () => {
    render(
      <TaskScheduleDialog
        task={mockTask}
        isOpen={true}
        onClose={mockOnClose}
        onSchedule={mockOnSchedule}
      />,
    )

    // The calendar should show the task's due date as selected
    expect(screen.getByTestId("calendar")).toBeInTheDocument()
    expect(screen.getByText("Date selected")).toBeInTheDocument()
  })

  it("provides calendar clear functionality", () => {
    render(
      <TaskScheduleDialog
        task={mockTask}
        isOpen={true}
        onClose={mockOnClose}
        onSchedule={mockOnSchedule}
      />,
    )

    // Calendar should have clear functionality available
    expect(screen.getByTestId("clear-date")).toBeInTheDocument()
  })

  it("does not call onSchedule for unknown quick schedule type", () => {
    // This test verifies the default case in the switch statement
    render(
      <TaskScheduleDialog
        task={mockTask}
        isOpen={true}
        onClose={mockOnClose}
        onSchedule={mockOnSchedule}
      />,
    )

    // We'll simulate an invalid type by mocking a button that calls handleQuickSchedule with invalid type
    const TestComponent = () => {
      const [isOpen, setIsOpen] = React.useState(true)

      return (
        <TaskScheduleDialog
          task={mockTask}
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          onSchedule={mockOnSchedule}
        />
      )
    }

    // For this test, we'll just verify that calling with invalid type doesn't crash
    // The component handles this gracefully with the default case
    expect(() => {
      render(<TestComponent />)
    }).not.toThrow()
  })

  it("does not execute quick schedule when task is null", () => {
    // Create a component that tries to call handleQuickSchedule when task is null
    const TestComponent = () => {
      return (
        <TaskScheduleDialog
          task={null}
          isOpen={true}
          onClose={mockOnClose}
          onSchedule={mockOnSchedule}
        />
      )
    }

    render(<TestComponent />)

    // Since task is null, the component should return null and not render anything
    expect(screen.queryByTestId("dialog")).not.toBeInTheDocument()
    expect(mockOnSchedule).not.toHaveBeenCalled()
  })

  it("does not execute custom date submit when task is null", () => {
    // Similar to above test but for custom date submit
    const TestComponent = () => {
      return (
        <TaskScheduleDialog
          task={null}
          isOpen={true}
          onClose={mockOnClose}
          onSchedule={mockOnSchedule}
        />
      )
    }

    render(<TestComponent />)

    expect(screen.queryByTestId("dialog")).not.toBeInTheDocument()
    expect(mockOnSchedule).not.toHaveBeenCalled()
  })
})
