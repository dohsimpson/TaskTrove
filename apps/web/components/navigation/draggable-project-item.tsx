"use client"

import React, { useState } from "react"
import { useAtomValue, useSetAtom } from "jotai"
import { Folder } from "lucide-react"
import { SidebarMenuItem, SidebarMenuButton, SidebarMenuBadge } from "@/components/ui/sidebar"
import { DraggableWrapper } from "@/components/ui/draggable-wrapper"
import { DropTargetWrapper } from "@/components/ui/drop-target-wrapper"
import { SidebarDropIndicator } from "./sidebar-drop-indicator"
import { EditableDiv } from "@/components/ui/custom/editable-div"
import { ProjectContextMenu } from "./project-context-menu"
import { useContextMenuVisibility } from "@/hooks/use-context-menu-visibility"
import { extractSidebarInstruction } from "@/hooks/use-sidebar-drag-state"
import {
  pathnameAtom,
  editingProjectIdAtom,
  stopEditingProjectAtom,
} from "@/lib/atoms/ui/navigation"
import { projectTaskCountsAtom, projectActions } from "@/lib/atoms"
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
import type { Project, GroupId } from "@/lib/types"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { ROOT_PROJECT_GROUP_ID } from "@/lib/types/defaults"

interface DraggableProjectItemProps {
  project: Project
  index: number
  isInGroup?: boolean
  groupId?: GroupId
}

