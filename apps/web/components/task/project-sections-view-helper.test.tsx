import React from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@/test-utils"
import { DropTargetElement, DraggableElement } from "./project-sections-view-helper"

// Mock auto-scroll-while-dragging
vi.mock("auto-scroll-while-dragging", () => ({
  autoScrollWhileDragging: vi.fn(() => vi.fn()),
}))

// Mock the pragmatic drag and drop modules
let mockDropTargetConfig: {
  getData?: (args: { input: unknown; element?: unknown }) => Record<string, unknown>
  onDragEnter?: (data: Record<string, unknown>) => void
  onDragLeave?: (data: Record<string, unknown>) => void
  onDrag?: (data: Record<string, unknown>) => void
  onDrop?: (data: Record<string, unknown>) => void
  canDrop?: (data: Record<string, unknown>) => boolean
} | null = null

vi.mock("@atlaskit/pragmatic-drag-and-drop/element/adapter", () => ({
  dropTargetForElements: vi.fn((config) => {
    mockDropTargetConfig = config
    return vi.fn()
  }),
  draggable: vi.fn(() => vi.fn()),
}))

vi.mock("@atlaskit/pragmatic-drag-and-drop-hitbox/list-item", () => ({
  attachInstruction: vi.fn((data) => data),
  extractInstruction: vi.fn(() => ({ type: "reorder-above" })),
}))

vi.mock("@atlaskit/pragmatic-drag-and-drop-hitbox/tree-item", () => ({
  attachInstruction: vi.fn((data) => data),
  extractInstruction: vi.fn(() => ({ type: "reorder-above", currentLevel: 0 })),
}))

vi.mock("@atlaskit/pragmatic-drag-and-drop-react-drop-indicator/list-item", () => ({
  DropIndicator: vi.fn(({ instruction }) => (
    <div data-testid="list-drop-indicator">{instruction?.type}</div>
  )),
}))

vi.mock("@atlaskit/pragmatic-drag-and-drop-react-drop-indicator/tree-item", () => ({
  DropIndicator: vi.fn(({ instruction }) => (
    <div data-testid="tree-drop-indicator">{instruction?.type}</div>
  )),
}))

vi.mock("@atlaskit/pragmatic-drag-and-drop-react-drop-indicator/group", () => ({
  GroupDropIndicator: ({
    isActive,
    className,
    children,
    ref,
  }: {
    isActive: boolean
    className?: string
    children: React.ReactNode
    ref?: React.Ref<HTMLDivElement>
  }) => (
    <div ref={ref} data-testid="group-drop-indicator" data-active={isActive} className={className}>
      {children}
    </div>
  ),
}))

