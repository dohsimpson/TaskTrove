"use client"

import { useState } from "react"
import { useAtomValue } from "jotai"
import { ChevronDown, ChevronRight, Folder, FolderOpen } from "lucide-react"
import {
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuBadge,
} from "@/components/ui/custom/sidebar"
import { cn } from "@/lib/utils"
import { useContextMenuVisibility } from "@/hooks/use-context-menu-visibility"
import { ProjectGroupContextMenu } from "./project-group-context-menu"
import { DraggableProjectItem } from "./draggable-project-item"
import { projectTaskCountsAtom } from "@tasktrove/atoms/ui/task-counts"
import type { Project } from "@tasktrove/types/core"
import type { ProjectGroup } from "@tasktrove/types/group"
import type { ProjectId } from "@tasktrove/types/id"

interface ProjectGroupItemProps {
  group: ProjectGroup
  projects: Array<Project>
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
              {/* Chevron for expand/collapse */}
              <span className="flex-shrink-0">
                {isExpanded ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
              </span>

              {/* Folder icon */}
              <span className="flex-shrink-0">
                {isExpanded ? (
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

      {/* Group contents (when expanded) */}
      {isExpanded && (
        <>
          {/* Direct projects in this group */}
          {groupProjects.map((project, index) => (
            <DraggableProjectItem
              key={project.id}
              project={project}
              index={index}
              isInGroup={true}
              groupId={group.id}
              enableDragDrop={false}
            />
          ))}
        </>
      )}
    </>
  )
}
