import React from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@/test-utils"
import { AnalyticsDashboard } from "./analytics-dashboard"
import { useAtomValue, useSetAtom } from "jotai"

// Mock useAtomValue and useSetAtom
vi.mock("jotai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("jotai")>()
  return {
    ...actual,
    useAtomValue: vi.fn(),
    useSetAtom: vi.fn(),
  }
})

// Mock component interfaces
interface MockMetricCardProps {
  title: string
  value: string | number
  subtitle?: string
  trend?: "up" | "down" | "neutral"
  trendValue?: string
  color?: "default" | "success" | "warning" | "danger"
}

interface MockProductivityChartProps {
  data: Array<{
    date: string
    completed: number
    created: number
    focusTime: number
    productivityScore: number
  }>
  dateRange: string
  onDateRangeChange: (range: string) => void
  metric?: "completed" | "created" | "focusTime" | "productivityScore"
  chartType?: "line" | "bar"
}

interface MockProjectPerformanceProps {
  projects: Array<{
    projectId: string
    projectName: string
    tasksCompleted: number
    tasksTotal: number
    completionRate: number
    averageTimeSpent: number
    color: string
  }>
}

interface MockProductivityHeatmapProps {
  data: Array<{
    hour: number
    completed: number
    created: number
  }>
  metric: string
}

interface MockStreakTrackerProps {
  currentStreak: number
}

interface MockGoalTrackerProps {
  goals: Array<Record<string, unknown>>
  onGoalCreate: (goal: { title: string }) => void
  onGoalUpdate: (id: string, goal: { title: string }) => void
  onGoalDelete: (id: string) => void
}

// Mock the child components
vi.mock("./metric-card", () => ({
  MetricCard: ({ title, value, subtitle, trend, trendValue, color }: MockMetricCardProps) => (
    <div data-testid="metric-card">
      <h3>{title}</h3>
      <div data-testid="metric-value">{value}</div>
      <div data-testid="metric-subtitle">{subtitle}</div>
      <div data-testid="metric-trend">{trend}</div>
      <div data-testid="metric-trend-value">{trendValue}</div>
      <div data-testid="metric-color">{color}</div>
    </div>
  ),
}))

vi.mock("./productivity-chart", () => ({
  ProductivityChart: ({
    data,
    dateRange,
    onDateRangeChange,
    metric,
    chartType,
  }: MockProductivityChartProps) => (
    <div data-testid="productivity-chart">
      <div data-testid="chart-data">{JSON.stringify(data)}</div>
      <div data-testid="chart-date-range">{dateRange}</div>
      <div data-testid="chart-metric">{metric}</div>
      <div data-testid="chart-type">{chartType || "line"}</div>
      <button onClick={() => onDateRangeChange("week")}>Change Date Range</button>
    </div>
  ),
}))

vi.mock("./project-performance", () => ({
  ProjectPerformance: ({ projects }: MockProjectPerformanceProps) => (
    <div data-testid="project-performance">
      <div data-testid="projects-data">{JSON.stringify(projects)}</div>
    </div>
  ),
}))

vi.mock("./productivity-heatmap", () => ({
  ProductivityHeatmap: ({ data, metric }: MockProductivityHeatmapProps) => (
    <div data-testid="productivity-heatmap">
      <div data-testid="heatmap-data">{JSON.stringify(data)}</div>
      <div data-testid="heatmap-metric">{metric}</div>
    </div>
  ),
}))

vi.mock("./streak-tracker", () => ({
  StreakTracker: ({ currentStreak }: MockStreakTrackerProps) => (
    <div data-testid="streak-tracker">
      <div data-testid="current-streak">{currentStreak}</div>
    </div>
  ),
}))

vi.mock("./goal-tracker", () => ({
  GoalTracker: ({ goals, onGoalCreate, onGoalUpdate, onGoalDelete }: MockGoalTrackerProps) => (
    <div data-testid="goal-tracker">
      <div data-testid="goals-data">{JSON.stringify(goals)}</div>
      <button onClick={() => onGoalCreate({ title: "Test Goal" })}>Create Goal</button>
      <button onClick={() => onGoalUpdate("1", { title: "Updated Goal" })}>Update Goal</button>
      <button onClick={() => onGoalDelete("1")}>Delete Goal</button>
    </div>
  ),
}))

