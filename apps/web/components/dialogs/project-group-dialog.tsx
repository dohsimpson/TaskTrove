"use client"

import { atom, useAtomValue } from "jotai"
import { BaseDialog } from "./base-dialog"
import { showProjectGroupDialogAtom, projectGroupDialogContextAtom } from "@tasktrove/atoms"
import { closeProjectGroupDialogAtom } from "@tasktrove/atoms"
import { addProjectGroupAtom, flattenProjectGroupsAtom } from "@tasktrove/atoms"
import { createGroupId } from "@/lib/types"

// Wrapper atom to match BaseDialog's expected Promise<void> return type
const addProjectGroupVoidAtom = atom(
  null,
  async (
    get,
    set,
    groupData: {
      name: string
      description?: string
      color?: string
      parentId?: ReturnType<typeof createGroupId>
    },
  ) => {
    await set(addProjectGroupAtom, groupData)
  },
)

export function ProjectGroupDialog() {
  // Get all existing project groups for parent selection
  const flatProjectGroups = useAtomValue(flattenProjectGroupsAtom)

  // Transform flat groups into parent picker options
  const parentPickerOptions = flatProjectGroups.map((group) => ({
    id: group.id,
    name: group.name,
    color: group.color,
  }))

  return (
    <BaseDialog
      type="projectGroup"
      showAtom={showProjectGroupDialogAtom}
      contextAtom={projectGroupDialogContextAtom}
      closeAtom={closeProjectGroupDialogAtom}
      addAtom={addProjectGroupVoidAtom}
      showDescription={true}
      showParentPicker={true}
      parentPickerOptions={parentPickerOptions}
      parentPickerLabel="Parent Group"
      transformData={(name, color, description, context) => ({
        name: name.trim(),
        description: description.trim() || undefined,
        color,
        parentId: context.parentId ? createGroupId(context.parentId) : undefined, // undefined for root level
      })}
    />
  )
}
