import { BaseDialog } from "./base-dialog"
import { showSectionDialogAtom, sectionDialogContextAtom } from "@/lib/atoms/ui/dialogs"
import { closeSectionDialogAtom } from "@/lib/atoms/ui/navigation"
import { addProjectSectionAtPositionAtom } from "@/lib/atoms/core/projects"
import { createProjectId, createGroupId } from "@/lib/types"

export function SectionDialog() {
  return (
    <BaseDialog
      type="section"
      showAtom={showSectionDialogAtom}
      contextAtom={sectionDialogContextAtom}
      closeAtom={closeSectionDialogAtom}
      addAtom={addProjectSectionAtPositionAtom}
      customValidation={(name, description, context) =>
        !!name.trim() && !!context.insertPosition?.projectId
      }
      transformData={(name, color, description, context) => {
        if (!context.insertPosition?.projectId) {
          throw new Error("Project ID is required for sections")
        }
        return {
          projectId: createProjectId(context.insertPosition.projectId),
          sectionName: name.trim(),
          color,
          insertPosition:
            context.insertPosition.id && context.insertPosition.placement
              ? {
                  id: createGroupId(context.insertPosition.id),
                  placement: context.insertPosition.placement,
                }
              : undefined,
        }
      }}
    />
  )
}
