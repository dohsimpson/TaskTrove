"use client"

import React from "react"
import { useState } from "react"
import { useAtomValue, useSetAtom } from "jotai"
import Link from "next/link"
import { ChevronDown, ChevronRight, Folder, FolderOpen } from "lucide-react"
import { SidebarMenuItem, SidebarMenuButton, SidebarMenuBadge } from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"
import { useContextMenuVisibility } from "@/hooks/use-context-menu-visibility"
import { ProjectGroupContextMenu } from "./project-group-context-menu"
import { ProjectContextMenu } from "./project-context-menu"
import { EditableDiv } from "@/components/ui/custom/editable-div"
import {
  editingProjectIdAtom,
  stopEditingProjectAtom,
  pathnameAtom,
} from "@/lib/atoms/ui/navigation"
import { projectTaskCountsAtom, projectActions } from "@/lib/atoms"
import type { ProjectGroup, ProjectId } from "@/lib/types"

interface ProjectGroupItemProps {
  group: ProjectGroup
  projects: Array<{ id: ProjectId; name: string; slug: string; color: string }>
}

// Helper component for individual projects within groups
interface GroupedProjectItemProps {
  project: { id: ProjectId; name: string; slug: string; color: string }
}

function GroupedProjectItem({ project }: GroupedProjectItemProps) {
  const [isHovered, setIsHovered] = useState(false)
  const pathname = useAtomValue(pathnameAtom)
  const projectTaskCounts = useAtomValue(projectTaskCountsAtom)
  const editingProjectId = useAtomValue(editingProjectIdAtom)
  const stopEditing = useSetAtom(stopEditingProjectAtom)
  const updateProject = useSetAtom(projectActions.updateProject)

  const isActive = pathname === `/projects/${project.slug}`
  const projectTaskCount = projectTaskCounts[project.id] || 0
  const isEditing = editingProjectId === project.id

  // Context menu visibility with flicker prevention
  const {
    isVisible: contextMenuVisible,
    isMenuOpen,
    handleMenuOpenChange,
  } = useContextMenuVisibility(isHovered)

  const handleProjectNameChange = (newName: string) => {
    if (newName.trim() && newName !== project.name) {
      updateProject({ projectId: project.id, updates: { name: newName.trim() } })
    }
    stopEditing()
  }

  const handleCancelEdit = () => {
    stopEditing()
  }

  return (
    <SidebarMenuItem>
      <div
        className="relative group w-full"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <SidebarMenuButton asChild isActive={isActive}>
          <Link href={`/projects/${project.slug}`}>
            <div className="flex items-center gap-2 w-full ml-6">
              <Folder className="h-4 w-4" style={{ color: project.color }} />
              {isEditing ? (
                <EditableDiv
                  as="span"
                  value={project.name}
                  onChange={handleProjectNameChange}
                  onCancel={handleCancelEdit}
                  autoFocus
                  className="flex-1"
                />
              ) : (
                <span className="flex-1 truncate">{project.name}</span>
              )}
              <SidebarMenuBadge className={contextMenuVisible ? "opacity-0" : ""}>
                {projectTaskCount}
              </SidebarMenuBadge>
            </div>
          </Link>
        </SidebarMenuButton>

        {/* Context menu */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2">
          <ProjectContextMenu
            projectId={project.id}
            isVisible={contextMenuVisible}
            open={isMenuOpen}
            onOpenChange={handleMenuOpenChange}
          />
        </div>
      </div>
    </SidebarMenuItem>
  )
}

export function ProjectGroupItem({ group, projects }: ProjectGroupItemProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [isHovered, setIsHovered] = useState(false)
  const projectTaskCounts = useAtomValue(projectTaskCountsAtom)

  // Context menu visibility with flicker prevention
  const {
    isVisible: contextMenuVisible,
    isMenuOpen,
    handleMenuOpenChange,
  } = useContextMenuVisibility(isHovered)

  // Calculate total task count for projects in this group (simplified - no nested groups)
  const calculateGroupTaskCount = (groupItems: ProjectGroup["items"]): number => {
    let count = 0
    for (const item of groupItems) {
      if (typeof item === "string") {
        // It's a project ID
        count += projectTaskCounts[item] || 0
      }
      // Note: We skip nested groups since we want single-layer groups only
    }
    return count
  }

  const taskCount = calculateGroupTaskCount(group.items)

  // Get only project IDs from items (ignore nested groups for simplicity)
  const projectIds = group.items.filter((item): item is ProjectId => typeof item === "string")

  // Find actual project objects for this group's direct projects
  const groupProjects = projectIds
    .map((projectId) => projects.find((p) => p.id === projectId))
    .filter((p): p is NonNullable<typeof p> => !!p)

  const hasProjects = groupProjects.length > 0

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded)
  }

  return (
    <>
      {/* Group header */}
      <SidebarMenuItem>
        <div
          className="relative group w-full"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <SidebarMenuButton
            asChild={false}
            onClick={toggleExpanded}
            className="w-full cursor-pointer"
          >
            <div className="flex items-center gap-2 w-full">
              {/* Chevron for expand/collapse - only show if group has projects */}
              {hasProjects && (
                <span className="flex-shrink-0">
                  {isExpanded ? (
                    <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronRight className="h-3 w-3" />
                  )}
                </span>
              )}

              {/* Spacer for groups without projects to align with other items */}
              {!hasProjects && <span className="w-3 h-3 flex-shrink-0" />}

              {/* Folder icon */}
              <span className="flex-shrink-0">
                {isExpanded && hasProjects ? (
                  <FolderOpen className="h-4 w-4" style={{ color: group.color }} />
                ) : (
                  <Folder className="h-4 w-4" style={{ color: group.color }} />
                )}
              </span>

              {/* Group name */}
              <span className="flex-1 truncate">{group.name}</span>

              {/* Task count badge */}
              <SidebarMenuBadge className={cn(contextMenuVisible ? "opacity-0" : "")}>
                {taskCount}
              </SidebarMenuBadge>
            </div>
          </SidebarMenuButton>

          {/* Context menu */}
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            <ProjectGroupContextMenu
              groupId={group.id}
              isVisible={contextMenuVisible}
              open={isMenuOpen}
              onOpenChange={handleMenuOpenChange}
            />
          </div>
        </div>
      </SidebarMenuItem>

      {/* Group contents (when expanded) - only show direct projects */}
      {isExpanded && hasProjects && (
        <>
          {/* Direct projects in this group */}
          {groupProjects.map((project) => (
            <GroupedProjectItem key={project.id} project={project} />
          ))}
        </>
      )}
    </>
  )
}
