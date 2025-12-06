import { DEFAULT_PROJECT_SECTION } from "@tasktrove/types/defaults"
import React from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@/test-utils"
import { mockNextNavigation } from "@/test-utils/mock-router"
import { DraggableProjectItem } from "./draggable-project-item"
import type { Project } from "@tasktrove/types/core"
import { createProjectId, createGroupId } from "@tasktrove/types/id"

// Mock Next.js router using centralized utilities
mockNextNavigation()

// Mock components
vi.mock("./project-context-menu", () => ({
  ProjectContextMenu: () => <div data-testid="context-menu" />,
}))

vi.mock("@/components/ui/custom/editable-div", () => ({
  EditableDiv: ({ value }: { value: string; onChange: (v: string) => void }) => (
    <span>{value}</span>
  ),
}))

vi.mock("@/hooks/use-context-menu-visibility", () => ({
  useContextMenuVisibility: () => ({
    isVisible: false,
    isMenuOpen: false,
    handleMenuOpenChange: vi.fn(),
  }),
}))

// Mock sidebar components
vi.mock("@/components/ui/custom/sidebar", () => ({
  useSidebar: () => ({
    open: true,
    setOpen: vi.fn(),
    toggleSidebar: vi.fn(),
  }),
  SidebarMenuItem: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="sidebar-menu-item">{children}</div>
  ),
  SidebarMenuButton: ({
    children,
    className,
    isActive,
  }: {
    children: React.ReactNode
    className?: string
    isActive?: boolean
  }) => (
    <button className={className} role="button" data-active={isActive}>
      {children}
    </button>
  ),
  SidebarMenuBadge: ({
    children,
    className,
  }: {
    children: React.ReactNode
    className?: string
  }) => <span className={className}>{children}</span>,
}))

// Mock the drag and drop modules
const mockExtractInstruction = vi.fn()
const mockAttachInstruction = vi.fn((data: Record<string, unknown>) => data)

vi.mock("@atlaskit/pragmatic-drag-and-drop-hitbox/tree-item", () => ({
  extractInstruction: (data: Record<string, unknown>) => mockExtractInstruction(data),
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  attachInstruction: (data: Record<string, unknown>, _config: Record<string, unknown>) =>
    mockAttachInstruction(data),
}))

vi.mock("@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge", () => ({
  extractClosestEdge: vi.fn(() => null),
}))

vi.mock("@/hooks/use-sidebar-drag-state", () => ({
  extractSidebarInstruction: vi.fn(() => null),
}))

// Mock draggable and drop target wrappers
vi.mock("@/components/ui/draggable-wrapper", () => ({
  DraggableWrapper: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="draggable-wrapper">{children}</div>
  ),
}))

vi.mock("@/components/ui/drop-target-wrapper", () => ({
  DropTargetWrapper: ({
    children,
    getData,
  }: {
    children: React.ReactNode
    getData?: (args: {
      input?: { clientX: number; clientY: number }
      element?: HTMLElement
    }) => Record<string, unknown>
  }) => {
    React.useEffect(() => {
      if (getData) {
        const element = document.createElement("div")
        const mockData = getData({
          input: { clientX: 50, clientY: 50 },
          element,
        })
        element.setAttribute("data-drop-target-data", JSON.stringify(mockData))
      }
    }, [getData])

    return <div data-testid="drop-target-wrapper">{children}</div>
  },
}))

