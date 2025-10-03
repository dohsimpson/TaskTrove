"use client"

import React, { useState } from "react"
import { useAtomValue, useSetAtom } from "jotai"
import { useTranslation } from "@tasktrove/i18n"
import { Coffee, Play, Pause, Square } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ContentPopover } from "@/components/ui/content-popover"
import {
  isTaskTimerActiveAtom,
  startFocusTimerAtom,
  pauseFocusTimerAtom,
  stopFocusTimerAtom,
  tasksAtom,
} from "@/lib/atoms"
import { useFocusTimerDisplay } from "@/hooks/use-focus-timer-display"
import type { TaskId } from "@/lib/types"

interface FocusTimerPopoverProps {
  taskId: TaskId
  children: React.ReactNode
  className?: string
  onOpenChange?: (open: boolean) => void
}

function FocusTimerContent({ taskId }: { taskId: TaskId }) {
  // Translation setup
  const { t } = useTranslation("task")

  const tasks = useAtomValue(tasksAtom)
  const isTaskTimerActive = useAtomValue(isTaskTimerActiveAtom)
  const { activeTimer, status, displayTime } = useFocusTimerDisplay()
  const startTimer = useSetAtom(startFocusTimerAtom)
  const pauseTimer = useSetAtom(pauseFocusTimerAtom)
  const stopTimer = useSetAtom(stopFocusTimerAtom)

  const task = tasks.find((t) => t.id === taskId)
  const isThisTaskActive = isTaskTimerActive(taskId)
  const isThisTaskRunning = isThisTaskActive && status === "running"
  const isThisTaskPaused = isThisTaskActive && status === "paused"

  const handleStart = () => {
    startTimer(taskId)
  }

  const handlePause = () => {
    pauseTimer(taskId)
  }

  const handleResume = () => {
    startTimer(taskId)
  }

  const handleStop = () => {
    stopTimer(taskId)
  }

  return (
    <div className="space-y-3 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Coffee className="h-4 w-4" />
          <span className="font-medium text-sm">{t("focusTimer.title", "Focus Timer")}</span>
        </div>
        <span className="text-xs text-muted-foreground">
          {isThisTaskRunning
            ? t("focusTimer.running", "Running")
            : isThisTaskPaused
              ? t("focusTimer.paused", "Paused")
              : t("focusTimer.ready", "Ready")}
        </span>
      </div>

      {/* Task Info */}
      {task && (
        <div className="border-b pb-3">
          <p className="text-sm font-medium text-foreground mb-1">
            {t("focusTimer.task", "Task:")}
          </p>
          <p className="text-sm text-muted-foreground line-clamp-2">{task.title}</p>
        </div>
      )}

      {/* Timer Info */}
      {activeTimer && (
        <div className="text-center py-2">
          <div className="text-lg font-mono font-medium text-foreground">{displayTime}</div>
          <div className="text-xs text-muted-foreground mt-1">
            {isThisTaskRunning
              ? t("focusTimer.running", "Running")
              : isThisTaskPaused
                ? t("focusTimer.paused", "Paused")
                : t("focusTimer.stopped", "Stopped")}
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center justify-center gap-2 pt-2">
        {!isThisTaskActive ? (
          <Button
            variant="default"
            size="sm"
            onClick={handleStart}
            className="flex items-center gap-2"
          >
            <Coffee className="h-3 w-3" />
            {t("focusTimer.startTimer", "Start Timer")}
          </Button>
        ) : (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={isThisTaskRunning ? handlePause : handleResume}
              className="flex items-center gap-1"
            >
              {isThisTaskRunning ? (
                <>
                  <Pause className="h-3 w-3" />
                  {t("focusTimer.pause", "Pause")}
                </>
              ) : (
                <>
                  <Play className="h-3 w-3" />
                  {t("focusTimer.resume", "Resume")}
                </>
              )}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleStop}
              className="flex items-center gap-1 hover:bg-red-50 hover:text-red-700 hover:border-red-200"
            >
              <Square className="h-3 w-3" />
              {t("focusTimer.stop", "Stop")}
            </Button>
          </>
        )}
      </div>
    </div>
  )
}

export function FocusTimerPopover({
  taskId,
  children,
  className,
  onOpenChange,
}: FocusTimerPopoverProps) {
  const [open, setOpen] = useState(false)

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    onOpenChange?.(newOpen)
  }

  return (
    <ContentPopover
      open={open}
      onOpenChange={handleOpenChange}
      content={<FocusTimerContent taskId={taskId} />}
      className="w-72 p-0"
      align="start"
    >
      <div className={className}>{children}</div>
    </ContentPopover>
  )
}
