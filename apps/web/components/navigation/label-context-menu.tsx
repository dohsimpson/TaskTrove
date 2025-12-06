"use client"

import { useAtom, useSetAtom } from "jotai"
import { EntityContextMenu } from "@/components/ui/custom/entity-context-menu"
import { labelsAtom } from "@tasktrove/atoms/data/base/atoms"
import { deleteLabelAtom, updateLabelAtom } from "@tasktrove/atoms/core/labels"
import { startEditingLabelAtom, openLabelDialogAtom } from "@tasktrove/atoms/ui/navigation"
import type { Label } from "@tasktrove/types/core"
import type { LabelId } from "@tasktrove/types/id"

interface LabelContextMenuProps {
  labelId: LabelId
  isVisible: boolean
  onDuplicate?: () => void
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function LabelContextMenu({
  labelId,
  isVisible,
  onDuplicate,
  open,
  onOpenChange,
}: LabelContextMenuProps) {
  // Get label data and actions from atoms
  const [labelsData] = useAtom(labelsAtom)
  const deleteLabelAction = useSetAtom(deleteLabelAtom)
  const startEditing = useSetAtom(startEditingLabelAtom)
  const updateLabel = useSetAtom(updateLabelAtom)
  const openLabelDialog = useSetAtom(openLabelDialogAtom)

  // Find the label
  const label = labelsData.find((l: Label) => l.id === labelId)
  if (!label) return null

  const handleEdit = () => {
    startEditing(labelId)
  }

  const handleDelete = () => {
    // For labels, deleteContainedResources doesn't apply (labels don't contain other resources)
    deleteLabelAction(labelId)
  }

  const handleColorChange = (color: string) => {
    updateLabel({ id: labelId, changes: { color } })
  }

  const handleAddAbove = () => {
    openLabelDialog({ id: labelId, placement: "above" })
  }

  const handleAddBelow = () => {
    openLabelDialog({ id: labelId, placement: "below" })
  }

  return (
    <EntityContextMenu
      id={labelId}
      entityType="label"
      entityName={label.name}
      entityColor={label.color}
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
