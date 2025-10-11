import { BaseDialog } from "./base-dialog"
import { showLabelDialogAtom, labelDialogContextAtom } from "@tasktrove/atoms"
import { closeLabelDialogAtom } from "@tasktrove/atoms"
import { addLabelAtom } from "@tasktrove/atoms"
import { createLabelId } from "@/lib/types"

export function LabelDialog() {
  return (
    <BaseDialog
      type="label"
      showAtom={showLabelDialogAtom}
      contextAtom={labelDialogContextAtom}
      closeAtom={closeLabelDialogAtom}
      addAtom={addLabelAtom}
      transformData={(name, color, description, context) => ({
        name: name.trim(),
        color,
        insertPosition:
          context.insertPosition?.id && context.insertPosition.placement
            ? {
                id: createLabelId(context.insertPosition.id),
                placement: context.insertPosition.placement,
              }
            : undefined,
      })}
    />
  )
}
