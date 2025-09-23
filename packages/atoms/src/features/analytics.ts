import { atom } from "jotai";
import {
  startOfDay,
  endOfDay,
  subDays,
  format,
  startOfWeek,
  endOfWeek,
} from "date-fns";
import { createAtomWithStorage, handleAtomError } from "../utils/atom-helpers";
import { tasksAtom } from "../core/tasks";
import { projectsAtom } from "../core/projects";
import { labelsAtom } from "../core/labels";
import {
  ProductivityMetrics,
  TrendData,
  ProjectAnalytics,
  LabelAnalytics,
  TimeOfDayData,
  FocusSession,
  TimePeriod,
  Task,
  Project,
  Label,
  createTaskId,
} from "@tasktrove/types";

/**
 * Analytics atoms for TaskTrove Jotai migration
 *
 * Migrated from the useAnalytics hook (242 lines) with complete preservation
 * of all calculation logic and algorithms. Provides reactive analytics that
 * automatically update when tasks, projects, or labels change.
 */

// =============================================================================
// BASE ATOMS
// =============================================================================

/**
 * Current date range selection for analytics
 * Persisted to localStorage for user preference
 */
export const dateRangeAtom = createAtomWithStorage<TimePeriod>(
  "analytics-date-range",
  "week",
);
dateRangeAtom.debugLabel = "dateRangeAtom";

/**
 * Focus sessions array with persistence
 * Stores all focus session data for productivity tracking
 */
export const focusSessionsAtom = createAtomWithStorage<FocusSession[]>(
  "analytics-focus-sessions",
  [],
);
focusSessionsAtom.debugLabel = "focusSessionsAtom";

// =============================================================================
// UTILITY FUNCTIONS (FROM ORIGINAL HOOK)
// =============================================================================

/**
 * Calculate date range based on selected period
 * Preserves exact logic from useAnalytics.getDateRange()
 */
const getDateRange = (dateRange: TimePeriod) => {
  const now = new Date();
  switch (dateRange) {
    case "today":
      return { start: startOfDay(now), end: endOfDay(now) };
    case "week":
      return { start: startOfWeek(now), end: endOfWeek(now) };
    case "month":
      return { start: subDays(now, 30), end: now };
    case "year":
      return { start: subDays(now, 365), end: now };
  }
};

// =============================================================================
// DERIVED ANALYTICS ATOMS
// =============================================================================

/**
 * Current productivity metrics for the selected date range
 * Implements exact calculation logic from useAnalytics.currentMetrics
 */
export const currentMetricsAtom = atom<ProductivityMetrics>((get) => {
  try {
    const tasks = get(tasksAtom);
    const dateRange = get(dateRangeAtom);
    const focusSessions = get(focusSessionsAtom);

    const { start, end } = getDateRange(dateRange);
    const periodTasks = tasks.filter(
      (task: Task) => task.createdAt >= start && task.createdAt <= end,
    );
    const completedTasks = periodTasks.filter(
      (task: Task) => task.completed && task.completedAt,
    );
    const overdueTasks = tasks.filter(
      (task: Task) =>
        !task.completed && task.dueDate && task.dueDate < new Date(),
    );

    const completionRate =
      periodTasks.length > 0
        ? (completedTasks.length / periodTasks.length) * 100
        : 0;
    const averageCompletionTime =
      completedTasks.length > 0
        ? completedTasks.reduce(
            (acc: number, task: Task) => acc + (task.timeSpent || 0),
            0,
          ) / completedTasks.length
        : 0;

    // Calculate streak (exact algorithm from useAnalytics)
    let streak = 0;
    let currentDate = new Date();
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    while (true) {
      const dayTasks = tasks.filter(
        (task: Task) =>
          task.completedAt &&
          task.completedAt >= startOfDay(currentDate) &&
          task.completedAt <= endOfDay(currentDate),
      );
      if (dayTasks.length === 0) break;
      streak++;
      currentDate = subDays(currentDate, 1);
    }

    // Calculate productivity score (0-100)
    const baseScore = Math.min(completionRate, 100);
    const streakBonus = Math.min(streak * 2, 20);
    const priorityBonus =
      completedTasks.filter((task: Task) => task.priority <= 2).length * 5;
    const productivityScore = Math.min(
      baseScore + streakBonus + priorityBonus,
      100,
    );

    const focusTime = focusSessions
      .filter((session) => session.date >= start && session.date <= end)
      .reduce((acc, session) => acc + session.duration, 0);

    return {
      tasksCompleted: completedTasks.length,
      tasksCreated: periodTasks.length,
      completionRate,
      averageCompletionTime,
      streak,
      productivityScore,
      focusTime,
      overdueCount: overdueTasks.length,
    };
  } catch (error) {
    handleAtomError(error, "currentMetricsAtom");
    return {
      tasksCompleted: 0,
      tasksCreated: 0,
      completionRate: 0,
      averageCompletionTime: 0,
      streak: 0,
      productivityScore: 0,
      focusTime: 0,
      overdueCount: 0,
    };
  }
});
currentMetricsAtom.debugLabel = "currentMetricsAtom";

