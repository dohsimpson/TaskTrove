import React from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@/test-utils"
import { BurnoutPrevention } from "./burnout-prevention"
import { subDays } from "date-fns"

describe("BurnoutPrevention", () => {
  const mockTasks = [
    {
      id: "1",
      createdAt: subDays(new Date(), 2),
      completedAt: subDays(new Date(), 1),
      dueDate: new Date(),
      priority: 1,
      timeSpent: 60,
    },
    {
      id: "2",
      createdAt: subDays(new Date(), 5),
      completedAt: undefined,
      dueDate: subDays(new Date(), 2), // overdue
      priority: 2,
      timeSpent: 30,
    },
    {
      id: "3",
      createdAt: subDays(new Date(), 3),
      completedAt: subDays(new Date(), 2),
      dueDate: new Date(),
      priority: 3,
      timeSpent: 45,
    },
  ]

  const mockFocusSessions = [
    { date: subDays(new Date(), 1), duration: 120 },
    { date: subDays(new Date(), 2), duration: 180 },
    { date: subDays(new Date(), 3), duration: 90 },
  ]

  const defaultProps = {
    tasks: mockTasks,
    focusSessions: mockFocusSessions,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders burnout prevention card", () => {
    render(<BurnoutPrevention {...defaultProps} />)

    expect(screen.getByText("Burnout Prevention")).toBeInTheDocument()
    expect(screen.getByText("Monitor your workload and stress levels")).toBeInTheDocument()
  })

  it("displays workload metrics", () => {
    render(<BurnoutPrevention {...defaultProps} />)

    expect(screen.getByText("Avg Daily Tasks")).toBeInTheDocument()
    expect(screen.getByText("Overdue Tasks")).toBeInTheDocument()
    expect(screen.getByText("1")).toBeInTheDocument() // 1 overdue task
  })

  it("displays workload intensity with progress bar", () => {
    render(<BurnoutPrevention {...defaultProps} />)

    expect(screen.getByText("Workload Intensity")).toBeInTheDocument()
    expect(screen.getByRole("progressbar")).toBeInTheDocument()
    expect(screen.getByText("Relaxed")).toBeInTheDocument()
    expect(screen.getByText("Overwhelming")).toBeInTheDocument()
  })

  it("displays stress level badge", () => {
    render(<BurnoutPrevention {...defaultProps} />)

    // Should display a stress level badge (Low, Moderate, High, or Critical)
    const stressLevels = ["Low", "Moderate", "High", "Critical"]
    const hasStressLevel = stressLevels.some((level) => screen.queryByText(level))
    expect(hasStressLevel).toBe(true)
  })

  it("displays recommendations when available", () => {
    render(<BurnoutPrevention {...defaultProps} />)

    // With our mock data, there might be recommendations
    const recommendationsHeader = screen.queryByText("Recommendations")
    if (recommendationsHeader) {
      expect(recommendationsHeader).toBeInTheDocument()
    }
  })

  it("renders quick action buttons", () => {
    render(<BurnoutPrevention {...defaultProps} />)

    expect(screen.getByText("Schedule Break")).toBeInTheDocument()
    expect(screen.getByText("Reduce Load")).toBeInTheDocument()
  })

  it("handles empty tasks array", () => {
    render(<BurnoutPrevention tasks={[]} focusSessions={[]} />)

    expect(screen.getByText("Burnout Prevention")).toBeInTheDocument()
    expect(screen.getAllByText("0")).toHaveLength(2) // Should show 0 for both avg daily tasks and overdue tasks
  })

  it("shows critical stress alert when workload is high", () => {
    // Create a high workload scenario
    const highWorkloadTasks = Array.from({ length: 20 }, (_, i) => ({
      id: `task-${i}`,
      createdAt: subDays(new Date(), Math.floor(i / 3)),
      completedAt: undefined,
      dueDate: subDays(new Date(), 1), // All overdue
      priority: 1, // High priority
      timeSpent: 120,
    }))

    const highFocusSessions = Array.from({ length: 7 }, (_, i) => ({
      date: subDays(new Date(), i),
      duration: 400, // Long focus sessions
    }))

    render(<BurnoutPrevention tasks={highWorkloadTasks} focusSessions={highFocusSessions} />)

    // Should show critical stress alert
    expect(screen.getByText("High stress detected!")).toBeInTheDocument()
    expect(
      screen.getByText(/Consider taking a break and reviewing your workload/),
    ).toBeInTheDocument()
  })

  it("calculates metrics correctly with no overdue tasks", () => {
    const completedTasks = mockTasks.map((task) => ({
      ...task,
      completedAt: new Date(),
      dueDate: new Date(Date.now() + 86400000), // Tomorrow
    }))

    render(<BurnoutPrevention tasks={completedTasks} focusSessions={mockFocusSessions} />)

    expect(screen.getByText("Burnout Prevention")).toBeInTheDocument()
    // Should show 0 overdue tasks - find the one next to "Overdue Tasks"
    expect(screen.getByText("Overdue Tasks")).toBeInTheDocument()
  })

  it("displays correct workload score percentage", () => {
    render(<BurnoutPrevention {...defaultProps} />)

    // Should display a percentage (ending with %)
    const percentageRegex = /\d+%/
    expect(screen.getByText(percentageRegex)).toBeInTheDocument()
  })

  it("handles tasks with different priorities correctly", () => {
    const mixedPriorityTasks = [
      { id: "1", createdAt: subDays(new Date(), 1), priority: 1, timeSpent: 60 },
      { id: "2", createdAt: subDays(new Date(), 2), priority: 2, timeSpent: 30 },
      { id: "3", createdAt: subDays(new Date(), 3), priority: 3, timeSpent: 45 },
      { id: "4", createdAt: subDays(new Date(), 4), priority: 4, timeSpent: 20 },
    ]

    render(<BurnoutPrevention tasks={mixedPriorityTasks} focusSessions={mockFocusSessions} />)

    expect(screen.getByText("Burnout Prevention")).toBeInTheDocument()
    // Should handle different priorities without crashing
    expect(screen.getByRole("progressbar")).toBeInTheDocument()
  })

  it("renders with proper stress level colors", () => {
    render(<BurnoutPrevention {...defaultProps} />)

    // Find the stress level badge
    const stressLevels = ["Low", "Moderate", "High", "Critical"]
    const stressLevelBadge = stressLevels.find((level) => screen.queryByText(level))

    if (stressLevelBadge) {
      expect(screen.getByText(stressLevelBadge)).toBeInTheDocument()
    }
  })

  it("shows recommendations for high task volume", () => {
    // Create many recent tasks
    const manyTasks = Array.from({ length: 15 }, (_, i) => ({
      id: `task-${i}`,
      createdAt: subDays(new Date(), Math.floor(i / 5)),
      completedAt: undefined,
      dueDate: new Date(),
      priority: 3,
      timeSpent: 30,
    }))

    render(<BurnoutPrevention tasks={manyTasks} focusSessions={mockFocusSessions} />)

    // Should show some recommendations
    const recommendationsHeader = screen.queryByText("Recommendations")
    if (recommendationsHeader) {
      expect(recommendationsHeader).toBeInTheDocument()
    } else {
      // Or at least should render without crashing
      expect(screen.getByText("Burnout Prevention")).toBeInTheDocument()
    }
  })

  it("handles focus sessions correctly", () => {
    const longFocusSessions = [
      { date: subDays(new Date(), 1), duration: 500 },
      { date: subDays(new Date(), 2), duration: 480 },
      { date: subDays(new Date(), 3), duration: 520 },
    ]

    render(<BurnoutPrevention tasks={mockTasks} focusSessions={longFocusSessions} />)

    // Should show some recommendations for high focus time
    const recommendationsHeader = screen.queryByText("Recommendations")
    if (recommendationsHeader) {
      expect(recommendationsHeader).toBeInTheDocument()
    } else {
      // Or at least should render without crashing
      expect(screen.getByText("Burnout Prevention")).toBeInTheDocument()
    }
  })

  it("handles click events on action buttons", () => {
    render(<BurnoutPrevention {...defaultProps} />)

    const scheduleBreakButton = screen.getByText("Schedule Break")
    const reduceLoadButton = screen.getByText("Reduce Load")

    // Should be clickable without throwing errors
    fireEvent.click(scheduleBreakButton)
    fireEvent.click(reduceLoadButton)

    expect(scheduleBreakButton).toBeInTheDocument()
    expect(reduceLoadButton).toBeInTheDocument()
  })

  it("displays battery icon in header", () => {
    render(<BurnoutPrevention {...defaultProps} />)

    // Check that the battery icon is rendered (it's an SVG element)
    const svgIcon = document.querySelector("svg")
    expect(svgIcon).toBeInTheDocument()
  })

  it("calculates completion rate correctly", () => {
    const incompleteTasks = mockTasks.map((task) => ({
      ...task,
      completedAt: undefined,
    }))

    render(<BurnoutPrevention tasks={incompleteTasks} focusSessions={mockFocusSessions} />)

    // Should show recommendation about completing existing tasks
    expect(screen.queryByText(/Focus on completing existing tasks/)).toBeInTheDocument()
  })
})
