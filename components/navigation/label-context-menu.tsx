"use client"

import { useAtom, useSetAtom, useAtomValue } from "jotai"
import { EntityContextMenu } from "@/components/ui/custom/entity-context-menu"
import { labels, deleteLabel, updateLabelAtom, orderingAtom } from "@/lib/atoms"
import { startEditingLabelAtom, openLabelDialogAtom } from "@/lib/atoms/ui/navigation"
import { reorderLabelAtom } from "@/lib/atoms/core/ordering"
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
  const ordering = useAtomValue(orderingAtom)
  const deleteLabelAction = useSetAtom(deleteLabel)
  const startEditing = useSetAtom(startEditingLabelAtom)
  const updateLabel = useSetAtom(updateLabelAtom)
  const reorderLabel = useSetAtom(reorderLabelAtom)
  const openLabelDialog = useSetAtom(openLabelDialogAtom)

  // Find the label
  const label = labelsData.find((l: Label) => l.id === labelId)
  if (!label) return null

  const handleEdit = () => {
    startEditing(labelId)
  }

  const handleDelete = () => {
    deleteLabelAction(labelId)
  }

  const handleColorChange = (color: string) => {
    updateLabel({ id: labelId, changes: { color } })
  }

  const handleMoveUp = () => {
    const currentIndex = ordering.labels.indexOf(labelId)
    if (currentIndex > 0) {
      reorderLabel({ labelId, newIndex: currentIndex - 1 })
    }
  }

  const handleMoveDown = () => {
    const currentIndex = ordering.labels.indexOf(labelId)
    if (currentIndex >= 0 && currentIndex < ordering.labels.length - 1) {
      reorderLabel({ labelId, newIndex: currentIndex + 1 })
    }
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
      onMoveUp={handleMoveUp}
      onMoveDown={handleMoveDown}
      onAddAbove={handleAddAbove}
      onAddBelow={handleAddBelow}
      open={open}
      onOpenChange={onOpenChange}
    />
  )
}
