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
import { isGroup } from "@/lib/types"
import type { ProjectGroup, ProjectId } from "@/lib/types"

interface ProjectGroupItemProps {
  group: ProjectGroup
  depth?: number
  projects: Array<{ id: ProjectId; name: string; slug: string; color: string }>
}

export function ProjectGroupItem({ group, depth = 0, projects }: ProjectGroupItemProps) {
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

  // Calculate total task count for this group and all subgroups/projects
  const calculateGroupTaskCount = (groupItems: ProjectGroup["items"]): number => {
    let count = 0
    for (const item of groupItems) {
      if (typeof item === "string") {
        // It's a project ID
        count += projectTaskCounts[item] || 0
      } else if (isGroup<ProjectGroup>(item) && item.type === "project") {
        // It's a nested project group
        count += calculateGroupTaskCount(item.items)
      }
    }
    return count
  }

  const taskCount = calculateGroupTaskCount(group.items)

  // Get projects and nested groups from items
  const projectIds = group.items.filter((item): item is ProjectId => typeof item === "string")
  const nestedGroups = group.items.filter(
    (item): item is ProjectGroup => isGroup<ProjectGroup>(item) && item.type === "project",
  )

  // Find actual project objects for this group's direct projects
  const groupProjects = projectIds
    .map((projectId) => projects.find((p) => p.id === projectId))
    .filter((p): p is NonNullable<typeof p> => !!p)

  const indentStyle = { marginLeft: `${depth * 16}px` }

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
            <div className="flex items-center gap-2 w-full" style={indentStyle}>
              {/* Chevron for expand/collapse */}
              {(nestedGroups.length > 0 || projectIds.length > 0) && (
                <span className="flex-shrink-0">
                  {isExpanded ? (
                    <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronRight className="h-3 w-3" />
                  )}
                </span>
              )}

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
          {/* Nested project groups */}
          {nestedGroups.map((nestedGroup) => (
            <ProjectGroupItem
              key={nestedGroup.id}
              group={nestedGroup}
              depth={depth + 1}
              projects={projects}
            />
          ))}

          {/* Direct projects in this group */}
          {groupProjects.map((project) => {
            const isActive = pathname === `/projects/${project.slug}`
            const projectTaskCount = projectTaskCounts[project.id] || 0

            return (
              <SidebarMenuItem key={project.id}>
                <SidebarMenuButton asChild isActive={isActive}>
                  <Link href={`/projects/${project.slug}`}>
                    <div
                      className="flex items-center gap-2 w-full"
                      style={{ marginLeft: `${(depth + 1) * 16}px` }}
                    >
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
