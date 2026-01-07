"use client"

import { useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useAtomValue, useSetAtom } from "jotai"
import { taskFocusRequestAtom, clearTaskFocusRequestAtom } from "@tasktrove/atoms/ui/task-focus"
import { scrollToTaskActionAtom } from "@tasktrove/atoms/ui/scroll-to-task"

/**
 * Handles global "focus task" requests by navigating to the target route
 * and triggering scroll/highlight once the pathname matches.
 */
export function useTaskFocus() {
  const router = useRouter()
  const pathname = usePathname()
  const request = useAtomValue(taskFocusRequestAtom)
  const clearRequest = useSetAtom(clearTaskFocusRequestAtom)
  const scrollToTask = useSetAtom(scrollToTaskActionAtom)

  useEffect(() => {
    if (!request) return

    // Navigate first if we're not on the correct route
    if (request.targetPath && pathname !== request.targetPath) {
      router.push(request.targetPath)
      return
    }

    // We're on the correct route – trigger scroll + highlight on next frame
    const rafId =
      typeof window !== "undefined"
        ? window.requestAnimationFrame(() => {
            scrollToTask(request.taskId)
            clearRequest()
          })
        : undefined

    return () => {
      if (rafId !== undefined && typeof window !== "undefined") {
        window.cancelAnimationFrame(rafId)
      }
    }
  }, [clearRequest, pathname, request, router, scrollToTask])
}
