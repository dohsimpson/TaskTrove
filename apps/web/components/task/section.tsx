"use client"

import { useCallback } from "react"
import { useAtomValue, useSetAtom } from "jotai"
import { projectAtoms, updateProjectsAtom } from "@tasktrove/atoms/core/projects"
import { taskAtoms, updateTasksAtom } from "@tasktrove/atoms/core/tasks"
import { stopEditingSectionAtom, currentRouteContextAtom } from "@tasktrove/atoms/ui/navigation"
import {
  currentViewStateAtom,
  collapsedSectionsAtom,
  toggleSectionCollapseAtom,
} from "@tasktrove/atoms/ui/views"
import { applyViewStateFilters } from "@tasktrove/atoms/utils/view-filters"
import { sortTasksByViewState } from "@tasktrove/atoms/utils/view-sorting"
import type { ProjectId, GroupId, Task, TaskId, Project } from "@/lib/types"
import { createTaskId } from "@/lib/types"
import { EditableSectionHeader } from "./editable-section-header"
import { getDefaultSectionId } from "@tasktrove/types/defaults"
import { VirtualizedTaskList } from "./virtualized-task-list"
import { DropTargetElement } from "./project-sections-view-helper"
import { Collapsible, CollapsibleContent } from "@/components/ui/custom/animated-collapsible"
import { ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ElementDropTargetEventBasePayload } from "@atlaskit/pragmatic-drag-and-drop/element/adapter"
import type { Instruction } from "@atlaskit/pragmatic-drag-and-drop-hitbox/list-item"
import { extractDropPayload, reorderItems } from "@tasktrove/dom-utils"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { useAddTaskToSection } from "@/hooks/use-add-task-to-section"
import { toast } from "sonner"

interface SectionProps {
  sectionId: GroupId
  projectId: ProjectId
  droppableId: string
  wrapperClassName?: string
  variant?: "default" | "compact" | "kanban" | "calendar" | "subtask"
  emptyState?: React.ReactNode
  isCollapsible?: boolean
}

// Pure function for testing - calculates the target section items after drop
export function calculateTargetSectionItems(
  currentSectionItems: TaskId[],
  draggedTaskIds: TaskId[],
  targetTaskId: TaskId,
  instruction: Instruction,
): TaskId[] {
  // Check if all dragged tasks are from the current section
  const draggedTasksFromCurrentSection = draggedTaskIds.every((id) =>
    currentSectionItems.includes(id),
  )

  if (draggedTasksFromCurrentSection) {
    // Same section reordering: use reorderItems
    const result = reorderItems(
      currentSectionItems,
      draggedTaskIds,
      targetTaskId,
      instruction,
      (id) => String(id),
    )
    if (!result) return currentSectionItems
    return result
  } else {
    // Cross-section move: only handle reorder-before and reorder-after operations
    if (instruction.operation !== "reorder-before" && instruction.operation !== "reorder-after") {
      return currentSectionItems
    }

    // Manually insert dragged tasks at correct position
    const targetIndex = currentSectionItems.findIndex((id) => id === targetTaskId)
    if (targetIndex === -1) return currentSectionItems

    const insertIndex = instruction.operation === "reorder-after" ? targetIndex + 1 : targetIndex

    // Create new array with dragged tasks inserted at correct position
    const newItems = [...currentSectionItems]
    newItems.splice(insertIndex, 0, ...draggedTaskIds)
    return newItems
  }
}

