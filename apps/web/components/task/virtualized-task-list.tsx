import { useRef, useCallback, useEffect, useState } from "react"
import { useAtomValue } from "jotai"
import { useVirtualizer } from "@tanstack/react-virtual"
import { motion, AnimatePresence } from "motion/react"
import type { ElementDropTargetEventBasePayload } from "@atlaskit/pragmatic-drag-and-drop/element/adapter"
import type { Task } from "@tasktrove/types/core"
import type { TaskId, GroupId } from "@tasktrove/types/id"
import { TaskItem } from "./task-item"
import { DropTargetElement } from "./project-sections-view-helper"
import { DraggableTaskElement } from "./draggable-task-element"
import { VirtualizationDebugBadge } from "@/components/debug/virtualization-debug-badge"
import { scrollToTaskAtom } from "@tasktrove/atoms/ui/scroll-to-task"
import { useScrollHighlightTask } from "@/hooks/use-scroll-highlight-task"

export interface VirtualizedTaskListProps {
  tasks: Task[]
  variant: "default" | "compact" | "kanban" | "calendar" | "subtask"
  sortedTaskIds: TaskId[]
  onDropTaskToListItem?: (args: ElementDropTargetEventBasePayload) => void
  enableDropTargets?: boolean
  enableDragging?: boolean
  compactTitleEditable?: boolean
  showGaps?: boolean
  itemClassName?: string
  overscan?: number
  /**
   * When provided, marks all tasks in this list as belonging to the same section.
   * Helps drag-and-drop logic identify origin section even though section membership
   * is tracked via project.sections rather than task.sectionId.
   */
  listSectionId?: GroupId
  renderTaskItem?: (
    task: Task,
    options: {
      className?: string
      variant: VirtualizedTaskListProps["variant"]
      sortedTaskIds?: TaskId[]
      compactTitleEditable?: boolean
    },
  ) => React.ReactNode
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
  enableDragging = true,
  compactTitleEditable = false,
  showGaps = true,
  itemClassName,
  overscan = 5,
  listSectionId,
  renderTaskItem,
}: VirtualizedTaskListProps) {
  const parentRef = useRef<HTMLDivElement>(null)
  const [enableMotion, setEnableMotion] = useState(false)

  // Scroll-to-task functionality
  const scrollToTaskId = useAtomValue(scrollToTaskAtom)
  useScrollHighlightTask()

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
    getItemKey: (index) => sortedTasks[index]?.id ?? index,
    estimateSize: () => 50,
    overscan,
  })

  // Scroll to task when requested
  useEffect(() => {
    if (!scrollToTaskId) return

    const taskIndex = sortedTasks.findIndex((task) => task?.id === scrollToTaskId)
    if (taskIndex === -1) {
      // Let other lists (e.g., other project sections) handle this ID
      return
    }

    // Scroll to the task in virtual list
    virtualizer.scrollToIndex(taskIndex, {
      align: "center",
      behavior: "auto",
    })

    return
  }, [scrollToTaskId, sortedTasks, virtualizer])

  // In test environment, render all items to make them available for queries
  const itemsToRender = isTest
    ? sortedTasks.map((task, index) => ({ task, index, start: index * 50 }))
    : virtualizer
        .getVirtualItems()
        .map((vi) => ({ task: sortedTasks[vi.index], index: vi.index, start: vi.start }))

  // Enable motion animation after initial render
  useEffect(() => {
    if (enableMotion || isTest || itemsToRender.length === 0) return

    let raf = 0
    let raf2 = 0
    raf = window.requestAnimationFrame(() => {
      raf2 = window.requestAnimationFrame(() => setEnableMotion(true))
    })
    return () => {
      window.cancelAnimationFrame(raf)
      window.cancelAnimationFrame(raf2)
    }
  }, [enableMotion, isTest, itemsToRender.length])

  const renderInnerTask = (task: Task) =>
    renderTaskItem ? (
      renderTaskItem(task, {
        className: itemClassName ?? "cursor-pointer mx-2",
        variant,
        sortedTaskIds,
        compactTitleEditable,
      })
    ) : (
      <TaskItem
        taskId={task.id}
        variant={variant}
        className={itemClassName ?? "cursor-pointer mx-2"}
        showProjectBadge={true}
        sortedTaskIds={sortedTaskIds}
        compactTitleEditable={compactTitleEditable}
      />
    )

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

            const taskItem = enableDragging ? (
              <DraggableTaskElement key={task.id} taskId={task.id} sectionId={listSectionId}>
                {renderInnerTask(task)}
              </DraggableTaskElement>
            ) : (
              <div key={task.id}>{renderInnerTask(task)}</div>
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
                {enableDropTargets && enableDragging && onDropTaskToListItem ? (
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
                {showGaps && <div aria-hidden="true" className="h-1" />}
              </div>
            )
          })
        ) : (
          <AnimatePresence mode="popLayout" initial={false}>
            {itemsToRender.map(({ task, index, start }) => {
              if (!task) return null

              const taskItem = enableDragging ? (
                <DraggableTaskElement key={task.id} taskId={task.id} sectionId={listSectionId}>
                  {renderInnerTask(task)}
                </DraggableTaskElement>
              ) : (
                <div key={task.id}>{renderInnerTask(task)}</div>
              )

              return (
                <motion.div
                  // IMPORTANT: Unstable key forces remount on reorder so the virtualizer re-measures by index.
                  key={`${task.id}-${index}`}
                  // layoutId preserves smooth motion across remounts.
                  layoutId={task.id}
                  data-index={index}
                  ref={(node) => {
                    virtualizer.measureElement(node)
                  }}
                  initial={false}
                  animate={{
                    opacity: 1,
                    scale: 1,
                  }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{
                    layout: enableMotion
                      ? { duration: 0.2, ease: [0.4, 0, 0.2, 1] }
                      : { duration: 0 },
                    opacity: { duration: 0.08, ease: "easeInOut" },
                    scale: { duration: 0.08, ease: "easeInOut" },
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
                  {enableDropTargets && enableDragging && onDropTaskToListItem ? (
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
                  {showGaps && <div aria-hidden="true" className="h-1" />}
                </motion.div>
              )
            })}
          </AnimatePresence>
        )}
      </div>
    </div>
  )
}
