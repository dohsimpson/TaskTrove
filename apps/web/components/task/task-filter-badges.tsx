"use client"

import React from "react"
import { useAtomValue, useSetAtom } from "jotai"
import {
  activeFiltersAtom,
  hasActiveFiltersAtom,
  updateFiltersAtom,
} from "@tasktrove/atoms/ui/views"
import { projectAtoms } from "@tasktrove/atoms/core/projects"
import { labelsAtom } from "@tasktrove/atoms/data/base/atoms"
import { FALLBACK_COLOR } from "@tasktrove/constants"
import { type Project, type Label } from "@tasktrove/types/core"
import { type ProjectId } from "@tasktrove/types/id"
import { getPresetLabel, getCustomRangeLabel } from "@/lib/utils/date-filter-utils"
import { useTranslation } from "@tasktrove/i18n"
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
      variant="secondary"
      className="inline-flex items-center gap-1.5 h-7 px-3 text-xs font-medium transition-all duration-200 group hover:bg-primary/10 hover:border-primary/30 hover:text-primary cursor-pointer shadow-sm"
    >
      {icon}
      <span className="max-w-[120px] truncate">{label}</span>
      <button
        type="button"
        onClick={onRemove}
        className="ml-1 hover:bg-muted rounded-full p-0.5 transition-colors opacity-70 hover:opacity-100"
      >
        <X className="w-3 h-3" />
      </button>
    </Badge>
  )
}

export function TaskFilterBadges({ className }: TaskFilterBadgesProps) {
  const { t } = useTranslation("task")

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
    return project?.color || FALLBACK_COLOR
  }

  const getLabelColor = (labelName: string) => {
    const label = allLabels.find((l: Label) => l.name === labelName)
    return label?.color || FALLBACK_COLOR
  }

  return (
    <div className={cn("flex flex-wrap gap-2 items-center", className)}>
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
          label={
            activeFilters.completed
              ? t("filters.completedOnly", "Completed")
              : t("filters.activeOnly", "Active")
          }
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
          label={t("filters.noLabels", "No labels")}
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
              ? getPresetLabel(activeFilters.dueDateFilter.preset, t)
              : activeFilters.dueDateFilter.customRange
                ? getCustomRangeLabel(activeFilters.dueDateFilter.customRange, t)
                : t("filters.dueDate", "Due Date")
          }
          onRemove={removeDueDateFilter}
        />
      )}

      {/* TODO: Add status and assignedTo badges when implemented */}
    </div>
  )
}
