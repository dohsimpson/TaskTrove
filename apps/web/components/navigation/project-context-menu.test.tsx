import React from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { screen, fireEvent } from "@/test-utils"
import { render } from "@/test-utils/render-with-providers"
import { ProjectContextMenu } from "./project-context-menu"
import {
  TEST_PROJECT_ID_1,
  TEST_PROJECT_ID_2,
  TEST_TASK_ID_1,
  TEST_TASK_ID_2,
} from "@tasktrove/types/test-constants"
import { useAtom, useAtomValue, useSetAtom } from "jotai"
import {
  TaskUpdateSerializationSchema,
  TaskUpdateArraySerializationSchema,
} from "@tasktrove/types/api-requests"

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
  }: MockDeleteDialogProps) => (
    <div data-testid="delete-dialog" data-open={open}>
      <span>
        Delete {entityType}: {entityName}
      </span>
      <button onClick={() => onConfirm(false)} data-testid="confirm-without-resources">
        Confirm without deleting contained resources
      </button>
      <button onClick={() => onConfirm(true)} data-testid="confirm-with-resources">
        Confirm and delete contained resources
      </button>
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

// Mock EntityContextMenu to test the onDelete callback
vi.mock("@/components/ui/custom/entity-context-menu", () => ({
  EntityContextMenu: ({
    onDelete,
    entityName,
  }: {
    onDelete: (deleteContainedResources?: boolean) => void
    entityName: string
  }) => (
    <div data-testid="entity-context-menu">
      <span>Entity: {entityName}</span>
      <button onClick={() => onDelete(false)} data-testid="delete-without-resources">
        Delete without contained resources
      </button>
      <button onClick={() => onDelete(true)} data-testid="delete-with-resources">
        Delete with contained resources
      </button>
    </div>
  ),
}))

// Mock atoms
const mockDeleteProject = vi.fn()
const mockDeleteTasks = vi.fn()
const mockUpdateTasks = vi.fn()

// Note: Atom mocks are now centralized in test-utils/atoms-mocks.ts

vi.mock("jotai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("jotai")>()
  return {
    ...actual,
    useAtom: vi.fn(),
    useAtomValue: vi.fn(),
    useSetAtom: vi.fn(),
    atom: vi.fn((value) => ({
      init: value,
      toString: () => `mockAtom(${JSON.stringify(value)})`,
    })),
  }
})

