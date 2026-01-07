import { describe, it, expect, vi } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { createProjectId, createTaskId } from "@tasktrove/types/id"

const jotaiSetters = vi.hoisted(() => ({
  focus: vi.fn(),
  setSelected: vi.fn(),
  showPanel: vi.fn(),
}))

vi.mock("jotai", async () => {
  const actual = await vi.importActual<typeof import("jotai")>("jotai")

  return {
    ...actual,
    useSetAtom: vi
      .fn()
      // focusTaskActionAtom
      .mockReturnValueOnce(jotaiSetters.focus)
      // setSelectedTaskIdAtom
      .mockReturnValueOnce(jotaiSetters.setSelected)
      // showTaskPanelAtom
      .mockReturnValueOnce(jotaiSetters.showPanel),
  }
})

// Import after mocks
import { useTaskSearchNavigation } from "./use-task-search-navigation"

describe("useTaskSearchNavigation", () => {
  it("keeps the task selected and panel open while triggering focus", () => {
    const task = {
      id: createTaskId("11111111-1111-4111-8111-111111111111"),
      title: "Task 1",
      description: "",
      completed: false,
      archived: false,
      priority: 4 as const,
      labels: [],
      subtasks: [],
      comments: [],
      createdAt: new Date(),
      projectId: createProjectId("00000000-0000-0000-0000-000000000000"),
      dueDate: undefined,
      dueTime: undefined,
      recurringMode: "dueDate" as const,
    }

    const { result } = renderHook(() => useTaskSearchNavigation())

    act(() => {
      result.current.focusTaskFromSearch(task)
    })

    expect(jotaiSetters.setSelected).toHaveBeenCalledWith(task.id)
    expect(jotaiSetters.showPanel).toHaveBeenCalledWith(true)
    expect(jotaiSetters.focus).toHaveBeenCalledWith(task.id)
  })
})
