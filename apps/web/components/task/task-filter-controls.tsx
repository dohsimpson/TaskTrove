"use client"

import React, { useState } from "react"
import { useAtomValue, useSetAtom, atom } from "jotai"
import { useTranslation } from "@tasktrove/i18n"
import {
  activeFiltersAtom,
  hasActiveFiltersAtom,
  activeFilterCountAtom,
  updateFiltersAtom,
  clearActiveFiltersAtom,
  currentViewStateAtom,
  currentViewAtom,
} from "@tasktrove/atoms"
import { projectAtoms } from "@tasktrove/atoms"
import { labelsAtom } from "@tasktrove/atoms"
import { uiFilteredTasksForViewAtom } from "@tasktrove/atoms"
import type { Task, Project, Label as LabelType, LabelId } from "@/lib/types"
import { createLabelId, type ProjectId } from "@/lib/types"
import { cn } from "@/lib/utils"
import { getPriorityTextColor } from "@/lib/color-utils"
import { DueDatePreset, getPresetLabel, getPresetTaskCounts } from "@/lib/utils/date-filter-utils"
import { format } from "date-fns"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Calendar } from "@/components/ui/calendar"
import {
  Filter,
  ChevronDown,
  Calendar as CalendarIcon,
  Flag,
  Folder,
  Circle,
  Clock,
  X,
} from "lucide-react"
import { AssigneeFilterSection } from "@/components/task/assignee-filter-section"
import { OwnerFilterSection } from "@/components/task/owner-filter-section"

// Derived atom to get tasks filtered by everything EXCEPT due date filter for accurate preset counts
const tasksForCountsAtom = atom((get) => {
  const currentView = get(currentViewAtom)
  const viewState = get(currentViewStateAtom)
  const searchQuery = viewState.searchQuery

  // Start with base filtered tasks (already includes view filtering + per-view showCompleted/showOverdue)
  let result = get(uiFilteredTasksForViewAtom(currentView))

  // Apply search query filter
  if (searchQuery) {
    result = result.filter(
      (task: Task) =>
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.description?.toLowerCase().includes(searchQuery.toLowerCase()),
    )
  }

  // Apply advanced filters from viewState.activeFilters (except due date)
  const activeFilters = viewState.activeFilters
  if (activeFilters) {
    // Filter by project IDs
    if (activeFilters.projectIds?.length) {
      result = result.filter(
        (task: Task) => task.projectId && activeFilters.projectIds?.includes(task.projectId),
      )
    }

    // Filter by labels
    if (activeFilters.labels === null) {
      // Show only tasks with NO labels
      result = result.filter((task: Task) => task.labels.length === 0)
    } else if (activeFilters.labels && activeFilters.labels.length > 0) {
      // Show tasks with specific labels
      const labelFilter = activeFilters.labels
      result = result.filter((task: Task) =>
        task.labels.some((label: LabelId) => labelFilter.includes(label)),
      )
    }
    // If activeFilters.labels is [], show all tasks (no filtering)

    // Filter by priorities
    if (activeFilters.priorities?.length) {
      result = result.filter(
        (task: Task) => activeFilters.priorities?.includes(task.priority) ?? false,
      )
    }

    // Filter by completion status
    if (activeFilters.completed !== undefined) {
      result = result.filter((task: Task) => task.completed === activeFilters.completed)
    }

    // NOTE: We intentionally skip dueDateFilter here so counts show accurately

    // Status filtering removed
  }

  return result
})

interface TaskFilterControlsProps {
  className?: string
}