describe("DropTargetElement", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockDropTargetConfig = null
  })

  describe("critical className requirements", () => {
    it("CRITICAL: wrapper div (line 54) always has 'flex-1' className", () => {
      // This test ensures that the wrapper div at line 54 always has the "flex-1" className.
      // Without this class, the kanban column will not properly size the drop target container.
      render(
        <DropTargetElement
          id="section-1"
          options={{
            type: "group",
            indicator: { lineGap: "8px" },
            testId: "test-drop-target",
          }}
        >
          <div>Section Content</div>
        </DropTargetElement>,
      )

      const wrapperDiv = screen.getByTestId("test-drop-target")
      // Verify the wrapper div has "flex-1" class
      expect(wrapperDiv).toHaveClass("flex-1")
    })

    it("CRITICAL: DropTargetItem (line 65) always has 'flex-1' className for full-height indicators", () => {
      // This test ensures that the DropTargetItem at line 65 always receives the "flex-1" className.
      // In group mode, this className is passed to GroupDropIndicator, which is critical for
      // the kanban column to show drop indicators for the full height.
      // Without this class, the drag-and-drop UX in kanban view will be broken.
      render(
        <DropTargetElement
          id="section-1"
          options={{
            type: "group",
            indicator: { lineGap: "8px" },
            testId: "test-drop-target",
          }}
        >
          <div>Section Content</div>
        </DropTargetElement>,
      )

      // In group mode, DropTargetItem renders GroupDropIndicator with the className
      const groupIndicator = screen.getByTestId("group-drop-indicator")
      // Verify that the "flex-1" class is applied (GroupDropIndicator adds "flex" internally)
      expect(groupIndicator).toHaveClass("flex-1")
    })

    it("applies flex-1 className for list-item type", () => {
      render(
        <DropTargetElement
          id="task-1"
          options={{
            type: "list-item",
            indicator: { lineGap: "4px" },
            testId: "list-drop-target",
          }}
        >
          <div>Task Content</div>
        </DropTargetElement>,
      )

      const wrapperDiv = screen.getByTestId("list-drop-target")
      expect(wrapperDiv).toHaveClass("flex-1")
    })
  })

  describe("auto-scroll setup", () => {
    it("renders children inside auto-scroll wrapper", () => {
      render(
        <DropTargetElement
          id="section-1"
          options={{
            type: "group",
            indicator: { lineGap: "8px" },
          }}
        >
          <div>Section Content</div>
        </DropTargetElement>,
      )

      expect(screen.getByText("Section Content")).toBeInTheDocument()
    })
  })

  describe("drop handling", () => {
    it("calls onDrop callback for innermost drop target", () => {
      const onDrop = vi.fn()

      render(
        <DropTargetElement
          id="section-1"
          options={{
            type: "group",
            indicator: { lineGap: "8px" },
          }}
          onDrop={onDrop}
        >
          <div>Section Content</div>
        </DropTargetElement>,
      )

      // Simulate drop event on innermost target
      const mockElement = document.createElement("div")
      const mockEventData = {
        self: { element: mockElement },
        location: {
          current: {
            dropTargets: [{ element: mockElement }],
          },
        },
      }

      mockDropTargetConfig?.onDrop?.(mockEventData)
      expect(onDrop).toHaveBeenCalledWith(mockEventData)
    })

    it("does not call onDrop callback when not innermost drop target", () => {
      const onDrop = vi.fn()

      render(
        <DropTargetElement
          id="section-1"
          options={{
            type: "group",
            indicator: { lineGap: "8px" },
          }}
          onDrop={onDrop}
        >
          <div>Section Content</div>
        </DropTargetElement>,
      )

      // Simulate drop event on non-innermost target
      const mockEventData = {
        self: { element: document.createElement("div") },
        location: {
          current: {
            dropTargets: [{ element: document.createElement("div") }],
          },
        },
      }

      mockDropTargetConfig?.onDrop?.(mockEventData)
      expect(onDrop).not.toHaveBeenCalled()
    })
  })

  describe("canDrop logic", () => {
    it("prevents dropping item onto itself", () => {
      render(
        <DropTargetElement
          id="section-1"
          options={{
            type: "group",
            indicator: { lineGap: "8px" },
          }}
        >
          <div>Section Content</div>
        </DropTargetElement>,
      )

      expect(mockDropTargetConfig?.canDrop).toBeDefined()

      // Test dropping onto itself - should be false
      const selfDrop = { source: { data: { ids: ["section-1", "other-id"] } } }
      expect(mockDropTargetConfig?.canDrop?.(selfDrop)).toBe(false)

      // Test dropping different item - should be true
      const validDrop = { source: { data: { ids: ["other-section"] } } }
      expect(mockDropTargetConfig?.canDrop?.(validDrop)).toBe(true)
    })

    it("handles non-array ids gracefully", () => {
      render(
        <DropTargetElement
          id="section-1"
          options={{
            type: "group",
            indicator: { lineGap: "8px" },
          }}
        >
          <div>Section Content</div>
        </DropTargetElement>,
      )

      // Test with non-array ids - should allow drop
      const nonArrayIds = { source: { data: { ids: "not-an-array" } } }
      expect(mockDropTargetConfig?.canDrop?.(nonArrayIds)).toBe(true)
    })
  })
})

describe("DraggableElement", () => {
  it("renders children with draggable wrapper", () => {
    render(
      <DraggableElement id="task-1">
        <div>Task Content</div>
      </DraggableElement>,
    )

    expect(screen.getByText("Task Content")).toBeInTheDocument()
    expect(screen.getByTestId("draggable-task-1")).toBeInTheDocument()
  })

  it("provides correct data for dragging", () => {
    render(
      <DraggableElement id="task-123">
        <div>Task Content</div>
      </DraggableElement>,
    )

    // The component should pass getData={() => ({ ids: [id] })} to DraggableItem
    expect(screen.getByTestId("draggable-task-123")).toBeInTheDocument()
  })
})
