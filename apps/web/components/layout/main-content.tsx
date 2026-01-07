"use client"

import React from "react"
import { useAtomValue } from "jotai"
import { useTranslation } from "@tasktrove/i18n"
import { projectAtoms } from "@tasktrove/atoms/core/projects"
import { filteredTasksAtom } from "@tasktrove/atoms/ui/filtered-tasks"
import { currentViewAtom, currentViewStateAtom } from "@tasktrove/atoms/ui/views"
import { currentRouteContextAtom } from "@tasktrove/atoms/ui/navigation"
import { INBOX_PROJECT_ID } from "@tasktrove/types/constants"
import type { Project } from "@tasktrove/types/core"
import type { VoiceCommand } from "@tasktrove/types/voice-commands"
import { KanbanBoard } from "@/components/views/kanban-board"
import { CalendarView } from "@/components/views/calendar-view"
import { TableView } from "@/components/views/table-view"
import { StatsView } from "@/components/views/stats-view"
import { AnalyticsDashboard } from "@/components/analytics/analytics-dashboard"
import { TaskEmptyState } from "@/components/task/task-empty-state"
import { PermissionChecker } from "@/components/startup/permission-checker"
import { TodayView } from "@/components/views/today-view"
import { RecentView } from "@/components/views/recent-view"
import { StandardTaskListView } from "@/components/views/task-list-view"
import { TaskViewSidePanelLayout } from "@/components/task/task-view-side-panel-layout"

interface MainContentProps {
  onVoiceCommand: (command: VoiceCommand) => void
}

export function MainContent({ onVoiceCommand }: MainContentProps): React.ReactElement {
  const { t } = useTranslation("layout")
  // TODO: Implement voice command functionality
  void onVoiceCommand // Mark as intentionally used for future implementation

  // Get data from atoms
  const currentView = useAtomValue(currentViewAtom)
  const currentViewState = useAtomValue(currentViewStateAtom)
  const routeContext = useAtomValue(currentRouteContextAtom)
  const filteredTasks = useAtomValue(filteredTasksAtom)

  // Extract values from atoms
  const { viewMode } = currentViewState
  const currentProjectId = routeContext.routeType === "project" ? routeContext.viewId : null
  const allProjects = useAtomValue(projectAtoms.derived.allProjects)

  // The filteredTasksAtom automatically handles all filtering and sorting based on:
  // - Current view (inbox, today, upcoming, completed, project UUIDs, label UUIDs)
  // - Search query
  // - Show completed preference
  // - User's selected sort options (sortBy and sortDirection)
  // No manual filtering logic needed here

  const renderContent = () => {
    switch (currentView) {
      case "analytics":
        return <AnalyticsDashboard />

      case "calendar":
        // Calendar view always shows tasks in calendar format
        return <CalendarView tasks={filteredTasks} onDateClick={() => {}} />

      case "voice":
        return (
          <TaskEmptyState
            title={t("empty.voice.title", "Voice Commands")}
            description={t(
              "empty.voice.description",
              "Voice commands temporarily disabled during migration",
            )}
            action={{ label: t("empty.voice.action", "Go Back"), onClick: () => {} }}
          />
        )

      case "notifications":
        return (
          <TaskEmptyState
            title={t("empty.notifications.title", "Notifications")}
            description={t(
              "empty.notifications.description",
              "Notifications temporarily disabled during migration",
            )}
            action={{ label: t("empty.notifications.action", "Go Back"), onClick: () => {} }}
          />
        )

      case "performance":
        return (
          <TaskEmptyState
            title={t("empty.performance.title", "Performance Monitor")}
            description={t(
              "empty.performance.description",
              "Performance monitoring temporarily disabled during migration",
            )}
            action={{ label: t("empty.performance.action", "Go Back"), onClick: () => {} }}
          />
        )

      default: {
        // Task views (inbox, today, upcoming, projects, etc.)

        // Get project for project views
        const getProjectForView = (): Project | undefined => {
          if (routeContext.routeType === "project" && currentProjectId) {
            return allProjects.find((p: Project) => p.id === currentProjectId)
          }
          if (currentView === "inbox") {
            return allProjects.find((p: Project) => p.id === INBOX_PROJECT_ID)
          }
          // For projectgroups, return undefined since we're showing aggregated tasks from multiple projects
          return undefined
        }

        const projectForView = getProjectForView()

        switch (viewMode) {
          case "kanban":
            return <KanbanBoard project={projectForView} />

          case "calendar":
            return (
              <CalendarView tasks={filteredTasks} onDateClick={() => {}} project={projectForView} />
            )

          case "table":
            return (
              <TableView
                tasks={filteredTasks}
                project={projectForView}
                routeContext={routeContext}
                viewState={currentViewState}
              />
            )

          case "stats":
            return <StatsView />

          // list view
          default: {
            const listContent =
              currentView === "today" ? (
                <TodayView />
              ) : currentView === "recent" ? (
                <RecentView />
              ) : (
                <StandardTaskListView />
              )

            return (
              <TaskViewSidePanelLayout contentWrapperClassName="overflow-auto" applyContentPadding>
                {listContent}
              </TaskViewSidePanelLayout>
            )
          }
        }
      }
    }
  }

  return (
    <div className={`flex-1 flex flex-col transition-all duration-300 h-full`}>
      <PermissionChecker />
      <div className="flex-1 flex flex-col h-full">{renderContent()}</div>
    </div>
  )
}