describe("AnalyticsDashboard", () => {
  const mockCurrentMetrics = {
    tasksCompleted: 25,
    tasksCreated: 30,
    completionRate: 83.33,
    averageCompletionTime: 45,
    streak: 5,
    productivityScore: 85,
    focusTime: 120,
    overdueCount: 2,
  }

  const mockTrendData = [
    { date: "Jan 1", completed: 5, created: 6, focusTime: 60, productivityScore: 85 },
    { date: "Jan 2", completed: 8, created: 9, focusTime: 90, productivityScore: 88 },
    { date: "Jan 3", completed: 12, created: 15, focusTime: 120, productivityScore: 92 },
  ]

  const mockProjectAnalytics = [
    {
      projectId: "1",
      projectName: "Project Alpha",
      tasksCompleted: 15,
      tasksTotal: 20,
      completionRate: 75,
      averageTimeSpent: 30,
      color: "#3b82f6",
    },
    {
      projectId: "2",
      projectName: "Project Beta",
      tasksCompleted: 10,
      tasksTotal: 10,
      completionRate: 100,
      averageTimeSpent: 25,
      color: "#ef4444",
    },
  ]

  const mockLabelAnalytics = [
    {
      labelName: "urgent",
      tasksCompleted: 8,
      tasksTotal: 10,
      completionRate: 80,
      color: "#dc2626",
    },
    {
      labelName: "work",
      tasksCompleted: 12,
      tasksTotal: 15,
      completionRate: 80,
      color: "#2563eb",
    },
  ]

  const mockTimeOfDayData = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    completed: Math.floor(Math.random() * 5),
    created: Math.floor(Math.random() * 7),
  }))

  const mockSetDateRange = vi.fn()
  const mockAddFocusSession = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()

    // Mock useAtomValue to return our test data
    const mockedUseAtomValue = vi.mocked(useAtomValue)
    let atomValueCallIndex = 0

    mockedUseAtomValue.mockImplementation(() => {
      // Return mocked data based on call order (this matches the order in the component)
      switch (atomValueCallIndex++) {
        case 0:
          return mockCurrentMetrics // currentMetrics
        case 1:
          return mockTrendData // trendData
        case 2:
          return mockProjectAnalytics // projectAnalytics
        case 3:
          return mockLabelAnalytics // labelAnalytics
        case 4:
          return mockTimeOfDayData // timeOfDayData
        case 5:
          return "week" // dateRange
        default:
          return null
      }
    })

    // Mock useSetAtom to return our mock functions
    const mockedUseSetAtom = vi.mocked(useSetAtom)
    let setAtomCallIndex = 0

    mockedUseSetAtom.mockImplementation(() => {
      // Return mock functions based on call order
      switch (setAtomCallIndex++) {
        case 0:
          return mockSetDateRange // setDateRange
        case 1:
          return mockAddFocusSession // addFocusSession
        default:
          return vi.fn()
      }
    })
  })

  it("renders the analytics dashboard header", () => {
    render(<AnalyticsDashboard />)

    expect(screen.getByText("Analytics")).toBeInTheDocument()
    expect(screen.getByText("Track your productivity and insights")).toBeInTheDocument()
  })

  it("renders header action buttons", () => {
    render(<AnalyticsDashboard />)

    expect(screen.getByText("Refresh")).toBeInTheDocument()
    expect(screen.getByText("Export")).toBeInTheDocument()
    expect(screen.getByText("Share")).toBeInTheDocument()
  })

  it("renders metric cards with correct data", () => {
    render(<AnalyticsDashboard />)

    const metricCards = screen.getAllByTestId("metric-card")
    expect(metricCards).toHaveLength(4)

    // Check tasks completed metric
    expect(screen.getByText("Tasks Completed")).toBeInTheDocument()
    expect(screen.getByText("25")).toBeInTheDocument()
    expect(screen.getByText("83% completion rate")).toBeInTheDocument()

    // Check current streak metric
    expect(screen.getByText("Current Streak")).toBeInTheDocument()
    expect(screen.getByText("5 days")).toBeInTheDocument()
    expect(screen.getByText("Keep it going!")).toBeInTheDocument()

    // Check focus time metric
    expect(screen.getByText("Focus Time")).toBeInTheDocument()
    expect(screen.getByText("2h 0m")).toBeInTheDocument()
    expect(screen.getByText("Time in deep work")).toBeInTheDocument()

    // Check productivity score metric
    expect(screen.getByText("Productivity Score")).toBeInTheDocument()
    expect(screen.getByText("85")).toBeInTheDocument()
    expect(screen.getByText("Out of 100")).toBeInTheDocument()
  })

  it("renders all tab triggers", () => {
    render(<AnalyticsDashboard />)

    expect(screen.getByText("Overview")).toBeInTheDocument()
    expect(screen.getByText("Trends")).toBeInTheDocument()
    expect(screen.getByText("Projects")).toBeInTheDocument()
    expect(screen.getByText("Habits")).toBeInTheDocument()
    expect(screen.getByText("Goals")).toBeInTheDocument()
  })

  it("renders overview tab content by default", () => {
    render(<AnalyticsDashboard />)

    const productivityCharts = screen.getAllByTestId("productivity-chart")
    expect(productivityCharts).toHaveLength(2)

    const heatmap = screen.getByTestId("productivity-heatmap")
    expect(heatmap).toBeInTheDocument()
  })

  it("renders tabs without errors", () => {
    render(<AnalyticsDashboard />)

    const trendsTab = screen.getByText("Trends")
    fireEvent.click(trendsTab)

    // Should not crash when clicking tabs
    expect(screen.getByText("Analytics")).toBeInTheDocument()
  })

  it("renders projects tab without errors", () => {
    render(<AnalyticsDashboard />)

    const projectsTab = screen.getByText("Projects")
    fireEvent.click(projectsTab)

    // Should not crash when clicking projects tab
    expect(screen.getByText("Analytics")).toBeInTheDocument()
  })

  it("renders habits tab without errors", () => {
    render(<AnalyticsDashboard />)

    const habitsTab = screen.getByText("Habits")
    fireEvent.click(habitsTab)

    // Should not crash when clicking habits tab
    expect(screen.getByText("Analytics")).toBeInTheDocument()
  })

  it("renders goals tab without errors", () => {
    render(<AnalyticsDashboard />)

    const goalsTab = screen.getByText("Goals")
    fireEvent.click(goalsTab)

    // Should not crash when clicking goals tab
    expect(screen.getByText("Analytics")).toBeInTheDocument()
  })

  it("renders analytics content correctly", () => {
    render(<AnalyticsDashboard />)

    // Check that the component renders successfully
    expect(screen.getByText("Analytics")).toBeInTheDocument()
  })

  it("handles date range changes in productivity charts", () => {
    render(<AnalyticsDashboard />)

    const changeDateRangeButtons = screen.getAllByText("Change Date Range")
    const changeDateRangeButton = changeDateRangeButtons[0]
    if (!changeDateRangeButton) {
      throw new Error("Expected to find Change Date Range button")
    }
    fireEvent.click(changeDateRangeButton)

    expect(mockSetDateRange).toHaveBeenCalledWith("week")
  })

  it("handles empty project analytics gracefully", () => {
    // Mock empty project analytics
    const mockedUseAtomValue = vi.mocked(useAtomValue)
    let atomValueCallIndex = 0

    mockedUseAtomValue.mockImplementation(() => {
      switch (atomValueCallIndex++) {
        case 0:
          return mockCurrentMetrics // currentMetrics
        case 1:
          return mockTrendData // trendData
        case 2:
          return [] // projectAnalytics (empty)
        case 3:
          return mockLabelAnalytics // labelAnalytics
        case 4:
          return mockTimeOfDayData // timeOfDayData
        case 5:
          return "week" // dateRange
        default:
          return null
      }
    })

    render(<AnalyticsDashboard />)

    const projectsTab = screen.getByText("Projects")
    fireEvent.click(projectsTab)

    // Should still render without crashing
    expect(screen.getByText("Analytics")).toBeInTheDocument()
  })

  it("handles zero streak correctly", () => {
    const zeroStreakMetrics = { ...mockCurrentMetrics, streak: 0 }

    const mockedUseAtomValue = vi.mocked(useAtomValue)
    let atomValueCallIndex = 0

    mockedUseAtomValue.mockImplementation(() => {
      switch (atomValueCallIndex++) {
        case 0:
          return zeroStreakMetrics // currentMetrics (with zero streak)
        case 1:
          return mockTrendData // trendData
        case 2:
          return mockProjectAnalytics // projectAnalytics
        case 3:
          return mockLabelAnalytics // labelAnalytics
        case 4:
          return mockTimeOfDayData // timeOfDayData
        case 5:
          return "week" // dateRange
        default:
          return null
      }
    })

    render(<AnalyticsDashboard />)

    expect(screen.getByText("0 days")).toBeInTheDocument()
    expect(screen.getByText("Start today")).toBeInTheDocument()
  })

  it("calculates focus time display correctly", () => {
    const longFocusMetrics = { ...mockCurrentMetrics, focusTime: 185 } // 3h 5m

    const mockedUseAtomValue = vi.mocked(useAtomValue)
    let atomValueCallIndex = 0

    mockedUseAtomValue.mockImplementation(() => {
      switch (atomValueCallIndex++) {
        case 0:
          return longFocusMetrics // currentMetrics (with long focus time)
        case 1:
          return mockTrendData // trendData
        case 2:
          return mockProjectAnalytics // projectAnalytics
        case 3:
          return mockLabelAnalytics // labelAnalytics
        case 4:
          return mockTimeOfDayData // timeOfDayData
        case 5:
          return "week" // dateRange
        default:
          return null
      }
    })

    render(<AnalyticsDashboard />)

    expect(screen.getByText("3h 5m")).toBeInTheDocument()
  })
})
