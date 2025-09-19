"use client"

import React from "react"
import { useAtomValue, useSetAtom } from "jotai"
import { activeFiltersAtom, hasActiveFiltersAtom, updateFiltersAtom } from "@/lib/atoms/ui/views"
import { projectAtoms } from "@/lib/atoms"
import { labelsAtom } from "@/lib/atoms/core/labels"
import { type Project, type Label, type ProjectId } from "@/lib/types"
import { getPresetLabel, getCustomRangeLabel } from "@/lib/utils/date-filter-utils"

import { Badge } from "@/components/ui/badge"
import { X, Flag, Calendar, CheckCircle, Clock, Folder, Tag } from "lucide-react"
import { cn } from "@/lib/utils"
import { getPriorityLabel, getPriorityColor } from "@/lib/color-utils"

interface TaskFilterBadgesProps {
  className?: string
}

interface FilterBadgeProps {
  icon: React.ReactNode
  label: string
  onRemove: () => void
}

function FilterBadge({ icon, label, onRemove }: FilterBadgeProps) {
  return (
    <Badge
      variant="outline"
      className="inline-flex items-center gap-1.5 h-6 px-2 text-xs transition-colors group"
    >
      {icon}
      <span>{label}</span>
      <button
        type="button"
        onClick={onRemove}
        className="ml-0.5 hover:bg-accent rounded-full p-0.5"
      >
        <X className="w-2.5 h-2.5" />
      </button>
    </Badge>
  )
}

export function TaskFilterBadges({ className }: TaskFilterBadgesProps) {
  const activeFilters = useAtomValue(activeFiltersAtom)
  const hasActiveFilters = useAtomValue(hasActiveFiltersAtom)
  const updateFilters = useSetAtom(updateFiltersAtom)

  // Data for lookups
  const allProjects = useAtomValue(projectAtoms.derived.allProjects)
  const allLabels = useAtomValue(labelsAtom)

  if (!hasActiveFilters) {
    return null
  }

  const removePriorityFilter = (priority: number) => {
    const currentPriorities = activeFilters.priorities || []
    const newPriorities = currentPriorities.filter((p) => p !== priority)
    updateFilters({
      priorities: newPriorities.length > 0 ? newPriorities : undefined,
    })
  }

  const removeProjectFilter = (projectId: ProjectId) => {
    const currentProjects = activeFilters.projectIds || []
    const newProjects = currentProjects.filter((p) => p !== projectId)
    updateFilters({
      projectIds: newProjects.length > 0 ? newProjects : undefined,
    })
  }

  const removeLabelFilter = (labelName: string) => {
    if (!Array.isArray(activeFilters.labels)) return
    const currentLabels = activeFilters.labels
    const newLabels = currentLabels.filter((l) => l !== labelName)
    updateFilters({
      labels: newLabels.length > 0 ? newLabels : [],
    })
  }

  const removeNoLabelsFilter = () => {
    updateFilters({ labels: [] })
  }

  const removeCompletionFilter = () => {
    updateFilters({ completed: undefined })
  }

  const removeDueDateFilter = () => {
    updateFilters({ dueDateFilter: undefined })
  }

  const getProjectName = (projectId: ProjectId) => {
    const project = allProjects.find((p: Project) => p.id === projectId)
    return project?.name || projectId
  }

  const getProjectColor = (projectId: ProjectId) => {
    const project = allProjects.find((p: Project) => p.id === projectId)
    return project?.color || "#6b7280"
  }

  const getLabelColor = (labelName: string) => {
    const label = allLabels.find((l: Label) => l.name === labelName)
    return label?.color || "#6b7280"
  }

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {/* Priority filters */}
      {activeFilters.priorities?.map((priority) => (
        <FilterBadge
          key={`priority-${priority}`}
          icon={<Flag className={cn("w-3 h-3", getPriorityColor(priority))} />}
          label={getPriorityLabel(priority)}
          onRemove={() => removePriorityFilter(priority)}
        />
      ))}

      {/* Completion status filter */}
      {activeFilters.completed !== undefined && (
        <FilterBadge
          icon={
            activeFilters.completed ? (
              <CheckCircle className="w-3 h-3 text-green-600" />
            ) : (
              <Clock className="w-3 h-3 text-blue-600" />
            )
          }
          label={activeFilters.completed ? "Completed" : "Active"}
          onRemove={removeCompletionFilter}
        />
      )}

      {/* Project filters */}
      {activeFilters.projectIds?.map((projectId) => (
        <FilterBadge
          key={`project-${projectId}`}
          icon={<Folder className="w-3 h-3" style={{ color: getProjectColor(projectId) }} />}
          label={getProjectName(projectId)}
          onRemove={() => removeProjectFilter(projectId)}
        />
      ))}

      {/* Label filters */}
      {activeFilters.labels === null ? (
        <FilterBadge
          key="no-labels"
          icon={<Tag className="w-3 h-3 text-muted-foreground" />}
          label="No labels"
          onRemove={removeNoLabelsFilter}
        />
      ) : Array.isArray(activeFilters.labels) ? (
        activeFilters.labels.map((labelName) => (
          <FilterBadge
            key={`label-${labelName}`}
            icon={<Tag className="w-3 h-3" style={{ color: getLabelColor(labelName) }} />}
            label={labelName}
            onRemove={() => removeLabelFilter(labelName)}
          />
        ))
      ) : null}

      {/* Due date filter */}
      {activeFilters.dueDateFilter && (
        <FilterBadge
          icon={<Calendar className="w-3 h-3 text-orange-600" />}
          label={
            activeFilters.dueDateFilter.preset
              ? getPresetLabel(activeFilters.dueDateFilter.preset)
              : activeFilters.dueDateFilter.customRange
                ? getCustomRangeLabel(activeFilters.dueDateFilter.customRange)
                : "Due Date"
          }
          onRemove={removeDueDateFilter}
        />
      )}

      {/* TODO: Add status and assignedTo badges when implemented */}
    </div>
  )
}
