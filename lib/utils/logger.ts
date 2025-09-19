// Simple console-based logger
const isDevelopment = process.env.NODE_ENV === "development"
const isDebugEnabled = isDevelopment || process.env.DEBUG === "true"

// Sanitize object to remove circular references and DOM elements
const sanitizeObject = (obj: unknown, seen = new WeakSet()): unknown => {
  if (obj === null || typeof obj !== "object") return obj
  if (seen.has(obj)) return "[Circular]"

  // Special handling for Error objects to preserve their important properties
  if (obj instanceof Error) {
    return {
      name: obj.name,
      message: obj.message,
      stack: obj.stack,
      cause: obj.cause ? sanitizeObject(obj.cause, seen) : undefined,
    }
  }

  // Filter out DOM elements and React fiber properties (check if globals exist first)
  if (typeof Element !== "undefined" && obj instanceof Element) return "[DOM Element]"
  if (typeof Node !== "undefined" && obj instanceof Node) return "[DOM Element]"
  if (obj.constructor.name === "FiberNode") return "[React Fiber]"

  seen.add(obj)

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item, seen))
  }

  const sanitized: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj)) {
    // Skip React fiber properties and DOM element properties
    if (key.startsWith("__reactFiber") || key.startsWith("__reactInternalInstance")) continue
    if (key === "element" && typeof Element !== "undefined" && value instanceof Element) continue
    if (key === "element" && typeof Node !== "undefined" && value instanceof Node) continue

    sanitized[key] = sanitizeObject(value, seen)
  }

  seen.delete(obj)
  return sanitized
}

// Format context object for console output
const formatContext = (context: Record<string, unknown>): string => {
  const { module, ...rest } = context
  const prefix = module ? `[${module}]` : ""

  try {
    const sanitized = sanitizeObject(rest)
    const extras =
      sanitized && typeof sanitized === "object" && Object.keys(sanitized).length > 0
        ? ` ${JSON.stringify(sanitized)}`
        : ""
    return `${prefix}${extras}`
  } catch (error) {
    // Fallback for any remaining serialization issues
    return `${prefix} [Serialization Error: ${error instanceof Error ? error.message : "Unknown"}]`
  }
}

// Logging methods - next-logger handles server/client differences automatically
export const log = {
  info: (context: Record<string, unknown> | string, message?: string) => {
    if (typeof context === "string") {
      console.log(context)
    } else {
      const formatted = formatContext(context)
      console.log(`${formatted}${formatted && message ? " " : ""}${message || ""}`.trim())
    }
  },

  warn: (context: Record<string, unknown> | string, message?: string) => {
    if (typeof context === "string") {
      console.warn(context)
    } else {
      const formatted = formatContext(context)
      console.warn(`${formatted}${formatted && message ? " " : ""}${message || ""}`.trim())
    }
  },

  error: (context: Record<string, unknown> | string, message?: string) => {
    if (typeof context === "string") {
      console.error(context)
    } else {
      const formatted = formatContext(context)
      console.error(`${formatted}${formatted && message ? " " : ""}${message || ""}`.trim())
    }
  },

  debug: (context: Record<string, unknown> | string, message?: string) => {
    if (!isDebugEnabled) return

    if (typeof context === "string") {
      console.debug(context)
    } else {
      const formatted = formatContext(context)
      console.debug(`${formatted}${formatted && message ? " " : ""}${message || ""}`.trim())
    }
  },
}

// Performance timer
export const startTimer = (
  loggerOrOperation: string | Record<string, unknown>,
  operation?: string,
) => {
  const op = typeof loggerOrOperation === "string" ? loggerOrOperation : (operation ?? "unknown")
  const start = Date.now()

  if (isDebugEnabled) {
    console.debug(`Starting ${op}`)
  }

  return {
    end: (additionalInfo?: Record<string, unknown>) => {
      const duration = Date.now() - start
      let info = ""
      if (additionalInfo) {
        try {
          const sanitized = sanitizeObject(additionalInfo)
          info = ` ${JSON.stringify(sanitized)}`
        } catch (error) {
          info = ` [Serialization Error: ${error instanceof Error ? error.message : "Unknown"}]`
        }
      }
      console.log(`Completed ${op} in ${duration}ms${info}`)
    },
  }
}

// For backward compatibility with createLogger
export const createLogger = (name: string) => {
  return {
    info: (msg: string) => log.info({ module: name }, msg),
    warn: (msg: string) => log.warn({ module: name }, msg),
    error: (msg: string) => log.error({ module: name }, msg),
    debug: (msg: string) => log.debug({ module: name }, msg),
  }
}