export function Section({
  sectionId,
  projectId,
  droppableId,
  wrapperClassName,
  variant,
  emptyState,
  isCollapsible = true,
}: SectionProps) {
  // Get project data
  const getProjectById = useAtomValue(projectAtoms.derived.projectById)
  const project = getProjectById(projectId)
  const getOrderedTasksForSection = useAtomValue(taskAtoms.derived.orderedTasksBySection)
  const currentViewState = useAtomValue(currentViewStateAtom)
  const routeContext = useAtomValue(currentRouteContextAtom)
  const taskById = useAtomValue(taskAtoms.derived.taskById)
  const collapsedSections = useAtomValue(collapsedSectionsAtom)
  const toggleSectionCollapse = useSetAtom(toggleSectionCollapseAtom)
  const addTaskToSection = useAddTaskToSection()

  // Find section
  const section = project?.sections.find((s) => s.id === sectionId)

  // Get tasks for this section
  const baseTasks = getOrderedTasksForSection(projectId, sectionId)

  // Apply filters and sorting
  const filteredTasks = applyViewStateFilters(baseTasks, currentViewState, routeContext.viewId)
  const tasks = sortTasksByViewState([...filteredTasks], currentViewState)
  const sortedTaskIds = tasks.map((task) => task.id)

  // Collapse state
  const isCollapsed = collapsedSections.includes(sectionId)

  // Actions
  const renameSection = useSetAtom(projectAtoms.actions.renameSection)
  const stopEditingSection = useSetAtom(stopEditingSectionAtom)
  const updateProjects = useSetAtom(updateProjectsAtom)
  const updateTasks = useSetAtom(updateTasksAtom)

  // Handler for dropping tasks onto this section
  const handleDropTaskToSection = useCallback(
    async (args: ElementDropTargetEventBasePayload) => {
      // Check if sortBy is not "default" - if so, disallow drag and drop
      if (currentViewState.sortBy !== "default") {
        toast.error(
          "Drag and drop is disabled when sorting is applied. Please change sort to 'default' to enable drag and drop.",
        )
        return
      }

      if (!project) return

      // Extract task IDs from drag source
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      const taskIds = (Array.isArray(args.source.data.ids) ? args.source.data.ids : []) as TaskId[]
      if (taskIds.length === 0) return

      const tasksToMove = taskIds
        .map((id) => taskById.get(id))
        .filter((t): t is Task => t !== undefined)
      const tasksNeedingProjectUpdate = tasksToMove.filter((t) => t.projectId !== project.id)
      if (tasksNeedingProjectUpdate.length > 0) {
        await updateTasks(
          tasksNeedingProjectUpdate.map((task) => ({
            id: task.id,
            projectId: project.id,
            sectionId: sectionId,
          })),
        )
      }

      // Get unique project IDs that need updating
      const affectedProjectIds = new Set<ProjectId>([project.id])
      for (const task of tasksToMove) {
        if (task.projectId) {
          affectedProjectIds.add(task.projectId)
        }
      }

      // Remove taskIds from affected projects' sections
      const projectsMap = new Map<ProjectId, Project>()
      for (const projectId of affectedProjectIds) {
        const proj = getProjectById(projectId)
        if (proj) {
          projectsMap.set(projectId, {
            ...proj,
            sections: proj.sections.map((section) => ({
              ...section,
              items: section.items.filter((id) => !taskIds.includes(id)),
            })),
          })
        }
      }

      // Add taskIds to the target section (at the end)
      const targetProject = projectsMap.get(project.id)
      if (!targetProject) return

      const targetSectionIndex = targetProject.sections.findIndex((s) => s.id === sectionId)
      if (targetSectionIndex < 0) return

      const targetSection = targetProject.sections[targetSectionIndex]
      if (!targetSection) return

      targetProject.sections[targetSectionIndex] = {
        ...targetSection,
        items: [...targetSection.items, ...taskIds],
      }

      // Batch update all projects
      await updateProjects(
        Array.from(projectsMap.values()).map((proj) => ({
          id: proj.id,
          sections: proj.sections,
        })),
      )
    },
    [project, updateProjects, updateTasks, taskById, getProjectById, sectionId, currentViewState],
  )

  // Handler for dropping tasks onto other tasks (reordering within section)
  const handleDropTaskToListItem = useCallback(
    async (args: ElementDropTargetEventBasePayload) => {
      // Check if sortBy is not "default" - if so, disallow drag and drop
      if (currentViewState.sortBy !== "default") {
        toast.error(
          "Drag and drop is disabled when sorting is applied. Please change sort to 'default' to enable drag and drop.",
        )
        return
      }

      if (!project) return

      // Extract and validate drop payload
      const payload = extractDropPayload(args)
      if (!payload) return

      const taskIds = payload.draggedIds.map((id) => createTaskId(id))
      const { instruction } = payload
      const targetTaskId = createTaskId(payload.targetId)

      // Find the target section (should be this section)
      const targetSection = project.sections.find((s) => s.id === sectionId)
      if (!targetSection) return

      // Use calculateTargetSectionItems to handle both same-section and cross-section moves
      const reorderedItems = calculateTargetSectionItems(
        targetSection.items,
        taskIds,
        targetTaskId,
        instruction,
      )

      const tasksToMove = taskIds
        .map((id) => taskById.get(id))
        .filter((t): t is Task => t !== undefined)
      const tasksNeedingProjectUpdate = tasksToMove.filter((t) => t.projectId !== project.id)
      if (tasksNeedingProjectUpdate.length > 0) {
        await updateTasks(
          tasksNeedingProjectUpdate.map((task) => ({
            id: task.id,
            projectId: project.id,
            sectionId: sectionId,
          })),
        )
      }

      // Get unique project IDs that need updating
      const affectedProjectIds = new Set<ProjectId>([project.id])
      for (const task of tasksToMove) {
        if (task.projectId) {
          affectedProjectIds.add(task.projectId)
        }
      }

      // Update all affected projects
      const projectsMap = new Map<ProjectId, Project>()
      for (const projectId of affectedProjectIds) {
        const proj = getProjectById(projectId)
        if (proj) {
          if (projectId === project.id) {
            // Update target section with reordered items
            projectsMap.set(projectId, {
              ...proj,
              sections: proj.sections.map((section) =>
                section.id === sectionId
                  ? { ...section, items: reorderedItems }
                  : {
                      ...section,
                      items: section.items.filter((id) => !taskIds.includes(id)),
                    },
              ),
            })
          } else {
            // Remove tasks from other projects' sections
            projectsMap.set(projectId, {
              ...proj,
              sections: proj.sections.map((section) => ({
                ...section,
                items: section.items.filter((id) => !taskIds.includes(id)),
              })),
            })
          }
        }
      }

      // Batch update all projects
      await updateProjects(
        Array.from(projectsMap.values()).map((proj) => ({
          id: proj.id,
          sections: proj.sections,
        })),
      )
    },
    [project, updateProjects, updateTasks, taskById, getProjectById, sectionId, currentViewState],
  )

  if (!section) return null

  const handleSaveEdit = (newName: string) => {
    const trimmedName = newName.trim()
    if (trimmedName && trimmedName !== section.name) {
      renameSection({
        projectId,
        sectionId,
        newSectionName: trimmedName,
        newSectionColor: section.color || "#808080",
      })
    }
    stopEditingSection()
  }

  const handleCancelEdit = () => {
    stopEditingSection()
  }

  const sectionDroppableId = `${droppableId}-section-${sectionId}`

  const handleToggleCollapse = () => {
    toggleSectionCollapse(sectionId)
  }

  // Determine if this is the default section
  const defaultSectionId = project ? getDefaultSectionId(project) : null
  const isDefaultSection = defaultSectionId === sectionId

  const headerContent = (
    <EditableSectionHeader
      sectionId={sectionId}
      sectionName={section.name}
      sectionColor={section.color || "#808080"}
      taskCount={tasks.length}
      isDefaultSection={isDefaultSection}
      onSaveEdit={handleSaveEdit}
      onCancelEdit={handleCancelEdit}
      className={cn("px-2 py-2", variant === "kanban" ? "border-b-2" : "border-t-2")}
      nameClassName="font-medium text-foreground"
      nameElement="h3"
      leftContent={
        <div className="flex items-center gap-2">
          {/* Collapse/expand chevron - only show when collapsible */}
          {isCollapsible && (
            <button
              type="button"
              onClick={handleToggleCollapse}
              className="flex items-center justify-center p-1 rounded hover:bg-muted-foreground/10 transition-colors"
              aria-label={isCollapsed ? "Expand section" : "Collapse section"}
            >
              <ChevronRight
                className={cn(
                  "h-4 w-4 transition-transform duration-200",
                  isCollapsed ? "rotate-0" : "rotate-90",
                )}
              />
            </button>
          )}
        </div>
      }
      rightContent={
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-foreground hover:bg-muted-foreground/10"
          onClick={(e) => {
            e.stopPropagation()
            addTaskToSection(projectId, sectionId)
          }}
        >
          <Plus className="h-4 w-4" />
        </Button>
      }
    />
  )

  const taskListContent = (
    <div className="py-2">
      {tasks.length === 0 ? (
        emptyState || (
          <div className="min-h-[120px] px-4 flex items-center justify-center text-muted-foreground">
            <span className="text-sm">No tasks in this section</span>
          </div>
        )
      ) : (
        <VirtualizedTaskList
          tasks={tasks}
          variant={variant ?? (currentViewState.compactView ? "compact" : "default")}
          sortedTaskIds={sortedTaskIds}
          onDropTaskToListItem={handleDropTaskToListItem}
        />
      )}
    </div>
  )

  return (
    <div className={wrapperClassName}>
      <DropTargetElement
        id={sectionDroppableId}
        options={{ type: "group", indicator: {}, testId: sectionDroppableId }}
        onDrop={handleDropTaskToSection}
      >
        {isCollapsible ? (
          <Collapsible
            open={!isCollapsed}
            onOpenChange={handleToggleCollapse}
            className="flex flex-col flex-1"
          >
            <div className="flex flex-col">
              {headerContent}
              <CollapsibleContent>{taskListContent}</CollapsibleContent>
            </div>
          </Collapsible>
        ) : (
          <div className="flex flex-col flex-1">
            {headerContent}
            {taskListContent}
          </div>
        )}
      </DropTargetElement>
    </div>
  )
}
