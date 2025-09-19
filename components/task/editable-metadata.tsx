"use client"

import { useState } from "react"
import { Calendar, Flag, Folder } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { CustomizablePopover, type PopoverSection } from "@/components/ui/customizable-popover"
import { TaskDueDate } from "@/components/ui/custom/task-due-date"
import { cn } from "@/lib/utils"
import { getPriorityTextColor, getPriorityLabel } from "@/lib/color-utils"

interface Project {
  id: string
  name: string
  color: string
}

interface EditableMetadataProps {
  dueDate?: Date
  priority: 1 | 2 | 3 | 4
  projectId?: string
  projects: Project[]
  completed?: boolean
  recurring?: string
  onUpdate: (updates: { dueDate?: Date; priority?: 1 | 2 | 3 | 4; projectId?: string }) => void
}

export function EditableMetadata({
  dueDate,
  priority,
  projectId,
  projects,
  completed = false,
  recurring,
  onUpdate,
}: EditableMetadataProps) {
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [priorityPopoverOpen, setPriorityPopoverOpen] = useState(false)
  const [projectPopoverOpen, setProjectPopoverOpen] = useState(false)

  // Generate priority popover sections
  const getPrioritySections = (): PopoverSection[] => {
    return [
      {
        options: ([1, 2, 3] as const).map((p) => ({
          id: p,
          label: getPriorityLabel(p),
          icon: <Flag className={cn("h-3 w-3", getPriorityTextColor(p))} />,
          onClick: () => {
            onUpdate({ priority: p })
            setPriorityPopoverOpen(false)
          },
        })),
      },
      {
        options: [
          {
            id: 4,
            label: getPriorityLabel(4),
            icon: <Flag className={cn("h-3 w-3", getPriorityTextColor(4))} />,
            onClick: () => {
              onUpdate({ priority: 4 })
              setPriorityPopoverOpen(false)
            },
          },
        ],
      },
    ]
  }

  // Generate project popover sections
  const getProjectSections = (): PopoverSection[] => {
    return [
      {
        options: projects.map((proj) => ({
          id: proj.id,
          label: proj.name,
          icon: <Folder className="w-3 h-3" style={{ color: proj.color }} />,
          onClick: () => {
            onUpdate({ projectId: proj.id })
            setProjectPopoverOpen(false)
          },
        })),
      },
      {
        options: [
          {
            id: "no-project",
            label: "No project",
            icon: <div className="w-3 h-3 rounded-full bg-muted" />,
            onClick: () => {
              onUpdate({ projectId: undefined })
              setProjectPopoverOpen(false)
            },
          },
        ],
      },
    ]
  }

  const selectedProject = projects.find((p) => p.id === projectId)

  return (
    <div className="flex items-center justify-between text-sm px-4">
      {/* Due Date/Recurring */}
      <Popover open={showDatePicker} onOpenChange={setShowDatePicker}>
        <PopoverTrigger asChild>
          <span className="flex items-center gap-1 cursor-pointer hover:bg-accent hover:text-accent-foreground px-2 py-1 rounded-md transition-colors text-sm text-gray-500">
            {dueDate || recurring ? (
              <TaskDueDate dueDate={dueDate} recurring={recurring} completed={completed} />
            ) : (
              <>
                <Calendar className="h-3 w-3" />
                Add date
              </>
            )}
          </span>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <CalendarComponent
            mode="single"
            selected={dueDate}
            onSelect={(date) => {
              onUpdate({ dueDate: date })
              setShowDatePicker(false)
            }}
            initialFocus
          />
          {dueDate && (
            <div className="p-2 border-t">
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs"
                onClick={() => {
                  onUpdate({ dueDate: undefined })
                  setShowDatePicker(false)
                }}
              >
                Remove due date
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>

      {/* Priority */}
      <CustomizablePopover
        sections={getPrioritySections()}
        open={priorityPopoverOpen}
        onOpenChange={setPriorityPopoverOpen}
        contentClassName="w-36 p-1"
      >
        <span
          className={cn(
            "flex items-center gap-1 cursor-pointer hover:bg-accent hover:text-accent-foreground px-2 py-1 rounded-md transition-colors text-sm",
            getPriorityTextColor(priority),
          )}
        >
          <Flag className="h-3 w-3" />
          {priority < 4 ? `P${priority}` : "Add priority"}
        </span>
      </CustomizablePopover>

      {/* Project */}
      <CustomizablePopover
        sections={getProjectSections()}
        open={projectPopoverOpen}
        onOpenChange={setProjectPopoverOpen}
        contentClassName="w-48 p-1"
      >
        <span
          className={cn(
            "flex items-center gap-1 cursor-pointer hover:bg-accent hover:text-accent-foreground px-2 py-1 rounded-md transition-colors text-sm",
            selectedProject ? "text-gray-600" : "text-gray-500",
          )}
        >
          {selectedProject ? (
            <>
              <Folder className="w-3 h-3" style={{ color: selectedProject.color }} />
              {selectedProject.name}
            </>
          ) : (
            <>
              <Folder className="h-3 w-3" />
              Add project
            </>
          )}
        </span>
      </CustomizablePopover>
    </div>
  )
}
