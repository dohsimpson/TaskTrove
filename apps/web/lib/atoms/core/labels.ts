// Re-export from @tasktrove/atoms package
export * from "@tasktrove/atoms/labels"

// Compatibility exports for existing component imports
import { labelsAtom, deleteLabelAtom, updateLabelAtom } from "@tasktrove/atoms/labels"
export const labels = labelsAtom // labels → labelsAtom
export const deleteLabel = deleteLabelAtom // deleteLabel → deleteLabelAtom
export const updateLabel = updateLabelAtom // updateLabel → updateLabelAtom
