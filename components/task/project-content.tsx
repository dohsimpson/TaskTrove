"use client"

import React from "react"
import { useAtomValue, useSetAtom } from "jotai"
import { Folder } from "lucide-react"
import { cn } from "@/lib/utils"
import { projectsAtom, updateTaskAtom } from "@/lib/atoms"
import type { Task, ProjectId } from "@/lib/types"

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

  const handleProjectSelect = (projectId: ProjectId) => {
    if (onUpdate) {
      // Callback mode (QuickAdd)
      onUpdate(projectId)
    } else if (task) {
      // Task mode (TaskItem)
      updateTask({ updateRequest: { id: task.id, projectId } })
    }
  }

  return (
    <div className={cn("space-y-3", className)}>
      {/* Projects List */}
      {allProjects.length > 0 && (
        <div className="space-y-1 max-h-48 overflow-y-auto">
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

      {/* Empty State */}
      {allProjects.length === 0 && (
        <div className="text-center py-6 text-muted-foreground">
          <Folder className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No projects available</p>
          <p className="text-xs">Create a project first to organize your tasks</p>
        </div>
      )}
    </div>
  )
}
