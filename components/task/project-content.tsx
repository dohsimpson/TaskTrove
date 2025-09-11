"use client"

import React from "react"
import { useAtomValue, useSetAtom } from "jotai"
import { Folder, Inbox } from "lucide-react"
import { cn, isTaskInInbox } from "@/lib/utils"
import { projectsAtom, updateTaskAtom } from "@/lib/atoms"
import type { Task, ProjectId } from "@/lib/types"
import { INBOX_PROJECT_ID } from "@/lib/types"

interface ProjectContentProps {
  // Mode 1: Task-based (for TaskItem)
  task?: Task
  // Mode 2: Callback-based (for QuickAdd)
  selectedProjectId?: ProjectId
  onUpdate?: (projectId: ProjectId) => void
  className?: string
}

export function ProjectContent({
  task,
  selectedProjectId,
  onUpdate,
  className,
}: ProjectContentProps) {
  const allProjects = useAtomValue(projectsAtom)
  const updateTask = useSetAtom(updateTaskAtom)

  // Determine current project based on mode
  const currentProjectId = task?.projectId || selectedProjectId
  const currentProject = allProjects.find((p) => p.id === currentProjectId)

  // Check if currently in inbox (either no projectId or INBOX_PROJECT_ID)
  const isInboxSelected = isTaskInInbox(currentProjectId)

  const handleProjectSelect = (projectId: ProjectId) => {
    if (onUpdate) {
      // Callback mode (QuickAdd)
      onUpdate(projectId)
    } else if (task) {
      // Task mode (TaskItem)
      updateTask({ updateRequest: { id: task.id, projectId } })
    }
  }

  const handleInboxSelect = () => {
    if (onUpdate) {
      // Callback mode (QuickAdd)
      onUpdate(INBOX_PROJECT_ID)
    } else if (task) {
      // Task mode (TaskItem)
      updateTask({ updateRequest: { id: task.id, projectId: INBOX_PROJECT_ID } })
    }
  }

  return (
    <div className={cn("py-1", className)}>
      {/* Projects List */}
      {allProjects.length > 0 && (
        <div className="space-y-1">
          {allProjects.map((project) => (
            <div
              key={project.id}
              className={cn(
                "flex items-center gap-3 rounded-md cursor-pointer hover:bg-accent/50 transition-all duration-200 p-2",
                project.id === currentProject?.id && "bg-accent",
              )}
              onClick={() => handleProjectSelect(project.id)}
            >
              <Folder className="h-4 w-4" style={{ color: project.color }} />
              <span className="text-sm font-medium flex-1">{project.name}</span>
            </div>
          ))}
        </div>
      )}

      {/* Separator */}
      {allProjects.length > 0 && (
        <div className="my-1">
          <div className="bg-border h-px mx-1" />
        </div>
      )}

      {/* Inbox Option */}
      <div className="space-y-1">
        <div
          className={cn(
            "flex items-center gap-3 rounded-md cursor-pointer hover:bg-accent/50 transition-all duration-200 p-2",
            isInboxSelected && "bg-accent",
          )}
          onClick={handleInboxSelect}
        >
          <Inbox className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium flex-1">No Project (Inbox)</span>
        </div>
      </div>
    </div>
  )
}
