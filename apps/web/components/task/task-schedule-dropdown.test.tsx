import React from "react"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, fireEvent } from "@/test-utils"
import { TaskScheduleDropdown } from "./task-schedule-dropdown"
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
}))

// Mock component interfaces
interface MockButtonProps {
  children?: React.ReactNode
  onClick?: () => void
  variant?: string
  className?: string
  [key: string]: unknown
}

interface MockDropdownMenuProps {
  children?: React.ReactNode
}

interface MockDropdownMenuContentProps {
  children?: React.ReactNode
  align?: string
}

interface MockDropdownMenuTriggerProps {
  children?: React.ReactNode
}

interface MockDropdownMenuItemProps {
  children?: React.ReactNode
  onClick?: () => void
  className?: string
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
}

interface MockDialogTriggerProps {
  children?: React.ReactNode
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

vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: MockDropdownMenuProps) => (
    <div data-testid="dropdown-menu">{children}</div>
  ),
  DropdownMenuContent: ({ children, align }: MockDropdownMenuContentProps) => (
    <div data-testid="dropdown-content" data-align={align}>
      {children}
    </div>
  ),
  DropdownMenuTrigger: ({ children }: MockDropdownMenuTriggerProps) => (
    <div data-testid="dropdown-trigger">{children}</div>
  ),
  DropdownMenuItem: ({ children, onClick, className }: MockDropdownMenuItemProps) => (
    <div data-testid="dropdown-item" className={className} onClick={onClick} role="menuitem">
      {children}
    </div>
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
  DialogTitle: ({ children }: MockDialogTitleProps) => (
    <h2 data-testid="dialog-title">{children}</h2>
  ),
  DialogTrigger: ({ children }: MockDialogTriggerProps) => (
    <div data-testid="dialog-trigger">{children}</div>
  ),
}))

