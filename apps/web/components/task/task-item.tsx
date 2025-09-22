"use client"

import React, { useState } from "react"
import { useSetAtom, useAtomValue } from "jotai"
import { v4 as uuidv4 } from "uuid"
import { useContextMenuVisibility } from "@/hooks/use-context-menu-visibility"
import { TaskCheckbox } from "@/components/ui/custom/task-checkbox"
import { TaskDueDate } from "@/components/ui/custom/task-due-date"
import { Badge } from "@/components/ui/badge"
import { EditableDiv } from "@/components/ui/custom/editable-div"
import { LinkifiedText } from "@/components/ui/custom/linkified-text"
import { LinkifiedEditableDiv } from "@/components/ui/custom/linkified-editable-div"
import { TimeEstimationPopover } from "./time-estimation-popover"
import { FocusTimerPopover } from "./focus-timer-popover"
import { LabelManagementPopover } from "./label-management-popover"
import {
  Calendar,
  MessageSquare,
  Paperclip,
  Flag,
  CheckSquare,
  Star,
  Folder,
  Tag,
  ClockFading,
  Play,
  Pause,
  Square,
} from "lucide-react"
import { cn, getContrastColor } from "@/lib/utils"
import { formatTime, getEffectiveEstimation } from "@/lib/utils/time-estimation"
import { getPriorityColor, getPriorityTextColor } from "@/lib/color-utils"
import { TaskSchedulePopover } from "./task-schedule-popover"
import { CommentManagementPopover } from "./comment-management-popover"
import { SubtaskPopover } from "./subtask-popover"
import { PriorityPopover } from "./priority-popover"
import { ProjectPopover } from "./project-popover"
import { TaskActionsMenu } from "./task-actions-menu"
import {
  toggleTaskAtom,
  deleteTaskAtom,
  updateTaskAtom,
  addCommentAtom,
  toggleTaskPanelWithViewStateAtom,
  tasksAtom,
  isTaskTimerActiveAtom,
  focusTimerStatusAtom,
  activeFocusTimerAtom,
  startFocusTimerAtom,
  pauseFocusTimerAtom,
  stopFocusTimerAtom,
  // Use centralized selection atoms
  selectionModeAtom,
  selectionToggleTaskSelectionAtom,
} from "@/lib/atoms"
import { labelsAtom, addLabelAtom, labelsFromIdsAtom } from "@/lib/atoms/core/labels"
import { projectsAtom } from "@/lib/atoms"
import {
  quickAddTaskAtom,
  selectedTaskIdAtom,
  updateQuickAddTaskAtom,
} from "@/lib/atoms/ui/dialogs"
import type { Task, TaskId, TaskPriority, Subtask, LabelId, CreateTaskRequest } from "@/lib/types"
import { INBOX_PROJECT_ID, createTaskId, createLabelId } from "@/lib/types"
import { TimeEstimationPicker } from "../ui/custom/time-estimation-picker"
import { useLanguage } from "@/components/providers/language-provider"
import { useTranslation } from "@/lib/i18n/client"

// Responsive width for metadata columns to ensure consistent alignment
const METADATA_COLUMN_WIDTH = "w-auto sm:w-20 md:w-24"

// Helper component for time estimation trigger button
function TimeEstimationTrigger({ task, className }: { task: Task; className?: string }) {
  const { estimation, isFromSubtasks } = getEffectiveEstimation(task)
  const timeText = formatTime(estimation)
  const hasTime = estimation > 0

  return (
    <span
      className={cn(
        "flex items-center gap-1 cursor-pointer",
        hasTime
          ? "hover:opacity-100 text-foreground"
          : "text-muted-foreground hover:text-foreground opacity-70 hover:opacity-100",
        className,
      )}
    >
      <ClockFading className="h-3 w-3" />
      {hasTime && (
        <span
          className={cn(
            "text-xs font-medium leading-none",
            isFromSubtasks && "border-b border-dotted border-current",
          )}
        >
          {timeText}
        </span>
      )}
    </span>
  )
}

// Helper function to check if focus timer should be shown for a task
function shouldShowFocusTimer(taskId: TaskId, activeTimer: { taskId: TaskId } | null) {
  return !activeTimer || activeTimer.taskId === taskId
}

// Helper component for focus timer trigger button
function FocusTimerTrigger({ taskId, className }: { taskId: TaskId; className?: string }) {
  // Translation setup
  const { language } = useLanguage()
  const { t } = useTranslation(language, "task")

  const isTaskTimerActive = useAtomValue(isTaskTimerActiveAtom)
  const timerStatus = useAtomValue(focusTimerStatusAtom)
  const startTimer = useSetAtom(startFocusTimerAtom)
  const pauseTimer = useSetAtom(pauseFocusTimerAtom)
  const stopTimer = useSetAtom(stopFocusTimerAtom)

  const isThisTaskActive = isTaskTimerActive(taskId)
  const isThisTaskRunning = isThisTaskActive && timerStatus === "running"
  const isThisTaskPaused = isThisTaskActive && timerStatus === "paused"

  const handleStartClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    startTimer(taskId)
  }

  const handlePauseResumeClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (isThisTaskRunning) {
      pauseTimer(taskId)
    } else if (isThisTaskPaused) {
      startTimer(taskId)
    }
  }

  const handleStopClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    stopTimer(taskId)
  }

  if (!isThisTaskActive) {
    // Show single start button when not active
    return (
      <span
        onClick={handleStartClick}
        className={cn(
          "flex items-center gap-1 cursor-pointer text-muted-foreground hover:text-foreground opacity-70 hover:opacity-100",
          className,
        )}
        title={t("focusTimer.start", "Start focus timer")}
      >
        <Play className="h-3 w-3" />
      </span>
    )
  }

  // Show both stop and play/pause buttons when active
  return (
    <div className={cn("flex items-center gap-1", className)}>
      <span
        onClick={handlePauseResumeClick}
        className={cn("cursor-pointer text-muted-foreground hover:text-foreground")}
        title={
          isThisTaskRunning
            ? t("focusTimer.pause", "Pause timer")
            : t("focusTimer.resume", "Resume timer")
        }
      >
        {isThisTaskRunning ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
      </span>
      <span
        onClick={handleStopClick}
        className="cursor-pointer text-muted-foreground hover:text-foreground text-red-500"
        title={t("focusTimer.stop", "Stop timer")}
      >
        <Square className="h-3 w-3" />
      </span>
    </div>
  )
}

