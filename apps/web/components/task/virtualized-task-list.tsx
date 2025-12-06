import { useRef, useCallback, useEffect } from "react"
import { useAtomValue, useSetAtom } from "jotai"
import { useVirtualizer } from "@tanstack/react-virtual"
import { motion, AnimatePresence } from "motion/react"
import type { ElementDropTargetEventBasePayload } from "@atlaskit/pragmatic-drag-and-drop/element/adapter"
import type { Task } from "@tasktrove/types/core"
import type { TaskId } from "@tasktrove/types/id"
import { TaskItem } from "./task-item"
import { DropTargetElement } from "./project-sections-view-helper"
import { DraggableTaskElement } from "./draggable-task-element"
import { VirtualizationDebugBadge } from "@/components/debug/virtualization-debug-badge"
import { scrollToTaskAtom } from "@tasktrove/atoms/ui/scroll-to-task"

interface VirtualizedTaskListProps {
  tasks: Task[]
  variant: "default" | "compact" | "kanban" | "calendar" | "subtask"
  sortedTaskIds: TaskId[]
  onDropTaskToListItem?: (args: ElementDropTargetEventBasePayload) => void
  enableDropTargets?: boolean
}

/**
 * Virtualized task list component that only renders visible items for performance.
 *
 * Uses TanStack Virtual to render only items visible in the viewport, plus a small
 * overscan buffer. This dramatically improves performance for large task lists by
 * reducing DOM nodes by 90-95%.
 *
 * Features:
 * - Dynamic height measurement for variable-sized items
 * - Parent scroll detection (uses existing scrollable container)
 * - Drag-and-drop support (optional)
 * - Test mode (renders all items in tests)
 * - Debug badge showing virtualization stats (development only)
 *
 * @example
 * ```tsx
 * <VirtualizedTaskList
 *   tasks={tasks}
 *   variant="default"
 *   sortedTaskIds={taskIds}
 *   enableDropTargets={true}
 *   onDropTaskToListItem={handleDrop}
 * />
 * ```
 */
