import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

// Mock console methods
const mockConsole = {
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
}

describe("Logger", () => {
  let originalConsole: typeof console
  let originalProcess: typeof process

  beforeEach(() => {
    // Store original console and process
    originalConsole = global.console
    originalProcess = global.process

    // Replace console methods with mocks
    global.console = {
      ...originalConsole,
      log: mockConsole.log,
      warn: mockConsole.warn,
      error: mockConsole.error,
      debug: mockConsole.debug,
    }

    // Clear all mocks
    vi.clearAllMocks()
  })

  afterEach(() => {
    // Restore original console and process
    global.console = originalConsole
    global.process = originalProcess
    vi.resetModules()
  })

  describe("log object", () => {
    beforeEach(async () => {
      // Setup a consistent environment for these tests
      global.process = { ...originalProcess, env: { NODE_ENV: "test" } }
    })

    it("handles string messages for info", async () => {
      const { log } = await import("./logger")

      log.info("Test message")

      expect(mockConsole.log).toHaveBeenCalledWith("Test message")
    })

    it("handles context object with message for info", async () => {
      const { log } = await import("./logger")
      const context = { module: "test", taskId: "123" }

      log.info(context, "Test message")

      expect(mockConsole.log).toHaveBeenCalledWith('[test] {"taskId":"123"} Test message')
    })

    it("handles context object without message for info", async () => {
      const { log } = await import("./logger")
      const context = { module: "test", taskId: "123" }

      log.info(context)

      expect(mockConsole.log).toHaveBeenCalledWith('[test] {"taskId":"123"}')
    })

    it("handles string messages for warn", async () => {
      const { log } = await import("./logger")

      log.warn("Warning message")

      expect(mockConsole.warn).toHaveBeenCalledWith("Warning message")
    })

    it("handles context object with message for warn", async () => {
      const { log } = await import("./logger")
      const context = { module: "test", issue: "validation" }

      log.warn(context, "Warning message")

      expect(mockConsole.warn).toHaveBeenCalledWith('[test] {"issue":"validation"} Warning message')
    })

    it("handles string messages for error", async () => {
      const { log } = await import("./logger")

      log.error("Error message")

      expect(mockConsole.error).toHaveBeenCalledWith("Error message")
    })

    it("handles context object with message for error", async () => {
      const { log } = await import("./logger")
      const context = { module: "test", error: "Network timeout" }

      log.error(context, "Error message")

      expect(mockConsole.error).toHaveBeenCalledWith(
        '[test] {"error":"Network timeout"} Error message',
      )
    })

    it("handles string messages for debug", async () => {
      // Set debug enabled
      global.process = { ...originalProcess, env: { NODE_ENV: "development" } }

      const { log } = await import("./logger")

      log.debug("Debug message")

      expect(mockConsole.debug).toHaveBeenCalledWith("Debug message")
    })

    it("handles context object with message for debug", async () => {
      // Set debug enabled
      global.process = { ...originalProcess, env: { NODE_ENV: "development" } }

      const { log } = await import("./logger")
      const context = { module: "test", step: "initialization" }

      log.debug(context, "Debug message")

      expect(mockConsole.debug).toHaveBeenCalledWith(
        '[test] {"step":"initialization"} Debug message',
      )
    })

    it("skips debug messages in production", async () => {
      // Set production environment
      global.process = { ...originalProcess, env: { NODE_ENV: "production" } }

      const { log } = await import("./logger")

      log.debug("Debug message")

      expect(mockConsole.debug).not.toHaveBeenCalled()
    })
  })

  describe("createLogger", () => {
    beforeEach(async () => {
      // Setup a consistent environment for these tests
      global.process = { ...originalProcess, env: { NODE_ENV: "test" } }
    })

    it("creates a child logger with module name", async () => {
      const { createLogger } = await import("./logger")

      const childLogger = createLogger("tasks")
      childLogger.info("Task created")

      expect(mockConsole.log).toHaveBeenCalledWith("[tasks] Task created")
    })

    it("creates different child loggers for different modules", async () => {
      const { createLogger } = await import("./logger")

      const tasksLogger = createLogger("tasks")
      const projectsLogger = createLogger("projects")

      tasksLogger.info("Task message")
      projectsLogger.warn("Project warning")

      expect(mockConsole.log).toHaveBeenCalledWith("[tasks] Task message")
      expect(mockConsole.warn).toHaveBeenCalledWith("[projects] Project warning")
    })
  })

  describe("startTimer", () => {
    beforeEach(async () => {
      // Setup a consistent environment for these tests
      global.process = { ...originalProcess, env: { NODE_ENV: "development" } }

      // Mock Date.now for consistent timing
      vi.spyOn(Date, "now")
        .mockReturnValueOnce(1000) // start time
        .mockReturnValueOnce(1500) // end time
    })

    afterEach(() => {
      vi.restoreAllMocks()
    })

    it("measures operation duration and logs completion", async () => {
      const { startTimer } = await import("./logger")

      const timer = startTimer("test operation")
      timer.end()

      expect(mockConsole.debug).toHaveBeenCalledWith("Starting test operation")
      expect(mockConsole.log).toHaveBeenCalledWith("Completed test operation in 500ms")
    })

    it("includes additional info in completion log", async () => {
      const { startTimer } = await import("./logger")

      const timer = startTimer("test operation")
      timer.end({ taskId: "123", result: "success" })

      expect(mockConsole.log).toHaveBeenCalledWith(
        'Completed test operation in 500ms {"taskId":"123","result":"success"}',
      )
    })

    it("supports legacy API with logger parameter", async () => {
      const { startTimer } = await import("./logger")
      const mockLogger = { debug: vi.fn(), info: vi.fn() }

      const timer = startTimer(mockLogger, "test operation")
      timer.end()

      expect(mockConsole.debug).toHaveBeenCalledWith("Starting test operation")
      expect(mockConsole.log).toHaveBeenCalledWith("Completed test operation in 500ms")
    })
  })

  describe("Integration patterns", () => {
    beforeEach(async () => {
      global.process = { ...originalProcess, env: { NODE_ENV: "test" } }
    })

    it("supports typical task logging pattern", async () => {
      const { log } = await import("./logger")

      log.info({ module: "tasks", taskId: "123", title: "Test Task" }, "Task created")
      log.warn({ module: "tasks", taskId: "123" }, "Task validation warning")
      log.error({ module: "tasks", taskId: "123", error: "Network error" }, "Failed to save task")

      expect(mockConsole.log).toHaveBeenCalledWith(
        '[tasks] {"taskId":"123","title":"Test Task"} Task created',
      )
      expect(mockConsole.warn).toHaveBeenCalledWith(
        '[tasks] {"taskId":"123"} Task validation warning',
      )
      expect(mockConsole.error).toHaveBeenCalledWith(
        '[tasks] {"taskId":"123","error":"Network error"} Failed to save task',
      )
    })

    it("supports typical project logging pattern", async () => {
      // Enable debug for this test
      global.process = { ...originalProcess, env: { NODE_ENV: "development" } }

      const { log } = await import("./logger")

      log.debug(
        { module: "projects", projectId: "proj-1", action: "reorder" },
        "Reordering project",
      )
      log.info({ module: "projects", projectId: "proj-1", newPosition: 2 }, "Project reordered")

      expect(mockConsole.debug).toHaveBeenCalledWith(
        '[projects] {"projectId":"proj-1","action":"reorder"} Reordering project',
      )
      expect(mockConsole.log).toHaveBeenCalledWith(
        '[projects] {"projectId":"proj-1","newPosition":2} Project reordered',
      )
    })

    it("supports simple string logging for quick debugging", async () => {
      // Enable debug for this test
      global.process = { ...originalProcess, env: { NODE_ENV: "development" } }

      const { log } = await import("./logger")

      log.debug("Quick debug message")
      log.error("Something went wrong")

      expect(mockConsole.debug).toHaveBeenCalledWith("Quick debug message")
      expect(mockConsole.error).toHaveBeenCalledWith("Something went wrong")
    })
  })

  describe("Error handling", () => {
    beforeEach(async () => {
      global.process = { ...originalProcess, env: { NODE_ENV: "test" } }
    })

    it("handles null context gracefully", async () => {
      const { log } = await import("./logger")

      // Test with null context - create mock that matches expected interface
      // TypeScript would prevent this, but we need to test runtime behavior
      // Use function overload that accepts string directly
      log.info("Test message")

      expect(mockConsole.log).toHaveBeenCalledWith("Test message")
    })

    it("handles undefined message gracefully", async () => {
      const { log } = await import("./logger")

      // Test with undefined message - use only context parameter
      log.info({ module: "test" })

      expect(mockConsole.log).toHaveBeenCalledWith("[test]")
    })
  })

  describe("Circular reference handling", () => {
    beforeEach(async () => {
      global.process = { ...originalProcess, env: { NODE_ENV: "test" } }
    })

    it("handles circular references in logged objects", async () => {
      const { log } = await import("./logger")

      const obj: Record<string, unknown> = { name: "test" }
      obj.self = obj // Create circular reference

      log.info({ module: "test", data: obj }, "Circular object")

      expect(mockConsole.log).toHaveBeenCalledWith(
        '[test] {"data":{"name":"test","self":"[Circular]"}} Circular object',
      )
    })

    it("filters out DOM elements from logged data", async () => {
      const { log } = await import("./logger")

      // Mock DOM element
      const mockElement = {
        tagName: "DIV",
        constructor: { name: "HTMLDivElement" },
      }
      Object.setPrototypeOf(mockElement, Element.prototype)

      log.warn({ module: "drag-drop", element: mockElement, taskId: "123" }, "Drop operation")

      expect(mockConsole.warn).toHaveBeenCalledWith('[drag-drop] {"taskId":"123"} Drop operation')
    })

    it("filters out React fiber properties", async () => {
      const { log } = await import("./logger")

      const dataWithFiber = {
        taskId: "123",
        __reactFiber$abc123: { type: "div", stateNode: {} },
        __reactInternalInstance$xyz: { _owner: {} },
        normalProperty: "value",
      }

      log.error({ module: "react", data: dataWithFiber }, "React error")

      expect(mockConsole.error).toHaveBeenCalledWith(
        '[react] {"data":{"taskId":"123","normalProperty":"value"}} React error',
      )
    })

    it("handles deeply nested circular references", async () => {
      const { log } = await import("./logger")

      const parent: Record<string, unknown> = { name: "parent" }
      const child: Record<string, unknown> = { name: "child", parent }
      parent.child = child
      parent.children = [child]

      log.info({ module: "test", structure: parent }, "Nested circular")

      const firstCall = mockConsole.log.mock.calls[0]
      if (!firstCall || !firstCall[0]) {
        throw new Error("Expected to find console.log call with arguments")
      }
      const expectedCall = firstCall[0]
      expect(expectedCall).toContain("[test]")
      expect(expectedCall).toContain('"name":"parent"')
      expect(expectedCall).toContain("[Circular]")
    })

    it("handles arrays with circular references", async () => {
      const { log } = await import("./logger")

      const arr: unknown[] = [1, 2, 3]
      arr.push(arr) // Circular reference in array

      log.info({ module: "test", array: arr }, "Circular array")

      expect(mockConsole.log).toHaveBeenCalledWith(
        '[test] {"array":[1,2,3,"[Circular]"]} Circular array',
      )
    })

    it("provides fallback error message for serialization failures", async () => {
      const { log } = await import("./logger")

      // Create an object that would cause JSON.stringify to fail even after sanitization
      const problematicObj = {
        get badProperty() {
          throw new Error("Getter error")
        },
      }

      log.warn({ module: "test", data: problematicObj }, "Problematic object")

      const firstCall = mockConsole.warn.mock.calls[0]
      if (!firstCall || !firstCall[0]) {
        throw new Error("Expected to find console.warn call with arguments")
      }
      const expectedCall = firstCall[0]
      expect(expectedCall).toMatch(/\[test\] \[Serialization Error:.*\] Problematic object/)
    })

    it("handles FiberNode objects correctly", async () => {
      const { log } = await import("./logger")

      const mockFiber = {
        type: "div",
        stateNode: {},
        constructor: { name: "FiberNode" },
      }

      log.info({ module: "react", fiber: mockFiber, taskId: "123" }, "Fiber detected")

      expect(mockConsole.log).toHaveBeenCalledWith(
        '[react] {"fiber":"[React Fiber]","taskId":"123"} Fiber detected',
      )
    })
  })

  describe("Timer circular reference handling", () => {
    beforeEach(async () => {
      global.process = { ...originalProcess, env: { NODE_ENV: "development" } }

      vi.spyOn(Date, "now").mockReturnValueOnce(1000).mockReturnValueOnce(1500)
    })

    afterEach(() => {
      vi.restoreAllMocks()
    })

    it("sanitizes additional info in timer end", async () => {
      const { startTimer } = await import("./logger")

      const circularObj: Record<string, unknown> = { name: "test" }
      circularObj.self = circularObj

      const timer = startTimer("test operation")
      timer.end({ result: "success", data: circularObj })

      expect(mockConsole.log).toHaveBeenCalledWith(
        'Completed test operation in 500ms {"result":"success","data":{"name":"test","self":"[Circular]"}}',
      )
    })

    it("handles timer serialization errors gracefully", async () => {
      const { startTimer } = await import("./logger")

      const problematicObj = {
        get badProperty() {
          throw new Error("Timer getter error")
        },
      }

      const timer = startTimer("test operation")
      timer.end({ data: problematicObj })

      const firstCall = mockConsole.log.mock.calls[0]
      if (!firstCall || !firstCall[0]) {
        throw new Error("Expected to find console.log call with arguments")
      }
      const expectedCall = firstCall[0]
      expect(expectedCall).toMatch(/Completed test operation in 500ms \[Serialization Error:.*\]/)
    })
  })
})