interface TaskItemProps {
  taskId: TaskId
  className?: string
  showProjectBadge?: boolean
  variant?: "default" | "compact" | "kanban" | "calendar" | "subtask"
  // Subtask-specific props
  parentTask?: Task | CreateTaskRequest // Parent task for subtask operations - can be CreateTaskRequest in quick-add
}

export function TaskItem({
  taskId,
  className,
  showProjectBadge = true,
  variant = "default",
  // Subtask-specific props
  parentTask,
}: TaskItemProps) {
  // Translation setup
  const { language } = useLanguage()
  const { t } = useTranslation(language, "task")

  const [isHovered, setIsHovered] = useState(false)
  // Compact variant specific state
  const [labelsExpanded, setLabelsExpanded] = useState(false)
  const [isDescriptionEditing, setIsDescriptionEditing] = useState(false)
  const [isDefaultDescriptionEditing, setIsDefaultDescriptionEditing] = useState(false)
  // Subtask estimation picker state
  const [showEstimationPicker, setShowEstimationPicker] = useState(false)

  // Get task data from atoms - MUST be called before any conditional returns
  const allTasks = useAtomValue(tasksAtom)
  const selectionMode = useAtomValue(selectionModeAtom)
  const allLabels = useAtomValue(labelsAtom)
  const getLabelsFromIds = useAtomValue(labelsFromIdsAtom)
  const allProjects = useAtomValue(projectsAtom)
  const selectedTaskId = useAtomValue(selectedTaskIdAtom)
  const activeFocusTimer = useAtomValue(activeFocusTimerAtom)

  // Atom actions
  const toggleTask = useSetAtom(toggleTaskAtom)
  const deleteTask = useSetAtom(deleteTaskAtom)
  const updateTask = useSetAtom(updateTaskAtom)
  const addComment = useSetAtom(addCommentAtom)
  const toggleTaskPanel = useSetAtom(toggleTaskPanelWithViewStateAtom)
  const toggleTaskSelection = useSetAtom(selectionToggleTaskSelectionAtom)
  const addLabel = useSetAtom(addLabelAtom)

  // Quick-add atoms for subtask handling in new tasks
  const quickAddTask = useAtomValue(quickAddTaskAtom)
  const updateQuickAddTask = useSetAtom(updateQuickAddTaskAtom)

  // Find the task after getting all atoms
  let task = allTasks.find((t: Task) => t.id === taskId)

  // Special handling for subtasks - if not found in main tasks atom but variant is subtask
  if (!task && variant === "subtask") {
    // Get parent task from either prop or quick-add atom
    const parent = parentTask || quickAddTask
    const subtask = parent.subtasks?.find((s) => String(s.id) === String(taskId))
    if (subtask) {
      // Convert Subtask to Task-like object for rendering
      task = {
        id: createTaskId(String(subtask.id)), // Convert SubtaskId to TaskId for rendering
        title: subtask.title,
        completed: subtask.completed,
        description: "",
        priority: 4 satisfies TaskPriority,
        dueDate: undefined,
        projectId: INBOX_PROJECT_ID,
        sectionId: "sectionId" in parent ? parent.sectionId : undefined,
        labels: [],
        subtasks: [],
        comments: [],
        attachments: [],
        createdAt: new Date(),
        status: subtask.completed ? "completed" : "active",
        order: subtask.order || 0,
        recurringMode: "dueDate",
        estimation: subtask.estimation, // Include estimation from subtask
      }
    }
  }

  // Derived state from atoms
  const isSelected = selectedTaskId === taskId
  const isSelectionMode = selectionMode

  // Context menu visibility with flicker prevention
  const {
    isVisible: actionsMenuVisible,
    isMenuOpen: actionsMenuOpen,
    handleMenuOpenChange: handleActionsMenuChange,
  } = useContextMenuVisibility(isHovered, isSelected)

  // Early return if task not found - AFTER all hooks are called
  if (!task) {
    console.warn(`TaskItem: Task with id ${taskId} not found`)
    return null
  }

  // Get project information for this task
  const getTaskProject = () => {
    if (!task.projectId || !allProjects.length) return null
    return allProjects.find((project) => project.id === task.projectId) || null
  }

  const taskProject = getTaskProject()

  // Helper function to update subtasks in the appropriate context (existing task vs quick-add)
  const updateSubtasks = (updatedSubtasks: Subtask[]) => {
    if (parentTask && "id" in parentTask) {
      // Existing task - update global state
      updateTask({ updateRequest: { id: parentTask.id, subtasks: updatedSubtasks } })
    } else {
      // Quick-add context - update quick-add atom
      updateQuickAddTask({ updateRequest: { subtasks: updatedSubtasks } })
    }
  }

  // Subtask handlers for variant="subtask"
  const handleSubtaskToggle = () => {
    if (variant !== "subtask") return

    const parent = parentTask || quickAddTask
    if (!parent.subtasks) return

    const updatedSubtasks = parent.subtasks.map((subtask) =>
      String(subtask.id) === String(task.id)
        ? { ...subtask, completed: !subtask.completed }
        : subtask,
    )

    updateSubtasks(updatedSubtasks)
  }

  const handleSubtaskDelete = () => {
    if (variant !== "subtask") return

    const parent = parentTask || quickAddTask
    if (!parent.subtasks) return

    const updatedSubtasks = parent.subtasks.filter(
      (subtask) => String(subtask.id) !== String(task.id),
    )

    updateSubtasks(updatedSubtasks)
  }

  const handleSubtaskTitleUpdate = (newTitle: string) => {
    if (variant !== "subtask") return

    const parent = parentTask || quickAddTask
    if (!parent.subtasks) return

    const updatedSubtasks = parent.subtasks.map((subtask) =>
      String(subtask.id) === String(task.id) ? { ...subtask, title: newTitle.trim() } : subtask,
    )

    updateSubtasks(updatedSubtasks)
  }

  const handleSubtaskEstimationUpdate = (estimation: number | null) => {
    if (variant !== "subtask") return

    const parent = parentTask || quickAddTask
    if (!parent.subtasks) return

    const updatedSubtasks = parent.subtasks.map((subtask) =>
      String(subtask.id) === String(task.id)
        ? { ...subtask, estimation: estimation && estimation > 0 ? estimation : undefined }
        : subtask,
    )

    updateSubtasks(updatedSubtasks)
  }

  const handleEstimationMenuClick = () => {
    setShowEstimationPicker(true)
  }

  // Compact variant specific helpers
  const shouldShowSchedule = variant === "compact" && (task.dueDate || task.recurring)

  const shouldShowPriority = variant === "compact" && task.priority < 4

  const handleTaskClick = (e: React.MouseEvent) => {
    // Don't trigger if clicking on buttons or interactive elements
    const target = e.target
    if (
      !(target instanceof HTMLElement) ||
      target.closest("button") ||
      target.closest("[data-action]") ||
      target.closest('[role="button"]') ||
      target.closest("input") ||
      target.closest("select") ||
      target.closest("textarea") ||
      // popover elements
      target.closest('[role="dialog"]') ||
      target.closest('[data-slot="popover-trigger"]')
    ) {
      return
    }

    // If in selection mode, toggle selection instead of opening panel
    if (isSelectionMode) {
      toggleTaskSelection(taskId)
      return
    }

    // Use atom action to open task panel
    toggleTaskPanel(task)
  }

  const handleContextMenu = (e: React.MouseEvent) => {
    // Prevent default context menu and enter selection mode
    e.preventDefault()
    // TODO: commented out right click triggering selection mode, as it's not supported at the moment
    // if (!isSelectionMode) {
    //   enterSelectionMode(taskId)
    // }
  }

  const handleAddLabel = (labelName?: string) => {
    if (labelName) {
      // Check if label exists in the system
      const existingLabel = allLabels.find(
        (label) => label.name.toLowerCase() === labelName.toLowerCase(),
      )

      let labelId: LabelId
      if (!existingLabel) {
        // Create new label with a default color
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

        labelId = createLabelId(uuidv4()) // Generate UUID for new label
        addLabel({
          name: labelName,
          slug: labelName.toLowerCase().replace(/\s+/g, "-"),
          color: randomColor,
        })
      } else {
        labelId = existingLabel.id
      }

      // Add label ID to task if not already present
      if (!task.labels.includes(labelId)) {
        const updatedLabels = [...task.labels, labelId]
        updateTask({ updateRequest: { id: task.id, labels: updatedLabels } })
      }
    }
  }

  const handleRemoveLabel = (labelIdToRemove: LabelId) => {
    const updatedLabels = task.labels.filter((labelId: LabelId) => labelId !== labelIdToRemove)
    updateTask({ updateRequest: { id: task.id, labels: updatedLabels } })
  }

  // Compact variant render
  if (variant === "compact") {
    return (
      <div
        className={cn(
          "group/task relative rounded border border-border border-l-3 transition-all duration-200",
          "hover:shadow-md dark:hover:shadow-gray-300/30",
          task.completed && "opacity-60",
          isSelected ? "bg-accent text-accent-foreground border-accent-foreground/20" : "bg-card",
          "cursor-pointer",
          getPriorityColor(task.priority, variant),
          className,
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handleTaskClick}
        onContextMenu={handleContextMenu}
        data-task-focused={isSelected}
      >
        {/* Main content area - responsive layout */}
        <div className="p-2">
          {/* Single row on larger screens (md+), two rows on mobile/tablet */}
          <div className="flex flex-col md:flex-row md:items-center gap-2">
            {/* Left section - checkboxes and title */}
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {/* Selection Checkbox */}
              {isSelectionMode && (
                <TaskCheckbox
                  checked={isSelected}
                  onCheckedChange={() => toggleTaskSelection(taskId)}
                />
              )}

              {/* Task Completion Checkbox */}
              <TaskCheckbox
                checked={task.completed}
                onCheckedChange={() => toggleTask(task.id)}
                data-action="toggle"
              />

              {/* Title - constrained width to prevent overflow */}
              <div className="flex-1 min-w-0 max-w-full">
                <LinkifiedEditableDiv
                  as="span"
                  value={task.title}
                  onChange={(newTitle) => {
                    if (newTitle.trim() && newTitle !== task.title) {
                      updateTask({ updateRequest: { id: task.id, title: newTitle.trim() } })
                    }
                  }}
                  className={cn(
                    "text-sm truncate block w-fit",
                    "max-w-full md:max-w-[200px] lg:max-w-[300px]", // Responsive max-width
                    task.completed ? "line-through text-muted-foreground" : "text-foreground",
                  )}
                  data-action="edit"
                  allowEmpty={false}
                />
              </div>

              {/* Essential metadata - always in first row */}
              <div className="flex items-center gap-1 text-xs flex-shrink-0">
                {/* Favorite Star */}
                {task.favorite && (
                  <Star className="h-3 w-3 text-yellow-500 fill-current flex-shrink-0" />
                )}

                {/* Due Date/Recurring - Show all dates and recurring in compact variant */}
                {shouldShowSchedule ? (
                  <TaskSchedulePopover taskId={task.id}>
                    <TaskDueDate
                      dueDate={task.dueDate}
                      dueTime={task.dueTime}
                      recurring={task.recurring}
                      completed={task.completed}
                      variant={variant}
                      className="cursor-pointer hover:opacity-100 text-xs flex-shrink-0"
                    />
                  </TaskSchedulePopover>
                ) : (
                  <TaskSchedulePopover taskId={task.id}>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0 cursor-pointer hover:text-foreground transition-colors opacity-70 hover:opacity-100">
                      <Calendar className="h-3 w-3" />
                    </span>
                  </TaskSchedulePopover>
                )}

                {/* Priority Flag - Show for P1-P3 in compact variant or add priority on hover */}
                {shouldShowPriority ? (
                  <PriorityPopover task={task}>
                    <Flag
                      className={cn(
                        "h-3 w-3 flex-shrink-0 cursor-pointer hover:opacity-100",
                        task.priority === 1
                          ? "text-red-500"
                          : task.priority === 2
                            ? "text-orange-500"
                            : "text-blue-500",
                      )}
                    />
                  </PriorityPopover>
                ) : (
                  <PriorityPopover task={task}>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0 cursor-pointer hover:text-foreground transition-colors opacity-70 hover:opacity-100">
                      <Flag className="h-3 w-3" />
                    </span>
                  </PriorityPopover>
                )}

                {/* Timer and Actions Menu - first row on smaller viewport */}
                <div className="lg:hidden flex items-center gap-1">
                  <TimeEstimationPopover taskId={task.id}>
                    <TimeEstimationTrigger task={task} />
                  </TimeEstimationPopover>
                  {shouldShowFocusTimer(task.id, activeFocusTimer) && (
                    <FocusTimerPopover taskId={task.id}>
                      <FocusTimerTrigger taskId={task.id} />
                    </FocusTimerPopover>
                  )}
                  <TaskActionsMenu
                    task={task}
                    isVisible={actionsMenuVisible}
                    onDeleteClick={() => deleteTask(task.id)}
                    variant="compact"
                    open={actionsMenuOpen}
                    onOpenChange={handleActionsMenuChange}
                  />
                </div>
              </div>
            </div>

            {/* Second row - metadata that flows to second row on mobile */}
            <div className="flex items-center justify-between text-xs text-muted-foreground min-h-[20px]">
              {/* Left side - Interactive metadata (subtasks, comments) */}
              <div className="flex items-center gap-2 flex-wrap min-h-[16px]">
                {/* Subtasks */}
                <SubtaskPopover task={task}>
                  <span className="flex items-center gap-1 cursor-pointer hover:text-foreground transition-colors">
                    <CheckSquare className="h-3 w-3" />
                    {task.subtasks.length > 0 && (
                      <>
                        {task.subtasks.filter((s: Subtask) => s.completed).length}/
                        {task.subtasks.length}
                      </>
                    )}
                  </span>
                </SubtaskPopover>

                {/* Comments */}
                <CommentManagementPopover
                  task={task}
                  onAddComment={(content) => addComment({ taskId: task.id, content })}
                  onOpenChange={(open) => {
                    if (!open) return
                    // TODO: Handle onViewAll functionality if needed
                  }}
                >
                  <span className="flex items-center gap-1 cursor-pointer hover:text-foreground transition-colors">
                    <MessageSquare className="h-3 w-3" />
                    {task.comments.length > 0 && task.comments.length}
                  </span>
                </CommentManagementPopover>
              </div>

              {/* Right side - Labels and project info */}
              <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                {/* Labels - Show if present, limited on smaller screens */}
                {task.labels.length > 0 && (
                  <LabelManagementPopover
                    task={task}
                    onAddLabel={handleAddLabel}
                    onRemoveLabel={handleRemoveLabel}
                  >
                    <div className="flex items-center gap-1 flex-wrap cursor-pointer">
                      {getLabelsFromIds(task.labels)
                        .slice(0, labelsExpanded ? task.labels.length : 1) // Show only 1 label by default
                        .map((label) => (
                          <Badge
                            key={label.id}
                            variant="secondary"
                            className="text-xs px-1 py-0 h-4 hover:opacity-100"
                            style={{
                              backgroundColor: label.color,
                              color: getContrastColor(label.color),
                              border: "none",
                            }}
                            title={label.name}
                          >
                            {label.name.slice(0, 6)} {/* Shorter label text */}
                          </Badge>
                        ))}
                      {task.labels.length > 1 && !labelsExpanded && (
                        <Badge
                          variant="outline"
                          className="text-xs px-1 py-0 h-4 cursor-pointer hover:bg-accent transition-colors"
                          title={`+${task.labels.length - 1} more labels`}
                          data-action="labels"
                          onClick={(e) => {
                            e.stopPropagation()
                            setLabelsExpanded(true)
                          }}
                        >
                          +{task.labels.length - 1}
                        </Badge>
                      )}
                    </div>
                  </LabelManagementPopover>
                )}

                {/* Add Label */}
                {task.labels.length === 0 && (
                  <LabelManagementPopover
                    task={task}
                    onAddLabel={handleAddLabel}
                    onRemoveLabel={handleRemoveLabel}
                  >
                    <span className="flex items-center gap-1 cursor-pointer hover:text-foreground transition-colors opacity-70 hover:opacity-100">
                      <Tag className="h-3 w-3" />
                    </span>
                  </LabelManagementPopover>
                )}

                {/* Project Badge - Now clickable with project picker */}
                {showProjectBadge && taskProject && (
                  <ProjectPopover task={task}>
                    <span className="flex items-center gap-1 cursor-pointer hover:text-foreground transition-colors">
                      <Folder
                        className="h-3 w-3 flex-shrink-0"
                        style={{ color: taskProject.color }}
                      />
                      <span className="truncate max-w-24">{taskProject.name}</span>
                    </span>
                  </ProjectPopover>
                )}

                {/* Add Project - Show when no project is set */}
                {showProjectBadge && !taskProject && allProjects.length > 0 && (
                  <ProjectPopover task={task}>
                    <span className="flex items-center gap-1 cursor-pointer hover:text-foreground transition-colors opacity-70 hover:opacity-100">
                      <Folder className="h-3 w-3" />
                    </span>
                  </ProjectPopover>
                )}

                {/* Timer and Actions Menu - second row on larger viewport */}
                <div className="hidden lg:flex lg:items-center gap-1">
                  <TimeEstimationPopover taskId={task.id}>
                    <TimeEstimationTrigger task={task} />
                  </TimeEstimationPopover>
                  {shouldShowFocusTimer(task.id, activeFocusTimer) && (
                    <FocusTimerPopover taskId={task.id}>
                      <FocusTimerTrigger taskId={task.id} />
                    </FocusTimerPopover>
                  )}
                  <TaskActionsMenu
                    task={task}
                    isVisible={actionsMenuVisible}
                    onDeleteClick={() => deleteTask(task.id)}
                    variant="compact"
                    open={actionsMenuOpen}
                    onOpenChange={handleActionsMenuChange}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Kanban variant render - optimized for narrow columns
  if (variant === "kanban") {
    const taskLabels = getLabelsFromIds(task.labels)

    return (
      <div
        className={cn(
          "group/task relative p-3 border border-border border-l-3 rounded-lg shadow-xs cursor-pointer hover:shadow-md dark:hover:shadow-gray-300/30 transition-all duration-200",
          task.completed && "opacity-60",
          isSelected ? "bg-accent text-accent-foreground border-accent-foreground/20" : "bg-card",
          getPriorityColor(task.priority, variant),
          className,
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handleTaskClick}
        onContextMenu={handleContextMenu}
        data-task-focused={isSelected}
      >
        {/* Header with title, priority, and key metadata */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-start gap-2 flex-1 min-w-0">
            {/* Task Completion Checkbox */}
            <TaskCheckbox
              checked={task.completed}
              onCheckedChange={() => toggleTask(task.id)}
              className="mt-0.5"
              data-action="toggle"
            />

            {/* Title */}
            <LinkifiedEditableDiv
              as="h4"
              value={task.title}
              onChange={(newTitle) =>
                updateTask({ updateRequest: { id: task.id, title: newTitle } })
              }
              className={cn(
                "font-medium text-sm text-foreground line-clamp-2 flex-1 min-w-0",
                task.completed && "line-through text-muted-foreground",
              )}
              placeholder={t("placeholders.taskTitle", "Enter task title...")}
            />
          </div>

          {/* Right side metadata - due date and priority only */}
          <div className="flex items-center gap-2 flex-shrink-0 text-xs text-muted-foreground">
            {/* Due date/recurring - show if present */}
            {task.dueDate || task.recurring ? (
              <TaskSchedulePopover taskId={task.id}>
                <TaskDueDate
                  dueDate={task.dueDate}
                  dueTime={task.dueTime}
                  recurring={task.recurring}
                  completed={task.completed}
                  className="cursor-pointer hover:opacity-100"
                />
              </TaskSchedulePopover>
            ) : (
              <TaskSchedulePopover taskId={task.id}>
                <span className="flex items-center gap-1 cursor-pointer text-muted-foreground hover:text-foreground opacity-70 hover:opacity-100">
                  <Calendar className="h-3 w-3" />
                </span>
              </TaskSchedulePopover>
            )}

            {/* Priority flag */}
            {task.priority < 4 ? (
              <PriorityPopover task={task}>
                <Flag
                  className={cn(
                    "h-3 w-3 cursor-pointer hover:opacity-100",
                    getPriorityColor(task.priority),
                  )}
                />
              </PriorityPopover>
            ) : (
              <PriorityPopover task={task}>
                <span className="flex items-center opacity-70 hover:opacity-100">
                  <Flag className="h-3 w-3 cursor-pointer text-muted-foreground hover:text-foreground" />
                </span>
              </PriorityPopover>
            )}

            {/* Timer and Actions */}
            <TimeEstimationPopover taskId={task.id}>
              <TimeEstimationTrigger task={task} />
            </TimeEstimationPopover>
            {shouldShowFocusTimer(task.id, activeFocusTimer) && (
              <FocusTimerPopover taskId={task.id}>
                <FocusTimerTrigger taskId={task.id} />
              </FocusTimerPopover>
            )}
            <TaskActionsMenu
              task={task}
              isVisible={actionsMenuVisible}
              onDeleteClick={() => deleteTask(task.id)}
              variant="kanban"
              open={actionsMenuOpen}
              onOpenChange={handleActionsMenuChange}
            />
          </div>
        </div>

        {/* Description - editable */}
        <div className="mb-2">
          <EditableDiv
            as="p"
            value={task.description || ""}
            onChange={(newDescription) => {
              updateTask({ updateRequest: { id: task.id, description: newDescription } })
            }}
            placeholder={t("placeholders.addDescription", "Add description...")}
            className={cn(
              "text-xs cursor-text hover:bg-accent px-1 py-0.5 rounded transition-colors min-w-48 max-w-sm",
              // Only apply line-clamp when not editing, otherwise use max-height with scroll
              !isDescriptionEditing && "line-clamp-2",
              isDescriptionEditing && "max-h-20 overflow-y-auto",
              task.description
                ? "text-muted-foreground"
                : !isDescriptionEditing
                  ? "text-muted-foreground/60 italic"
                  : "text-muted-foreground",
              // Only show when there's content or when hovering
              !task.description && !isHovered && "invisible",
            )}
            data-action="edit"
            multiline={true}
            allowEmpty={true}
            onEditingChange={setIsDescriptionEditing}
          />
        </div>

        {/* Bottom row with labels on left and metadata on right */}
        <div className="flex items-center justify-between">
          {/* Left side - Labels */}
          <div className="flex flex-wrap gap-1 flex-1 min-w-0">
            {taskLabels.length > 0 ? (
              <>
                {taskLabels.slice(0, 2).map((label) => (
                  <LabelManagementPopover
                    key={label.id}
                    task={task}
                    onAddLabel={(labelName) => {
                      if (labelName) {
                        const newLabel = allLabels.find((l) => l.name === labelName) || {
                          id: createLabelId(uuidv4()),
                          name: labelName,
                          color: "#3b82f6",
                          nextLabelId: null,
                        }
                        updateTask({
                          updateRequest: { id: task.id, labels: [...task.labels, newLabel.id] },
                        })
                      }
                    }}
                    onRemoveLabel={(labelId: LabelId) => {
                      updateTask({
                        updateRequest: {
                          id: task.id,
                          labels: task.labels.filter((id: LabelId) => id !== labelId),
                        },
                      })
                    }}
                  >
                    <Badge
                      variant="outline"
                      className="text-xs px-1.5 py-0.5 cursor-pointer hover:opacity-100"
                      style={{
                        backgroundColor: label.color,
                        borderColor: label.color,
                        color: getContrastColor(label.color),
                      }}
                    >
                      {label.name}
                    </Badge>
                  </LabelManagementPopover>
                ))}
                {taskLabels.length > 2 && (
                  <LabelManagementPopover
                    task={task}
                    onAddLabel={(labelName) => {
                      if (labelName) {
                        const newLabel = allLabels.find((l) => l.name === labelName) || {
                          id: createLabelId(uuidv4()),
                          name: labelName,
                          color: "#3b82f6",
                          nextLabelId: null,
                        }
                        updateTask({
                          updateRequest: { id: task.id, labels: [...task.labels, newLabel.id] },
                        })
                      }
                    }}
                    onRemoveLabel={(labelId: LabelId) => {
                      updateTask({
                        updateRequest: {
                          id: task.id,
                          labels: task.labels.filter((id: LabelId) => id !== labelId),
                        },
                      })
                    }}
                  >
                    <Badge
                      variant="outline"
                      className="text-xs px-1.5 py-0.5 cursor-pointer hover:opacity-100"
                    >
                      +{taskLabels.length - 2}
                    </Badge>
                  </LabelManagementPopover>
                )}
              </>
            ) : (
              <LabelManagementPopover
                task={task}
                onAddLabel={(labelName) => {
                  if (labelName) {
                    const existingLabel = allLabels.find((l) => l.name === labelName)
                    if (existingLabel) {
                      updateTask({
                        updateRequest: {
                          id: task.id,
                          labels: [...task.labels, existingLabel.id],
                        },
                      })
                    } else {
                      // Create a new label ID (this should ideally be handled by a label creation atom)
                      const newLabelId = createLabelId(uuidv4())
                      updateTask({
                        updateRequest: { id: task.id, labels: [...task.labels, newLabelId] },
                      })
                    }
                  }
                }}
                onRemoveLabel={(labelId: LabelId) => {
                  updateTask({
                    updateRequest: {
                      id: task.id,
                      labels: task.labels.filter((id: LabelId) => id !== labelId),
                    },
                  })
                }}
              >
                <span className="group flex items-center gap-1 cursor-pointer text-muted-foreground hover:text-foreground opacity-70 hover:opacity-100">
                  <Tag className="h-3 w-3" />
                  <span className="text-xs hidden group-hover:inline">
                    {t("actions.addLabels", "Add labels")}
                  </span>
                </span>
              </LabelManagementPopover>
            )}
          </div>

          {/* Right side - Metadata icons with nice spacing */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-shrink-0">
            {/* Subtasks - show if present or on hover */}
            {task.subtasks.length > 0 ? (
              <SubtaskPopover task={task}>
                <span className="flex items-center gap-1 cursor-pointer hover:opacity-100 text-foreground">
                  <CheckSquare className="h-3 w-3" />
                  {task.subtasks.filter((s: Subtask) => s.completed).length}/{task.subtasks.length}
                </span>
              </SubtaskPopover>
            ) : (
              <SubtaskPopover task={task}>
                <span className="flex items-center cursor-pointer text-muted-foreground hover:text-foreground opacity-70 hover:opacity-100">
                  <CheckSquare className="h-3 w-3" />
                </span>
              </SubtaskPopover>
            )}

            {/* Comments - show if present or on hover */}
            {task.comments.length > 0 ? (
              <CommentManagementPopover
                task={task}
                onAddComment={(content) => addComment({ taskId: task.id, content })}
              >
                <span className="flex items-center gap-1 cursor-pointer hover:opacity-100 text-foreground">
                  <MessageSquare className="h-3 w-3" />
                  {task.comments.length}
                </span>
              </CommentManagementPopover>
            ) : (
              <CommentManagementPopover
                task={task}
                onAddComment={(content) => addComment({ taskId: task.id, content })}
              >
                <span className="flex items-center cursor-pointer text-muted-foreground hover:text-foreground opacity-70 hover:opacity-100">
                  <MessageSquare className="h-3 w-3" />
                </span>
              </CommentManagementPopover>
            )}

            {/* Attachments - show if present */}
            {task.attachments.length > 0 && (
              <span className="flex items-center gap-1">
                <Paperclip className="h-3 w-3" />
                {task.attachments.length}
              </span>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Calendar variant render - minimal layout for calendar days
  if (variant === "calendar") {
    return (
      <div
        className={cn(
          "group/task text-xs p-0.5 lg:p-1 rounded cursor-pointer transition-all duration-200 border border-border border-l-3",
          task.completed
            ? "bg-muted text-muted-foreground line-through"
            : "bg-card hover:bg-accent",
          getPriorityColor(task.priority, "calendar"),
          className,
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handleTaskClick}
      >
        <LinkifiedText as="span" className="truncate text-xs">
          {task.title}
        </LinkifiedText>
      </div>
    )
  }

  // Subtask variant render - minimal layout for subtasks
  if (variant === "subtask") {
    // Get current subtask's estimation from parent
    const parent = parentTask || quickAddTask
    const currentSubtask = parent.subtasks?.find((s) => String(s.id) === String(taskId))
    const currentEstimation = currentSubtask?.estimation || 0

    return (
      <div
        className={cn(
          "group/task flex items-center rounded-md transition-colors p-2 bg-muted/50 hover:bg-muted/70",
          task.completed && "opacity-60",
          className,
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <TaskCheckbox
          checked={task.completed}
          onCheckedChange={() => handleSubtaskToggle()}
          className="mr-3"
        />
        <LinkifiedEditableDiv
          as="span"
          value={task.title}
          onChange={(newTitle) => {
            if (newTitle.trim() && newTitle !== task.title) {
              handleSubtaskTitleUpdate(newTitle)
            }
          }}
          className={cn(
            "flex-1 text-sm leading-5 border border-transparent hover:border-accent mr-3",
            task.completed ? "line-through text-muted-foreground" : "text-foreground",
          )}
          data-action="edit"
          allowEmpty={false}
        />
        <div className="h-6 flex items-center gap-1">
          {currentEstimation > 0 && (
            <TimeEstimationPopover
              value={currentEstimation}
              onChange={handleSubtaskEstimationUpdate}
            >
              <div
                className={cn(
                  "h-6 min-w-6 px-1 hover:no-underline flex items-center justify-center cursor-pointer rounded-md border border-transparent hover:bg-accent hover:border-border transition-colors text-foreground",
                )}
              >
                <div className="flex items-center gap-0.5">
                  <ClockFading className="h-2.5 w-2.5 opacity-70" />
                  <span className="text-xs font-medium leading-none">
                    {formatTime(currentEstimation)}
                  </span>
                </div>
              </div>
            </TimeEstimationPopover>
          )}
          <TaskActionsMenu
            task={task}
            isVisible={actionsMenuVisible}
            onDeleteClick={handleSubtaskDelete}
            onEstimationClick={handleEstimationMenuClick}
            variant="subtask"
            open={actionsMenuOpen}
            onOpenChange={handleActionsMenuChange}
          />
        </div>

        {/* Hidden TimeEstimationPicker to be triggered programmatically from menu */}
        <TimeEstimationPicker
          value={currentEstimation}
          onChange={handleSubtaskEstimationUpdate}
          trigger={<button type="button" className="sr-only" aria-hidden="true" />}
          open={showEstimationPicker}
          setOpen={setShowEstimationPicker}
          triggerMode="click"
          disableOutsideInteraction={actionsMenuOpen}
        />
      </div>
    )
  }

  // Default variant render
  return (
    <div
      className={cn(
        "group relative p-2 sm:p-3 md:p-4 rounded-lg border border-border border-l-3 transition-all duration-200",
        "hover:shadow-md dark:hover:shadow-gray-300/30",
        task.completed && "opacity-60",
        isSelected ? "bg-accent text-accent-foreground border-accent-foreground/20" : "bg-card",
        "cursor-pointer",
        getPriorityColor(task.priority, variant),
        className,
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleTaskClick}
      onContextMenu={handleContextMenu}
      data-task-focused={isSelected}
    >
      {/* Main Layout - Flex with proper alignment */}
      <div className="flex gap-2 sm:gap-3">
        {/* Left Side - Checkboxes aligned with title */}
        <div className="flex items-start gap-2 sm:gap-3 flex-shrink-0">
          {/* Selection Checkbox */}
          {isSelectionMode && (
            <TaskCheckbox
              checked={isSelected}
              onCheckedChange={() => toggleTaskSelection(taskId)}
            />
          )}

          {/* Task Completion Checkbox */}
          <TaskCheckbox
            checked={task.completed}
            onCheckedChange={() => toggleTask(task.id)}
            data-action="toggle"
          />
        </div>

        {/* Right Side - All Content Vertically Aligned */}
        <div className="flex-1 min-w-0">
          {/* Title Row */}
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="flex items-start gap-2 flex-1 min-w-0">
              {/* Title - Responsive max-width */}
              <LinkifiedEditableDiv
                as="h3"
                value={task.title}
                onChange={(newTitle) => {
                  if (newTitle.trim() && newTitle !== task.title) {
                    updateTask({ updateRequest: { id: task.id, title: newTitle.trim() } })
                  }
                }}
                className={cn(
                  "font-medium text-sm sm:text-[15px] leading-5 w-fit",
                  "max-w-[200px] sm:max-w-[300px] md:max-w-[400px] lg:max-w-lg",
                  task.completed ? "line-through text-muted-foreground" : "text-foreground",
                )}
                data-action="edit"
                allowEmpty={false}
              />

              {/* Favorite Star */}
              {task.favorite && (
                <Star className="h-3 sm:h-4 w-3 sm:w-4 text-yellow-500 fill-current flex-shrink-0" />
              )}
            </div>

            {/* Timer and Actions - Now on the right */}
            <div className="flex items-center gap-2">
              <TimeEstimationPopover taskId={task.id}>
                <TimeEstimationTrigger task={task} />
              </TimeEstimationPopover>
              {shouldShowFocusTimer(task.id, activeFocusTimer) && (
                <FocusTimerPopover taskId={task.id}>
                  <FocusTimerTrigger taskId={task.id} />
                </FocusTimerPopover>
              )}
              <TaskActionsMenu
                task={task}
                isVisible={actionsMenuVisible}
                onDeleteClick={() => deleteTask(task.id)}
                variant="compact"
                open={actionsMenuOpen}
                onOpenChange={handleActionsMenuChange}
              />
            </div>
          </div>

          {/* Description - Responsive width, hide on very small screens when empty */}
          <div className={cn("mb-2", !task.description && !isHovered && "hidden sm:block")}>
            <EditableDiv
              as="p"
              value={task.description || ""}
              onChange={(newDescription) => {
                updateTask({ updateRequest: { id: task.id, description: newDescription } })
              }}
              placeholder={t("placeholders.addDescription", "Add description...")}
              className={cn(
                "text-xs sm:text-sm cursor-text hover:bg-accent px-1 py-0.5 rounded transition-colors max-h-20 overflow-y-auto",
                "min-w-[150px] sm:min-w-[200px] md:min-w-64",
                "max-w-[250px] sm:max-w-[350px] md:max-w-[450px] lg:max-w-lg",
                task.description
                  ? "text-muted-foreground"
                  : !isDefaultDescriptionEditing
                    ? "text-muted-foreground/60 italic"
                    : "text-muted-foreground",
                // Only show when there's content or when hovering
                !task.description && !isHovered && "invisible",
              )}
              data-action="edit"
              multiline={true}
              allowEmpty={true}
              onEditingChange={setIsDefaultDescriptionEditing}
            />
          </div>

          {/* Task Metadata - Clean Single Line with Icons */}
          {(() => {
            const leftMetadataItems = []
            const rightMetadataItems = []

            // Left side - Fixed width items
            // Due Date/Recurring - Now clickable with popover
            if (task.dueDate || task.recurring) {
              leftMetadataItems.push(
                <TaskSchedulePopover key="due-date" taskId={task.id}>
                  <TaskDueDate
                    dueDate={task.dueDate}
                    dueTime={task.dueTime}
                    recurring={task.recurring}
                    completed={task.completed}
                    variant={variant}
                    className={cn("cursor-pointer hover:opacity-100", METADATA_COLUMN_WIDTH)}
                  />
                </TaskSchedulePopover>,
              )
            } else {
              // Show add due date button
              leftMetadataItems.push(
                <TaskSchedulePopover key="due-date" taskId={task.id}>
                  <span
                    className={cn(
                      "group flex items-center gap-1 cursor-pointer text-muted-foreground hover:text-foreground opacity-70 hover:opacity-100",
                      METADATA_COLUMN_WIDTH,
                    )}
                  >
                    <Calendar className="h-3 w-3" />
                    <span className="text-xs hidden group-hover:inline">
                      {t("actions.addDate", "Add date")}
                    </span>
                  </span>
                </TaskSchedulePopover>,
              )
            }

            // Priority Flag - Now clickable with popover
            if (task.priority < 4) {
              leftMetadataItems.push(
                <PriorityPopover key="priority" task={task}>
                  <span
                    className={cn(
                      "flex items-center gap-1 cursor-pointer hover:opacity-100",
                      METADATA_COLUMN_WIDTH,
                      getPriorityTextColor(task.priority),
                    )}
                  >
                    <Flag className="h-3 w-3" />P{task.priority}
                  </span>
                </PriorityPopover>,
              )
            } else {
              // Show add priority button when priority is 4 (no priority)
              leftMetadataItems.push(
                <PriorityPopover key="priority-hover" task={task}>
                  <span
                    className={cn(
                      "group flex items-center gap-1 cursor-pointer text-muted-foreground hover:text-foreground opacity-70 hover:opacity-100",
                      METADATA_COLUMN_WIDTH,
                    )}
                  >
                    <Flag className="h-3 w-3" />
                    <span className="text-xs hidden group-hover:inline">
                      {t("actions.addPriority", "Add priority")}
                    </span>
                  </span>
                </PriorityPopover>,
              )
            }

            // Subtasks - Show if present or add subtask
            const completed = task.subtasks.filter((s: Subtask) => s.completed).length
            leftMetadataItems.push(
              <SubtaskPopover key="subtasks" task={task}>
                {task.subtasks.length > 0 ? (
                  <span
                    className={cn(
                      "flex items-center gap-1 cursor-pointer hover:opacity-100 text-foreground",
                      METADATA_COLUMN_WIDTH,
                    )}
                  >
                    <CheckSquare className="h-3 w-3" />
                    {completed}/{task.subtasks.length}
                  </span>
                ) : (
                  <span
                    className={cn(
                      "group flex items-center gap-1 cursor-pointer text-muted-foreground hover:text-foreground whitespace-nowrap opacity-70 hover:opacity-100",
                      METADATA_COLUMN_WIDTH,
                    )}
                  >
                    <CheckSquare className="h-3 w-3" />
                    <span className="text-xs hidden group-hover:inline">
                      {t("actions.addSubtask", "Add subtask")}
                    </span>
                  </span>
                )}
              </SubtaskPopover>,
            )

            // Comments - Use unified popover for both viewing and adding
            if (task.comments.length > 0) {
              leftMetadataItems.push(
                <CommentManagementPopover
                  key="comments"
                  task={task}
                  onAddComment={(content) => addComment({ taskId: task.id, content })}
                  onOpenChange={(open) => {
                    if (!open) return
                    // TODO: Handle onViewAll functionality if needed
                  }}
                >
                  <span
                    className={cn(
                      "flex items-center gap-1 cursor-pointer hover:opacity-100 text-foreground",
                      METADATA_COLUMN_WIDTH,
                    )}
                  >
                    <MessageSquare className="h-3 w-3" />
                    {task.comments.length}
                  </span>
                </CommentManagementPopover>,
              )
            } else {
              // Show add comment button when no comments exist
              leftMetadataItems.push(
                <CommentManagementPopover
                  key="comments"
                  task={task}
                  onAddComment={(content) => addComment({ taskId: task.id, content })}
                >
                  <span
                    className={cn(
                      "group flex items-center gap-1 cursor-pointer text-muted-foreground hover:text-foreground whitespace-nowrap opacity-70 hover:opacity-100",
                      METADATA_COLUMN_WIDTH,
                    )}
                  >
                    <MessageSquare className="h-3 w-3" />
                    <span className="text-xs hidden group-hover:inline">
                      {t("actions.addComment", "Add comment")}
                    </span>
                  </span>
                </CommentManagementPopover>,
              )
            }

            // Right side - Flexible width items
            // Labels - Now clickable with popover for editing
            if (task.labels.length > 0) {
              const taskLabels = getLabelsFromIds(task.labels)
              rightMetadataItems.push(
                <LabelManagementPopover
                  key="labels"
                  task={task}
                  onAddLabel={handleAddLabel}
                  onRemoveLabel={handleRemoveLabel}
                >
                  <span className="flex items-center gap-1 cursor-pointer">
                    {taskLabels.map((label) => (
                      <span
                        key={label.id}
                        className="px-1.5 py-0.5 rounded text-xs flex items-center gap-1 hover:opacity-100"
                        style={{
                          backgroundColor: label.color,
                          color: getContrastColor(label.color),
                        }}
                      >
                        <Tag className="h-3 w-3" />
                        {label.name}
                      </span>
                    ))}
                  </span>
                </LabelManagementPopover>,
              )
            } else {
              // Show add labels button when no labels
              rightMetadataItems.push(
                <LabelManagementPopover
                  key="labels"
                  task={task}
                  onAddLabel={handleAddLabel}
                  onRemoveLabel={handleRemoveLabel}
                >
                  <span className="group flex items-center gap-1 cursor-pointer text-muted-foreground hover:text-foreground opacity-70 hover:opacity-100">
                    <Tag className="h-3 w-3" />
                    <span className="text-xs hidden group-hover:inline">
                      {t("actions.addLabel", "Add label")}
                    </span>
                  </span>
                </LabelManagementPopover>,
              )
            }

            // Project - Now clickable with project picker (always show to maintain consistent width)
            if (showProjectBadge) {
              if (taskProject) {
                rightMetadataItems.push(
                  <ProjectPopover key="project" task={task}>
                    <span
                      className={cn(
                        "flex items-center gap-1 cursor-pointer hover:opacity-100",
                        METADATA_COLUMN_WIDTH,
                      )}
                    >
                      <Folder
                        className="h-3 w-3 flex-shrink-0"
                        style={{ color: taskProject.color }}
                      />
                      <span className="truncate">{taskProject.name}</span>
                    </span>
                  </ProjectPopover>,
                )
              } else if (allProjects.length > 0) {
                // Always show project area to maintain consistent width
                rightMetadataItems.push(
                  <ProjectPopover key="project-hover" task={task}>
                    <span
                      className={cn(
                        "group flex items-center gap-1 cursor-pointer text-muted-foreground hover:text-foreground opacity-70 hover:opacity-100",
                        METADATA_COLUMN_WIDTH,
                      )}
                    >
                      <Folder className="h-3 w-3" />
                      <span className="text-xs truncate hidden group-hover:inline">
                        {t("actions.addProject", "Add project")}
                      </span>
                    </span>
                  </ProjectPopover>,
                )
              } else {
                // Always maintain space even with no projects available
                rightMetadataItems.push(
                  <span
                    key="project-placeholder"
                    className={cn("invisible", METADATA_COLUMN_WIDTH)}
                  >
                    <Folder className="h-3 w-3" />
                    <span className="text-xs">Placeholder</span>
                  </span>,
                )
              }
            }

            // Attachments (keeping on left for now)
            if (task.attachments.length > 0) {
              leftMetadataItems.push(
                <span
                  key="attachments"
                  className={cn("flex items-center gap-1", METADATA_COLUMN_WIDTH)}
                >
                  <Paperclip className="h-3 w-3" />
                  {task.attachments.length}
                </span>,
              )
            }

            return leftMetadataItems.length > 0 || rightMetadataItems.length > 0 ? (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-muted-foreground">
                {/* Left side - Fixed width columns, responsive layout */}
                <div className="flex flex-wrap items-center gap-2 sm:gap-0">
                  {leftMetadataItems.map((item, index) => (
                    <React.Fragment key={index}>
                      {item}
                      {index < leftMetadataItems.length - 1 && (
                        <span className="hidden sm:inline mx-2 md:mx-3 text-border">|</span>
                      )}
                    </React.Fragment>
                  ))}
                </div>

                {/* Right side - Labels and Project, responsive layout */}
                {rightMetadataItems.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 sm:gap-0">
                    {rightMetadataItems.map((item, index) => (
                      <React.Fragment key={index}>
                        {item}
                        {index < rightMetadataItems.length - 1 && (
                          <span className="hidden sm:inline mx-2 md:mx-3 text-border">|</span>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                )}
              </div>
            ) : null
          })()}
        </div>
      </div>
    </div>
  )
}
