"use client"

import { useAtomValue, useSetAtom } from "jotai"
import { Timer, Play, Pause, Square } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  isTaskTimerActiveAtom,
  focusTimerStatusAtom,
  startFocusTimerAtom,
  pauseFocusTimerAtom,
  stopFocusTimerAtom,
  activeFocusTimerAtom,
} from "@/lib/atoms"
import type { TaskId } from "@/lib/types"
import { cn } from "@/lib/utils"

interface FocusTimerButtonProps {
  taskId: TaskId
  className?: string
  variant?: "default" | "compact" | "kanban"
}

export function FocusTimerButton({
  taskId,
  className,
  variant = "default",
}: FocusTimerButtonProps) {
  const isTaskTimerActive = useAtomValue(isTaskTimerActiveAtom)
  const timerStatus = useAtomValue(focusTimerStatusAtom)
  const activeTimer = useAtomValue(activeFocusTimerAtom)
  const startTimer = useSetAtom(startFocusTimerAtom)
  const pauseTimer = useSetAtom(pauseFocusTimerAtom)
  const stopTimer = useSetAtom(stopFocusTimerAtom)

  const isThisTaskActive = isTaskTimerActive(taskId)
  const isThisTaskRunning = isThisTaskActive && timerStatus === "running"
  const isThisTaskPaused = isThisTaskActive && timerStatus === "paused"

  // Sizing based on variant to match TaskActionsMenu
  const isCompact = variant === "compact" || variant === "kanban"
  const buttonSize = isCompact ? "h-5 w-5" : "h-6 w-6"
  const iconSize = isCompact ? "h-3.5 w-3.5" : "h-3 w-3"

  const handleTimerClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!isThisTaskActive) {
      // Start timer for this task
      startTimer(taskId)
    } else if (isThisTaskRunning) {
      // Pause timer
      pauseTimer(taskId)
    } else if (isThisTaskPaused) {
      // Resume timer (start again)
      startTimer(taskId)
    }
  }

  const handleStopClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    stopTimer(taskId)
  }

  // Don't show button if another task has an active timer
  if (activeTimer && activeTimer.taskId !== taskId) {
    return null
  }

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleTimerClick}
        className={cn(
          buttonSize,
          "p-0 opacity-60 hover:opacity-100 transition-opacity",
          isThisTaskRunning && "text-green-600 opacity-100",
          isThisTaskPaused && "text-yellow-600 opacity-100",
        )}
        title={
          !isThisTaskActive
            ? "Start focus timer"
            : isThisTaskRunning
              ? "Pause timer"
              : "Resume timer"
        }
      >
        {!isThisTaskActive ? (
          <Timer className={iconSize} />
        ) : isThisTaskRunning ? (
          <Pause className={iconSize} />
        ) : (
          <Play className={iconSize} />
        )}
      </Button>

      {isThisTaskActive && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleStopClick}
          className={cn(
            buttonSize,
            "p-0 opacity-60 hover:opacity-100 hover:text-red-600 transition-all",
          )}
          title="Stop timer"
        >
          <Square className={iconSize} />
        </Button>
      )}
    </div>
  )
}
