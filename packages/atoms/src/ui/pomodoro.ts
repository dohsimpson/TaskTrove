import { atom } from "jotai";
import type { Task, TaskId } from "@tasktrove/types";

/**
 * Pomodoro timer state atoms for TaskTrove
 *
 * This module manages shared pomodoro timer state that can be accessed
 * by both the pomodoro dialog and the page footer for consistent timer display.
 */

// =============================================================================
// BASE POMODORO STATE ATOMS
// =============================================================================

/**
 * Current pomodoro timer state
 */
export interface PomodoroTimerState {
  isRunning: boolean;
  elapsedTime: number; // in milliseconds
  sessionType: "work" | "short-break" | "long-break";
  taskId: TaskId | null;
  taskTitle: string | null;
  workDuration: number; // in minutes
  shortBreakDuration: number; // in minutes
  longBreakDuration: number; // in minutes
  sessionsCompleted: number;
  startTime: number | null; // timestamp when timer started
}

/**
 * Default pomodoro timer state
 */
const defaultPomodoroState: PomodoroTimerState = {
  isRunning: false,
  elapsedTime: 0,
  sessionType: "work",
  taskId: null,
  taskTitle: null,
  workDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  sessionsCompleted: 0,
  startTime: null,
};

/**
 * Main pomodoro timer state atom
 */
export const pomodoroTimerAtom = atom<PomodoroTimerState>(defaultPomodoroState);
pomodoroTimerAtom.debugLabel = "pomodoroTimerAtom";

// =============================================================================
// DERIVED READ ATOMS
// =============================================================================

/**
 * Get current elapsed time including running time
 */
export const currentElapsedTimeAtom = atom<number>((get) => {
  const state = get(pomodoroTimerAtom);
  if (state.isRunning && state.startTime) {
    return state.elapsedTime + (Date.now() - state.startTime);
  }
  return state.elapsedTime;
});
currentElapsedTimeAtom.debugLabel = "currentElapsedTimeAtom";

/**
 * Get remaining time for current session
 */
export const remainingTimeAtom = atom<number>((get) => {
  const state = get(pomodoroTimerAtom);
  const currentElapsed = get(currentElapsedTimeAtom);

  const sessionDuration =
    state.sessionType === "work"
      ? state.workDuration * 60 * 1000
      : state.sessionType === "short-break"
        ? state.shortBreakDuration * 60 * 1000
        : state.longBreakDuration * 60 * 1000;

  return Math.max(0, sessionDuration - currentElapsed);
});
remainingTimeAtom.debugLabel = "remainingTimeAtom";

/**
 * Format remaining time as MM:SS display
 */
export const timerDisplayAtom = atom<string>((get) => {
  const remainingMs = get(remainingTimeAtom);
  const minutes = Math.floor(remainingMs / (60 * 1000));
  const seconds = Math.floor((remainingMs % (60 * 1000)) / 1000);
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
});
timerDisplayAtom.debugLabel = "timerDisplayAtom";

/**
 * Check if timer is running
 */
export const isTimerRunningAtom = atom<boolean>((get) => {
  return get(pomodoroTimerAtom).isRunning;
});
isTimerRunningAtom.debugLabel = "isTimerRunningAtom";

/**
 * Get current task being worked on
 */
export const currentPomodoroTaskAtom = atom<{
  id: TaskId | null;
  title: string | null;
}>((get) => {
  const state = get(pomodoroTimerAtom);
  return {
    id: state.taskId,
    title: state.taskTitle,
  };
});
currentPomodoroTaskAtom.debugLabel = "currentPomodoroTaskAtom";

// =============================================================================
// WRITE-ONLY ACTION ATOMS
// =============================================================================

/**
 * Start pomodoro timer with a task
 */
export const startPomodoroAtom = atom(
  null,
  (
    get,
    set,
    params: {
      task?: Task;
      sessionType?: "work" | "short-break" | "long-break";
    },
  ) => {
    const currentState = get(pomodoroTimerAtom);
    const now = Date.now();

    set(pomodoroTimerAtom, {
      ...currentState,
      isRunning: true,
      startTime: now,
      sessionType: params.sessionType || "work",
      taskId: params.task?.id || null,
      taskTitle: params.task?.title || null,
    });
  },
);
startPomodoroAtom.debugLabel = "startPomodoroAtom";

