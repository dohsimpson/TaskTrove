import { useSetAtom } from "jotai"
import {
  openQuickAddAtom,
  updateQuickAddTaskAtom,
  resetQuickAddTaskAtom,
} from "@/lib/atoms/ui/dialogs"
import { ProjectIdSchema, createGroupId, GroupIdSchema } from "@/lib/types"
import type { ProjectId, GroupId } from "@/lib/types"
import { DEFAULT_UUID } from "@tasktrove/constants"

/**
 * Hook that provides a function to add a task to a specific section.
 * Opens the quick add dialog with the project and section pre-filled.
 */
export function useAddTaskToSection() {
  const openQuickAdd = useSetAtom(openQuickAddAtom)
  const updateQuickAddTask = useSetAtom(updateQuickAddTaskAtom)
  const resetQuickAddTask = useSetAtom(resetQuickAddTaskAtom)

  return (projectId: ProjectId | undefined, sectionId: string | GroupId) => {
    // Reset the quick add task form first
    resetQuickAddTask()

    // Parse and validate section ID
    let parsedSectionId: GroupId | undefined
    if (sectionId && sectionId !== DEFAULT_UUID) {
      try {
        parsedSectionId =
          typeof sectionId === "string" ? createGroupId(sectionId) : GroupIdSchema.parse(sectionId)
      } catch (error) {
        console.warn("Invalid section ID provided:", sectionId, error)
        parsedSectionId = undefined
      }
    }

    // Pre-fill with project and section data
    updateQuickAddTask({
      updateRequest: {
        projectId: projectId ? ProjectIdSchema.parse(projectId) : undefined,
        sectionId: parsedSectionId,
      },
    })

    // Open the quick add dialog
    openQuickAdd()
  }
}
