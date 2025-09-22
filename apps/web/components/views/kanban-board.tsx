"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { DraggableWrapper } from "@/components/ui/draggable-wrapper"
import { DropTargetWrapper } from "@/components/ui/drop-target-wrapper"
import { useSetAtom, useAtomValue } from "jotai"
import {
  reorderTaskInViewAtom,
  moveTaskBetweenSectionsAtom,
  taskAtoms,
} from "@/lib/atoms/core/tasks"
import { stopEditingSectionAtom } from "@/lib/atoms/ui/navigation"
import { useAddTaskToSection } from "@/hooks/use-add-task-to-section"
import { projectAtoms } from "@/lib/atoms"
import type { Project, Task as TaskType } from "@/lib/types"
import { TaskIdSchema, ProjectIdSchema, createSectionId } from "@/lib/types"
import { TaskItem } from "@/components/task/task-item"
import { SelectionToolbar } from "@/components/task/selection-toolbar"
import { ProjectViewToolbar } from "@/components/task/project-view-toolbar"
import { EditableSectionHeader } from "@/components/task/editable-section-header"
import { TaskShadow } from "@/components/ui/custom/task-shadow"
import { DEFAULT_SECTION_COLOR, DEFAULT_UUID } from "@tasktrove/constants"
import {
  extractClosestEdge,
  attachClosestEdge,
} from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge"
import { getReorderDestinationIndex } from "@atlaskit/pragmatic-drag-and-drop-hitbox/util/get-reorder-destination-index"
import type { Input as DragInputType } from "@atlaskit/pragmatic-drag-and-drop/types"

// Type guard for DragInputType
function isDragInput(input: unknown): input is DragInputType {
  return (
    typeof input === "object" &&
    input !== null &&
    "altKey" in input &&
    "button" in input &&
    "buttons" in input &&
    "ctrlKey" in input
  )
}
import { log } from "@/lib/utils/logger"

// Constants
const DEFAULT_SECTION_ID = createSectionId(DEFAULT_UUID)

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

interface KanbanColumn {
  id: string
  title: string
  tasks: TaskType[]
  color: string
}

interface KanbanBoardProps {
  tasks: TaskType[]
  project?: Project
  onTaskClick?: (task: TaskType) => void
}

