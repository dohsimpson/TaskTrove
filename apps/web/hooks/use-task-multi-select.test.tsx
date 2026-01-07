import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { createTaskId } from "@tasktrove/types/id"

const jotaiValues: {
  lastSelectedTask: ReturnType<typeof createTaskId>
  selectedTaskId: ReturnType<typeof createTaskId> | null
} = {
  lastSelectedTask: createTaskId("11111111-1111-4111-8111-111111111111"),
  selectedTaskId: null,
}

const jotaiSetters = {
  toggleTaskSelection: vi.fn(),
  selectRange: vi.fn(),
}

vi.mock("jotai", async () => {
  const actual = await vi.importActual<typeof import("jotai")>("jotai")

  return {
    ...actual,
    useAtomValue: vi.fn(),
    useSetAtom: vi.fn(),
  }
})

import { useTaskMultiSelectClick } from "./use-task-multi-select"
import { useAtomValue, useSetAtom } from "jotai"

describe("useTaskMultiSelectClick", () => {
  beforeEach(() => {
    const atomValueMock = vi.mocked(useAtomValue)
    const setAtomMock = vi.mocked(useSetAtom)

    atomValueMock.mockReset()
    setAtomMock.mockReset()

    let callIndex = 0
    atomValueMock.mockImplementation(() => {
      callIndex += 1
      return callIndex === 1 ? jotaiValues.lastSelectedTask : jotaiValues.selectedTaskId
    })
    setAtomMock
      .mockReturnValueOnce(jotaiSetters.toggleTaskSelection)
      .mockReturnValueOnce(jotaiSetters.selectRange)

    jotaiSetters.toggleTaskSelection.mockClear()
    jotaiSetters.selectRange.mockClear()
  })

  it("uses custom range resolver when provided for shift selection", () => {
    const taskId = createTaskId("22222222-2222-4222-8222-222222222222")
    const rangeTaskIds = [jotaiValues.lastSelectedTask, taskId]
    const getRangeTaskIds = vi.fn().mockReturnValue(rangeTaskIds)

    const { result } = renderHook(() => useTaskMultiSelectClick())

    act(() => {
      result.current({
        taskId,
        event: { shiftKey: true, metaKey: false, ctrlKey: false },
        getRangeTaskIds,
      })
    })

    expect(getRangeTaskIds).toHaveBeenCalledWith(jotaiValues.lastSelectedTask, taskId)
    expect(jotaiSetters.selectRange).toHaveBeenCalledWith({
      startTaskId: jotaiValues.lastSelectedTask,
      endTaskId: taskId,
      sortedTaskIds: undefined,
      rangeTaskIds,
    })
    expect(jotaiSetters.toggleTaskSelection).not.toHaveBeenCalled()
  })
})
