/**
 * Task data utilities
 *
 * Pure functions and atoms for task data manipulation and filtering
 */

export {
  getOrderedTasksForProject,
  moveTaskWithinProject,
  moveTaskWithinSection,
  addTaskToProjectOrder,
  removeTaskFromProjectOrder,
  taskOrderingUtils,
} from "./ordering";

export {
  activeTasksAtom,
  inboxTasksAtom,
  todayTasksAtom,
  upcomingTasksAtom,
  calendarTasksAtom,
  overdueTasksAtom,
  completedTasksAtom,
  projectGroupTasksAtom,
  baseFilteredTasksForViewAtom,
} from "./filters";