/**
 * Trend data for analytics charts
 * Implements exact algorithm from useAnalytics.trendData
 */
export const trendDataAtom = atom<TrendData[]>((get) => {
  try {
    const tasks = get(tasksAtom);
    const dateRange = get(dateRangeAtom);
    const focusSessions = get(focusSessionsAtom);

    const days =
      dateRange === "today"
        ? 1
        : dateRange === "week"
          ? 7
          : dateRange === "month"
            ? 30
            : 365;
    const data: TrendData[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dayStart = startOfDay(date);
      const dayEnd = endOfDay(date);

      const completed = tasks.filter(
        (task: Task) =>
          task.completedAt &&
          task.completedAt >= dayStart &&
          task.completedAt <= dayEnd,
      ).length;

      const created = tasks.filter(
        (task: Task) => task.createdAt >= dayStart && task.createdAt <= dayEnd,
      ).length;

      const dayFocusTime = focusSessions
        .filter((session) => session.date >= dayStart && session.date <= dayEnd)
        .reduce((acc, session) => acc + session.duration, 0);

      // Simple productivity score for the day
      const dayProductivityScore =
        completed > 0 ? Math.min(completed * 10 + dayFocusTime / 10, 100) : 0;

      data.push({
        date: format(date, dateRange === "year" ? "MMM" : "MMM d"),
        completed,
        created,
        focusTime: dayFocusTime,
        productivityScore: dayProductivityScore,
      });
    }

    return data;
  } catch (error) {
    handleAtomError(error, "trendDataAtom");
    return [];
  }
});
trendDataAtom.debugLabel = "trendDataAtom";

/**
 * Project analytics with completion rates and time spent
 * Implements exact algorithm from useAnalytics.projectAnalytics
 */
export const projectAnalyticsAtom = atom<ProjectAnalytics[]>((get) => {
  try {
    const tasks = get(tasksAtom);
    const projects = get(projectsAtom);

    return projects.map((project: Project) => {
      const projectTasks = tasks.filter(
        (task: Task) => task.projectId === project.id,
      );
      const completedTasks = projectTasks.filter(
        (task: Task) => task.completed,
      );
      const completionRate =
        projectTasks.length > 0
          ? (completedTasks.length / projectTasks.length) * 100
          : 0;
      const averageTimeSpent =
        completedTasks.length > 0
          ? completedTasks.reduce(
              (acc: number, task: Task) => acc + (task.timeSpent || 0),
              0,
            ) / completedTasks.length
          : 0;

      return {
        projectId: project.id,
        projectName: project.name,
        tasksCompleted: completedTasks.length,
        tasksTotal: projectTasks.length,
        completionRate,
        averageTimeSpent,
        color: project.color,
      };
    });
  } catch (error) {
    handleAtomError(error, "projectAnalyticsAtom");
    return [];
  }
});
projectAnalyticsAtom.debugLabel = "projectAnalyticsAtom";

/**
 * Label analytics with usage and completion rates
 * Implements exact algorithm from useAnalytics.labelAnalytics
 */
