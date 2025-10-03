import {
  Inbox,
  Calendar,
  Clock,
  CheckSquare,
  ListCheck,
  Tag,
  FolderOpen,
  Archive,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTranslation } from "@tasktrove/i18n"
import type { ViewId } from "@/lib/types"

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
    all: {
      icon: ListCheck,
      title: t("emptyStates.all.title", "No tasks found"),
      description: t(
        "emptyStates.all.description",
        "This view shows all your tasks across all projects. Create your first task to get started with TaskTrove.",
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
