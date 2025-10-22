/**
 * Maximum safe delay for setTimeout in milliseconds (2^31 - 1)
 * Values above this may cause unpredictable behavior in setTimeout
 */
export const MAX_SAFE_TIMEOUT_DELAY = 2_147_483_647;

/**
 * Safe wrapper around setTimeout that validates the delay value
 *
 * @param callback - Function to execute after the delay
 * @param delay - Time in milliseconds to wait before executing the callback
 * @returns Timer ID that can be used with clearTimeout
 * @throws Error if delay exceeds the maximum safe value
 */
export function safeSetTimeout(
  callback: () => void,
  delay: number,
): ReturnType<typeof setTimeout> {
  if (delay > MAX_SAFE_TIMEOUT_DELAY) {
    throw new Error(
      `setTimeout delay of ${delay}ms exceeds maximum safe value of ${MAX_SAFE_TIMEOUT_DELAY}ms. ` +
        "Consider using a different approach for long delays.",
    );
  }

  if (delay < 0) {
    throw new Error(`setTimeout delay cannot be negative: ${delay}ms`);
  }

  return setTimeout(callback, delay);
}
