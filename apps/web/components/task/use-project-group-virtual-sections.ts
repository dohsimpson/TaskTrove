"use client"

import { useMemo } from "react"
import { useAtomValue } from "jotai"
import { filteredTasksAtom } from "@tasktrove/atoms/ui/filtered-tasks"
import { currentRouteContextAtom } from "@tasktrove/atoms/ui/navigation"
import { projectsAtom } from "@tasktrove/atoms/data/base/atoms"
import { allGroupsAtom } from "@tasktrove/atoms/core/groups"
import type { Task, Project } from "@tasktrove/types/core"
import type { ProjectGroup } from "@tasktrove/types/group"
import type { ProjectId, GroupId } from "@tasktrove/types/id"
import { GroupIdSchema, createProjectId } from "@tasktrove/types/id"
import { DEFAULT_SECTION_COLOR } from "@tasktrove/constants"

export interface VirtualProjectSection {
  key: string
  projectId?: ProjectId
  name: string
  color: string
  tasks: Task[]
}

export function useProjectGroupVirtualSections(enable: boolean) {
  const tasks = useAtomValue(filteredTasksAtom)
  const routeContext = useAtomValue(currentRouteContextAtom)
  const allProjects = useAtomValue(projectsAtom)
  const allGroups = useAtomValue(allGroupsAtom)

  const shouldShowProjectPseudoSections = enable && routeContext.routeType === "projectgroup"

  const currentProjectGroup = useMemo(() => {
    if (!shouldShowProjectPseudoSections) return null
    if (typeof routeContext.viewId !== "string") return null

    // Avoid throwing when the viewId is a slug or a not-found sentinel during
    // initial render/refresh before groups are loaded
    const parsed = GroupIdSchema.safeParse(routeContext.viewId)
    if (!parsed.success) return null

    return findProjectGroupById(allGroups.projectGroups, parsed.data)
  }, [allGroups.projectGroups, routeContext.viewId, shouldShowProjectPseudoSections])

  const virtualProjectSections = useMemo(() => {
    if (!shouldShowProjectPseudoSections) return []
    return buildVirtualProjectSections(tasks, allProjects, currentProjectGroup)
  }, [allProjects, currentProjectGroup, shouldShowProjectPseudoSections, tasks])

  return {
    shouldShowProjectPseudoSections,
    currentProjectGroup,
    virtualProjectSections,
  }
}

export function buildVirtualProjectSections(
  tasks: Task[],
  projects: Project[],
  group: ProjectGroup | null,
): VirtualProjectSection[] {
  const tasksByProject = new Map<string, Task[]>()
  const projectIndex = new Map<ProjectId, Project>(projects.map((project) => [project.id, project]))

  for (const task of tasks) {
    const projectKey = task.projectId ?? UNKNOWN_PROJECT_SECTION_ID
    if (!tasksByProject.has(projectKey)) {
      tasksByProject.set(projectKey, [])
    }
    tasksByProject.get(projectKey)?.push(task)
  }

  const sections: VirtualProjectSection[] = []
  const visited = new Set<string>()

  const addSection = (key: string, project: Project | undefined, sectionTasks: Task[]) => {
    sections.push({
      key,
      projectId: project?.id,
      name: project?.name ?? UNASSIGNED_SECTION_TITLE,
      color: project?.color ?? DEFAULT_SECTION_COLOR,
      tasks: sectionTasks,
    })
    visited.add(key)
  }

  if (group) {
    collectProjectIds(group, (projectId) => {
      const project = projectIndex.get(projectId)
      const projectTasks = tasksByProject.get(projectId) ?? []
      addSection(projectId, project, projectTasks)
    })
  }

  for (const [key, sectionTasks] of tasksByProject.entries()) {
    if (visited.has(key)) continue
    if (key === UNKNOWN_PROJECT_SECTION_ID) {
      sections.push({
        key,
        name: UNASSIGNED_SECTION_TITLE,
        color: DEFAULT_SECTION_COLOR,
        tasks: sectionTasks,
      })
      visited.add(key)
      continue
    }

    const project = projectIndex.get(createProjectId(key))
    addSection(key, project, sectionTasks)
  }

  return sections
}

function collectProjectIds(group: ProjectGroup, visit: (projectId: ProjectId) => void) {
  for (const item of group.items) {
    if (typeof item === "string") {
      visit(createProjectId(item))
    } else {
      collectProjectIds(item, visit)
    }
  }
}

function findProjectGroupById(group: ProjectGroup, groupId: GroupId): ProjectGroup | null {
  if (group.id === groupId) {
    return group
  }

  for (const item of group.items) {
    if (typeof item !== "string") {
      const found = findProjectGroupById(item, groupId)
      if (found) return found
    }
  }

  return null
}

const UNKNOWN_PROJECT_SECTION_ID = "unknown-project"
const UNASSIGNED_SECTION_TITLE = "Unassigned tasks"
