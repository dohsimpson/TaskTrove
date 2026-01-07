import { atom, type Getter, type Setter } from "jotai";
import { isFuture, isPast, isToday } from "date-fns";
import type { Task, Project, Label } from "@tasktrove/types/core";
import type { TaskId, ProjectId, ViewId, GroupId } from "@tasktrove/types/id";
import {
  tasksAtom,
  projectsAtom,
  labelsAtom,
} from "@tasktrove/atoms/data/base/atoms";
import { allGroupsAtom } from "@tasktrove/atoms/core/groups";
import {
  currentRouteContextAtom,
  type RouteContext,
} from "@tasktrove/atoms/ui/navigation";
import {
  updateViewStateAtom,
  viewStatesAtom,
  getViewStateOrDefault,
} from "@tasktrove/atoms/ui/views";
import { selectedTaskIdAtom } from "@tasktrove/atoms/ui/selection";
import { shouldTaskBeInInbox } from "@tasktrove/utils";
import { getEffectiveDueDate } from "@tasktrove/utils";
import {
  createLabelSlug,
  createProjectGroupSlug,
  createProjectSlug,
} from "@tasktrove/utils/routing";
import {
  collectProjectIdsFromGroup,
  findGroupById,
} from "@tasktrove/utils/group-utils";
import { isGroup, type ProjectGroup } from "@tasktrove/types/group";

export type GroupTree = { projectGroups: ProjectGroup; labelGroups: unknown };

export interface TaskFocusVisibility {
  taskId: TaskId;
  viewId: ViewId;
  routeType: RouteContext["routeType"];
  sectionId?: GroupId;
}

export interface TaskFocusRequest {
  taskId: TaskId;
  targetPath: string;
  route: RouteContext;
  sectionId?: GroupId;
  createdAt: number;
  reason: string;
}

export interface FocusCandidate {
  route: RouteContext;
  path: string;
  priority: number;
  reason: string;
  sectionId?: GroupId;
}

function isListFriendlyStandardView(viewId: string): boolean {
  return (
    viewId !== "calendar" &&
    viewId !== "analytics" &&
    viewId !== "profile" &&
    viewId !== "debug"
  );
}

export function buildProjectPath(project: Project): string {
  const slug = createProjectSlug(project);
  return `/projects/${encodeURIComponent(slug)}`;
}

export function buildLabelPath(label: Label): string {
  const slug = createLabelSlug(label);
  return `/labels/${encodeURIComponent(slug)}`;
}

export function buildProjectGroupPath(groupId: GroupId, groups?: GroupTree) {
  if (!groups) return `/projectgroups/${groupId}`;
  const group = findGroupById(groups.projectGroups, groupId);
  const slug = group ? createProjectGroupSlug(group) : groupId;
  return `/projectgroups/${encodeURIComponent(slug)}`;
}

export function findSectionIdForTask(
  project: Project | undefined,
  taskId: TaskId,
): GroupId | undefined {
  if (!project) return undefined;
  const section = project.sections.find((s) => s.items.includes(taskId));
  return section?.id;
}

export function findProjectGroupsForProject(
  groups: GroupTree,
  projectId: ProjectId,
): GroupId[] {
  const result: GroupId[] = [];

  const traverse = (group: ProjectGroup): boolean => {
    for (const item of group.items) {
      if (typeof item === "string" && item === projectId) {
        result.push(group.id);
        return true;
      }
      if (isGroup<ProjectGroup>(item) && traverse(item)) {
        result.push(group.id);
        return true;
      }
    }
    return false;
  };

  traverse(groups.projectGroups);
  return Array.from(new Set(result));
}

export function routeContainsTaskBase(
  task: Task,
  route: RouteContext,
  projectIds: Set<ProjectId>,
  groups?: GroupTree,
): boolean {
  if (route.viewId === "not-found") return false;

  switch (route.routeType) {
    case "project":
      return task.projectId === route.viewId;

    case "label":
      return task.labels.includes(route.viewId);

    case "projectgroup": {
      if (!groups || !task.projectId) return false;
      const projectIdsInGroup = collectProjectIdsFromGroup(
        groups,
        route.viewId,
      );
      return projectIdsInGroup.includes(task.projectId);
    }

    case "standard": {
      const viewId = route.viewId;
      const dueDate = getEffectiveDueDate(task);
      switch (viewId) {
        case "today":
          return Boolean(
            dueDate &&
              (isToday(dueDate) || (isPast(dueDate) && !isToday(dueDate))),
          );
        case "upcoming":
          return Boolean(dueDate && isFuture(dueDate) && !isToday(dueDate));
        case "completed":
          return task.completed;
        case "habits":
          return task.recurringMode === "autoRollover" && !task.completed;
        case "inbox":
          return shouldTaskBeInInbox(task.projectId, projectIds);
        case "all":
          return true;
        default:
          return false;
      }
    }

    default:
      return false;
  }
}

