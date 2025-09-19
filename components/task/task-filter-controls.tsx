"use client"

import React, { useState } from "react"
import { useAtomValue, useSetAtom, atom } from "jotai"
import {
  activeFiltersAtom,
  hasActiveFiltersAtom,
  activeFilterCountAtom,
  updateFiltersAtom,
  clearActiveFiltersAtom,
  currentViewStateAtom,
  currentViewAtom,
} from "@/lib/atoms/ui/views"
import { projectAtoms } from "@/lib/atoms"
import { labelsAtom } from "@/lib/atoms/core/labels"
import { baseFilteredTasksForViewAtom } from "@/lib/atoms/core/tasks"
import type { Task, Project, Label as LabelType } from "@/lib/types"
import { type ProjectId } from "@/lib/types"
import { cn } from "@/lib/utils"
import { getPriorityLabel, getPriorityTextColor } from "@/lib/color-utils"
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
} from "lucide-react"

// Derived atom to get tasks filtered by everything EXCEPT due date filter for accurate preset counts
const tasksForCountsAtom = atom((get) => {
  const currentView = get(currentViewAtom)
  const viewState = get(currentViewStateAtom)
  const searchQuery = viewState.searchQuery

  // Start with base filtered tasks (already includes view filtering + per-view showCompleted/showOverdue)
  let result = get(baseFilteredTasksForViewAtom(currentView))

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
        task.labels.some((label: string) => labelFilter.includes(label)),
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

    // Filter by task status
    if (activeFilters.status?.length) {
      result = result.filter(
        (task: Task) => task.status && (activeFilters.status?.includes(task.status) ?? false),
      )
    }
  }

  return result
})

interface TaskFilterControlsProps {
  className?: string
}

