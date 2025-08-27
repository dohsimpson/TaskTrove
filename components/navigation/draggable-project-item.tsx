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
import {
  extractSidebarInstruction,
  executeSidebarInstruction,
} from "@/hooks/use-sidebar-drag-state"
import {
  pathnameAtom,
  editingProjectIdAtom,
  stopEditingProjectAtom,
} from "@/lib/atoms/ui/navigation"
import { projectTaskCountsAtom, projectActions } from "@/lib/atoms"
import {
  extractClosestEdge,
  attachClosestEdge,
} from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge"
import type { Input as DragInputType } from "@atlaskit/pragmatic-drag-and-drop/types"
import type { Project, GroupId } from "@/lib/types"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

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
    closestEdge?: "top" | "bottom"
  } | null>(null)

  // State and actions
  const router = useRouter()
  const pathname = useAtomValue(pathnameAtom)
  const projectTaskCounts = useAtomValue(projectTaskCountsAtom)
  const editingProjectId = useAtomValue(editingProjectIdAtom)
  const stopEditing = useSetAtom(stopEditingProjectAtom)
  const updateProject = useSetAtom(projectActions.updateProject)

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
  const handleDrop = ({
    source,
    location,
  }: {
    source: { data: Record<string, unknown> }
    location: { current: { dropTargets: Array<{ data: Record<string, unknown> }> } }
  }) => {
    console.log("🎯 Drop on project:", { source: source.data, location })

    const sourceData = source.data
    const dropTargetData = location.current.dropTargets[0]?.data

    if (!sourceData || !dropTargetData) return

    // Extract closest edge and instruction following official pattern
    const closestEdge = extractClosestEdge(dropTargetData)
    const instruction = extractSidebarInstruction(sourceData, dropTargetData, closestEdge)

    console.log("📍 Extracted instruction:", instruction)

    // Execute the instruction
    executeSidebarInstruction(instruction)

    setDragState(null)
  }

  const handleDragEnter = ({ source }: { source: { data: Record<string, unknown> } }) => {
    if (source.data.type === "sidebar-project" && source.data.projectId !== project.id) {
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
    if (source.data.type === "sidebar-project" && source.data.projectId !== project.id) {
      // Only show indicator if THIS element is the innermost target (following official pattern)
      const innerMost = location.current.dropTargets[0]
      const isInnermostTarget =
        innerMost?.data.type === "sidebar-project-drop-target" &&
        innerMost?.data.projectId === project.id

      if (isInnermostTarget) {
        const closestEdge = extractClosestEdge(innerMost?.data)
        setDragState((prev) =>
          prev
            ? {
                ...prev,
                closestEdge:
                  closestEdge === "top" || closestEdge === "bottom" ? closestEdge : undefined,
              }
            : null,
        )
      } else {
        // Clear indicator if not innermost target
        setDragState((prev) => (prev ? { ...prev, closestEdge: undefined } : null))
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
          // Only use attachClosestEdge if we have proper input and element
          if (args?.input && args?.element) {
            return attachClosestEdge(baseData, {
              element: args.element,
              input: args.input,
              allowedEdges: ["top", "bottom"],
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
              {/* Drop indicator above - absolutely positioned to avoid layout shift */}
              {dragState?.isDraggingOver &&
                dragState?.closestEdge === "top" &&
                dragState?.draggedItemRect && (
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
                  "w-full cursor-pointer",
                  isInGroup && "ml-6", // Add indentation for projects in groups
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
                    <span className="flex-1 truncate">{project.name}</span>
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

              {/* Drop indicator below - absolutely positioned to avoid layout shift */}
              {dragState?.isDraggingOver &&
                dragState?.closestEdge === "bottom" &&
                dragState?.draggedItemRect && (
                  <SidebarDropIndicator level={isInGroup ? 1 : 0} className="-bottom-1" />
                )}
            </div>
          </SidebarMenuItem>
        </DraggableWrapper>
      </DropTargetWrapper>
    </>
  )
}
