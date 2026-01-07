"use client"

import { useAtom, useSetAtom, useAtomValue } from "jotai"
import { EntityContextMenu } from "@/components/ui/custom/entity-context-menu"
import { projectsAtom } from "@tasktrove/atoms/data/base/atoms"
import { projectAtoms } from "@tasktrove/atoms/core/projects"
import {
  startEditingSectionAtom,
  currentRouteContextAtom,
  openSectionDialogAtom,
} from "@tasktrove/atoms/ui/navigation"
import { isValidProjectId } from "@/lib/utils/routing"
import type { Project, ProjectSection } from "@tasktrove/types/core"
import type { GroupId } from "@tasktrove/types/id"
import { getDefaultSectionId } from "@tasktrove/types/defaults"
import { FALLBACK_COLOR } from "@tasktrove/constants"

interface SectionContextMenuProps {
  sectionId: GroupId
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
  const [projectsData] = useAtom(projectsAtom)
  const routeContext = useAtomValue(currentRouteContextAtom)
  const removeSection = useSetAtom(projectAtoms.actions.removeSection)
  const updateSectionColor = useSetAtom(projectAtoms.actions.renameSection)
  const moveSection = useSetAtom(projectAtoms.actions.moveSection)
  const setDefaultSection = useSetAtom(projectAtoms.actions.setDefaultSection)
  const startEditing = useSetAtom(startEditingSectionAtom)
  const openSectionDialog = useSetAtom(openSectionDialogAtom)

  // Get projectId from route context (section must belong to current project)
  // Check if we're in a project context; fall back to locating by section if route isn't project-scoped
  const projectId =
    (isValidProjectId(routeContext.viewId) ? routeContext.viewId : null) ??
    projectsData.find((project: Project) =>
      project.sections.some((s: ProjectSection) => s.id === sectionId),
    )?.id

  if (!projectId) {
    return null
  }

  // Find the project and section
  const project = projectsData.find((p: Project) => p.id === projectId)
  const section = project?.sections.find((s: ProjectSection) => s.id === sectionId)
  if (!section) return null

  // Check if this is the default section (not deletable, can't be set as default again)
  const defaultSectionId = project ? getDefaultSectionId(project) : null
  const isDefaultSection = sectionId === defaultSectionId
  const showDeleteOption = !isDefaultSection
  const showSetAsDefaultOption = !isDefaultSection

  const handleEdit = () => {
    startEditing(sectionId)
  }

  const handleDelete = (deleteContainedResources?: boolean) => {
    removeSection({
      projectId,
      sectionId,
      deleteTasks: deleteContainedResources === true,
    })
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

  const handleSetAsDefault = () => {
    setDefaultSection({ projectId, sectionId })
  }

  return (
    <EntityContextMenu
      id={sectionId}
      entityType="section"
      entityName={section.name}
      entityColor={section.color || FALLBACK_COLOR}
      isVisible={isVisible}
      showDeleteOption={showDeleteOption}
      showSetAsDefaultOption={showSetAsDefaultOption}
      onEdit={handleEdit}
      onDelete={handleDelete}
      onColorChange={handleColorChange}
      onMoveUp={handleMoveUp}
      onMoveDown={handleMoveDown}
      onAddAbove={handleAddAbove}
      onAddBelow={handleAddBelow}
      onSetAsDefault={handleSetAsDefault}
      open={open}
      onOpenChange={onOpenChange}
    />
  )
}
