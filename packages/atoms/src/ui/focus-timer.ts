import { atom } from "jotai";
import type { Task } from "@tasktrove/types/core";
import type { TaskId } from "@tasktrove/types/id";
import { createAtomWithStorage } from "@tasktrove/atoms/utils/atom-helpers";
import { tasksAtom } from "@tasktrove/atoms/data/base/atoms";

/**
 * Focus timer state atoms for TaskTrove
 *
 * This module manages simple count-up focus timers for tasks.
 * Unlike Pomodoro timers, focus timers simply count elapsed time from start.
 */

// =============================================================================
// BASE FOCUS TIMER STATE
// =============================================================================

/**
 * Individual focus timer data
 */
export interface FocusTimer {
  /** ID of the task being tracked */
  taskId: TaskId;
  /** ISO timestamp when timer was started */
  startedAt: string;
  /** ISO timestamp when timer was paused (if paused) */
  pausedAt?: string;
  /** Accumulated elapsed time in milliseconds (for pause/resume functionality) */
  elapsed: number;
}

/**
 * Focus timer state
 */
export interface FocusTimerState {
  /** Array of active focus timers (currently limited to 1, but designed for future multiple timers) */
  activeTimers: FocusTimer[];
}

/**
 * Default focus timer state
 */
const defaultFocusTimerState: FocusTimerState = {
  activeTimers: [],
};

/**
 * Main focus timer state atom with localStorage persistence
 */
export const focusTimerStateAtom = createAtomWithStorage<FocusTimerState>(
  "focus-timer-state",
  defaultFocusTimerState,
);
focusTimerStateAtom.debugLabel = "focusTimerStateAtom";

// =============================================================================
// DERIVED READ ATOMS
// =============================================================================

/**
 * Get the currently active focus timer (since we only support 1 for now)
 */
export const activeFocusTimerAtom = atom<FocusTimer | null>((get) => {
  const state = get(focusTimerStateAtom);
  return state.activeTimers[0] || null;
});
activeFocusTimerAtom.debugLabel = "activeFocusTimerAtom";

/**
 * Get the task associated with the active focus timer
 * Similar to selectedTaskAtom pattern - derives task from active timer's taskId
 */
export const activeFocusTaskAtom = atom<Task | null>((get) => {
  const activeTimer = get(activeFocusTimerAtom);
  if (!activeTimer) return null;

  const tasks = get(tasksAtom);
  return tasks.find((task: Task) => task.id === activeTimer.taskId) || null;
});
activeFocusTaskAtom.debugLabel = "activeFocusTaskAtom";

/**
 * Check if a specific task has an active timer
 */
export const isTaskTimerActiveAtom = atom(
  (get) =>
    (taskId: TaskId): boolean => {
      const state = get(focusTimerStateAtom);
      return state.activeTimers.some((timer) => timer.taskId === taskId);
    },
);
isTaskTimerActiveAtom.debugLabel = "isTaskTimerActiveAtom";

/**
 * Check if any timer is currently running
 */
export const isAnyTimerRunningAtom = atom<boolean>((get) => {
  const state = get(focusTimerStateAtom);
  return state.activeTimers.some((timer) => !timer.pausedAt);
});
isAnyTimerRunningAtom.debugLabel = "isAnyTimerRunningAtom";

/**
 * Tick atom that updates every second - used to trigger real-time updates
 */
export const focusTimerTickAtom = atom(0);
focusTimerTickAtom.debugLabel = "focusTimerTickAtom";

/**
 * Get current elapsed time for active timer
 */
export const currentFocusTimerElapsedAtom = atom<number>((get) => {
  const activeTimer = get(activeFocusTimerAtom);
  if (!activeTimer) return 0;

  // Get tick to force updates when timer is running
  if (!activeTimer.pausedAt) {
    get(focusTimerTickAtom);
  }

  const startTime = new Date(activeTimer.startedAt).getTime();
  const now = Date.now();

  if (activeTimer.pausedAt) {
    // Timer is paused - return elapsed time up to pause point
    const pauseTime = new Date(activeTimer.pausedAt).getTime();
    return activeTimer.elapsed + (pauseTime - startTime);
  } else {
    // Timer is running - return current elapsed time
    return activeTimer.elapsed + (now - startTime);
  }
});
currentFocusTimerElapsedAtom.debugLabel = "currentFocusTimerElapsedAtom";

/**
 * Format current elapsed time as H:MM:SS
 */
export const focusTimerDisplayAtom = atom<string>((get) => {
  const elapsedMs = get(currentFocusTimerElapsedAtom);
  return formatElapsedTime(elapsedMs);
});
focusTimerDisplayAtom.debugLabel = "focusTimerDisplayAtom";

/**
 * Get status of active focus timer
 */
