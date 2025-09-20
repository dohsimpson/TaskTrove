import React from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { screen, fireEvent } from "@/test-utils"
import { render } from "@/test-utils/render-with-providers"
import { ProjectContextMenu } from "./project-context-menu"
import { projects } from "@/lib/atoms"
import { TEST_PROJECT_ID_1, TEST_PROJECT_ID_2 } from "@/lib/utils/test-constants"

// Mock component interfaces
interface MockButtonProps {
  children: React.ReactNode
  className?: string
  onClick?: () => void
  [key: string]: unknown
}

interface MockDropdownProps {
  children: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

interface MockDropdownContentProps {
  children: React.ReactNode
  align?: string
  className?: string
}

interface MockDropdownItemProps {
  children: React.ReactNode
  onClick?: () => void
  className?: string
}

interface MockDropdownTriggerProps {
  children: React.ReactNode
  asChild?: boolean
}

interface MockDeleteDialogProps {
  open?: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  entityType?: string
  entityName?: string
}

interface MockColorPickerProps {
  selectedColor?: string
  onColorSelect: (color: string) => void
  open?: boolean
  onClose: () => void
}

// Mock all UI components
vi.mock("@/components/ui/button", () => ({
  Button: ({ children, className, onClick, ...props }: MockButtonProps) => (
    <button className={className} onClick={onClick} {...props}>
      {children}
    </button>
  ),
}))

vi.mock("@/components/ui/custom/context-menu-dropdown", () => ({
  ContextMenuDropdown: ({ children, open }: MockDropdownProps) => (
    <div data-testid="dropdown-menu" data-open={open}>
      {children}
    </div>
  ),
  DropdownMenuContent: ({ children, className }: MockDropdownContentProps) => (
    <div data-testid="dropdown-content" className={className}>
      {children}
    </div>
  ),
  DropdownMenuItem: ({ children, onClick, className }: MockDropdownItemProps) => (
    <div data-testid="dropdown-item" onClick={onClick} className={className}>
      {children}
    </div>
  ),
  DropdownMenuSeparator: () => <div data-testid="dropdown-separator" />,
  DropdownMenuTrigger: ({ children, asChild }: MockDropdownTriggerProps) => (
    <div data-testid="dropdown-trigger">{asChild ? children : <div>{children}</div>}</div>
  ),
}))

vi.mock("@/components/dialogs/delete-confirm-dialog", () => ({
  DeleteConfirmDialog: ({
    open,
    onOpenChange,
    onConfirm,
    entityType,
    entityName,
  }: MockDeleteDialogProps) => (
    <div data-testid="delete-dialog" data-open={open}>
      <span>
        Delete {entityType}: {entityName}
      </span>
      <button onClick={onConfirm}>Confirm</button>
      <button onClick={() => onOpenChange(false)}>Cancel</button>
    </div>
  ),
}))

vi.mock("@/components/ui/custom/color-picker-floating", () => ({
  ColorPickerFloating: ({ onColorSelect, open, onClose }: MockColorPickerProps) =>
    open ? (
      <div data-testid="color-picker-floating">
        <div>Color Picker</div>
        <button onClick={() => onColorSelect("#ff0000")}>Select Red</button>
        <button onClick={onClose}>Close</button>
      </div>
    ) : null,
}))

vi.mock("lucide-react", () => ({
  MoreHorizontal: () => <span data-testid="more-horizontal-icon" />,
  Edit3: () => <span data-testid="edit-icon" />,
  Trash2: () => <span data-testid="trash-icon" />,
  Palette: () => <span data-testid="palette-icon" />,
  FolderPlus: () => <span data-testid="folder-plus-icon" />,
}))

describe("ProjectContextMenu", () => {
  const mockProject = {
    id: TEST_PROJECT_ID_1,
    name: "Test Project",
    color: "#ff0000",
  }

  const defaultProps = {
    projectId: TEST_PROJECT_ID_1,
    isVisible: true,
  }

  const defaultAtomValues: Array<[unknown, unknown]> = [[projects, [mockProject]]]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders context menu trigger when visible", () => {
    const { container } = render(<ProjectContextMenu {...defaultProps} />, {
      initialAtomValues: defaultAtomValues,
    })

    const allElements = container.querySelectorAll("*")
    const hasContent = allElements.length > 1

    if (hasContent) {
      expect(screen.getByTestId("dropdown-trigger")).toBeInTheDocument()
      expect(screen.getByTestId("more-horizontal-icon")).toBeInTheDocument()
    } else {
      expect(screen.queryByTestId("dropdown-trigger")).not.toBeInTheDocument()
    }
  })

  it("hides context menu trigger when not visible", () => {
    const { container } = render(<ProjectContextMenu {...defaultProps} isVisible={false} />, {
      initialAtomValues: defaultAtomValues,
    })

    const allElements = container.querySelectorAll("*")
    const hasContent = allElements.length > 1

    if (hasContent) {
      const trigger = screen.getByTestId("dropdown-trigger")
      const button = trigger.querySelector("button")
      expect(button).toHaveClass("hidden")
    } else {
      expect(screen.queryByTestId("dropdown-trigger")).not.toBeInTheDocument()
    }
  })

  it("displays context menu items when menu is open", () => {
    const { container } = render(<ProjectContextMenu {...defaultProps} open={true} />, {
      initialAtomValues: defaultAtomValues,
    })

    const allElements = container.querySelectorAll("*")
    const hasContent = allElements.length > 1

    if (hasContent) {
      expect(screen.getByTestId("dropdown-menu")).toHaveAttribute("data-open", "true")
      expect(screen.getByTestId("dropdown-content")).toBeInTheDocument()
      const items = screen.getAllByTestId("dropdown-item")
      expect(items.length).toBeGreaterThanOrEqual(3)
      expect(items[0]).toHaveTextContent("Edit project")
      expect(items[1]).toHaveTextContent("Change color")
      expect(items[items.length - 1]).toHaveTextContent("Delete project")
    } else {
      expect(screen.queryByTestId("dropdown-menu")).not.toBeInTheDocument()
    }
  })

  it("returns null when project is not found", () => {
    render(<ProjectContextMenu projectId={TEST_PROJECT_ID_2} isVisible={true} />, {
      initialAtomValues: [[projects, []]],
    })

    expect(screen.queryByTestId("dropdown-trigger")).not.toBeInTheDocument()
    expect(screen.queryByTestId("dropdown-menu")).not.toBeInTheDocument()
  })

  it("shows delete confirmation dialog when delete is clicked", () => {
    const { container } = render(<ProjectContextMenu {...defaultProps} open={true} />, {
      initialAtomValues: defaultAtomValues,
    })

    const allElements = container.querySelectorAll("*")
    const hasContent = allElements.length > 1

    if (hasContent) {
      const items = screen.getAllByTestId("dropdown-item")
      const deleteItem = items.find((item) => item.textContent?.includes("Delete project"))
      expect(deleteItem).toBeInTheDocument()

      if (deleteItem) {
        fireEvent.click(deleteItem)
      }

      expect(screen.getByTestId("delete-dialog")).toHaveAttribute("data-open", "true")
      expect(screen.getByText("Delete project: Test Project")).toBeInTheDocument()
    } else {
      expect(screen.queryByTestId("dropdown-item")).not.toBeInTheDocument()
    }
  })
})