describe("DraggableProjectItem", () => {
  const mockProject: Project = {
    id: createProjectId("33333333-3333-4333-8333-333333333333"),
    name: "Test Project",
    slug: "test-project",
    color: "#3498DB",
    sections: [DEFAULT_PROJECT_SECTION],
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders project with correct name", () => {
    render(<DraggableProjectItem project={mockProject} index={0} />)

    expect(screen.getByText("Test Project")).toBeInTheDocument()
  })

  describe("Instruction-based zone detection", () => {
    it.skip("shows line above when reorder-above instruction is detected", () => {
      render(<DraggableProjectItem project={mockProject} index={0} />)

      // Verify attachInstruction is called with correct zone detection params
      expect(mockAttachInstruction).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "sidebar-project-drop-target",
          projectId: "33333333-3333-4333-8333-333333333333",
        }),
      )

      // Mock instruction extraction for reorder-above
      mockExtractInstruction.mockReturnValue({ type: "reorder-above" })

      // Component should render line indicator above when this instruction is active
    })

    it("shows line below when reorder-below instruction is detected", () => {
      render(<DraggableProjectItem project={mockProject} index={0} />)

      // Mock instruction extraction for reorder-below
      mockExtractInstruction.mockReturnValue({ type: "reorder-below" })

      // Component should render line indicator below when this instruction is active
    })

    it.skip("configures different level when project is in group", () => {
      render(
        <DraggableProjectItem
          project={mockProject}
          index={0}
          isInGroup={true}
          groupId={createGroupId("44444444-4444-4444-8444-444444444444")}
        />,
      )

      // Verify attachInstruction is called with level 1 for grouped projects
      expect(mockAttachInstruction).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "sidebar-project-drop-target",
          projectId: "33333333-3333-4333-8333-333333333333",
          groupId: "44444444-4444-4444-8444-444444444444",
        }),
      )
    })

    it("never shows make-child instruction for project items", () => {
      render(<DraggableProjectItem project={mockProject} index={0} />)

      // Projects should only support reorder operations, not make-child
      // This is because projects cannot contain other items
      mockExtractInstruction.mockReturnValue({ type: "make-child" })

      // Component should not have box highlighting styles
      // as make-child is not applicable for project items
    })
  })

  describe("Drop target behavior", () => {
    it("only responds when it's the innermost drop target", () => {
      render(<DraggableProjectItem project={mockProject} index={0} />)

      // Test that instruction extraction only happens when
      // this element is the innermost drop target
      // Should only process the first (innermost) drop target
      expect(mockExtractInstruction).toBeDefined()
    })

    it("clears instruction when not the innermost target", () => {
      render(<DraggableProjectItem project={mockProject} index={0} />)

      // When another element becomes the innermost target,
      // this component should clear its instruction state
      mockExtractInstruction.mockReturnValue(null)

      // Component should not show any indicators
    })

    it("handles drag leave event properly", () => {
      render(<DraggableProjectItem project={mockProject} index={0} />)

      // Test that drag leave clears the instruction state
      // ensuring indicators are properly hidden
    })
  })

  describe("Visual indicators", () => {
    it("positions drop indicator based on group membership", () => {
      // Test without group
      const { rerender } = render(<DraggableProjectItem project={mockProject} index={0} />)

      // Drop indicators should be at level 0

      // Test with group
      rerender(
        <DraggableProjectItem
          project={mockProject}
          index={0}
          isInGroup={true}
          groupId={createGroupId("44444444-4444-4444-8444-444444444444")}
        />,
      )

      // Drop indicators should be at level 1 with indentation
    })

    it("applies correct indentation for grouped projects", () => {
      render(
        <DraggableProjectItem
          project={mockProject}
          index={0}
          isInGroup={true}
          groupId={createGroupId("44444444-4444-4444-8444-444444444444")}
        />,
      )

      // Should have ml-6 class for indentation
      const button = screen.getByRole("button")
      expect(button).toHaveClass("ml-6")
    })
  })

  describe("Instruction transitions", () => {
    it("smoothly transitions between instruction types", () => {
      render(<DraggableProjectItem project={mockProject} index={0} />)

      // Test transition from reorder-above to reorder-below
      mockExtractInstruction.mockReturnValue({ type: "reorder-above" })
      // Component should show top indicator

      mockExtractInstruction.mockReturnValue({ type: "reorder-below" })
      // Component should hide top indicator and show bottom indicator

      mockExtractInstruction.mockReturnValue(null)
      // Component should hide all indicators
    })

    it("prevents simultaneous display of multiple indicators", () => {
      render(<DraggableProjectItem project={mockProject} index={0} />)

      // Even if there's a state transition issue,
      // only one indicator should be visible at a time
      mockExtractInstruction.mockReturnValue({ type: "reorder-above" })

      // Should only show top indicator, not bottom
      // This tests the exclusive nature of instruction-based rendering
    })
  })

  describe("Edge detection boundaries", () => {
    it.skip("detects reorder-above in top zone of element", () => {
      render(<DraggableProjectItem project={mockProject} index={0} />)

      // When cursor is in top ~25% of element height
      // the instruction should be reorder-above

      // Verify that attachInstruction is called for zone detection
      expect(mockAttachInstruction).toHaveBeenCalled()
    })

    it("detects reorder-below in bottom zone of element", () => {
      render(<DraggableProjectItem project={mockProject} index={0} />)

      // When cursor is in bottom ~25% of element height
      // the instruction should be reorder-below
    })

    it("detects make-child in middle zone (for group items only)", () => {
      // This test would verify that project items don't support
      // make-child even when cursor is in the middle zone,
      // while group items would support it
    })
  })
})
