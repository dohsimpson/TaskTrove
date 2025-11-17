import { describe, it, expect } from "vitest"
import {
  beginDragIfNeeded,
  broadcastActiveTarget,
  subscribeActiveTarget,
} from "./active-target-bus"

describe("active-target-bus", () => {
  it("broadcasts active target to subscribers within the same drag token", () => {
    const received: Element[] = []
    beginDragIfNeeded()
    const unsub = subscribeActiveTarget(({ element }) => {
      if (element) received.push(element)
    })
    const el = document.createElement("div")
    broadcastActiveTarget(el)
    expect(received).toHaveLength(1)
    expect(received[0]).toBe(el)
    unsub()
  })

  it("continues to broadcast after dragend with a fresh token", () => {
    const first: Element[] = []
    const unsub1 = subscribeActiveTarget(({ element }) => {
      if (element) first.push(element)
    })
    // start drag and broadcast once
    beginDragIfNeeded()
    const el1 = document.createElement("div")
    broadcastActiveTarget(el1)
    expect(first).toHaveLength(1)

    // end drag (simulate)
    window.dispatchEvent(new Event("dragend"))

    // subscribe again; previous token should be cleared and new broadcasts should reach new subscribers
    const second: Element[] = []
    const unsub2 = subscribeActiveTarget(({ element }) => {
      if (element) second.push(element)
    })
    const el2 = document.createElement("div")
    broadcastActiveTarget(el2)

    // New subscriber should receive the post-drag broadcast
    expect(second).toHaveLength(1)
    expect(second[0]).toBe(el2)
    unsub1()
    unsub2()
  })
})
