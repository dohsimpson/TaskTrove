"use client"

import { useState, useCallback, useEffect } from "react"
import { useSetAtom, useAtomValue } from "jotai"
import { useTranslation } from "@tasktrove/i18n"
import { X, Star, ChevronRight, Calendar, Flag, Folder, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { TaskCheckbox } from "@/components/ui/custom/task-checkbox"
import { EditableDiv } from "@/components/ui/custom/editable-div"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from "@/components/ui/drawer"
import { cn } from "@/lib/utils"
import { format, isToday, isTomorrow } from "date-fns"
import { useIsMobile } from "@/hooks/use-mobile"
import { formatTaskDateTime } from "@/lib/utils/task-date-formatter"
import { TaskSchedulePopover } from "./task-schedule-popover"
import { PriorityPopover } from "./priority-popover"
import { ProjectPopover } from "./project-popover"
import { SubtaskContent } from "./subtask-content"
import { LabelContent } from "./label-content"
import { CommentContent } from "./comment-content"
import { TaskActionsMenu } from "./task-actions-menu"
import { useDebouncedCallback } from "@/hooks/use-debounced-callback"
import {
  updateTaskAtom,
  addCommentAtom,
  projectsAtom,
  selectedTaskAtom,
  deleteTaskAtom,
} from "@/lib/atoms"
import { log } from "@/lib/utils/logger"
import { labelsAtom, addLabelAndWaitForRealIdAtom } from "@/lib/atoms/core/labels"
import { Task, type LabelId } from "@/lib/types"
import { getDueDateTextColor, getPriorityTextColor } from "@/lib/color-utils"

// Constants
const SIDE_PANEL_WIDTH = 320 // 320px = w-80 in Tailwind

interface TaskSidePanelProps {
  isOpen: boolean
  onClose: () => void
  variant?: "overlay" | "resizable"
}

export function TaskSidePanel({ isOpen, onClose, variant = "overlay" }: TaskSidePanelProps) {
  const isMobile = useIsMobile()
  const [isAutoSaving, setIsAutoSaving] = useState(false)
  const { t } = useTranslation("task")

  // Atom actions
  const updateTask = useSetAtom(updateTaskAtom)
  const addComment = useSetAtom(addCommentAtom)
  const addLabelAndWaitForRealId = useSetAtom(addLabelAndWaitForRealIdAtom)
  const deleteTask = useSetAtom(deleteTaskAtom)

  // Atom values
  const task = useAtomValue(selectedTaskAtom)
  const allLabels = useAtomValue(labelsAtom)
  const allProjects = useAtomValue(projectsAtom)

  // Context menu - always visible in side panel
  const [actionsMenuOpen, setActionsMenuOpen] = useState(false)

  // clean up states when side panel is closed
  useEffect(() => {
    if (!isOpen) {
      setActionsMenuOpen(false)
    }
  }, [isOpen])

  // Auto-save with debouncing
  const debouncedSave = useDebouncedCallback((updates: Partial<Task>) => {
    if (!task) return
    log.debug({ module: "tasks", taskId: task.id, updates }, "Auto-saving task updates")
    updateTask({ updateRequest: { id: task.id, ...updates } })
    setIsAutoSaving(false)
  }, 500)

  const autoSave = useCallback(
    (updates: Partial<Task>) => {
      setIsAutoSaving(true)
      debouncedSave(updates)
    },
    [debouncedSave],
  )

  // Helper functions

  const isOverdue = (date: Date) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const checkDate = new Date(date)
    checkDate.setHours(0, 0, 0, 0)
    return checkDate < today
  }

  // Get project information for this task
  const getTaskProject = () => {
    if (!task?.projectId || !allProjects.length) return null
    return allProjects.find((project) => project.id === task.projectId) || null
  }

  // Task panel shortcuts are now handled by the unified keyboard system
  // in main-layout-wrapper.tsx to ensure proper context management

  // Shared task panel content component
  const TaskPanelContent = ({ task, className = "" }: { task: Task; className?: string }) => (
    <div className={cn("space-y-4", className)}>
      {/* Due Date Section - Prominent */}
      <div className="space-y-3">
        <h3 className="text-sm text-foreground font-bold">
          {t("sidePanel.dueDate.title", "Due Date")}
        </h3>
        <TaskSchedulePopover taskId={task.id}>
          <div
            className={cn(
              "flex items-center gap-3 p-3.5 rounded-lg cursor-pointer hover:bg-accent/50 transition-all duration-200 border-l-2",
              task.dueDate
                ? getDueDateTextColor(task.dueDate, task.completed)
                : "text-muted-foreground",
              task.dueDate && isOverdue(task.dueDate) && !isToday(task.dueDate) && !task.completed
                ? "border-l-red-500 bg-red-500/10 border border-red-200/50 dark:border-red-800/50"
                : task.dueDate && isToday(task.dueDate)
                  ? "border-l-orange-500 bg-orange-500/10 border border-orange-200/50 dark:border-orange-800/50"
                  : task.dueDate
                    ? "border-l-border bg-muted/20"
                    : "border-l-border bg-muted/20",
            )}
          >
            {task.dueDate &&
            isOverdue(task.dueDate) &&
            !isToday(task.dueDate) &&
            !task.completed ? (
              <AlertTriangle className="h-4 w-4 text-red-500" />
            ) : (
              <Calendar className="h-4 w-4" />
            )}
            <span className="font-medium">
              {task.dueDate
                ? formatTaskDateTime(task, { format: "full" }) ||
                  (isToday(task.dueDate)
                    ? t("sidePanel.dueDate.today", "Today")
                    : isTomorrow(task.dueDate)
                      ? t("sidePanel.dueDate.tomorrow", "Tomorrow")
                      : format(task.dueDate, "MMM d, yyyy"))
                : t("sidePanel.dueDate.placeholder", "Add due date")}
            </span>
          </div>
        </TaskSchedulePopover>
      </div>

      {/* Organization Section - Priority & Project */}
      <div className="space-y-3">
        <h3 className="text-sm text-foreground font-bold">
          {t("sidePanel.category.title", "Category")}
        </h3>
        <div className="grid grid-cols-2 gap-2.5">
          {/* Priority */}
          <PriorityPopover task={task}>
            <div
              className={cn(
                "flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer hover:bg-accent/50 transition-all duration-200 bg-muted/20 border border-transparent hover:border-border/50",
                task.priority < 4 ? getPriorityTextColor(task.priority) : "text-muted-foreground",
              )}
            >
              <Flag className="h-4 w-4" />
              <span className="text-sm font-medium">
                {task.priority < 4
                  ? `P${task.priority}`
                  : t("sidePanel.category.priority", "Priority")}
              </span>
            </div>
          </PriorityPopover>

          {/* Project */}
          <ProjectPopover task={task}>
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer hover:bg-accent/50 transition-all duration-200 bg-muted/20 border border-transparent hover:border-border/50 text-muted-foreground">
              {(() => {
                const project = getTaskProject()
                return project ? (
                  <>
                    <Folder className="size-4" style={{ color: project.color }} />
                    <span className="text-sm font-medium truncate">{project.name}</span>
                  </>
                ) : (
                  <>
                    <Folder className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      {t("sidePanel.category.project", "Project")}
                    </span>
                  </>
                )
              })()}
            </div>
          </ProjectPopover>
        </div>
      </div>

      {/* Description Section */}
      <div className="space-y-3">
        <h3 className="text-sm text-foreground font-bold">
          {t("sidePanel.description.title", "Description")}
        </h3>
        <EditableDiv
          value={task.description || ""}
          onChange={(value: string) => autoSave({ description: value })}
          className="text-sm text-muted-foreground hover:bg-accent/50 px-4 py-3 rounded-lg bg-muted/20 border border-transparent hover:border-border/50 min-h-[60px] transition-all duration-200 min-w-56 max-w-lg"
          placeholder={t("sidePanel.description.placeholder", "Add description...")}
          multiline={true}
        />
      </div>

      {/* Subtasks Section */}
      <div className="space-y-3">
        <h3 className="text-sm text-foreground font-bold">
          {t("sidePanel.subtasks.title", "Subtasks")}
        </h3>
        <SubtaskContent task={task} mode="inline" />
      </div>

      {/* Tags/Labels Section */}
      <div className="space-y-3">
        <h3 className="text-sm text-foreground font-bold">
          {t("sidePanel.labels.title", "Labels")}
        </h3>
        <LabelContent
          task={task}
          onAddLabel={async (labelName) => {
            const labelToAdd = labelName?.trim()
            if (labelToAdd) {
              const existingLabel = allLabels.find(
                (label) => label.name.toLowerCase() === labelToAdd.toLowerCase(),
              )

              let labelId: LabelId | undefined
              if (!existingLabel) {
                const colors = [
                  "#ef4444",
                  "#f59e0b",
                  "#3b82f6",
                  "#8b5cf6",
                  "#10b981",
                  "#f97316",
                  "#06b6d4",
                  "#84cc16",
                  "#ec4899",
                  "#6366f1",
                ]
                const randomColor = colors[Math.floor(Math.random() * colors.length)]

                // Wait for the real label ID from the server
                labelId = await addLabelAndWaitForRealId({
                  name: labelToAdd,
                  slug: labelToAdd.toLowerCase().replace(/\s+/g, "-"),
                  color: randomColor,
                })
              } else {
                labelId = existingLabel.id
              }

              // Guard against undefined labelId
              if (!labelId) return

              if (!task.labels.includes(labelId)) {
                const updatedLabels = [...task.labels, labelId]
                autoSave({ labels: updatedLabels })
              }
            }
          }}
          onRemoveLabel={(labelIdToRemove) => {
            const updatedLabels = task.labels.filter((labelId) => labelId !== labelIdToRemove)
            autoSave({ labels: updatedLabels })
          }}
          mode="inline"
        />
      </div>

      {/* Comments Section */}
      <div className="space-y-3">
        <h3 className="text-sm text-foreground font-bold">
          {t("sidePanel.comments.title", "Comments")}
        </h3>
        <CommentContent
          task={task}
          onAddComment={(content) => addComment({ taskId: task.id, content })}
          mode="inline"
        />
      </div>

      {/* Attachments feature removed */}

      {/* Keyboard Shortcuts Hint */}
      {!isMobile && (
        <div className="pt-4 mt-2 border-t border-border/50">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <kbd className="px-2 py-1 bg-muted/50 border border-border/50 rounded text-xs font-mono">
                Space
              </kbd>
              <span>{t("sidePanel.shortcuts.toggle", "Toggle")}</span>
            </div>
            <div className="flex items-center gap-1">
              <kbd className="px-2 py-1 bg-muted/50 border border-border/50 rounded text-xs font-mono">
                Esc
              </kbd>
              <span>{t("sidePanel.shortcuts.close", "Close")}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  if (!isOpen || !task) return null

  // Mobile: Bottom drawer
  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={() => onClose()} direction="bottom">
        <DrawerContent className="!max-h-[60vh] focus:outline-none [&>div:first-child]:cursor-grab [&>div:first-child]:active:cursor-grabbing">
          <DrawerHeader className="pb-2">
            <DrawerTitle className="sr-only">
              {t("sidePanel.title", "Task Details: {{- title}}", { title: task.title })}
            </DrawerTitle>
            <div className="flex items-center gap-3">
              <TaskCheckbox
                checked={task.completed}
                onCheckedChange={(checked) =>
                  updateTask({ updateRequest: { id: task.id, completed: !!checked } })
                }
                className="flex-shrink-0"
              />
              <div className="flex-1 flex items-center gap-2 min-w-0">
                <EditableDiv
                  value={task.title}
                  onChange={(value: string) => autoSave({ title: value })}
                  className={cn(
                    "text-lg font-medium w-fit max-w-xs hover:bg-accent px-2 py-1 rounded min-w-0",
                    task.completed ? "line-through text-muted-foreground" : "text-foreground",
                  )}
                  placeholder={t("sidePanel.taskTitle.placeholder", "Task title...")}
                />
                {/* Favorite feature removed */}
              </div>
              <TaskActionsMenu
                task={task}
                isVisible={true}
                onDeleteClick={() => deleteTask(task.id)}
                variant="compact"
                open={actionsMenuOpen}
                onOpenChange={setActionsMenuOpen}
              />
              <DrawerClose asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                  <X className="h-4 w-4" />
                </Button>
              </DrawerClose>
            </div>
          </DrawerHeader>

          <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
            <div className="p-4">
              <TaskPanelContent task={task} />
            </div>
          </div>

          {/* Auto-save indicator for mobile */}
          {isAutoSaving && (
            <div className="flex-shrink-0 border-t border-border/50 bg-background/95 backdrop-blur-sm">
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground px-4 py-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                <span>{t("sidePanel.autoSave.saving", "Saving...")}</span>
              </div>
            </div>
          )}
        </DrawerContent>
      </Drawer>
    )
  }

  // Desktop: Right side panel (responsive width)
  return (
    <div
      className={cn(
        "bg-background/95 backdrop-blur-sm border-l border-border/50 flex flex-col transition-transform duration-300 ease-in-out",
        variant === "overlay"
          ? "absolute top-0 right-0 z-30 shadow-lg translate-x-0 h-full"
          : "w-full shadow-none h-full",
      )}
      style={variant === "overlay" ? { width: `${SIDE_PANEL_WIDTH}px` } : undefined}
    >
      {/* Fixed Header */}
      <div className="flex-shrink-0 border-b border-border/50 bg-background/95 backdrop-blur-sm">
        <div className="p-4">
          <div className="flex items-center gap-3">
            <TaskCheckbox
              checked={task.completed}
              onCheckedChange={(checked) =>
                updateTask({ updateRequest: { id: task.id, completed: !!checked } })
              }
              className="flex-shrink-0"
            />
            <div className="flex-1 flex items-center gap-2 min-w-0">
              <EditableDiv
                value={task.title}
                onChange={(value: string) => autoSave({ title: value })}
                className={cn(
                  "text-lg font-medium w-fit max-w-xs hover:bg-accent px-2 py-1 rounded min-w-0",
                  task.completed ? "line-through text-muted-foreground" : "text-foreground",
                )}
                placeholder="Task title..."
              />
              {/* Favorite feature removed */}
            </div>
            <TaskActionsMenu
              task={task}
              isVisible={true}
              onDeleteClick={() => deleteTask(task.id)}
              variant="compact"
              open={actionsMenuOpen}
              onOpenChange={setActionsMenuOpen}
            />
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 flex-shrink-0">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
        <div className="p-4 pb-6">
          <TaskPanelContent task={task} />
        </div>
      </div>

      {/* Fixed Footer - Auto-save indicator */}
      {isAutoSaving && (
        <div className="flex-shrink-0 border-t border-border/50 bg-background/95 backdrop-blur-sm">
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground px-4 py-3">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
            <span>Saving...</span>
          </div>
        </div>
      )}
    </div>
  )
}
