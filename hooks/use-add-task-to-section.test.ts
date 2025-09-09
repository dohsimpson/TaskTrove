import { describe, it, expect } from "vitest"
import { renderHook } from "@testing-library/react"
import { useAddTaskToSection } from "./use-add-task-to-section"

describe("useAddTaskToSection", () => {
  it("returns a function", () => {
    const { result } = renderHook(() => useAddTaskToSection())

    expect(typeof result.current).toBe("function")
  })
})
