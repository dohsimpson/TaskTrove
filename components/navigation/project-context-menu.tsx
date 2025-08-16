"use client"

import { useAtom, useSetAtom, useAtomValue } from "jotai"
import { EntityContextMenu } from "@/components/ui/custom/entity-context-menu"
import { projects, projectActions, updateProjectAtom, orderingAtom } from "@/lib/atoms"
import { startEditingProjectAtom, openProjectDialogAtom } from "@/lib/atoms/ui/navigation"
import { reorderProjectAtom } from "@/lib/atoms/core/ordering"
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
  const deleteProject = useSetAtom(projectActions.deleteProject)
  const startEditing = useSetAtom(startEditingProjectAtom)
  const updateProject = useSetAtom(updateProjectAtom)
  const reorderProject = useSetAtom(reorderProjectAtom)
  const openProjectDialog = useSetAtom(openProjectDialogAtom)

  // Find the project
  const project = projectsData.find((p: Project) => p.id === projectId)
  if (!project) return null

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
    const currentIndex = ordering.projects.indexOf(projectId)
    if (currentIndex > 0) {
      reorderProject({ projectId, newIndex: currentIndex - 1 })
    }
  }

  const handleMoveDown = () => {
    const currentIndex = ordering.projects.indexOf(projectId)
    if (currentIndex >= 0 && currentIndex < ordering.projects.length - 1) {
      reorderProject({ projectId, newIndex: currentIndex + 1 })
    }
  }

  const handleAddAbove = () => {
    openProjectDialog({ projectId, placement: "above" })
  }

  const handleAddBelow = () => {
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
