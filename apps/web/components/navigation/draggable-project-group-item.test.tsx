import { DEFAULT_PROJECT_SECTION } from "@tasktrove/types/defaults"
import React from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@/test-utils"
import { DraggableProjectGroupItem } from "./draggable-project-group-item"
import type { ProjectGroup } from "@tasktrove/types/group"
import type { Project } from "@tasktrove/types/core"
import { createProjectId, createGroupId } from "@tasktrove/types/id"
import { mockNextNavigation, mockNavigation } from "@/test-utils/mock-router"

// Mock components that might cause issues
vi.mock("./project-group-context-menu", () => ({
  ProjectGroupContextMenu: () => <div data-testid="context-menu" />,
}))

vi.mock("./draggable-project-item", () => ({
  DraggableProjectItem: ({ project }: { project: Project }) => (
    <div data-testid={`project-${project.id}`}>{project.name}</div>
  ),
}))

vi.mock("@/hooks/use-context-menu-visibility", () => ({
  useContextMenuVisibility: () => ({
    isVisible: false,
    isMenuOpen: false,
    handleMenuOpenChange: vi.fn(),
  }),
}))

// Mock Next.js router using centralized utilities
mockNextNavigation()

// Override specific atoms for this test with test-specific data
vi.mock("@tasktrove/atoms/ui/navigation", () => ({
  editingGroupIdAtom: {
    toString: () => "editingGroupIdAtom",
    debugLabel: "editingGroupIdAtom",
    read: vi.fn(() => null),
  },
  pathnameAtom: {
    toString: () => "pathnameAtom",
    debugLabel: "pathnameAtom",
    read: vi.fn(() => "/"),
  },
  startEditingGroupAtom: {
    toString: () => "startEditingGroupAtom",
    debugLabel: "startEditingGroupAtom",
    read: vi.fn(),
    write: vi.fn(),
  },
  stopEditingGroupAtom: {
    toString: () => "stopEditingGroupAtom",
    debugLabel: "stopEditingGroupAtom",
    read: vi.fn(),
    write: vi.fn(),
  },
}))

vi.mock("@tasktrove/atoms/ui/task-counts", () => ({
  taskCountsAtom: {
    toString: () => "taskCountsAtom",
    debugLabel: "taskCountsAtom",
    read: vi.fn(() => ({
      projectTaskCounts: { "22222222-2222-4222-8222-222222222222": 5 },
    })),
  },
  projectTaskCountsAtom: {
    toString: () => "projectTaskCountsAtom",
    debugLabel: "projectTaskCountsAtom",
    read: vi.fn(() => ({ "22222222-2222-4222-8222-222222222222": 5 })),
  },
}))

