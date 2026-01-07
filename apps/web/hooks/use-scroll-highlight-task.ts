"use client"

import { useEffect } from "react"
import { useAtomValue, useSetAtom } from "jotai"
import { scrollToTaskAtom } from "@tasktrove/atoms/ui/scroll-to-task"

/**
 * Shared hook to scroll and highlight a task when scrollToTaskAtom is set.
 */
export function useScrollHighlightTask() {
  const scrollToTaskId = useAtomValue(scrollToTaskAtom)
  const setScrollToTaskId = useSetAtom(scrollToTaskAtom)

  useEffect(() => {
    if (!scrollToTaskId) return

    let attempts = 0
    const maxAttempts = 10
    let raf: number | undefined

    const tryFocus = () => {
      // Render of virtualized lists can lag a frame; retry across a few
      // animation frames so the element exists before we scroll/highlight.
      // (10 frames ~= 160ms at 60fps)
      const element = document.querySelector<HTMLElement>(`[data-task-id="${scrollToTaskId}"]`)
      if (element) {
        if (typeof element.scrollIntoView === "function") {
          element.scrollIntoView({ behavior: "auto", block: "center", inline: "nearest" })
        }
        element.classList.add("ring-2", "ring-primary", "animate-pulse", "my-0.5")
        setTimeout(() => {
          element.classList.remove("ring-2", "ring-primary", "animate-pulse", "my-0.5")
        }, 1800)
        setScrollToTaskId(null)
        return
      }

      attempts += 1
      if (attempts < maxAttempts) {
        raf = requestAnimationFrame(tryFocus)
      } else {
        // Give up to avoid a stuck state
        setScrollToTaskId(null)
      }
    }

    raf = requestAnimationFrame(tryFocus)

    return () => {
      if (raf !== undefined) cancelAnimationFrame(raf)
    }
  }, [scrollToTaskId, setScrollToTaskId])
}
