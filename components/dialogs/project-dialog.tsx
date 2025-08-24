import { BaseDialog } from "./base-dialog"
import { showProjectDialogAtom, projectDialogContextAtom } from "@/lib/atoms/ui/dialogs"
import { closeProjectDialogAtom } from "@/lib/atoms/ui/navigation"
import { addProjectAtom } from "@/lib/atoms/core/projects"
import { createProjectId } from "@/lib/types"

export function ProjectDialog() {
  return (
    <BaseDialog
      type="project"
      showAtom={showProjectDialogAtom}
      contextAtom={projectDialogContextAtom}
      closeAtom={closeProjectDialogAtom}
      addAtom={addProjectAtom}
      transformData={(name, color, description, context) => ({
        name: name.trim(),
        color,
        insertPosition:
          context.insertPosition?.id && context.insertPosition?.placement
            ? {
                id: createProjectId(context.insertPosition.id),
                placement: context.insertPosition.placement,
              }
            : undefined,
      })}
    />
  )
}
