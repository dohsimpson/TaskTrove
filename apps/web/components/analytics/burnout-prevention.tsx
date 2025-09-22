"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AlertTriangle, Battery, TrendingDown, Calendar, Target } from "lucide-react"
import { subDays } from "date-fns"

interface Task {
  id: string
  createdAt: Date
  completedAt?: Date
  dueDate?: Date
  priority: number
  timeSpent?: number
}

interface BurnoutMetrics {
  workloadScore: number // 0-100
  stressLevel: "low" | "moderate" | "high" | "critical"
  overdueTasks: number
  avgDailyTasks: number
  weeklyWorkload: number
  recommendations: string[]
}

interface BurnoutPreventionProps {
  tasks: Task[]
  focusSessions: Array<{ date: Date; duration: number }>
}

export function BurnoutPrevention({ tasks, focusSessions }: BurnoutPreventionProps) {
  const calculateBurnoutMetrics = (): BurnoutMetrics => {
    const now = new Date()
    const lastWeek = subDays(now, 7)

    // Recent tasks
    const recentTasks = tasks.filter((task) => task.createdAt >= lastWeek)
    const completedRecently = tasks.filter(
      (task) => task.completedAt && task.completedAt >= lastWeek,
    )
    const overdueTasks = tasks.filter(
      (task) => !task.completedAt && task.dueDate && task.dueDate < now,
    ).length

    // Calculate daily averages
    const avgDailyTasks = recentTasks.length / 7

    // Focus time analysis
    const recentFocusTime = focusSessions
      .filter((session) => session.date >= lastWeek)
      .reduce((acc, session) => acc + session.duration, 0)
    const avgDailyFocusTime = recentFocusTime / 7

    // Workload score calculation (0-100)
    let workloadScore = 0
    workloadScore += Math.min(avgDailyTasks * 10, 40) // Task volume
    workloadScore += Math.min(overdueTasks * 5, 30) // Overdue pressure
    workloadScore += Math.min(avgDailyFocusTime / 10, 20) // Focus intensity
    workloadScore += Math.min(recentTasks.filter((t) => t.priority <= 2).length * 2, 10) // High priority tasks

    // Determine stress level
    let stressLevel: "low" | "moderate" | "high" | "critical"
    if (workloadScore >= 80) stressLevel = "critical"
    else if (workloadScore >= 60) stressLevel = "high"
    else if (workloadScore >= 40) stressLevel = "moderate"
    else stressLevel = "low"

    // Generate recommendations
    const recommendations: string[] = []
    if (overdueTasks > 5)
      recommendations.push("Consider rescheduling or breaking down overdue tasks")
    if (avgDailyTasks > 10) recommendations.push("Try to limit daily tasks to maintain quality")
    if (avgDailyFocusTime > 300) recommendations.push("Take more breaks during focus sessions")
    if (workloadScore > 70)
      recommendations.push("Consider delegating or postponing non-critical tasks")
    if (completedRecently.length / recentTasks.length < 0.7)
      recommendations.push("Focus on completing existing tasks before adding new ones")

    return {
      workloadScore,
      stressLevel,
      overdueTasks,
      avgDailyTasks,
      weeklyWorkload: recentTasks.length,
      recommendations,
    }
  }

  const metrics = calculateBurnoutMetrics()

  const getStressColor = (level: string) => {
    switch (level) {
      case "low":
        return "text-green-600 bg-green-100 dark:bg-green-900 dark:text-green-300"
      case "moderate":
        return "text-yellow-600 bg-yellow-100 dark:bg-yellow-900 dark:text-yellow-300"
      case "high":
        return "text-orange-600 bg-orange-100 dark:bg-orange-900 dark:text-orange-300"
      case "critical":
        return "text-red-600 bg-red-100 dark:bg-red-900 dark:text-red-300"
      default:
        return "text-gray-600 bg-gray-100 dark:bg-gray-800 dark:text-gray-300"
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Battery className="h-5 w-5" />
          Burnout Prevention
        </CardTitle>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Monitor your workload and stress levels
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stress Level Alert */}
        {metrics.stressLevel === "critical" && (
          <Alert className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800 dark:text-red-200">
              <strong>High stress detected!</strong> Consider taking a break and reviewing your
              workload.
            </AlertDescription>
          </Alert>
        )}

        {/* Workload Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {Math.round(metrics.avgDailyTasks)}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Avg Daily Tasks</div>
          </div>
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {metrics.overdueTasks}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Overdue Tasks</div>
          </div>
        </div>

        {/* Workload Score */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Workload Intensity</span>
            <Badge className={getStressColor(metrics.stressLevel)}>
              {metrics.stressLevel.charAt(0).toUpperCase() + metrics.stressLevel.slice(1)}
            </Badge>
          </div>
          <Progress value={metrics.workloadScore} className="h-3" />
          <div className="flex justify-between text-xs text-gray-500">
            <span>Relaxed</span>
            <span>{Math.round(metrics.workloadScore)}%</span>
            <span>Overwhelming</span>
          </div>
        </div>

        {/* Recommendations */}
        {metrics.recommendations.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4" />
              Recommendations
            </h4>
            <div className="space-y-2">
              {metrics.recommendations.map((rec, index) => (
                <div
                  key={index}
                  className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg"
                >
                  <div className="h-2 w-2 bg-blue-500 rounded-full mt-2 shrink-0" />
                  <p className="text-sm text-blue-800 dark:text-blue-200">{rec}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1 bg-transparent">
            <Calendar className="h-4 w-4 mr-2" />
            Schedule Break
          </Button>
          <Button variant="outline" size="sm" className="flex-1 bg-transparent">
            <TrendingDown className="h-4 w-4 mr-2" />
            Reduce Load
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