function isListFriendlyRoute(route: RouteContext): boolean {
  if (route.routeType !== "standard") return true;
  return isListFriendlyStandardView(route.viewId);
}

export interface BuildCandidatesOptions {
  task: Task;
  currentRoute: RouteContext;
  projects: Project[];
  labels: Label[];
  groups?: GroupTree;
  routeContainsTask?: (
    task: Task,
    route: RouteContext,
    projectIds: Set<ProjectId>,
    groups?: GroupTree,
  ) => boolean;
  extraCandidates?: (
    push: (
      route: RouteContext,
      path: string,
      priority: number,
      reason: string,
      sectionId?: GroupId,
    ) => void,
    context: {
      task: Task;
      projectIds: Set<ProjectId>;
      taskProject: Project | undefined;
      taskLabels: Label[];
      groups?: GroupTree;
    },
  ) => void;
}

export function buildFocusCandidates({
  task,
  currentRoute,
  projects,
  labels,
  groups,
  routeContainsTask = routeContainsTaskBase,
  extraCandidates,
}: BuildCandidatesOptions): FocusCandidate[] {
  const candidates = new Map<string, FocusCandidate>();
  const projectIds = new Set<ProjectId>(projects.map((p) => p.id));
  const taskProject = task.projectId
    ? projects.find((project) => project.id === task.projectId)
    : undefined;
  const taskLabels = labels.filter((label) => task.labels.includes(label.id));

  const pushCandidate = (
    route: RouteContext,
    path: string,
    priority: number,
    reason: string,
    sectionId?: GroupId,
  ) => {
    if (!isListFriendlyRoute(route)) return;
    const adjustedPriority =
      route.routeType === currentRoute.routeType ? priority - 0.1 : priority;
    const candidate: FocusCandidate = {
      route: { ...route, pathname: path },
      path,
      priority: adjustedPriority,
      reason,
      sectionId,
    };
    const existing = candidates.get(path);
    if (!existing || existing.priority > candidate.priority) {
      candidates.set(path, candidate);
    }
  };

  if (routeContainsTask(task, currentRoute, projectIds, groups)) {
    pushCandidate(currentRoute, currentRoute.pathname, 0, "current-route");
  }

  if (taskProject) {
    const projectPath = buildProjectPath(taskProject);
    const sectionId = findSectionIdForTask(taskProject, task.id);
    pushCandidate(
      {
        pathname: projectPath,
        viewId: taskProject.id,
        routeType: "project",
      },
      projectPath,
      1,
      "project",
      sectionId,
    );

    if (groups?.projectGroups) {
      const groupIds = findProjectGroupsForProject(groups, taskProject.id);
      groupIds.forEach((groupId, index) => {
        const path = buildProjectGroupPath(groupId, groups);
        pushCandidate(
          {
            pathname: path,
            viewId: groupId,
            routeType: "projectgroup",
          },
          path,
          1.25 + index * 0.01,
          "project-group",
        );
      });
    }
  }

  taskLabels.forEach((label, index) => {
    const labelPath = buildLabelPath(label);
    pushCandidate(
      {
        pathname: labelPath,
        viewId: label.id,
        routeType: "label",
      },
      labelPath,
      1.5 + index * 0.05,
      "label",
    );
  });

  const dueDate = getEffectiveDueDate(task);
  const inInbox = shouldTaskBeInInbox(task.projectId, projectIds);

  if (dueDate && (isToday(dueDate) || (isPast(dueDate) && !isToday(dueDate)))) {
    pushCandidate(
      { pathname: "/today", viewId: "today", routeType: "standard" },
      "/today",
      2,
      "today",
    );
  }
  if (dueDate && isFuture(dueDate) && !isToday(dueDate)) {
    pushCandidate(
      { pathname: "/upcoming", viewId: "upcoming", routeType: "standard" },
      "/upcoming",
      2.1,
      "upcoming",
    );
  }
  if (task.completed) {
    pushCandidate(
      { pathname: "/completed", viewId: "completed", routeType: "standard" },
      "/completed",
      2.2,
      "completed",
    );
  }
  if (task.recurringMode === "autoRollover" && !task.completed) {
    pushCandidate(
      { pathname: "/habits", viewId: "habits", routeType: "standard" },
      "/habits",
      2.3,
      "habits",
    );
  }

  if (inInbox) {
    pushCandidate(
      { pathname: "/inbox", viewId: "inbox", routeType: "standard" },
      "/inbox",
      2.6,
      "inbox",
    );
  }

  pushCandidate(
    { pathname: "/all", viewId: "all", routeType: "standard" },
    "/all",
    3,
    "all-fallback",
  );

  if (extraCandidates) {
    extraCandidates(pushCandidate, {
      task,
      projectIds,
      taskProject,
      taskLabels,
      groups,
    });
  }

  return Array.from(candidates.values()).sort(
    (a, b) => a.priority - b.priority,
  );
}

