"use client"

import { useAtomValue, useSetAtom } from "jotai"
import { EntityContextMenu } from "@/components/ui/custom/entity-context-menu"
import {
  projectGroupsAtom,
  updateProjectGroupAtom,
  deleteProjectGroupAtom,
} from "@/lib/atoms/core/groups"
import { startEditingGroupAtom } from "@/lib/atoms/ui/navigation"
import type { GroupId } from "@/lib/types"

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
  const startEditing = useSetAtom(startEditingGroupAtom)

  // Find the project group
  const projectGroup = projectGroups.find((group) => group.id === groupId)
  if (!projectGroup) return null

  const handleEdit = () => {
    startEditing(groupId)
  }

  const handleDelete = () => {
    deleteProjectGroup(groupId)
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
      entityColor={projectGroup.color || "#3b82f6"}
      isVisible={isVisible}
      onEdit={handleEdit}
      onDelete={handleDelete}
      onColorChange={handleColorChange}
      open={open}
      onOpenChange={onOpenChange}
    />
  )
}
