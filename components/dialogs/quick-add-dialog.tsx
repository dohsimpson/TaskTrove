"use client"

import type React from "react"
import { useState, useEffect, useMemo, useRef } from "react"
import { Dialog, DialogContentWithoutOverlay, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { EnhancedHighlightedInput } from "@/components/ui/enhanced-highlighted-input"
import {
  Calendar,
  Tag,
  Repeat,
  X,
  Folder,
  Flag,
  AlertTriangle,
  MoreHorizontal,
  CheckSquare,
  MessageSquare,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"
import { useAtomValue, useSetAtom } from "jotai"
import { labelsAtom, addLabelAtom } from "@/lib/atoms/core/labels"
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
import { TaskProjectPopover } from "@/components/task/task-project-popover"
import { TaskPriorityPopover } from "@/components/task/task-priority-popover"
import { SubtaskPopover } from "@/components/task/subtask-popover"
import { CommentManagementPopover } from "@/components/task/comment-management-popover"
import { HelpPopover } from "@/components/ui/help-popover"
import {
  INBOX_PROJECT_ID,
  CreateTaskRequest,
  type ProjectId,
  type LabelId,
  type TaskPriority,
  ProjectIdSchema,
  isValidPriority,
  createLabelId,
  createProjectId,
  parseRRule,
} from "@/lib/types"
import { PLACEHOLDER_TASK_INPUT } from "@/lib/constants/defaults"
import { format, isToday, isPast } from "date-fns"
import { formatTaskDateTimeBadge } from "@/lib/utils/task-date-formatter"
import { calculateNextDueDate } from "@/lib/utils/recurring-task-processor"
import { log } from "@/lib/utils/logger"
import {
  parseEnhancedNaturalLanguage,
  type ParsedTask,
} from "@/lib/utils/enhanced-natural-language-parser"
import { getPriorityTextColor, getDueDateTextColor } from "@/lib/color-utils"
import { v4 as uuidv4 } from "uuid"

// Enhanced autocomplete interface
type AutocompleteType = "project" | "label" | "date"

interface AutocompleteItem {
  id: string
  label: string
  icon: React.ReactNode
  type: AutocompleteType
}

// Helper function to display RRULE patterns
const getRRuleDisplayText = (rrule: string): string => {
  const parsedRRule = parseRRule(rrule)
  if (!parsedRRule) return "Recurring"

  const interval = parsedRRule.interval || 1 // Default to 1 if interval is undefined

  if (parsedRRule.freq === "DAILY") {
    return interval === 1 ? "Daily" : `Every ${interval} days`
  }
  if (parsedRRule.freq === "WEEKLY") {
    return interval === 1 ? "Weekly" : `Every ${interval} weeks`
  }
  if (parsedRRule.freq === "MONTHLY") {
    return interval === 1 ? "Monthly" : `Every ${interval} months`
  }
  if (parsedRRule.freq === "YEARLY") {
    return "Yearly"
  }

  return "Recurring"
}

// Custom hook for debounced parsing with NLP toggle support
// Careful when setting delay, parsing will not complete if form is submitted before timeout, and stale data will be used.
// Setting delay to 0 causes parsing to be scheduled as soon as possible, from experience this will be enough to prevent said bug.
const useDebouncedParse = (text: string, disabledSections: Set<string>, delay: number = 0) => {
  const [parsed, setParsed] = useState<ParsedTask | null>(null)

  // Get NLP enabled state from atom
  const enabled = useAtomValue(nlpEnabledAtom)

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!enabled) {
        setParsed(null)
        return
      }

      if (text.trim()) {
        setParsed(parseEnhancedNaturalLanguage(text, disabledSections))
      } else {
        setParsed(null)
      }
    }, delay)

    return () => clearTimeout(timer)
  }, [text, delay, disabledSections, enabled])

  return parsed
}

