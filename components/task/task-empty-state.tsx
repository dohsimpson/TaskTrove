import { Archive } from "lucide-react"
import { Button } from "@/components/ui/button"

interface TaskEmptyStateProps {
  title?: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
  className?: string
}

export function TaskEmptyState({
  title = "No tasks found",
  description = "Create your first task to get started",
  action,
  className = "",
}: TaskEmptyStateProps) {
  return (
    <div
      className={`text-center text-muted-foreground flex flex-col justify-center h-full ${className}`}
    >
      <div className="mb-4">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/30 flex items-center justify-center">
          <Archive className="h-8 w-8 text-muted-foreground/60" />
        </div>
        <h3 className="text-lg font-medium text-foreground mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground mb-4">{description}</p>
        {action && (
          <Button onClick={action.onClick} className="mx-auto">
            {action.label}
          </Button>
        )}
      </div>
    </div>
  )
}
