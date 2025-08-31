"use client"

import { useAtomValue, useSetAtom } from "jotai"
import { useEffect, useState } from "react"
import {
  activeFocusTimerAtom,
  activeFocusTaskAtom,
  focusTimerStatusAtom,
  formatElapsedTime,
  stopFocusTimerAtom,
} from "@/lib/atoms"

// Helper function to calculate elapsed time for a timer
function calculateElapsedTime(timer: {
  startedAt: string
  elapsed: number
  pausedAt?: string
}): number {
  const startTime = new Date(timer.startedAt).getTime()
  const now = Date.now()

  if (timer.pausedAt) {
    // Timer is paused - return elapsed time up to pause point
    const pauseTime = new Date(timer.pausedAt).getTime()
    return timer.elapsed + (pauseTime - startTime)
  } else {
    // Timer is running - return current elapsed time
    return timer.elapsed + (now - startTime)
  }
}

export function useFocusTimerDisplay() {
  const activeTimer = useAtomValue(activeFocusTimerAtom)
  const status = useAtomValue(focusTimerStatusAtom)
  const task = useAtomValue(activeFocusTaskAtom)
  const stopTimer = useSetAtom(stopFocusTimerAtom)

  // Local state for timer display
  const [displayTime, setDisplayTime] = useState("0:00")

  // Update display time every second when timer is running
  useEffect(() => {
    if (!activeTimer) {
      setDisplayTime("0:00")
      return
    }

    // Calculate and set initial display time
    const updateDisplay = () => {
      const elapsedMs = calculateElapsedTime(activeTimer)
      setDisplayTime(formatElapsedTime(elapsedMs))
    }

    updateDisplay() // Update immediately

    if (status === "running") {
      const interval = setInterval(updateDisplay, 1000)
      return () => clearInterval(interval)
    }
  }, [activeTimer, status])

  // Stop timer when task is completed
  useEffect(() => {
    if (task?.completed && activeTimer && status !== "stopped") {
      stopTimer(task.id)
    }
  }, [task?.completed, activeTimer, status, stopTimer, task?.id])

  return {
    activeTimer,
    status,
    task,
    displayTime,
  }
}
