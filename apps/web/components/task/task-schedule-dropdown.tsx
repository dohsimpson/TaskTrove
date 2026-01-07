"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Calendar } from "@/components/ui/custom/calendar"
import { Calendar as CalendarIcon } from "lucide-react"
import { useAtomValue } from "jotai"
import { settingsAtom } from "@tasktrove/atoms/data/base/atoms"
import { formatDateDisplay } from "@/lib/utils/task-date-formatter"
import type { TaskId } from "@tasktrove/types/id"

interface Task {
  id: TaskId
  title: string
  dueDate?: Date
}

interface TaskScheduleDropdownProps {
  task: Task
  onSchedule: (taskId: TaskId, date: Date | undefined, type: string) => void
  children: React.ReactNode
}

export function TaskScheduleDropdown({ task, onSchedule, children }: TaskScheduleDropdownProps) {
  const [showCustomDateDialog, setShowCustomDateDialog] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(task.dueDate)
  const settings = useAtomValue(settingsAtom)
  const preferDayMonthFormat = Boolean(settings.general.preferDayMonthFormat)

  // Sync local selection whenever the dialog opens for a different task or the
  // task's due date changes. Without this, the calendar keeps showing whatever
  // month/date was selected the first time the component mounted (often "today"),
  // which is why January due dates were opening on December.
  useEffect(() => {
    setSelectedDate(task.dueDate)
  }, [task.id, task.dueDate, showCustomDateDialog])

  const handleQuickSchedule = (type: string) => {
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
  }

  const handleCustomDateSubmit = () => {
    onSchedule(task.id, selectedDate, "custom")
    setShowCustomDateDialog(false)
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => handleQuickSchedule("today")}>Today</DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleQuickSchedule("tomorrow")}>
            Tomorrow
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleQuickSchedule("next-week")}>
            Next week
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setShowCustomDateDialog(true)}>
            <CalendarIcon className="h-4 w-4 mr-2" />
            Custom date...
          </DropdownMenuItem>
          {task.dueDate && (
            <DropdownMenuItem
              onClick={() => handleQuickSchedule("remove")}
              className="text-red-600"
            >
              Remove due date
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={showCustomDateDialog} onOpenChange={setShowCustomDateDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Schedule Task: {task.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Select due date</label>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                className="rounded-md border"
              />
            </div>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setShowCustomDateDialog(false)}>
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
    </>
  )
}
