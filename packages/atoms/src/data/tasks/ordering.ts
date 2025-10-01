import type {
  Task,
  TaskId,
  ProjectId,
  GroupId,
  Project,
  ProjectSection,
} from "@tasktrove/types";

/**
 * Gets ordered tasks for a specific section.
 * Simply maps section.items to tasks in order.
 *
 * @param section - Section containing task IDs in items array
 * @param tasks - Array of all tasks
 * @returns Array of tasks in section order
 */
export function getOrderedTasksForSection(
  section: ProjectSection,
  tasks: Task[],
): Task[] {
  const taskMap = new Map(tasks.map((task) => [task.id, task]));
  return section.items
    .map((taskId) => taskMap.get(taskId))
    .filter((task): task is Task => task !== undefined);
}

/**
 * Gets ordered tasks for a specific project.
 * Iterates through all sections to collect tasks in order.
 *
 * @param projectId - ID of the project to get tasks for
 * @param tasks - Array of all tasks
 * @param projects - Array of all projects
 * @returns Array of tasks in the correct order for the project
 */
export function getOrderedTasksForProject(
  projectId: ProjectId,
  tasks: Task[],
  projects: Project[],
): Task[] {
  const project = projects.find((p) => p.id === projectId);
  if (!project) return [];

  const taskMap = new Map(tasks.map((task) => [task.id, task]));
  const orderedTasks: Task[] = [];

  for (const section of project.sections) {
    for (const taskId of section.items) {
      const task = taskMap.get(taskId);
      if (task && task.projectId === projectId) {
        orderedTasks.push(task);
      }
    }
  }

  return orderedTasks;
}

/**
 * Moves a task to a new position within a section.
 * Updates the section's items array to reflect the new position.
 *
 * @param sectionId - ID of the section containing the task
 * @param taskId - ID of the task to move
 * @param toIndex - Target index for the task (0-based)
 * @param sections - Array of all sections in the project
 * @returns Updated sections array with modified items
 */
export function moveTaskWithinSection(
  sectionId: GroupId,
  taskId: TaskId,
  toIndex: number,
  sections: ProjectSection[],
): ProjectSection[] {
  return sections.map((section) => {
    if (section.id !== sectionId) return section;

    const items = [...section.items];
    const currentIndex = items.indexOf(taskId);
    if (currentIndex === -1) return section;

    items.splice(currentIndex, 1);
    items.splice(toIndex, 0, taskId);

    return { ...section, items };
  });
}

/**
 * Adds a task to a section's items array.
 * If the task is already in the section, does nothing.
 * Can insert at a specific position or append to the end.
 *
 * @param taskId - ID of the task to add
 * @param sectionId - ID of the section to add the task to
 * @param position - Optional position to insert at (0-based). If undefined, appends to end
 * @param sections - Array of all sections in the project
 * @returns Updated sections array with task added to items
 */
export function addTaskToSection(
  taskId: TaskId,
  sectionId: GroupId,
  position: number | undefined,
  sections: ProjectSection[],
): ProjectSection[] {
  return sections.map((section) => {
    if (section.id !== sectionId) return section;

    const items = [...section.items];
    if (items.includes(taskId)) return section; // Already in section

    if (position === undefined) {
      items.push(taskId);
    } else {
      // Normalize negative indices to 0 (beginning of array)
      // This handles the case where getReorderDestinationIndex returns -1
      // to indicate "insert at beginning"
      const normalizedPosition = position < 0 ? 0 : position;
      items.splice(normalizedPosition, 0, taskId);
    }

    return { ...section, items };
  });
}

/**
 * Removes a task from a section's items array.
 * This is typically called when a task is deleted or moved to a different section.
 *
 * @param taskId - ID of the task to remove
 * @param sectionId - ID of the section to remove the task from
 * @param sections - Array of all sections in the project
 * @returns Updated sections array with task removed from items
 */
export function removeTaskFromSection(
  taskId: TaskId,
  sectionId: GroupId,
  sections: ProjectSection[],
): ProjectSection[] {
  return sections.map((section) => {
    if (section.id !== sectionId) return section;

    const items = section.items.filter((id) => id !== taskId);
    return { ...section, items };
  });
}

/**
 * @deprecated This function has been removed. Sections now own task ordering via items array.
 * Task reordering should be done via moveTaskWithinSection on section.items.
 */
export function moveTaskWithinProject(
  _projectId: ProjectId,
  _taskId: TaskId,
  _toIndex: number,
  projects: Project[],
): Project[] {
  throw new Error(
    "moveTaskWithinProject is deprecated. Use moveTaskWithinSection with section.items instead.",
  );
  return projects;
}

/**
 * @deprecated This function has been removed. Sections now own task ordering via items array.
 * Use addTaskToSection to add tasks to section.items.
 */
export function addTaskToProjectOrder(
  _taskId: TaskId,
  _projectId: ProjectId,
  _position: number | undefined,
  projects: Project[],
): Project[] {
  throw new Error(
    "addTaskToProjectOrder is deprecated. Use addTaskToSection with section.items instead.",
  );
  return projects;
}

/**
 * @deprecated This function has been removed. Sections now own task ordering via items array.
 * Use removeTaskFromSection to remove tasks from section.items.
 */
export function removeTaskFromProjectOrder(
  _taskId: TaskId,
  _projectId: ProjectId,
  projects: Project[],
): Project[] {
  throw new Error(
    "removeTaskFromProjectOrder is deprecated. Use removeTaskFromSection with section.items instead.",
  );
  return projects;
}

/**
 * Utility object exporting all task ordering functions for easy access.
 */
export const taskOrderingUtils = {
  getOrderedTasksForProject,
  getOrderedTasksForSection,
  moveTaskWithinSection,
  addTaskToSection,
  removeTaskFromSection,
};
