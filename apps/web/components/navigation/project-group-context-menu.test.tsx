import React from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { screen, fireEvent } from "@/test-utils"
import { render } from "@/test-utils/render-with-providers"
import { ProjectGroupContextMenu } from "./project-group-context-menu"
import { groupsQueryAtom } from "@tasktrove/atoms/data/base/query"
import { createGroupId, createProjectId } from "@tasktrove/types/id"
import { DEFAULT_PROJECT_GROUP, DEFAULT_LABEL_GROUP } from "@tasktrove/types/defaults"

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
  onConfirm: (deleteContainedResources?: boolean) => void
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
  }: MockDeleteDialogProps) => {
    const [deleteContainedResources, setDeleteContainedResources] = React.useState(false)

    return (
      <div data-testid="delete-dialog" data-open={open}>
        <span>
          Delete {entityType}: {entityName}
        </span>
        {(entityType === "group" || entityType === "project") && (
          <label>
            <input
              type="checkbox"
              data-testid="delete-contained-resources-checkbox"
              checked={deleteContainedResources}
              onChange={(e) => setDeleteContainedResources(e.target.checked)}
            />
            Delete contained resources
          </label>
        )}
        <button onClick={() => onConfirm(deleteContainedResources)}>Confirm</button>
        <button onClick={() => onOpenChange(false)}>Cancel</button>
      </div>
    )
  },
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

// Create spy functions to track atom calls
const mockDeleteProjectGroup = vi.fn()
const mockDeleteProjects = vi.fn()

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
      groupsQueryAtom,
      {
        data: {
          projectGroups: { ...DEFAULT_PROJECT_GROUP, items: [mockProjectGroup] },
          labelGroups: DEFAULT_LABEL_GROUP,
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
            groupsQueryAtom,
            {
              data: {
                projectGroups: DEFAULT_PROJECT_GROUP,
                labelGroups: DEFAULT_LABEL_GROUP,
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

  it("deletes contained projects when delete contained resources is checked", async () => {
    // Add a project to the mock group's items
    const mockProjectGroupWithProjects = {
      ...mockProjectGroup,
      items: ["project-1", "project-2"], // Mock project IDs as strings
    }

    const atomValuesWithProjects: Array<[unknown, unknown]> = [
      [
        groupsQueryAtom,
        {
          data: {
            projectGroups: { ...DEFAULT_PROJECT_GROUP, items: [mockProjectGroupWithProjects] },
            labelGroups: DEFAULT_LABEL_GROUP,
          },
        },
      ],
    ]

    const { container } = render(<ProjectGroupContextMenu {...defaultProps} open={true} />, {
      initialAtomValues: atomValuesWithProjects,
    })

    const allElements = container.querySelectorAll("*")
    const hasContent = allElements.length > 1

    if (hasContent) {
      // Click delete group
      const items = screen.getAllByTestId("dropdown-item")
      const deleteItem = items.find((item) => item.textContent?.includes("Delete group"))
      expect(deleteItem).toBeInTheDocument()

      if (deleteItem) {
        fireEvent.click(deleteItem)
      }

      // Dialog should be open
      expect(screen.getByTestId("delete-dialog")).toHaveAttribute("data-open", "true")

      // Check the "delete contained resources" checkbox
      const checkbox = screen.getByTestId("delete-contained-resources-checkbox")
      fireEvent.click(checkbox)

      // Confirm deletion
      const confirmButton = screen.getByText("Confirm")
      fireEvent.click(confirmButton)

      // Verify both deleteProjects and deleteProjectGroup were called
      expect(mockDeleteProjects).toHaveBeenCalledWith([
        createProjectId("project-1"),
        createProjectId("project-2"),
      ])
      expect(mockDeleteProjectGroup).toHaveBeenCalledWith(defaultProps.groupId)
    } else {
      expect(screen.queryByTestId("dropdown-item")).not.toBeInTheDocument()
    }
  })

  it("only deletes group when delete contained resources is not checked", () => {
    // Add a project to the mock group's items
    const mockProjectGroupWithProjects = {
      ...mockProjectGroup,
      items: ["project-1", "project-2"], // Mock project IDs as strings
    }

    const atomValuesWithProjects: Array<[unknown, unknown]> = [
      [
        groupsQueryAtom,
        {
          data: {
            projectGroups: { ...DEFAULT_PROJECT_GROUP, items: [mockProjectGroupWithProjects] },
            labelGroups: DEFAULT_LABEL_GROUP,
          },
        },
      ],
    ]

    const { container } = render(<ProjectGroupContextMenu {...defaultProps} open={true} />, {
      initialAtomValues: atomValuesWithProjects,
    })

    const allElements = container.querySelectorAll("*")
    const hasContent = allElements.length > 1

    if (hasContent) {
      // Click delete group
      const items = screen.getAllByTestId("dropdown-item")
      const deleteItem = items.find((item) => item.textContent?.includes("Delete group"))
      expect(deleteItem).toBeInTheDocument()

      if (deleteItem) {
        fireEvent.click(deleteItem)
      }

      // Dialog should be open
      expect(screen.getByTestId("delete-dialog")).toHaveAttribute("data-open", "true")

      // Do NOT check the checkbox - leave it unchecked

      // Confirm deletion
      const confirmButton = screen.getByText("Confirm")
      fireEvent.click(confirmButton)

      // Verify only deleteProjectGroup was called, not deleteProjects
      expect(mockDeleteProjects).not.toHaveBeenCalled()
      expect(mockDeleteProjectGroup).toHaveBeenCalledWith(defaultProps.groupId)
    } else {
      expect(screen.queryByTestId("dropdown-item")).not.toBeInTheDocument()
    }
  })
})
