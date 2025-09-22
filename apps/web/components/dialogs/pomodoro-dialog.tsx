"use client"

import { useAtomValue, useSetAtom } from "jotai"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"
import { PomodoroTimer } from "@/components/productivity/pomodoro-timer"
import { showPomodoroAtom, closePomodoroAtom, selectedTaskAtom } from "@/lib/atoms/ui/dialogs"

export function PomodoroDialog() {
  // Dialog state atoms
  const open = useAtomValue(showPomodoroAtom)
  const closePomodoro = useSetAtom(closePomodoroAtom)
  const task = useAtomValue(selectedTaskAtom)

  return (
    <Dialog open={open} onOpenChange={closePomodoro}>
      <DialogContent className="sm:max-w-lg border-0 p-0 w-fit">
        <DialogHeader>
          <VisuallyHidden>
            <DialogTitle>
              {task ? `Pomodoro Timer - Working on: ${task.title}` : "Pomodoro Timer"}
            </DialogTitle>
          </VisuallyHidden>
        </DialogHeader>
        <PomodoroTimer
          taskId={task?.id}
          taskTitle={task?.title}
          onSessionComplete={() => {
            // Handle pomodoro completion
            closePomodoro()
          }}
        />
      </DialogContent>
    </Dialog>
  )
}
