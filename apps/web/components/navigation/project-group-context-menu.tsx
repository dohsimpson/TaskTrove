"use client"

import { useAtomValue, useSetAtom } from "jotai"
import { Users } from "lucide-react"
import { EntityContextMenu } from "@/components/ui/custom/entity-context-menu"
import { ComingSoonWrapper } from "@/components/ui/coming-soon-wrapper"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { deleteProjectsAtom } from "@tasktrove/atoms/core/projects"
import {
  projectGroupsAtom,
  updateProjectGroupAtom,
  deleteProjectGroupAtom,
} from "@tasktrove/atoms/core/groups"
import { startEditingGroupAtom } from "@tasktrove/atoms/ui/navigation"
import { createProjectId } from "@tasktrove/types/id"
import type { GroupId } from "@tasktrove/types/id"
import type { ProjectId } from "@tasktrove/types/id"
import { DEFAULT_PROJECT_COLORS } from "@tasktrove/constants"

interface ProjectGroupContextMenuProps {
  groupId: GroupId
  isVisible: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function ProjectGroupContextMenu({
  groupId,
  isVisible,
  open,
  onOpenChange,
}: ProjectGroupContextMenuProps) {
  // Get group data and actions from atoms
  const projectGroups = useAtomValue(projectGroupsAtom)
  const updateProjectGroup = useSetAtom(updateProjectGroupAtom)
  const deleteProjectGroup = useSetAtom(deleteProjectGroupAtom)
  const deleteProjects = useSetAtom(deleteProjectsAtom)
  const startEditing = useSetAtom(startEditingGroupAtom)

  // Find the project group
  const projectGroup = projectGroups.find((group) => group.id === groupId)
  if (!projectGroup) return null

  // Helper function to collect all project IDs from a group (including nested subgroups)
  const collectProjectIdsFromGroup = (group: typeof projectGroup): ProjectId[] => {
    const projectIds: ProjectId[] = []

    for (const item of group.items) {
      if (typeof item === "string") {
        // It's a project ID
        projectIds.push(createProjectId(item))
      } else {
        // It's a nested group, not supported for now
      }
    }

    return projectIds
  }

  const handleEdit = () => {
    startEditing(groupId)
  }

  const handleDelete = async (deleteContainedResources?: boolean) => {
    if (deleteContainedResources) {
      // First, collect and delete all projects in this group
      const projectIds = collectProjectIdsFromGroup(projectGroup)
      if (projectIds.length > 0) {
        await deleteProjects(projectIds)
      }
    }

    // Then delete the group itself
    await deleteProjectGroup(groupId)
  }

  const handleColorChange = (color: string) => {
    updateProjectGroup({
      id: groupId,
      color,
    })
  }

  return (
    <EntityContextMenu
      id={groupId}
      entityType="group"
      entityName={projectGroup.name}
      entityColor={projectGroup.color || DEFAULT_PROJECT_COLORS[0]}
      isVisible={isVisible}
      onEdit={handleEdit}
      onDelete={handleDelete}
      onColorChange={handleColorChange}
      open={open}
      onOpenChange={onOpenChange}
      renderAdditionalMenuItems={() => (
        <ComingSoonWrapper disabled={true} featureName="Group member management" proOnly={true}>
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault()
            }}
          >
            <Users className="h-3 w-3 mr-2" />
            Members
          </DropdownMenuItem>
        </ComingSoonWrapper>
      )}
    />
  )
}
