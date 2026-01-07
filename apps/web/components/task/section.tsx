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
import { taskFocusVisibilityAtom, includeFocusedTask } from "@tasktrove/atoms/ui/task-focus"
import { selectedTaskIdAtom } from "@tasktrove/atoms/ui/selection"
import { applyViewStateFilters } from "@tasktrove/atoms/utils/view-filters"
import { sortTasksByViewState } from "@tasktrove/atoms/utils/view-sorting"
import type { Task, Project } from "@tasktrove/types/core"
import type { ProjectId, GroupId } from "@tasktrove/types/id"
import type { TaskId } from "@tasktrove/types/id"
import { createTaskId, createProjectId } from "@tasktrove/types/id"
import { FALLBACK_COLOR } from "@tasktrove/constants"
import { EditableSectionHeader } from "./editable-section-header"
import { getDefaultSectionId } from "@tasktrove/types/defaults"
import { VirtualizedTaskList } from "./virtualized-task-list"
import type { VirtualizedTaskListProps } from "./virtualized-task-list"
import { DropTargetElement } from "./project-sections-view-helper"
import { Collapsible, CollapsibleContent } from "@/components/ui/custom/animated-collapsible"
import { ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ElementDropTargetEventBasePayload } from "@atlaskit/pragmatic-drag-and-drop/element/adapter"
import {
  extractDropPayload,
  calculateTargetSectionItems,
  removeIdsFromProjects,
  insertIdsAtSectionEnd,
  replaceSectionItems,
} from "@tasktrove/dom-utils"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { useAddTaskToSection } from "@/hooks/use-add-task-to-section"

interface SectionProps {
  sectionId: GroupId
  projectId: ProjectId
  droppableId: string
  wrapperClassName?: string
  headerClassName?: string
  variant?: "default" | "compact" | "kanban" | "calendar" | "subtask"
  emptyState?: React.ReactNode
  isCollapsible?: boolean
  renderTaskItem?: VirtualizedTaskListProps["renderTaskItem"]
  showGaps?: boolean
}

// Re-exported for tests; implementation lives in @tasktrove/dom-utils
export { calculateTargetSectionItems }

export function Section({
  sectionId,
  projectId,
  droppableId,
  wrapperClassName,
  headerClassName,
  variant,
  emptyState,
  isCollapsible = true,
  renderTaskItem,
  showGaps,
}: SectionProps) {
  // Get project data
  const getProjectById = useAtomValue(projectAtoms.derived.projectById)
  const project = getProjectById(projectId)
  const getOrderedTasksForSection = useAtomValue(taskAtoms.derived.orderedTasksBySection)
  const currentViewState = useAtomValue(currentViewStateAtom)
  const routeContext = useAtomValue(currentRouteContextAtom)
  const taskById = useAtomValue(taskAtoms.derived.taskById)
  const collapsedSections = useAtomValue(collapsedSectionsAtom)
  const focusVisibility = useAtomValue(taskFocusVisibilityAtom)
  const selectedTaskId = useAtomValue(selectedTaskIdAtom)
  const toggleSectionCollapse = useSetAtom(toggleSectionCollapseAtom)
  const addTaskToSection = useAddTaskToSection()

  // Find section
  const section = project?.sections.find((s) => s.id === sectionId)

  // Get tasks for this section
  const baseTasks = getOrderedTasksForSection(projectId, sectionId)

  // Apply filters and sorting
  let filteredTasks = applyViewStateFilters(baseTasks, currentViewState, routeContext.viewId)
  filteredTasks = includeFocusedTask(
    filteredTasks,
    baseTasks,
    focusVisibility,
    selectedTaskId,
    routeContext.viewId,
  )

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

      const projects = Array.from(affectedProjectIds)
        .map((pid) => getProjectById(pid))
        .filter((p): p is Project => Boolean(p))

      const cleaned = removeIdsFromProjects(projects, taskIds)
      const targetProject = cleaned.find((p) => p.id === project.id)
      if (!targetProject) return

      const updatedTarget = insertIdsAtSectionEnd(targetProject, sectionId, taskIds)

      const merged = cleaned.map((proj) => (proj.id === project.id ? updatedTarget : proj))

      await updateProjects(
        merged.map((proj) => ({ id: createProjectId(proj.id), sections: proj.sections })),
      )
    },
    [project, updateProjects, updateTasks, taskById, getProjectById, sectionId],
  )

  // Handler for dropping tasks onto other tasks (reordering within section)
  const handleDropTaskToListItem = useCallback(
    async (args: ElementDropTargetEventBasePayload) => {
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

      const projects = Array.from(affectedProjectIds)
        .map((pid) => getProjectById(pid))
        .filter((p): p is Project => Boolean(p))

      const cleaned = removeIdsFromProjects(projects, taskIds)
      const targetProject = cleaned.find((p) => p.id === project.id)
      if (!targetProject) return

      const updatedTarget = replaceSectionItems(targetProject, sectionId, reorderedItems)

      const merged = cleaned.map((proj) => (proj.id === project.id ? updatedTarget : proj))

      await updateProjects(
        merged.map((proj) => ({ id: createProjectId(proj.id), sections: proj.sections })),
      )
    },
    [project, updateProjects, updateTasks, taskById, getProjectById, sectionId],
  )

  if (!section) return null

  const handleSaveEdit = (newName: string) => {
    const trimmedName = newName.trim()
    if (trimmedName && trimmedName !== section.name) {
      renameSection({
        projectId,
        sectionId,
        newSectionName: trimmedName,
        newSectionColor: section.color || FALLBACK_COLOR,
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
      sectionColor={section.color || FALLBACK_COLOR}
      taskCount={tasks.length}
      isDefaultSection={isDefaultSection}
      onSaveEdit={handleSaveEdit}
      onCancelEdit={handleCancelEdit}
      className={cn(
        "px-2 py-2 bg-background/60",
        variant === "kanban" ? "border-b-2 mb-2" : "border-t-2",
        headerClassName,
      )}
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
    <div className={cn("py-2", variant === "kanban" && "flex-1 min-h-0 overflow-y-auto py-0")}>
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
          listSectionId={sectionId}
          compactTitleEditable={variant === "compact" || currentViewState.compactView}
          renderTaskItem={renderTaskItem}
          showGaps={showGaps}
        />
      )}
    </div>
  )

  return (
    <div className={cn(wrapperClassName, variant === "kanban" && "min-h-0")}>
      <DropTargetElement
        id={sectionDroppableId}
        options={{
          type: "group",
          indicator: {},
          testId: sectionDroppableId,
          groupSectionId: sectionId,
        }}
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
          <div
            className={cn(
              "flex flex-col flex-1",
              variant === "kanban" && "min-h-0 overflow-hidden",
            )}
          >
            {headerContent}
            {taskListContent}
          </div>
        )}
      </DropTargetElement>
    </div>
  )
}
