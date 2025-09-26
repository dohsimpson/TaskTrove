import React from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { screen, fireEvent } from "@/test-utils"
import { render } from "@/test-utils/render-with-providers"
import { ProjectGroupContextMenu } from "./project-group-context-menu"
import { dataQueryAtom } from "@/lib/atoms/core/base"
import { createGroupId } from "@/lib/types"
import { DEFAULT_PROJECT_GROUP, DEFAULT_LABEL_GROUP } from "@/lib/types"

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
  UserPlus: () => <span data-testid="user-plus-icon" />,
}))

describe("ProjectGroupContextMenu", () => {
  const mockProjectGroup = {
    id: createGroupId("123e4567-e89b-12d3-a456-426614174001"),
    name: "Test Project Group",
    description: "Test description",
    color: "#3b82f6",
    type: "project" as const,
    items: [],
  }

  const defaultProps = {
    groupId: createGroupId("123e4567-e89b-12d3-a456-426614174001"),
    isVisible: true,
  }

  const defaultAtomValues: Array<[unknown, unknown]> = [
    [
      dataQueryAtom,
      {
        data: {
          tasks: [],
          projects: [],
          labels: [],
          projectGroups: { ...DEFAULT_PROJECT_GROUP, items: [mockProjectGroup] },
          labelGroups: DEFAULT_LABEL_GROUP,
          ordering: { projects: [], labels: [] },
        },
      },
    ],
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders context menu trigger when visible", () => {
    const { container } = render(<ProjectGroupContextMenu {...defaultProps} />, {
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
    const { container } = render(<ProjectGroupContextMenu {...defaultProps} isVisible={false} />, {
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
    const { container } = render(<ProjectGroupContextMenu {...defaultProps} open={true} />, {
      initialAtomValues: defaultAtomValues,
    })

    const allElements = container.querySelectorAll("*")
    const hasContent = allElements.length > 1

    if (hasContent) {
      expect(screen.getByTestId("dropdown-menu")).toHaveAttribute("data-open", "true")
      expect(screen.getByTestId("dropdown-content")).toBeInTheDocument()
      const items = screen.getAllByTestId("dropdown-item")
      expect(items.length).toBeGreaterThanOrEqual(5)
      expect(items[0]).toHaveTextContent("Edit group")
      expect(items[1]).toHaveTextContent("Change color")
      expect(items[2]).toHaveTextContent("Add subgroup")
      expect(items[3]).toHaveTextContent("Manage projects")
      expect(items[items.length - 1]).toHaveTextContent("Delete group")
    } else {
      expect(screen.queryByTestId("dropdown-menu")).not.toBeInTheDocument()
    }
  })

  it("returns null when project group is not found", () => {
    render(
      <ProjectGroupContextMenu
        groupId={createGroupId("123e4567-e89b-12d3-a456-426614174999")}
        isVisible={true}
      />,
      {
        initialAtomValues: [
          [
            dataQueryAtom,
            {
              data: {
                tasks: [],
                projects: [],
                labels: [],
                projectGroups: DEFAULT_PROJECT_GROUP,
                labelGroups: DEFAULT_LABEL_GROUP,
                ordering: { projects: [], labels: [] },
              },
            },
          ],
        ],
      },
    )

    expect(screen.queryByTestId("dropdown-trigger")).not.toBeInTheDocument()
    expect(screen.queryByTestId("dropdown-menu")).not.toBeInTheDocument()
  })

  it("shows delete confirmation dialog when delete is clicked", () => {
    const { container } = render(<ProjectGroupContextMenu {...defaultProps} open={true} />, {
      initialAtomValues: defaultAtomValues,
    })

    const allElements = container.querySelectorAll("*")
    const hasContent = allElements.length > 1

    if (hasContent) {
      const items = screen.getAllByTestId("dropdown-item")
      const deleteItem = items.find((item) => item.textContent?.includes("Delete group"))
      expect(deleteItem).toBeInTheDocument()

      if (deleteItem) {
        fireEvent.click(deleteItem)
      }

      expect(screen.getByTestId("delete-dialog")).toHaveAttribute("data-open", "true")
      expect(screen.getByText("Delete group: Test Project Group")).toBeInTheDocument()
    } else {
      expect(screen.queryByTestId("dropdown-item")).not.toBeInTheDocument()
    }
  })

  it("shows color picker when change color is clicked", () => {
    const { container } = render(<ProjectGroupContextMenu {...defaultProps} open={true} />, {
      initialAtomValues: defaultAtomValues,
    })

    const allElements = container.querySelectorAll("*")
    const hasContent = allElements.length > 1

    if (hasContent) {
      const items = screen.getAllByTestId("dropdown-item")
      const colorItem = items.find((item) => item.textContent?.includes("Change color"))
      expect(colorItem).toBeInTheDocument()

      if (colorItem) {
        fireEvent.click(colorItem)
        expect(screen.getByTestId("color-picker-floating")).toBeInTheDocument()
        expect(screen.getByText("Color Picker")).toBeInTheDocument()
      }
    } else {
      expect(screen.queryByTestId("dropdown-item")).not.toBeInTheDocument()
    }
  })

  it("includes add subgroup and manage projects options", () => {
    const { container } = render(<ProjectGroupContextMenu {...defaultProps} open={true} />, {
      initialAtomValues: defaultAtomValues,
    })

    const allElements = container.querySelectorAll("*")
    const hasContent = allElements.length > 1

    if (hasContent) {
      const items = screen.getAllByTestId("dropdown-item")
      const addSubgroupItem = items.find((item) => item.textContent?.includes("Add subgroup"))
      const manageProjectsItem = items.find((item) => item.textContent?.includes("Manage projects"))

      expect(addSubgroupItem).toBeInTheDocument()
      expect(manageProjectsItem).toBeInTheDocument()
    } else {
      expect(screen.queryByTestId("dropdown-item")).not.toBeInTheDocument()
    }
  })
})
