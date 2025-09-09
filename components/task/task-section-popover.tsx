"use client"

import { useAtomValue, useSetAtom } from "jotai"
import { Square, SquareX } from "lucide-react"

import { CustomizablePopover, PopoverSection } from "@/components/ui/customizable-popover"
import { projectsAtom } from "@/lib/atoms"
import { updateTaskAtom } from "@/lib/atoms/core/tasks"
import type { TaskId, ProjectSection, SectionId, ProjectId } from "@/lib/types"
import { createSectionId, createTaskId } from "@/lib/types"

// Constants
const NO_SECTION_OPTION_ID = "no-section" as const
const DEFAULT_SECTION_COLOR = "#6b7280" as const

interface TaskSectionPopoverProps {
  taskId?: TaskId
  projectId?: ProjectId
  onUpdate?: (sectionId?: SectionId) => void
  children: React.ReactNode
  className?: string
  align?: "start" | "center" | "end"
  contentClassName?: string
}

export function TaskSectionPopover({
  taskId,
  projectId,
  onUpdate,
  children,
  className,
  align = "end",
  contentClassName = "w-48 p-1",
}: TaskSectionPopoverProps) {
  const projects = useAtomValue(projectsAtom)
  const updateTask = useSetAtom(updateTaskAtom)

  const getPopoverSections = (): PopoverSection[] => {
    const handleSectionSelect = (sectionId?: SectionId) => {
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
      // Return empty sections array when no project is found
      // This prevents the popover from showing any options
      return []
    }

    const options = [
      // "No section" option
      {
        id: NO_SECTION_OPTION_ID,
        label: "No section",
        icon: <SquareX className="w-3 h-3 text-muted-foreground" />,
        onClick: () => handleSectionSelect(undefined),
      },
      // Project sections - with error handling for malformed sections
      ...(project.sections || [])
        .filter((section: ProjectSection) => {
          // Filter out any malformed sections
          return section && section.id && section.name
        })
        .map((section: ProjectSection) => {
          try {
            return {
              id: String(section.id), // Convert to string to match PopoverOption interface
              label: section.name,
              icon: (
                <Square
                  className="w-3 h-3"
                  style={{ color: section.color || DEFAULT_SECTION_COLOR }}
                />
              ),
              onClick: () => handleSectionSelect(createSectionId(section.id)),
            }
          } catch (error) {
            console.warn("Error processing section:", section, error)
            return null
          }
        })
        .filter(
          (option): option is NonNullable<typeof option> => option !== null && option !== undefined,
        ), // Remove any null entries from failed processing
    ]

    return [{ options }]
  }

  return (
    <CustomizablePopover
      sections={getPopoverSections()}
      contentClassName={contentClassName}
      align={align}
    >
      <div className={className}>{children}</div>
    </CustomizablePopover>
  )
}
