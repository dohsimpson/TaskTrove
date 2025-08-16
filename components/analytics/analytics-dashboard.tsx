"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  BarChart3,
  TrendingUp,
  Target,
  Clock,
  CheckSquare,
  Flame,
  Calendar,
  Download,
  Share,
  RefreshCw,
  Folder,
} from "lucide-react"

import { MetricCard } from "./metric-card"
import { ProductivityChart } from "./productivity-chart"
import { ProjectPerformance } from "./project-performance"
import { ProductivityHeatmap } from "./productivity-heatmap"
import { StreakTracker } from "./streak-tracker"
import { GoalTracker } from "./goal-tracker"
import { useAtomValue, useSetAtom } from "jotai"
import { analyticsAtoms } from "@/lib/atoms"
import { log } from "@/lib/utils/logger"
import type { TimePeriod } from "@/lib/types"

interface Goal {
  id: string
  title: string
  target: number
  current: number
  period: "daily" | "weekly" | "monthly"
  type: "tasks" | "focus_time" | "projects"
  createdAt: Date
  deadline?: Date
}

export function AnalyticsDashboard() {
  // Get analytics data from atoms
  const currentMetrics = useAtomValue(analyticsAtoms.derived.currentMetrics)
  const trendData = useAtomValue(analyticsAtoms.derived.trendData)
  const projectAnalytics = useAtomValue(analyticsAtoms.derived.projectAnalytics)
  const labelAnalytics = useAtomValue(analyticsAtoms.derived.labelAnalytics)
  const timeOfDayData = useAtomValue(analyticsAtoms.derived.timeOfDayData)
  const dateRange = useAtomValue(analyticsAtoms.dateRange)

  // Get action atoms
  const setDateRange = useSetAtom(analyticsAtoms.actions.setDateRange)

  const handleGoalCreate = (goal: Omit<Goal, "id" | "createdAt">) => {
    // Implementation for goal creation
    log.info({ module: "analytics", goal }, "Creating goal")
  }

  const handleGoalUpdate = (id: string, updates: Partial<Goal>) => {
    // Implementation for goal updates
    log.info({ module: "analytics", goalId: id, updates }, "Updating goal")
  }

  const handleGoalDelete = (id: string) => {
    // Implementation for goal deletion
    log.info({ module: "analytics", goalId: id }, "Deleting goal")
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Analytics</h1>
          <p className="text-gray-600 dark:text-gray-400">Track your productivity and insights</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm">
            <Share className="h-4 w-4 mr-2" />
            Share
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Tasks Completed"
          value={currentMetrics.tasksCompleted}
          subtitle={`${Math.round(currentMetrics.completionRate)}% completion rate`}
          trend="up"
          trendValue="+12%"
          icon={<CheckSquare className="h-5 w-5" />}
          color="success"
        />
        <MetricCard
          title="Current Streak"
          value={`${currentMetrics.streak} days`}
          subtitle="Keep it going!"
          trend={currentMetrics.streak > 0 ? "up" : "neutral"}
          trendValue={currentMetrics.streak > 0 ? "Active" : "Start today"}
          icon={<Flame className="h-5 w-5" />}
          color={currentMetrics.streak > 0 ? "success" : "warning"}
        />
        <MetricCard
          title="Focus Time"
          value={`${Math.round(currentMetrics.focusTime / 60)}h ${currentMetrics.focusTime % 60}m`}
          subtitle="Time in deep work"
          trend="up"
          trendValue="+25min"
          icon={<Clock className="h-5 w-5" />}
          color="default"
        />
        <MetricCard
          title="Productivity Score"
          value={Math.round(currentMetrics.productivityScore)}
          subtitle="Out of 100"
          trend={currentMetrics.productivityScore >= 70 ? "up" : "down"}
          trendValue={`${currentMetrics.productivityScore >= 70 ? "+" : ""}${Math.round(currentMetrics.productivityScore - 65)}`}
          icon={<TrendingUp className="h-5 w-5" />}
          color={currentMetrics.productivityScore >= 70 ? "success" : "warning"}
        />
      </div>

      {/* Main Analytics Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="trends" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Trends
          </TabsTrigger>
          <TabsTrigger value="projects" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Projects
          </TabsTrigger>
          <TabsTrigger value="habits" className="flex items-center gap-2">
            <Flame className="h-4 w-4" />
            Habits
          </TabsTrigger>
          <TabsTrigger value="goals" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Goals
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ProductivityChart
              data={trendData}
              dateRange={dateRange}
              onDateRangeChange={(value: TimePeriod) => setDateRange(value)}
              metric="completed"
            />
            <ProductivityChart
              data={trendData}
              dateRange={dateRange}
              onDateRangeChange={(value: TimePeriod) => setDateRange(value)}
              metric="focusTime"
              chartType="bar"
            />
          </div>
          <ProductivityHeatmap data={timeOfDayData} metric="completed" />
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ProductivityChart
              data={trendData}
              dateRange={dateRange}
              onDateRangeChange={(value: TimePeriod) => setDateRange(value)}
              metric="productivityScore"
            />
            <Card>
              <CardHeader>
                <CardTitle>Label Performance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {labelAnalytics.slice(0, 5).map((label) => (
                  <div key={label.labelName} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Folder className="h-3 w-3" style={{ color: label.color }} />
                      <span className="text-sm font-medium">#{label.labelName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {label.tasksCompleted}/{label.tasksTotal}
                      </Badge>
                      <span className="text-sm font-medium">
                        {Math.round(label.completionRate)}%
                      </span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="projects" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ProjectPerformance projects={projectAnalytics} />
            <Card>
              <CardHeader>
                <CardTitle>Project Insights</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                    Top Performer
                  </h4>
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    {projectAnalytics.length > 0 &&
                      `${projectAnalytics.sort((a, b) => b.completionRate - a.completionRate)[0]?.projectName} with ${Math.round(projectAnalytics.sort((a, b) => b.completionRate - a.completionRate)[0]?.completionRate)}% completion rate`}
                  </p>
                </div>
                <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                  <h4 className="font-medium text-orange-900 dark:text-orange-100 mb-2">
                    Needs Attention
                  </h4>
                  <p className="text-sm text-orange-800 dark:text-orange-200">
                    {projectAnalytics.length > 0 &&
                      `${projectAnalytics.sort((a, b) => a.completionRate - b.completionRate)[0]?.projectName} could use more focus`}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="habits" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <StreakTracker currentStreak={currentMetrics.streak} />
            <ProductivityHeatmap data={timeOfDayData} metric="created" />
          </div>
        </TabsContent>

        <TabsContent value="goals" className="space-y-6">
          <GoalTracker
            goals={[]} // This would come from your state management
            onGoalCreate={handleGoalCreate}
            onGoalUpdate={handleGoalUpdate}
            onGoalDelete={handleGoalDelete}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