export function TaskFilterControls({ className }: TaskFilterControlsProps) {
  const { t } = useTranslation("task")
  const [isOpen, setIsOpen] = useState(false)
  const [showCustomRange, setShowCustomRange] = useState(false)
  const [customStart, setCustomStart] = useState<Date | undefined>()
  const [customEnd, setCustomEnd] = useState<Date | undefined>()

  // Atoms
  const activeFilters = useAtomValue(activeFiltersAtom)
  const hasActiveFilters = useAtomValue(hasActiveFiltersAtom)
  const activeFilterCount = useAtomValue(activeFilterCountAtom)
  const updateFilters = useSetAtom(updateFiltersAtom)
  const clearFilters = useSetAtom(clearActiveFiltersAtom)

  // Data for filters
  const allProjects = useAtomValue(projectAtoms.derived.allProjects)
  const allLabels = useAtomValue(labelsAtom)

  // Get task counts for each preset (using tasks filtered by everything except due date)
  const tasksForCounts = useAtomValue(tasksForCountsAtom)
  const taskCounts = getPresetTaskCounts(tasksForCounts)

  const handlePriorityChange = (priority: 1 | 2 | 3 | 4, checked: boolean) => {
    const currentPriorities = activeFilters.priorities || []
    const newPriorities = checked
      ? [...currentPriorities, priority]
      : currentPriorities.filter((p) => p !== priority)

    updateFilters({
      priorities: newPriorities.length > 0 ? newPriorities : undefined,
    })
  }

  const handleProjectChange = (projectId: ProjectId, checked: boolean) => {
    const currentProjects = activeFilters.projectIds || []
    const newProjects = checked
      ? [...currentProjects, projectId]
      : currentProjects.filter((p) => p !== projectId)

    updateFilters({
      projectIds: newProjects.length > 0 ? newProjects : undefined,
    })
  }

  const handleNoLabelsFilter = () => {
    if (activeFilters.labels === null) {
      // If "no labels" is currently active, turn it off (show all)
      updateFilters({ labels: [] })
    } else {
      // Set to show only tasks with no labels
      updateFilters({ labels: null })
    }
  }

  const handleLabelChange = (labelId: string, checked: boolean) => {
    const currentLabels = Array.isArray(activeFilters.labels) ? activeFilters.labels : []
    const newLabels: LabelId[] = checked
      ? [...currentLabels, createLabelId(labelId)]
      : currentLabels.filter((l) => l !== labelId)

    updateFilters({
      labels: newLabels.length > 0 ? newLabels : [],
    })
  }

  const handleCompletionFilter = (value: string) => {
    if (value === "all") {
      updateFilters({ completed: undefined })
    } else {
      updateFilters({ completed: value === "completed" })
    }
  }

  const handlePresetSelect = (preset: DueDatePreset) => {
    // Toggle the preset - if it's already selected, clear the filter; otherwise, set it
    if (activeFilters.dueDateFilter?.preset === preset) {
      updateFilters({
        dueDateFilter: undefined, // Clear the filter if clicking the same preset
      })
    } else {
      updateFilters({
        dueDateFilter: {
          preset,
          customRange: undefined, // Clear custom range when selecting preset
        },
      })
    }
  }

  const handleCustomRangeApply = () => {
    if (customStart || customEnd) {
      updateFilters({
        dueDateFilter: {
          preset: undefined, // Clear preset when using custom range
          customRange: {
            start: customStart,
            end: customEnd,
          },
        },
      })
    }
    setShowCustomRange(false)
  }

  const handleCustomRangeCancel = () => {
    setCustomStart(undefined)
    setCustomEnd(undefined)
    setShowCustomRange(false)
  }

  const handleCustomRangeClear = () => {
    updateFilters({
      dueDateFilter: undefined, // Clear the custom range filter
    })
    setCustomStart(undefined)
    setCustomEnd(undefined)
    setShowCustomRange(false)
  }

  const priorities = [
    {
      value: 1 as const,
      label: t("filters.priority1", "Priority 1"),
      color: getPriorityTextColor(1),
    },
    {
      value: 2 as const,
      label: t("filters.priority2", "Priority 2"),
      color: getPriorityTextColor(2),
    },
    {
      value: 3 as const,
      label: t("filters.priority3", "Priority 3"),
      color: getPriorityTextColor(3),
    },
    {
      value: 4 as const,
      label: t("filters.noPriority", "No priority"),
      color: getPriorityTextColor(4),
    },
  ]

  const getCompletionValue = () => {
    if (activeFilters.completed === undefined) return "all"
    return activeFilters.completed ? "completed" : "active"
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={hasActiveFilters ? "default" : "outline"}
          size="sm"
          className={cn(
            "relative transition-all duration-200 hover:shadow-md",
            hasActiveFilters && "bg-primary/10 border-primary/20 text-primary hover:bg-primary/15",
            className,
          )}
        >
          <Filter className={cn("h-4 w-4", hasActiveFilters && "text-primary")} />
          {hasActiveFilters && (
            <Badge
              variant="default"
              className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs bg-primary text-primary-foreground shadow-sm"
            >
              {activeFilterCount}
            </Badge>
          )}
          <ChevronDown
            className={cn(
              "h-3 w-3 ml-1 transition-transform duration-200",
              isOpen && "rotate-180",
              hasActiveFilters && "text-primary",
            )}
          />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="w-[380px] p-3 shadow-xl border border-border/50 bg-background/95 backdrop-blur-sm rounded-xl"
        align="start"
        sideOffset={8}
      >
        {/* Header */}
        <div className="flex items-center gap-2 pb-3 border-b">
          <Filter className="h-5 w-5" />
          <h3 className="text-lg font-semibold text-foreground">
            {t("filters.filterTasks", "Filter Tasks")}
          </h3>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                clearFilters()
                setIsOpen(false)
              }}
              className="h-auto px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors ml-auto"
            >
              {t("filters.clearAll", "Clear all")}
            </Button>
          )}
        </div>

        <ScrollArea className="h-[400px]">
          <div className="pt-4 space-y-6">
            {/* Due Date Filter */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm font-semibold text-foreground">
                  {t("filters.dueDate", "Due Date")}
                </Label>
              </div>

              {!showCustomRange ? (
                <div className="space-y-3">
                  {/* Quick Presets */}
                  <div className="grid grid-cols-2 gap-2">
                    {(
                      ["overdue", "today", "tomorrow", "thisWeek", "nextWeek", "noDueDate"] as const
                    ).map((preset) => {
                      const count = taskCounts[preset]
                      const isActive = activeFilters.dueDateFilter?.preset === preset

                      return (
                        <Button
                          key={preset}
                          variant={isActive ? "default" : "outline"}
                          size="sm"
                          onClick={() => handlePresetSelect(preset)}
                          className="h-auto py-2 flex items-center justify-between text-xs"
                        >
                          <span>{getPresetLabel(preset, t)}</span>
                          <Badge variant="secondary" className="ml-1 text-xs h-4 min-w-[16px] px-1">
                            {count}
                          </Badge>
                        </Button>
                      )
                    })}
                  </div>

                  {/* Custom Range Button */}
                  {activeFilters.dueDateFilter?.customRange ? (
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 text-xs text-muted-foreground">
                        <CalendarIcon className="h-3 w-3 mr-1.5" />
                        {activeFilters.dueDateFilter.customRange.start &&
                        activeFilters.dueDateFilter.customRange.end
                          ? `${format(activeFilters.dueDateFilter.customRange.start, "MMM dd")} - ${format(activeFilters.dueDateFilter.customRange.end, "MMM dd")}`
                          : activeFilters.dueDateFilter.customRange.start
                            ? `From ${format(activeFilters.dueDateFilter.customRange.start, "MMM dd")}`
                            : activeFilters.dueDateFilter.customRange.end
                              ? `Until ${format(activeFilters.dueDateFilter.customRange.end, "MMM dd")}`
                              : t("filters.customRange", "Custom Range")}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCustomRangeClear}
                        className="text-xs px-2"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowCustomRange(true)}
                      className="w-full justify-center text-xs"
                    >
                      <CalendarIcon className="h-3 w-3 mr-1.5" />
                      {t("filters.customRange", "Custom Range")}
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Custom Date Range Interface */}
                  <div className="space-y-2">
                    <div>
                      <Label className="text-xs font-medium text-muted-foreground">
                        {t("filters.fromDate", "FROM DATE")}
                      </Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-start text-left font-normal text-xs"
                            size="sm"
                          >
                            <CalendarIcon className="mr-2 h-3 w-3" />
                            {customStart
                              ? format(customStart, "MMM dd, yyyy")
                              : t("filters.selectStartDate", "Select start date")}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={customStart}
                            onSelect={setCustomStart}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div>
                      <Label className="text-xs font-medium text-muted-foreground">
                        {t("filters.toDate", "TO DATE")}
                      </Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-start text-left font-normal text-xs"
                            size="sm"
                          >
                            <CalendarIcon className="mr-2 h-3 w-3" />
                            {customEnd
                              ? format(customEnd, "MMM dd, yyyy")
                              : t("filters.selectEndDate", "Select end date")}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={customEnd}
                            onSelect={setCustomEnd}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  {/* Quick Range Shortcuts */}
                  <div className="grid grid-cols-2 gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const today = new Date()
                        const nextWeek = new Date()
                        nextWeek.setDate(today.getDate() + 7)
                        setCustomStart(today)
                        setCustomEnd(nextWeek)
                      }}
                      className="text-xs h-8"
                    >
                      {t("filters.next7Days", "Next 7 days")}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const today = new Date()
                        const nextMonth = new Date()
                        nextMonth.setDate(today.getDate() + 30)
                        setCustomStart(today)
                        setCustomEnd(nextMonth)
                      }}
                      className="text-xs h-8"
                    >
                      {t("filters.next30Days", "Next 30 days")}
                    </Button>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <Button
                      onClick={handleCustomRangeApply}
                      size="sm"
                      className="flex-1 text-xs"
                      disabled={!customStart && !customEnd}
                    >
                      {t("filters.apply", "Apply")}
                    </Button>
                    <Button
                      onClick={handleCustomRangeCancel}
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs"
                    >
                      {t("filters.cancel", "Cancel")}
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <Separator className="my-6" />

            {/* Priority Filter */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Flag className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm font-semibold text-foreground">
                  {t("filters.priority", "Priority")}
                </Label>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {priorities.map((priority) => {
                  const isSelected = activeFilters.priorities?.includes(priority.value)
                  return (
                    <Button
                      key={priority.value}
                      variant={isSelected ? "default" : "outline"}
                      size="sm"
                      onClick={() => handlePriorityChange(priority.value, !isSelected)}
                      className={cn(
                        "h-auto py-2 px-3 justify-start text-xs transition-all duration-200",
                        !isSelected && "hover:bg-muted hover:border-muted-foreground/20",
                      )}
                    >
                      <Flag className={cn("h-3 w-3 mr-2", priority.color)} />
                      {priority.label}
                    </Button>
                  )
                })}
              </div>
            </div>

            <Separator className="my-6" />

            {/* Completion Status Filter */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Circle className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm font-semibold text-foreground">
                  {t("filters.status", "Status")}
                </Label>
              </div>
              <div className="space-y-2">
                {[
                  { value: "all", label: t("filters.allTasks", "All tasks"), icon: Circle },
                  { value: "active", label: t("filters.activeOnly", "Active only"), icon: Clock },
                  {
                    value: "completed",
                    label: t("filters.completedOnly", "Completed only"),
                    icon: Circle,
                  },
                ].map((status) => {
                  const isSelected = getCompletionValue() === status.value
                  const IconComponent = status.icon
                  return (
                    <Button
                      key={status.value}
                      variant={isSelected ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleCompletionFilter(status.value)}
                      className={cn(
                        "w-full justify-start text-xs h-auto py-2.5 px-3 transition-all duration-200",
                        !isSelected && "hover:bg-muted hover:border-muted-foreground/20",
                      )}
                    >
                      <IconComponent className="h-3 w-3 mr-2 text-muted-foreground" />
                      {status.label}
                    </Button>
                  )
                })}
              </div>
            </div>

            <Separator className="my-6" />

            {/* Projects Filter */}
            {allProjects.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Folder className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-sm font-semibold text-foreground">
                    {t("filters.projects", "Projects")}
                  </Label>
                </div>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {allProjects.map((project: Project) => {
                    const isSelected = activeFilters.projectIds?.includes(project.id) || false
                    return (
                      <Button
                        key={project.id}
                        variant={isSelected ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleProjectChange(project.id, !isSelected)}
                        className={cn(
                          "w-full justify-start text-xs h-auto py-2 px-3 transition-all duration-200",
                          !isSelected && "hover:bg-muted hover:border-muted-foreground/20",
                        )}
                      >
                        <Folder
                          className="h-3 w-3 mr-2 flex-shrink-0"
                          style={{ color: isSelected ? undefined : project.color }}
                        />
                        <span className="truncate">{project.name}</span>
                      </Button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Labels Filter */}
            {allLabels.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/50" />
                  <Label className="text-sm font-semibold text-foreground">
                    {t("filters.labels", "Labels")}
                  </Label>
                </div>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {/* No labels option */}
                  <Button
                    variant={activeFilters.labels === null ? "default" : "outline"}
                    size="sm"
                    onClick={handleNoLabelsFilter}
                    className={cn(
                      "w-full justify-start text-xs h-auto py-2 px-3 transition-all duration-200",
                      !(activeFilters.labels === null) &&
                        "hover:bg-muted hover:border-muted-foreground/20",
                    )}
                  >
                    <div className="w-3 h-3 rounded-full border border-muted-foreground/30 mr-2 flex-shrink-0" />
                    <span className="italic">{t("filters.noLabels", "No labels")}</span>
                  </Button>

                  {allLabels.map((label: LabelType) => {
                    const isSelected =
                      Array.isArray(activeFilters.labels) && activeFilters.labels.includes(label.id)
                    return (
                      <Button
                        key={label.id}
                        variant={isSelected ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleLabelChange(label.id, !isSelected)}
                        className={cn(
                          "w-full justify-start text-xs h-auto py-2 px-3 transition-all duration-200",
                          !isSelected && "hover:bg-muted hover:border-muted-foreground/20",
                        )}
                      >
                        <div
                          className="w-3 h-3 rounded-full mr-2 flex-shrink-0"
                          style={{ backgroundColor: isSelected ? undefined : label.color }}
                        />
                        <span className="truncate">{label.name}</span>
                      </Button>
                    )
                  })}
                </div>
              </div>
            )}

            <div className="space-y-4">
              <AssigneeFilterSection />
              <OwnerFilterSection />
            </div>
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}
