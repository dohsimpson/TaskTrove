"use client"

import { CustomizablePopover, PopoverSection } from "@/components/ui/customizable-popover"
import { Folder } from "lucide-react"
import { useAtomValue } from "jotai"
import { updateTaskAtom } from "@/lib/atoms/core/tasks"
import type { TaskId, Project } from "@/lib/types"
import { useSetAtom } from "jotai"
import { createProjectId, createTaskId } from "@/lib/types"
import { orderedProjectsAtom } from "@/lib/atoms"

interface TaskProjectPopoverProps {
  taskId?: TaskId
  onUpdate?: (projectId?: string) => void
  children: React.ReactNode
  className?: string
  align?: "start" | "center" | "end"
  contentClassName?: string
}

export function TaskProjectPopover({
  taskId,
  onUpdate,
  children,
  className,
  align = "end",
  contentClassName = "w-48 p-1",
}: TaskProjectPopoverProps) {
  const projects = useAtomValue(orderedProjectsAtom)
  const updateTask = useSetAtom(updateTaskAtom)

  const getProjectSections = (): PopoverSection[] => {
    const handleProjectSelect = (projectId?: string) => {
      if (onUpdate) {
        onUpdate(projectId)
      } else if (taskId) {
        updateTask({
          updateRequest: {
            id: createTaskId(taskId),
            projectId: projectId ? createProjectId(projectId) : undefined,
          },
        })
      }
    }

    return [
      {
        options: projects.map((proj: Project) => ({
          id: proj.id,
          label: proj.name,
          icon: <Folder className="w-3 h-3" style={{ color: proj.color }} />,
          onClick: () => handleProjectSelect(proj.id),
        })),
      },
    ]
  }

  return (
    <CustomizablePopover
      sections={getProjectSections()}
      contentClassName={contentClassName}
      align={align}
    >
      <div className={className}>{children}</div>
    </CustomizablePopover>
  )
}
