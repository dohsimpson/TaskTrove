"use client"

import { useAtom, useSetAtom, useAtomValue } from "jotai"
import { EntityContextMenu } from "@/components/ui/custom/entity-context-menu"
import { projects, projectActions } from "@/lib/atoms"
import {
  startEditingSectionAtom,
  currentRouteContextAtom,
  openSectionDialogAtom,
} from "@/lib/atoms/ui/navigation"
import { DEFAULT_UUID } from "@/lib/constants/defaults"
import { isValidProjectId } from "@/lib/utils/routing"
import type { Project, ProjectSection, SectionId } from "@/lib/types"

interface SectionContextMenuProps {
  sectionId: SectionId
  isVisible: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function SectionContextMenu({
  sectionId,
  isVisible,
  open,
  onOpenChange,
}: SectionContextMenuProps) {
  // Get project data and actions from atoms
  const [projectsData] = useAtom(projects)
  const routeContext = useAtomValue(currentRouteContextAtom)
  const removeSection = useSetAtom(projectActions.removeSection)
  const updateSectionColor = useSetAtom(projectActions.renameSection)
  const moveSection = useSetAtom(projectActions.moveSection)
  const startEditing = useSetAtom(startEditingSectionAtom)
  const openSectionDialog = useSetAtom(openSectionDialogAtom)

  // Get projectId from route context (section must belong to current project)
  // Check if we're in a project context
  if (!isValidProjectId(routeContext.viewId)) {
    return null
  }
  const projectId = routeContext.viewId

  // Find the project and section
  const project = projectsData.find((p: Project) => p.id === projectId)
  const section = project?.sections.find((s: ProjectSection) => s.id === sectionId)
  if (!section) return null

  // Check if this is the default section (not deletable)
  const showDeleteOption = sectionId !== DEFAULT_UUID

  const handleEdit = () => {
    startEditing(sectionId)
  }

  const handleDelete = () => {
    removeSection({ projectId, sectionId })
  }

  const handleColorChange = (color: string) => {
    updateSectionColor({
      projectId,
      sectionId,
      newSectionName: section.name,
      newSectionColor: color,
    })
  }

  const handleMoveUp = () => {
    moveSection({ projectId, sectionId, direction: "up" })
  }

  const handleMoveDown = () => {
    moveSection({ projectId, sectionId, direction: "down" })
  }

  const handleAddAbove = () => {
    openSectionDialog({
      id: sectionId,
      placement: "above",
      projectId,
    })
  }

  const handleAddBelow = () => {
    openSectionDialog({
      id: sectionId,
      placement: "below",
      projectId,
    })
  }

  return (
    <EntityContextMenu
      id={sectionId}
      entityType="section"
      entityName={section.name}
      entityColor={section.color}
      isVisible={isVisible}
      showDeleteOption={showDeleteOption}
      onEdit={handleEdit}
      onDelete={handleDelete}
      onColorChange={handleColorChange}
      onMoveUp={handleMoveUp}
      onMoveDown={handleMoveDown}
      onAddAbove={handleAddAbove}
      onAddBelow={handleAddBelow}
      open={open}
      onOpenChange={onOpenChange}
    />
  )
}
