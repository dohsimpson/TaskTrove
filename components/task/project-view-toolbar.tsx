"use client"

import { useSetAtom } from "jotai"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { useLanguage } from "@/components/providers/language-provider"
import { useTranslation } from "@/lib/i18n/client"
import { TaskFilterControls } from "./task-filter-controls"
import { TaskFilterBadges } from "./task-filter-badges"
import { TaskSearchInput } from "./task-search-input"
import { openQuickAddAtom } from "@/lib/atoms"

interface ProjectViewToolbarProps {
  className?: string
}

/**
 * Unified toolbar component for project views containing filter controls, search input, and add task button.
 * Used across different view types (kanban, project sections, etc.) for consistent UI.
 */
export function ProjectViewToolbar({ className }: ProjectViewToolbarProps) {
  const { language } = useLanguage()
  const { t } = useTranslation(language, "task")
  const openQuickAddAction = useSetAtom(openQuickAddAtom)

  return (
    <div className={className}>
      <div className="flex items-center gap-2">
        <TaskFilterControls />
        <TaskSearchInput />
        <Button
          onClick={() => openQuickAddAction()}
          variant="default"
          size="sm"
          className="shadow-sm shrink-0 ml-auto"
        >
          <Plus className="h-4 w-4 mr-1.5" />
          {t("actions.addTask", "Add Task")}
        </Button>
      </div>
      <TaskFilterBadges />
    </div>
  )
}
