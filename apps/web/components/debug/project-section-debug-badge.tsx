import { useAtomValue } from "jotai"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
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

  // Find tasks that are in the project but not in any sections (orphaned tasks)
  const taskIdsInSections = new Set(project.sections.flatMap((section) => section.items))
  const orphanedTasks = allTasks.filter(
    (task) => task.projectId === project.id && !taskIdsInSections.has(task.id),
  )
  const orphanedTaskCount = orphanedTasks.length

  // Only show in development
  if (
    typeof window === "undefined" ||
    process.env.NODE_ENV !== "development" ||
    !process.env.SHOW_DEBUG_BADGE
  ) {
    return null
  }

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
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
              className="text-xs px-2 py-1 bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20 cursor-help"
            >
              📊 {project.name}: {sectionCount} section{sectionCount !== 1 ? "s" : ""} •{" "}
              {tasksInSections} task{tasksInSections !== 1 ? "s" : ""} in sections •{" "}
              {orphanedTaskCount} orphaned
              {orphanedTaskCount !== 1 ? "s" : ""} • {tasksWithProjectId} total task
              {tasksWithProjectId !== 1 ? "s" : ""}
            </Badge>
          </div>
        </TooltipTrigger>
        <TooltipContent
          side="bottom"
          align="start"
          className="max-w-[320px] max-h-96 overflow-auto"
        >
          <div className="space-y-2">
            <div>
              <strong className="text-xs">Project Object:</strong>
              <pre className="text-[10px] font-mono whitespace-pre-wrap break-all mt-1">
                {JSON.stringify(project, null, 2)}
              </pre>
            </div>
            {orphanedTaskCount > 0 && (
              <div>
                <strong className="text-xs">Orphaned Tasks ({orphanedTaskCount}):</strong>
                <pre className="text-[10px] font-mono whitespace-pre-wrap break-all mt-1">
                  {JSON.stringify(orphanedTasks, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