export const labelAnalyticsAtom = atom<LabelAnalytics[]>((get) => {
  try {
    const tasks = get(tasksAtom);
    const labels = get(labelsAtom);

    const labelMap = new Map<
      string,
      { completed: number; total: number; color: string }
    >();

    tasks.forEach((task: Task) => {
      task.labels.forEach((labelName: string) => {
        const label = labels.find((l: Label) => l.name === labelName);
        const current = labelMap.get(labelName) || {
          completed: 0,
          total: 0,
          color: label?.color || "#gray",
        };
        current.total++;
        if (task.completed) current.completed++;
        labelMap.set(labelName, current);
      });
    });

    return Array.from(labelMap.entries()).map(([labelName, data]) => ({
      labelName,
      tasksCompleted: data.completed,
      tasksTotal: data.total,
      completionRate: data.total > 0 ? (data.completed / data.total) * 100 : 0,
      color: data.color,
    }));
  } catch (error) {
    handleAtomError(error, "labelAnalyticsAtom");
    return [];
  }
});
labelAnalyticsAtom.debugLabel = "labelAnalyticsAtom";

/**
 * Time of day analytics showing hourly task completion/creation patterns
 * Implements exact algorithm from useAnalytics.timeOfDayData
 */
export const timeOfDayDataAtom = atom<TimeOfDayData[]>((get) => {
  try {
    const tasks = get(tasksAtom);

    const hourlyData = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      completed: 0,
      created: 0,
    }));

    tasks.forEach((task: Task) => {
      if (task.completedAt) {
        const hour = task.completedAt.getHours();
        const hourData = hourlyData[hour];
        if (hourData) {
          hourData.completed++;
        }
      }
      const createdHour = task.createdAt.getHours();
      const createdHourData = hourlyData[createdHour];
      if (createdHourData) {
        createdHourData.created++;
      }
    });

    return hourlyData;
  } catch (error) {
    handleAtomError(error, "timeOfDayDataAtom");
    return Array.from({ length: 24 }, (_, hour) => ({
      hour,
      completed: 0,
      created: 0,
    }));
  }
});
timeOfDayDataAtom.debugLabel = "timeOfDayDataAtom";

// =============================================================================
// ACTION ATOMS
// =============================================================================

/**
 * Adds a new focus session
 * Implements exact logic from useAnalytics.addFocusSession
 */
export const addFocusSessionAtom = atom(
  null,
  (get, set, sessionData: { duration: number; taskId?: string }) => {
    try {
      const currentSessions = get(focusSessionsAtom);
      const newSession: FocusSession = {
        date: new Date(),
        duration: sessionData.duration,
        taskId: sessionData.taskId
          ? createTaskId(sessionData.taskId)
          : undefined,
      };

      set(focusSessionsAtom, [...currentSessions, newSession]);
    } catch (error) {
      handleAtomError(error, "addFocusSessionAtom");
    }
  },
);
addFocusSessionAtom.debugLabel = "addFocusSessionAtom";

/**
 * Changes the current date range for analytics
 * Updates the persisted date range preference
 */
export const setDateRangeAtom = atom(
  null,
  (get, set, newDateRange: TimePeriod) => {
    try {
      set(dateRangeAtom, newDateRange);
    } catch (error) {
      handleAtomError(error, "setDateRangeAtom");
    }
  },
);
setDateRangeAtom.debugLabel = "setDateRangeAtom";

/**
 * Clears all analytics data
 * Resets focus sessions while preserving date range preference
 */
export const clearAnalyticsDataAtom = atom(null, (get, set) => {
  try {
    set(focusSessionsAtom, []);
    // Note: We don't clear tasks/projects/labels as they're managed by their own atoms
    // Only clear analytics-specific data (focus sessions)
  } catch (error) {
    handleAtomError(error, "clearAnalyticsDataAtom");
  }
});
clearAnalyticsDataAtom.debugLabel = "clearAnalyticsDataAtom";

// =============================================================================
// EXPORTS
// =============================================================================

/**
 * Complete analytics atoms export
 * Organized by functionality for easy imports and better developer experience
 */
export const analyticsAtoms = {
  // Base atoms
  dateRange: dateRangeAtom,
  focusSessions: focusSessionsAtom,

  // Derived analytics atoms
  derived: {
    currentMetrics: currentMetricsAtom,
    trendData: trendDataAtom,
    projectAnalytics: projectAnalyticsAtom,
    labelAnalytics: labelAnalyticsAtom,
    timeOfDayData: timeOfDayDataAtom,
  },

  // Action atoms
  actions: {
    addFocusSession: addFocusSessionAtom,
    setDateRange: setDateRangeAtom,
    clearAnalyticsData: clearAnalyticsDataAtom,
  },
} as const;