export function QuickAddDialog() {
  // Dialog state atoms
  const open = useAtomValue(showQuickAddAtom)
  const closeDialog = useSetAtom(closeQuickAddAtom)

  // Route context for current project
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

  // UI-only state (stays local)
  const [input, setInput] = useState("")
  const [showAdvancedRow, setShowAdvancedRow] = useState(false)

  // Track whether values were set by parsing (to avoid clearing manually selected values)
  const projectSetByParsingRef = useRef(false)
  const prioritySetByParsingRef = useRef(false)
  const dueDateSetByParsingRef = useRef(false)
  const recurringSetByParsingRef = useRef(false)
  const labelsSetByParsingRef = useRef(false)

  const newTask: CreateTaskRequest = useAtomValue(quickAddTaskAtom)
  const updateNewTask = useSetAtom(updateQuickAddTaskAtom)
  const resetNewTask = useSetAtom(resetQuickAddTaskAtom)

  // Get data from atoms
  const labels = useAtomValue(labelsAtom)
  const projects = useAtomValue(visibleProjectsAtom)
  const addTask = useSetAtom(addTaskAtom)
  const addLabel = useSetAtom(addLabelAtom)
  const nlpEnabled = useAtomValue(nlpEnabledAtom)
  const setNlpEnabled = useSetAtom(nlpEnabledAtom)

  // Use debounced parsing for better performance (disabled when NLP toggle is off)
  const parsed = useDebouncedParse(input, new Set())

  // Clear any values that were set by parsing when NLP is disabled
  useEffect(() => {
    if (!nlpEnabled) {
      // Only clear values that were set by parsing, preserve manually set values
      if (prioritySetByParsingRef.current) {
        prioritySetByParsingRef.current = false
        updateNewTask({ updateRequest: { priority: undefined } })
      }
      if (dueDateSetByParsingRef.current) {
        dueDateSetByParsingRef.current = false
        updateNewTask({ updateRequest: { dueDate: undefined } })
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
    if (parsed?.recurring) {
      // Calculate the initial due date for the recurring pattern if none exists
      let dueDate = newTask.dueDate
      if (!dueDate) {
        const calculatedDueDate = calculateNextDueDate(parsed.recurring, new Date(), true)
        if (calculatedDueDate) {
          dueDate = calculatedDueDate
        }
      }

      recurringSetByParsingRef.current = true
      updateNewTask({
        updateRequest: {
          recurring: parsed.recurring,
          ...(dueDate && !newTask.dueDate ? { dueDate } : {}),
        },
      })
    } else if (!parsed?.recurring && recurringSetByParsingRef.current) {
      // Only clear if the recurring pattern was previously set by parsing
      recurringSetByParsingRef.current = false
      updateNewTask({ updateRequest: { recurring: undefined } })
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
        labels: newTask.labels ?? [],
        projectId: newTask.projectId ?? currentProject,
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

  const handleAddLabel = (labelName?: string) => {
    if (labelName) {
      const existingLabel = labels.find(
        (label) => label.name.toLowerCase() === labelName.toLowerCase(),
      )

      let labelId: LabelId
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

        labelId = createLabelId(uuidv4())
        addLabel({
          name: labelName,
          slug: labelName.toLowerCase().replace(/\s+/g, "-"),
          color: randomColor,
        })
      } else {
        labelId = existingLabel.id
      }

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

  const handleManualProjectSelect = (projectId: ProjectId) => {
    projectSetByParsingRef.current = false
    updateNewTask({ updateRequest: { projectId } })
  }

  const handleManualPrioritySelect = (priority: TaskPriority) => {
    prioritySetByParsingRef.current = false
    updateNewTask({ updateRequest: { priority } })
  }

  const handleCloseDialog = () => {
    setInput("")
    resetNewTask()
    setShowAdvancedRow(false)
    // Reset all tracking flags
    projectSetByParsingRef.current = false
    prioritySetByParsingRef.current = false
    dueDateSetByParsingRef.current = false
    recurringSetByParsingRef.current = false
    labelsSetByParsingRef.current = false
    closeDialog()
  }

  return (
    <Dialog open={open} onOpenChange={handleCloseDialog}>
      <DialogContentWithoutOverlay
        className="w-[95vw] max-w-[420px] sm:max-w-[520px] md:max-w-[600px] p-3 sm:p-5 pb-3 sm:pb-4 border shadow-2xl"
        showCloseButton={false}
      >
        <VisuallyHidden>
          <DialogTitle>Quick Add Task</DialogTitle>
        </VisuallyHidden>
        <div className="flex flex-col justify-between gap-2">
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
              placeholder="Description"
              value={newTask.description ?? ""}
              onChange={(e) => updateNewTask({ updateRequest: { description: e.target.value } })}
              className="border-0 shadow-none focus-visible:ring-0 placeholder:text-gray-400 resize-none p-2 bg-muted/50 min-h-16 sm:min-h-24"
              rows={2}
            />
          </div>

          {/* Quick Actions Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-2 sm:pt-3 pb-1">
            <div className="flex items-center gap-1 flex-wrap">
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
                    {newTask.priority && newTask.priority < 4 ? `P${newTask.priority}` : "Priority"}
                  </span>
                </Button>
              </TaskPriorityPopover>

              {/* Due Date */}
              <TaskSchedulePopover>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-8 px-2 gap-1 text-xs sm:text-sm min-w-0",
                    newTask.dueDate
                      ? getDueDateTextColor(newTask.dueDate, false)
                      : "text-muted-foreground",
                  )}
                >
                  {newTask.recurring ? (
                    <Repeat className="h-3 w-3 flex-shrink-0" />
                  ) : newTask.dueDate && isPast(newTask.dueDate) && !isToday(newTask.dueDate) ? (
                    <AlertTriangle className="h-3 w-3 text-red-500 flex-shrink-0" />
                  ) : (
                    <Calendar className="h-3 w-3 flex-shrink-0" />
                  )}
                  <span
                    className={cn(
                      "whitespace-nowrap",
                      newTask.recurring || newTask.dueDate ? "" : "hidden sm:inline",
                    )}
                  >
                    {newTask.recurring
                      ? getRRuleDisplayText(newTask.recurring)
                      : newTask.dueDate
                        ? formatTaskDateTimeBadge(newTask) || format(newTask.dueDate, "MMM d")
                        : "Date"}
                  </span>
                </Button>
              </TaskSchedulePopover>

              {/* Project */}
              <TaskProjectPopover
                onUpdate={(projectId) =>
                  handleManualProjectSelect(
                    projectId ? createProjectId(projectId) : INBOX_PROJECT_ID,
                  )
                }
                align="start"
                contentClassName="w-64 p-4"
              >
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 gap-1 text-muted-foreground text-xs sm:text-sm min-w-0"
                >
                  {(() => {
                    const selectedProjectId = newTask.projectId ?? currentProject
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
                          {project ? project.name : "Project"}
                        </span>
                      </>
                    )
                  })()}
                </Button>
              </TaskProjectPopover>

              {/* Add Label */}
              <LabelManagementPopover onAddLabel={handleAddLabel} onRemoveLabel={handleRemoveLabel}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 gap-1 text-muted-foreground text-xs sm:text-sm min-w-0"
                >
                  <Tag className="h-3 w-3 flex-shrink-0" />
                  <span className="hidden sm:inline whitespace-nowrap">Label</span>
                </Button>
              </LabelManagementPopover>

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
                  Smart Parsing
                </span>
                <HelpPopover
                  content="Smart Parsing is an experimental feature that automatically detects and extracts task details from your input. It can identify priorities (P1-P4), due dates (tomorrow, next week, etc.), project names (#project), labels (@label), and recurring patterns (daily, weekly)."
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
            <div className="flex items-center gap-1 flex-wrap py-1">
              {/* Subtasks */}
              <SubtaskPopover onOpenChange={() => {}}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 gap-1 text-muted-foreground text-xs sm:text-sm min-w-0"
                >
                  <CheckSquare className="h-3 w-3 flex-shrink-0" />
                  <span className="hidden sm:inline whitespace-nowrap">Subtasks</span>
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
                  <span className="hidden sm:inline whitespace-nowrap">Comments</span>
                </Button>
              </CommentManagementPopover>
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
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!parsed?.title && !input.trim()}
              className="text-xs sm:text-sm"
            >
              Add task
            </Button>
          </div>
        </div>
      </DialogContentWithoutOverlay>
    </Dialog>
  )
}
