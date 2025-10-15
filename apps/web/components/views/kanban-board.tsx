"use client"

import { SelectionToolbar } from "@/components/task/selection-toolbar"
import { ProjectViewToolbar } from "@/components/task/project-view-toolbar"
import { Section } from "@/components/task/section"
import type { Project } from "@/lib/types"

interface KanbanBoardProps {
  project?: Project
}

export function KanbanBoard({ project }: KanbanBoardProps) {
  // Calculate responsive column classes based on number of columns
  const getColumnClasses = () => {
    const columnCount = project?.sections.length || 0
    if (columnCount === 0) return "w-full h-full my-1"
    if (columnCount === 1) return "w-full h-full my-1"
    // For 5+ columns, use flex with min-width
    return "w-full h-full my-1 sm:flex-1 sm:min-w-80"
  }

  return (
    <>
      {/* Selection Toolbar */}
      <SelectionToolbar />

      {/* Filter Controls, Search Input and Add Task Button */}
      <ProjectViewToolbar className="px-4 pt-3" />

      {/* Scrollable Kanban Columns */}
      <div className="flex-1 overflow-x-auto">
        <div
          className={`px-4 py-3 flex flex-col sm:flex-row gap-2 h-full ${(project?.sections.length || 0) <= 1 ? "" : "sm:min-w-max"}`}
        >
          {project?.sections.map((section, index) => (
            <Section
              key={section.id}
              variant="kanban"
              isCollapsible={false}
              sectionId={section.id}
              projectId={project.id}
              droppableId={`kanban-${project.id}-section-${index}`}
              wrapperClassName={`${getColumnClasses()} flex min-w-60 flex-col rounded-lg border bg-muted dark:bg-background py-1 px-2 flex-1 h-full`}
            />
          ))}
        </div>
      </div>
    </>
  )
}
