"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DraggableWrapper } from "@/components/ui/draggable-wrapper"
import { DropTargetWrapper } from "@/components/ui/drop-target-wrapper"
import { useSetAtom, useAtomValue } from "jotai"
import {
  orderedTasksByProjectAtom,
  reorderTaskInViewAtom,
  moveTaskBetweenSectionsAtom,
} from "@/lib/atoms/core/tasks"
import type { Project, Task as TaskType } from "@/lib/types"
import { TaskIdSchema, ProjectIdSchema } from "@/lib/types"
import { createSectionId } from "@/lib/types"
import { TaskItem } from "@/components/task/task-item"
import { SelectionToolbar } from "@/components/task/selection-toolbar"
import { TaskShadow } from "@/components/ui/custom/task-shadow"
import { DEFAULT_SECTION_COLOR, DEFAULT_UUID } from "@/lib/constants/defaults"
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
  const orderedTasksByProject = useAtomValue(orderedTasksByProjectAtom)
  const reorderTaskInView = useSetAtom(reorderTaskInViewAtom)
  const moveTaskBetweenSections = useSetAtom(moveTaskBetweenSectionsAtom)

  // Convert hex color to RGBA with transparency
  const hexToBackground = (hexColor: string | undefined): string => {
    // Use the color provided, or fallback to default section color
    const colorToUse = hexColor || DEFAULT_SECTION_COLOR

    // Remove # if present
    const hex = colorToUse.replace("#", "")

    // Convert hex to RGB
    const r = parseInt(hex.substr(0, 2), 16)
    const g = parseInt(hex.substr(2, 2), 16)
    const b = parseInt(hex.substr(4, 2), 16)

    return `rgba(${r}, ${g}, ${b}, 0.1)`
  }

  // Get ordered tasks for a specific section - matches project-sections-view logic
  const getOrderedTasksForSection = useCallback(
    (sectionId: string | null) => {
      // Filter tasks for this section from the passed tasks
      const sectionTasks = tasks.filter((task) => {
        if (sectionId === null) {
          // For backward compatibility, treat null as default section
          return task.sectionId === DEFAULT_SECTION_ID
        }
        return task.sectionId === sectionId
      })

      // Get project ordering for reference
      const projectId = project?.id || "inbox"
      const orderedProjectTasks = orderedTasksByProject.get(projectId) || []
      const projectTaskOrder = orderedProjectTasks.map((t) => t.id)

      // Sort section tasks: maintain project order for incomplete tasks, but keep completed tasks at bottom
      const sortedTasks = sectionTasks.sort((a, b) => {
        // If completion status differs, completed tasks go to bottom
        if (a.completed && !b.completed) return 1
        if (!a.completed && b.completed) return -1

        // Both have same completion status, use project order
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
    },
    [tasks, orderedTasksByProject, project],
  )

  // Handle task drop - matches project-sections-view logic
  const handleTaskDrop = (data: TaskDragData) => {
    try {
      const sourceData = data.source.data
      const locationData = data.location.current?.dropTargets || []

      if (!sourceData || sourceData.type !== "task" || !sourceData.taskId) {
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
      const sectionTasks = getOrderedTasksForSection(targetSectionId)
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
      const sectionTasks = getOrderedTasksForSection(section.id)
      newColumns.push({
        id: section.id.toString(),
        title: section.name,
        tasks: sectionTasks,
        color: section.color,
      })
    })

    setColumns(newColumns)
  }, [tasks, project, getOrderedTasksForSection])

  return (
    <div className="h-full overflow-auto">
      {/* Selection Toolbar */}
      <SelectionToolbar />

      <div className="overflow-x-auto sm:overflow-x-visible px-6">
        <div className="flex flex-col sm:flex-row gap-6 min-h-full sm:min-w-max">
          {columns.map((column) => (
            <div key={column.id} className="w-full sm:w-80 lg:flex-1 lg:min-w-64 my-6">
              <Card className="h-full py-0 overflow-hidden">
                <div
                  style={{ backgroundColor: hexToBackground(column.color) }}
                  data-testid="kanban-column-header"
                >
                  <CardHeader className="py-6 bg-transparent">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <div
                          className="w-3 h-3"
                          style={{ backgroundColor: column.color || DEFAULT_SECTION_COLOR }}
                        />
                        {column.title}
                        <Badge variant="secondary" className="ml-2">
                          {column.tasks.length}
                        </Badge>
                      </CardTitle>
                      {/* <Button */}
                      {/*   variant="ghost" */}
                      {/*   size="icon" */}
                      {/*   className="h-6 w-6" */}
                      {/* > */}
                      {/*   <Plus className="h-4 w-4" /> */}
                      {/* </Button> */}
                    </div>
                  </CardHeader>
                </div>
                <CardContent className="px-4 h-full">
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
                        const isOverChildTask = Boolean(
                          innerMost && innerMost.data.type === "task-drop-target",
                        )

                        // Validate rect is a DOMRect-like object
                        const rect = source.data.rect
                        if (typeof rect === "object" && rect !== null && "height" in rect) {
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
                        const isOverChildTask = Boolean(
                          innerMost && innerMost.data.type === "task-drop-target",
                        )

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
                    className="space-y-3 h-full min-h-[200px] pb-4"
                  >
                    <div className="space-y-3">
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

                            if (args?.input && args?.element && isDragInput(args.input)) {
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
                              const closestEdge = extractClosestEdge(innerMost?.data)

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
                              dragState?.targetTaskId === task.id &&
                              dragState?.closestEdge === "top" &&
                              dragState?.draggedTaskRect ? (
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
                              dragState?.targetTaskId === task.id &&
                              dragState?.closestEdge === "bottom" &&
                              dragState?.draggedTaskRect ? (
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
                          !dragState?.targetTaskId &&
                          dragState?.draggedTaskRect ? (
                          <TaskShadow height={dragState.draggedTaskRect.height} className="mb-3" />
                        ) : null
                      })()}
                    </div>
                  </DropTargetWrapper>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
