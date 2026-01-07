import {
  Inbox,
  Calendar,
  Clock,
  CheckSquare,
  ListTodo,
  Tag,
  FolderOpen,
  Archive,
  Repeat,
  UserRoundCheck,
  UserRoundPlus,
  History,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTranslation } from "@tasktrove/i18n"
import type { ViewId } from "@tasktrove/types/id"

interface ViewEmptyStateProps {
  viewId: ViewId
  projectName?: string
  labelName?: string
  action?: {
    label: string
    onClick: () => void
  }
  className?: string
}

interface ViewConfig {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
}

function getViewConfigs(t: (key: string, fallback: string) => string): Record<string, ViewConfig> {
  return {
    inbox: {
      icon: Inbox,
      title: t("emptyStates.inbox.title", "Your Inbox is empty"),
      description: t(
        "emptyStates.inbox.description",
        "This is your default collection point for all new tasks. When you create a task without specifying a project, it lands here.",
      ),
    },
    today: {
      icon: Calendar,
      title: t("emptyStates.today.title", "Nothing scheduled for today"),
      description: t(
        "emptyStates.today.description",
        "Tasks with today's due date will appear here. Set due dates on your tasks to stay on track with your daily goals.",
      ),
    },
    upcoming: {
      icon: Clock,
      title: t("emptyStates.upcoming.title", "No upcoming tasks"),
      description: t(
        "emptyStates.upcoming.description",
        "Tasks with future due dates show up here, helping you plan ahead and prepare for what's coming next.",
      ),
    },
    completed: {
      icon: CheckSquare,
      title: t("emptyStates.completed.title", "No completed tasks yet"),
      description: t(
        "emptyStates.completed.description",
        "Tasks you've finished will appear here. Complete some tasks to see your progress and celebrate your wins!",
      ),
    },
    recent: {
      icon: History,
      title: t("emptyStates.recent.title", "No recent activity"),
      description: t(
        "emptyStates.recent.description",
        "Tasks created or completed in the last few days will appear here.",
      ),
    },
    all: {
      icon: ListTodo,
      title: t("emptyStates.all.title", "No tasks found"),
      description: t(
        "emptyStates.all.description",
        "This view shows all your tasks across all projects. Create your first task to get started with TaskTrove.",
      ),
    },
    calendar: {
      icon: Calendar,
      title: t("emptyStates.calendar.title", "Nothing scheduled on the calendar"),
      description: t(
        "emptyStates.calendar.description",
        "Tasks with due dates appear here. Add due dates to your tasks to plan your work visually.",
      ),
    },
    habits: {
      icon: Repeat,
      title: t("emptyStates.habits.title", "No habits tracked yet"),
      description: t(
        "emptyStates.habits.description",
        "Recurring tasks with auto-rollover recurring mode will show up here. Create a repeating task to build consistent routines.",
      ),
    },
    "assigned-to-me": {
      icon: UserRoundCheck,
      title: t("emptyStates.assignedToMe.title", "No tasks assigned to you"),
      description: t(
        "emptyStates.assignedToMe.description",
        "Tasks teammates assign to you will appear here. Ask your team to delegate work, or assign tasks to yourself.",
      ),
    },
    "assigned-to-others": {
      icon: UserRoundPlus,
      title: t("emptyStates.assignedToOthers.title", "No delegated tasks yet"),
      description: t(
        "emptyStates.assignedToOthers.description",
        "Tasks you assign to others will show here. Delegate work to teammates to keep collaboration moving.",
      ),
    },
    projects: {
      icon: FolderOpen,
      title: t("emptyStates.projects.title", "No project tasks to show"),
      description: t(
        "emptyStates.projects.description",
        "Select a project from the sidebar to focus on its tasks, or create a new project to organize your work.",
      ),
    },
    labels: {
      icon: Tag,
      title: t("emptyStates.labels.title", "No labeled tasks to display"),
      description: t(
        "emptyStates.labels.description",
        "Filter by a label from the sidebar to see tagged tasks, or add labels to existing work for quick access.",
      ),
    },
    "not-found": {
      icon: Archive,
      title: t("emptyStates.notFound.title", "Nothing to see here"),
      description: t(
        "emptyStates.notFound.description",
        "We couldn't find content for this view. Try switching to another section from the sidebar.",
      ),
    },
    analytics: {
      icon: Archive,
      title: t("emptyStates.analytics.title", "Analytics Dashboard"),
      description: t(
        "emptyStates.analytics.description",
        "Track your productivity and task completion patterns.",
      ),
    },
    search: {
      icon: Archive,
      title: t("emptyStates.search.title", "Search Results"),
      description: t(
        "emptyStates.search.description",
        "Find tasks by title, description, or labels.",
      ),
    },
  }
}

function getViewConfig(
  t: (key: string, fallback: string) => string,
  viewId: ViewId,
  projectName?: string,
  labelName?: string,
): ViewConfig {
  const viewConfigs = getViewConfigs(t)

  // Handle standard views
  if (typeof viewId === "string" && viewId in viewConfigs) {
    const config = viewConfigs[viewId]
    if (!config) {
      throw new Error(`Missing configuration for view: ${viewId}`)
    }
    return config
  }

  // Handle project views (UUID)
  if (projectName) {
    return {
      icon: FolderOpen,
      title: t("emptyStates.project.title", "No tasks in {{projectName}}").replace(
        "{{projectName}}",
        projectName,
      ),
      description: t(
        "emptyStates.project.description",
        "This project is empty. Add tasks to organize your work and track progress on specific goals.",
      ),
    }
  }

  // Handle label views (UUID)
  if (labelName) {
    return {
      icon: Tag,
      title: t("emptyStates.label.title", "No tasks with {{labelName}} label").replace(
        "{{labelName}}",
        labelName,
      ),
      description: t(
        "emptyStates.label.description",
        "Tasks tagged with this label will appear here. Use labels to categorize and quickly find related tasks.",
      ),
    }
  }

  // Fallback for unknown views
  return {
    icon: Archive,
    title: t("emptyStates.fallback.title", "No tasks found"),
    description: t("emptyStates.fallback.description", "Create your first task to get started."),
  }
}

export function ViewEmptyState({
  viewId,
  projectName,
  labelName,
  action,
  className = "",
}: ViewEmptyStateProps) {
  const { t } = useTranslation("task")

  const config = getViewConfig(t, viewId, projectName, labelName)
  const Icon = config.icon

  return (
    <div
      className={`text-center text-muted-foreground flex flex-col justify-center h-full ${className}`}
    >
      <div className="mb-4">
        <div className="size-16 mx-auto mb-4 rounded-full bg-muted/30 flex items-center justify-center">
          <Icon className="h-8 w-8 text-muted-foreground/60" />
        </div>
        <h3 className="text-lg font-medium text-foreground mb-2">{config.title}</h3>
        <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto leading-relaxed">
          {config.description}
        </p>
        {action && (
          <Button onClick={action.onClick} className="mx-auto">
            {action.label}
          </Button>
        )}
      </div>
    </div>
  )
}