export function VirtualizedTaskList({
  tasks,
  variant,
  sortedTaskIds,
  onDropTaskToListItem,
  enableDropTargets = true,
}: VirtualizedTaskListProps) {
  const parentRef = useRef<HTMLDivElement>(null)

  // Scroll-to-task functionality
  const scrollToTaskId = useAtomValue(scrollToTaskAtom)
  const setScrollToTaskId = useSetAtom(scrollToTaskAtom)

  // Check if we're in test environment
  const isTest = typeof process !== "undefined" && process.env.NODE_ENV === "test"

  // Find the scrollable parent element (the main content area)
  const getScrollElement = useCallback(() => {
    if (!parentRef.current) return null

    // Find the nearest scrollable ancestor
    let element: HTMLElement | null = parentRef.current.parentElement
    while (element) {
      const { overflow, overflowY } = window.getComputedStyle(element)
      if (
        overflow === "auto" ||
        overflowY === "auto" ||
        overflow === "scroll" ||
        overflowY === "scroll"
      ) {
        return element
      }
      element = element.parentElement
    }

    // Fallback to window scrolling
    return null
  }, [])

  // Get tasks in sorted order for virtualization
  const sortedTasks = sortedTaskIds.map((id) => tasks.find((t) => t.id === id)).filter(Boolean)

  const virtualizer = useVirtualizer({
    count: sortedTasks.length,
    getScrollElement,
    estimateSize: () => 50,
    overscan: 5,
  })

  // Scroll to task when requested
  useEffect(() => {
    if (!scrollToTaskId) return

    const taskIndex = sortedTasks.findIndex((task) => task?.id === scrollToTaskId)
    if (taskIndex === -1) {
      console.error(
        `Task with ID ${scrollToTaskId} not found in current view. Available tasks: ${sortedTasks.length}`,
      )
      setScrollToTaskId(null)
      return
    }

    // Scroll to the task in virtual list
    virtualizer.scrollToIndex(taskIndex, {
      align: "center",
      behavior: "smooth",
    })

    // Wait a bit for scroll to complete, then highlight
    const timer = setTimeout(() => {
      const taskElement = document.querySelector(`[data-task-id="${scrollToTaskId}"]`)
      if (taskElement) {
        // Add highlight effect
        taskElement.classList.add("ring-2", "ring-primary", "animate-pulse")
        setTimeout(() => {
          taskElement.classList.remove("ring-2", "ring-primary", "animate-pulse")
        }, 2000)
      }
      // Clear the scroll-to-task atom
      setScrollToTaskId(null)
    }, 300)

    return () => clearTimeout(timer)
  }, [scrollToTaskId, sortedTasks, virtualizer, setScrollToTaskId])

  // In test environment, render all items to make them available for queries
  const itemsToRender = isTest
    ? sortedTasks.map((task, index) => ({ task, index, start: index * 50 }))
    : virtualizer
        .getVirtualItems()
        .map((vi) => ({ task: sortedTasks[vi.index], index: vi.index, start: vi.start }))

  return (
    <div
      ref={parentRef}
      style={{
        position: "relative",
        width: "100%",
      }}
    >
      <VirtualizationDebugBadge
        totalItems={sortedTasks.length}
        renderedItems={itemsToRender.length}
      />
      <div
        style={{
          height: isTest ? "auto" : `${virtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {isTest ? (
          // In test mode, skip AnimatePresence to avoid duplicate elements during transitions
          itemsToRender.map(({ task, index }) => {
            if (!task) return null

            const taskItem = (
              <DraggableTaskElement key={task.id} taskId={task.id}>
                <TaskItem
                  taskId={task.id}
                  variant={variant}
                  className="cursor-pointer mx-2"
                  showProjectBadge={true}
                  sortedTaskIds={sortedTaskIds}
                />
              </DraggableTaskElement>
            )

            return (
              <div
                key={`${task.id}-${index}`}
                data-index={index}
                style={{
                  position: "relative",
                  top: 0,
                  left: 0,
                  width: "100%",
                }}
              >
                {enableDropTargets && onDropTaskToListItem ? (
                  <DropTargetElement
                    key={task.id}
                    id={task.id}
                    options={{ type: "list-item", indicator: { lineGap: "8px" } }}
                    onDrop={onDropTaskToListItem}
                  >
                    {taskItem}
                  </DropTargetElement>
                ) : (
                  taskItem
                )}
                <div aria-hidden="true" className="h-2" />
              </div>
            )
          })
        ) : (
          <AnimatePresence mode="popLayout">
            {itemsToRender.map(({ task, index, start }) => {
              if (!task) return null

              const taskItem = (
                <DraggableTaskElement key={task.id} taskId={task.id}>
                  <TaskItem
                    taskId={task.id}
                    variant={variant}
                    className="cursor-pointer mx-2"
                    showProjectBadge={true}
                    sortedTaskIds={sortedTaskIds}
                  />
                </DraggableTaskElement>
              )

              // Use unstable key (task.id + index) to force remeasurement when tasks reorder
              // layoutId provides smooth animations even when components remount
              return (
                <motion.div
                  key={`${task.id}-${index}`}
                  layoutId={task.id}
                  data-index={index}
                  ref={virtualizer.measureElement}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{
                    opacity: 1,
                    scale: 1,
                  }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{
                    opacity: { duration: 0.08, ease: "easeInOut" },
                    scale: { duration: 0.08, ease: "easeInOut" },
                    layout: { duration: 0.12, ease: [0.4, 0, 0.2, 1] },
                  }}
                  transformTemplate={(_transforms, generatedTransform) =>
                    `translateY(${start}px) ${generatedTransform}`
                  }
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    willChange: "transform",
                  }}
                >
                  {enableDropTargets && onDropTaskToListItem ? (
                    <DropTargetElement
                      key={task.id}
                      id={task.id}
                      options={{ type: "list-item", indicator: { lineGap: "8px" } }}
                      onDrop={onDropTaskToListItem}
                    >
                      {taskItem}
                    </DropTargetElement>
                  ) : (
                    taskItem
                  )}
                  <div aria-hidden="true" className="h-2" />
                </motion.div>
              )
            })}
          </AnimatePresence>
        )}
      </div>
    </div>
  )
}