export function KanbanBoard({ tasks, project }: KanbanBoardProps) {
  const [columns, setColumns] = useState<KanbanColumn[]>([])

  // Track drag state for shadow rendering per column
  const [columnDragStates, setColumnDragStates] = useState<
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

  // Add required atoms for drag and drop
  const reorderTaskInView = useSetAtom(reorderTaskInViewAtom)
  const moveTaskBetweenSections = useSetAtom(moveTaskBetweenSectionsAtom)
  const getOrderedTasksForSection = useAtomValue(taskAtoms.derived.orderedTasksBySection)

  // Section editing atoms
  const stopEditingSection = useSetAtom(stopEditingSectionAtom)
  const renameSection = useSetAtom(projectAtoms.actions.renameSection)

  // Hook for adding tasks to sections
  const addTaskToSection = useAddTaskToSection()

  // Handle task drop - matches project-sections-view logic
  const handleTaskDrop = (data: TaskDragData) => {
    try {
      const sourceData = data.source.data
      const locationData = data.location.current.dropTargets

      if (sourceData.type !== "task" || !sourceData.taskId) {
        log.warn({ sourceData }, "Invalid source data for task drop")
        return
      }

      const taskListTarget = locationData.find((target) => target.data.type === "task-list")
      if (!taskListTarget) {
        log.warn({ locationData }, "No task list drop target found")
        return
      }

      const taskIdResult = TaskIdSchema.safeParse(sourceData.taskId)
      if (!taskIdResult.success) {
        log.warn({ taskId: sourceData.taskId }, "Invalid task ID in drop data")
        return
      }
      const taskId = taskIdResult.data

      const sourceSectionId =
        (typeof sourceData.sectionId === "string" ? sourceData.sectionId : null) ||
        DEFAULT_SECTION_ID
      const targetSectionId =
        (typeof taskListTarget.data.sectionId === "string"
          ? taskListTarget.data.sectionId
          : null) || DEFAULT_SECTION_ID

      const projectIdResult = ProjectIdSchema.safeParse(taskListTarget.data.projectId)
      if (!projectIdResult.success) {
        log.warn({ projectId: taskListTarget.data.projectId }, "Invalid project ID in drop target")
        return
      }
      const projectId = projectIdResult.data

      if (!projectId) {
        log.warn({ taskListTarget }, "No project ID found in drop target")
        return
      }

      const viewId = projectId // ViewId is now directly the ProjectId
      const sectionTasks = getOrderedTasksForSection(projectId, targetSectionId)
      const sourceIndex = sectionTasks.findIndex((task) => task.id === taskId)
      let targetIndex = sectionTasks.length

      const taskDropTarget = locationData.find((target) => target.data.type === "task-drop-target")
      if (taskDropTarget) {
        const targetTaskId = taskDropTarget.data.taskId
        const indexOfTarget = sectionTasks.findIndex((task) => task.id === targetTaskId)

        if (indexOfTarget !== -1) {
          const closestEdgeOfTarget = extractClosestEdge(taskDropTarget.data)
          targetIndex = getReorderDestinationIndex({
            startIndex: sourceIndex,
            closestEdgeOfTarget,
            indexOfTarget,
            axis: "vertical",
          })
        }
      }

      if (sourceSectionId === targetSectionId && sourceIndex === targetIndex) {
        log.info(
          { taskId, sourceIndex, targetIndex },
          "Task dropped in same position, no reordering needed",
        )
        return
      }

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

  // Update columns when tasks or project change
  useEffect(() => {
    if (!project) {
      setColumns([])
      return
    }

    // Get sections from project and ensure default section is always present (matches project-sections-view logic)
    const sectionsToShow = [...project.sections]

    // Always ensure default section is present
    const hasDefaultSection = sectionsToShow.some((section) => section.id === DEFAULT_SECTION_ID)
    if (!hasDefaultSection) {
      // Create default section if it doesn't exist
      const defaultSection = {
        id: DEFAULT_SECTION_ID,
        name: "(no section)",
        color: "#6b7280", // Gray color for default section
      }
      // Add default section at the beginning
      sectionsToShow.unshift(defaultSection)
    }

    const newColumns: KanbanColumn[] = []
    sectionsToShow.forEach((section) => {
      const sectionTasks = getOrderedTasksForSection(project.id || "inbox", section.id)
      newColumns.push({
        id: section.id.toString(),
        title: section.name,
        tasks: sectionTasks,
        color: section.color,
      })
    })

    setColumns(newColumns)
  }, [tasks, project, getOrderedTasksForSection])

  // Initialize editing state when section editing starts - handled by EditableSectionHeader

  const handleSaveEditSection = (sectionId: string) => (newName: string) => {
    if (project) {
      const trimmedName = newName.trim()

      // Find the current section being edited
      const currentSection = project.sections.find((s) => s.id === sectionId)
      if (!currentSection) {
        return
      }

      // Only proceed with rename if name is valid and different
      if (trimmedName && trimmedName !== currentSection.name) {
        // Check if the new name already exists
        if (project.sections.some((s) => s.name === trimmedName)) {
          return
        }

        try {
          // Update the section in the project (name and color)
          renameSection({
            projectId: project.id,
            sectionId: createSectionId(sectionId),
            newSectionName: trimmedName,
            newSectionColor: currentSection.color, // Keep existing color
          })
        } catch (error) {
          console.error("Failed to rename section:", error)
        }
      }
    }

    // Always exit edit mode after processing
    stopEditingSection()
  }

  const handleCancelEditSection = () => {
    stopEditingSection()
  }

  const handleAddTaskToSection = (sectionId: string) => {
    addTaskToSection(project?.id, sectionId)
  }

  // Calculate responsive column classes based on number of columns
  const getColumnClasses = () => {
    const columnCount = columns.length
    if (columnCount === 0) return "w-full my-1"
    if (columnCount === 1) return "w-full my-1"
    // For 5+ columns, use flex with min-width
    return "w-full my-1 sm:flex-1 sm:min-w-80"
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
          className={`px-4 py-3 flex flex-col sm:flex-row gap-2 ${columns.length <= 1 ? "" : "sm:min-w-max"}`}
        >
          {columns.map((column) => (
            <div key={column.id} className={getColumnClasses()}>
              <div className="flex min-w-60 flex-col rounded-lg border bg-muted dark:bg-background py-1 px-2 flex-1 min-h-full">
                {/* Column Header */}
                <EditableSectionHeader
                  sectionId={column.id}
                  sectionName={column.title}
                  sectionColor={column.color || DEFAULT_SECTION_COLOR}
                  taskCount={column.tasks.length}
                  className="px-2 py-2 border-b-2"
                  nameClassName="font-medium text-foreground"
                  nameElement="h3"
                  onSaveEdit={handleSaveEditSection(column.id)}
                  onCancelEdit={handleCancelEditSection}
                  rightContent={
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-foreground hover:bg-muted-foreground/10"
                      onClick={() => handleAddTaskToSection(column.id)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  }
                />

                {/* Tasks */}
                <div className="flex flex-1 flex-col gap-3 overflow-y-auto my-2">
                  <DropTargetWrapper
                    dropTargetId={
                      project ? `task-list-project-${project.id}-section-${column.id}` : column.id
                    }
                    onDrop={(data) => {
                      handleTaskDrop(data)
                      // Clean up drag state on drop
                      setColumnDragStates(new Map())
                    }}
                    getData={() => ({
                      type: "task-list",
                      sectionId: column.id,
                      projectId: project?.id,
                    })}
                    onDragEnter={({ source, location }) => {
                      if (source.data.type === "task" && source.data.rect) {
                        const innerMost = location.current.dropTargets[0]
                        if (!innerMost) return
                        const isOverChildTask = Boolean(innerMost.data.type === "task-drop-target")

                        // Validate rect is a DOMRect-like object
                        const rect = source.data.rect
                        if (typeof rect === "object" && "height" in rect) {
                          const height = rect.height
                          if (typeof height === "number") {
                            setColumnDragStates((prev) => {
                              const newMap = new Map(prev)
                              newMap.set(column.id, {
                                isDraggingOver: true,
                                draggedTaskRect: { height },
                                isOverChildTask,
                              })
                              return newMap
                            })
                          }
                        }
                      }
                    }}
                    onDrag={({ source, location }) => {
                      if (source.data.type === "task" && source.data.rect) {
                        const innerMost = location.current.dropTargets[0]
                        if (!innerMost) return
                        const isOverChildTask = Boolean(innerMost.data.type === "task-drop-target")

                        setColumnDragStates((prev) => {
                          const newMap = new Map(prev)
                          const current = newMap.get(column.id)
                          if (current?.isDraggingOver) {
                            newMap.set(column.id, {
                              ...current,
                              isOverChildTask,
                            })
                          }
                          return newMap
                        })
                      }
                    }}
                    onDragLeave={() => {
                      setColumnDragStates((prev) => {
                        const newMap = new Map(prev)
                        newMap.delete(column.id)
                        return newMap
                      })
                    }}
                    className="space-y-3 h-full min-h-[200px] py-1"
                  >
                    <div className="space-y-2">
                      {column.tasks.map((task, index) => (
                        <DropTargetWrapper
                          key={task.id}
                          dropTargetId={`task-${task.id}`}
                          onDrop={(data) => {
                            handleTaskDrop(data)
                            // Clean up drag state on drop
                            setColumnDragStates(new Map())
                          }}
                          getData={(args?: { input?: unknown; element?: HTMLElement }) => {
                            const baseData = {
                              type: "task-drop-target",
                              dropTargetId: `task-${task.id}`,
                              taskId: task.id,
                              sectionId: column.id,
                            }

                            if (args?.input && args.element && isDragInput(args.input)) {
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
                              if (!innerMost) return
                              const closestEdge = extractClosestEdge(innerMost.data)

                              const rect = source.data.rect
                              if (typeof rect === "object" && rect !== null && "height" in rect) {
                                const height = rect.height
                                if (typeof height === "number") {
                                  setColumnDragStates((prev) => {
                                    const newMap = new Map(prev)
                                    newMap.set(column.id, {
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
                              if (!innerMost) return
                              const closestEdge = extractClosestEdge(innerMost.data)

                              setColumnDragStates((prev) => {
                                const newMap = new Map(prev)
                                const current = newMap.get(column.id)
                                if (current) {
                                  newMap.set(column.id, {
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
                            const dragState = columnDragStates.get(column.id)
                            return dragState?.isDraggingOver &&
                              dragState.targetTaskId === task.id &&
                              dragState.closestEdge === "top" &&
                              dragState.draggedTaskRect ? (
                              <TaskShadow
                                height={dragState.draggedTaskRect.height}
                                className="mb-3"
                              />
                            ) : null
                          })()}

                          <DraggableWrapper
                            dragId={task.id}
                            index={index}
                            getData={() => ({
                              type: "task",
                              taskId: task.id,
                              sectionId: column.id,
                              projectId: task.projectId,
                            })}
                          >
                            <TaskItem taskId={task.id} variant="kanban" showProjectBadge={false} />
                          </DraggableWrapper>

                          {/* Render shadow below task if dragging over this task and closest edge is bottom */}
                          {(() => {
                            const dragState = columnDragStates.get(column.id)
                            return dragState?.isDraggingOver &&
                              dragState.targetTaskId === task.id &&
                              dragState.closestEdge === "bottom" &&
                              dragState.draggedTaskRect ? (
                              <TaskShadow
                                height={dragState.draggedTaskRect.height}
                                className="mb-3"
                              />
                            ) : null
                          })()}
                        </DropTargetWrapper>
                      ))}

                      {/* Render shadow at bottom of column if dragging over column but not over any task */}
                      {(() => {
                        const dragState = columnDragStates.get(column.id)
                        return dragState?.isDraggingOver &&
                          !dragState.targetTaskId &&
                          dragState.draggedTaskRect ? (
                          <TaskShadow height={dragState.draggedTaskRect.height} className="mb-3" />
                        ) : null
                      })()}
                    </div>
                  </DropTargetWrapper>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
