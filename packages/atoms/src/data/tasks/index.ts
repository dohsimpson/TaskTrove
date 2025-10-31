/**
 * Task data utilities
 *
 * Pure functions and atoms for task data manipulation and filtering
 */

export {
  getOrderedTasksForProject,
  getOrderedTasksForSection,
  moveTaskWithinSection,
  addTaskToSection,
  removeTaskFromSection,
  // Deprecated - will be removed in future refactoring
  moveTaskWithinProject,
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
  autoRolloverTasksAtom,
  projectGroupTasksAtom,
  baseFilteredTasksAtom,
} from "./filters";
