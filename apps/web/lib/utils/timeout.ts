/**
 * Run an async task with an AbortController-based timeout.
 * If the task does not resolve within `timeoutMs`, the controller is aborted.
 * The provided or created controller is returned so callers can reuse it across
 * multiple sequential operations (e.g., client creation + sync).
 */
export async function withTimeout<T>(
  timeoutMs: number,
  task: (signal: AbortSignal) => Promise<T>,
  controller: AbortController = new AbortController(),
): Promise<T> {
  const timer = setTimeout(() => {
    controller.abort(new Error(`Operation exceeded timeout of ${timeoutMs}ms and was aborted.`))
  }, timeoutMs)

  try {
    return await task(controller.signal)
  } finally {
    clearTimeout(timer)
  }
}
