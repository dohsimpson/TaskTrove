"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Calendar } from "@/components/ui/custom/calendar"
import { Clock } from "lucide-react"
import { useAtomValue } from "jotai"
import { settingsAtom } from "@tasktrove/atoms/data/base/atoms"
import { formatDateDisplay } from "@/lib/utils/task-date-formatter"
import type { TaskId } from "@tasktrove/types/id"

interface Task {
  id: TaskId
  title: string
  dueDate?: Date
}

interface TaskScheduleDialogProps {
  task: Task | null
  isOpen: boolean
  onClose: () => void
  onSchedule: (taskId: TaskId, date: Date | undefined, type: string) => void
}

export function TaskScheduleDialog({ task, isOpen, onClose, onSchedule }: TaskScheduleDialogProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(task?.dueDate)
  const settings = useAtomValue(settingsAtom)
  const preferDayMonthFormat = Boolean(settings.general.preferDayMonthFormat)

  // Keep calendar in sync when the dialog opens for a different task or when the
  // task's due date changes. Otherwise the calendar can stay on the previously
  // viewed month (commonly "today"), causing January dates to render while December
  // is still shown.
  useEffect(() => {
    setSelectedDate(task?.dueDate)
  }, [task?.id, task?.dueDate, isOpen])

  const handleQuickSchedule = (type: string) => {
    if (!task) return

    const today = new Date()
    let date: Date | undefined

    switch (type) {
      case "today":
        date = today
        break
      case "tomorrow":
        date = new Date(today.getTime() + 24 * 60 * 60 * 1000)
        break
      case "next-week": {
        const nextWeek = new Date(today)
        nextWeek.setDate(today.getDate() + 7)
        date = nextWeek
        break
      }
      case "remove":
        date = undefined
        break
      default:
        return
    }

    onSchedule(task.id, date, type)
    onClose()
  }

  const handleCustomDateSubmit = () => {
    if (!task) return
    onSchedule(task.id, selectedDate, "custom")
    onClose()
  }

  if (!task) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Schedule Task: {task.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Quick Options */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Quick Schedule</label>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={() => handleQuickSchedule("today")}>
                Today
              </Button>
              <Button variant="outline" onClick={() => handleQuickSchedule("tomorrow")}>
                Tomorrow
              </Button>
              <Button variant="outline" onClick={() => handleQuickSchedule("next-week")}>
                Next Week
              </Button>
              {task.dueDate && (
                <Button
                  variant="outline"
                  onClick={() => handleQuickSchedule("remove")}
                  className="text-red-600"
                >
                  Remove Date
                </Button>
              )}
            </div>
          </div>

          {/* Custom Date */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Custom Date</label>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="rounded-md border"
            />
          </div>

          <div className="flex justify-between">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleCustomDateSubmit}>
              {selectedDate
                ? `Schedule for ${formatDateDisplay(selectedDate, {
                    includeYear: true,
                    preferDayMonthFormat,
                  })}`
                : "Remove due date"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
