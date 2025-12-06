import { useSetAtom } from "jotai"
import { openQuickAddAtom } from "@tasktrove/atoms/ui/navigation"
import { updateQuickAddTaskAtom, resetQuickAddTaskAtom } from "@tasktrove/atoms/ui/dialogs"
import { ProjectIdSchema, createGroupId, GroupIdSchema } from "@tasktrove/types/id"
import type { ProjectId, GroupId } from "@tasktrove/types/id"

/**
 * Hook that provides a function to add a task to a specific section.
 * Opens the quick add dialog with the project and section pre-filled.
 */
export function useAddTaskToSection() {
  const openQuickAdd = useSetAtom(openQuickAddAtom)
  const updateQuickAddTask = useSetAtom(updateQuickAddTaskAtom)
  const resetQuickAddTask = useSetAtom(resetQuickAddTaskAtom)

  return (projectId: ProjectId | undefined, sectionId: string | GroupId | undefined) => {
    // Reset the quick add task form first
    resetQuickAddTask()

    // Parse and validate section ID if provided
    let parsedSectionId: GroupId | undefined
    if (sectionId) {
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