vi.mock("@/components/ui/calendar", () => ({
  Calendar: ({ mode, selected, onSelect, className }: MockCalendarProps) => (
    <div data-testid="calendar" className={className} data-mode={mode}>
      <div data-testid="selected-date">{selected ? "Date selected" : "No date selected"}</div>
      <button data-testid="select-date" onClick={() => onSelect?.(new Date("2024-01-15"))}>
        Select Jan 15
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

describe("TaskScheduleDropdown", () => {
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

  it("renders dropdown menu with trigger element", () => {
    render(
      <TaskScheduleDropdown task={mockTask} onSchedule={mockOnSchedule}>
        <button>Schedule Task</button>
      </TaskScheduleDropdown>,
    )

    expect(screen.getByTestId("dropdown-menu")).toBeInTheDocument()
    expect(screen.getByTestId("dropdown-trigger")).toBeInTheDocument()
    expect(screen.getByText("Schedule Task")).toBeInTheDocument()
  })

  it("displays all quick schedule options", () => {
    render(
      <TaskScheduleDropdown task={mockTask} onSchedule={mockOnSchedule}>
        <button>Schedule Task</button>
      </TaskScheduleDropdown>,
    )

    expect(screen.getByText("Today")).toBeInTheDocument()
    expect(screen.getByText("Tomorrow")).toBeInTheDocument()
    expect(screen.getByText("Next week")).toBeInTheDocument()
    expect(screen.getByText("Custom date...")).toBeInTheDocument()
  })

  it("displays remove due date option when task has due date", () => {
    render(
      <TaskScheduleDropdown task={mockTask} onSchedule={mockOnSchedule}>
        <button>Schedule Task</button>
      </TaskScheduleDropdown>,
    )

    expect(screen.getByText("Remove due date")).toBeInTheDocument()
  })

  it("does not display remove due date option when task has no due date", () => {
    render(
      <TaskScheduleDropdown task={mockTaskWithoutDate} onSchedule={mockOnSchedule}>
        <button>Schedule Task</button>
      </TaskScheduleDropdown>,
    )

    expect(screen.queryByText("Remove due date")).not.toBeInTheDocument()
  })

  it("calls onSchedule with today date when Today is clicked", () => {
    render(
      <TaskScheduleDropdown task={mockTask} onSchedule={mockOnSchedule}>
        <button>Schedule Task</button>
      </TaskScheduleDropdown>,
    )

    fireEvent.click(screen.getByText("Today"))

    expect(mockOnSchedule).toHaveBeenCalledWith(
      mockTask.id,
      new Date("2024-01-01T12:00:00Z"),
      "today",
    )
  })

  it("calls onSchedule with tomorrow date when Tomorrow is clicked", () => {
    render(
      <TaskScheduleDropdown task={mockTask} onSchedule={mockOnSchedule}>
        <button>Schedule Task</button>
      </TaskScheduleDropdown>,
    )

    fireEvent.click(screen.getByText("Tomorrow"))

    expect(mockOnSchedule).toHaveBeenCalledWith(
      mockTask.id,
      new Date("2024-01-02T12:00:00Z"),
      "tomorrow",
    )
  })

  it("calls onSchedule with next week date when Next week is clicked", () => {
    render(
      <TaskScheduleDropdown task={mockTask} onSchedule={mockOnSchedule}>
        <button>Schedule Task</button>
      </TaskScheduleDropdown>,
    )

    fireEvent.click(screen.getByText("Next week"))

    expect(mockOnSchedule).toHaveBeenCalledWith(
      mockTask.id,
      new Date("2024-01-08T12:00:00Z"),
      "next-week",
    )
  })

  it("calls onSchedule with undefined when Remove due date is clicked", () => {
    render(
      <TaskScheduleDropdown task={mockTask} onSchedule={mockOnSchedule}>
        <button>Schedule Task</button>
      </TaskScheduleDropdown>,
    )

    fireEvent.click(screen.getByText("Remove due date"))

    expect(mockOnSchedule).toHaveBeenCalledWith(mockTask.id, undefined, "remove")
  })

  it("opens custom date dialog when Custom date is clicked", () => {
    render(
      <TaskScheduleDropdown task={mockTask} onSchedule={mockOnSchedule}>
        <button>Schedule Task</button>
      </TaskScheduleDropdown>,
    )

    // Initially dialog should be closed
    expect(screen.getByTestId("dialog")).toHaveAttribute("data-open", "false")

    fireEvent.click(screen.getByText("Custom date..."))

    // Dialog should now be open
    expect(screen.getByTestId("dialog")).toHaveAttribute("data-open", "true")
  })

  it("displays task title in custom date dialog", () => {
    render(
      <TaskScheduleDropdown task={mockTask} onSchedule={mockOnSchedule}>
        <button>Schedule Task</button>
      </TaskScheduleDropdown>,
    )

    fireEvent.click(screen.getByText("Custom date..."))

    expect(screen.getByText("Schedule Task: Test Task")).toBeInTheDocument()
  })

  it("displays calendar in custom date dialog", () => {
    render(
      <TaskScheduleDropdown task={mockTask} onSchedule={mockOnSchedule}>
        <button>Schedule Task</button>
      </TaskScheduleDropdown>,
    )

    fireEvent.click(screen.getByText("Custom date..."))

    expect(screen.getByTestId("calendar")).toBeInTheDocument()
    expect(screen.getByTestId("calendar")).toHaveAttribute("data-mode", "single")
  })

  it("initializes calendar with task due date", () => {
    render(
      <TaskScheduleDropdown task={mockTask} onSchedule={mockOnSchedule}>
        <button>Schedule Task</button>
      </TaskScheduleDropdown>,
    )

    fireEvent.click(screen.getByText("Custom date..."))

    expect(screen.getByText("Date selected")).toBeInTheDocument()
  })

  it("closes custom date dialog when Cancel is clicked", () => {
    render(
      <TaskScheduleDropdown task={mockTask} onSchedule={mockOnSchedule}>
        <button>Schedule Task</button>
      </TaskScheduleDropdown>,
    )

    fireEvent.click(screen.getByText("Custom date..."))
    expect(screen.getByTestId("dialog")).toHaveAttribute("data-open", "true")

    fireEvent.click(screen.getByText("Cancel"))
    expect(screen.getByTestId("dialog")).toHaveAttribute("data-open", "false")
  })

  it("closes custom date dialog when backdrop is clicked", () => {
    render(
      <TaskScheduleDropdown task={mockTask} onSchedule={mockOnSchedule}>
        <button>Schedule Task</button>
      </TaskScheduleDropdown>,
    )

    fireEvent.click(screen.getByText("Custom date..."))
    expect(screen.getByTestId("dialog")).toHaveAttribute("data-open", "true")

    fireEvent.click(screen.getByTestId("dialog-backdrop"))
    expect(screen.getByTestId("dialog")).toHaveAttribute("data-open", "false")
  })

  it("calls onSchedule with custom date when submit button is clicked", () => {
    render(
      <TaskScheduleDropdown task={mockTask} onSchedule={mockOnSchedule}>
        <button>Schedule Task</button>
      </TaskScheduleDropdown>,
    )

    fireEvent.click(screen.getByText("Custom date..."))

    // Submit with the existing due date
    fireEvent.click(screen.getByText("Schedule for Jan 15, 2024"))

    expect(mockOnSchedule).toHaveBeenCalledWith(mockTask.id, mockTask.dueDate, "custom")
  })

  it("closes dialog after custom date submission", () => {
    render(
      <TaskScheduleDropdown task={mockTask} onSchedule={mockOnSchedule}>
        <button>Schedule Task</button>
      </TaskScheduleDropdown>,
    )

    fireEvent.click(screen.getByText("Custom date..."))
    expect(screen.getByTestId("dialog")).toHaveAttribute("data-open", "true")

    fireEvent.click(screen.getByText("Schedule for Jan 15, 2024"))
    expect(screen.getByTestId("dialog")).toHaveAttribute("data-open", "false")
  })

  it('shows "Remove due date" button text when no date is selected in dialog', () => {
    render(
      <TaskScheduleDropdown task={mockTaskWithoutDate} onSchedule={mockOnSchedule}>
        <button>Schedule Task</button>
      </TaskScheduleDropdown>,
    )

    fireEvent.click(screen.getByText("Custom date..."))

    expect(screen.getByText("Remove due date")).toBeInTheDocument()
  })

  it('calls onSchedule with undefined when "Remove due date" is clicked in dialog', () => {
    render(
      <TaskScheduleDropdown task={mockTaskWithoutDate} onSchedule={mockOnSchedule}>
        <button>Schedule Task</button>
      </TaskScheduleDropdown>,
    )

    fireEvent.click(screen.getByText("Custom date..."))
    fireEvent.click(screen.getByText("Remove due date"))

    expect(mockOnSchedule).toHaveBeenCalledWith(mockTaskWithoutDate.id, undefined, "custom")
  })

  it("provides calendar functionality for date selection", () => {
    render(
      <TaskScheduleDropdown task={mockTaskWithoutDate} onSchedule={mockOnSchedule}>
        <button>Schedule Task</button>
      </TaskScheduleDropdown>,
    )

    fireEvent.click(screen.getByText("Custom date..."))

    // Dialog should be open
    expect(screen.getByTestId("dialog")).toHaveAttribute("data-open", "true")

    // Calendar should be available when dialog is open
    expect(screen.getByTestId("calendar")).toBeInTheDocument()
    expect(screen.getByTestId("select-date")).toBeInTheDocument()
  })

  it("displays calendar icon in custom date menu item", () => {
    render(
      <TaskScheduleDropdown task={mockTask} onSchedule={mockOnSchedule}>
        <button>Schedule Task</button>
      </TaskScheduleDropdown>,
    )

    expect(screen.getByTestId("calendar-icon")).toBeInTheDocument()
  })

  it("applies correct CSS class to remove due date menu item", () => {
    render(
      <TaskScheduleDropdown task={mockTask} onSchedule={mockOnSchedule}>
        <button>Schedule Task</button>
      </TaskScheduleDropdown>,
    )

    const removeItem = screen.getByText("Remove due date").closest('[data-testid="dropdown-item"]')
    expect(removeItem).toHaveClass("text-red-600")
  })

  it("sets dropdown content alignment to end", () => {
    render(
      <TaskScheduleDropdown task={mockTask} onSchedule={mockOnSchedule}>
        <button>Schedule Task</button>
      </TaskScheduleDropdown>,
    )

    expect(screen.getByTestId("dropdown-content")).toHaveAttribute("data-align", "end")
  })

  it("does not call onSchedule for unknown quick schedule type", () => {
    // This tests the default case in the switch statement
    render(
      <TaskScheduleDropdown task={mockTask} onSchedule={mockOnSchedule}>
        <button>Schedule Task</button>
      </TaskScheduleDropdown>,
    )

    // We can't directly test the default case easily, but we can verify
    // that only valid types call onSchedule by testing all valid options
    const validOptions = ["Today", "Tomorrow", "Next week", "Remove due date"]

    validOptions.forEach((option) => {
      fireEvent.click(screen.getByText(option))
    })

    // Should have been called 4 times (once for each valid option)
    expect(mockOnSchedule).toHaveBeenCalledTimes(4)
  })

  it("provides calendar clear functionality", () => {
    render(
      <TaskScheduleDropdown task={mockTask} onSchedule={mockOnSchedule}>
        <button>Schedule Task</button>
      </TaskScheduleDropdown>,
    )

    fireEvent.click(screen.getByText("Custom date..."))

    // Dialog should be open and calendar should be visible
    expect(screen.getByTestId("dialog")).toHaveAttribute("data-open", "true")
    expect(screen.getByTestId("calendar")).toBeInTheDocument()

    // Calendar should provide clear functionality
    expect(screen.getByTestId("clear-date")).toBeInTheDocument()
  })
})