describe("ProjectContextMenu", () => {
  const mockProject = {
    id: TEST_PROJECT_ID_1,
    name: "Test Project",
    color: "#ff0000",
  }

  const mockTasks = [
    {
      id: TEST_TASK_ID_1,
      title: "Task 1",
      projectId: TEST_PROJECT_ID_1,
    },
    {
      id: TEST_TASK_ID_2,
      title: "Task 2",
      projectId: TEST_PROJECT_ID_1,
    },
  ]

  const defaultProps = {
    projectId: TEST_PROJECT_ID_1,
    isVisible: true,
  }

  beforeEach(() => {
    vi.clearAllMocks()

    // Setup jotai mocks by using mockImplementation to handle different atoms
    // Use mock functions instead of type assertions to avoid ESLint errors
    const mockSetter = vi.fn()

    vi.mocked(useAtom).mockImplementation(() => {
      // Always return the mock project data for any atom to ensure the test works
      const data: unknown = [mockProject]
      // Cast to the expected tuple type (required for this specific Jotai typing)
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      return [data, mockSetter] as [unknown, never]
    })

    vi.mocked(useAtomValue).mockReturnValue(mockTasks)

    vi.mocked(useSetAtom).mockImplementation((atom: unknown) => {
      const atomString = String(atom)
      // Return the appropriate mock function based on the atom string
      if (atomString.includes("deleteProject")) {
        return mockDeleteProject
      }
      if (atomString.includes("deleteTasks") || atomString.includes("deleteTask")) {
        return mockDeleteTasks
      }
      if (atomString.includes("updateTasks") || atomString.includes("updateTask")) {
        return mockUpdateTasks
      }
      // Default case for any other atoms
      return vi.fn()
    })
  })

  it("renders entity context menu", () => {
    render(<ProjectContextMenu {...defaultProps} />)

    expect(screen.getByTestId("entity-context-menu")).toBeInTheDocument()
    expect(screen.getByText("Entity: Test Project")).toBeInTheDocument()
  })

  it("returns null when project is not found", () => {
    // Mock empty projects array by overriding the implementation
    const mockSetter = vi.fn()

    vi.mocked(useAtom).mockImplementation(() => {
      // Return empty array for the projects not found case
      const data: unknown = []
      // Cast to the expected tuple type (required for this specific Jotai typing)
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      return [data, mockSetter] as [unknown, never]
    })

    render(<ProjectContextMenu projectId={TEST_PROJECT_ID_2} isVisible={true} />)

    expect(screen.queryByTestId("entity-context-menu")).not.toBeInTheDocument()
  })

  describe("handleDelete functionality", () => {
    it("deletes tasks and project when deleteContainedResources is true", async () => {
      render(<ProjectContextMenu {...defaultProps} />)

      const deleteWithResourcesButton = screen.getByTestId("delete-with-resources")
      fireEvent.click(deleteWithResourcesButton)

      // Wait for async operations
      await new Promise((resolve) => setTimeout(resolve, 0))

      // Verify that deleteTasks was called with the correct task IDs
      expect(mockDeleteTasks).toHaveBeenCalledWith([TEST_TASK_ID_1, TEST_TASK_ID_2])

      // Verify that updateTasks was NOT called (since we're deleting, not unassigning)
      expect(mockUpdateTasks).not.toHaveBeenCalled()

      // Verify that deleteProject was called with the project ID
      expect(mockDeleteProject).toHaveBeenCalledWith(TEST_PROJECT_ID_1)
    })

    it("unassigns tasks and deletes project when deleteContainedResources is false", async () => {
      render(<ProjectContextMenu {...defaultProps} />)

      const deleteWithoutResourcesButton = screen.getByTestId("delete-without-resources")
      fireEvent.click(deleteWithoutResourcesButton)

      // Wait for async operations
      await new Promise((resolve) => setTimeout(resolve, 0))

      // Verify that updateTasks was called with correct updates to unassign tasks
      expect(mockUpdateTasks).toHaveBeenCalledWith([
        { id: TEST_TASK_ID_1, projectId: null },
        { id: TEST_TASK_ID_2, projectId: null },
      ])

      // Verify that deleteTasks was NOT called (since we're unassigning, not deleting)
      expect(mockDeleteTasks).not.toHaveBeenCalled()

      // Verify that deleteProject was called with the project ID
      expect(mockDeleteProject).toHaveBeenCalledWith(TEST_PROJECT_ID_1)
    })

    it("handles project with no tasks when deleteContainedResources is true", async () => {
      // Mock empty tasks array
      vi.mocked(useAtomValue).mockReturnValue([])

      render(<ProjectContextMenu {...defaultProps} />)

      const deleteWithResourcesButton = screen.getByTestId("delete-with-resources")
      fireEvent.click(deleteWithResourcesButton)

      // Wait for async operations
      await new Promise((resolve) => setTimeout(resolve, 0))

      // Verify that neither deleteTasks nor updateTasks were called (no tasks to process)
      expect(mockDeleteTasks).not.toHaveBeenCalled()
      expect(mockUpdateTasks).not.toHaveBeenCalled()

      // Verify that deleteProject was still called
      expect(mockDeleteProject).toHaveBeenCalledWith(TEST_PROJECT_ID_1)
    })

    it("handles project with no tasks when deleteContainedResources is false", async () => {
      // Mock empty tasks array
      vi.mocked(useAtomValue).mockReturnValue([])

      render(<ProjectContextMenu {...defaultProps} />)

      const deleteWithoutResourcesButton = screen.getByTestId("delete-without-resources")
      fireEvent.click(deleteWithoutResourcesButton)

      // Wait for async operations
      await new Promise((resolve) => setTimeout(resolve, 0))

      // Verify that neither deleteTasks nor updateTasks were called (no tasks to process)
      expect(mockDeleteTasks).not.toHaveBeenCalled()
      expect(mockUpdateTasks).not.toHaveBeenCalled()

      // Verify that deleteProject was still called
      expect(mockDeleteProject).toHaveBeenCalledWith(TEST_PROJECT_ID_1)
    })
  })

  describe("Serialization Schema Tests", () => {
    // Direct tests for the schemas to catch serialization issues like the one reported
    it("validates TaskSerializationSchema accepts null projectId", () => {
      // This test directly validates the fix for the reported error:
      // "Failed to serialize updated tasks data: expected string, received null"
      const updateWithNullProjectId = {
        id: TEST_TASK_ID_1,
        title: "Test Task",
        completed: false,
        priority: 1,
        labels: [],
        subtasks: [],
        comments: [],
        createdAt: new Date(),
        projectId: null, // This should be valid after our fix
        recurringMode: "dueDate",
      }

      const result = TaskUpdateSerializationSchema.safeParse(updateWithNullProjectId)
      expect(result.success).toBe(true)

      if (result.success) {
        expect(result.data.projectId).toBe(null)
      }
    })

    it("validates TaskArraySerializationSchema accepts array with null projectId", () => {
      // Test the array serialization schema used by the mutation atom
      // This is the exact path that was failing when deleting projects without contained resources
      const updatesWithNullProjectId = [
        {
          id: TEST_TASK_ID_1,
          title: "Test Task 1",
          completed: false,
          priority: 1,
          labels: [],
          subtasks: [],
          comments: [],
          createdAt: new Date(),
          projectId: null,
          recurringMode: "dueDate",
        },
        {
          id: TEST_TASK_ID_2,
          title: "Test Task 2",
          completed: false,
          priority: 2,
          labels: [],
          subtasks: [],
          comments: [],
          createdAt: new Date(),
          projectId: null,
          recurringMode: "dueDate",
        },
      ]

      const result = TaskUpdateArraySerializationSchema.safeParse(updatesWithNullProjectId)
      expect(result.success).toBe(true)

      if (result.success && result.data) {
        expect(result.data[0]?.projectId).toBe(null)
        expect(result.data[1]?.projectId).toBe(null)
      }
    })
  })
})
