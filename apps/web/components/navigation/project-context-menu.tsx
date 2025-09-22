"use client"

import { useAtom, useSetAtom } from "jotai"
import { EntityContextMenu } from "@/components/ui/custom/entity-context-menu"
import { projects, projectActions, updateProjectAtom } from "@/lib/atoms"
import { startEditingProjectAtom, openProjectDialogAtom } from "@/lib/atoms/ui/navigation"
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
  const deleteProject = useSetAtom(projectActions.deleteProject)
  const startEditing = useSetAtom(startEditingProjectAtom)
  const updateProject = useSetAtom(updateProjectAtom)
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
      onAddAbove={handleAddAbove}
      onAddBelow={handleAddBelow}
      open={open}
      onOpenChange={onOpenChange}
    />
  )
}
