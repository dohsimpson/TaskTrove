"use client"

import { useState } from "react"
import { useAtomValue, useSetAtom } from "jotai"
import { useRouter } from "next/navigation"
import { Folder } from "lucide-react"
import {
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuBadge,
} from "@/components/ui/custom/sidebar"
import { EditableDiv } from "@/components/ui/custom/editable-div"
import { ProjectContextMenu } from "@/components/navigation/project-context-menu"
import { useContextMenuVisibility } from "@/hooks/use-context-menu-visibility"
import { useSidebarDragDrop } from "@/hooks/use-sidebar-drag-drop"
import { DraggableSidebarProject, DropTargetSidebarProject } from "./drag-drop"
import { SharedBadge } from "@/components/navigation/shared-badge"
import {
  pathnameAtom,
  editingProjectIdAtom,
  stopEditingProjectAtom,
} from "@tasktrove/atoms/ui/navigation"
import { projectTaskCountsAtom } from "@tasktrove/atoms/ui/task-counts"
import { projectAtoms } from "@tasktrove/atoms/core/projects"
import type { Project } from "@tasktrove/types/core"
import type { GroupId } from "@tasktrove/types/id"
import { cn } from "@/lib/utils"

interface DraggableProjectItemProps {
  project: Project
  index: number
  isInGroup?: boolean
  groupId?: GroupId
  enableDragDrop?: boolean
}

/**
 * Project item for sidebar navigation.
 * Supports optional drag-and-drop functionality for standalone projects.
 * For projects in groups, drag-drop is typically disabled.
 */
export function DraggableProjectItem({
  project,
  index,
  isInGroup = false,
  groupId,
  enableDragDrop = true,
}: DraggableProjectItemProps) {
  const [isHovered, setIsHovered] = useState(false)
  const router = useRouter()

  // State and actions
  const pathname = useAtomValue(pathnameAtom)
  const projectTaskCounts = useAtomValue(projectTaskCountsAtom)
  const editingProjectId = useAtomValue(editingProjectIdAtom)
  const stopEditing = useSetAtom(stopEditingProjectAtom)
  const updateProject = useSetAtom(projectAtoms.actions.updateProject)

  // Drag and drop
  const { handleDrop } = useSidebarDragDrop()

  // Computed values
  const isActive = pathname === `/projects/${project.slug}`
  const taskCount = projectTaskCounts[project.id] || 0
  const isEditing = editingProjectId === project.id

  // Context menu visibility
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

  const content = (
    <SidebarMenuItem>
      <div
        className="relative group w-full"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <SidebarMenuButton
          asChild={false}
          isActive={isActive}
          onClick={(e) => {
            if (!isEditing && !e.defaultPrevented) {
              router.push(`/projects/${project.slug}`)
            }
          }}
          className={cn(
            "cursor-pointer",
            isInGroup ? "ml-6 w-[calc(100%-calc(var(--spacing)*6))]" : "w-full",
          )}
        >
          <div className="flex items-center gap-2 w-full">
            <Folder className="h-4 w-4" style={{ color: project.color }} />
            {isEditing ? (
              <EditableDiv
                as="span"
                value={project.name}
                onChange={handleProjectNameChange}
                onCancel={stopEditing}
                autoFocus
                className="flex-1"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span className="flex-1 truncate mr-6">{project.name}</span>
            )}
            <SharedBadge project={project} />
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
      </div>
    </SidebarMenuItem>
  )

  if (!enableDragDrop) {
    return content
  }

  return (
    <DropTargetSidebarProject
      projectId={project.id}
      index={index}
      groupId={groupId}
      onDrop={handleDrop}
    >
      <DraggableSidebarProject projectId={project.id} index={index} groupId={groupId}>
        {content}
      </DraggableSidebarProject>
    </DropTargetSidebarProject>
  )
}