export function DraggableProjectItem({
  project,
  index,
  isInGroup = false,
  groupId,
}: DraggableProjectItemProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [dragState, setDragState] = useState<{
    isDraggingOver: boolean
    draggedItemRect?: { height: number }
    instruction?: Instruction | null
  } | null>(null)

  // State and actions
  const router = useRouter()
  const pathname = useAtomValue(pathnameAtom)
  const projectTaskCounts = useAtomValue(projectTaskCountsAtom)
  const editingProjectId = useAtomValue(editingProjectIdAtom)
  const stopEditing = useSetAtom(stopEditingProjectAtom)
  const updateProject = useSetAtom(projectActions.updateProject)

  // Drag and drop atom setters
  const reorderProjectWithinGroup = useSetAtom(reorderProjectWithinGroupAtom)
  const reorderProjectWithinRoot = useSetAtom(reorderProjectWithinRootAtom)
  const moveProjectToGroup = useSetAtom(moveProjectToGroupAtom)
  const removeProjectFromGroupWithIndex = useSetAtom(removeProjectFromGroupWithIndexAtom)
  const reorderGroup = useSetAtom(reorderGroupAtom)

  // Computed values
  const isActive = pathname === `/projects/${project.slug}`
  const taskCount = projectTaskCounts[project.id] || 0
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

  // Drag and drop handlers
  const handleDrop = async ({
    source,
    location,
  }: {
    source: { data: Record<string, unknown> }
    location: { current: { dropTargets: Array<{ data: Record<string, unknown> }> } }
  }) => {
    console.log("🎯 Drop on project:", { source: source.data, location })

    const sourceData = source.data
    const dropTargetData = location.current.dropTargets[0]?.data

    // Extract instruction using Atlassian's instruction system
    if (!dropTargetData) return
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

    setDragState(null)
  }

  const handleDragEnter = ({ source }: { source: { data: Record<string, unknown> } }) => {
    const sourceType = source.data.type

    // Handle both projects and groups being dragged over this project
    if (
      (sourceType === "sidebar-project" && source.data.projectId !== project.id) ||
      sourceType === "sidebar-group"
    ) {
      const rect = source.data.rect
      if (rect && typeof rect === "object" && "height" in rect && typeof rect.height === "number") {
        setDragState({
          isDraggingOver: true,
          draggedItemRect: { height: rect.height },
        })
      }
    }
  }

  const handleDragLeave = () => {
    setDragState(null)
  }

  const handleDrag = ({
    source,
    location,
  }: {
    source: { data: Record<string, unknown> }
    location: { current: { dropTargets: Array<{ data: Record<string, unknown> }> } }
  }) => {
    const sourceType = source.data.type

    // Handle both projects and groups being dragged over this project
    if (
      (sourceType === "sidebar-project" && source.data.projectId !== project.id) ||
      sourceType === "sidebar-group"
    ) {
      // Only show indicator if THIS element is the innermost target (following official pattern)
      const innerMost = location.current.dropTargets[0]
      if (!innerMost) return

      const isInnermostTarget =
        innerMost.data.type === "sidebar-project-drop-target" &&
        innerMost.data.projectId === project.id

      if (isInnermostTarget) {
        const instruction = extractInstruction(innerMost.data)
        setDragState((prev) =>
          prev
            ? {
                ...prev,
                instruction,
              }
            : null,
        )
      } else {
        // Clear indicator if not innermost target
        setDragState((prev) => (prev ? { ...prev, instruction: null } : null))
      }
    }
  }

  return (
    <>
      <DropTargetWrapper
        onDrop={handleDrop}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrag={handleDrag}
        getData={(args?: { input?: DragInputType; element?: HTMLElement }) => {
          const baseData = {
            type: "sidebar-project-drop-target",
            projectId: project.id,
            index,
            groupId,
          }
          // Use attachInstruction for proper zone detection
          if (args?.input && args.element) {
            return attachInstruction(baseData, {
              element: args.element,
              input: args.input,
              currentLevel: isInGroup ? 1 : 0, // Projects in groups are at level 1
              indentPerLevel: 0, // Not using indentation for sidebar
              mode: "standard",
            })
          }
          return baseData
        }}
      >
        <DraggableWrapper
          dragId={project.id}
          index={index}
          getData={() => ({
            type: "sidebar-project",
            projectId: project.id,
            projectName: project.name,
            index,
            groupId,
            isInGroup,
          })}
        >
          <SidebarMenuItem>
            <div
              className="relative group w-full"
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
            >
              {/* Drop indicator above - show when reorder-above instruction */}
              {dragState?.isDraggingOver &&
                dragState.instruction?.type === "reorder-above" &&
                dragState.draggedItemRect && (
                  <SidebarDropIndicator level={isInGroup ? 1 : 0} className="-top-1" />
                )}
              <SidebarMenuButton
                asChild={false}
                isActive={isActive}
                onClick={(e) => {
                  // Only navigate if not editing and not dragging
                  if (!isEditing && !e.defaultPrevented) {
                    router.push(`/projects/${project.slug}`)
                  }
                }}
                className={cn(
                  "cursor-pointer",
                  isInGroup ? "ml-6 w-[calc(100%-calc(var(--spacing)*6))]" : "w-full", // reduce width by same amount if indenting for nested project
                )}
              >
                <div className="flex items-center gap-2 w-full">
                  <Folder className="h-4 w-4" style={{ color: project.color }} />
                  {isEditing ? (
                    <EditableDiv
                      as="span"
                      value={project.name}
                      onChange={handleProjectNameChange}
                      onCancel={handleCancelEdit}
                      autoFocus
                      className="flex-1"
                      onClick={(e) => e.stopPropagation()} // Prevent navigation during edit
                    />
                  ) : (
                    <span className="flex-1 truncate mr-6">{project.name}</span>
                  )}
                  <SidebarMenuBadge className={contextMenuVisible ? "opacity-0" : ""}>
                    {taskCount}
                  </SidebarMenuBadge>
                </div>
              </SidebarMenuButton>
              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                <ProjectContextMenu
                  projectId={project.id}
                  isVisible={contextMenuVisible}
                  open={isMenuOpen}
                  onOpenChange={handleMenuOpenChange}
                />
              </div>

              {/* Drop indicator below - show when reorder-below instruction */}
              {dragState?.isDraggingOver &&
                dragState.instruction?.type === "reorder-below" &&
                dragState.draggedItemRect && (
                  <SidebarDropIndicator level={isInGroup ? 1 : 0} className="-bottom-1" />
                )}
            </div>
          </SidebarMenuItem>
        </DraggableWrapper>
      </DropTargetWrapper>
    </>
  )
}
