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

const VIEW_CONFIGS: Record<string, ViewConfig> = {
  inbox: {
    icon: Inbox,
    title: "Your Inbox is empty",
    description:
      "This is your default collection point for all new tasks. When you create a task without specifying a project, it lands here.",
  },
  today: {
    icon: Calendar,
    title: "Nothing scheduled for today",
    description:
      "Tasks with today's due date will appear here. Set due dates on your tasks to stay on track with your daily goals.",
  },
  upcoming: {
    icon: Clock,
    title: "No upcoming tasks",
    description:
      "Tasks with future due dates show up here, helping you plan ahead and prepare for what's coming next.",
  },
  completed: {
    icon: CheckSquare,
    title: "No completed tasks yet",
    description:
      "Tasks you've finished will appear here. Complete some tasks to see your progress and celebrate your wins!",
  },
  all: {
    icon: ListCheck,
    title: "No tasks found",
    description:
      "This view shows all your tasks across all projects. Create your first task to get started with TaskTrove.",
  },
  analytics: {
    icon: Archive,
    title: "Analytics Dashboard",
    description: "Track your productivity and task completion patterns.",
  },
  search: {
    icon: Archive,
    title: "Search Results",
    description: "Find tasks by title, description, or labels.",
  },
}

function getViewConfig(viewId: ViewId, projectName?: string, labelName?: string): ViewConfig {
  // Handle standard views
  if (typeof viewId === "string" && viewId in VIEW_CONFIGS) {
    return VIEW_CONFIGS[viewId]
  }

  // Handle project views (UUID)
  if (projectName) {
    return {
      icon: FolderOpen,
      title: `No tasks in ${projectName}`,
      description:
        "This project is empty. Add tasks to organize your work and track progress on specific goals.",
    }
  }

  // Handle label views (UUID)
  if (labelName) {
    return {
      icon: Tag,
      title: `No tasks with ${labelName} label`,
      description:
        "Tasks tagged with this label will appear here. Use labels to categorize and quickly find related tasks.",
    }
  }

  // Fallback for unknown views
  return {
    icon: Archive,
    title: "No tasks found",
    description: "Create your first task to get started.",
  }
}

export function ViewEmptyState({
  viewId,
  projectName,
  labelName,
  action,
  className = "",
}: ViewEmptyStateProps) {
  const config = getViewConfig(viewId, projectName, labelName)
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
