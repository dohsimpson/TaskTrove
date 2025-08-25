"use client"

import React from "react"
import { useState } from "react"
import { useAtomValue } from "jotai"
import Link from "next/link"
import { ChevronDown, ChevronRight, Folder, FolderOpen } from "lucide-react"
import { SidebarMenuItem, SidebarMenuButton, SidebarMenuBadge } from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"
import { useContextMenuVisibility } from "@/hooks/use-context-menu-visibility"
import { ProjectGroupContextMenu } from "./project-group-context-menu"
import { pathnameAtom } from "@/lib/atoms/ui/navigation"
import { projectTaskCountsAtom } from "@/lib/atoms"
import type { ProjectGroup, ProjectId } from "@/lib/types"

interface ProjectGroupItemProps {
  group: ProjectGroup
  projects: Array<{ id: ProjectId; name: string; slug: string; color: string }>
}

export function ProjectGroupItem({ group, projects }: ProjectGroupItemProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [isHovered, setIsHovered] = useState(false)
  const pathname = useAtomValue(pathnameAtom)
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
          {groupProjects.map((project) => {
            const isActive = pathname === `/projects/${project.slug}`
            const projectTaskCount = projectTaskCounts[project.id] || 0

            return (
              <SidebarMenuItem key={project.id}>
                <SidebarMenuButton asChild isActive={isActive}>
                  <Link href={`/projects/${project.slug}`}>
                    <div className="flex items-center gap-2 w-full ml-6">
                      <Folder className="h-4 w-4" style={{ color: project.color }} />
                      <span className="flex-1 truncate">{project.name}</span>
                      <SidebarMenuBadge>{projectTaskCount}</SidebarMenuBadge>
                    </div>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </>
      )}
    </>
  )
}
