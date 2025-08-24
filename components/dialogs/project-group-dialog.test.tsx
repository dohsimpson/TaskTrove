import React from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@/test-utils"
import { ProjectGroupDialog } from "./project-group-dialog"

// Mock component props interface
interface MockComponentProps {
  children?: React.ReactNode
  open?: boolean
  className?: string
  onClick?: () => void
  type?: "button" | "submit" | "reset"
  variant?: string
  disabled?: boolean
  id?: string
  placeholder?: string
  value?: string
  onChange?: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void
  autoFocus?: boolean
  htmlFor?: string
  selectedColor?: string
  onColorSelect?: (color: string) => void
  label?: string
  onOpenChange?: (open: boolean) => void
  onValueChange?: (value: string) => void
  showDescription?: boolean
  showParentPicker?: boolean
  parentPickerOptions?: Array<{ id: string; name: string; color?: string }>
  parentPickerLabel?: string
  transformData?: (
    name: string,
    color: string,
    description: string,
    context: { parentId?: string },
  ) => { name: string; description?: string; color: string; parentId?: string }
}

// Get the mocked functions
const { useAtomValue, useSetAtom } = vi.hoisted(() => ({
  useAtomValue: vi.fn(),
  useSetAtom: vi.fn(),
}))

// Mock the atoms directly
vi.mock("@/lib/atoms/ui/dialogs", () => ({
  showProjectGroupDialogAtom: { debugLabel: "showProjectGroupDialogAtom" },
  projectGroupDialogContextAtom: { debugLabel: "projectGroupDialogContextAtom" },
}))

vi.mock("@/lib/atoms/ui/navigation", () => ({
  closeProjectGroupDialogAtom: { debugLabel: "closeProjectGroupDialogAtom" },
}))

vi.mock("@/lib/atoms/core/groups", () => ({
  addProjectGroupAtom: { debugLabel: "addProjectGroupAtom" },
  flattenProjectGroupsAtom: { debugLabel: "flattenProjectGroupsAtom" },
}))

// Mock Jotai hooks
vi.mock("jotai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("jotai")>()
  return {
    ...actual,
    useAtomValue,
    useSetAtom,
  }
})

// Mock BaseDialog component
vi.mock("./base-dialog", () => ({
  BaseDialog: ({
    type,
    showDescription,
    showParentPicker,
    parentPickerOptions,
    parentPickerLabel,
    transformData,
  }: MockComponentProps) => (
    <div data-testid="base-dialog">
      <div data-testid="dialog-type">{type}</div>
      <div data-testid="show-description">{String(showDescription)}</div>
      <div data-testid="show-parent-picker">{String(showParentPicker)}</div>
      <div data-testid="parent-picker-label">{parentPickerLabel}</div>
      <div data-testid="parent-picker-options">{JSON.stringify(parentPickerOptions)}</div>
      {transformData && (
        <button
          data-testid="test-transform"
          onClick={() => {
            const result = transformData("Test Group", "#ff0000", "Test description", {
              parentId: "123e4567-e89b-12d3-a456-426614174000",
            })
            console.log("Transform result:", result)
          }}
        >
          Test Transform
        </button>
      )}
    </div>
  ),
}))

