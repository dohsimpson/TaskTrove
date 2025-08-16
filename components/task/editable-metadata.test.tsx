import React from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@/test-utils"
import { EditableMetadata } from "./editable-metadata"
import { format, addDays } from "date-fns"

// Mock component interfaces
interface MockCustomizablePopoverProps {
  children: React.ReactNode
  sections: Array<{
    options: Array<{
      id: string
      label: string
      onClick: () => void
    }>
  }>
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

// Mock the CustomizablePopover component
vi.mock("@/components/ui/customizable-popover", () => ({
  CustomizablePopover: ({
    children,
    sections,
    open,
    onOpenChange,
  }: MockCustomizablePopoverProps) => {
    const [isOpen, setIsOpen] = React.useState(open || false)

    const handleTriggerClick = () => {
      const newOpen = !isOpen
      setIsOpen(newOpen)
      if (onOpenChange) onOpenChange(newOpen)
    }

    return (
      <div data-testid="customizable-popover">
        <div onClick={handleTriggerClick}>{children}</div>
        {isOpen && (
          <div data-testid="popover-content">
            {sections.map((section, sectionIndex: number) => (
              <div key={sectionIndex} data-testid={`section-${sectionIndex}`}>
                {section.options.map((option) => (
                  <button
                    key={option.id}
                    data-testid={`option-${option.id}`}
                    onClick={() => {
                      option.onClick()
                      setIsOpen(false)
                      if (onOpenChange) onOpenChange(false)
                    }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    )
  },
}))

const mockProjects = [
  {
    id: "1",
    name: "Work Project",
    color: "#3b82f6",
  },
  {
    id: "2",
    name: "Personal Project",
    color: "#10b981",
  },
]

const defaultProps = {
  priority: 3 as const,
  projects: mockProjects,
  onUpdate: vi.fn(),
}

describe("EditableMetadata", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders due date with default state", () => {
    render(<EditableMetadata {...defaultProps} />)

    expect(screen.getByText(/add date/i)).toBeInTheDocument()
  })

  it('renders due date with "Today" when date is today', () => {
    const today = new Date()
    render(<EditableMetadata {...defaultProps} dueDate={today} />)

    expect(screen.getByText(/today/i)).toBeInTheDocument()
  })

  it('renders due date with "Tomorrow" when date is tomorrow', () => {
    const tomorrow = addDays(new Date(), 1)
    render(<EditableMetadata {...defaultProps} dueDate={tomorrow} />)

    expect(screen.getByText(/tomorrow/i)).toBeInTheDocument()
  })

  it("renders future date in MMM d format", () => {
    const futureDate = addDays(new Date(), 7)
    render(<EditableMetadata {...defaultProps} dueDate={futureDate} />)

    const expectedFormat = format(futureDate, "MMM d")
    expect(screen.getByText(new RegExp(expectedFormat, "i"))).toBeInTheDocument()
  })

  it("renders priority with correct priority number", () => {
    render(<EditableMetadata {...defaultProps} priority={2} />)

    expect(screen.getByText(/p2/i)).toBeInTheDocument()
  })

  it('renders project section with "Add project" when no project selected', () => {
    render(<EditableMetadata {...defaultProps} />)

    expect(screen.getByText(/add project/i)).toBeInTheDocument()
  })

  it("shows selected project name when projectId is provided", () => {
    render(<EditableMetadata {...defaultProps} projectId="1" />)

    expect(screen.getByText("Work Project")).toBeInTheDocument()
  })

  it("opens date picker when due date is clicked", async () => {
    render(<EditableMetadata {...defaultProps} />)

    const dueDateSpan = screen.getByText(/add date/i)
    fireEvent.click(dueDateSpan)

    await waitFor(() => {
      expect(screen.getByRole("grid")).toBeInTheDocument() // Calendar grid
    })
  })

  it("calls onUpdate when date is selected from calendar", async () => {
    const mockOnUpdate = vi.fn()
    render(<EditableMetadata {...defaultProps} onUpdate={mockOnUpdate} />)

    const dueDateSpan = screen.getByText(/add date/i)
    fireEvent.click(dueDateSpan)

    await waitFor(() => {
      expect(screen.getByRole("grid")).toBeInTheDocument()
    })

    // Find and click a date button in the calendar
    const dateButtons = screen.getAllByRole("gridcell")
    const availableDate = dateButtons.find(
      (button) => !button.hasAttribute("disabled") && button.querySelector("button"),
    )

    if (availableDate) {
      const dateButton = availableDate.querySelector("button")
      if (dateButton) {
        fireEvent.click(dateButton)
        await waitFor(() => {
          expect(mockOnUpdate).toHaveBeenCalledWith(
            expect.objectContaining({
              dueDate: expect.any(Date),
            }),
          )
        })
      }
    }
  })

  it("shows remove due date button when date is set", async () => {
    const today = new Date()
    render(<EditableMetadata {...defaultProps} dueDate={today} />)

    const dueDateSpan = screen.getByText(/today/i)
    fireEvent.click(dueDateSpan)

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /remove due date/i })).toBeInTheDocument()
    })
  })

  it("calls onUpdate with undefined when remove due date is clicked", async () => {
    const mockOnUpdate = vi.fn()
    const today = new Date()
    render(<EditableMetadata {...defaultProps} dueDate={today} onUpdate={mockOnUpdate} />)

    const dueDateSpan = screen.getByText(/today/i)
    fireEvent.click(dueDateSpan)

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /remove due date/i })).toBeInTheDocument()
    })

