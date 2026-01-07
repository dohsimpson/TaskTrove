"use client"

import { StandardTaskListView } from "@/components/views/task-list-view"
import type { ProjectViewToolbarExtraActions } from "@/components/task/project-view-toolbar"

export function TodayView({
  toolbarExtraActions,
  showToolbar = true,
}: {
  toolbarExtraActions?: ProjectViewToolbarExtraActions
  showToolbar?: boolean
} = {}) {
  return (
    <StandardTaskListView toolbarExtraActions={toolbarExtraActions} showToolbar={showToolbar} />
  )
}
