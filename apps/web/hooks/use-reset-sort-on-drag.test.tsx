import { renderHook, act } from "@testing-library/react"
import React from "react"
import { Provider, createStore, useAtomValue, useSetAtom } from "jotai"
import { describe, it, expect } from "vitest"
import { draggingTaskIdsAtom } from "@tasktrove/atoms/ui/drag"
import { currentViewStateAtom, setViewOptionsAtom } from "@tasktrove/atoms/ui/views"
import { createTaskId } from "@tasktrove/types/id"
import { useResetSortOnDrag } from "./use-reset-sort-on-drag"

describe("useResetSortOnDrag", () => {
  const setup = () => {
    const store = createStore()
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    )

    const hook = renderHook(
      () => {
        const controls = useResetSortOnDrag()
        const viewState = useAtomValue(currentViewStateAtom)
        const setViewOptions = useSetAtom(setViewOptionsAtom)
        const draggingIds = useAtomValue(draggingTaskIdsAtom)
        const setDraggingIds = useSetAtom(draggingTaskIdsAtom)

        return {
          ...controls,
          viewState,
          setViewOptions,
          draggingIds,
          setDraggingIds,
        }
      },
      { wrapper },
    )

    return hook
  }

  it("temporarily resets sort and restores the previous sort on component drop", () => {
    const hook = setup()

    act(() => {
      hook.result.current.setViewOptions({
        sortBy: "dueDate",
        sortDirection: "desc",
      })
    })

    expect(hook.result.current.viewState.sortBy).toBe("dueDate")
    expect(hook.result.current.viewState.sortDirection).toBe("desc")

    act(() => {
      hook.result.current.applyDefaultSort()
    })

    expect(hook.result.current.viewState.sortBy).toBe("default")
    expect(hook.result.current.viewState.sortDirection).toBe("asc")

    const taskId = createTaskId("123e4567-e89b-12d3-a456-426614174000")

    act(() => {
      hook.result.current.setDraggingIds([taskId])
      hook.result.current.restorePreviousSort()
    })

    expect(hook.result.current.viewState.sortBy).toBe("dueDate")
    expect(hook.result.current.viewState.sortDirection).toBe("desc")
    expect(hook.result.current.draggingIds).toEqual([])
  })

  it("restores the previous sort when the global dragend event fires", () => {
    const hook = setup()

    const taskId = createTaskId("123e4567-e89b-12d3-a456-426614174001")

    act(() => {
      hook.result.current.setViewOptions({
        sortBy: "priority",
        sortDirection: "asc",
      })
    })

    act(() => {
      hook.result.current.applyDefaultSort()
      hook.result.current.setDraggingIds([taskId])
    })

    expect(hook.result.current.viewState.sortBy).toBe("default")
    expect(hook.result.current.draggingIds).toEqual([taskId])

    act(() => {
      window.dispatchEvent(new Event("dragend"))
    })

    expect(hook.result.current.viewState.sortBy).toBe("priority")
    expect(hook.result.current.draggingIds).toEqual([])
  })
})
