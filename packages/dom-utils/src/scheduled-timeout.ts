/**
 * Scheduled timeout utilities
 *
 * Provides reliable time-based execution despite setTimeout throttling in background tabs.
 * Uses periodic self-correction to prevent drift and ensure handler runs at target time.
 */

export interface ScheduleAtTimeOptions {
  /** Target time when handler should execute */
  targetTime: Date;
  /** Handler function to run at target time */
  handler: () => void;
  /** Interval in ms to recheck and reschedule (default: 60000 = 1 minute) */
  checkInterval?: number;
}

/**
 * Schedule a handler to run at a specific time in the future.
 *
 * This function addresses setTimeout's unreliability in background tabs by:
 * 1. Periodically re-registering itself based on actual clock time
 * 2. Self-correcting to prevent drift accumulation
 * 3. Running handler exactly once when target time is reached
 * 4. Automatically cleaning up after execution
 *
 * @example
 * // Schedule for midnight
 * const tomorrow = new Date();
 * tomorrow.setDate(tomorrow.getDate() + 1);
 * tomorrow.setHours(0, 0, 0, 0);
 *
 * const cleanup = scheduleAtTime({
 *   targetTime: tomorrow,
 *   handler: () => console.log('New day!')
 * });
 *
 * // Cancel if needed
 * cleanup();
 *
 * @param options - Configuration options
 * @returns Cleanup function to cancel the scheduled timeout
 */
export function scheduleAtTime({
  targetTime,
  handler,
  checkInterval = 60000, // Default: 1 minute
}: ScheduleAtTimeOptions): () => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let hasRun = false;

  const schedule = () => {
    // Already executed, stop scheduling
    if (hasRun) return;

    const now = Date.now();
    const target = targetTime.getTime();
    const timeUntilTarget = target - now;

    // Time has passed or is now - execute handler
    if (timeUntilTarget <= 0) {
      hasRun = true;
      handler();
      return;
    }

    // Calculate next check interval
    // Use shorter of: remaining time or checkInterval
    // This ensures we check more frequently as we get closer to target
    const nextInterval = Math.min(timeUntilTarget, checkInterval);

    // Schedule next check
    timeoutId = setTimeout(schedule, nextInterval);
  };

  // Start scheduling
  schedule();

  // Return cleanup function
  return () => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    hasRun = true; // Prevent further scheduling
  };
}
