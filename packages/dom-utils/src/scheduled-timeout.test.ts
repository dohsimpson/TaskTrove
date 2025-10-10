import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { scheduleAtTime } from "./scheduled-timeout";

describe("scheduleAtTime", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("should execute handler when target time is reached", () => {
    const handler = vi.fn();
    const now = new Date("2025-01-15T23:00:00Z");
    const targetTime = new Date("2025-01-15T23:05:00Z"); // 5 minutes later

    vi.setSystemTime(now);

    scheduleAtTime({ targetTime, handler });

    // Should not execute immediately
    expect(handler).not.toHaveBeenCalled();

    // Advance to target time
    vi.advanceTimersByTime(5 * 60 * 1000);

    // Should execute exactly once
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("should execute handler immediately if target time has already passed", () => {
    const handler = vi.fn();
    const now = new Date("2025-01-15T23:00:00Z");
    const targetTime = new Date("2025-01-15T22:00:00Z"); // 1 hour ago

    vi.setSystemTime(now);

    scheduleAtTime({ targetTime, handler });

    // Should execute immediately
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("should use custom check interval", () => {
    const handler = vi.fn();
    const now = new Date("2025-01-15T23:00:00Z");
    const targetTime = new Date("2025-01-16T00:00:00Z"); // 1 hour later
    const checkInterval = 10000; // 10 seconds

    vi.setSystemTime(now);

    scheduleAtTime({ targetTime, handler, checkInterval });

    // Should not execute immediately
    expect(handler).not.toHaveBeenCalled();

    // Advance by check interval
    vi.advanceTimersByTime(checkInterval);

    // Still not reached target
    expect(handler).not.toHaveBeenCalled();

    // Advance to target time
    vi.advanceTimersByTime(60 * 60 * 1000 - checkInterval);

    // Should execute
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("should cancel execution when cleanup is called", () => {
    const handler = vi.fn();
    const now = new Date("2025-01-15T23:00:00Z");
    const targetTime = new Date("2025-01-15T23:05:00Z");

    vi.setSystemTime(now);

    const cleanup = scheduleAtTime({ targetTime, handler });

    // Cancel before target time
    cleanup();

    // Advance past target time
    vi.advanceTimersByTime(10 * 60 * 1000);

    // Should not execute
    expect(handler).not.toHaveBeenCalled();
  });

  it("should not execute multiple times even if cleanup is not called", () => {
    const handler = vi.fn();
    const now = new Date("2025-01-15T23:00:00Z");
    const targetTime = new Date("2025-01-15T23:05:00Z");

    vi.setSystemTime(now);

    scheduleAtTime({ targetTime, handler });

    // Advance past target time
    vi.advanceTimersByTime(10 * 60 * 1000);

    // Should execute exactly once
    expect(handler).toHaveBeenCalledTimes(1);

    // Advance further
    vi.advanceTimersByTime(10 * 60 * 1000);

    // Still only once
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("should self-correct by rechecking periodically", () => {
    const handler = vi.fn();
    const now = new Date("2025-01-15T23:00:00Z");
    const targetTime = new Date("2025-01-16T00:00:00Z"); // 1 hour later
    const checkInterval = 60000; // 1 minute

    vi.setSystemTime(now);

    scheduleAtTime({ targetTime, handler, checkInterval });

    // Advance by check intervals multiple times
    for (let i = 0; i < 59; i++) {
      vi.advanceTimersByTime(checkInterval);
      expect(handler).not.toHaveBeenCalled();
    }

    // Final advance to reach target
    vi.advanceTimersByTime(checkInterval);

    // Should execute
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("should use shorter interval as target time approaches", () => {
    const handler = vi.fn();
    const now = new Date("2025-01-15T23:00:00Z");
    const targetTime = new Date("2025-01-15T23:00:30Z"); // 30 seconds later
    const checkInterval = 60000; // 1 minute (longer than time until target)

    vi.setSystemTime(now);

    scheduleAtTime({ targetTime, handler, checkInterval });

    // Should use the shorter interval (30 seconds, not 1 minute)
    vi.advanceTimersByTime(30000);

    // Should execute
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("should handle cleanup called multiple times", () => {
    const handler = vi.fn();
    const now = new Date("2025-01-15T23:00:00Z");
    const targetTime = new Date("2025-01-15T23:05:00Z");

    vi.setSystemTime(now);

    const cleanup = scheduleAtTime({ targetTime, handler });

    // Call cleanup multiple times
    cleanup();
    cleanup();
    cleanup();

    // Advance past target time
    vi.advanceTimersByTime(10 * 60 * 1000);

    // Should not execute
    expect(handler).not.toHaveBeenCalled();
  });

  it("should handle cleanup called after execution", () => {
    const handler = vi.fn();
    const now = new Date("2025-01-15T23:00:00Z");
    const targetTime = new Date("2025-01-15T23:00:00Z"); // Now

    vi.setSystemTime(now);

    const cleanup = scheduleAtTime({ targetTime, handler });

    // Should execute immediately
    expect(handler).toHaveBeenCalledTimes(1);

    // Call cleanup after execution (should not throw)
    cleanup();

    // Advance time
    vi.advanceTimersByTime(60000);

    // Should still be called only once
    expect(handler).toHaveBeenCalledTimes(1);
  });
});