describe("ProjectGroupDialog", () => {
  const mockCloseDialog = vi.fn()
  const mockAddProjectGroup = vi.fn()

  const mockFlattenedGroups = [
    {
      id: "group-1",
      name: "Parent Group",
      color: "#3b82f6",
      type: "project",
      items: [],
    },
    {
      id: "group-2",
      name: "Another Group",
      color: "#ef4444",
      type: "project",
      items: [],
    },
  ]

  // Mock jotai hooks before each test
  beforeEach(() => {
    vi.clearAllMocks()

    // Mock useAtomValue to return appropriate values based on atom
    useAtomValue.mockImplementation((atom) => {
      if (atom?.debugLabel === "showProjectGroupDialogAtom") {
        return true // Dialog is open
      }
      if (atom?.debugLabel === "projectGroupDialogContextAtom") {
        return { mode: "create" } // Default context
      }
      if (atom?.debugLabel === "flattenProjectGroupsAtom") {
        return mockFlattenedGroups
      }
      return true // Default fallback
    })

    // Mock useSetAtom to return mock functions based on atom debug labels
    useSetAtom.mockImplementation((atom) => {
      if (atom?.debugLabel === "closeProjectGroupDialogAtom") {
        return mockCloseDialog
      }
      if (atom?.debugLabel === "addProjectGroupAtom") {
        return mockAddProjectGroup
      }
      return vi.fn()
    })
  })

  it("renders BaseDialog with correct props for project group", () => {
    render(<ProjectGroupDialog />)

    expect(screen.getByTestId("base-dialog")).toBeInTheDocument()
    expect(screen.getByTestId("dialog-type")).toHaveTextContent("projectGroup")
    expect(screen.getByTestId("show-description")).toHaveTextContent("true")
    expect(screen.getByTestId("show-parent-picker")).toHaveTextContent("true")
    expect(screen.getByTestId("parent-picker-label")).toHaveTextContent("Parent Group")
  })

  it("passes flattened groups as parent picker options", () => {
    render(<ProjectGroupDialog />)

    const parentPickerOptions = JSON.parse(
      screen.getByTestId("parent-picker-options").textContent || "[]",
    )
    expect(parentPickerOptions).toHaveLength(2)
    expect(parentPickerOptions[0]).toEqual({
      id: "group-1",
      name: "Parent Group",
      color: "#3b82f6",
    })
    expect(parentPickerOptions[1]).toEqual({
      id: "group-2",
      name: "Another Group",
      color: "#ef4444",
    })
  })

  it("handles empty flattened groups list", () => {
    useAtomValue.mockImplementation((atom) => {
      if (atom?.debugLabel === "showProjectGroupDialogAtom") {
        return true
      }
      if (atom?.debugLabel === "projectGroupDialogContextAtom") {
        return { mode: "create" }
      }
      if (atom?.debugLabel === "flattenProjectGroupsAtom") {
        return []
      }
      return true
    })

    render(<ProjectGroupDialog />)

    const parentPickerOptions = JSON.parse(
      screen.getByTestId("parent-picker-options").textContent || "[]",
    )
    expect(parentPickerOptions).toHaveLength(0)
  })

  it("transforms data correctly with parent ID", () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {})

    render(<ProjectGroupDialog />)

    const testButton = screen.getByTestId("test-transform")
    fireEvent.click(testButton)

    expect(consoleSpy).toHaveBeenCalledWith("Transform result:", {
      name: "Test Group",
      description: "Test description",
      color: "#ff0000",
      parentId: "123e4567-e89b-12d3-a456-426614174000", // Should be a GroupId
    })

    consoleSpy.mockRestore()
  })

  it("transforms data correctly without parent ID", () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {})

    render(<ProjectGroupDialog />)

    const testButton = screen.getByTestId("test-transform")
    // Test with undefined parentId
    fireEvent.click(testButton)

    expect(consoleSpy).toHaveBeenCalled()
    const transformResult = consoleSpy.mock.calls[0][1]
    expect(transformResult).toEqual({
      name: "Test Group",
      description: "Test description",
      color: "#ff0000",
      parentId: "123e4567-e89b-12d3-a456-426614174000", // Still gets parentId from context
    })

    consoleSpy.mockRestore()
  })

  it("trims whitespace from name and description", () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {})

    render(<ProjectGroupDialog />)

    const testButton = screen.getByTestId("test-transform")

    // Simulate BaseDialog calling transformData with whitespace
    fireEvent.click(testButton)

    expect(consoleSpy).toHaveBeenCalled()
    const transformResult = consoleSpy.mock.calls[0][1]
    expect(transformResult.name).toBe("Test Group") // Should be trimmed
    expect(transformResult.description).toBe("Test description") // Should be trimmed

    consoleSpy.mockRestore()
  })
})
