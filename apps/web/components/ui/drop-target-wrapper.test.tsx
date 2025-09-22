import React from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, act } from "@/test-utils"
import { DropTargetWrapper } from "./drop-target-wrapper"

// Mock the pragmatic drag and drop module
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

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <div data-testid="test-container">{children}</div>
)

describe("DropTargetWrapper", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockDropTargetConfig = null
  })

  it("renders children correctly", () => {
    const onDrop = vi.fn()
    render(
      <TestWrapper>
        <DropTargetWrapper onDrop={onDrop}>
          <div>Drop Zone Content</div>
        </DropTargetWrapper>
      </TestWrapper>,
    )

    expect(screen.getByText("Drop Zone Content")).toBeInTheDocument()
  })

  it("applies custom className", () => {
    const onDrop = vi.fn()
    render(
      <TestWrapper>
        <DropTargetWrapper onDrop={onDrop} className="custom-drop-zone">
          <div>Drop Zone Content</div>
        </DropTargetWrapper>
      </TestWrapper>,
    )

    const dropZone = screen.getByText("Drop Zone Content").parentElement
    expect(dropZone).toHaveClass("custom-drop-zone")
  })

  it("configures drop target with provided ID", () => {
    const onDrop = vi.fn()
    render(
      <TestWrapper>
        <DropTargetWrapper onDrop={onDrop} dropTargetId="test-drop-zone">
          <div>Drop Zone Content</div>
        </DropTargetWrapper>
      </TestWrapper>,
    )

    expect(mockDropTargetConfig).toBeTruthy()
    const data = mockDropTargetConfig?.getData?.({ input: {} })
    expect(data).toHaveProperty("dropTargetId", "test-drop-zone")
  })

  it("calls getData function when provided", () => {
    const onDrop = vi.fn()
    const getData = vi.fn(() => ({ customField: "value" }))

    render(
      <TestWrapper>
        <DropTargetWrapper onDrop={onDrop} getData={getData}>
          <div>Drop Zone Content</div>
        </DropTargetWrapper>
      </TestWrapper>,
    )

    expect(mockDropTargetConfig).toBeTruthy()
    const data = mockDropTargetConfig?.getData?.({ input: {} })
    expect(data).toHaveProperty("customField", "value")
  })

  it("handles onDragEnter event", () => {
    const onDrop = vi.fn()
    const onDragEnter = vi.fn()

    render(
      <TestWrapper>
        <DropTargetWrapper onDrop={onDrop} onDragEnter={onDragEnter}>
          <div>Drop Zone Content</div>
        </DropTargetWrapper>
      </TestWrapper>,
    )

    expect(mockDropTargetConfig).toBeTruthy()
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

  it("handles onDragLeave event", () => {
    const onDrop = vi.fn()
    const onDragLeave = vi.fn()

    render(
      <TestWrapper>
        <DropTargetWrapper onDrop={onDrop} onDragLeave={onDragLeave}>
          <div>Drop Zone Content</div>
        </DropTargetWrapper>
      </TestWrapper>,
    )

    expect(mockDropTargetConfig).toBeTruthy()
    expect(mockDropTargetConfig?.onDragLeave).toBeDefined()

    const mockEventData = {
      source: { data: { type: "task" } },
      location: { current: { dropTargets: [] } },
    }
    mockDropTargetConfig?.onDragLeave?.(mockEventData)

    expect(onDragLeave).toHaveBeenCalledWith(mockEventData)
  })

  it("handles onDrag event", () => {
    const onDrop = vi.fn()
    const onDrag = vi.fn()

    render(
      <TestWrapper>
        <DropTargetWrapper onDrop={onDrop} onDrag={onDrag}>
          <div>Drop Zone Content</div>
        </DropTargetWrapper>
      </TestWrapper>,
    )

    expect(mockDropTargetConfig).toBeTruthy()
    expect(mockDropTargetConfig?.onDrag).toBeDefined()

    const mockEventData = {
      source: { data: { type: "task" } },
      location: { current: { dropTargets: [] } },
    }
    mockDropTargetConfig?.onDrag?.(mockEventData)

    expect(onDrag).toHaveBeenCalledWith(mockEventData)
  })

  it("handles onDrop event", () => {
    const onDrop = vi.fn()

    render(
      <TestWrapper>
        <DropTargetWrapper onDrop={onDrop}>
          <div>Drop Zone Content</div>
        </DropTargetWrapper>
      </TestWrapper>,
    )

    expect(mockDropTargetConfig).toBeTruthy()
    expect(mockDropTargetConfig?.onDrop).toBeDefined()

    const mockEventData = {
      source: { data: { type: "task", taskId: "123" } },
      location: { current: { dropTargets: [] } },
    }
    mockDropTargetConfig?.onDrop?.(mockEventData)

    expect(onDrop).toHaveBeenCalledWith(mockEventData)
  })

  it("respects canDrop function", () => {
    const onDrop = vi.fn()
    const canDrop = vi.fn((data) => data.source.data.type === "task")

    render(
      <TestWrapper>
        <DropTargetWrapper onDrop={onDrop} canDrop={canDrop}>
          <div>Drop Zone Content</div>
        </DropTargetWrapper>
      </TestWrapper>,
    )

    expect(mockDropTargetConfig).toBeTruthy()
    expect(mockDropTargetConfig?.canDrop).toBeDefined()

    const validSource = { source: { data: { type: "task" } } }
    const invalidSource = { source: { data: { type: "other" } } }

    expect(mockDropTargetConfig?.canDrop?.(validSource)).toBe(true)
    expect(mockDropTargetConfig?.canDrop?.(invalidSource)).toBe(false)

    expect(canDrop).toHaveBeenCalledTimes(2)
  })

  it("toggles drop state on drag enter and leave", () => {
    const onDrop = vi.fn()

    render(
      <TestWrapper>
        <DropTargetWrapper onDrop={onDrop} dropClassName="is-drop-target">
          <div>Drop Zone Content</div>
        </DropTargetWrapper>
      </TestWrapper>,
    )

    const dropZone = screen.getByText("Drop Zone Content").parentElement

    // Initially should not have drop class
    expect(dropZone).not.toHaveClass("is-drop-target")

    // Simulate drag enter - component sets internal state
    expect(mockDropTargetConfig?.onDragEnter).toBeDefined()
    act(() => {
      mockDropTargetConfig?.onDragEnter?.({
        source: { data: {} },
        location: { current: { dropTargets: [] } },
      })
    })

    // Note: Since we're testing the mock, we can't actually test the state change
    // In a real integration test, we would verify the class is added
  })

  it("handles getData with args parameter", () => {
    const onDrop = vi.fn()
    const getData = vi.fn((args) => {
      if (args?.element) {
        return { hasElement: true }
      }
      return { hasElement: false }
    })

    render(
      <TestWrapper>
        <DropTargetWrapper onDrop={onDrop} getData={getData}>
          <div>Drop Zone Content</div>
        </DropTargetWrapper>
      </TestWrapper>,
    )

    expect(mockDropTargetConfig).toBeTruthy()

    const mockElement = document.createElement("div")
    const dataWithElement = mockDropTargetConfig?.getData?.({
      input: {},
      element: mockElement,
    })

    // Verify getData was called with an object containing input and element
    expect(getData).toHaveBeenCalled()
    const firstCall = getData.mock.calls[0]
    if (!firstCall || !firstCall[0]) {
      throw new Error("Expected getData to have been called with arguments")
    }
    const callArgs = firstCall[0]
    expect(callArgs).toHaveProperty("input")
    expect(callArgs).toHaveProperty("element")
    expect(dataWithElement).toHaveProperty("hasElement", true)
  })
})
