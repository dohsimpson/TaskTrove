"use client"

import { useAtom, useSetAtom } from "jotai"
import { EntityContextMenu } from "@/components/ui/custom/entity-context-menu"
import { labels, deleteLabel, updateLabelAtom } from "@/lib/atoms"
import { startEditingLabelAtom, openLabelDialogAtom } from "@/lib/atoms/ui/navigation"
import type { Label, LabelId } from "@/lib/types"

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
  const [labelsData] = useAtom(labels)
  const deleteLabelAction = useSetAtom(deleteLabel)
  const startEditing = useSetAtom(startEditingLabelAtom)
  const updateLabel = useSetAtom(updateLabelAtom)
  const openLabelDialog = useSetAtom(openLabelDialogAtom)

  // Find the label
  const label = labelsData.find((l: Label) => l.id === labelId)
  if (!label) return null

  const handleEdit = () => {
    startEditing(labelId)
  }

  const handleDelete = (deleteContainedResources?: boolean) => {
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