export function TaskFilterControls({ className }: TaskFilterControlsProps) {
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

  const handleLabelChange = (labelName: string, checked: boolean) => {
    const currentLabels = Array.isArray(activeFilters.labels) ? activeFilters.labels : []
    const newLabels = checked
      ? [...currentLabels, labelName]
      : currentLabels.filter((l) => l !== labelName)

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
    updateFilters({
      dueDateFilter: {
        preset,
        customRange: undefined, // Clear custom range when selecting preset
      },
    })
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

  const priorities = [
    { value: 1 as const, label: getPriorityLabel(1), color: getPriorityTextColor(1) },
    { value: 2 as const, label: getPriorityLabel(2), color: getPriorityTextColor(2) },
    { value: 3 as const, label: getPriorityLabel(3), color: getPriorityTextColor(3) },
    { value: 4 as const, label: getPriorityLabel(4), color: getPriorityTextColor(4) },
  ]

  const getCompletionValue = () => {
    if (activeFilters.completed === undefined) return "all"
    return activeFilters.completed ? "completed" : "active"
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className={`relative ${className}`}>
          <Filter className="h-4 w-4" />
          <span className="hidden sm:inline ml-1.5">Filter</span>
          {hasActiveFilters && (
            <Badge
              variant="secondary"
              className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
            >
              {activeFilterCount}
            </Badge>
          )}
          <ChevronDown className="h-3 w-3 ml-1 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="w-[340px] p-0 shadow-lg border-0 bg-background/95 backdrop-blur-sm"
        align="start"
      >
        <div className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold text-base text-foreground">Filter Tasks</h4>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  clearFilters()
                  setIsOpen(false)
                }}
                className="h-auto px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground rounded-md"
              >
                Clear all
              </Button>
            )}
          </div>

          <ScrollArea className="h-[420px] pr-2">
            <div className="space-y-5">
              {/* Due Date Filter */}
              <div>
                <Label className="text-xs font-semibold text-muted-foreground mb-3 block uppercase tracking-wider">
                  Due Date
                </Label>

                {!showCustomRange ? (
                  <div className="space-y-3">
                    {/* Quick Presets */}
                    <div className="grid grid-cols-2 gap-2">
                      {(
                        [
                          "overdue",
                          "today",
                          "tomorrow",
                          "thisWeek",
                          "nextWeek",
                          "noDueDate",
                        ] as const
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
                            <span>{getPresetLabel(preset)}</span>
                            <Badge
                              variant="secondary"
                              className="ml-1 text-xs h-4 min-w-[16px] px-1"
                            >
                              {count}
                            </Badge>
                          </Button>
                        )
                      })}
                    </div>

                    {/* Custom Range Button */}
                    <Button
                      variant={activeFilters.dueDateFilter?.customRange ? "default" : "outline"}
                      size="sm"
                      onClick={() => setShowCustomRange(true)}
                      className="w-full justify-center text-xs"
                    >
                      <CalendarIcon className="h-3 w-3 mr-1.5" />
                      Custom Range
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Custom Date Range Interface */}
                    <div className="space-y-2">
                      <div>
                        <Label className="text-xs font-medium text-muted-foreground">
                          FROM DATE
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
                                : "Select start date"}
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
                        <Label className="text-xs font-medium text-muted-foreground">TO DATE</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className="w-full justify-start text-left font-normal text-xs"
                              size="sm"
                            >
                              <CalendarIcon className="mr-2 h-3 w-3" />
                              {customEnd ? format(customEnd, "MMM dd, yyyy") : "Select end date"}
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
                        Next 7 days
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
                        Next 30 days
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
                        Apply
                      </Button>
                      <Button
                        onClick={handleCustomRangeCancel}
                        variant="outline"
                        size="sm"
                        className="flex-1 text-xs"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              {/* Priority Filter */}
              <div>
                <Label className="text-xs font-semibold text-muted-foreground mb-3 block uppercase tracking-wider">
                  Priority
                </Label>
                <div className="space-y-1">
                  {priorities.map((priority) => (
                    <div
                      key={priority.value}
                      className={cn(
                        "flex items-center gap-3 rounded-lg cursor-pointer hover:bg-accent/50 transition-all duration-200 p-2.5",
                        activeFilters.priorities?.includes(priority.value) && "bg-accent",
                      )}
                      onClick={() =>
                        handlePriorityChange(
                          priority.value,
                          !activeFilters.priorities?.includes(priority.value),
                        )
                      }
                    >
                      <Flag className={cn("h-4 w-4", priority.color)} />
                      <span className="text-sm font-medium flex-1">{priority.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Completion Status Filter */}
              <div>
                <Label className="text-xs font-semibold text-muted-foreground mb-3 block uppercase tracking-wider">
                  Status
                </Label>
                <div className="space-y-1">
                  {[
                    { value: "all", label: "All tasks", icon: Circle },
                    { value: "active", label: "Active only", icon: Clock },
                    { value: "completed", label: "Completed only", icon: Circle },
                  ].map((status) => {
                    const isSelected = getCompletionValue() === status.value
                    const IconComponent = status.icon
                    return (
                      <div
                        key={status.value}
                        className={cn(
                          "flex items-center gap-3 rounded-lg cursor-pointer hover:bg-accent/50 transition-all duration-200 p-2.5",
                          isSelected && "bg-accent",
                        )}
                        onClick={() => handleCompletionFilter(status.value)}
                      >
                        <IconComponent className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium flex-1">{status.label}</span>
                      </div>
                    )
                  })}
                </div>
              </div>

              <Separator />

              {/* Projects Filter */}
              {allProjects.length > 0 && (
                <>
                  <div>
                    <Label className="text-xs font-semibold text-muted-foreground mb-3 block uppercase tracking-wider">
                      Projects
                    </Label>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {allProjects.map((project: Project) => {
                        const isSelected = activeFilters.projectIds?.includes(project.id) || false
                        return (
                          <div
                            key={project.id}
                            className={cn(
                              "flex items-center gap-3 rounded-lg cursor-pointer hover:bg-accent/50 transition-all duration-200 p-2.5",
                              isSelected && "bg-accent",
                            )}
                            onClick={() => handleProjectChange(project.id, !isSelected)}
                          >
                            <Folder className="h-4 w-4" style={{ color: project.color }} />
                            <span className="text-sm font-medium flex-1">{project.name}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                  <Separator />
                </>
              )}

              {/* Labels Filter */}
              {allLabels.length > 0 && (
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground mb-3 block uppercase tracking-wider">
                    Labels
                  </Label>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {/* No labels option */}
                    <div
                      className={cn(
                        "flex items-center gap-3 rounded-lg cursor-pointer hover:bg-accent/50 transition-all duration-200 p-2.5",
                        activeFilters.labels === null && "bg-accent",
                      )}
                      onClick={handleNoLabelsFilter}
                    >
                      <div className="w-3 h-3 rounded-full border border-muted-foreground/30" />
                      <span className="text-sm font-medium flex-1 italic">No labels</span>
                    </div>

                    {allLabels.map((label: LabelType) => {
                      const isSelected =
                        Array.isArray(activeFilters.labels) &&
                        activeFilters.labels.includes(label.name)
                      return (
                        <div
                          key={label.id}
                          className={cn(
                            "flex items-center gap-3 rounded-lg cursor-pointer hover:bg-accent/50 transition-all duration-200 p-2.5",
                            isSelected && "bg-accent",
                          )}
                          onClick={() => handleLabelChange(label.name, !isSelected)}
                        >
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: label.color }}
                          />
                          <span className="text-sm font-medium flex-1">{label.name}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* TODO: Add due date range filter when needed */}
              {/* TODO: Add task status filter when status field is more widely used */}
              {/* TODO: Add assigned team members filter when team features are implemented */}
            </div>
          </ScrollArea>
        </div>
      </PopoverContent>
    </Popover>
  )
}