    const removeButton = screen.getByRole("button", { name: /remove due date/i })
    fireEvent.click(removeButton)

    expect(mockOnUpdate).toHaveBeenCalledWith({ dueDate: undefined })
  })

  it("opens priority picker when priority is clicked", async () => {
    render(<EditableMetadata {...defaultProps} priority={2} />)

    const prioritySpan = screen.getByText(/p2/i)
    fireEvent.click(prioritySpan)

    await waitFor(() => {
      expect(screen.getByTestId("option-1")).toBeInTheDocument()
      expect(screen.getByTestId("option-2")).toBeInTheDocument()
      expect(screen.getByTestId("option-3")).toBeInTheDocument()
      expect(screen.getByTestId("option-4")).toBeInTheDocument()
    })
  })

  it("calls onUpdate when priority is selected", async () => {
    const mockOnUpdate = vi.fn()
    render(<EditableMetadata {...defaultProps} onUpdate={mockOnUpdate} />)

    const prioritySpan = screen.getByText(/p3/i)
    fireEvent.click(prioritySpan)

    await waitFor(() => {
      expect(screen.getByTestId("option-1")).toBeInTheDocument()
    })

    const priority1Button = screen.getByTestId("option-1")
    fireEvent.click(priority1Button)

    expect(mockOnUpdate).toHaveBeenCalledWith({ priority: 1 })
  })

  it("updates project when project is selected from popover", async () => {
    const mockOnUpdate = vi.fn()
    render(<EditableMetadata {...defaultProps} onUpdate={mockOnUpdate} />)

    const projectSpan = screen.getByText(/add project/i)
    fireEvent.click(projectSpan)

    await waitFor(() => {
      expect(screen.getByTestId("option-1")).toBeInTheDocument()
    })

    const workProjectButton = screen.getByTestId("option-1")
    fireEvent.click(workProjectButton)

    expect(mockOnUpdate).toHaveBeenCalledWith({ projectId: "1" })
  })

  it("applies correct CSS classes for different priority levels", () => {
    const { rerender } = render(<EditableMetadata {...defaultProps} priority={1} />)

    let prioritySpan = screen.getByText(/p1/i)
    expect(prioritySpan).toHaveClass("text-red-500")

    rerender(<EditableMetadata {...defaultProps} priority={2} />)
    prioritySpan = screen.getByText(/p2/i)
    expect(prioritySpan).toHaveClass("text-orange-500")

    rerender(<EditableMetadata {...defaultProps} priority={3} />)
    prioritySpan = screen.getByText(/p3/i)
    expect(prioritySpan).toHaveClass("text-blue-500")

    rerender(<EditableMetadata {...defaultProps} priority={4} />)
    prioritySpan = screen.getByText(/add priority/i)
    expect(prioritySpan).toHaveClass("text-muted-foreground")
  })

  it("applies correct CSS classes for different due date states", () => {
    const today = new Date()
    const { rerender } = render(<EditableMetadata {...defaultProps} dueDate={today} />)

    let dueDateSpan = screen.getByText(/today/i)
    expect(dueDateSpan).toHaveClass("text-orange-600")

    const tomorrow = addDays(new Date(), 1)
    rerender(<EditableMetadata {...defaultProps} dueDate={tomorrow} />)

    dueDateSpan = screen.getByText(/tomorrow/i)
    expect(dueDateSpan).toHaveClass("text-muted-foreground")

    const futureDate = addDays(new Date(), 7)
    rerender(<EditableMetadata {...defaultProps} dueDate={futureDate} />)

    dueDateSpan = screen.getByText(new RegExp(format(futureDate, "MMM d"), "i"))
    expect(dueDateSpan).toHaveClass("text-muted-foreground")
  })

  it("handles empty projects array", () => {
    render(<EditableMetadata {...defaultProps} projects={[]} />)

    expect(screen.getByText(/add project/i)).toBeInTheDocument()
  })

  it("handles invalid projectId", () => {
    render(<EditableMetadata {...defaultProps} projectId="invalid" />)

    expect(screen.getByText(/add project/i)).toBeInTheDocument()
  })

  it('shows "No project" option in project popover', async () => {
    render(<EditableMetadata {...defaultProps} />)

    const projectSpan = screen.getByText(/add project/i)
    fireEvent.click(projectSpan)

    await waitFor(() => {
      expect(screen.getByTestId("option-no-project")).toBeInTheDocument()
    })
  })

  it('can remove project by selecting "No project"', async () => {
    const mockOnUpdate = vi.fn()
    render(<EditableMetadata {...defaultProps} projectId="1" onUpdate={mockOnUpdate} />)

    const projectSpan = screen.getByText("Work Project")
    fireEvent.click(projectSpan)

    await waitFor(() => {
      expect(screen.getByTestId("option-no-project")).toBeInTheDocument()
    })

    const noProjectButton = screen.getByTestId("option-no-project")
    fireEvent.click(noProjectButton)

    expect(mockOnUpdate).toHaveBeenCalledWith({ projectId: undefined })
  })
})