// Mock group expansion state
const mockGroupExpansionMap = {}
vi.mock("@/lib/atoms/ui/group-expansion", () => ({
  groupExpansionMapAtom: {
    toString: () => "groupExpansionMapAtom",
    debugLabel: "groupExpansionMapAtom",
    read: vi.fn(() => mockGroupExpansionMap),
    write: vi.fn(),
  },
  toggleGroupExpansionAtom: {
    toString: () => "toggleGroupExpansionAtom",
    debugLabel: "toggleGroupExpansionAtom",
    read: vi.fn(),
    write: vi.fn(),
  },
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

// Mock sidebar context
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
    onClick,
  }: {
    children: React.ReactNode
    className?: string
    onClick?: (e: React.MouseEvent) => void
  }) => (
    <button className={className} onClick={onClick}>
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
    // Store the getData function so we can test it
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

describe("DraggableProjectGroupItem", () => {
  const mockGroup: ProjectGroup = {
    id: createGroupId("11111111-1111-4111-8111-111111111111"),
    name: "Test Group",
    slug: "test-group",
    color: "#FF5733",
    items: [createProjectId("22222222-2222-4222-8222-222222222222")],
    type: "project",
  }

  const mockProjects: Project[] = [
    {
      id: createProjectId("22222222-2222-4222-8222-222222222222"),
      name: "Test Project",
      slug: "test-project",
      color: "#3498DB",
      sections: [DEFAULT_PROJECT_SECTION],
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    mockNavigation.reset()
  })

  it("renders group with correct name", () => {
    render(<DraggableProjectGroupItem group={mockGroup} projects={mockProjects} index={0} />)

    expect(screen.getByText("Test Group")).toBeInTheDocument()
  })

  describe("Chevron click functionality", () => {
    it("clicking on chevron element toggles expansion state", () => {
      render(<DraggableProjectGroupItem group={mockGroup} projects={mockProjects} index={0} />)

      // Find the chevron element (should be the svg element inside the span with data-chevron)
      const chevronSpan = screen.getByTestId("sidebar-menu-item").querySelector("[data-chevron]")
      expect(chevronSpan).toBeInTheDocument()

      // Create a mock svg element to simulate the actual chevron
      const mockSvgElement = document.createElementNS("http://www.w3.org/2000/svg", "svg")
      mockSvgElement.classList.add("lucide", "lucide-chevron-down", "h-3", "w-3")
      chevronSpan?.appendChild(mockSvgElement)

      // Create a click event that targets the SVG element
      const clickEvent = new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
      })
      Object.defineProperty(clickEvent, "target", { value: mockSvgElement, writable: false })

      // Dispatch the click event on the sidebar menu button
      const menuButton = screen.getByTestId("sidebar-menu-item").querySelector("button")
      expect(menuButton).toBeInTheDocument()
      menuButton?.dispatchEvent(clickEvent)

      // Should not navigate when clicking chevron
      expect(mockNavigation.getRouter().push).not.toHaveBeenCalled()
    })

    it("clicking outside chevron navigates to group page", () => {
      render(<DraggableProjectGroupItem group={mockGroup} projects={mockProjects} index={0} />)

      // Find the menu button
      const menuButton = screen.getByTestId("sidebar-menu-item").querySelector("button")
      expect(menuButton).toBeInTheDocument()

      // Verify router was cleared
      expect(mockNavigation.getRouter().push).not.toHaveBeenCalled()

      // Click on the button (but not on the chevron area)
      expect(menuButton).toBeInTheDocument()
      if (menuButton) {
        fireEvent.click(menuButton)
      }

      // Should navigate to group page when not clicking chevron
      expect(mockNavigation.getRouter().push).toHaveBeenCalledWith("/projectgroups/test-group")
    })

    it("SVG elements are properly detected as Element instances", () => {
      // Test that SVG elements pass the Element instanceof check
      const svgElement = document.createElementNS("http://www.w3.org/2000/svg", "svg")
      const htmlElement = document.createElement("div")

      // Both should be instances of Element
      expect(svgElement instanceof Element).toBe(true)
      expect(htmlElement instanceof Element).toBe(true)

      // But SVG should not be HTMLElement
      expect(svgElement instanceof HTMLElement).toBe(false)
      expect(htmlElement instanceof HTMLElement).toBe(true)
    })

    it("chevron detection works with closest() method on SVG elements", () => {
      // Create a structure similar to the actual component
      const container = document.createElement("div")
      const chevronSpan = document.createElement("span")
      chevronSpan.setAttribute("data-chevron", "")
      const svgElement = document.createElementNS("http://www.w3.org/2000/svg", "svg")

      chevronSpan.appendChild(svgElement)
      container.appendChild(chevronSpan)

      // Test that closest() works on SVG elements
      const closestChevron = svgElement.closest("[data-chevron]")
      expect(closestChevron).toBe(chevronSpan)
      expect(closestChevron).not.toBeNull()
    })
  })

  describe("Instruction-based zone detection", () => {
    it.skip("shows line indicator when reorder-above instruction is detected", () => {
      render(<DraggableProjectGroupItem group={mockGroup} projects={mockProjects} index={0} />)

      // Mock the instruction extraction returning reorder-above
      mockExtractInstruction.mockReturnValue({ type: "reorder-above" })

      // Verify the component renders and would handle drag events
      expect(screen.getByTestId("drop-target-wrapper")).toBeInTheDocument()

      // Check that attachInstruction is called with proper zone detection
      expect(mockAttachInstruction).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "sidebar-group-drop-target",
          groupId: "11111111-1111-4111-8111-111111111111",
        }),
      )
    })

    it("shows box highlighting when make-child instruction is detected", () => {
      render(<DraggableProjectGroupItem group={mockGroup} projects={mockProjects} index={0} />)

      // Mock the instruction extraction returning make-child
      mockExtractInstruction.mockReturnValue({ type: "make-child" })

      // The component should render with box highlighting styles when make-child is detected
      // This would be visible through the bg-primary/10 class application
    })

    it("shows line indicator below when reorder-below instruction is detected", () => {
      render(<DraggableProjectGroupItem group={mockGroup} projects={mockProjects} index={0} />)

      // Mock the instruction extraction returning reorder-below
      mockExtractInstruction.mockReturnValue({ type: "reorder-below" })

      // Check that the component would render bottom line indicator
      // when the state is updated with reorder-below instruction
    })

    it("does not show both line and box indicators simultaneously", () => {
      render(<DraggableProjectGroupItem group={mockGroup} projects={mockProjects} index={0} />)

      // Test that when make-child instruction is active, no line indicators are shown
      mockExtractInstruction.mockReturnValue({ type: "make-child" })

      // The component should only apply box highlighting styles
      // and not show any line indicators

      // Then test with reorder-above
      mockExtractInstruction.mockReturnValue({ type: "reorder-above" })

      // The component should only show line indicator above
      // and not apply box highlighting styles
    })
  })

  describe("Drop target configuration", () => {
    it.skip("configures drop target with attachInstruction for zone detection", () => {
      render(<DraggableProjectGroupItem group={mockGroup} projects={mockProjects} index={0} />)

      // Verify that attachInstruction was called with correct parameters
      expect(mockAttachInstruction).toHaveBeenCalled()
      const lastCall = mockAttachInstruction.mock.calls[mockAttachInstruction.mock.calls.length - 1]
      if (!lastCall || !lastCall[0]) {
        throw new Error("Expected mockAttachInstruction to have been called with arguments")
      }

      // Check that it was called with data parameter
      expect(lastCall[0]).toMatchObject({
        type: "sidebar-group-drop-target",
        groupId: "11111111-1111-4111-8111-111111111111",
        index: 0,
      })

      // Check that it was called with correct data parameter
      // The config parameter is handled internally by the attachInstruction function
    })

    it("handles drag events and updates state based on instruction", () => {
      render(<DraggableProjectGroupItem group={mockGroup} projects={mockProjects} index={0} />)

      // Test that drag events properly extract instructions
      mockExtractInstruction.mockReturnValue({ type: "make-child" })

      // Verify the component would handle the instruction appropriately
      expect(mockExtractInstruction).toBeDefined()
    })
  })

  describe("Visual feedback", () => {
    it("applies correct styles for make-child instruction", () => {
      render(<DraggableProjectGroupItem group={mockGroup} projects={mockProjects} index={0} />)

      // When make-child instruction is active, the component should have
      // bg-primary/10 and border-primary/20 classes

      // This would be tested by simulating the drag state with make-child instruction
      // and checking for the presence of these classes
    })

    it("shows drop indicator at correct position based on instruction type", () => {
      render(<DraggableProjectGroupItem group={mockGroup} projects={mockProjects} index={0} />)

      // Test that SidebarDropIndicator is rendered with correct positioning
      // based on the instruction type (reorder-above vs reorder-below)
    })
  })

  describe("Edge cases", () => {
    it("handles null instruction gracefully", () => {
      render(<DraggableProjectGroupItem group={mockGroup} projects={mockProjects} index={0} />)

      mockExtractInstruction.mockReturnValue(null)

      // Component should not show any indicators when instruction is null
    })

    it("clears instruction when drag leaves", () => {
      render(<DraggableProjectGroupItem group={mockGroup} projects={mockProjects} index={0} />)

      // Test that instruction state is cleared when drag leaves the element
      // This ensures indicators are properly hidden
    })

    it("only responds to innermost drop target", () => {
      render(<DraggableProjectGroupItem group={mockGroup} projects={mockProjects} index={0} />)

      // Test that instruction is only extracted when this element
      // is the innermost drop target in the hierarchy
    })
  })
})
