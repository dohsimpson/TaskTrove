"use client"

import { useState, useEffect } from "react"
import { useSetAtom, useAtomValue } from "jotai"
import { DraggableWrapper } from "@/components/ui/draggable-wrapper"
import { DropTargetWrapper } from "@/components/ui/drop-target-wrapper"
import {
  extractClosestEdge,
  attachClosestEdge,
} from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge"
import { getReorderDestinationIndex } from "@atlaskit/pragmatic-drag-and-drop-hitbox/util/get-reorder-destination-index"
import type { Input as DragInputType } from "@atlaskit/pragmatic-drag-and-drop/types"
import { TaskItem } from "./task-item"
// CompactTaskItem functionality is now integrated into TaskItem with variant="compact"
import { TaskSidePanel } from "./task-side-panel"
import { TaskShadow } from "@/components/ui/custom/task-shadow"
import { AddSectionDivider } from "./add-section-divider"
import { TaskEmptyState } from "./task-empty-state"
import { ViewEmptyState } from "./view-empty-state"
import { SelectionToolbar } from "./selection-toolbar"
import { ProjectViewToolbar } from "./project-view-toolbar"
import {
  projectAtoms,
  openQuickAddAtom,
  projectsAtom,
  filteredTasksAtom,
  currentViewStateAtom,
  selectedTaskAtom,
  setViewOptionsAtom,
  collapsedSectionsAtom,
  toggleSectionCollapseAtom,
  labelsAtom,
} from "@/lib/atoms"
import {
  currentRouteContextAtom,
  editingSectionIdAtom,
  stopEditingSectionAtom,
} from "@/lib/atoms/ui/navigation"
import {
  orderedTasksByProjectAtom,
  reorderTaskInViewAtom,
  moveTaskBetweenSectionsAtom,
} from "@/lib/atoms/core/tasks"
import type { Task, Project, ProjectSection } from "@/lib/types"
import { createSectionId, createTaskId, createProjectId } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { EditableDiv } from "@/components/ui/custom/editable-div"
import { ColorPicker } from "@/components/ui/custom/color-picker"
import { SectionContextMenu } from "./section-context-menu"
import { ChevronDown, ChevronRight, X } from "lucide-react"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/custom/animated-collapsible"
import { log } from "@/lib/utils/logger"
import { useIsMobile } from "@/hooks/use-mobile"
import { DEFAULT_UUID } from "@/lib/constants/defaults"

// Constants
const SIDE_PANEL_WIDTH = 320 // 320px = w-80 in Tailwind

interface ProjectSectionsViewProps {
  /** Unique identifier for drag-and-drop operations */
  droppableId: string
  /**
   * Controls whether section management UI is shown
   * - true: Full section support (add, rename, delete, drag between sections)
   * - false: Flat list mode (no section UI, behaves like a simple task list)
   *
   * When false, this component renders as a flat task list identical to the
   * previous TaskListWithPanel behavior, ensuring consistent UX across all views.
   */
  supportsSections?: boolean
}

/**
 * Unified task list component that supports both sectioned and flat list views.
 *
 * This component serves as the single task display component for all views in TaskTrove:
 * - Project views: Uses supportsSections=true for full section management
 * - Inbox/Today/Upcoming/Completed views: Uses supportsSections=false for flat lists
 * - Label views: Uses supportsSections=false for simple task organization
 *
 * Key Features:
 * - Drag-and-drop task reordering and cross-section movement
 * - Collapsible sections with task counts (when supportsSections=true)
 * - Inline section creation, renaming, and deletion (when supportsSections=true)
 * - Side panel integration for detailed task editing
 * - Compact and normal view modes
 * - Keyboard shortcuts for section management
 * - Responsive design with mobile gesture support
 *
 * The component automatically adapts its behavior based on the supportsSections prop:
 * - When supportsSections=false: Renders as a clean flat list without any section UI
 * - When supportsSections=true: Shows full section management capabilities
 *
 * This unified approach ensures consistent drag-and-drop behavior, keyboard shortcuts,
 * and task interactions across all views while eliminating code duplication.
 *
 * @example
 * // For project views with sections
 * <ProjectSectionsView
 *   tasks={projectTasks}
 *   project={currentProject}
 *   supportsSections={true}
 *   droppableId="project-123"
 * />
 *
 * @example
 * // For inbox/today views without sections
 * <ProjectSectionsView
 *   tasks={inboxTasks}
 *   supportsSections={false}
 *   droppableId="inbox"
 * />
 */
