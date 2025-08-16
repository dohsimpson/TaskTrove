"use client"

import React from "react"
import { useAtomValue, useSetAtom } from "jotai"
import { Folder } from "lucide-react"
import { cn } from "@/lib/utils"
import { sortedProjectsAtom, updateTaskAtom } from "@/lib/atoms"
import type { Task, ProjectId } from "@/lib/types"

interface ProjectContentProps {
  task: Task
  mode?: "inline" | "popover"
  className?: string
}

export function ProjectContent({ task, mode = "inline", className }: ProjectContentProps) {
  const allProjects = useAtomValue(sortedProjectsAtom)
  const updateTask = useSetAtom(updateTaskAtom)

  const currentProject = allProjects.find((p) => p.id === task.projectId)

  const handleProjectSelect = (projectId: ProjectId) => {
    updateTask({ updateRequest: { id: task.id, projectId } })
  }

  return (
    <div className={cn("space-y-3", mode === "popover" && "p-4", className)}>
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
