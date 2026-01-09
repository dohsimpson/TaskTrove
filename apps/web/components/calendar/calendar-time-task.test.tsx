import React from "react"
import { render, fireEvent } from "@testing-library/react"
import { describe, it, expect, vi } from "vitest"
import { Provider, createStore } from "jotai"
import { createTaskId } from "@tasktrove/types/id"
import type { Task } from "@tasktrove/types/core"
import { hoveredTaskIdAtom } from "@tasktrove/atoms/ui/selection"
import { CalendarTimeTask } from "./calendar-time-task"

vi.mock("@/components/task/draggable-task-element", () => ({
  DraggableTaskElement: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="draggable-task-element">{children}</div>
  ),
}))

describe("CalendarTimeTask", () => {
  it("highlights all instances when a task is hovered", () => {
    const store = createStore()
    const taskId = createTaskId("123e4567-e89b-12d3-a456-426614174099")
    const task: Task = {
      id: taskId,
      title: "Shared Task",
      description: "",
      completed: false,
      archived: false,
      priority: 2,
      dueDate: new Date("2025-01-01T00:00:00.000Z"),
      dueTime: new Date("2025-01-01T09:00:00.000Z"),
      labels: [],
      subtasks: [],
      comments: [],
      createdAt: new Date("2025-01-01T00:00:00.000Z"),
      recurringMode: "dueDate",
    }

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    )

    const { container } = render(
      <>
        <CalendarTimeTask
          task={task}
          date={new Date("2025-01-01T00:00:00.000Z")}
          dayKey="2025-01-01"
          top={0}
          height={60}
          zIndex={1}
        />
        <CalendarTimeTask
          task={task}
          date={new Date("2025-01-01T00:00:00.000Z")}
          dayKey="2025-01-01"
          top={80}
          height={60}
          zIndex={2}
        />
      </>,
      { wrapper },
    )

    const taskItems = container.querySelectorAll(`[data-task-id="${taskId}"]`)
    expect(taskItems.length).toBe(2)
    taskItems.forEach((item) => expect(item).not.toHaveClass("bg-accent/50"))

    const firstItem = taskItems[0]
    if (!firstItem) {
      throw new Error("Expected a calendar task item to be rendered")
    }
    fireEvent.mouseEnter(firstItem)

    taskItems.forEach((item) => expect(item).toHaveClass("bg-accent/50"))

    fireEvent.mouseLeave(firstItem)
    expect(store.get(hoveredTaskIdAtom)).toBe(null)
  })
})
