import { renderHook, act } from "@/test-utils"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useFlashOnChange, useFlashClasses, useTaskMetadataFlash } from "./use-flash-on-change"

const FLASH_CLASS = "bg-primary/20"

describe("useFlashOnChange", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
  })

  it("flashes when the tracked value changes then resets after the duration", () => {
    const { result, rerender } = renderHook(({ key }) => useFlashOnChange(key, 500), {
      initialProps: { key: "initial" },
    })

    expect(result.current).toBe(false)

    act(() => {
      rerender({ key: "updated" })
    })

    expect(result.current).toBe(true)

    act(() => {
      vi.advanceTimersByTime(499)
    })
    expect(result.current).toBe(true)

    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(result.current).toBe(false)
  })
})

describe("useFlashClasses", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
  })

  it("only flashes the keys whose value changed", () => {
    const { result, rerender } = renderHook(
      ({ labels, comments }) =>
        useFlashClasses(
          {
            labels,
            comments,
            schedule: "",
            priority: "",
            project: "",
            subtasks: "",
            assignees: "",
          },
          400,
        ),
      { initialProps: { labels: "a", comments: "0" } },
    )

    expect(result.current("labels")).not.toContain(FLASH_CLASS)
    expect(result.current("comments")).not.toContain(FLASH_CLASS)

    act(() => {
      rerender({ labels: "b", comments: "0" })
    })

    expect(result.current("labels")).toContain(FLASH_CLASS)
    expect(result.current("comments")).not.toContain(FLASH_CLASS)

    act(() => {
      vi.advanceTimersByTime(401)
    })

    expect(result.current("labels")).not.toContain(FLASH_CLASS)
  })
})

describe("useTaskMetadataFlash", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
  })

  it("returns a stable no-op function when task is undefined", () => {
    const { result, rerender } = renderHook(() => useTaskMetadataFlash(undefined))

    const initialGetFlashClass = result.current
    expect(initialGetFlashClass("labels")).not.toContain(FLASH_CLASS)

    rerender()

    expect(result.current).toBe(initialGetFlashClass)
    expect(result.current("project")).not.toContain(FLASH_CLASS)
  })
})
