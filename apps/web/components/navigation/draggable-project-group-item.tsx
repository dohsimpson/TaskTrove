"use client"

import { useState } from "react"
import { useAtomValue, useSetAtom } from "jotai"
import { useRouter } from "next/navigation"
import { ChevronDown, ChevronRight, FolderOpen, Folders } from "lucide-react"
import {
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuBadge,
} from "@/components/ui/custom/sidebar"
import { EditableDiv } from "@/components/ui/custom/editable-div"
import { useContextMenuVisibility } from "@/hooks/use-context-menu-visibility"
import { useSidebarDragDrop } from "@/hooks/use-sidebar-drag-drop"
import { ProjectGroupContextMenu } from "./project-group-context-menu"
import { DraggableProjectItem } from "@/components/navigation/draggable-project-item"
import { DraggableSidebarGroup, DropTargetSidebarGroup } from "./drag-drop"
import { projectTaskCountsAtom } from "@tasktrove/atoms/ui/task-counts"
import {
  editingGroupIdAtom,
  stopEditingGroupAtom,
  pathnameAtom,
} from "@tasktrove/atoms/ui/navigation"
import { updateProjectGroupAtom } from "@tasktrove/atoms/core/groups"
import type { ProjectGroup } from "@tasktrove/types/group"
import type { ProjectId } from "@tasktrove/types/id"
import type { Project } from "@tasktrove/types/core"
import { cn } from "@/lib/utils"

interface DraggableProjectGroupItemProps {
  group: ProjectGroup
  projects: Project[]
  index: number
}

/**
 * Draggable project group item for sidebar navigation.
 * Follows the golden path: uses shared drag-drop components with specialized wrappers.
 */
export function DraggableProjectGroupItem({
  group,
  projects,
  index,
}: DraggableProjectGroupItemProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [isHovered, setIsHovered] = useState(false)
  const router = useRouter()

  // State
  const pathname = useAtomValue(pathnameAtom)
  const projectTaskCounts = useAtomValue(projectTaskCountsAtom)
  const editingGroupId = useAtomValue(editingGroupIdAtom)
  const stopEditing = useSetAtom(stopEditingGroupAtom)
  const updateProjectGroup = useSetAtom(updateProjectGroupAtom)

  // Drag and drop
  const { handleDrop } = useSidebarDragDrop()

  // Context menu visibility
  const {
    isVisible: contextMenuVisible,
    isMenuOpen,
    handleMenuOpenChange,
  } = useContextMenuVisibility(isHovered)

  // Computed values
  const isEditing = editingGroupId === group.id
  const isActive = pathname === `/projectgroups/${group.slug}`

  // Calculate total task count for projects in this group
  const calculateGroupTaskCount = (groupItems: ProjectGroup["items"]): number => {
    let count = 0
    for (const item of groupItems) {
      if (typeof item === "string") {
        count += projectTaskCounts[item] || 0
      }
    }
    return count
  }

  const taskCount = calculateGroupTaskCount(group.items)

  // Get only project IDs from items (ignore nested groups)
  const projectIds = group.items.filter((item): item is ProjectId => typeof item === "string")

  // Find actual project objects for this group's direct projects
  const groupProjects = projectIds
    .map((projectId) => projects.find((p) => p.id === projectId))
    .filter((p): p is Project => !!p)

  const handleSave = (newName: string) => {
    if (newName.trim() && newName !== group.name) {
      updateProjectGroup({ id: group.id, name: newName.trim() })
    }
    stopEditing()
  }

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded)
  }

  const handleGroupClick = (e: React.MouseEvent) => {
    const target = e.target
    const isChevronClick = target instanceof Element && target.closest("[data-chevron]") !== null

    if (isChevronClick) {
      toggleExpanded()
    } else if (!isEditing) {
      router.push(`/projectgroups/${group.slug}`)
    }
  }

  return (
    <>
      {/* Group header with drag and drop */}
      <DropTargetSidebarGroup groupId={group.id} index={index} onDrop={handleDrop}>
        <DraggableSidebarGroup groupId={group.id} index={index} projectCount={groupProjects.length}>
          <SidebarMenuItem>
            <div
              className="relative group w-full"
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
            >
              <SidebarMenuButton
                asChild={false}
                isActive={isActive}
                onClick={handleGroupClick}
                className="w-full cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2 w-full">
                  {/* Chevron for expand/collapse */}
                  <span className="flex-shrink-0" data-chevron>
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
                      <Folders className="h-4 w-4" style={{ color: group.color }} />
                    )}
                  </span>

                  {/* Group name */}
                  {isEditing ? (
                    <EditableDiv
                      as="span"
                      value={group.name}
                      onChange={handleSave}
                      onCancel={stopEditing}
                      autoFocus
                      className="flex-1 mr-6"
                    />
                  ) : (
                    <span className="flex-1 truncate mr-6">{group.name}</span>
                  )}

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
        </DraggableSidebarGroup>
      </DropTargetSidebarGroup>

      {/* Group contents (when expanded) */}
      {isExpanded && (
        <>
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