export function ProjectSectionsView({
  droppableId,
  supportsSections = true,
}: ProjectSectionsViewProps) {
  // Get data from atoms
  const tasks = useAtomValue(filteredTasksAtom)
  const currentViewState = useAtomValue(currentViewStateAtom)
  const routeContext = useAtomValue(currentRouteContextAtom)
  const allProjects = useAtomValue(projectsAtom)
  const allLabels = useAtomValue(labelsAtom)
  const selectedTask = useAtomValue(selectedTaskAtom)

  // Get project from route context
  const project =
    routeContext.routeType === "project"
      ? allProjects.find((p: Project) => p.id === routeContext.viewId)
      : undefined

  // Get label from route context
  const label =
    routeContext.routeType === "label"
      ? allLabels.find((l) => l.id === routeContext.viewId)
      : undefined

  // Extract view state
  const { showSidePanel, compactView } = currentViewState
  const isMobile = useIsMobile()

  // Atom actions
  const setViewOptions = useSetAtom(setViewOptionsAtom)
  const toggleSectionCollapse = useSetAtom(toggleSectionCollapseAtom)
  const collapsedSections = useAtomValue(collapsedSectionsAtom)
  const [isAddingSection, setIsAddingSection] = useState(false)
  const [addingSectionPosition, setAddingSectionPosition] = useState<number | undefined>(undefined)
  const [newSectionName, setNewSectionName] = useState("")
  const [newSectionColor, setNewSectionColor] = useState("#3b82f6")
  const [editingSectionColor, setEditingSectionColor] = useState("")
  const [hoveredSectionId, setHoveredSectionId] = useState<string | null>(null)

  // Track drag state for shadow rendering per section
  const [sectionDragStates, setSectionDragStates] = useState<
    Map<
      string,
      {
        isDraggingOver: boolean
        draggedTaskRect?: { height: number }
        closestEdge?: "top" | "bottom"
        targetTaskId?: string
        isOverChildTask?: boolean
      }
    >
  >(new Map())

  // Get section state from atoms
  const editingSectionId = useAtomValue(editingSectionIdAtom)
  const stopEditingSection = useSetAtom(stopEditingSectionAtom)

  // Initialize editing state when section editing starts
  useEffect(() => {
    if (editingSectionId && project) {
      const section = project.sections.find((s: ProjectSection) => s.id === editingSectionId)
      if (section) {
        setEditingSectionColor(section.color)
      }
    }
  }, [editingSectionId, project])

  // Jotai actions
  const addSection = useSetAtom(projectAtoms.actions.addSection)
  const renameSection = useSetAtom(projectAtoms.actions.renameSection)
  const openQuickAddAction = useSetAtom(openQuickAddAtom)
  const reorderTaskInView = useSetAtom(reorderTaskInViewAtom)
  const moveTaskBetweenSections = useSetAtom(moveTaskBetweenSectionsAtom)
  const orderedTasksByProject = useAtomValue(orderedTasksByProjectAtom)

  const handleAddSection = () => {
    if (newSectionName.trim() && project && supportsSections) {
      try {
        const sectionName = newSectionName.trim()

        // Check if section already exists
        if (project.sections.some((s: ProjectSection) => s.name === sectionName)) {
          log.error(
            { module: "projects", projectId: project.id, sectionName },
            `Section "${sectionName}" already exists`,
          )
          return
        }

        addSection({
          projectId: project.id,
          sectionName,
          color: newSectionColor,
          position: addingSectionPosition,
        })
        setNewSectionName("")
        setNewSectionColor("#3b82f6")
        setIsAddingSection(false)
        setAddingSectionPosition(undefined)
      } catch (error) {
        log.error(
          {
            module: "projects",
            projectId: project.id,
            sectionName: newSectionName,
            error: error instanceof Error ? error.message : String(error),
          },
          "Failed to add section",
        )
        // TODO: Add error handling/toast notification
      }
    }
  }

  const handleCancelAddSection = () => {
    setNewSectionName("")
    setNewSectionColor("#3b82f6")
    setIsAddingSection(false)
    setAddingSectionPosition(undefined)
  }

  const handleStartAddSection = (position?: number) => {
    if (!supportsSections) return
    setIsAddingSection(true)
    setAddingSectionPosition(position)
  }

  const handleSaveEditSection = (newName: string) => {
    if (editingSectionId !== null && project) {
      const trimmedName = newName.trim()
      const sectionId = editingSectionId

      // Find the current section being edited
      const currentSection = project.sections.find((s: ProjectSection) => s.id === sectionId)
      if (!currentSection) {
        return
      }

      // Only proceed with rename if name is valid and different
      if (trimmedName && trimmedName !== currentSection.name) {
        // Check if the new name already exists
        if (project.sections.some((s: ProjectSection) => s.name === trimmedName)) {
          return
        }

        try {
          // Update the section in the project (name and color)
          renameSection({
            projectId: project.id,
            sectionId: sectionId,
            newSectionName: trimmedName,
            newSectionColor: editingSectionColor,
          })
        } catch (error) {
          log.error(
            {
              module: "projects",
              projectId: project.id,
              sectionId,
              newName: trimmedName,
              error: error instanceof Error ? error.message : String(error),
            },
            "Failed to rename section",
          )
        }
      }
    }

    // Always exit edit mode after processing
    stopEditingSection()
  }

  const handleCancelEditSection = () => {
    stopEditingSection()
    setEditingSectionColor("")
  }

  // Define type-safe interfaces for our drag-and-drop data
  interface TaskDragData {
    source: {
      data: Record<string, unknown>
    }
    location: {
      current: {
        dropTargets: Array<{
          data: Record<string, unknown>
        }>
      }
    }
  }

  const handleTaskDrop = (data: TaskDragData) => {
    try {
      const sourceData = data.source.data
      // Handle the case where location might not have current.dropTargets structure
      // This happens because DropTargetWrapper uses a simplified location structure
      const locationData = data.location.current?.dropTargets || []

      // Ensure we have valid source data and a task being dropped
      if (!sourceData || sourceData.type !== "task" || !sourceData.taskId) {
        log.warn({ sourceData }, "Invalid source data for task drop")
        return
      }

      // Find the task list drop target
      const taskListTarget = locationData.find((target) => target.data.type === "task-list")
      if (!taskListTarget) {
        log.warn({ locationData }, "No task list drop target found")
        return
      }

      // Extract and validate task data with proper type checking
      const rawTaskId = sourceData.taskId
      if (typeof rawTaskId !== "string") {
        log.warn({ sourceData }, "Invalid taskId type in source data")
        return
      }

      const sourceSectionId =
        typeof sourceData.sectionId === "string" ? sourceData.sectionId : DEFAULT_UUID
      const targetSectionId =
        typeof taskListTarget.data.sectionId === "string"
          ? taskListTarget.data.sectionId
          : DEFAULT_UUID

      const rawProjectId = taskListTarget.data.projectId
      if (typeof rawProjectId !== "string") {
        log.warn({ taskListTarget }, "Invalid projectId type in drop target")
        return
      }

      if (!rawProjectId) {
        log.warn({ taskListTarget }, "No project ID found in drop target")
        return
      }

      // Convert string values to typed IDs
      const taskId = createTaskId(rawTaskId)
      const projectId = createProjectId(rawProjectId)
      const viewId = projectId // ViewId can be a ProjectId

      // Get current task positions
      const sectionTasks = getOrderedTasksForSection(targetSectionId)
      const sourceIndex = sectionTasks.findIndex((task: Task) => task.id === taskId)

      // Calculate target index from drop position
      let targetIndex = sectionTasks.length // Default to end of list

      // Look for task drop target to determine insertion point
      const taskDropTarget = locationData.find((target) => target.data.type === "task-drop-target")
      if (taskDropTarget) {
        const targetTaskId = taskDropTarget.data.taskId
        const indexOfTarget = sectionTasks.findIndex((task: Task) => task.id === targetTaskId)

        if (indexOfTarget !== -1) {
          // Extract closest edge using Atlaskit utility
          const closestEdgeOfTarget = extractClosestEdge(taskDropTarget.data)

          // Calculate destination index using Atlaskit utility
          targetIndex = getReorderDestinationIndex({
            startIndex: sourceIndex,
            closestEdgeOfTarget,
            indexOfTarget,
            axis: "vertical",
          })
        }
      }

      // Don't reorder if dropping in the same position
      if (sourceSectionId === targetSectionId && sourceIndex === targetIndex) {
        log.info(
          { taskId, sourceIndex, targetIndex },
          "Task dropped in same position, no reordering needed",
        )
        return
      }

      // Handle cross-section moves vs same-section reordering
      if (sourceSectionId !== targetSectionId) {
        moveTaskBetweenSections({
          taskId: taskId,
          projectId: projectId,
          newSectionId: createSectionId(targetSectionId),
          toIndex: targetIndex,
        })
        log.info(
          {
            taskId,
            fromSectionId: sourceSectionId,
            toSectionId: targetSectionId,
            toIndex: targetIndex,
            viewId,
          },
          "Task moved between sections",
        )
      } else {
        reorderTaskInView({
          taskId,
          viewId: viewId,
          fromIndex: sourceIndex,
          toIndex: targetIndex,
        })
        log.info(
          { sourceTaskId: taskId, insertionIndex: targetIndex, sectionId: targetSectionId, viewId },
          "Task reordered successfully",
        )
      }
    } catch (error) {
      log.error(
        { error: error instanceof Error ? error.message : String(error) },
        "Failed to handle task drop",
      )
    }
  }

  // Side panel view state is the single source of truth for panel visibility
  const isPanelOpen = showSidePanel && Boolean(selectedTask)

  // Calculate whether to apply margin (only on desktop where panel is positioned)
  const shouldApplyMargin = isPanelOpen && !isMobile

  // handleTaskClick is now handled directly by TaskItem using atoms

  const handleClosePanel = () => {
    // Simply disable the side panel view option - this will sync everything
    setViewOptions({ showSidePanel: false })
  }

  const handleToggleSectionCollapse = (sectionId: string) => {
    toggleSectionCollapse(sectionId)
  }

  // Group tasks by section and order them using project taskOrder arrays
  const getOrderedTasksForSection = (sectionId: string | null) => {
    // Filter tasks for this section from the passed tasks (already sorted by filteredTasksAtom)
    const sectionTasks = tasks.filter((task: Task) => {
      // For backward compatibility, treat null as default section
      if (sectionId === null || sectionId === DEFAULT_UUID) {
        return task.sectionId === DEFAULT_UUID || !task.sectionId
      }
      return task.sectionId === sectionId
    })

    // If user has selected a specific sort (not "default"), respect it fully
    if (currentViewState.sortBy !== "default") {
      return sectionTasks // tasks are already sorted by filteredTasksAtom
    }

    // For "default" sort, maintain the legacy behavior for better UX in project views:
    // Use project ordering for incomplete tasks, keep completed tasks at bottom
    const projectId = project?.id || "inbox"
    const orderedProjectTasks = orderedTasksByProject.get(projectId) || []
    const projectTaskOrder = orderedProjectTasks.map((t) => t.id)

    const sortedTasks = sectionTasks.sort((a: Task, b: Task) => {
      // If completion status differs, completed tasks go to bottom (matches main-content.tsx)
      if (a.completed && !b.completed) return 1
      if (!a.completed && b.completed) return -1

      // Both have same completion status, use project order for "default" sort
      const aIndex = projectTaskOrder.indexOf(a.id)
      const bIndex = projectTaskOrder.indexOf(b.id)

      // If both tasks are in project order, maintain that order
      if (aIndex !== -1 && bIndex !== -1) {
        return aIndex - bIndex
      }

      // If only one is in project order, it comes first
      if (aIndex !== -1) return -1
      if (bIndex !== -1) return 1

      // Neither in project order, maintain original order (by creation date)
      return a.createdAt.getTime() - b.createdAt.getTime()
    })

    return sortedTasks
  }

  // Get sections from project and ensure default section is always present
  const sectionsToShow = project ? [...project.sections] : []

  // Always ensure default section is present
  const hasDefaultSection = sectionsToShow.some((section) => section.id === DEFAULT_UUID)
  if (!hasDefaultSection) {
    // Create default section if it doesn't exist
    const defaultSection = {
      id: createSectionId(DEFAULT_UUID),
      name: "(no section)",
      color: "#6b7280", // Gray color for default section
    }
    // Add default section at the beginning
    sectionsToShow.unshift(defaultSection)
  }

  const renderSection = (section: { id: string; name: string; color: string }) => {
    const displayName = section.name
    const sectionId = section.id
    const sectionTasks = getOrderedTasksForSection(section.id)
    const sectionDroppableId = `${droppableId}-section-${sectionId}`
    const isCollapsed = collapsedSections.includes(sectionId)

    const isHovered = hoveredSectionId === sectionId
    const isEditing = editingSectionId === section.id

    // Common drop handlers
    const handleSectionDrop = (data: {
      source: { data: Record<string, unknown> }
      location: { current: { dropTargets: Array<{ data: Record<string, unknown> }> } }
    }) => {
      handleTaskDrop(data)
      setSectionDragStates(new Map())
    }

    const handleSectionDragEnter = ({
      source,
      location,
    }: {
      source: { data: Record<string, unknown> }
      location: { current: { dropTargets: Array<{ data: Record<string, unknown> }> } }
    }) => {
      if (source.data.type === "task" && source.data.rect) {
        const innerMost = location.current.dropTargets[0]
        const isOverChildTask = Boolean(innerMost && innerMost.data.type === "task-drop-target")

        const rect = source.data.rect
        if (typeof rect === "object" && rect !== null && "height" in rect) {
          const height = rect.height
          if (typeof height === "number") {
            setSectionDragStates((prev) => {
              const newMap = new Map(prev)
              newMap.set(section.id, {
                isDraggingOver: true,
                draggedTaskRect: { height },
                isOverChildTask,
              })
              return newMap
            })
          }
        }
      }
    }

    const handleSectionDragLeave = () => {
      setSectionDragStates((prev) => {
        const newMap = new Map(prev)
        newMap.delete(section.id)
        return newMap
      })
    }

    // Render the section header (always visible)
    const sectionHeader = (
      <div
        className="flex items-center py-2 px-1 mb-3"
        onMouseEnter={() => setHoveredSectionId(sectionId)}
        onMouseLeave={() => setHoveredSectionId(null)}
      >
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="flex items-center gap-2 p-0 h-auto hover:bg-transparent cursor-pointer"
            onClick={(e) => {
              if (isEditing) {
                e.preventDefault()
                e.stopPropagation()
              }
            }}
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: section.color }} />
            {isEditing ? (
              <EditableDiv
                as="h2"
                value={section.name}
                onChange={handleSaveEditSection}
                onCancel={handleCancelEditSection}
                className="text-base font-medium text-foreground"
                autoFocus={true}
                cursorPosition="end"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <h2 className="text-base font-medium text-foreground">{displayName}</h2>
            )}
          </Button>
        </CollapsibleTrigger>

        <div className="flex items-center gap-2 ml-2">
          <Badge
            variant="secondary"
            className="text-xs px-1.5 py-0.5 h-auto bg-transparent border-none text-muted-foreground font-medium"
          >
            {sectionTasks.length}
          </Badge>

          {/* Section context menu for non-unsectioned sections - only show if sections are supported */}
          {section.name !== "Unsectioned" && supportsSections && project?.id && (
            <SectionContextMenu
              sectionId={createSectionId(section.id)}
              isVisible={isHovered && !isEditing}
            />
          )}
        </div>
      </div>
    )

    return (
      <div key={sectionId} className="mb-4">
        <Collapsible
          open={!isCollapsed}
          onOpenChange={() => handleToggleSectionCollapse(sectionId)}
        >
          {/* When collapsed, wrap the header in a drop target */}
          {isCollapsed ? (
            <DropTargetWrapper
              dropTargetId={sectionDroppableId}
              onDrop={handleSectionDrop}
              getData={() => ({
                type: "task-list",
                sectionId: section.id,
                projectId: project?.id,
              })}
              onDragEnter={handleSectionDragEnter}
              onDragLeave={handleSectionDragLeave}
            >
              {sectionHeader}
              {/* Show shadow when dragging over collapsed section */}
              {(() => {
                const dragState = sectionDragStates.get(section.id)
                return dragState?.isDraggingOver && dragState?.draggedTaskRect ? (
                  <TaskShadow height={dragState.draggedTaskRect.height} className="mb-2" />
                ) : null
              })()}
            </DropTargetWrapper>
          ) : (
            sectionHeader
          )}

          <CollapsibleContent>
            <div className="space-y-0">
              <DropTargetWrapper
                dropTargetId={sectionDroppableId}
                onDrop={handleSectionDrop}
                getData={() => ({
                  type: "task-list",
                  sectionId: section.id,
                  projectId: project?.id,
                })}
                onDragEnter={handleSectionDragEnter}
                onDrag={({ source, location }) => {
                  if (source.data.type === "task" && source.data.rect) {
                    const innerMost = location.current.dropTargets[0]
                    const isOverChildTask = Boolean(
                      innerMost && innerMost.data.type === "task-drop-target",
                    )

                    setSectionDragStates((prev) => {
                      const newMap = new Map(prev)
                      const current = newMap.get(section.id)
                      if (current?.isDraggingOver) {
                        newMap.set(section.id, {
                          ...current,
                          isOverChildTask,
                        })
                      }
                      return newMap
                    })
                  }
                }}
                onDragLeave={handleSectionDragLeave}
              >
                <div>
                  {sectionTasks.map((task: Task, taskIndex: number) => (
                    <DropTargetWrapper
                      key={task.id}
                      dropTargetId={`task-${task.id}`}
                      onDrop={(data) => {
                        handleTaskDrop(data)
                        // Clean up drag state on drop
                        setSectionDragStates(new Map())
                      }}
                      getData={(args?: { input?: DragInputType; element?: HTMLElement }) => {
                        const baseData = {
                          type: "task-drop-target",
                          dropTargetId: `task-${task.id}`,
                          taskId: task.id,
                          sectionId: section.id,
                        }

                        // Only use attachClosestEdge if we have proper input and element
                        if (args?.input && args?.element) {
                          return attachClosestEdge(baseData, {
                            element: args.element,
                            input: args.input,
                            allowedEdges: ["top", "bottom"],
                          })
                        }

                        return baseData
                      }}
                      onDragEnter={({ source, location }) => {
                        if (source.data.type === "task" && source.data.taskId !== task.id) {
                          const innerMost = location.current.dropTargets[0]
                          const closestEdge = extractClosestEdge(innerMost?.data)

                          const rect = source.data.rect
                          if (typeof rect === "object" && rect !== null && "height" in rect) {
                            const height = rect.height
                            if (typeof height === "number") {
                              setSectionDragStates((prev) => {
                                const newMap = new Map(prev)
                                newMap.set(section.id, {
                                  isDraggingOver: true,
                                  draggedTaskRect: { height },
                                  closestEdge:
                                    closestEdge === "top" || closestEdge === "bottom"
                                      ? closestEdge
                                      : undefined,
                                  targetTaskId: task.id,
                                  isOverChildTask: true,
                                })
                                return newMap
                              })
                            }
                          }
                        }
                      }}
                      onDrag={({ source, location }) => {
                        if (source.data.type === "task" && source.data.taskId !== task.id) {
                          const innerMost = location.current.dropTargets[0]
                          const closestEdge = extractClosestEdge(innerMost?.data)

                          setSectionDragStates((prev) => {
                            const newMap = new Map(prev)
                            const current = newMap.get(section.id)
                            if (current) {
                              newMap.set(section.id, {
                                ...current,
                                closestEdge:
                                  closestEdge === "top" || closestEdge === "bottom"
                                    ? closestEdge
                                    : undefined,
                                targetTaskId: task.id,
                              })
                            }
                            return newMap
                          })
                        }
                      }}
                    >
                      {/* Render shadow above task if dragging over this task and closest edge is top */}
                      {(() => {
                        const dragState = sectionDragStates.get(section.id)
                        return dragState?.isDraggingOver &&
                          dragState?.targetTaskId === task.id &&
                          dragState?.closestEdge === "top" &&
                          dragState?.draggedTaskRect ? (
                          <TaskShadow height={dragState.draggedTaskRect.height} className="mb-2" />
                        ) : null
                      })()}

                      <DraggableWrapper
                        dragId={task.id}
                        index={taskIndex}
                        getData={() => ({
                          type: "task",
                          taskId: task.id,
                          sectionId: section.id,
                          projectId: task.projectId,
                        })}
                      >
                        <TaskItem
                          taskId={task.id}
                          variant={compactView ? "compact" : "default"}
                          className="cursor-pointer mb-2 mx-2"
                          showProjectBadge={true}
                        />
                      </DraggableWrapper>

                      {/* Render shadow below task if dragging over this task and closest edge is bottom */}
                      {(() => {
                        const dragState = sectionDragStates.get(section.id)
                        return dragState?.isDraggingOver &&
                          dragState?.targetTaskId === task.id &&
                          dragState?.closestEdge === "bottom" &&
                          dragState?.draggedTaskRect ? (
                          <TaskShadow height={dragState.draggedTaskRect.height} className="mb-2" />
                        ) : null
                      })()}
                    </DropTargetWrapper>
                  ))}

                  {/* Render shadow at bottom of section if dragging over section but not over any task */}
                  {(() => {
                    const dragState = sectionDragStates.get(section.id)
                    return dragState?.isDraggingOver &&
                      !dragState?.targetTaskId &&
                      dragState?.draggedTaskRect ? (
                      <TaskShadow height={dragState.draggedTaskRect.height} className="mb-2" />
                    ) : null
                  })()}

                  {sectionTasks.length === 0 && <TaskEmptyState title="No tasks in this section" />}
                </div>
              </DropTargetWrapper>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    )
  }

  // When supportsSections is false, always render as a flat list
  if (!supportsSections) {
    return (
      <div className="flex flex-1 relative">
        {/* Flat Task List */}
        <div
          className="flex-1 px-4 py-3 transition-all duration-300"
          style={{
            marginRight: shouldApplyMargin ? `${SIDE_PANEL_WIDTH}px` : "0px",
          }}
        >
          <div className="space-y-4">
            {/* Filter Controls, Search Input and Add Task Button */}
            <ProjectViewToolbar className="mb-3" />

            {/* Flat Task List without sections */}
            <div className="space-y-0">
              <DropTargetWrapper
                dropTargetId={droppableId}
                onDrop={handleTaskDrop}
                getData={() => ({
                  type: "task-list",
                  projectId: project?.id,
                })}
              >
                <div>
                  {tasks.map((task: Task, taskIndex: number) => (
                    <DropTargetWrapper
                      key={task.id}
                      dropTargetId={`task-${task.id}`}
                      onDrop={(data) => {
                        handleTaskDrop(data)
                        // Clean up drag state on drop
                        setSectionDragStates(new Map())
                      }}
                      getData={(args?: { input?: DragInputType; element?: HTMLElement }) => {
                        const baseData = {
                          type: "task-drop-target",
                          dropTargetId: `task-${task.id}`,
                          taskId: task.id,
                          sectionId: DEFAULT_UUID,
                        }

                        // Only use attachClosestEdge if we have proper input and element
                        if (args?.input && args?.element) {
                          return attachClosestEdge(baseData, {
                            element: args.element,
                            input: args.input,
                            allowedEdges: ["top", "bottom"],
                          })
                        }

                        return baseData
                      }}
                    >
                      <DraggableWrapper
                        dragId={task.id}
                        index={taskIndex}
                        getData={() => ({
                          type: "task",
                          taskId: task.id,
                          projectId: task.projectId,
                        })}
                      >
                        <TaskItem
                          taskId={task.id}
                          variant={compactView ? "compact" : "default"}
                          className="cursor-pointer mb-2"
                          showProjectBadge={true}
                        />
                      </DraggableWrapper>
                    </DropTargetWrapper>
                  ))}
                  {tasks.length === 0 && (
                    <ViewEmptyState
                      viewId={routeContext.viewId}
                      projectName={project?.name}
                      labelName={label?.name}
                      action={{ label: "Add Task", onClick: () => openQuickAddAction() }}
                    />
                  )}
                </div>
              </DropTargetWrapper>
            </div>
          </div>
        </div>

        {/* Task Side Panel */}
        <TaskSidePanel isOpen={isPanelOpen} onClose={handleClosePanel} />
      </div>
    )
  }

  return (
    <div className="flex flex-1 relative">
      {/* Sections List */}
      <div
        className="flex-1 px-4 py-3 transition-all duration-300"
        style={{
          marginRight: shouldApplyMargin ? `${SIDE_PANEL_WIDTH}px` : "0px",
        }}
      >
        <div className="space-y-4">
          {/* Selection Toolbar */}
          <SelectionToolbar />

          {/* Filter Controls, Search Input and Add Task Button */}
          <ProjectViewToolbar className="mb-3" />

          {sectionsToShow.map((section, index) => (
            <div key={section.id}>
              {/* Show add section input if this is the position being added */}
              {supportsSections && isAddingSection && addingSectionPosition === index && (
                <div className="border border-border rounded-lg p-3 bg-card shadow-sm mb-4">
                  <div className="space-y-3">
                    <Input
                      value={newSectionName}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setNewSectionName(e.target.value)
                      }
                      placeholder="Section name..."
                      onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                        if (e.key === "Enter") {
                          handleAddSection()
                        } else if (e.key === "Escape") {
                          handleCancelAddSection()
                        }
                      }}
                      className="text-sm"
                      autoFocus
                    />
                    <ColorPicker
                      selectedColor={newSectionColor}
                      onColorSelect={setNewSectionColor}
                      size="sm"
                      label="Color"
                      className="text-xs"
                    />
                    <div className="flex gap-2">
                      <Button
                        onClick={handleAddSection}
                        size="sm"
                        variant="default"
                        disabled={!newSectionName.trim()}
                        className="px-3"
                      >
                        Add
                      </Button>
                      <Button
                        onClick={handleCancelAddSection}
                        variant="ghost"
                        size="sm"
                        className="px-2"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {renderSection(section)}

              {/* Add section divider after each section */}
              {/* {supportsSections && ( */}
              {/*   <AddSectionDivider */}
              {/*     onAddSection={handleStartAddSection} */}
              {/*     position={index + 1} */}
              {/*     className="mt-2" */}
              {/*   /> */}
              {/* )} */}
            </div>
          ))}

          {/* Show add section input if this is the position being added (at the end) */}
          {supportsSections &&
            isAddingSection &&
            addingSectionPosition === sectionsToShow.length && (
              <div className="border border-border rounded-lg p-3 bg-card shadow-sm">
                <div className="space-y-3">
                  <Input
                    value={newSectionName}
                    onChange={(e) => setNewSectionName(e.target.value)}
                    placeholder="Section name..."
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleAddSection()
                      } else if (e.key === "Escape") {
                        handleCancelAddSection()
                      }
                    }}
                    className="text-sm"
                    autoFocus
                  />
                  <ColorPicker
                    selectedColor={newSectionColor}
                    onColorSelect={setNewSectionColor}
                    size="sm"
                    label="Color"
                    className="text-xs"
                  />
                  <div className="flex gap-2">
                    <Button
                      onClick={handleAddSection}
                      size="sm"
                      variant="default"
                      disabled={!newSectionName.trim()}
                      className="px-3"
                    >
                      Add
                    </Button>
                    <Button
                      onClick={handleCancelAddSection}
                      variant="ghost"
                      size="sm"
                      className="px-2"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}

          {supportsSections && sectionsToShow.length === 0 && !isAddingSection && (
            <div>
              <AddSectionDivider
                onAddSection={handleStartAddSection}
                position={0}
                className="mt-2"
              />

              <div className="border border-border rounded-lg p-8 bg-card">
                <div className="text-center text-muted-foreground">
                  <p className="text-lg font-medium mb-2">No sections in this project</p>
                  <p className="text-sm">All tasks will appear in the main project view</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Task Side Panel */}
      <TaskSidePanel isOpen={isPanelOpen} onClose={handleClosePanel} />
    </div>
  )
}
