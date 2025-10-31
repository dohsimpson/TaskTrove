"use client"

import React from "react"
import { useAtomValue, useSetAtom } from "jotai"
import { Square, SquareX } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ContentPopover } from "@/components/ui/content-popover"
import { projectsAtom } from "@tasktrove/atoms/data/base/atoms"
import { updateTaskAtom } from "@tasktrove/atoms/core/tasks"
import type { TaskId, ProjectSection, GroupId, ProjectId } from "@/lib/types"
import { createGroupId, createTaskId } from "@/lib/types"
import { DEFAULT_SECTION_COLOR } from "@tasktrove/constants"

interface TaskSectionPopoverProps {
  taskId?: TaskId
  projectId?: ProjectId
  onUpdate?: (sectionId?: GroupId) => void
  children: React.ReactNode
  className?: string
  align?: "start" | "center" | "end"
  contentClassName?: string
  triggerMode?: "click" | "hover"
}

export function TaskSectionPopover({
  taskId,
  projectId,
  onUpdate,
  children,
  className,
  align = "end",
  contentClassName = "w-48 p-1",
  triggerMode,
}: TaskSectionPopoverProps) {
  const projects = useAtomValue(projectsAtom)
  const updateTask = useSetAtom(updateTaskAtom)

  const handleSectionSelect = (sectionId?: GroupId) => {
    if (onUpdate) {
      onUpdate(sectionId)
    } else if (taskId) {
      updateTask({
        updateRequest: {
          id: createTaskId(taskId),
          sectionId: sectionId,
        },
      })
    }
  }

  // Find the project to get its sections
  const project = projectId ? projects.find((p) => p.id === projectId) : null

  if (!project) {
    // Return empty content when no project is found
    const emptyContent = (
      <div className="p-2 text-center text-muted-foreground text-sm">No sections available</div>
    )

    return (
      <ContentPopover
        content={emptyContent}
        className={contentClassName}
        align={align}
        triggerMode={triggerMode}
      >
        <div className={className}>{children}</div>
      </ContentPopover>
    )
  }

  // Create the sections content directly
  const sectionsContent = (
    <div className="space-y-0.5">
      {/* "No section" option */}
      <Button
        variant="ghost"
        size="sm"
        className="w-full justify-start h-8"
        onClick={() => handleSectionSelect(undefined)}
      >
        <SquareX className="w-3 h-3 mr-2 text-muted-foreground" />
        <span>No section</span>
      </Button>

      {/* Project sections - with error handling for malformed sections */}
      {project.sections
        .filter((section: ProjectSection) => {
          // Filter out any malformed sections
          return section.id && section.name
        })
        .map((section: ProjectSection) => {
          try {
            return (
              <Button
                key={section.id}
                variant="ghost"
                size="sm"
                className="w-full justify-start h-8"
                onClick={() => handleSectionSelect(createGroupId(section.id))}
              >
                <Square
                  className="w-3 h-3 mr-2"
                  style={{ color: section.color || DEFAULT_SECTION_COLOR }}
                />
                <span>{section.name}</span>
              </Button>
            )
          } catch (error) {
            console.warn("Error processing section:", section, error)
            return null
          }
        })
        .filter((button): button is NonNullable<typeof button> => button !== null)}
    </div>
  )

  return (
    <ContentPopover
      content={sectionsContent}
      className={contentClassName}
      align={align}
      triggerMode={triggerMode}
    >
      <div className={className}>{children}</div>
    </ContentPopover>
  )
}