export function sanitizeViewId(viewId: string): ViewId {
  // Since ViewId is essentially a string type, we can return it directly
  // The function exists mainly for documentation and potential future validation
  return viewId;
}

export function ensureListViewReady(
  viewId: ViewId,
  sectionId: GroupId | undefined,
  get: Getter,
  set: Setter,
) {
  const viewStates = get(viewStatesAtom);
  const viewState = getViewStateOrDefault(viewStates, viewId);
  const nextCollapsed =
    sectionId && viewState.collapsedSections
      ? viewState.collapsedSections.filter((id) => id !== sectionId)
      : viewState.collapsedSections;

  const updates: Partial<ReturnType<typeof getViewStateOrDefault>> = {};
  if (viewState.viewMode !== "list") {
    updates.viewMode = "list";
  }
  if (nextCollapsed !== viewState.collapsedSections) {
    updates.collapsedSections = nextCollapsed;
  }
  if (Object.keys(updates).length > 0) {
    set(updateViewStateAtom, {
      viewId,
      updates,
    });
  }
}

/**
 * Ensures the focused task is present in a task list even if filters would hide it.
 */
export function includeFocusedTask(
  tasks: Task[],
  baseTasks: Task[],
  focusVisibility: TaskFocusVisibility | null,
  selectedTaskId: TaskId | null,
  viewId: ViewId,
): Task[] {
  const hasActiveFocus =
    focusVisibility &&
    (!selectedTaskId || selectedTaskId === focusVisibility.taskId);

  if (!hasActiveFocus || focusVisibility.viewId !== viewId) return tasks;

  const alreadyPresent = tasks.some(
    (task) => task.id === focusVisibility.taskId,
  );
  if (alreadyPresent) return tasks;

  const focusedTask = baseTasks.find(
    (task) => task.id === focusVisibility.taskId,
  );
  return focusedTask ? [focusedTask, ...tasks] : tasks;
}

export const taskFocusVisibilityAtom = atom<TaskFocusVisibility | null>(null);

export const taskFocusRequestAtom = atom<TaskFocusRequest | null>(null);

export const clearTaskFocusRequestAtom = atom(null, (get, set) => {
  const visibility = get(taskFocusVisibilityAtom);
  const selectedTaskId = get(selectedTaskIdAtom);

  set(taskFocusRequestAtom, null);
  if (visibility && visibility.taskId !== selectedTaskId) {
    set(taskFocusVisibilityAtom, null);
  }
});

export const focusTaskActionAtom = atom(null, (get, set, taskId: TaskId) => {
  const tasks = get(tasksAtom);
  const projects = get(projectsAtom);
  const labels = get(labelsAtom);
  const groups = get(allGroupsAtom);
  const currentRoute = get(currentRouteContextAtom);

  const task = tasks.find((t) => t.id === taskId);
  if (!task) {
    return;
  }

  const candidates = buildFocusCandidates({
    task,
    currentRoute,
    projects,
    labels,
    groups,
  });

  const target = candidates[0];
  if (!target) {
    return;
  }

  const visibility: TaskFocusVisibility = {
    taskId,
    viewId: sanitizeViewId(String(target.route.viewId)),
    routeType: target.route.routeType,
    sectionId: target.sectionId,
  };

  if (
    target.route.routeType === "project" ||
    target.route.routeType === "standard" ||
    target.route.routeType === "label" ||
    target.route.routeType === "projectgroup"
  ) {
    ensureListViewReady(visibility.viewId, visibility.sectionId, get, set);
  }

  set(taskFocusVisibilityAtom, visibility);
  set(taskFocusRequestAtom, {
    taskId,
    targetPath: target.path,
    route: target.route,
    sectionId: target.sectionId,
    createdAt: Date.now(),
    reason: target.reason,
  });
});
