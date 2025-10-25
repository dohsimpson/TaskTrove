import { useAtomValue } from "jotai"
import { Badge } from "@/components/ui/badge"
import type { Project } from "@tasktrove/types/core"
import { tasksAtom } from "@tasktrove/atoms/data/base/atoms"

interface ProjectSectionDebugBadgeProps {
  project: Project
}

/**
 * Debug badge to show project section and task counts (development only)
 *
 * Displays the number of sections in a project, the total number of tasks
 * in sections (from section.items), and the total tasks with
 * projectId === project.id. Only visible in development mode.
 */
export function ProjectSectionDebugBadge({ project }: ProjectSectionDebugBadgeProps) {
  const allTasks = useAtomValue(tasksAtom)

  const sectionCount = project.sections.length
  const tasksInSections = project.sections.reduce((sum, section) => sum + section.items.length, 0)

  // Count tasks that have projectId === project.id
  const tasksWithProjectId = allTasks.filter((task) => task.projectId === project.id).length

  // Only show in development
  if (typeof window === "undefined" || process.env.NODE_ENV !== "development") {
    return null
  }

  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        left: 0,
        zIndex: 50,
        display: "inline-block",
        marginBottom: "8px",
      }}
    >
      <Badge
        variant="secondary"
        className="text-xs px-2 py-1 bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20"
      >
        📊 {project.name}: {sectionCount} section{sectionCount !== 1 ? "s" : ""} • {tasksInSections}{" "}
        task{tasksInSections !== 1 ? "s" : ""} in sections • {tasksWithProjectId} task
        {tasksWithProjectId !== 1 ? "s" : ""} with projectId
      </Badge>
    </div>
  )
}
