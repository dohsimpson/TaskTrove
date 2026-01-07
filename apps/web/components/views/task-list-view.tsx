"use client"

import { useState } from "react"
import { useAtomValue, useSetAtom } from "jotai"
import { currentViewAtom } from "@tasktrove/atoms/ui/views"
import { currentRouteContextAtom } from "@tasktrove/atoms/ui/navigation"
import { addCommentAtom } from "@tasktrove/atoms/core/tasks"
import type { Task } from "@tasktrove/types/core"
import type { TaskId } from "@tasktrove/types/id"
import { QuickCommentDialog } from "@/components/task/quick-comment-dialog"
import { ProjectSectionsView } from "@/components/task/project-sections-view"
import type { ProjectViewToolbarExtraActions } from "@/components/task/project-view-toolbar"

interface TaskListViewProps {
  supportsSections: boolean
  droppableId: string
  showProjectsAsSections?: boolean
  toolbarExtraActions?: ProjectViewToolbarExtraActions
  showToolbar?: boolean
}

function TaskListView({
  supportsSections,
  droppableId,
  showProjectsAsSections,
  toolbarExtraActions,
  showToolbar,
}: TaskListViewProps) {
  const [commentDialogTask, setCommentDialogTask] = useState<Task | null>(null)
  const addCommentAction = useSetAtom(addCommentAtom)

  const handleAddComment = (taskId: TaskId, content: string) => {
    addCommentAction({ taskId, content })
  }

  return (
    <div className="flex flex-col h-full">
      <ProjectSectionsView
        supportsSections={supportsSections}
        droppableId={droppableId}
        showProjectsAsSections={showProjectsAsSections}
        toolbarExtraActions={toolbarExtraActions}
        showToolbar={showToolbar}
      />

      {commentDialogTask && (
        <QuickCommentDialog
          task={commentDialogTask}
          isOpen={true}
          onClose={() => setCommentDialogTask(null)}
          onAddComment={handleAddComment}
        />
      )}
    </div>
  )
}

export function StandardTaskListView({
  toolbarExtraActions,
  showToolbar = true,
}: {
  toolbarExtraActions?: ProjectViewToolbarExtraActions
  showToolbar?: boolean
} = {}) {
  const currentView = useAtomValue(currentViewAtom)
  const routeContext = useAtomValue(currentRouteContextAtom)

  const supportsSections = routeContext.routeType === "project"
  const showProjectsAsSections = routeContext.routeType === "projectgroup"
  const droppableId = `task-list-${currentView}`

  return (
    <TaskListView
      supportsSections={supportsSections}
      droppableId={droppableId}
      showProjectsAsSections={showProjectsAsSections}
      toolbarExtraActions={toolbarExtraActions}
      showToolbar={showToolbar}
    />
  )
}
