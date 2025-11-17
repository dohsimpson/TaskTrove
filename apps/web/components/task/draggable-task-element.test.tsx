import React from "react"
import { render, act as testingLibraryAct, renderHook } from "@testing-library/react"
import { Provider, createStore, useAtomValue, useSetAtom } from "jotai"
import { vi, describe, it, expect, beforeEach } from "vitest"
import { DraggableTaskElement } from "./draggable-task-element"
import { draggingTaskIdsAtom } from "@tasktrove/atoms/ui/drag"
import { currentViewStateAtom, setViewOptionsAtom } from "@tasktrove/atoms/ui/views"
import { createTaskId } from "@/lib/types"

const mockHandlers: {
  onDragStart?: () => void
  onDrop?: () => void
} = {}

vi.mock("@/components/ui/drag-drop", () => ({
  DraggableItem: ({
    onDragStart,
    onDrop,
    children,
    className,
  }: {
    onDragStart?: () => void
    onDrop?: () => void
    children: React.ReactNode
    className?: string
  }) => {
    mockHandlers.onDragStart = onDragStart
    mockHandlers.onDrop = onDrop
    return (
      <div data-testid="mock-draggable-item" className={className}>
        {children}
      </div>
    )
  },
}))

describe("DraggableTaskElement", () => {
  const createWrapper = () => {
    const store = createStore()
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    )
    return { store, wrapper }
  }

  beforeEach(() => {
    mockHandlers.onDragStart = undefined
    mockHandlers.onDrop = undefined
  })

  it("applies dragged styling when the task id is tracked globally", () => {
    const { wrapper } = createWrapper()
    const taskId = createTaskId("123e4567-e89b-12d3-a456-426614174000")

    const { container } = render(
      <DraggableTaskElement taskId={taskId}>
        <div data-testid="draggable-task-content">Task content</div>
      </DraggableTaskElement>,
      { wrapper },
    )

    const outer = container.firstElementChild
    expect(outer).not.toHaveClass("opacity-30")

    const { result: setDraggingResult } = renderHook(() => useSetAtom(draggingTaskIdsAtom), {
      wrapper,
    })

    testingLibraryAct(() => {
      setDraggingResult.current([taskId])
    })

    expect(outer).toHaveClass("opacity-30")
    expect(outer).toHaveClass("scale-95")

    testingLibraryAct(() => {
      setDraggingResult.current([])
    })

    expect(outer).not.toHaveClass("opacity-30")
  })

  it("resets sort to default on drag start and restores it on drop", () => {
    const { wrapper } = createWrapper()
    const taskId = createTaskId("123e4567-e89b-12d3-a456-426614174001")

    render(
      <DraggableTaskElement taskId={taskId}>
        <div data-testid="draggable-task-content">Task content</div>
      </DraggableTaskElement>,
      { wrapper },
    )

    const { result: setViewOptionsResult } = renderHook(() => useSetAtom(setViewOptionsAtom), {
      wrapper,
    })
    const { result: viewStateResult } = renderHook(() => useAtomValue(currentViewStateAtom), {
      wrapper,
    })
    const { result: draggingIdsResult } = renderHook(() => useAtomValue(draggingTaskIdsAtom), {
      wrapper,
    })

    testingLibraryAct(() => {
      setViewOptionsResult.current({
        sortBy: "title",
        sortDirection: "asc",
      })
    })

    expect(viewStateResult.current.sortBy).toBe("title")

    testingLibraryAct(() => {
      mockHandlers.onDragStart?.()
    })

    expect(viewStateResult.current.sortBy).toBe("default")
    expect(draggingIdsResult.current).toEqual([taskId])

    testingLibraryAct(() => {
      mockHandlers.onDrop?.()
    })

    expect(viewStateResult.current.sortBy).toBe("title")
    expect(draggingIdsResult.current).toEqual([])
  })
})
