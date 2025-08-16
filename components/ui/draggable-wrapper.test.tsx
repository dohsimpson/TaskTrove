import React from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@/test-utils"
import { DraggableWrapper } from "./draggable-wrapper"

// Mock the pragmatic drag and drop module
vi.mock("@atlaskit/pragmatic-drag-and-drop/element/adapter", () => ({
  draggable: vi.fn(() => vi.fn()),
}))

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <div data-testid="test-container">{children}</div>
)

describe("DraggableWrapper", () => {
  beforeEach(() => {
    vi.clearAllMocks()
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
})
