"use client"

import { useAtom, useSetAtom, useAtomValue } from "jotai"
import { EntityContextMenu } from "@/components/ui/custom/entity-context-menu"
import { projects, projectActions, updateProjectAtom, orderingAtom } from "@/lib/atoms"
import { startEditingProjectAtom, openProjectDialogAtom } from "@/lib/atoms/ui/navigation"
import { reorderProjectAtom } from "@/lib/atoms/core/ordering"
import {
  updateProjectGroupAtom,
  ungroupedProjectsAtom,
  findGroupContainingProjectAtom,
} from "@/lib/atoms/core/groups"
import type { Project, ProjectId } from "@/lib/types"

interface ProjectContextMenuProps {
  projectId: ProjectId
  isVisible: boolean
  onDuplicate?: () => void
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function ProjectContextMenu({
  projectId,
  isVisible,
  onDuplicate,
  open,
  onOpenChange,
}: ProjectContextMenuProps) {
  // Get project data and actions from atoms
  const [projectsData] = useAtom(projects)
  const ordering = useAtomValue(orderingAtom)
  const ungroupedProjects = useAtomValue(ungroupedProjectsAtom)
  const findGroupContaining = useAtomValue(findGroupContainingProjectAtom)
  const deleteProject = useSetAtom(projectActions.deleteProject)
  const startEditing = useSetAtom(startEditingProjectAtom)
  const updateProject = useSetAtom(updateProjectAtom)
  const reorderProject = useSetAtom(reorderProjectAtom)
  const updateProjectGroup = useSetAtom(updateProjectGroupAtom)
  const openProjectDialog = useSetAtom(openProjectDialogAtom)

  // Find the project
  const project = projectsData.find((p: Project) => p.id === projectId)
  if (!project) return null

  // Find which group contains this project using the reusable atom
  const containingGroup = findGroupContaining(projectId)

  const handleEdit = () => {
    startEditing(projectId)
  }

  const handleDelete = () => {
    deleteProject(projectId)
  }

  const handleColorChange = (color: string) => {
    updateProject({ projectId, updates: { color } })
  }

  const handleMoveUp = () => {
    if (containingGroup) {
      // Project is in a group - move within the group
      const currentIndex = containingGroup.items.indexOf(projectId)
      if (currentIndex > 0) {
        const newItems = [...containingGroup.items]
        // Swap with previous item
        ;[newItems[currentIndex - 1], newItems[currentIndex]] = [
          newItems[currentIndex],
          newItems[currentIndex - 1],
        ]

        updateProjectGroup({
          id: containingGroup.id,
          items: newItems,
        })
      }
    } else {
      // Project is ungrouped - move within ungrouped projects using global ordering
      const ungroupedProjectIds = ungroupedProjects.map((p) => p.id)
      const currentIndex = ungroupedProjectIds.indexOf(projectId)
      if (currentIndex > 0) {
        // Find the global ordering index of the project we want to swap with
        const targetProjectId = ungroupedProjectIds[currentIndex - 1]
        const globalTargetIndex = ordering.projects.indexOf(targetProjectId)

        // Move to the position of the target project
        reorderProject({ projectId, newIndex: globalTargetIndex })
      }
    }
  }

  const handleMoveDown = () => {
    if (containingGroup) {
      // Project is in a group - move within the group
      const currentIndex = containingGroup.items.indexOf(projectId)
      if (currentIndex >= 0 && currentIndex < containingGroup.items.length - 1) {
        const newItems = [...containingGroup.items]
        // Swap with next item
        ;[newItems[currentIndex], newItems[currentIndex + 1]] = [
          newItems[currentIndex + 1],
          newItems[currentIndex],
        ]

        updateProjectGroup({
          id: containingGroup.id,
          items: newItems,
        })
      }
    } else {
      // Project is ungrouped - move within ungrouped projects using global ordering
      const ungroupedProjectIds = ungroupedProjects.map((p) => p.id)
      const currentIndex = ungroupedProjectIds.indexOf(projectId)
      if (currentIndex >= 0 && currentIndex < ungroupedProjectIds.length - 1) {
        // Find the global ordering index of the project we want to swap with
        const targetProjectId = ungroupedProjectIds[currentIndex + 1]
        const globalTargetIndex = ordering.projects.indexOf(targetProjectId)

        // Move to the position of the target project
        reorderProject({ projectId, newIndex: globalTargetIndex })
      }
    }
  }

  const handleAddAbove = () => {
    // For now, create projects in the default ungrouped state
    // Users can manually move them into groups after creation
    openProjectDialog({ projectId, placement: "above" })
  }

  const handleAddBelow = () => {
    // For now, create projects in the default ungrouped state
    // Users can manually move them into groups after creation
    openProjectDialog({ projectId, placement: "below" })
  }

  return (
    <EntityContextMenu
      id={projectId}
      entityType="project"
      entityName={project.name}
      entityColor={project.color}
      isVisible={isVisible}
      onEdit={handleEdit}
      onDelete={handleDelete}
      onColorChange={handleColorChange}
      onDuplicate={onDuplicate}
      onMoveUp={handleMoveUp}
      onMoveDown={handleMoveDown}
      onAddAbove={handleAddAbove}
      onAddBelow={handleAddBelow}
      open={open}
      onOpenChange={onOpenChange}
    />
  )
}
