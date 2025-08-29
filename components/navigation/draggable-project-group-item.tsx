"use client"

import React from "react"
import { useState } from "react"
import { useAtomValue, useSetAtom } from "jotai"
import { ChevronDown, ChevronRight, Folder, FolderOpen } from "lucide-react"
import { SidebarMenuItem, SidebarMenuButton, SidebarMenuBadge } from "@/components/ui/sidebar"
import { DraggableWrapper } from "@/components/ui/draggable-wrapper"
import { DropTargetWrapper } from "@/components/ui/drop-target-wrapper"
import { SidebarDropIndicator } from "./sidebar-drop-indicator"
import { DraggableProjectItem } from "./draggable-project-item"
import { cn } from "@/lib/utils"
import { useContextMenuVisibility } from "@/hooks/use-context-menu-visibility"
import { ProjectGroupContextMenu } from "./project-group-context-menu"
import { extractSidebarInstruction } from "@/hooks/use-sidebar-drag-state"
import { projectTaskCountsAtom } from "@/lib/atoms"
import {
  reorderProjectWithinGroupAtom,
  moveProjectToGroupAtom,
  removeProjectFromGroupWithIndexAtom,
  reorderGroupAtom,
  reorderProjectWithinRootAtom,
} from "@/lib/atoms/core/groups"
import {
  attachInstruction,
  extractInstruction,
  type Instruction,
} from "@atlaskit/pragmatic-drag-and-drop-hitbox/tree-item"
import type { Input as DragInputType } from "@atlaskit/pragmatic-drag-and-drop/types"
import type { ProjectGroup, ProjectId, Project } from "@/lib/types"
import { ROOT_PROJECT_GROUP_ID } from "@/lib/types/defaults"

interface DraggableProjectGroupItemProps {
  group: ProjectGroup
  projects: Project[]
  index: number
}

