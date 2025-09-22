import { NextRequest, NextResponse } from "next/server"
import type { EnhancedRequest } from "@/lib/middleware/api-logger"

/**
 * API Mutex Utility
 *
 * Provides sequential execution guarantees for all API routes by ensuring
 * only one API operation runs at a time. This prevents race conditions
 * when multiple concurrent requests attempt to read/write the data file.
 */
class ApiMutex {
  private queue: Array<() => Promise<void>> = []
  private isProcessing = false

  /**
   * Wraps an API handler function with mutex protection
   */
  async withMutex<T extends NextResponse>(operation: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const queuedOperation = async () => {
        try {
          const result = await operation()
          resolve(result)
        } catch (error) {
          reject(error instanceof Error ? error : new Error(String(error)))
        }
      }

      this.queue.push(queuedOperation)
      void this.processQueue()
    })
  }

  /**
   * Processes the queue sequentially
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) {
      return
    }

    this.isProcessing = true

    while (this.queue.length > 0) {
      const queuedOperation = this.queue.shift()
      if (!queuedOperation) continue

      await queuedOperation()
    }

    this.isProcessing = false
  }
}

// Global singleton instance
const apiMutex = new ApiMutex()

/**
 * Higher-order function to wrap API handlers with mutex protection
 *
 * Usage:
 * export const GET = withMutexProtection(async (request) => {
 *   // Your API logic here
 *   return NextResponse.json(data)
 * })
 */
export function withMutexProtection<T extends NextResponse>(
  handler: (request: NextRequest | EnhancedRequest) => Promise<T>,
): (request: NextRequest | EnhancedRequest) => Promise<T> {
  return async (request: NextRequest | EnhancedRequest): Promise<T> => {
    return apiMutex.withMutex(() => handler(request))
  }
}
