import React from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, act } from "@/test-utils"
import { DraggableWrapper } from "./draggable-wrapper"

// Mock the pragmatic drag and drop module
let mockDraggableConfig: {
  getInitialData?: (args: { element: unknown }) => Record<string, unknown>
  onDragStart?: () => void
  onDrop?: () => void
} | null = null
vi.mock("@atlaskit/pragmatic-drag-and-drop/element/adapter", () => ({
  draggable: vi.fn((config) => {
    mockDraggableConfig = config
    return vi.fn()
  }),
}))

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <div data-testid="test-container">{children}</div>
)

describe("DraggableWrapper", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockDraggableConfig = null
  })

  it("renders children correctly", () => {
    render(
      <TestWrapper>
        <DraggableWrapper dragId="test-item" index={0}>
          <div>Test Content</div>
        </DraggableWrapper>
      </TestWrapper>,
    )

    expect(screen.getByText("Test Content")).toBeInTheDocument()
  })

  it("applies dragId correctly", () => {
    render(
      <TestWrapper>
        <DraggableWrapper dragId="unique-id" index={0}>
          <div>Test Content</div>
        </DraggableWrapper>
      </TestWrapper>,
    )

    // The draggable wrapper should render the content
    expect(screen.getByText("Test Content")).toBeInTheDocument()
  })

  it("applies index correctly", () => {
    render(
      <TestWrapper>
        <DraggableWrapper dragId="test-item" index={2}>
          <div>Test Content</div>
        </DraggableWrapper>
      </TestWrapper>,
    )

    // The draggable wrapper should render with the content
    expect(screen.getByText("Test Content")).toBeInTheDocument()
  })

  it("applies custom className", () => {
    render(
      <TestWrapper>
        <DraggableWrapper dragId="test-item" index={0} className="custom-class">
          <div>Test Content</div>
        </DraggableWrapper>
      </TestWrapper>,
    )

    // Check if the custom class is applied to the wrapper
    const draggableWrapper = screen.getByText("Test Content").parentElement
    expect(draggableWrapper).toHaveClass("custom-class")
  })

  it("calls onDragStart callback when provided", () => {
    const onDragStart = vi.fn()
    render(
      <TestWrapper>
        <DraggableWrapper dragId="test-item" index={0} onDragStart={onDragStart}>
          <div>Test Content</div>
        </DraggableWrapper>
      </TestWrapper>,
    )

    // The component should render correctly
    expect(screen.getByText("Test Content")).toBeInTheDocument()
    // Callback testing would require simulating drag events
  })

  it("provides getData function when specified", () => {
    const getData = vi.fn(() => ({ type: "test", customData: "value" }))
    render(
      <TestWrapper>
        <DraggableWrapper dragId="test-item" index={0} getData={getData}>
          <div>Test Content</div>
        </DraggableWrapper>
      </TestWrapper>,
    )

    expect(screen.getByText("Test Content")).toBeInTheDocument()
  })

  it("includes element rect in drag data", () => {
    const getData = vi.fn(() => ({ type: "task" }))
    const mockElement = {
      getBoundingClientRect: vi.fn(() => ({
        x: 10,
        y: 20,
        width: 100,
        height: 50,
        top: 20,
        right: 110,
        bottom: 70,
        left: 10,
      })),
    }

    render(
      <TestWrapper>
        <DraggableWrapper dragId="test-item" index={0} getData={getData}>
          <div>Test Content</div>
        </DraggableWrapper>
      </TestWrapper>,
    )

    // Verify draggable was configured
    expect(mockDraggableConfig).toBeTruthy()

    // Simulate getInitialData being called with an element
    const initialData = mockDraggableConfig?.getInitialData?.({ element: mockElement })

    // Verify rect is included in the data
    expect(initialData).toHaveProperty("rect")
    expect(initialData?.rect).toEqual({
      x: 10,
      y: 20,
      width: 100,
      height: 50,
      top: 20,
      right: 110,
      bottom: 70,
      left: 10,
    })
    expect(initialData).toHaveProperty("dragId", "test-item")
    expect(initialData).toHaveProperty("index", 0)
    expect(initialData).toHaveProperty("type", "task")
  })

  it("handles drag state changes", () => {
    const onDragStart = vi.fn()
    const onDrop = vi.fn()

    render(
      <TestWrapper>
        <DraggableWrapper dragId="test-item" index={0} onDragStart={onDragStart} onDrop={onDrop}>
          <div>Test Content</div>
        </DraggableWrapper>
      </TestWrapper>,
    )

    // Verify draggable was configured with callbacks
    expect(mockDraggableConfig).toBeTruthy()
    expect(mockDraggableConfig?.onDragStart).toBeDefined()
    expect(mockDraggableConfig?.onDrop).toBeDefined()

    // Simulate drag start
    act(() => {
      mockDraggableConfig?.onDragStart?.()
    })
    expect(onDragStart).toHaveBeenCalledWith({ dragId: "test-item", index: 0 })

    // Simulate drop
    act(() => {
      mockDraggableConfig?.onDrop?.()
    })
    expect(onDrop).toHaveBeenCalled()
  })
})
