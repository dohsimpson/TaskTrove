"use client"

import { useAtomValue, useSetAtom } from "jotai"
import { useEffect } from "react"
import { focusTimerTickAtom, stopFocusTimerAtom } from "@tasktrove/atoms/ui/focus-timer"
import {
  activeFocusTimerAtom,
  activeFocusTaskAtom,
  focusTimerStatusAtom,
  focusTimerDisplayAtom,
} from "@tasktrove/atoms/ui/focus-timer"

export function useFocusTimerDisplay() {
  const activeTimer = useAtomValue(activeFocusTimerAtom)
  const status = useAtomValue(focusTimerStatusAtom)
  const task = useAtomValue(activeFocusTaskAtom)
  const displayTime = useAtomValue(focusTimerDisplayAtom)
  const stopTimer = useSetAtom(stopFocusTimerAtom)
  const setTick = useSetAtom(focusTimerTickAtom)

  // Update tick every second when timer is running to trigger real-time updates
  useEffect(() => {
    if (status === "running") {
      const interval = setInterval(() => {
        setTick((prev) => prev + 1)
      }, 1000)
      return () => clearInterval(interval)
    }
  }, [status, setTick])

  // Stop timer when task is completed or deleted
  useEffect(() => {
    if (activeTimer && status !== "stopped") {
      if (task?.completed) {
        stopTimer(task.id)
      } else if (!task) {
        stopTimer(activeTimer.taskId)
      }
    }
  }, [task, activeTimer, status, stopTimer])

  return {
    activeTimer,
    status,
    task,
    displayTime,
  }
}