export function DraggableProjectGroupItem({
  group,
  projects,
  index,
}: DraggableProjectGroupItemProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [isHovered, setIsHovered] = useState(false)
  const projectTaskCounts = useAtomValue(projectTaskCountsAtom)

  // Drag and drop atom setters
  const reorderProjectWithinGroup = useSetAtom(reorderProjectWithinGroupAtom)
  const reorderProjectWithinRoot = useSetAtom(reorderProjectWithinRootAtom)
  const moveProjectToGroup = useSetAtom(moveProjectToGroupAtom)
  const removeProjectFromGroupWithIndex = useSetAtom(removeProjectFromGroupWithIndexAtom)
  const reorderGroup = useSetAtom(reorderGroupAtom)

  // Local drag state for this group
  const [groupDragState, setGroupDragState] = useState<{
    isDraggingOver: boolean
    draggedItemRect?: { height: number }
    draggedItemType?: "project" | "group"
    instruction?: Instruction | null
  } | null>(null)

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
    .filter((p): p is Project => !!p)

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded)
  }

  // Drag and drop handlers for group header
  const handleGroupDrop = async ({
    source,
    location,
  }: {
    source: { data: Record<string, unknown> }
    location: { current: { dropTargets: Array<{ data: Record<string, unknown> }> } }
  }) => {
    console.log("🎯 Drop on group:", { source: source.data, location })

    const sourceData = source.data
    const dropTargetData = location.current.dropTargets[0]?.data

    if (!sourceData || !dropTargetData) return

    // Extract instruction using Atlassian's instruction system
    const instruction = extractSidebarInstruction(sourceData, dropTargetData)

    console.log("📍 Extracted instruction:", instruction)

    // Execute the instruction with actual atoms
    if (instruction) {
      try {
        switch (instruction.type) {
          case "reorder-project":
            if (instruction.withinGroupId) {
              // Reorder within a group
              await reorderProjectWithinGroup({
                groupId: instruction.withinGroupId,
                projectId: instruction.projectId,
                newIndex: instruction.toIndex,
              })
            } else {
              await reorderProjectWithinRoot({
                groupId: ROOT_PROJECT_GROUP_ID,
                projectId: instruction.projectId,
                newIndex: instruction.toIndex,
              })
            }
            break

          case "move-project-to-group":
            await moveProjectToGroup({
              projectId: instruction.projectId,
              fromGroupId: instruction.fromGroupId,
              toGroupId: instruction.toGroupId,
              insertIndex: instruction.insertIndex,
            })
            break

          case "remove-project-from-group":
            await removeProjectFromGroupWithIndex({
              projectId: instruction.projectId,
              _insertIndex: instruction.insertIndex,
            })
            break

          case "reorder-group":
            await reorderGroup({
              groupId: instruction.groupId,
              fromIndex: instruction.fromIndex,
              toIndex: instruction.toIndex,
            })
            break

          default:
            console.log("❓ Unknown instruction:", instruction)
        }
      } catch (error) {
        console.error("🚨 Error executing drag and drop instruction:", error)
      }
    }

    // Auto-expand group when project is added to it
    if (
      instruction?.type === "move-project-to-group" &&
      instruction.toGroupId === group.id &&
      !isExpanded
    ) {
      setIsExpanded(true)
    }

    setGroupDragState(null)
  }

  const handleGroupDragEnter = ({ source }: { source: { data: Record<string, unknown> } }) => {
    const sourceData = source.data
    if (
      (sourceData.type === "sidebar-group" && sourceData.groupId !== group.id) ||
      sourceData.type === "sidebar-project"
    ) {
      const rect = sourceData.rect
      if (rect && typeof rect === "object" && "height" in rect && typeof rect.height === "number") {
        setGroupDragState({
          isDraggingOver: true,
          draggedItemRect: { height: rect.height },
          draggedItemType: sourceData.type === "sidebar-group" ? "group" : "project",
        })
      }
    }
  }

  const handleGroupDragLeave = () => {
    setGroupDragState(null)
  }

  const handleGroupDrag = ({
    source,
    location,
  }: {
    source: { data: Record<string, unknown> }
    location: { current: { dropTargets: Array<{ data: Record<string, unknown> }> } }
  }) => {
    const sourceData = source.data
    if (
      (sourceData.type === "sidebar-group" && sourceData.groupId !== group.id) ||
      sourceData.type === "sidebar-project"
    ) {
      // Only show indicator if THIS element is the innermost target (following official pattern)
      const innerMost = location.current.dropTargets[0]
      const isInnermostTarget =
        innerMost?.data.type === "sidebar-group-drop-target" && innerMost?.data.groupId === group.id

      if (isInnermostTarget) {
        const instruction = extractInstruction(innerMost?.data)
        setGroupDragState((prev) =>
          prev
            ? {
                ...prev,
                instruction,
              }
            : null,
        )
      } else {
        // Clear indicator if not innermost target
        setGroupDragState((prev) => (prev ? { ...prev, instruction: null } : null))
      }
    }
  }

  return (
    <>
      {/* Group header with drag and drop */}
      <DropTargetWrapper
        onDrop={handleGroupDrop}
        onDragEnter={handleGroupDragEnter}
        onDragLeave={handleGroupDragLeave}
        onDrag={handleGroupDrag}
        getData={(args?: { input?: DragInputType; element?: HTMLElement }) => {
          const baseData = {
            type: "sidebar-group-drop-target",
            groupId: group.id,
            index,
          }
          // Use attachInstruction for proper zone detection
          if (args?.input && args?.element) {
            return attachInstruction(baseData, {
              element: args.element,
              input: args.input,
              currentLevel: 0, // Groups are at level 0
              indentPerLevel: 0, // Not using indentation for sidebar
              mode: "standard",
            })
          }
          return baseData
        }}
      >
        <DraggableWrapper
          dragId={group.id}
          index={index}
          getData={() => ({
            type: "sidebar-group",
            groupId: group.id,
            groupName: group.name,
            index,
            projectCount: groupProjects.length,
          })}
        >
          <SidebarMenuItem>
            <div
              className="relative group w-full"
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
            >
              {/* Drop indicator above - show when reorder-above instruction */}
              {groupDragState?.isDraggingOver &&
                groupDragState?.instruction?.type === "reorder-above" &&
                groupDragState?.draggedItemRect && (
                  <SidebarDropIndicator level={0} className="-top-1" />
                )}
              <SidebarMenuButton
                asChild={false}
                onClick={toggleExpanded}
                className={cn(
                  "w-full cursor-pointer transition-colors",
                  // Subtle highlighting when make-child instruction (dropping INTO group)
                  groupDragState?.isDraggingOver &&
                    groupDragState?.instruction?.type === "make-child" &&
                    "bg-primary/10 border border-primary/20",
                )}
              >
                <div className="flex items-center gap-2 w-full">
                  {/* Chevron for expand/collapse - always show for visual consistency */}
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
                  <span className="flex-1 truncate mr-6">{group.name}</span>

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

              {/* Drop indicator below group - show when reorder-below instruction */}
              {groupDragState?.isDraggingOver &&
                groupDragState?.instruction?.type === "reorder-below" &&
                groupDragState?.draggedItemRect && (
                  <SidebarDropIndicator level={0} className="-bottom-1" />
                )}
            </div>
          </SidebarMenuItem>
        </DraggableWrapper>
      </DropTargetWrapper>

      {/* Group contents (when expanded) */}
      {isExpanded && (
        <>
          {/* Direct projects in this group */}
          {groupProjects.map((project, projectIndex) => (
            <DraggableProjectItem
              key={project.id}
              project={project}
              index={projectIndex}
              isInGroup={true}
              groupId={group.id}
            />
          ))}
        </>
      )}
    </>
  )
}
