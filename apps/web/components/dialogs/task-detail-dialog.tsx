"use client"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { TaskForm } from "@/components/task/task-form"
import { useAtomValue, useSetAtom } from "jotai"
import { showTaskPanelAtom } from "@tasktrove/atoms"
import { closeTaskPanelAtom, selectedTaskAtom } from "@/lib/atoms"

export function TaskDetailDialog() {
  // Dialog state atoms
  const open = useAtomValue(showTaskPanelAtom)
  const closeDialog = useSetAtom(closeTaskPanelAtom)
  const task = useAtomValue(selectedTaskAtom)

  if (!task) return null

  const handleSuccess = () => {
    closeDialog()
  }

  return (
    <Dialog open={open} onOpenChange={closeDialog}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Task</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <TaskForm task={task} onSuccess={handleSuccess} onCancel={closeDialog} />
        </div>
      </DialogContent>
    </Dialog>
  )
}
