"use client"

import type React from "react"
import { useState, useEffect, useMemo, useRef, useCallback, createContext } from "react"
import { Dialog, DialogContentWithoutOverlay, DialogTitle } from "@/components/ui/dialog"
import { Drawer, DrawerContent, DrawerHeader } from "@/components/ui/custom/drawer"
import { Button } from "@/components/ui/button"
import { PillActionButton } from "@/components/ui/custom/pill-action-button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { EnhancedHighlightedInput } from "@/components/ui/enhanced-highlighted-input"
import {
  Tag,
  X,
  Folder,
  Flag,
  // MoreHorizontal,
  CheckSquare,
  MessageSquare,
  Clock,
  Users,
  CopyPlus,
  ScanText,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"
import { useAtomValue, useSetAtom } from "jotai"
import { labelsAtom, tasksAtom, usersAtom, userAtom } from "@tasktrove/atoms/data/base/atoms"
import { visibleProjectsAtom, addProjectAtom } from "@tasktrove/atoms/core/projects"
import { addLabelAndWaitForRealIdAtom } from "@tasktrove/atoms/core/labels"
import { addTaskAtom } from "@tasktrove/atoms/core/tasks"
import { nlpEnabledAtom } from "@tasktrove/atoms/ui/dialogs"
import {
  showQuickAddAtom,
  closeQuickAddAtom,
  quickAddTaskAtom,
  updateQuickAddTaskAtom,
  resetQuickAddTaskAtom,
  copyTaskAtom,
  resetCopyTaskAtom,
} from "@tasktrove/atoms/ui/dialogs"
import { currentRouteContextAtom } from "@tasktrove/atoms/ui/navigation"
import {
  currentViewAtom,
  isCalendarViewAtom,
  selectedCalendarDateAtom,
} from "@tasktrove/atoms/ui/views"
import { DEFAULT_COLOR_PALETTE } from "@tasktrove/constants"
import { TaskSchedulePopover } from "@/components/task/task-schedule-popover"
import { TaskScheduleTrigger } from "@/components/task/task-schedule-trigger"
import { LabelManagementPopover } from "@/components/task/label-management-popover"
import { ProjectPopover } from "@/components/task/project-popover"
import { TaskPriorityPopover } from "@/components/task/task-priority-popover"
import { TimeEstimationPopover } from "@/components/task/time-estimation-popover"
import { formatTime } from "@/lib/utils/time-estimation"
import { SubtaskPopover } from "@/components/task/subtask-popover"
import { CommentManagementPopover } from "@/components/task/comment-management-popover"
import { SubmitButton } from "@/components/ui/custom/submit-button"
import { ContentPopover } from "@/components/ui/content-popover"
import { INBOX_PROJECT_ID } from "@tasktrove/types/constants"
import type { CreateTaskRequest } from "@tasktrove/types/api-requests"
import type { ProjectId, LabelId, GroupId } from "@tasktrove/types/id"
import type { TaskPriority } from "@tasktrove/types/constants"
import { ProjectIdSchema, LabelIdSchema } from "@tasktrove/types/id"
import { createSubtaskId, createCommentId } from "@tasktrove/types/id"
import { taskToCreateTaskRequest } from "@tasktrove/types/utils"
import { PLACEHOLDER_TASK_INPUT } from "@tasktrove/constants"
import { log } from "@/lib/utils/logger"
import { v4 as uuidv4 } from "uuid"
import { getPriorityTextColor } from "@/lib/color-utils"
import { useDebouncedParse } from "@/hooks/use-debounced-parse"
import { useQuickAddSync } from "@/hooks/use-quick-add-sync"
import { useTranslation } from "@tasktrove/i18n"
import { generateEstimationSuggestions } from "@/lib/utils/shared-patterns"
import { UnsavedConfirmationDialog } from "@/components/dialogs/unsaved-confirmation-dialog"
import { PeopleManagementPopover } from "@/components/task/people-management-popover"
import { AssigneeBadges } from "@/components/task/assignee-badges"
import { getProViewUpdates } from "@/components/dialogs/quick-add-helpers"
import { getAssigneeAutocompleteItems } from "@/components/dialogs/quick-add-autocomplete-items"
import type { AutocompleteType } from "@tasktrove/parser/types"
import { useIsMobile } from "@/hooks/use-mobile"

// Enhanced autocomplete interface
interface AutocompleteItem {
  id: string
  label: string
  icon: React.ReactNode
  type: AutocompleteType
  value?: string
  isCreateOption?: boolean
}

interface QuickAddShortcutMetadata {
  id: string
  label: string
  keys: string[]
}

type QuickAddShortcutListener = (
  shortcut: QuickAddShortcutMetadata,
  event: React.KeyboardEvent,
) => void

interface QuickAddShortcutRegistry {
  registerShortcutListener: (listener: QuickAddShortcutListener) => () => void
}

export const QuickAddShortcutContext = createContext<QuickAddShortcutRegistry | null>(null)

// Use these helpers for quick-add prefills so we never overwrite values already set by other flows.
type QuickAddPrefillUpdates = Partial<CreateTaskRequest>

const createQuickAddPrefillHelpers = (
  currentTask: CreateTaskRequest,
  updates: QuickAddPrefillUpdates,
) => {
  const hasValue = <K extends keyof CreateTaskRequest>(key: K) => {
    const value = updates[key] ?? currentTask[key]
    return value !== undefined
  }

  const setDefault = <K extends keyof CreateTaskRequest>(key: K, value?: CreateTaskRequest[K]) => {
    if (value === undefined) return
    if (hasValue(key)) return
    updates[key] = value
  }

  const mergeDefaultLabels = (values: LabelId[] | undefined | null) => {
    if (!values || values.length === 0) return
    const existing = updates.labels ?? currentTask.labels ?? []
    const merged = [...existing]

    for (const value of values) {
      if (!merged.includes(value)) merged.push(value)
    }

    if (merged.length === existing.length && updates.labels !== undefined) return
    updates.labels = merged
  }

  const applyDefaults = (defaults: QuickAddPrefillUpdates) => {
    const isCreateTaskKey = (key: string): key is keyof CreateTaskRequest => key in currentTask
    for (const [key, value] of Object.entries(defaults)) {
      if (!isCreateTaskKey(key)) continue
      setDefault(key, value)
    }
  }

  return { setDefault, mergeDefaultLabels, applyDefaults }
}

export function QuickAddDialog() {
  const isMobile = useIsMobile()
  // Dialog state atoms
  const open = useAtomValue(showQuickAddAtom)
  const closeDialog = useSetAtom(closeQuickAddAtom)
  const copyTaskId = useAtomValue(copyTaskAtom)
  const resetCopyTask = useSetAtom(resetCopyTaskAtom)

  const shortcutListenersRef = useRef<Set<QuickAddShortcutListener>>(new Set())
  const [keepOpen, setKeepOpen] = useState(false)
  const registerShortcutListener = useCallback((listener: QuickAddShortcutListener) => {
    shortcutListenersRef.current.add(listener)
    return () => shortcutListenersRef.current.delete(listener)
  }, [])
  const shortcutContextValue = useMemo<QuickAddShortcutRegistry>(() => {
    return { registerShortcutListener }
  }, [registerShortcutListener])
  const notifyShortcutListeners = useCallback(
    (shortcut: QuickAddShortcutMetadata, event: React.KeyboardEvent) => {
      shortcutListenersRef.current.forEach((listener) => listener(shortcut, event))
    },
    [],
  )

  // Translation hooks
  const { t } = useTranslation("dialogs")

  // Route context for current project and label
  const routeContext = useAtomValue(currentRouteContextAtom)
  const currentView = useAtomValue(currentViewAtom)
  const isCalendarView = useAtomValue(isCalendarViewAtom)
  const selectedCalendarDate = useAtomValue(selectedCalendarDateAtom)
  const currentProject: ProjectId = (() => {
    if (routeContext.routeType === "project") {
      try {
        return ProjectIdSchema.parse(routeContext.viewId)
      } catch {
        return INBOX_PROJECT_ID
      }
    }
    return INBOX_PROJECT_ID
  })()

  const currentLabel: LabelId | null = (() => {
    if (routeContext.routeType === "label") {
      try {
        return LabelIdSchema.parse(routeContext.viewId)
      } catch {
        return null
      }
    }
    return null
  })()

  // UI-only state (stays local)
  const [input, setInput] = useState("")
  const [showConfirmCloseDialog, setShowConfirmCloseDialog] = useState(false)
  const [autocompleteOpen, setAutocompleteOpen] = useState(false)

  const newTask: CreateTaskRequest = useAtomValue(quickAddTaskAtom)
  const updateNewTask = useSetAtom(updateQuickAddTaskAtom)
  const resetNewTask = useSetAtom(resetQuickAddTaskAtom)

  // Ref for programmatic access to the submit button
  const submitButtonRef = useRef<HTMLButtonElement>(null)

  // Get data from atoms
  const labels = useAtomValue(labelsAtom)
  const projects = useAtomValue(visibleProjectsAtom)
  const tasks = useAtomValue(tasksAtom)
  const users = useAtomValue(usersAtom)
  const currentUserId = useAtomValue(userAtom).id
  const addTask = useSetAtom(addTaskAtom)
  const addProject = useSetAtom(addProjectAtom)
  const addLabelAndWaitForRealId = useSetAtom(addLabelAndWaitForRealIdAtom)
  const nlpEnabled = useAtomValue(nlpEnabledAtom)
  const setNlpEnabled = useSetAtom(nlpEnabledAtom)

  // Get the task to copy
  const taskToCopy = copyTaskId ? tasks.find((t) => t.id === copyTaskId) : null

  // Track toggled-off parser sections so users can click tokens to disable/enable them
  const [disabledSections, setDisabledSections] = useState<Set<string>>(new Set())
  const handleToggleSection = useCallback((section: string) => {
    setDisabledSections((prev) => {
      const next = new Set(prev)
      if (next.has(section)) {
        next.delete(section)
      } else {
        next.add(section)
      }
      return next
    })
  }, [])

  // Use debounced parsing for better performance (disabled when NLP toggle is off)
  const parsed = useDebouncedParse(input, disabledSections)

  // Use hook for syncing parsed values to task atom
  const {
    projectSetByParsingRef,
    prioritySetByParsingRef,
    dueDateSetByParsingRef,
    dueTimeSetByParsingRef,
    recurringSetByParsingRef,
    labelsSetByParsingRef,
    estimationSetByParsingRef,
  } = useQuickAddSync({
    parsed,
    nlpEnabled,
    updateNewTask,
    newTask,
    projects,
    labels,
    users,
  })

  // Initialize initialTask after newTask is available
  const [initialTask, setInitialTask] = useState<typeof newTask>(newTask)
  const hasInitializedRef = useRef(false)
  const reinitializeTimeoutRef = useRef<number | null>(null)

  const initializeQuickAddState = useCallback(() => {
    let updates: Partial<CreateTaskRequest> = {}
    let nextInput = ""

    if (taskToCopy) {
      const subtasksWithNewIds = taskToCopy.subtasks.map((subtask) => ({
        ...subtask,
        id: createSubtaskId(uuidv4()),
      }))

      const commentsWithNewIds = taskToCopy.comments.map((comment) => ({
        ...comment,
        id: createCommentId(uuidv4()),
      }))

      const taskWithNewIds = {
        ...taskToCopy,
        subtasks: subtasksWithNewIds,
        comments: commentsWithNewIds,
      }

      const copyData = taskToCreateTaskRequest({ task: taskWithNewIds, omit: ["trackingId"] })

      updates = copyData
      nextInput = taskToCopy.title
    } else {
      const prefill = createQuickAddPrefillHelpers(newTask, updates)

      if (currentLabel) {
        prefill.mergeDefaultLabels([currentLabel])
      } else if (currentProject) {
        prefill.setDefault("projectId", currentProject)
      }

      if (routeContext.viewId === "today") {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        prefill.setDefault("dueDate", today)
      }

      if (routeContext.viewId === "habits") {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        prefill.setDefault("dueDate", today)
        prefill.setDefault("recurring", "RRULE:FREQ=DAILY")
        prefill.setDefault("recurringMode", "autoRollover")
      }

      const isCalendarContext =
        isCalendarView || currentView === "calendar" || routeContext.viewId === "calendar"

      if (isCalendarContext && selectedCalendarDate) {
        const calendarDate = new Date(selectedCalendarDate)
        calendarDate.setHours(0, 0, 0, 0)
        prefill.setDefault("dueDate", calendarDate)
      }

      const proUpdates = getProViewUpdates(routeContext, users, currentUserId)
      prefill.applyDefaults(proUpdates)
    }

    if (Object.keys(updates).length > 0) {
      updateNewTask({ updateRequest: updates })
      const updatedTask = { ...newTask, ...updates }
      setInitialTask(updatedTask)
      nextInput = nextInput || updatedTask.title || ""
    } else {
      setInitialTask({ ...newTask })
      nextInput = nextInput || newTask.title || ""
    }

    setInput(nextInput)
    hasInitializedRef.current = true
  }, [
    currentLabel,
    currentProject,
    currentUserId,
    currentView,
    isCalendarView,
    newTask,
    routeContext,
    selectedCalendarDate,
    taskToCopy,
    updateNewTask,
    users,
  ])

  const initializeQuickAddStateRef = useRef(initializeQuickAddState)
  useEffect(() => {
    initializeQuickAddStateRef.current = initializeQuickAddState
  }, [initializeQuickAddState])

  useEffect(() => {
    return () => {
      if (reinitializeTimeoutRef.current) {
        window.clearTimeout(reinitializeTimeoutRef.current)
        reinitializeTimeoutRef.current = null
      }
    }
  }, [])

  // Auto-initialize values based on route context when dialog opens
  useEffect(() => {
    if (open && !hasInitializedRef.current) {
      initializeQuickAddState()
    } else if (!open) {
      hasInitializedRef.current = false
      resetCopyTask()
    }
  }, [initializeQuickAddState, open, resetCopyTask])

  // Prepare autocomplete items
  const autocompleteItems = useMemo(
    () => ({
      projects: projects.map(
        (project): AutocompleteItem => ({
          id: project.id,
          label: project.name,
          icon: <Folder className="w-3 h-3" style={{ color: project.color }} />,
          type: "project",
        }),
      ),
      labels: labels.map(
        (label): AutocompleteItem => ({
          id: label.id,
          label: label.name,
          icon: <div className="w-3 h-3 rounded-full" style={{ backgroundColor: label.color }} />,
          type: "label",
        }),
      ),
      dates: [
        // ...DATE_SUGGESTIONS.map((date): AutocompleteItem & { value: string } => ({
        //   id: date.value,
        //   label: date.display,
        //   icon: <span className="text-xs">{date.icon}</span>,
        //   type: "date",
        //   value: date.value
        // })),
        // ...TIME_SUGGESTIONS.map((time): AutocompleteItem & { value: string } => ({
        //   id: time.value,
        //   label: time.display,
        //   icon: <Clock className="w-3 h-3" />,
        //   type: "date",
        //   value: time.value
        // }))
      ],
      estimations: generateEstimationSuggestions().map(
        (estimation): AutocompleteItem => ({
          id: estimation.value,
          label: estimation.display,
          icon: <Clock className="w-3 h-3" />,
          type: "estimation",
        }),
      ),
      assignees: getAssigneeAutocompleteItems(users),
    }),
    [projects, labels, users],
  )

  const scheduleReinitialize = useCallback(() => {
    if (reinitializeTimeoutRef.current) {
      window.clearTimeout(reinitializeTimeoutRef.current)
    }

    reinitializeTimeoutRef.current = window.setTimeout(() => {
      initializeQuickAddStateRef.current()
      reinitializeTimeoutRef.current = null
    }, 0)
  }, [])

  const resetQuickAddState = useCallback(
    ({ closeDialog: shouldClose = true }: { closeDialog?: boolean } = {}) => {
      if (reinitializeTimeoutRef.current) {
        window.clearTimeout(reinitializeTimeoutRef.current)
        reinitializeTimeoutRef.current = null
      }

      setInput("")
      resetNewTask()
      setInitialTask({ title: "" })
      projectSetByParsingRef.current = false
      prioritySetByParsingRef.current = false
      dueDateSetByParsingRef.current = false
      dueTimeSetByParsingRef.current = false
      recurringSetByParsingRef.current = false
      labelsSetByParsingRef.current = false
      estimationSetByParsingRef.current = false
      resetCopyTask()

      if (shouldClose) {
        hasInitializedRef.current = false
        setKeepOpen(false)
        closeDialog()
      } else {
        scheduleReinitialize()
      }
    },
    [
      closeDialog,
      resetCopyTask,
      resetNewTask,
      scheduleReinitialize,
      projectSetByParsingRef,
      prioritySetByParsingRef,
      dueDateSetByParsingRef,
      dueTimeSetByParsingRef,
      recurringSetByParsingRef,
      labelsSetByParsingRef,
      estimationSetByParsingRef,
    ],
  )

  const handleSubmit = async () => {
    const keepDialogOpen = keepOpen
    // Require either parsed title or manual input
    const finalTitle = parsed?.title || input.trim()
    if (!finalTitle) return

    // Create final task data from atom + any final overrides
    const taskData: CreateTaskRequest = {
      ...newTask,
      title: finalTitle,
      // Set defaults for required/expected fields if not set
      priority: newTask.priority ?? 4,
      labels: newTask.labels,
      projectId: newTask.projectId,
    }

    await addTask(taskData)

    log.info(
      {
        task: taskData,
        parsedTime: parsed?.time,
        parsedDuration: parsed?.duration,
        newTask: newTask,
        module: "quick-add",
      },
      "Task created via enhanced quick add",
    )

    resetQuickAddState({ closeDialog: !keepDialogOpen })
  }

  interface QuickAddShortcutDefinition extends QuickAddShortcutMetadata {
    matcher: (event: React.KeyboardEvent) => boolean
    handler: () => void
  }

  const triggerSubmit = () => {
    const button = submitButtonRef.current
    if (!button || button.disabled) return
    button.click()
  }

  const handleKeyDown = (event: React.KeyboardEvent) => {
    const shortcutDefinitions: QuickAddShortcutDefinition[] = [
      {
        id: "submit",
        label: "Add task",
        keys: ["Enter"],
        matcher: (e) =>
          e.key === "Enter" &&
          !e.shiftKey &&
          !(e.metaKey || e.ctrlKey) &&
          e.target === e.currentTarget,
        handler: () => {
          triggerSubmit()
        },
      },
    ]

    for (const shortcut of shortcutDefinitions) {
      if (shortcut.matcher(event)) {
        event.preventDefault()
        const { matcher, handler, ...metadata } = shortcut
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const _ = matcher
        notifyShortcutListeners(metadata, event)
        handler()
        break
      }
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value)
  }

  // Helper functions
  const handleAddProject = async (projectName?: string) => {
    const trimmedName = projectName?.trim()
    if (!trimmedName) return

    const existingProject = projects.find(
      (project) => project.name.toLowerCase() === trimmedName.toLowerCase(),
    )

    let projectId: ProjectId | undefined

    if (!existingProject) {
      const randomColor =
        DEFAULT_COLOR_PALETTE[Math.floor(Math.random() * DEFAULT_COLOR_PALETTE.length)] ?? "#3b82f6"

      projectId = await addProject({ name: trimmedName, color: randomColor })
    } else {
      projectId = existingProject.id
    }

    if (!projectId) return

    projectSetByParsingRef.current = false
    updateNewTask({ updateRequest: { projectId, sectionId: undefined } })
  }

  const handleAutocompleteSelect = (item: AutocompleteItem) => {
    // Enhanced autocomplete selection is handled by the EnhancedHighlightedInput component
    if (item.isCreateOption) {
      if (item.type === "label") {
        void handleAddLabel(item.value ?? item.label)
      } else if (item.type === "project") {
        void handleAddProject(item.value ?? item.label)
      }
    }
  }

  const handleAddLabel = async (labelName?: string) => {
    const trimmedName = labelName?.trim()
    if (trimmedName) {
      const existingLabel = labels.find(
        (label) => label.name.toLowerCase() === trimmedName.toLowerCase(),
      )

      let labelId: LabelId | undefined
      if (!existingLabel) {
        const randomColor =
          DEFAULT_COLOR_PALETTE[Math.floor(Math.random() * DEFAULT_COLOR_PALETTE.length)]

        // Wait for the real label ID from the server
        // Use addLabelAndWaitForRealId to disable optimistic updates and get the real ID immediately
        labelId = await addLabelAndWaitForRealId({
          name: trimmedName,
          color: randomColor,
        })
      } else {
        labelId = existingLabel.id
      }

      // Guard against undefined labelId
      if (!labelId) return

      const currentLabels = newTask.labels || []
      if (!currentLabels.includes(labelId)) {
        labelsSetByParsingRef.current = false
        updateNewTask({ updateRequest: { labels: [...currentLabels, labelId] } })
      }
    }
  }

  const handleRemoveLabel = (labelIdToRemove: LabelId) => {
    const currentLabels = newTask.labels || []
    labelsSetByParsingRef.current = false
    updateNewTask({
      updateRequest: { labels: currentLabels.filter((labelId) => labelId !== labelIdToRemove) },
    })
  }

  const handleManualProjectSelect = (projectId: ProjectId, sectionId?: GroupId) => {
    projectSetByParsingRef.current = false
    updateNewTask({ updateRequest: { projectId, sectionId } })
  }

  const handleManualPrioritySelect = (priority: TaskPriority) => {
    prioritySetByParsingRef.current = false
    updateNewTask({ updateRequest: { priority } })
  }

  const handleCloseDialog = () => {
    const hasInputChanges = input.trim() !== ""
    const hasTaskChanges = JSON.stringify(newTask) !== JSON.stringify(initialTask)
    const hasUnsavedData = hasInputChanges || hasTaskChanges

    if (hasUnsavedData) {
      setShowConfirmCloseDialog(true)
    } else {
      performCloseDialog()
    }
  }

  const performCloseDialog = () => {
    resetQuickAddState()
  }

  const handleEscapeKeyDown = (event: KeyboardEvent) => {
    if (autocompleteOpen) {
      // Keep dialog open when autocomplete is visible; the input handler will close the menu.
      event.preventDefault()
    }
  }

  const quickAddTitle = taskToCopy
    ? t("quickAdd.copyTitle", "Duplicate Task")
    : t("quickAdd.title", "New Task")

  const pillBaseClass =
    "h-8 rounded-full px-3 bg-background/40 hover:bg-background/60 ring-1 ring-border/50"

  const quickAddBody = (
    <div className="flex flex-col justify-between gap-1">
      {/* Main Input Row with Smart Parsing toggle */}
      <div>
        <div className="flex items-center gap-2">
          <div className="relative flex-1 pb-3">
            <EnhancedHighlightedInput
              placeholder={PLACEHOLDER_TASK_INPUT}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onAutocompleteVisibilityChange={setAutocompleteOpen}
              autoFocus
              onAutocompleteSelect={handleAutocompleteSelect}
              autocompleteItems={autocompleteItems}
              parserMatches={parsed?.overlayMatches ?? parsed?.matches ?? null}
              disabledSections={disabledSections}
              onToggleSection={handleToggleSection}
            />
          </div>
          {/* Smart Parsing label above compact toggle */}
          <div className="flex flex-col items-center justify-center pl-1 flex-shrink-0 gap-1">
            <ContentPopover
              content={t(
                "quickAdd.smartParsing.help",
                "Smart Parsing automatically detects and extracts task details from your input. It can identify priorities (P1-P4), due dates (tomorrow, next week, etc.), project names (#project), labels (@label), and recurring patterns (daily, weekly).",
              )}
              side="right"
              align="center"
              triggerMode="hover"
              className="w-64 p-2 text-xs leading-relaxed"
              triggerClassName="select-none"
            >
              <label htmlFor="quick-add-nlp-toggle" className="cursor-pointer select-none">
                <ScanText className="h-4 w-4" aria-hidden />
              </label>
            </ContentPopover>
            <VisuallyHidden>
              <label htmlFor="quick-add-nlp-toggle">
                {t("quickAdd.smartParsing.label", "Smart Parsing")}
              </label>
            </VisuallyHidden>
            <Switch
              id="quick-add-nlp-toggle"
              checked={nlpEnabled}
              onCheckedChange={setNlpEnabled}
              className="scale-75"
              data-testid="nlp-toggle"
            />
          </div>
        </div>

        {/* Description */}
        <Textarea
          placeholder={t("quickAdd.description.placeholder", "Description")}
          value={newTask.description ?? ""}
          onChange={(e) => updateNewTask({ updateRequest: { description: e.target.value } })}
          className="border-0 shadow-none focus-visible:ring-0 placeholder:text-gray-400 resize-none p-2 bg-muted/30 focus:bg-background"
          rows={2}
        />
      </div>

      {/* Quick Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-2 sm:pt-3 pb-1">
        <div className="flex items-center gap-1 flex-wrap">
          {/* Due Date */}
          <TaskSchedulePopover>
            <PillActionButton
              icon={
                <TaskScheduleTrigger
                  dueDate={newTask.dueDate ?? undefined}
                  dueTime={newTask.dueTime ?? undefined}
                  recurring={newTask.recurring ?? undefined}
                  recurringMode={newTask.recurringMode}
                  completed={false}
                  variant="button"
                  fallbackLabel={t("quickAdd.buttons.date", "Date")}
                  showLabel={false}
                />
              }
              label={null}
              ariaLabel={t("quickAdd.buttons.date", "Date")}
              className={pillBaseClass}
            />
          </TaskSchedulePopover>

          {/* Priority */}
          <TaskPriorityPopover
            onUpdate={(priority) => handleManualPrioritySelect(priority)}
            align="start"
            contentClassName="w-48 p-1"
          >
            <PillActionButton
              icon={<Flag className="h-3 w-3 flex-shrink-0" />}
              label={null}
              display={
                newTask.priority && newTask.priority < 4 ? `P${newTask.priority}` : undefined
              }
              ariaLabel={t("quickAdd.buttons.priority", "Priority")}
              className={cn(
                pillBaseClass,
                newTask.priority && newTask.priority < 4
                  ? getPriorityTextColor(newTask.priority)
                  : "text-muted-foreground",
              )}
            />
          </TaskPriorityPopover>

          {/* Add Label */}
          <LabelManagementPopover onAddLabel={handleAddLabel} onRemoveLabel={handleRemoveLabel}>
            <PillActionButton
              icon={<Tag className="h-3 w-3 flex-shrink-0" />}
              label={null}
              display={
                newTask.labels && newTask.labels.length > 0 ? `${newTask.labels.length}` : undefined
              }
              ariaLabel={t("quickAdd.buttons.label", "Label")}
              className={cn(
                pillBaseClass,
                newTask.labels && newTask.labels.length > 0
                  ? "text-foreground font-medium"
                  : "text-muted-foreground",
              )}
            />
          </LabelManagementPopover>

          {/* Project */}
          <ProjectPopover
            onUpdate={(projectId, sectionId) => handleManualProjectSelect(projectId, sectionId)}
            align="start"
            contentClassName="w-64 p-0"
          >
            {(() => {
              const selectedProjectId = newTask.projectId
              const project = projects.find((p) => p.id === selectedProjectId)
              const section = project?.sections.find((s) => s.id === newTask.sectionId)
              const valueText = project
                ? `${project.name}${section ? ` • ${section.name}` : ""}`
                : undefined
              return (
                <PillActionButton
                  icon={
                    <Folder
                      className="h-3 w-3 flex-shrink-0"
                      style={{ color: project?.color || undefined }}
                    />
                  }
                  label={null}
                  display={valueText}
                  ariaLabel={t("quickAdd.buttons.project", "Project")}
                  className={cn(pillBaseClass, "text-muted-foreground")}
                  maxLabelWidthClass="max-w-[12rem] sm:max-w-[16rem]"
                />
              )
            })()}
          </ProjectPopover>

          {/* Estimation */}
          <TimeEstimationPopover
            value={newTask.estimation || 0}
            onChange={(seconds) => updateNewTask({ updateRequest: { estimation: seconds || 0 } })}
          >
            <PillActionButton
              icon={<Clock className="h-3 w-3 flex-shrink-0" />}
              label={null}
              display={
                newTask.estimation && newTask.estimation > 0
                  ? formatTime(newTask.estimation)
                  : undefined
              }
              ariaLabel={t("quickAdd.buttons.estimation", "Estimate")}
              className={cn(
                pillBaseClass,
                newTask.estimation && newTask.estimation > 0
                  ? "text-foreground"
                  : "text-muted-foreground",
              )}
            />
          </TimeEstimationPopover>

          {/* People */}
          <PeopleManagementPopover onOpenChange={() => {}}>
            <PillActionButton
              icon={<Users className="h-3 w-3 flex-shrink-0" />}
              label={null}
              display={<AssigneeBadges />}
              ariaLabel={t("quickAdd.buttons.assign", "Assign")}
              className={cn(pillBaseClass, "text-muted-foreground")}
            />
          </PeopleManagementPopover>

          {/* Subtasks */}
          <SubtaskPopover onOpenChange={() => {}}>
            <PillActionButton
              icon={<CheckSquare className="h-3 w-3 flex-shrink-0" />}
              label={null}
              display={
                newTask.subtasks && newTask.subtasks.length > 0
                  ? `${newTask.subtasks.length}`
                  : undefined
              }
              ariaLabel={t("quickAdd.buttons.subtasks", "Subtasks")}
              className={cn(
                pillBaseClass,
                newTask.subtasks && newTask.subtasks.length > 0
                  ? "text-foreground font-medium"
                  : "text-muted-foreground",
              )}
            />
          </SubtaskPopover>

          {/* Comments */}
          <CommentManagementPopover onOpenChange={() => {}}>
            <PillActionButton
              icon={<MessageSquare className="h-3 w-3 flex-shrink-0" />}
              label={null}
              display={
                newTask.comments && newTask.comments.length > 0
                  ? `${newTask.comments.length}`
                  : undefined
              }
              ariaLabel={t("quickAdd.buttons.comments", "Comments")}
              className={cn(
                pillBaseClass,
                newTask.comments && newTask.comments.length > 0
                  ? "text-foreground font-medium"
                  : "text-muted-foreground",
              )}
            />
          </CommentManagementPopover>
        </div>

        {/* NLP Toggle moved next to title input above */}
      </div>

      {/* Labels Display */}
      {newTask.labels && newTask.labels.length > 0 && (
        <div className="flex flex-wrap gap-1 py-2">
          {newTask.labels.map((labelId) => {
            const label = labels.find((l) => l.id === labelId)
            if (!label) return null
            return (
              <Badge
                key={labelId}
                variant="secondary"
                className="gap-1 px-2 py-0.5 text-xs"
                style={{
                  backgroundColor: label.color,
                  color: "white",
                  border: "none",
                }}
              >
                <Tag className="h-3 w-3" />
                {label.name}
                <button
                  onClick={() => handleRemoveLabel(labelId)}
                  className="hover:bg-black/20 rounded-full p-0.5"
                >
                  <X className="h-2 w-2" />
                </button>
              </Badge>
            )
          })}
        </div>
      )}

      {/* Bottom Section */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <ContentPopover
          content={t(
            "quickAdd.keepOpen.help",
            "Create more than one task: leave the dialog open after adding",
          )}
          side="right"
          align="center"
          triggerMode="hover"
          className="w-64 p-2 text-xs leading-relaxed"
          triggerClassName="select-none"
        >
          <div className="flex items-center gap-1 text-xs sm:text-sm text-muted-foreground">
            <label htmlFor="quick-add-keep-open" className="cursor-pointer select-none">
              <CopyPlus className="h-4 w-4" aria-hidden />
            </label>
            <Switch
              id="quick-add-keep-open"
              checked={keepOpen}
              onCheckedChange={setKeepOpen}
              className="scale-90"
              aria-label={t("quickAdd.keepOpen.label", "Add another")}
            />
          </div>
        </ContentPopover>
        <Button variant="ghost" onClick={handleCloseDialog} className="text-xs sm:text-sm">
          {t("common.cancel", "Cancel")}
        </Button>
        <SubmitButton
          onSubmit={handleSubmit}
          disabled={!parsed?.title && !input.trim()}
          submittingText={t("quickAdd.addingTask", "Adding")}
          className="text-xs sm:text-sm"
          ref={submitButtonRef}
        >
          {t("quickAdd.addTask", "Add task")}
        </SubmitButton>
      </div>
    </div>
  )

  return (
    <QuickAddShortcutContext.Provider value={shortcutContextValue}>
      <>
        {isMobile ? (
          <Drawer open={open} onOpenChange={handleCloseDialog} direction="bottom">
            <DrawerContent
              className="max-h-[80vh] rounded-t-2xl border shadow-2xl focus:outline-none"
              onEscapeKeyDown={handleEscapeKeyDown}
            >
              <DrawerHeader className="flex items-center justify-center pb-2">
                <DialogTitle>{quickAddTitle}</DialogTitle>
              </DrawerHeader>
              <div className="max-h-[calc(80vh-72px)] overflow-y-auto px-2 pb-4 pt-1">
                {quickAddBody}
              </div>
            </DrawerContent>
          </Drawer>
        ) : (
          <Dialog open={open} onOpenChange={handleCloseDialog}>
            <DialogContentWithoutOverlay
              className="w-full max-w-[420px] sm:max-w-[520px] md:max-w-[600px] p-1 border shadow-2xl top-[30%]"
              showCloseButton={false}
              onEscapeKeyDown={handleEscapeKeyDown}
            >
              <VisuallyHidden>
                <DialogTitle>{quickAddTitle}</DialogTitle>
              </VisuallyHidden>
              {quickAddBody}
            </DialogContentWithoutOverlay>
          </Dialog>
        )}

        {/* Confirmation dialog for unsaved data */}
        <UnsavedConfirmationDialog
          open={showConfirmCloseDialog}
          onOpenChange={setShowConfirmCloseDialog}
          onConfirm={performCloseDialog}
        />
      </>
    </QuickAddShortcutContext.Provider>
  )
}
