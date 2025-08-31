"use client"

import { useSetAtom } from "jotai"
import { Timer, Pause, Play, Square } from "lucide-react"
import dynamic from "next/dynamic"
import { Button } from "@/components/ui/button"
import { ContentPopover } from "@/components/ui/content-popover"
import { pauseFocusTimerAtom, startFocusTimerAtom, stopFocusTimerAtom } from "@/lib/atoms"
import { cn } from "@/lib/utils"
import { useFocusTimerDisplay } from "@/hooks/use-focus-timer-display"

interface FocusTimerDisplayProps {
  className?: string
}

function FocusTimerDetailsContent() {
  const { activeTimer, status, task, displayTime } = useFocusTimerDisplay()
  const pauseTimer = useSetAtom(pauseFocusTimerAtom)
  const resumeTimer = useSetAtom(startFocusTimerAtom)
  const stopTimer = useSetAtom(stopFocusTimerAtom)

  if (!activeTimer) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        <p className="text-sm">No active focus timer</p>
      </div>
    )
  }

  const handlePauseResume = () => {
    if (status === "running") {
      pauseTimer(activeTimer.taskId)
    } else if (status === "paused") {
      resumeTimer(activeTimer.taskId)
    }
  }

  const handleStop = () => {
    stopTimer(activeTimer.taskId)
  }

  return (
    <div className="space-y-3 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Timer className="h-4 w-4" />
          <span className="font-medium text-sm">Focus Timer</span>
        </div>
        <span className="text-xs text-muted-foreground">
          {status === "running" ? "Running" : status === "paused" ? "Paused" : "Stopped"}
        </span>
      </div>

      {/* Timer Display */}
      <div className="text-center">
        <div className="text-2xl font-mono font-medium text-foreground">{displayTime}</div>
        <div className="text-sm text-muted-foreground mt-1">
          {status === "running" ? "Running" : status === "paused" ? "Paused" : "Stopped"}
        </div>
      </div>

      {/* Task Info */}
      {task && (
        <div className="border-t pt-3">
          <p className="text-sm font-medium text-foreground mb-1">Task:</p>
          <p className="text-sm text-muted-foreground line-clamp-2">{task.title}</p>
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center justify-center gap-2 pt-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handlePauseResume}
          className="flex items-center gap-1"
        >
          {status === "running" ? (
            <>
              <Pause className="h-3 w-3" />
              Pause
            </>
          ) : (
            <>
              <Play className="h-3 w-3" />
              Resume
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
          Stop
        </Button>
      </div>
    </div>
  )
}

function FocusTimerDisplayInner({ className }: FocusTimerDisplayProps) {
  const { activeTimer, status, task, displayTime } = useFocusTimerDisplay()

  if (!activeTimer) {
    return null
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <ContentPopover
        content={<FocusTimerDetailsContent />}
        className="w-80 p-0"
        align="end"
        side="top"
      >
        <Button
          variant="ghost"
          size="sm"
          className="flex items-center gap-2 h-auto px-2 py-1 hover:bg-transparent hover:text-foreground cursor-pointer"
        >
          <div className="flex items-center gap-1">
            <Timer
              className={cn(
                "w-4 h-4",
                status === "running"
                  ? "text-green-600"
                  : status === "paused"
                    ? "text-yellow-600"
                    : "text-muted-foreground",
              )}
            />
            <span className="font-mono font-medium text-foreground">{displayTime}</span>
          </div>
          {task && (
            <span className="text-xs max-w-32 truncate text-muted-foreground">{task.title}</span>
          )}
        </Button>
      </ContentPopover>
    </div>
  )
}

// Use ClientOnly pattern to prevent hydration mismatches with localStorage
export const FocusTimerDisplay = dynamic(() => Promise.resolve(FocusTimerDisplayInner), {
  ssr: false, // Disable SSR to prevent hydration mismatch with localStorage
})