export const focusTimerStatusAtom = atom<"stopped" | "running" | "paused">(
  (get) => {
    const activeTimer = get(activeFocusTimerAtom);
    if (!activeTimer) return "stopped";
    return activeTimer.pausedAt ? "paused" : "running";
  },
);
focusTimerStatusAtom.debugLabel = "focusTimerStatusAtom";

// =============================================================================
// WRITE-ONLY ACTION ATOMS
// =============================================================================

/**
 * Start focus timer for a task
 */
export const startFocusTimerAtom = atom(null, (get, set, taskId: TaskId) => {
  const currentState = get(focusTimerStateAtom);

  // Check if timer already exists for this task
  const existingTimerIndex = currentState.activeTimers.findIndex(
    (timer) => timer.taskId === taskId,
  );

  if (existingTimerIndex >= 0) {
    // Resume existing timer
    const existingTimer = currentState.activeTimers[existingTimerIndex];
    if (!existingTimer) return;
    if (existingTimer.pausedAt) {
      // Calculate elapsed time up to pause point
      const startTime = new Date(existingTimer.startedAt).getTime();
      const pauseTime = new Date(existingTimer.pausedAt).getTime();
      const newElapsed = existingTimer.elapsed + (pauseTime - startTime);

      const updatedTimer: FocusTimer = {
        ...existingTimer,
        startedAt: new Date().toISOString(),
        pausedAt: undefined,
        elapsed: newElapsed,
      };

      const newTimers = [...currentState.activeTimers];
      newTimers[existingTimerIndex] = updatedTimer;

      set(focusTimerStateAtom, {
        ...currentState,
        activeTimers: newTimers,
      });
    }
    return;
  }

  // For now, only allow one timer at a time
  if (currentState.activeTimers.length > 0) {
    // Stop existing timer before starting new one
    set(focusTimerStateAtom, {
      activeTimers: [],
    });
  }

  // Create new timer
  const newTimer: FocusTimer = {
    taskId,
    startedAt: new Date().toISOString(),
    elapsed: 0,
  };

  set(focusTimerStateAtom, {
    ...currentState,
    activeTimers: [newTimer],
  });
});
startFocusTimerAtom.debugLabel = "startFocusTimerAtom";

/**
 * Pause focus timer for a task
 */
export const pauseFocusTimerAtom = atom(null, (get, set, taskId: TaskId) => {
  const currentState = get(focusTimerStateAtom);
  const timerIndex = currentState.activeTimers.findIndex(
    (timer) => timer.taskId === taskId && !timer.pausedAt,
  );

  if (timerIndex === -1) return;

  const timer = currentState.activeTimers[timerIndex];
  if (!timer) return;
  const updatedTimer: FocusTimer = {
    ...timer,
    pausedAt: new Date().toISOString(),
  };

  const newTimers = [...currentState.activeTimers];
  newTimers[timerIndex] = updatedTimer;

  set(focusTimerStateAtom, {
    ...currentState,
    activeTimers: newTimers,
  });
});
pauseFocusTimerAtom.debugLabel = "pauseFocusTimerAtom";

/**
 * Stop focus timer for a task
 */
export const stopFocusTimerAtom = atom(null, (get, set, taskId: TaskId) => {
  const currentState = get(focusTimerStateAtom);
  const newTimers = currentState.activeTimers.filter(
    (timer) => timer.taskId !== taskId,
  );

  set(focusTimerStateAtom, {
    ...currentState,
    activeTimers: newTimers,
  });
});
stopFocusTimerAtom.debugLabel = "stopFocusTimerAtom";

/**
 * Stop all focus timers
 */
export const stopAllFocusTimersAtom = atom(null, (get, set) => {
  set(focusTimerStateAtom, defaultFocusTimerState);
});
stopAllFocusTimersAtom.debugLabel = "stopAllFocusTimersAtom";

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Format elapsed time in milliseconds to H:MM:SS format
 */
export function formatElapsedTime(elapsedMs: number): string {
  const totalSeconds = Math.floor(elapsedMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  } else {
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }
}

// =============================================================================
// EXPORTED COLLECTIONS
// =============================================================================

/**
 * All focus timer atoms
 */
export const focusTimerAtoms = {
  // Base state
  state: focusTimerStateAtom,

  // Derived state
  activeTimer: activeFocusTimerAtom,
  activeFocusTask: activeFocusTaskAtom,
  isTaskTimerActive: isTaskTimerActiveAtom,
  isAnyTimerRunning: isAnyTimerRunningAtom,
  currentElapsed: currentFocusTimerElapsedAtom,
  timerDisplay: focusTimerDisplayAtom,
  status: focusTimerStatusAtom,

  // Actions
  start: startFocusTimerAtom,
  pause: pauseFocusTimerAtom,
  stop: stopFocusTimerAtom,
  stopAll: stopAllFocusTimersAtom,
} as const;
