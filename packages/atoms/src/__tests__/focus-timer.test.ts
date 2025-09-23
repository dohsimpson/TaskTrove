import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createStore } from "jotai";
import { v4 as uuidv4 } from "uuid";
import { createTaskId } from "@tasktrove/types";
import {
  focusTimerStateAtom,
  activeFocusTimerAtom,
  isTaskTimerActiveAtom,
  isAnyTimerRunningAtom,
  currentFocusTimerElapsedAtom,
  focusTimerDisplayAtom,
  focusTimerStatusAtom,
  startFocusTimerAtom,
  pauseFocusTimerAtom,
  stopFocusTimerAtom,
  stopAllFocusTimersAtom,
  formatElapsedTime,
  type FocusTimer,
} from "../ui/focus-timer";

// Mock createAtomWithStorage to return a regular atom for testing
vi.mock("../utils", () => ({
  createAtomWithStorage: (key: string, defaultValue: unknown) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { atom } = require("jotai");
    return atom(defaultValue);
  },
}));

describe("Focus Timer Atoms", () => {
  let store: ReturnType<typeof createStore>;

  // Generate valid UUIDs for testing
  const taskId1 = createTaskId(uuidv4());
  const taskId2 = createTaskId(uuidv4());

  beforeEach(() => {
    store = createStore();
    // Mock Date.now for consistent testing
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-01T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("formatElapsedTime utility", () => {
    it("formats time correctly for seconds only", () => {
      expect(formatElapsedTime(30000)).toBe("0:30"); // 30 seconds
      expect(formatElapsedTime(59000)).toBe("0:59"); // 59 seconds
    });

    it("formats time correctly for minutes and seconds", () => {
      expect(formatElapsedTime(90000)).toBe("1:30"); // 1 minute 30 seconds
      expect(formatElapsedTime(600000)).toBe("10:00"); // 10 minutes
    });

    it("formats time correctly for hours, minutes and seconds", () => {
      expect(formatElapsedTime(3661000)).toBe("1:01:01"); // 1 hour 1 minute 1 second
      expect(formatElapsedTime(7200000)).toBe("2:00:00"); // 2 hours
    });

    it("handles zero time", () => {
      expect(formatElapsedTime(0)).toBe("0:00");
    });
  });

  describe("focusTimerStateAtom", () => {
    it("has correct initial state", () => {
      const state = store.get(focusTimerStateAtom);
      expect(state).toEqual({ activeTimers: [] });
    });
  });

  describe("activeFocusTimerAtom", () => {
    it("returns null when no timers are active", () => {
      const activeTimer = store.get(activeFocusTimerAtom);
      expect(activeTimer).toBeNull();
    });

    it("returns the first timer when timers are active", () => {
      const timer: FocusTimer = {
        taskId: taskId1,
        startedAt: "2024-01-01T12:00:00Z",
        elapsed: 0,
      };

      store.set(focusTimerStateAtom, { activeTimers: [timer] });

      const activeTimer = store.get(activeFocusTimerAtom);
      expect(activeTimer).toEqual(timer);
    });
  });

  describe("isTaskTimerActiveAtom", () => {
    it("returns false when no timers are active", () => {
      const isActive = store.get(isTaskTimerActiveAtom);
      expect(isActive(taskId1)).toBe(false);
    });

    it("returns true for task with active timer", () => {
      const timer: FocusTimer = {
        taskId: taskId1,
        startedAt: "2024-01-01T12:00:00Z",
        elapsed: 0,
      };

      store.set(focusTimerStateAtom, { activeTimers: [timer] });

      const isActive = store.get(isTaskTimerActiveAtom);
      expect(isActive(taskId1)).toBe(true);
      expect(isActive(taskId2)).toBe(false);
    });
  });

  describe("isAnyTimerRunningAtom", () => {
    it("returns false when no timers are active", () => {
      const isRunning = store.get(isAnyTimerRunningAtom);
      expect(isRunning).toBe(false);
    });

    it("returns true when timer is running", () => {
      const timer: FocusTimer = {
        taskId: taskId1,
        startedAt: "2024-01-01T12:00:00Z",
        elapsed: 0,
      };

      store.set(focusTimerStateAtom, { activeTimers: [timer] });

      const isRunning = store.get(isAnyTimerRunningAtom);
      expect(isRunning).toBe(true);
    });

    it("returns false when timer is paused", () => {
      const timer: FocusTimer = {
        taskId: taskId1,
        startedAt: "2024-01-01T12:00:00Z",
        pausedAt: "2024-01-01T12:05:00Z",
        elapsed: 0,
      };

      store.set(focusTimerStateAtom, { activeTimers: [timer] });

      const isRunning = store.get(isAnyTimerRunningAtom);
      expect(isRunning).toBe(false);
    });
  });

  describe("focusTimerStatusAtom", () => {
    it("returns 'stopped' when no timer is active", () => {
      const status = store.get(focusTimerStatusAtom);
      expect(status).toBe("stopped");
    });

    it("returns 'running' when timer is active and not paused", () => {
      const timer: FocusTimer = {
        taskId: taskId1,
        startedAt: "2024-01-01T12:00:00Z",
        elapsed: 0,
      };

      store.set(focusTimerStateAtom, { activeTimers: [timer] });

      const status = store.get(focusTimerStatusAtom);
      expect(status).toBe("running");
    });

    it("returns 'paused' when timer is paused", () => {
      const timer: FocusTimer = {
        taskId: taskId1,
        startedAt: "2024-01-01T12:00:00Z",
        pausedAt: "2024-01-01T12:05:00Z",
        elapsed: 300000, // 5 minutes
      };

      store.set(focusTimerStateAtom, { activeTimers: [timer] });

      const status = store.get(focusTimerStatusAtom);
      expect(status).toBe("paused");
    });
  });

  describe("currentFocusTimerElapsedAtom", () => {
    it("returns 0 when no timer is active", () => {
      const elapsed = store.get(currentFocusTimerElapsedAtom);
      expect(elapsed).toBe(0);
    });

    it("calculates elapsed time for running timer", () => {
      // Set timer started 5 minutes ago
      const fiveMinutesAgo = new Date("2024-01-01T11:55:00Z").toISOString();
      const timer: FocusTimer = {
        taskId: taskId1,
        startedAt: fiveMinutesAgo,
        elapsed: 0,
      };

      store.set(focusTimerStateAtom, { activeTimers: [timer] });

      const elapsed = store.get(currentFocusTimerElapsedAtom);
      expect(elapsed).toBe(300000); // 5 minutes in milliseconds
    });

    it("returns elapsed time up to pause point for paused timer", () => {
      const timer: FocusTimer = {
        taskId: taskId1,
        startedAt: "2024-01-01T11:55:00Z", // 5 minutes ago
        pausedAt: "2024-01-01T11:58:00Z", // 2 minutes ago (3 minutes elapsed)
        elapsed: 0,
      };

      store.set(focusTimerStateAtom, { activeTimers: [timer] });

      const elapsed = store.get(currentFocusTimerElapsedAtom);
      expect(elapsed).toBe(180000); // 3 minutes in milliseconds
    });
  });

  describe("startFocusTimerAtom", () => {
    it("creates new timer when none exists", () => {
      store.set(startFocusTimerAtom, taskId1);

      const state = store.get(focusTimerStateAtom);
      expect(state.activeTimers).toHaveLength(1);
      const firstTimer = state.activeTimers[0];
      if (!firstTimer) {
        throw new Error("Expected to find first active timer");
      }
      expect(firstTimer.taskId).toBe(taskId1);
      expect(firstTimer.startedAt).toBe("2024-01-01T12:00:00.000Z");
      expect(firstTimer.elapsed).toBe(0);
    });

    it("stops existing timer before starting new one", () => {
      // Start timer for task1
      store.set(startFocusTimerAtom, taskId1);
      expect(store.get(focusTimerStateAtom).activeTimers).toHaveLength(1);

      // Start timer for task2
      store.set(startFocusTimerAtom, taskId2);

      const state = store.get(focusTimerStateAtom);
      expect(state.activeTimers).toHaveLength(1);
      const firstTimer = state.activeTimers[0];
      if (!firstTimer) {
        throw new Error("Expected to find first active timer");
      }
      expect(firstTimer.taskId).toBe(taskId2);
    });

    it("resumes paused timer for same task", () => {
      const pausedTimer: FocusTimer = {
        taskId: taskId1,
        startedAt: "2024-01-01T11:55:00Z",
        pausedAt: "2024-01-01T11:58:00Z",
        elapsed: 0,
      };

      store.set(focusTimerStateAtom, { activeTimers: [pausedTimer] });

      // Resume timer
      store.set(startFocusTimerAtom, taskId1);

      const state = store.get(focusTimerStateAtom);
      const firstTimer = state.activeTimers[0];
      if (!firstTimer) {
        throw new Error("Expected to find first active timer");
      }
      expect(firstTimer.pausedAt).toBeUndefined();
      expect(firstTimer.elapsed).toBe(180000); // Accumulated 3 minutes
    });
  });

  describe("pauseFocusTimerAtom", () => {
    it("pauses running timer", () => {
      const runningTimer: FocusTimer = {
        taskId: taskId1,
        startedAt: "2024-01-01T11:55:00Z", // 5 minutes ago
        elapsed: 0,
      };

      store.set(focusTimerStateAtom, { activeTimers: [runningTimer] });

      // Pause timer
      store.set(pauseFocusTimerAtom, taskId1);

      const state = store.get(focusTimerStateAtom);
      const firstTimer = state.activeTimers[0];
      if (!firstTimer) {
        throw new Error("Expected to find first active timer");
      }
      expect(firstTimer.pausedAt).toBe("2024-01-01T12:00:00.000Z");
    });

    it("does nothing if timer is not running", () => {
      store.set(pauseFocusTimerAtom, taskId1);

      const state = store.get(focusTimerStateAtom);
      expect(state.activeTimers).toHaveLength(0);
    });
  });

  describe("stopFocusTimerAtom", () => {
    it("removes timer from active timers", () => {
      const timer: FocusTimer = {
        taskId: taskId1,
        startedAt: "2024-01-01T12:00:00Z",
        elapsed: 0,
      };

      store.set(focusTimerStateAtom, { activeTimers: [timer] });

      // Stop timer
      store.set(stopFocusTimerAtom, taskId1);

      const state = store.get(focusTimerStateAtom);
      expect(state.activeTimers).toHaveLength(0);
    });

    it("does nothing if timer does not exist", () => {
      store.set(stopFocusTimerAtom, taskId1);

      const state = store.get(focusTimerStateAtom);
      expect(state.activeTimers).toHaveLength(0);
    });
  });

  describe("stopAllFocusTimersAtom", () => {
    it("removes all active timers", () => {
      const timer1: FocusTimer = {
        taskId: taskId1,
        startedAt: "2024-01-01T12:00:00Z",
        elapsed: 0,
      };

      const timer2: FocusTimer = {
        taskId: taskId2,
        startedAt: "2024-01-01T12:05:00Z",
        elapsed: 0,
      };

      store.set(focusTimerStateAtom, { activeTimers: [timer1, timer2] });

      // Stop all timers
      store.set(stopAllFocusTimersAtom);

      const state = store.get(focusTimerStateAtom);
      expect(state.activeTimers).toHaveLength(0);
    });
  });

  describe("focusTimerDisplayAtom", () => {
    it("returns '0:00' when no timer is active", () => {
      const display = store.get(focusTimerDisplayAtom);
      expect(display).toBe("0:00");
    });

    it("formats elapsed time for display", () => {
      const timer: FocusTimer = {
        taskId: taskId1,
        startedAt: "2024-01-01T11:58:30Z", // 1 minute 30 seconds ago
        elapsed: 0,
      };

      store.set(focusTimerStateAtom, { activeTimers: [timer] });

      const display = store.get(focusTimerDisplayAtom);
      expect(display).toBe("1:30");
    });
  });
});
