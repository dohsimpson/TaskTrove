"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useAtomValue } from "jotai"
import { tasksAtom, projectsAtom } from "@tasktrove/atoms/data/base/atoms"
import type { Project, Task } from "@tasktrove/types/core"
import type { ProjectId, TaskId } from "@tasktrove/types/id"
import { INBOX_PROJECT_ID } from "@tasktrove/types/constants"
import { toast } from "sonner"

type ProjectSectionIndex = Map<
  ProjectId,
  {
    project: Project
    sectionTaskIds: Set<TaskId>
  }
>

type IntegritySnapshot = {
  orphaned: Map<ProjectId, Set<TaskId>>
  missingProjectTasks: Set<TaskId>
}

const DEV_ENV = process.env.NODE_ENV === "development"
const ORPHAN_GRACE_PERIOD_MS = 1500

/**
 * Development-only guard that logs when tasks have projectIds but are not present
 * inside any of the project's sections (or the project itself cannot be found).
 */
export function useProjectSectionGuard() {
  const tasks = useAtomValue(tasksAtom)
  const projects = useAtomValue(projectsAtom)
  const previousSignature = useRef<string>("")
  const previousSnapshot = useRef<IntegritySnapshot>({
    orphaned: new Map(),
    missingProjectTasks: new Set(),
  })
  const pendingOrphansRef = useRef<Map<TaskId, number>>(new Map())
  const pendingMissingRef = useRef<Map<TaskId, number>>(new Map())
  const pendingCheckTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hasInitialized = useRef(false)
  const [guardTick, setGuardTick] = useState(0)

  const sectionIndex = useMemo<ProjectSectionIndex>(() => {
    const index: ProjectSectionIndex = new Map()
    for (const project of projects) {
      const sectionTaskIds = new Set(project.sections.flatMap((section) => section.items))

      index.set(project.id, { project, sectionTaskIds })
    }
    return index
  }, [projects])

  useEffect(() => {
    if (!DEV_ENV) return

    const now = Date.now()
    const orphanedByProject = new Map<ProjectId, Task[]>()
    const orphanedTaskMap = new Map<ProjectId, Set<TaskId>>()
    const missingProjectTasks: Task[] = []
    const pendingOrphanCandidates = new Set<TaskId>()
    const pendingMissingCandidates = new Set<TaskId>()

    for (const task of tasks) {
      if (!task.projectId || task.projectId === INBOX_PROJECT_ID) {
        continue
      }

      const projectInfo = sectionIndex.get(task.projectId)
      if (!projectInfo) {
        const firstDetectedAt =
          pendingMissingRef.current.get(task.id) ?? (hasInitialized.current ? now : 0)
        pendingMissingRef.current.set(task.id, firstDetectedAt)
        const age = now - firstDetectedAt
        if (!hasInitialized.current && firstDetectedAt === 0) {
          // initial load should report immediately
          missingProjectTasks.push(task)
        } else if (age >= ORPHAN_GRACE_PERIOD_MS) {
          missingProjectTasks.push(task)
        } else {
          pendingMissingCandidates.add(task.id)
        }
        continue
      }

      if (!projectInfo.sectionTaskIds.has(task.id)) {
        const firstDetectedAt =
          pendingOrphansRef.current.get(task.id) ?? (hasInitialized.current ? now : 0)
        pendingOrphansRef.current.set(task.id, firstDetectedAt)
        const age = now - firstDetectedAt
        const reportImmediately = !hasInitialized.current && firstDetectedAt === 0
        if (reportImmediately || age >= ORPHAN_GRACE_PERIOD_MS) {
          const list = orphanedByProject.get(task.projectId) ?? []
          list.push(task)
          orphanedByProject.set(task.projectId, list)
          const set = orphanedTaskMap.get(task.projectId) ?? new Set<TaskId>()
          set.add(task.id)
          orphanedTaskMap.set(task.projectId, set)
        } else {
          pendingOrphanCandidates.add(task.id)
        }
      } else {
        // Task is properly assigned now; clear pending state if it existed
        if (pendingOrphansRef.current.has(task.id)) {
          pendingOrphansRef.current.delete(task.id)
        }
      }
    }

    const currentOrphanedIds = new Set<TaskId>()
    for (const [, ids] of orphanedTaskMap.entries()) {
      for (const id of ids) currentOrphanedIds.add(id)
    }
    const currentMissingIds = new Set(missingProjectTasks.map((t) => t.id))

    for (const taskId of Array.from(pendingOrphansRef.current.keys())) {
      if (!currentOrphanedIds.has(taskId) && !pendingOrphanCandidates.has(taskId)) {
        pendingOrphansRef.current.delete(taskId)
      }
    }
    for (const taskId of Array.from(pendingMissingRef.current.keys())) {
      if (!currentMissingIds.has(taskId) && !pendingMissingCandidates.has(taskId)) {
        pendingMissingRef.current.delete(taskId)
      }
    }

    const needsFollowUp = pendingOrphanCandidates.size > 0 || pendingMissingCandidates.size > 0

    if (needsFollowUp && pendingCheckTimeoutRef.current === null) {
      pendingCheckTimeoutRef.current = setTimeout(() => {
        pendingCheckTimeoutRef.current = null
        setGuardTick((tick) => tick + 1)
      }, ORPHAN_GRACE_PERIOD_MS)
    } else if (!needsFollowUp && pendingCheckTimeoutRef.current) {
      clearTimeout(pendingCheckTimeoutRef.current)
      pendingCheckTimeoutRef.current = null
    }

    const currentSnapshot: IntegritySnapshot = {
      orphaned: orphanedTaskMap,
      missingProjectTasks: new Set(missingProjectTasks.map((task) => task.id)),
    }
    const signature = JSON.stringify({
      orphaned: Array.from(currentSnapshot.orphaned.entries()).map(([projectId, ids]) => ({
        projectId,
        ids: Array.from(ids),
      })),
      missingProjects: Array.from(currentSnapshot.missingProjectTasks),
    })

    if (signature === previousSignature.current) {
      hasInitialized.current = true
      return
    }

    if (orphanedByProject.size === 0 && missingProjectTasks.length === 0) {
      hasInitialized.current = true
      previousSignature.current = signature
      previousSnapshot.current = currentSnapshot
      return
    }

    const { orphaned: prevOrphaned, missingProjectTasks: prevMissing } = previousSnapshot.current

    const newlyOrphaned: Array<{ projectId: ProjectId; taskIds: TaskId[] }> = []
    const resolvedOrphaned: Array<{ projectId: ProjectId; taskIds: TaskId[] }> = []

    for (const [projectId, taskSet] of currentSnapshot.orphaned.entries()) {
      const prevSet = prevOrphaned.get(projectId) ?? new Set()
      const newIds = Array.from(taskSet).filter((id) => !prevSet.has(id))
      if (newIds.length > 0) {
        newlyOrphaned.push({ projectId, taskIds: newIds })
      }
    }
    for (const [projectId, prevSet] of prevOrphaned.entries()) {
      if (!currentSnapshot.orphaned.has(projectId)) {
        resolvedOrphaned.push({
          projectId,
          taskIds: Array.from(prevSet),
        })
        continue
      }
      const currentSet = currentSnapshot.orphaned.get(projectId)
      if (!currentSet) continue
      const resolvedIds = Array.from(prevSet).filter((id) => !currentSet.has(id))
      if (resolvedIds.length > 0) {
        resolvedOrphaned.push({ projectId, taskIds: resolvedIds })
      }
    }

    const prevMissingIds = prevMissing
    const currentMissingTasks = currentSnapshot.missingProjectTasks

    const newlyMissing = Array.from(currentMissingTasks).filter((id) => !prevMissingIds.has(id))
    const resolvedMissing = Array.from(prevMissingIds).filter((id) => !currentMissingTasks.has(id))

    const orphanedProjectCount = orphanedByProject.size
    const orphanedTaskCount = Array.from(orphanedByProject.values()).reduce(
      (sum, list) => sum + list.length,
      0,
    )
    const missingProjectTaskCount = missingProjectTasks.length

    const totalIssues = orphanedTaskCount + missingProjectTaskCount
    const newlyIntroducedCount =
      newlyOrphaned.reduce((sum, entry) => sum + entry.taskIds.length, 0) + newlyMissing.length
    const isInitialPass = !hasInitialized.current

    console.groupCollapsed(
      `%c[dev-guard] Project section integrity issues detected (${totalIssues})`,
      "color:#b45309",
    )
    const shouldToast = totalIssues > 0 && (isInitialPass || newlyIntroducedCount > 0)
    if (shouldToast) {
      const description = isInitialPass
        ? `${totalIssues} orphaned task${totalIssues === 1 ? "" : "s"} present at startup. Press Cmd+Option+I (Ctrl+Shift+I on Windows/Linux) to open DevTools and inspect details.`
        : `${newlyIntroducedCount} new orphaned task${
            newlyIntroducedCount === 1 ? "" : "s"
          } detected. Press Cmd+Option+I (Ctrl+Shift+I) to inspect.`
      toast.error("Project section integrity issue detected", {
        description,
        duration: 6000,
        action: {
          label: "Copy shortcut",
          onClick: () => {
            const shortcutText =
              "Open DevTools: Cmd+Option+I on macOS, Ctrl+Shift+I on Windows/Linux."
            if (typeof navigator !== "undefined" && navigator.clipboard) {
              navigator.clipboard.writeText(shortcutText).catch(() => {
                console.info(shortcutText)
              })
            } else {
              console.info(shortcutText)
            }
          },
        },
      })
    }

    if (orphanedProjectCount > 0) {
      console.warn(
        "[sections] Tasks are assigned to a project but are missing from every section.items array.",
      )
      for (const [projectId, taskList] of orphanedByProject.entries()) {
        const project = sectionIndex.get(projectId)?.project
        console.table(
          taskList.map((task) => ({
            projectName: project?.name ?? "(unknown project)",
            projectId,
            taskId: task.id,
            title: task.title,
            completed: task.completed,
          })),
        )
      }
    }

    if (newlyOrphaned.length > 0 || newlyMissing.length > 0) {
      console.warn("[delta] New inconsistencies introduced since the previous render.")
      newlyOrphaned.forEach(({ projectId, taskIds }) => {
        const project = sectionIndex.get(projectId)?.project
        console.table(
          taskIds
            .map((taskId) => tasks.find((task) => task.id === taskId))
            .filter(Boolean)
            .map((task) => ({
              projectName: project?.name ?? "(unknown project)",
              projectId,
              taskId: task!.id,
              title: task!.title,
              completed: task!.completed,
            })),
        )
      })
      if (newlyMissing.length > 0) {
        console.table(
          newlyMissing
            .map((taskId) => tasks.find((task) => task.id === taskId))
            .filter(Boolean)
            .map((task) => ({
              taskId: task!.id,
              projectId: task!.projectId,
              title: task!.title,
              completed: task!.completed,
            })),
        )
      }
    }

    if (resolvedOrphaned.length > 0 || resolvedMissing.length > 0) {
      console.info("[delta] Some previously orphaned tasks were corrected since the last check.")
      resolvedOrphaned.forEach(({ projectId, taskIds }) => {
        console.table(
          taskIds.map((taskId) => ({
            projectId,
            taskId,
          })),
        )
      })
      if (resolvedMissing.length > 0) {
        console.table(resolvedMissing.map((taskId) => ({ taskId })))
      }
    }

    if (missingProjectTaskCount > 0) {
      console.warn(
        "[projects] Tasks reference a projectId that does not exist. These tasks will fall back to the Inbox view.",
      )
      console.table(
        missingProjectTasks.map((task) => ({
          taskId: task.id,
          projectId: task.projectId,
          title: task.title,
          completed: task.completed,
        })),
      )
    }

    console.info(
      "Tip: Run `apps/web/scripts/task-utils.sh get_orphaned_tasks_by_project <projectId>` for a CLI list.",
    )
    console.groupEnd()

    hasInitialized.current = true
    previousSignature.current = signature
    previousSnapshot.current = currentSnapshot
  }, [tasks, sectionIndex, guardTick])

  useEffect(
    () => () => {
      if (pendingCheckTimeoutRef.current) {
        clearTimeout(pendingCheckTimeoutRef.current)
      }
    },
    [],
  )
}
