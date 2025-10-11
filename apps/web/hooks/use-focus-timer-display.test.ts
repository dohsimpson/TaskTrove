import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { renderHook, act } from "@/test-utils"
import { useFocusTimerDisplay } from "./use-focus-timer-display"
import type { Task } from "@/lib/types"
import type { FocusTimer } from "@tasktrove/atoms"
import { createTaskId } from "@/lib/types"
import { v4 as uuidv4 } from "uuid"

// Mock the atoms and their values
const mockActiveTimer = vi.fn()
const mockStatus = vi.fn()
const mockTask = vi.fn()
const mockDisplayTime = vi.fn()
const mockStopTimer = vi.fn()
const mockSetTick = vi.fn()

// Mock jotai hooks
vi.mock("jotai", () => ({
  useAtomValue: vi.fn((atom: unknown) => {
    const atomStr = String(atom)
    if (atomStr.includes("activeFocusTimer") || atom === "activeFocusTimerAtom") {
      return mockActiveTimer()
    }
    if (atomStr.includes("focusTimerStatus") || atom === "focusTimerStatusAtom") {
      return mockStatus()
    }
    if (atomStr.includes("activeFocusTask") || atom === "activeFocusTaskAtom") {
      return mockTask()
    }
    if (atomStr.includes("focusTimerDisplay") || atom === "focusTimerDisplayAtom") {
      return mockDisplayTime()
    }
    return null
  }),
  useSetAtom: vi.fn((atom: unknown) => {
    const atomStr = String(atom)
    if (atomStr.includes("stopFocusTimer") || atom === "stopFocusTimerAtom") {
      return mockStopTimer
    }
    if (atomStr.includes("focusTimerTick") || atom === "focusTimerTickAtom") {
      return mockSetTick
    }
    return vi.fn()
  }),
}))

// Mock the atoms module directly
vi.mock("@/lib/atoms", () => ({
  activeFocusTimerAtom: "activeFocusTimerAtom",
  focusTimerStatusAtom: "focusTimerStatusAtom",
  activeFocusTaskAtom: "activeFocusTaskAtom",
  focusTimerDisplayAtom: "focusTimerDisplayAtom",
  focusTimerTickAtom: "focusTimerTickAtom",
  stopFocusTimerAtom: "stopFocusTimerAtom",
  formatElapsedTime: vi.fn((ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
  }),
}))

