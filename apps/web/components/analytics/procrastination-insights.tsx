"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Clock, AlertCircle, TrendingUp, Lightbulb, Calendar } from "lucide-react"
import { differenceInDays } from "date-fns"
import type { TaskId } from "@/lib/types"

interface Task {
  id: TaskId
  title: string
  createdAt: Date
  completedAt?: Date
  dueDate?: Date
  priority: number
  postponedCount?: number
  labels: string[]
}

interface ProcrastinationPattern {
  taskId: TaskId
  taskTitle: string
  daysDelayed: number
  postponedCount: number
  priority: number
  labels: string[]
  pattern: "chronic" | "occasional" | "deadline-driven"
}

interface ProcrastinationInsightsProps {
  tasks: Task[]
}

export function ProcrastinationInsights({ tasks }: ProcrastinationInsightsProps) {
  const analyzeProcrastination = () => {
    const patterns: ProcrastinationPattern[] = []
    const completedTasks = tasks.filter((task) => task.completedAt)

    completedTasks.forEach((task) => {
      if (task.dueDate && task.completedAt) {
        const daysDelayed = differenceInDays(task.completedAt, task.dueDate)
        const postponedCount = 0 // postponedCount tracking removed

        if (daysDelayed > 0) {
          let pattern: "chronic" | "occasional" | "deadline-driven"
          if (daysDelayed > 7) pattern = "deadline-driven"
          else pattern = "occasional"

          patterns.push({
            taskId: task.id,
            taskTitle: task.title,
            daysDelayed: Math.max(0, daysDelayed),
            postponedCount,
            priority: task.priority,
            labels: task.labels,
            pattern,
          })
        }
      }
    })

    return patterns.sort(
      (a, b) => b.daysDelayed - a.daysDelayed, // postponedCount removed
    )
  }

  const getInsights = (patterns: ProcrastinationPattern[]) => {
    const insights = []
    const chronicTasks = patterns.filter((p) => p.pattern === "chronic")
    const highPriorityDelayed = patterns.filter((p) => p.priority <= 2)

    if (chronicTasks.length > 0) {
      insights.push({
        type: "warning",
        title: "Chronic Procrastination Detected",
        description: `${chronicTasks.length} tasks show repeated postponement patterns`,
        action: "Break these tasks into smaller steps",
      })
    }

    if (highPriorityDelayed.length > 0) {
      insights.push({
        type: "danger",
        title: "High Priority Tasks Delayed",
        description: `${highPriorityDelayed.length} important tasks were completed late`,
        action: "Consider time-blocking for priority tasks",
      })
    }

    // Label-based patterns
    const labelCounts = new Map<string, number>()
    patterns.forEach((pattern) => {
      pattern.labels.forEach((label) => {
        labelCounts.set(label, (labelCounts.get(label) || 0) + 1)
      })
    })

    const topProblematicLabel = Array.from(labelCounts.entries()).sort((a, b) => b[1] - a[1])[0]
    if (topProblematicLabel && topProblematicLabel[1] >= 3) {
      insights.push({
        type: "info",
        title: "Pattern in Task Type",
        description: `Tasks labeled "${topProblematicLabel[0]}" are frequently delayed`,
        action: "Review your approach to these types of tasks",
      })
    }

    return insights
  }

  const patterns = analyzeProcrastination()
  const insights = getInsights(patterns)
  const procrastinationScore = Math.min((patterns.length / Math.max(tasks.length, 1)) * 100, 100)

  const getPatternColor = (pattern: string) => {
    switch (pattern) {
      case "chronic":
        return "text-red-700 bg-red-100 dark:bg-red-900 dark:text-red-300"
      case "deadline-driven":
        return "text-orange-700 bg-orange-100 dark:bg-orange-900 dark:text-orange-300"
      case "occasional":
        return "text-yellow-700 bg-yellow-100 dark:bg-yellow-900 dark:text-yellow-300"
      default:
        return "text-gray-700 bg-gray-100 dark:bg-gray-800 dark:text-gray-300"
    }
  }

  const getInsightIcon = (type: string) => {
    switch (type) {
      case "warning":
        return <AlertCircle className="h-4 w-4 text-orange-500" />
      case "danger":
        return <AlertCircle className="h-4 w-4 text-red-500" />
      case "info":
        return <Lightbulb className="h-4 w-4 text-blue-500" />
      default:
        return <Lightbulb className="h-4 w-4 text-gray-500" />
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Procrastination Insights
        </CardTitle>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Identify and overcome delay patterns
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Procrastination Score */}
        <div className="text-center p-4 bg-linear-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-lg">
          <div className="text-3xl font-bold text-orange-600 dark:text-orange-400 mb-1">
            {Math.round(procrastinationScore)}%
          </div>
          <div className="text-sm text-orange-800 dark:text-orange-200">
            Tasks affected by delays
          </div>
          <Progress value={100 - procrastinationScore} className="mt-2 h-2" />
        </div>

        {/* Insights */}
        {insights.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Key Insights</h4>
            {insights.map((insight, index) => (
              <div
                key={index}
                className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg"
              >
                <div className="flex items-start gap-3">
                  {getInsightIcon(insight.type)}
                  <div className="flex-1">
                    <h5 className="font-medium text-sm text-gray-900 dark:text-gray-100">
                      {insight.title}
                    </h5>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {insight.description}
                    </p>
                    <p className="text-sm text-blue-600 dark:text-blue-400 mt-2 font-medium">
                      {insight.action}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Top Delayed Tasks */}
        {patterns.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Most Delayed Tasks</h4>
            <div className="space-y-2">
              {patterns.slice(0, 5).map((pattern) => (
                <div
                  key={pattern.taskId}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                >
                  <div className="flex-1">
                    <h5 className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
                      {pattern.taskTitle}
                    </h5>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className={getPatternColor(pattern.pattern)} variant="outline">
                        {pattern.pattern}
                      </Badge>
                      {pattern.daysDelayed > 0 && (
                        <span className="text-xs text-gray-500">
                          {pattern.daysDelayed} days late
                        </span>
                      )}
                      {/* PostponedCount feature removed */}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No Procrastination */}
        {patterns.length === 0 && (
          <div className="text-center py-8">
            <TrendingUp className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-green-700 dark:text-green-300 mb-2">
              Great Job!
            </h3>
            <p className="text-green-600 dark:text-green-400">
              No significant procrastination patterns detected
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1 bg-transparent">
            <Calendar className="h-4 w-4 mr-2" />
            Time Block
          </Button>
          <Button variant="outline" size="sm" className="flex-1 bg-transparent">
            <Lightbulb className="h-4 w-4 mr-2" />
            Get Tips
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