/**
 * Pause pomodoro timer
 */
export const pausePomodoroAtom = atom(null, (get, set) => {
  const currentState = get(pomodoroTimerAtom);
  if (!currentState.isRunning) return;

  const now = Date.now();
  const newElapsedTime =
    currentState.elapsedTime +
    (currentState.startTime ? now - currentState.startTime : 0);

  set(pomodoroTimerAtom, {
    ...currentState,
    isRunning: false,
    elapsedTime: newElapsedTime,
    startTime: null,
  });
});
pausePomodoroAtom.debugLabel = "pausePomodoroAtom";

/**
 * Resume pomodoro timer
 */
export const resumePomodoroAtom = atom(null, (get, set) => {
  const currentState = get(pomodoroTimerAtom);
  if (currentState.isRunning) return;

  set(pomodoroTimerAtom, {
    ...currentState,
    isRunning: true,
    startTime: Date.now(),
  });
});
resumePomodoroAtom.debugLabel = "resumePomodoroAtom";

/**
 * Reset pomodoro timer
 */
export const resetPomodoroAtom = atom(null, (get, set) => {
  const currentState = get(pomodoroTimerAtom);
  set(pomodoroTimerAtom, {
    ...currentState,
    isRunning: false,
    elapsedTime: 0,
    startTime: null,
  });
});
resetPomodoroAtom.debugLabel = "resetPomodoroAtom";

/**
 * Stop pomodoro timer completely (reset everything)
 */
export const stopPomodoroAtom = atom(null, (get, set) => {
  set(pomodoroTimerAtom, defaultPomodoroState);
});
stopPomodoroAtom.debugLabel = "stopPomodoroAtom";

/**
 * Complete current pomodoro session
 */
export const completePomodoroSessionAtom = atom(null, (get, set) => {
  const currentState = get(pomodoroTimerAtom);

  // Reset timer for next session
  let nextSessionType: "work" | "short-break" | "long-break" = "work";
  let newSessionsCompleted = currentState.sessionsCompleted;

  if (currentState.sessionType === "work") {
    newSessionsCompleted += 1;
    // After 4 work sessions, take a long break
    nextSessionType =
      newSessionsCompleted % 4 === 0 ? "long-break" : "short-break";
  } else {
    nextSessionType = "work";
  }

  set(pomodoroTimerAtom, {
    ...currentState,
    isRunning: false,
    elapsedTime: 0,
    startTime: null,
    sessionType: nextSessionType,
    sessionsCompleted: newSessionsCompleted,
  });
});
completePomodoroSessionAtom.debugLabel = "completePomodoroSessionAtom";

/**
 * Update pomodoro settings
 */
export const updatePomodoroSettingsAtom = atom(
  null,
  (
    get,
    set,
    updates: Partial<
      Pick<
        PomodoroTimerState,
        "workDuration" | "shortBreakDuration" | "longBreakDuration"
      >
    >,
  ) => {
    const currentState = get(pomodoroTimerAtom);
    set(pomodoroTimerAtom, {
      ...currentState,
      ...updates,
    });
  },
);
updatePomodoroSettingsAtom.debugLabel = "updatePomodoroSettingsAtom";

// =============================================================================
// EXPORTED COLLECTIONS
// =============================================================================

/**
 * All pomodoro state atoms
 */
export const pomodoroAtoms = {
  // Base state
  timer: pomodoroTimerAtom,

  // Derived state
  currentElapsedTime: currentElapsedTimeAtom,
  remainingTime: remainingTimeAtom,
  timerDisplay: timerDisplayAtom,
  isRunning: isTimerRunningAtom,
  currentTask: currentPomodoroTaskAtom,

  // Actions
  start: startPomodoroAtom,
  pause: pausePomodoroAtom,
  resume: resumePomodoroAtom,
  reset: resetPomodoroAtom,
  stop: stopPomodoroAtom,
  complete: completePomodoroSessionAtom,
  updateSettings: updatePomodoroSettingsAtom,
} as const;