describe("useFocusTimerDisplay", () => {
  const taskId = createTaskId(uuidv4())

  const mockTimer: FocusTimer = {
    taskId,
    startedAt: new Date("2024-01-01T12:00:00Z").toISOString(),
    elapsed: 0,
  }

  const mockTaskData: Task = {
    id: taskId,
    title: "Test Task",
    description: "",
    completed: false,
    priority: 2,
    labels: [],
    subtasks: [],
    comments: [],
    createdAt: new Date("2024-01-01T10:00:00Z"),
    recurringMode: "dueDate",
  }

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2024-01-01T12:01:00Z"))

    // Reset all mocks
    mockActiveTimer.mockReturnValue(null)
    mockStatus.mockReturnValue("stopped")
    mockTask.mockReturnValue(null)
    mockDisplayTime.mockReturnValue("0:00")
    mockStopTimer.mockClear()
    mockSetTick.mockClear()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("returns initial state when no timer is active", () => {
    mockActiveTimer.mockReturnValue(null)
    mockStatus.mockReturnValue("stopped")
    mockTask.mockReturnValue(null)

    const { result } = renderHook(() => useFocusTimerDisplay())

    expect(result.current.activeTimer).toBeNull()
    expect(result.current.status).toBe("stopped")
    expect(result.current.task).toBeNull()
    expect(result.current.displayTime).toBe("0:00")
  })

  it("returns active timer data when timer is running", () => {
    mockActiveTimer.mockReturnValue(mockTimer)
    mockStatus.mockReturnValue("running")
    mockTask.mockReturnValue(mockTaskData)

    const { result } = renderHook(() => useFocusTimerDisplay())

    expect(result.current.activeTimer).toEqual(mockTimer)
    expect(result.current.status).toBe("running")
    expect(result.current.task).toEqual(mockTaskData)
  })

  it("stops timer when task is completed", () => {
    // Setup: timer is running for an incomplete task
    mockActiveTimer.mockReturnValue(mockTimer)
    mockStatus.mockReturnValue("running")
    mockTask.mockReturnValue(mockTaskData)

    const { rerender } = renderHook(() => useFocusTimerDisplay())

    // Verify timer is not stopped initially
    expect(mockStopTimer).not.toHaveBeenCalled()

    // Act: mark task as completed
    const completedTask = { ...mockTaskData, completed: true }
    mockTask.mockReturnValue(completedTask)

    act(() => {
      rerender()
    })

    // Assert: stopTimer should be called with the task ID
    expect(mockStopTimer).toHaveBeenCalledWith(taskId)
  })

  it("does not stop timer when task is completed but timer is already stopped", () => {
    // Setup: timer exists but is already stopped
    mockActiveTimer.mockReturnValue(mockTimer)
    mockStatus.mockReturnValue("stopped")
    mockTask.mockReturnValue({ ...mockTaskData, completed: true })

    renderHook(() => useFocusTimerDisplay())

    // Assert: stopTimer should not be called since status is already "stopped"
    expect(mockStopTimer).not.toHaveBeenCalled()
  })

  it("does not stop timer when no active timer exists", () => {
    // Setup: no active timer but completed task
    mockActiveTimer.mockReturnValue(null)
    mockStatus.mockReturnValue("stopped")
    mockTask.mockReturnValue({ ...mockTaskData, completed: true })

    renderHook(() => useFocusTimerDisplay())

    // Assert: stopTimer should not be called since there's no active timer
    expect(mockStopTimer).not.toHaveBeenCalled()
  })

  it("does not stop timer when task is not completed", () => {
    // Setup: timer is running for an incomplete task
    mockActiveTimer.mockReturnValue(mockTimer)
    mockStatus.mockReturnValue("running")
    mockTask.mockReturnValue(mockTaskData) // completed: false

    renderHook(() => useFocusTimerDisplay())

    // Assert: stopTimer should not be called since task is not completed
    expect(mockStopTimer).not.toHaveBeenCalled()
  })

  it("stops timer when task is deleted", () => {
    // Setup: timer is running for a task
    mockActiveTimer.mockReturnValue(mockTimer)
    mockStatus.mockReturnValue("running")
    mockTask.mockReturnValue(mockTaskData)

    const { rerender } = renderHook(() => useFocusTimerDisplay())

    // Verify timer is not stopped initially
    expect(mockStopTimer).not.toHaveBeenCalled()

    // Act: delete task (task becomes null)
    mockTask.mockReturnValue(null)

    act(() => {
      rerender()
    })

    // Assert: stopTimer should be called with the timer's taskId
    expect(mockStopTimer).toHaveBeenCalledWith(taskId)
  })

  it("does not stop timer when task is deleted but timer is already stopped", () => {
    // Setup: timer exists but is already stopped, no task
    mockActiveTimer.mockReturnValue(mockTimer)
    mockStatus.mockReturnValue("stopped")
    mockTask.mockReturnValue(null)

    renderHook(() => useFocusTimerDisplay())

    // Assert: stopTimer should not be called since status is already "stopped"
    expect(mockStopTimer).not.toHaveBeenCalled()
  })

  it("does not stop timer when task is deleted but no active timer exists", () => {
    // Setup: no active timer, no task
    mockActiveTimer.mockReturnValue(null)
    mockStatus.mockReturnValue("stopped")
    mockTask.mockReturnValue(null)

    renderHook(() => useFocusTimerDisplay())

    // Assert: stopTimer should not be called since there's no active timer
    expect(mockStopTimer).not.toHaveBeenCalled()
  })

  it("stops timer when task changes from existing to deleted", () => {
    // Setup: timer is paused for a task
    mockActiveTimer.mockReturnValue(mockTimer)
    mockStatus.mockReturnValue("paused")
    mockTask.mockReturnValue(mockTaskData)

    const { rerender } = renderHook(() => useFocusTimerDisplay())

    // Verify timer is not stopped initially
    expect(mockStopTimer).not.toHaveBeenCalled()

    // Act: delete task (transition from existing task to null)
    mockTask.mockReturnValue(null)

    act(() => {
      rerender()
    })

    // Assert: stopTimer should be called with the timer's taskId
    expect(mockStopTimer).toHaveBeenCalledWith(taskId)
  })
})
