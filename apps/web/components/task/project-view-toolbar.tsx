"use client"

import { useSetAtom, useAtomValue } from "jotai"
import { Button } from "@/components/ui/button"
import { Plus, FolderPlus } from "lucide-react"
import { useTranslation } from "@tasktrove/i18n"
import { TaskFilterControls } from "./task-filter-controls"
import { TaskFilterBadges } from "./task-filter-badges"
import { TaskSearchInput } from "./task-search-input"
import {
  openQuickAddAtom,
  openSectionDialogAtom,
  currentRouteContextAtom,
} from "@tasktrove/atoms/ui/navigation"
import { selectedTasksAtom } from "@tasktrove/atoms/ui/selection"
import { isValidProjectId } from "@/lib/utils/routing"
import { createProjectId } from "@/lib/types"
import { cn } from "@/lib/utils"

interface ProjectViewToolbarProps {
  className?: string
}

/**
 * Unified toolbar component for project views containing filter controls, search input, add section button, and add task button.
 * Used across different view types (kanban, project sections, etc.) for consistent UI.
 */
export function ProjectViewToolbar({ className }: ProjectViewToolbarProps) {
  const { t } = useTranslation("task")
  const openQuickAddAction = useSetAtom(openQuickAddAtom)
  const openSectionDialog = useSetAtom(openSectionDialogAtom)
  const routeContext = useAtomValue(currentRouteContextAtom)
  const selectedTaskIds = useAtomValue(selectedTasksAtom)

  // Check if we're in a project context to show Add Section button
  const isProjectContext = isValidProjectId(routeContext.viewId)
  const projectId = isProjectContext ? createProjectId(routeContext.viewId) : undefined

  // Adjust sticky position based on whether SelectionToolbar is visible
  const hasSelection = selectedTaskIds.length > 0

  const handleAddSection = () => {
    if (projectId) {
      openSectionDialog({ projectId })
    }
  }

  return (
    <div
      className={cn(
        "sticky z-10 bg-background py-3",
        hasSelection ? "top-14 pt-0" : "top-0",
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <TaskFilterControls />
        <TaskSearchInput />
        {isProjectContext && (
          <Button
            onClick={handleAddSection}
            variant="outline"
            size="sm"
            className="shadow-sm shrink-0 ml-auto"
          >
            <FolderPlus className="h-4 w-4 mr-1.5" />
            {t("actions.addSection", "Add Section")}
          </Button>
        )}
        <Button
          onClick={() => openQuickAddAction()}
          variant="default"
          size="sm"
          className={`shadow-sm shrink-0 ${!isProjectContext ? "ml-auto" : ""}`}
        >
          <Plus className="h-4 w-4 mr-1.5" />
          {t("actions.addTask", "Add Task")}
        </Button>
      </div>
      <TaskFilterBadges />
    </div>
  )
}
