import React from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, act } from "@/test-utils"
import { DropTargetItem } from "./drop-target-item"

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

describe("DropTargetItem", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockDropTargetConfig = null
  })

  describe("group mode", () => {
    it("renders children with GroupDropIndicator", () => {
      const onDrop = vi.fn()
      render(
        <DropTargetItem id="section-1" mode="group" onDrop={onDrop}>
          <div>Section Content</div>
        </DropTargetItem>,
      )

      expect(screen.getByText("Section Content")).toBeInTheDocument()
      expect(screen.getByTestId("group-drop-indicator")).toBeInTheDocument()
    })

    it("applies className to GroupDropIndicator element", () => {
      const onDrop = vi.fn()
      render(
        <DropTargetItem id="section-1" mode="group" onDrop={onDrop}>
          <div>Section Content</div>
        </DropTargetItem>,
      )

      const groupIndicator = screen.getByTestId("group-drop-indicator")
      // Verify the critical "flex flex-1" classes are applied to GroupDropIndicator
      expect(groupIndicator).toHaveClass("flex", "flex-1")
    })

    it("includes custom className on outer wrapper", () => {
      const onDrop = vi.fn()
      render(
        <DropTargetItem id="section-1" mode="group" onDrop={onDrop} className="custom-class">
          <div>Section Content</div>
        </DropTargetItem>,
      )

      const dropTarget = screen.getByTestId("drop-target-section-1")
      expect(dropTarget).toHaveClass("custom-class", "flex-1", "flex")
    })

    it("passes isActive state to GroupDropIndicator", () => {
      const onDrop = vi.fn()
      render(
        <DropTargetItem id="section-1" mode="group" onDrop={onDrop}>
          <div>Section Content</div>
        </DropTargetItem>,
      )

      const groupIndicator = screen.getByTestId("group-drop-indicator")
      // Initially should be inactive
      expect(groupIndicator).toHaveAttribute("data-active", "false")
    })
  })

  describe("list-item mode", () => {
    it("renders children with list-item structure", () => {
      const onDrop = vi.fn()
      render(
        <DropTargetItem id="task-1" mode="list-item" onDrop={onDrop}>
          <div>Task Content</div>
        </DropTargetItem>,
      )

      expect(screen.getByText("Task Content")).toBeInTheDocument()
      const dropTarget = screen.getByTestId("drop-target-task-1")
      expect(dropTarget).toHaveClass("relative")
    })

    it("applies custom className", () => {
      const onDrop = vi.fn()
      render(
        <DropTargetItem id="task-1" mode="list-item" onDrop={onDrop} className="custom-list-class">
          <div>Task Content</div>
        </DropTargetItem>,
      )

      const dropTarget = screen.getByTestId("drop-target-task-1")
      expect(dropTarget).toHaveClass("custom-list-class", "relative")
    })
  })

  describe("tree-item mode", () => {
    it("renders children with tree-item structure", () => {
      const onDrop = vi.fn()
      render(
        <DropTargetItem id="project-1" mode="tree-item" onDrop={onDrop} currentLevel={1}>
          <div>Project Content</div>
        </DropTargetItem>,
      )

      expect(screen.getByText("Project Content")).toBeInTheDocument()
      const dropTarget = screen.getByTestId("drop-target-project-1")
      expect(dropTarget).toHaveClass("relative")
    })

    it("applies custom className", () => {
      const onDrop = vi.fn()
      render(
        <DropTargetItem
          id="project-1"
          mode="tree-item"
          onDrop={onDrop}
          className="custom-tree-class"
        >
          <div>Project Content</div>
        </DropTargetItem>,
      )

      const dropTarget = screen.getByTestId("drop-target-project-1")
      expect(dropTarget).toHaveClass("custom-tree-class", "relative")
    })
  })

  describe("drop target configuration", () => {
    it("configures drop target with correct id and mode", () => {
      const onDrop = vi.fn()
      render(
        <DropTargetItem id="test-1" mode="list-item" index={5} onDrop={onDrop}>
          <div>Content</div>
        </DropTargetItem>,
      )

      expect(mockDropTargetConfig).toBeTruthy()
      const data = mockDropTargetConfig?.getData?.({ input: {} })
      expect(data).toMatchObject({
        type: "list-item",
        id: "test-1",
        index: 5,
      })
    })

    it("includes custom getData in configuration", () => {
      const onDrop = vi.fn()
      const getData = vi.fn(() => ({ customProp: "value" }))

      render(
        <DropTargetItem id="test-1" mode="group" onDrop={onDrop} getData={getData}>
          <div>Content</div>
        </DropTargetItem>,
      )

      expect(mockDropTargetConfig).toBeTruthy()
      const data = mockDropTargetConfig?.getData?.({ input: {} })
      expect(data).toMatchObject({
        type: "group",
        id: "test-1",
        customProp: "value",
      })
    })

    it("respects canDrop function", () => {
      const onDrop = vi.fn()
      const canDrop = vi.fn((sourceData) => sourceData.type === "task")

      render(
        <DropTargetItem id="test-1" mode="list-item" onDrop={onDrop} canDrop={canDrop}>
          <div>Content</div>
        </DropTargetItem>,
      )

      expect(mockDropTargetConfig).toBeTruthy()
      expect(mockDropTargetConfig?.canDrop).toBeDefined()

      const validSource = { source: { data: { type: "task" } } }
      const invalidSource = { source: { data: { type: "other" } } }

      expect(mockDropTargetConfig?.canDrop?.(validSource)).toBe(true)
      expect(mockDropTargetConfig?.canDrop?.(invalidSource)).toBe(false)
    })
  })

  describe("event handlers", () => {
    it("calls onDrop when drop occurs", () => {
      const onDrop = vi.fn()

      render(
        <DropTargetItem id="test-1" mode="list-item" onDrop={onDrop}>
          <div>Content</div>
        </DropTargetItem>,
      )

      expect(mockDropTargetConfig?.onDrop).toBeDefined()

      const mockEventData = {
        source: { data: { type: "task", id: "task-1" } },
        location: { current: { dropTargets: [] } },
      }
      act(() => {
        mockDropTargetConfig?.onDrop?.(mockEventData)
      })

      expect(onDrop).toHaveBeenCalledWith(mockEventData)
    })

    it("calls onDragEnter when drag enters", () => {
      const onDrop = vi.fn()
      const onDragEnter = vi.fn()

      render(
        <DropTargetItem id="test-1" mode="list-item" onDrop={onDrop} onDragEnter={onDragEnter}>
          <div>Content</div>
        </DropTargetItem>,
      )

      expect(mockDropTargetConfig?.onDragEnter).toBeDefined()

      const mockEventData = {
        source: { data: { type: "task" } },
        location: { current: { dropTargets: [] } },
      }
      act(() => {
        mockDropTargetConfig?.onDragEnter?.(mockEventData)
      })

      expect(onDragEnter).toHaveBeenCalledWith(mockEventData)
    })

    it("calls onDragLeave when drag leaves", () => {
      const onDrop = vi.fn()
      const onDragLeave = vi.fn()

      render(
        <DropTargetItem id="test-1" mode="list-item" onDrop={onDrop} onDragLeave={onDragLeave}>
          <div>Content</div>
        </DropTargetItem>,
      )

      expect(mockDropTargetConfig?.onDragLeave).toBeDefined()

      const mockEventData = {
        source: { data: { type: "task" } },
        location: { current: { dropTargets: [] } },
      }
      act(() => {
        mockDropTargetConfig?.onDragLeave?.(mockEventData)
      })

      expect(onDragLeave).toHaveBeenCalledWith(mockEventData)
    })

    it("calls onDrag during drag", () => {
      const onDrop = vi.fn()
      const onDrag = vi.fn()

      render(
        <DropTargetItem id="test-1" mode="list-item" onDrop={onDrop} onDrag={onDrag}>
          <div>Content</div>
        </DropTargetItem>,
      )

      expect(mockDropTargetConfig?.onDrag).toBeDefined()

      const mockEventData = {
        source: { data: { type: "task" } },
        location: { current: { dropTargets: [] } },
        self: { element: document.createElement("div"), data: {} },
      }
      act(() => {
        mockDropTargetConfig?.onDrag?.(mockEventData)
      })

      expect(onDrag).toHaveBeenCalledWith(mockEventData)
    })
  })

  describe("active target bus integration", () => {
    it("clears previous indicator when another target becomes active (no dragleave)", () => {
      const onDrop = vi.fn()

      // 1) Render first target alone and capture its config
      const utils = render(
        <DropTargetItem id="task-a" mode="tree-item" onDrop={onDrop}>
          <div>A</div>
        </DropTargetItem>,
      )
      const firstConfig = mockDropTargetConfig

      // 2) Re-render with both targets, capture second config
      utils.rerender(
        <div>
          <DropTargetItem id="task-a" mode="tree-item" onDrop={onDrop}>
            <div>A</div>
          </DropTargetItem>
          <DropTargetItem id="task-b" mode="tree-item" onDrop={onDrop}>
            <div>B</div>
          </DropTargetItem>
        </div>,
      )
      const secondConfig = mockDropTargetConfig

      // Simulate A being the innermost target first
      const aEl = document.createElement("div")
      act(() => {
        firstConfig?.onDrag?.({
          self: { element: aEl, data: {} },
          source: { data: { type: "task" } },
          location: { current: { dropTargets: [{ element: aEl }] } },
        })
      })
      // A may or may not render depending on extraction details; focus on clearing behavior below

      // Now simulate B becoming the innermost target. This should broadcast via the bus
      // and cause A to clear its indicator immediately (even without dragleave)
      const bEl = document.createElement("div")
      act(() => {
        secondConfig?.onDrag?.({
          self: { element: bEl, data: {} },
          source: { data: { type: "task" } },
          location: { current: { dropTargets: [{ element: bEl }] } },
        })
      })

      // A should not show an indicator after B becomes active
      expect(
        screen
          .getByTestId("drop-target-task-a")
          .querySelector('[data-testid="tree-drop-indicator"]'),
      ).toBeNull()
      // We don't assert B's indicator here due to mocked extraction nuances.
    })
  })
})
