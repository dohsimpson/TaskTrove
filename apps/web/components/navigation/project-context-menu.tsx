"use client"

import { useAtom, useSetAtom, useAtomValue } from "jotai"
import { EntityContextMenu } from "@/components/ui/custom/entity-context-menu"
import { projectsAtom, tasksAtom } from "@tasktrove/atoms/data/base/atoms"
import { projectAtoms, updateProjectAtom } from "@tasktrove/atoms/core/projects"
import { updateTasksAtom, deleteTasksAtom } from "@tasktrove/atoms/core/tasks"
import { startEditingProjectAtom, openProjectDialogAtom } from "@tasktrove/atoms/ui/navigation"
import type { Project } from "@tasktrove/types/core"
import type { ProjectId, TaskId } from "@tasktrove/types/id"

interface ProjectContextMenuProps {
  projectId: ProjectId
  isVisible: boolean
  onDuplicate?: () => void
  open?: boolean
  onOpenChange?: (open: boolean) => void
  renderAdditionalMenuItems?: () => React.ReactNode
}

export function ProjectContextMenu({
  projectId,
  isVisible,
  onDuplicate,
  open,
  onOpenChange,
  renderAdditionalMenuItems,
}: ProjectContextMenuProps) {
  // Get project data and actions from atoms
  const [projectsData] = useAtom(projectsAtom)
  const tasksData = useAtomValue(tasksAtom)
  const deleteProject = useSetAtom(projectAtoms.actions.deleteProject)
  const deleteTasks = useSetAtom(deleteTasksAtom)
  const updateTasks = useSetAtom(updateTasksAtom)
  const startEditing = useSetAtom(startEditingProjectAtom)
  const updateProject = useSetAtom(updateProjectAtom)
  const openProjectDialog = useSetAtom(openProjectDialogAtom)

  // Find the project
  const project = projectsData.find((p: Project) => p.id === projectId)
  if (!project) return null

  // Helper function to collect all task IDs from a project
  const collectTaskIdsFromProject = (project: Project): TaskId[] => {
    return tasksData.filter((task) => task.projectId === project.id).map((task) => task.id)
  }

  const handleEdit = () => {
    startEditing(projectId)
  }

  const handleDelete = async (deleteContainedResources?: boolean) => {
    const taskIds = collectTaskIdsFromProject(project)

    if (deleteContainedResources) {
      // Delete all tasks in this project first
      if (taskIds.length > 0) {
        await deleteTasks(taskIds)
      }
    } else {
      // Remove projectId from all tasks (unassign them) by setting projectId to null
      if (taskIds.length > 0) {
        const updates = taskIds.map((id) => ({ id, projectId: null }))
        await updateTasks(updates)
      }
    }

    // Then delete the project itself
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
      renderAdditionalMenuItems={renderAdditionalMenuItems}
    />
  )
}
