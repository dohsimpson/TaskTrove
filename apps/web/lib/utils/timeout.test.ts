import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

import { withTimeout } from "./timeout"

describe("withTimeout", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("resolves when the task completes before the timeout", async () => {
    const result = await withTimeout(1000, async () => {
      vi.advanceTimersByTime(10)
      return "ok"
    })

    expect(result).toBe("ok")
    expect(vi.getTimerCount()).toBe(0)
  })

  it("rejects and aborts when the timeout elapses", async () => {
    const controllerAborted: AbortSignal[] = []
    const promise = withTimeout(
      100,
      (signal) =>
        new Promise((_resolve, reject) => {
          controllerAborted.push(signal)
          signal.addEventListener("abort", () => reject(signal.reason))
        }),
    )

    vi.advanceTimersByTime(101)

    await expect(promise).rejects.toThrow("Operation exceeded timeout of 100ms and was aborted.")
    expect(controllerAborted).toHaveLength(1)
    expect(controllerAborted[0]?.aborted).toBe(true)
  })
})
