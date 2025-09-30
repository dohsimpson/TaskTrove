import type {
  Task,
  TaskId,
  ProjectId,
  SectionId,
  Project,
} from "@tasktrove/types";
import { DEFAULT_UUID } from "@tasktrove/constants";

/**
 * Gets ordered tasks for a specific project.
 * Uses project.taskOrder if available to maintain custom ordering,
 * otherwise returns all tasks belonging to the project.
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
  if (!project?.taskOrder || project.taskOrder.length === 0) {
    return tasks.filter((task) => task.projectId === projectId);
  }

  const taskMap = new Map(tasks.map((task) => [task.id, task]));
  const orderedTasks = project.taskOrder
    .map((taskId) => taskMap.get(taskId))
    .filter(
      (task): task is Task =>
        task !== undefined && task.projectId === projectId,
    );

  return orderedTasks;
}

/**
 * Moves a task to a new position within its project.
 * Updates the project's taskOrder array to reflect the new position.
 *
 * @param projectId - ID of the project containing the task
 * @param taskId - ID of the task to move
 * @param toIndex - Target index for the task (0-based)
 * @param projects - Array of all projects
 * @returns Updated projects array with modified taskOrder
 */
export function moveTaskWithinProject(
  projectId: ProjectId,
  taskId: TaskId,
  toIndex: number,
  projects: Project[],
): Project[] {
  return projects.map((project) => {
    if (project.id !== projectId) return project;

    const taskOrder = project.taskOrder || [];
    const currentIndex = taskOrder.indexOf(taskId);
    if (currentIndex === -1) return project;

    const newTaskOrder = [...taskOrder];
    newTaskOrder.splice(currentIndex, 1);
    newTaskOrder.splice(toIndex, 0, taskId);

    return { ...project, taskOrder: newTaskOrder };
  });
}

/**
 * Section-aware task reordering that maintains section boundaries.
 * Reorders a task within its section while preserving the project's global task order structure.
 *
 * This function ensures that:
 * 1. Tasks can only be reordered within their own section
 * 2. Section boundaries are maintained in the project's global taskOrder
 * 3. Tasks not yet in taskOrder are added while maintaining section grouping
 *
 * @param projectId - ID of the project containing the task
 * @param taskId - ID of the task to move
 * @param toIndex - Target index within the section (0-based)
 * @param sectionId - ID of the section containing the task
 * @param projects - Array of all projects
 * @param tasks - Array of all tasks
 * @returns Updated projects array with modified taskOrder
 */
export function moveTaskWithinSection(
  projectId: ProjectId,
  taskId: TaskId,
  toIndex: number,
  sectionId: SectionId,
  projects: Project[],
  tasks: Task[],
): Project[] {
  return projects.map((project) => {
    if (project.id !== projectId) return project;

    const taskOrder = project.taskOrder || [];

    // Get all tasks in the target section, ordered by current project taskOrder
    const sectionTasks = tasks
      .filter((task) => {
        // Handle DEFAULT_UUID section compatibility
        const taskSection = task.sectionId || DEFAULT_UUID;
        const targetSection = sectionId || DEFAULT_UUID;
        return task.projectId === projectId && taskSection === targetSection;
      })
      .sort((a, b) => {
        const aIndex = taskOrder.indexOf(a.id);
        const bIndex = taskOrder.indexOf(b.id);

        // If both are in taskOrder, maintain that order
        if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;

        // If only one is in taskOrder, it comes first
        if (aIndex !== -1) return -1;
        if (bIndex !== -1) return 1;

        // Neither in taskOrder, maintain creation order
        return a.createdAt.getTime() - b.createdAt.getTime();
      });

    const sectionTaskIds = sectionTasks.map((task) => task.id);
    const currentIndexInSection = sectionTaskIds.indexOf(taskId);

    if (currentIndexInSection === -1) return project;

    // Reorder within the section
    const newSectionOrder = [...sectionTaskIds];
    newSectionOrder.splice(currentIndexInSection, 1);
    newSectionOrder.splice(toIndex, 0, taskId);

    // Rebuild the project's taskOrder by replacing section tasks with new order
    const newTaskOrder = [...taskOrder];

    // Find positions of section tasks in global order
    const sectionPositions = sectionTaskIds
      .map((id) => newTaskOrder.indexOf(id))
      .filter((pos) => pos !== -1);

    if (sectionPositions.length > 0) {
      // Remove all section tasks from their current positions
      sectionTaskIds.forEach((id) => {
        const index = newTaskOrder.indexOf(id);
        if (index !== -1) newTaskOrder.splice(index, 1);
      });

      // Insert reordered section tasks at the earliest position
      const insertPosition = Math.min(...sectionPositions);
      newTaskOrder.splice(insertPosition, 0, ...newSectionOrder);
    } else {
      // Section tasks aren't in global order yet, add them at the end
      newTaskOrder.push(...newSectionOrder);
    }

    return { ...project, taskOrder: newTaskOrder };
  });
}

/**
 * Adds a task to a project's taskOrder array.
 * If the task is already in the order, does nothing.
 * Can insert at a specific position or append to the end.
 *
 * @param taskId - ID of the task to add
 * @param projectId - ID of the project to add the task to
 * @param position - Optional position to insert at (0-based). If undefined, appends to end
 * @param projects - Array of all projects
 * @returns Updated projects array with task added to taskOrder
 */
export function addTaskToProjectOrder(
  taskId: TaskId,
  projectId: ProjectId,
  position: number | undefined,
  projects: Project[],
): Project[] {
  return projects.map((project) => {
    if (project.id !== projectId) return project;

    const taskOrder = project.taskOrder || [];
    if (taskOrder.includes(taskId)) return project;

    const newTaskOrder = [...taskOrder];
    if (position === undefined) {
      newTaskOrder.push(taskId);
    } else {
      newTaskOrder.splice(position, 0, taskId);
    }

    return { ...project, taskOrder: newTaskOrder };
  });
}

/**
 * Removes a task from a project's taskOrder array.
 * This is typically called when a task is deleted or moved to a different project.
 *
 * @param taskId - ID of the task to remove
 * @param projectId - ID of the project to remove the task from
 * @param projects - Array of all projects
 * @returns Updated projects array with task removed from taskOrder
 */
export function removeTaskFromProjectOrder(
  taskId: TaskId,
  projectId: ProjectId,
  projects: Project[],
): Project[] {
  return projects.map((project) => {
    if (project.id !== projectId) return project;

    const taskOrder = project.taskOrder || [];
    const filteredOrder = taskOrder.filter((id) => id !== taskId);

    return { ...project, taskOrder: filteredOrder };
  });
}

/**
 * Utility object exporting all task ordering functions for easy access.
 */
export const taskOrderingUtils = {
  getOrderedTasksForProject,
  moveTaskWithinProject,
  moveTaskWithinSection,
  addTaskToProjectOrder,
  removeTaskFromProjectOrder,
};
