"use client"

import React, { useEffect, useState } from "react"
import { useAtomValue, useSetAtom } from "jotai"
import { Folder, Inbox, ChevronRight, ChevronDown, FolderOpen, Folders } from "lucide-react"
import { cn, shouldTaskBeInInbox } from "@/lib/utils"
import { projectsAtom, tasksAtom } from "@tasktrove/atoms/data/base/atoms"
import { projectIdsAtom } from "@tasktrove/atoms/core/projects"
import { allGroupsAtom } from "@tasktrove/atoms/core/groups"
import { useTranslation } from "@tasktrove/i18n"
import type { Task } from "@tasktrove/types/core"
import type { ProjectId, GroupId } from "@tasktrove/types/id"
import type { ProjectGroup } from "@tasktrove/types/group"
import { INBOX_PROJECT_ID } from "@tasktrove/types/constants"
import { isGroup } from "@tasktrove/types/group"

interface ProjectContentProps {
  // Mode 1: Task-based (for TaskItem)
  task?: Task | Task[]
  onUpdate?: (projectId: ProjectId, sectionId?: GroupId) => void
  className?: string
}

export function ProjectContent({ task, onUpdate, className }: ProjectContentProps) {
  // Translation setup
  const { t } = useTranslation("task")

  const allProjects = useAtomValue(projectsAtom)
  const groups = useAtomValue(allGroupsAtom)
  const updateTasks = useSetAtom(tasksAtom)

  const isMultipleTasks = Array.isArray(task)

  // Helper function to collect all group IDs recursively
  const collectAllGroupIds = (items: (ProjectGroup | ProjectId)[]): Set<string> => {
    const groupIds = new Set<string>()

    const traverse = (item: ProjectGroup | ProjectId) => {
      if (isGroup<ProjectGroup>(item)) {
        groupIds.add(item.id)
        item.items.forEach(traverse)
      }
    }

    items.forEach(traverse)
    return groupIds
  }

  // Determine current project based on mode (only for single task)
  const currentProjectId = isMultipleTasks ? undefined : task?.projectId
  const currentProject = currentProjectId
    ? allProjects.find((p) => p.id === currentProjectId)
    : undefined
  // Find which section contains this task (if any, only for single task)
  const currentSectionId =
    !isMultipleTasks && currentProject && task
      ? currentProject.sections.find((s) => s.items.includes(task.id))?.id
      : undefined

  // Check if currently in inbox (includes orphaned tasks, only for single task)
  const projectIds = useAtomValue(projectIdsAtom)
  const isInboxSelected = !isMultipleTasks && shouldTaskBeInInbox(currentProjectId, projectIds)

  // State for expanded projects and groups (default all groups expanded)
  const [expandedProjects, setExpandedProjects] = useState<Set<ProjectId>>(() => {
    const initial = new Set<ProjectId>()
    if (currentProjectId && currentSectionId) {
      initial.add(currentProjectId)
    }
    return initial
  })
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() =>
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    collectAllGroupIds(groups.projectGroups?.items || []),
  )

  useEffect(() => {
    if (!currentProjectId || !currentSectionId) return
    setExpandedProjects((prev) => {
      if (prev.has(currentProjectId)) {
        return prev
      }
      const next = new Set(prev)
      next.add(currentProjectId)
      return next
    })
  }, [currentProjectId, currentSectionId])

  const handleProjectSelect = (projectId: ProjectId, sectionId?: GroupId) => {
    if (onUpdate) {
      // Callback mode (QuickAdd)
      onUpdate(projectId, sectionId)
    } else if (task) {
      // Task mode (TaskItem)
      if (isMultipleTasks) {
        // For multiple tasks, update all at once
        updateTasks(task.map((t) => ({ id: t.id, projectId, sectionId })))
      } else {
        // For single task
        updateTasks([{ id: task.id, projectId, sectionId }])
      }
    }
  }

  const handleSectionSelect = (projectId: ProjectId, sectionId: GroupId) => {
    handleProjectSelect(projectId, sectionId)
  }

  const handleInboxSelect = () => {
    if (onUpdate) {
      // Callback mode (QuickAdd)
      onUpdate(INBOX_PROJECT_ID)
    } else if (task) {
      // Task mode (TaskItem)
      if (isMultipleTasks) {
        // For multiple tasks, update all at once
        updateTasks(
          task.map((t) => ({ id: t.id, projectId: INBOX_PROJECT_ID, sectionId: undefined })),
        )
      } else {
        // For single task
        updateTasks([{ id: task.id, projectId: INBOX_PROJECT_ID, sectionId: undefined }])
      }
    }
  }

  const toggleProjectExpansion = (projectId: ProjectId) => {
    setExpandedProjects((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(projectId)) {
        newSet.delete(projectId)
      } else {
        newSet.add(projectId)
      }
      return newSet
    })
  }

  const toggleGroupExpansion = (groupId: string) => {
    setExpandedGroups((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(groupId)) {
        newSet.delete(groupId)
      } else {
        newSet.add(groupId)
      }
      return newSet
    })
  }

  // Recursive component to render project groups and individual projects
  /* eslint-disable react/prop-types */
  const ProjectGroupItem = ({
    item,
    level = 0,
  }: {
    item: ProjectGroup | ProjectId
    level?: number
  }) => {
    // Use explicit class names for reliable Tailwind CSS compilation
    const getIndentClass = (level: number) => {
      switch (level) {
        case 0:
          return ""
        case 1:
          return "ml-6"
        case 2:
          return "ml-12"
        case 3:
          return "ml-18"
        default:
          return "ml-24"
      }
    }
    const indentClass = getIndentClass(level)

    if (isGroup<ProjectGroup>(item)) {
      // It's a project group
      const group = item
      const isGroupExpanded = expandedGroups.has(group.id)
      const hasItems = group.items.length > 0

      return (
        <div key={group.id}>
          {/* Group Header */}
          <div
            className={cn(
              "flex items-center gap-3 rounded-md hover:bg-accent/50 transition-all duration-200 py-2",
              indentClass,
            )}
          >
            <div
              className={cn(
                "flex items-center gap-2 flex-1",
                hasItems ? "cursor-pointer" : "cursor-default",
              )}
              onClick={hasItems ? () => toggleGroupExpansion(group.id) : undefined}
            >
              {/* Always show chevron for groups, but disable for empty ones */}
              {isGroupExpanded ? (
                <ChevronDown
                  className={cn(
                    "h-3 w-3",
                    hasItems ? "text-muted-foreground" : "text-muted-foreground/50",
                  )}
                />
              ) : (
                <ChevronRight
                  className={cn(
                    "h-3 w-3",
                    hasItems ? "text-muted-foreground" : "text-muted-foreground/50",
                  )}
                />
              )}
              {isGroupExpanded ? (
                <FolderOpen className="h-4 w-4" style={{ color: group.color }} />
              ) : (
                <Folders className="h-4 w-4" style={{ color: group.color }} />
              )}
              <span
                className={cn("text-sm font-medium truncate", !hasItems && "text-muted-foreground")}
              >
                {group.name}
              </span>
            </div>
          </div>

          {/* Group Contents */}
          {isGroupExpanded && hasItems && (
            <div className="space-y-1">
              {group.items.map((groupItem) => (
                <ProjectGroupItem
                  key={typeof groupItem === "string" ? groupItem : groupItem.id}
                  item={groupItem}
                  level={level + 1}
                />
              ))}
            </div>
          )}
        </div>
      )
    } else {
      // It's a project ID - render as individual project
      const projectId = item
      const project = allProjects.find((p) => p.id === projectId)

      if (!project) return null

      const isExpanded = expandedProjects.has(project.id)
      const hasSections = project.sections.length > 0
      const isProjectSelected = project.id === currentProject?.id && !currentSectionId

      return (
        <div key={project.id}>
          {/* Project Row */}
          <div
            className={cn(
              "flex items-center gap-3 rounded-md hover:bg-accent/50 transition-all duration-200 py-2",
              isProjectSelected && "bg-accent",
              indentClass,
            )}
          >
            <Folder className="h-4 w-4" style={{ color: project.color }} />
            <span
              className="text-sm font-medium flex-1 cursor-pointer truncate"
              onClick={() => handleProjectSelect(project.id)}
            >
              {project.name}
            </span>
            {hasSections && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  toggleProjectExpansion(project.id)
                }}
                className="p-1 hover:bg-accent rounded transition-colors"
              >
                {isExpanded ? (
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-3 w-3 text-muted-foreground" />
                )}
              </button>
            )}
          </div>

          {/* Sections List */}
          {isExpanded && hasSections && (
            <div className={cn("mt-1 space-y-1", getIndentClass(level + 1))}>
              {project.sections.map((section) => {
                const isSectionSelected =
                  project.id === currentProject?.id && section.id === currentSectionId

                return (
                  <div
                    key={section.id}
                    className={cn(
                      "flex items-center gap-3 rounded-md cursor-pointer hover:bg-accent/50 transition-all duration-200 p-2",
                      isSectionSelected && "bg-accent",
                    )}
                    onClick={() => handleSectionSelect(project.id, section.id)}
                  >
                    <div
                      className="h-3 w-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: section.color }}
                    />
                    <span className="text-sm truncate">{section.name}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )
    }
  }

  return (
    <div className={cn(className)}>
      {/* Projects and Groups List */}
      {/* eslint-disable-next-line @typescript-eslint/no-unnecessary-condition */}
      {groups.projectGroups?.items && groups.projectGroups.items.length > 0 && (
        <div className="space-y-1">
          {/* Render root group items (can be groups or direct projects) */}
          {groups.projectGroups.items.map((item) => (
            <ProjectGroupItem
              key={typeof item === "string" ? item : item.id}
              item={item}
              level={0}
            />
          ))}
        </div>
      )}

      {/* Separator */}
      {/* eslint-disable-next-line @typescript-eslint/no-unnecessary-condition */}
      {groups.projectGroups?.items && groups.projectGroups.items.length > 0 && (
        <div className="my-1">
          <div className="bg-border h-px mx-1" />
        </div>
      )}

      {/* Inbox Option */}
      <div className="space-y-1">
        <div
          className={cn(
            "flex items-center gap-3 rounded-md cursor-pointer hover:bg-accent/50 transition-all duration-200 p-2",
            isInboxSelected && "bg-accent",
          )}
          onClick={handleInboxSelect}
        >
          <Inbox className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium flex-1 truncate">
            {t("project.noProject", "No Project (Inbox)")}
          </span>
        </div>
      </div>
    </div>
  )
}
