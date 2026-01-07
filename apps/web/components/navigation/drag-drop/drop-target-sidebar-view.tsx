"use client"

import { useAtomValue } from "jotai"
import { DropTargetItem } from "@/components/ui/drag-drop/drop-target-item"
import { taskAtoms } from "@tasktrove/atoms/core/tasks"
import { userAtom } from "@tasktrove/atoms/data/base/atoms"
import { createTaskId } from "@tasktrove/types/id"
import type { DropEventData } from "@/hooks/use-sidebar-view-drop"
import { getSidebarViewDropUpdate, type SidebarViewDropId } from "@/lib/sidebar-view-drop-logic"

interface DropTargetSidebarViewProps {
  viewId: SidebarViewDropId
  children: React.ReactNode
  onDrop: (args: DropEventData) => void
}

/**
 * Sidebar-specific drop target wrapper for standard views.
 * Accepts task drops to update task metadata based on the view.
 */
export function DropTargetSidebarView({ viewId, children, onDrop }: DropTargetSidebarViewProps) {
  const taskById = useAtomValue(taskAtoms.derived.taskById)
  const currentUserId = useAtomValue(userAtom).id

  return (
    <DropTargetItem
      id={`sidebar-view-${viewId}`}
      mode="group"
      className="w-full"
      indicatorClassName="w-full flex-none"
      getData={() => ({
        type: "sidebar-view-drop-target",
        viewId,
      })}
      canDrop={(sourceData) => {
        if (sourceData.type !== "list-item" || !Array.isArray(sourceData.ids)) {
          return false
        }

        const now = new Date()

        return sourceData.ids.some((id) => {
          if (typeof id !== "string") {
            return false
          }

          const taskId = createTaskId(id)
          const task = taskById.get(taskId)
          return getSidebarViewDropUpdate(taskId, task, viewId, now, currentUserId) !== null
        })
      }}
      onDrop={onDrop}
    >
      {children}
    </DropTargetItem>
  )
}
