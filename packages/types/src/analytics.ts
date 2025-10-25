/**
 * Analytics Types
 *
 * Productivity metrics, trends, and analytics data structures.
 */

import type { ProjectId, TaskId } from "./id";

/**
 * Overall productivity metrics for a given time period
 */
export interface ProductivityMetrics {
  /** Number of tasks completed in the period */
  tasksCompleted: number;
  /** Number of tasks created in the period */
  tasksCreated: number;
  /** Completion rate as a percentage */
  completionRate: number;
  /** Average time to complete tasks in minutes */
  averageCompletionTime: number;
  /** Current completion streak in days */
  streak: number;
  /** Overall productivity score (0-100) */
  productivityScore: number;
  /** Total focus time in minutes */
  focusTime: number;
  /** Number of overdue tasks */
  overdueCount: number;
}

/**
 * Trend data point for analytics charts
 */
export interface TrendData {
  /** Date label for the data point */
  date: string;
  /** Number of tasks completed on this date */
  completed: number;
  /** Number of tasks created on this date */
  created: number;
  /** Focus time in minutes for this date */
  focusTime: number;
  /** Productivity score for this date */
  productivityScore: number;
}

/**
 * Analytics data for a specific project
 */
export interface ProjectAnalytics {
  /** Project ID */
  projectId: ProjectId;
  /** Project name */
  projectName: string;
  /** Number of completed tasks in the project */
  tasksCompleted: number;
  /** Total number of tasks in the project */
  tasksTotal: number;
  /** Completion rate as a percentage */
  completionRate: number;
  /** Average time spent per task in minutes */
  averageTimeSpent: number;
  /** Project color */
  color: string;
}

/**
 * Analytics data for a specific label
 */
export interface LabelAnalytics {
  /** Label name */
  labelName: string;
  /** Number of completed tasks with this label */
  tasksCompleted: number;
  /** Total number of tasks with this label */
  tasksTotal: number;
  /** Completion rate as a percentage */
  completionRate: number;
  /** Label color */
  color: string;
}

/**
 * Time of day analytics data point
 */
export interface TimeOfDayData {
  /** Hour of the day (0-23) */
  hour: number;
  /** Number of tasks completed in this hour */
  completed: number;
  /** Number of tasks created in this hour */
  created: number;
}

/**
 * Focus session data
 */
export interface FocusSession {
  /** When the focus session occurred */
  date: Date;
  /** Duration of the session in minutes */
  duration: number;
  /** Optional task ID if session was for a specific task */
  taskId?: TaskId;
}
