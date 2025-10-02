"use client"

import type React from "react"
import { useState, useEffect, useMemo, useRef } from "react"
import { Dialog, DialogContentWithoutOverlay, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { EnhancedHighlightedInput } from "@/components/ui/enhanced-highlighted-input"
import { TaskDueDate } from "@/components/ui/custom/task-due-date"
import {
  Calendar,
  Tag,
  X,
  Folder,
  Flag,
  MoreHorizontal,
  CheckSquare,
  MessageSquare,
  Square,
  Clock,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"
import { useAtomValue, useSetAtom } from "jotai"
import { labelsAtom, addLabelAndWaitForRealIdAtom } from "@/lib/atoms/core/labels"
import { visibleProjectsAtom } from "@/lib/atoms/core/projects"
import { addTaskAtom } from "@/lib/atoms/core/tasks"
import {
  showQuickAddAtom,
  closeQuickAddAtom,
  quickAddTaskAtom,
  updateQuickAddTaskAtom,
  resetQuickAddTaskAtom,
  nlpEnabledAtom,
} from "@/lib/atoms/ui/dialogs"
import { currentRouteContextAtom } from "@/lib/atoms/ui/navigation"
import { TaskSchedulePopover } from "@/components/task/task-schedule-popover"
import { LabelManagementPopover } from "@/components/task/label-management-popover"
import { ProjectPopover } from "@/components/task/project-popover"
import { TaskPriorityPopover } from "@/components/task/task-priority-popover"
import { TaskSectionPopover } from "@/components/task/task-section-popover"
import { SubtaskPopover } from "@/components/task/subtask-popover"
import { CommentManagementPopover } from "@/components/task/comment-management-popover"
import { HelpPopover } from "@/components/ui/help-popover"
import {
  INBOX_PROJECT_ID,
  CreateTaskRequest,
  type ProjectId,
  type LabelId,
  type GroupId,
  type TaskPriority,
  ProjectIdSchema,
  LabelIdSchema,
  isValidPriority,
} from "@/lib/types"
import { PLACEHOLDER_TASK_INPUT } from "@tasktrove/constants"
import { calculateNextDueDate } from "@/lib/utils/recurring-task-processor"
import { log } from "@/lib/utils/logger"
import { convertTimeToHHMMSS } from "@/lib/utils/enhanced-natural-language-parser"
import { getPriorityTextColor } from "@/lib/color-utils"
import { useDebouncedParse } from "@/hooks/use-debounced-parse"
import { useTranslation, useLanguage } from "@tasktrove/i18n"
import { generateEstimationSuggestions } from "@/lib/utils/shared-patterns"

// Enhanced autocomplete interface
type AutocompleteType = "project" | "label" | "date" | "estimation"

interface AutocompleteItem {
  id: string
  label: string
  icon: React.ReactNode
  type: AutocompleteType
}

export function QuickAddDialog() {
  // Dialog state atoms
  const open = useAtomValue(showQuickAddAtom)
  const closeDialog = useSetAtom(closeQuickAddAtom)

  // Translation hooks
  const { language } = useLanguage()
  const { t } = useTranslation(language, "dialogs")

  // Route context for current project and label
  const routeContext = useAtomValue(currentRouteContextAtom)
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
  const [showAdvancedRow, setShowAdvancedRow] = useState(false)

  // Track whether values were set by parsing (to avoid clearing manually selected values)
  const projectSetByParsingRef = useRef(false)
  const prioritySetByParsingRef = useRef(false)
  const dueDateSetByParsingRef = useRef(false)
  const dueDateSetByRecurringRef = useRef(false)
  const dueTimeSetByParsingRef = useRef(false)
  const recurringSetByParsingRef = useRef(false)
  const labelsSetByParsingRef = useRef(false)
  const estimationSetByParsingRef = useRef(false)

  const newTask: CreateTaskRequest = useAtomValue(quickAddTaskAtom)
  const updateNewTask = useSetAtom(updateQuickAddTaskAtom)
  const resetNewTask = useSetAtom(resetQuickAddTaskAtom)

  // Get data from atoms
  const labels = useAtomValue(labelsAtom)
  const projects = useAtomValue(visibleProjectsAtom)
  const addTask = useSetAtom(addTaskAtom)
  const addLabelAndWaitForRealId = useSetAtom(addLabelAndWaitForRealIdAtom)
  const nlpEnabled = useAtomValue(nlpEnabledAtom)
  const setNlpEnabled = useSetAtom(nlpEnabledAtom)

  // Create empty Set once to avoid re-creating on every render (which causes infinite loop)
  const disabledSections = useMemo(() => new Set<string>(), [])

  // Use debounced parsing for better performance (disabled when NLP toggle is off)
  const parsed = useDebouncedParse(input, disabledSections)

  // Clear any values that were set by parsing when NLP is disabled
  useEffect(() => {
    if (!nlpEnabled) {
      // Only clear values that were set by parsing, preserve manually set values
      if (prioritySetByParsingRef.current) {
        prioritySetByParsingRef.current = false
        updateNewTask({ updateRequest: { priority: undefined } })
      }
      if (dueDateSetByParsingRef.current || dueDateSetByRecurringRef.current) {
        dueDateSetByParsingRef.current = false
        dueDateSetByRecurringRef.current = false
        updateNewTask({ updateRequest: { dueDate: undefined } })
      }
      if (dueTimeSetByParsingRef.current) {
        dueTimeSetByParsingRef.current = false
        updateNewTask({ updateRequest: { dueTime: undefined } })
      }
      if (recurringSetByParsingRef.current) {
        recurringSetByParsingRef.current = false
        updateNewTask({ updateRequest: { recurring: undefined } })
      }
      if (projectSetByParsingRef.current) {
        projectSetByParsingRef.current = false
        updateNewTask({ updateRequest: { projectId: undefined } })
      }
      if (labelsSetByParsingRef.current) {
        labelsSetByParsingRef.current = false
        updateNewTask({ updateRequest: { labels: [] } })
      }
      if (estimationSetByParsingRef.current) {
        estimationSetByParsingRef.current = false
        updateNewTask({ updateRequest: { estimation: undefined } })
      }
    }
  }, [nlpEnabled, updateNewTask])

  // Auto-sync parsed values to newTask atom
  useEffect(() => {
    if (parsed?.priority && isValidPriority(parsed.priority)) {
      prioritySetByParsingRef.current = true
      updateNewTask({ updateRequest: { priority: parsed.priority } })
    } else if (!parsed?.priority && prioritySetByParsingRef.current) {
      // Only clear if the priority was previously set by parsing
      prioritySetByParsingRef.current = false
      updateNewTask({ updateRequest: { priority: undefined } })
    }
  }, [parsed?.priority, updateNewTask])

  useEffect(() => {
    if (parsed?.dueDate) {
      dueDateSetByParsingRef.current = true
      updateNewTask({ updateRequest: { dueDate: parsed.dueDate } })
    } else if (!parsed?.dueDate && dueDateSetByParsingRef.current) {
      // Only clear if the due date was previously set by parsing
      dueDateSetByParsingRef.current = false
      updateNewTask({ updateRequest: { dueDate: undefined } })
    }
  }, [parsed?.dueDate, updateNewTask])

  useEffect(() => {
    if (parsed?.time) {
      dueTimeSetByParsingRef.current = true
      // Convert time to Date object for the dueTime field
      const timeDate = new Date()
      const timeFormatted = convertTimeToHHMMSS(parsed.time)
      if (timeFormatted) {
        const timeParts = timeFormatted.split(":").map(Number)
        const hours = timeParts[0] ?? 0
        const minutes = timeParts[1] ?? 0
        timeDate.setHours(hours, minutes, 0, 0)
        updateNewTask({ updateRequest: { dueTime: timeDate } })
      }
    } else if (!parsed?.time && dueTimeSetByParsingRef.current) {
      // Only clear if the due time was previously set by parsing
      dueTimeSetByParsingRef.current = false
      updateNewTask({ updateRequest: { dueTime: undefined } })
    }
  }, [parsed?.time, updateNewTask])

  useEffect(() => {
    if (parsed?.recurring) {
      // Calculate the initial due date for the recurring pattern if none exists
      let dueDate = newTask.dueDate
      let setDueDateByRecurring = false
      if (!dueDate) {
        const calculatedDueDate = calculateNextDueDate(parsed.recurring, new Date(), true)
        if (calculatedDueDate) {
          dueDate = calculatedDueDate
          setDueDateByRecurring = true
        }
      }

      recurringSetByParsingRef.current = true
      if (setDueDateByRecurring) {
        dueDateSetByRecurringRef.current = true
      }
      updateNewTask({
        updateRequest: {
          recurring: parsed.recurring,
          ...(dueDate && !newTask.dueDate ? { dueDate } : {}),
        },
      })
    } else if (!parsed?.recurring && recurringSetByParsingRef.current) {
      // Only clear if the recurring pattern was previously set by parsing
      recurringSetByParsingRef.current = false
      const updateRequest: { recurring: undefined; dueDate?: undefined } = { recurring: undefined }

      // Also clear due date if it was set automatically by the recurring pattern
      if (dueDateSetByRecurringRef.current) {
        dueDateSetByRecurringRef.current = false
        updateRequest.dueDate = undefined
      }

      updateNewTask({ updateRequest })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- newTask.dueDate intentionally excluded to prevent infinite re-renders
  }, [parsed?.recurring, updateNewTask])

  useEffect(() => {
    if (parsed?.project && parsed.project.trim()) {
      const foundProject = projects.find(
        (p) => p.name.toLowerCase() === parsed.project?.toLowerCase(),
      )
      if (foundProject) {
        projectSetByParsingRef.current = true
        updateNewTask({ updateRequest: { projectId: foundProject.id } })
      }
    } else if (!parsed?.project && projectSetByParsingRef.current) {
      // Only clear if the project was previously set by parsing
      projectSetByParsingRef.current = false
      updateNewTask({ updateRequest: { projectId: undefined } })
    }
  }, [parsed?.project, projects, updateNewTask])

  useEffect(() => {
    if (parsed?.labels && parsed.labels.length > 0) {
      const parsedLabelIds: LabelId[] = []
      parsed.labels.forEach((labelName) => {
        const existingLabel = labels.find((l) => l.name.toLowerCase() === labelName.toLowerCase())
        if (existingLabel) {
          parsedLabelIds.push(existingLabel.id)
        }
      })
      if (parsedLabelIds.length > 0) {
        // Only update if the labels have changed to avoid infinite re-renders
        const currentLabels = newTask.labels || []
        const hasChanged =
          parsedLabelIds.length !== currentLabels.length ||
          parsedLabelIds.some((id) => !currentLabels.includes(id))

        if (hasChanged) {
          labelsSetByParsingRef.current = true
          updateNewTask({ updateRequest: { labels: parsedLabelIds } })
        }
      }
    } else if ((!parsed?.labels || parsed.labels.length === 0) && labelsSetByParsingRef.current) {
      // Only clear if the labels were previously set by parsing
      labelsSetByParsingRef.current = false
      updateNewTask({ updateRequest: { labels: [] } })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- newTask.labels intentionally excluded to prevent infinite re-renders
  }, [parsed?.labels, labels, updateNewTask])

  useEffect(() => {
    if (parsed?.estimation) {
      estimationSetByParsingRef.current = true
      updateNewTask({ updateRequest: { estimation: parsed.estimation } })
    } else if (!parsed?.estimation && estimationSetByParsingRef.current) {
      // Only clear if the estimation was previously set by parsing
      estimationSetByParsingRef.current = false
      updateNewTask({ updateRequest: { estimation: undefined } })
    }
  }, [parsed?.estimation, updateNewTask])

  // Auto-initialize values based on route context when dialog opens
  useEffect(() => {
    if (open) {
      if (currentLabel) {
        updateNewTask({ updateRequest: { labels: [...(newTask.labels || []), currentLabel] } })
      } else if (currentProject) {
        updateNewTask({ updateRequest: { projectId: currentProject } })
      }
    }
  }, [currentLabel, currentProject, open])

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
    }),
    [projects, labels],
  )

  const handleSubmit = async () => {
    // Require either parsed title or manual input
    const finalTitle = parsed?.title || input.trim()
    if (!finalTitle) return

    try {
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

      setInput("")
      resetNewTask()
      closeDialog()
    } catch (error) {
      log.error({ error, module: "quick-add" }, "Failed to create task")
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && e.target === e.currentTarget) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value)
  }

  const handleAutocompleteSelect = (item: AutocompleteItem) => {
    // Enhanced autocomplete selection is handled by the EnhancedHighlightedInput component
    console.log("Autocomplete selected:", item)
  }

  // Helper functions

  const handleAddLabel = async (labelName?: string) => {
    if (labelName) {
      const existingLabel = labels.find(
        (label) => label.name.toLowerCase() === labelName.toLowerCase(),
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
        // Use addLabelAndWaitForRealId to disable optimistic updates and get the real ID immediately
        labelId = await addLabelAndWaitForRealId({
          name: labelName,
          slug: labelName.toLowerCase().replace(/\s+/g, "-"),
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

  const handleManualSectionSelect = (sectionId?: GroupId) => {
    updateNewTask({ updateRequest: { sectionId } })
  }

  const handleCloseDialog = () => {
    setInput("")
    resetNewTask()
    setShowAdvancedRow(false)
    // Reset all tracking flags
    projectSetByParsingRef.current = false
    prioritySetByParsingRef.current = false
    dueDateSetByParsingRef.current = false
    dueTimeSetByParsingRef.current = false
    recurringSetByParsingRef.current = false
    labelsSetByParsingRef.current = false
    estimationSetByParsingRef.current = false
    closeDialog()
  }

  return (
    <Dialog open={open} onOpenChange={handleCloseDialog}>
      <DialogContentWithoutOverlay
        className="w-[95vw] max-w-[420px] sm:max-w-[520px] md:max-w-[600px] p-1 border shadow-2xl"
        showCloseButton={false}
      >
        <VisuallyHidden>
          <DialogTitle>{t("quickAdd.title", "Quick Add Task")}</DialogTitle>
        </VisuallyHidden>
        <div className="flex flex-col justify-between gap-1">
          {/* Main Input */}
          <div>
            <div className="relative">
              <EnhancedHighlightedInput
                placeholder={PLACEHOLDER_TASK_INPUT}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                autoFocus
                onAutocompleteSelect={handleAutocompleteSelect}
                autocompleteItems={autocompleteItems}
              />
            </div>

            {/* Description */}
            <Textarea
              placeholder={t("quickAdd.description.placeholder", "Description")}
              value={newTask.description ?? ""}
              onChange={(e) => updateNewTask({ updateRequest: { description: e.target.value } })}
              className="border-0 shadow-none focus-visible:ring-0 placeholder:text-gray-400 resize-none p-2 bg-muted/50 min-h-16 sm:min-h-24"
              rows={2}
            />
          </div>

          {/* Quick Actions Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-2 sm:pt-3 pb-1">
            <div className="flex items-center gap-1 flex-wrap">
              {/* Due Date */}
              <TaskSchedulePopover>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 gap-1 text-xs sm:text-sm min-w-0"
                  asChild
                >
                  {newTask.dueDate || newTask.recurring ? (
                    <TaskDueDate
                      dueDate={newTask.dueDate}
                      dueTime={newTask.dueTime}
                      recurring={newTask.recurring}
                      completed={false}
                    />
                  ) : (
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Calendar className="h-3 w-3 flex-shrink-0" />
                      <span className="whitespace-nowrap hidden sm:inline">
                        {t("quickAdd.buttons.date", "Date")}
                      </span>
                    </span>
                  )}
                </Button>
              </TaskSchedulePopover>

              {/* Priority */}
              <TaskPriorityPopover
                onUpdate={(priority) => handleManualPrioritySelect(priority)}
                align="start"
                contentClassName="w-48 p-1"
              >
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-8 px-2 gap-1 text-xs sm:text-sm min-w-0",
                    newTask.priority && newTask.priority < 4
                      ? getPriorityTextColor(newTask.priority)
                      : "text-muted-foreground",
                  )}
                >
                  <Flag className="h-3 w-3 flex-shrink-0" />
                  <span
                    className={cn(
                      "whitespace-nowrap",
                      newTask.priority && newTask.priority < 4 ? "" : "hidden sm:inline",
                    )}
                  >
                    {newTask.priority && newTask.priority < 4
                      ? `P${newTask.priority}`
                      : t("quickAdd.buttons.priority", "Priority")}
                  </span>
                </Button>
              </TaskPriorityPopover>

              {/* Add Label */}
              <LabelManagementPopover onAddLabel={handleAddLabel} onRemoveLabel={handleRemoveLabel}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 gap-1 text-muted-foreground text-xs sm:text-sm min-w-0"
                >
                  <Tag className="h-3 w-3 flex-shrink-0" />
                  <span className="hidden sm:inline whitespace-nowrap">
                    {t("quickAdd.buttons.label", "Label")}
                  </span>
                </Button>
              </LabelManagementPopover>

              {/* Project */}
              <ProjectPopover
                onUpdate={(projectId) => handleManualProjectSelect(projectId)}
                align="start"
                contentClassName="w-64 p-0"
              >
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 gap-1 text-muted-foreground text-xs sm:text-sm min-w-0"
                >
                  {(() => {
                    const selectedProjectId = newTask.projectId
                    const project = projects.find((p) => p.id === selectedProjectId)
                    return (
                      <>
                        <Folder
                          className="h-3 w-3 flex-shrink-0"
                          style={{ color: project?.color || undefined }}
                        />
                        <span
                          className={cn(
                            "whitespace-nowrap truncate max-w-16 sm:max-w-24",
                            project && project.id !== INBOX_PROJECT_ID ? "" : "hidden sm:inline",
                          )}
                        >
                          {project ? project.name : t("quickAdd.buttons.project", "Project")}
                        </span>
                      </>
                    )
                  })()}
                </Button>
              </ProjectPopover>

              {/* Expansion Toggle */}
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-muted-foreground"
                onClick={() => setShowAdvancedRow(!showAdvancedRow)}
              >
                <MoreHorizontal className="h-3 w-3" />
              </Button>
            </div>

            {/* NLP Toggle */}
            <div className="flex items-center gap-2 mt-2 sm:mt-0 flex-shrink-0">
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {t("quickAdd.smartParsing.label", "Smart Parsing")}
                </span>
                <HelpPopover
                  content={t(
                    "quickAdd.smartParsing.help",
                    "Smart Parsing is an experimental feature that automatically detects and extracts task details from your input. It can identify priorities (P1-P4), due dates (tomorrow, next week, etc.), project names (#project), labels (@label), and recurring patterns (daily, weekly).",
                  )}
                  side="left"
                  align="center"
                />
              </div>
              <div className="flex items-center gap-1">
                <Switch
                  checked={nlpEnabled}
                  onCheckedChange={setNlpEnabled}
                  className="scale-75"
                  data-testid="nlp-toggle"
                />
              </div>
            </div>
          </div>

          {/* Advanced Row - Second row of options */}
          {showAdvancedRow && (
            <div className="flex items-center gap-1 flex-wrap">
              {/* Subtasks */}
              <SubtaskPopover onOpenChange={() => {}}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 gap-1 text-muted-foreground text-xs sm:text-sm min-w-0"
                >
                  <CheckSquare className="h-3 w-3 flex-shrink-0" />
                  <span className="hidden sm:inline whitespace-nowrap">
                    {t("quickAdd.buttons.subtasks", "Subtasks")}
                  </span>
                </Button>
              </SubtaskPopover>

              {/* Comments */}
              <CommentManagementPopover onOpenChange={() => {}}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 gap-1 text-muted-foreground text-xs sm:text-sm min-w-0"
                >
                  <MessageSquare className="h-3 w-3 flex-shrink-0" />
                  <span className="hidden sm:inline whitespace-nowrap">
                    {t("quickAdd.buttons.comments", "Comments")}
                  </span>
                </Button>
              </CommentManagementPopover>

              {/* Section - Only show if a project is selected */}
              {newTask.projectId !== INBOX_PROJECT_ID && (
                <TaskSectionPopover
                  projectId={newTask.projectId}
                  onUpdate={handleManualSectionSelect}
                  align="start"
                  contentClassName="w-48 p-1"
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 gap-1 text-muted-foreground text-xs sm:text-sm min-w-0"
                  >
                    {(() => {
                      const project = projects.find((p) => p.id === newTask.projectId)
                      const section = project?.sections.find((s) => s.id === newTask.sectionId)

                      return (
                        <>
                          <Square
                            className="h-3 w-3 flex-shrink-0"
                            style={{ color: section?.color || undefined }}
                          />
                          <span className="hidden sm:inline whitespace-nowrap truncate max-w-16 sm:max-w-24">
                            {section ? section.name : t("quickAdd.buttons.section", "Section")}
                          </span>
                        </>
                      )
                    })()}
                  </Button>
                </TaskSectionPopover>
              )}
            </div>
          )}

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

          {/* Advanced Sections */}
          {/* <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}> */}
          {/*   <CollapsibleContent className="space-y-4"> */}
          {/*     <div className="space-y-2"> */}
          {/*       <label className="text-xs text-muted-foreground">Time Estimate (minutes)</label> */}
          {/*       <input */}
          {/*         type="number" */}
          {/*         placeholder="e.g. 30" */}
          {/*         value={timeEstimate || ""} */}
          {/*         onChange={(e) => setTimeEstimate(e.target.value ? parseInt(e.target.value) : undefined)} */}
          {/*         className="w-24 px-2 py-1 text-sm bg-transparent border border-border rounded" */}
          {/*         min="1" */}
          {/*       /> */}
          {/*     </div> */}
          {/*   </CollapsibleContent> */}
          {/* </Collapsible> */}

          {/* Bottom Section */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={handleCloseDialog} className="text-xs sm:text-sm">
              {t("common.cancel", "Cancel")}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!parsed?.title && !input.trim()}
              className="text-xs sm:text-sm"
            >
              {t("quickAdd.addTask", "Add task")}
            </Button>
          </div>
        </div>
      </DialogContentWithoutOverlay>
    </Dialog>
  )
}
