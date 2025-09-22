"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Brain,
  Calendar,
  Clock,
  Zap,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Settings,
  Target,
  BarChart3,
} from "lucide-react"

import type { TaskId } from "@/lib/types"

interface Task {
  id: TaskId
  title: string
  priority: 1 | 2 | 3 | 4
  estimatedTime?: number
  dueDate?: Date
  completed: boolean
  labels: string[]
  difficulty?: 1 | 2 | 3 | 4 | 5
  energyRequired?: "low" | "medium" | "high"
}

interface SmartSuggestion {
  id: string
  type: "reschedule" | "prioritize" | "break_down" | "delegate" | "defer"
  taskId: TaskId
  taskTitle: string
  reason: string
  suggestion: string
  confidence: number
  impact: "low" | "medium" | "high"
  effort: "low" | "medium" | "high"
}

interface AutomationRule {
  id: string
  name: string
  trigger: string
  action: string
  enabled: boolean
  conditions: Array<{ field: string; operator: string; value: string | number | boolean }>
}

interface SmartSchedulingProps {
  tasks: Task[]
  suggestions: SmartSuggestion[]
  automationRules: AutomationRule[]
  onApplySuggestion: (suggestionId: string) => void
  onDismissSuggestion: (suggestionId: string) => void
  onToggleRule: (ruleId: string, enabled: boolean) => void
  onCreateRule: (rule: Omit<AutomationRule, "id">) => void
  userPreferences: {
    workingHours: { start: number; end: number }
    energyPeaks: Array<{ time: number; level: "high" | "medium" | "low" }>
    breakPreferences: { frequency: number; duration: number }
    focusBlocks: boolean
  }
}

export function SmartScheduling({
  tasks,
  suggestions,
  automationRules,
  onApplySuggestion,
  onDismissSuggestion,
  onToggleRule,
  userPreferences,
}: SmartSchedulingProps) {
  const [aiEnabled, setAiEnabled] = useState(true)
  const [selectedTimeframe, setSelectedTimeframe] = useState("today")
  const [optimizationGoal, setOptimizationGoal] = useState("productivity")

  // Calculate AI insights
  const getAIInsights = () => {
    const overdueTasks = tasks.filter(
      (t) => !t.completed && t.dueDate && t.dueDate < new Date(),
    ).length
    const highPriorityTasks = tasks.filter((t) => !t.completed && t.priority <= 2).length
    const totalEstimatedTime = tasks
      .filter((t) => !t.completed && t.estimatedTime)
      .reduce((acc, t) => acc + (t.estimatedTime || 0), 0)

    const workingHoursAvailable =
      userPreferences.workingHours.end - userPreferences.workingHours.start
    const utilizationRate = (totalEstimatedTime / 60 / workingHoursAvailable) * 100

    return {
      overdueTasks,
      highPriorityTasks,
      totalEstimatedTime,
      utilizationRate,
      recommendation:
        utilizationRate > 100 ? "overloaded" : utilizationRate > 80 ? "busy" : "manageable",
    }
  }

  const insights = getAIInsights()

  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case "reschedule":
        return <Calendar className="h-4 w-4" />
      case "prioritize":
        return <TrendingUp className="h-4 w-4" />
      case "break_down":
        return <Target className="h-4 w-4" />
      case "delegate":
        return <Settings className="h-4 w-4" />
      case "defer":
        return <Clock className="h-4 w-4" />
      default:
        return <Brain className="h-4 w-4" />
    }
  }

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case "high":
        return "text-green-700 bg-green-100 dark:bg-green-900 dark:text-green-300"
      case "medium":
        return "text-yellow-700 bg-yellow-100 dark:bg-yellow-900 dark:text-yellow-300"
      case "low":
        return "text-gray-700 bg-gray-100 dark:bg-gray-800 dark:text-gray-300"
      default:
        return "text-gray-700 bg-gray-100 dark:bg-gray-800 dark:text-gray-300"
    }
  }

  const getRecommendationAlert = () => {
    switch (insights.recommendation) {
      case "overloaded":
        return {
          type: "destructive" as const,
          icon: <AlertCircle className="h-4 w-4" />,
          title: "Schedule Overloaded",
          description: `You have ${Math.round(insights.utilizationRate)}% capacity utilization. Consider rescheduling or delegating tasks.`,
        }
      case "busy":
        return {
          type: "default" as const,
          icon: <Clock className="h-4 w-4" />,
          title: "Busy Schedule",
          description: `You have ${Math.round(insights.utilizationRate)}% capacity utilization. Your schedule is quite full.`,
        }
      default:
        return {
          type: "default" as const,
          icon: <CheckCircle className="h-4 w-4" />,
          title: "Manageable Schedule",
          description: `You have ${Math.round(insights.utilizationRate)}% capacity utilization. Good balance!`,
        }
    }
  }

  const recommendationAlert = getRecommendationAlert()

  return (
    <div className="space-y-6">
      {/* AI Control Panel */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Smart Scheduling
            </CardTitle>
            <Switch checked={aiEnabled} onCheckedChange={setAiEnabled} />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Schedule Overview */}
          <Alert
            className={
              recommendationAlert.type === "destructive"
                ? "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20"
                : ""
            }
          >
            {recommendationAlert.icon}
            <AlertDescription>
              <strong>{recommendationAlert.title}:</strong> {recommendationAlert.description}
            </AlertDescription>
          </Alert>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{insights.overdueTasks}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Overdue</div>
            </div>
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">{insights.highPriorityTasks}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">High Priority</div>
            </div>
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {Math.round(insights.totalEstimatedTime / 60)}h
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Estimated Time</div>
            </div>
          </div>

          {/* Capacity Utilization */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Capacity Utilization</span>
              <span className="font-medium">{Math.round(insights.utilizationRate)}%</span>
            </div>
            <Progress value={Math.min(insights.utilizationRate, 100)} className="h-2" />
          </div>

          {/* Optimization Controls */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Timeframe</label>
              <Select value={selectedTimeframe} onValueChange={setSelectedTimeframe}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="tomorrow">Tomorrow</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Optimize For</label>
              <Select value={optimizationGoal} onValueChange={setOptimizationGoal}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="productivity">Productivity</SelectItem>
                  <SelectItem value="energy">Energy Levels</SelectItem>
                  <SelectItem value="deadlines">Deadlines</SelectItem>
                  <SelectItem value="balance">Work-Life Balance</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Suggestions */}
      {aiEnabled && suggestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              AI Suggestions ({suggestions.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {suggestions.map((suggestion) => (
              <div
                key={suggestion.id}
                className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getSuggestionIcon(suggestion.type)}
                    <span className="font-medium text-sm">{suggestion.taskTitle}</span>
                    <Badge className={getImpactColor(suggestion.impact)} variant="outline">
                      {suggestion.impact} impact
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-gray-500">
                      {suggestion.confidence}% confidence
                    </span>
                  </div>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{suggestion.reason}</p>
                <p className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-3">
                  {suggestion.suggestion}
                </p>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => onApplySuggestion(suggestion.id)}>
                    Apply
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onDismissSuggestion(suggestion.id)}
                  >
                    Dismiss
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Automation Rules */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Automation Rules ({automationRules.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {automationRules.map((rule) => (
            <div
              key={rule.id}
              className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm">{rule.name}</span>
                  <Badge variant={rule.enabled ? "default" : "secondary"}>
                    {rule.enabled ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  When {rule.trigger} → {rule.action}
                </p>
              </div>
              <Switch
                checked={rule.enabled}
                onCheckedChange={(enabled) => onToggleRule(rule.id, enabled)}
              />
            </div>
          ))}

          {automationRules.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Settings className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No automation rules configured</p>
              <Button variant="outline" size="sm" className="mt-2 bg-transparent">
                Create First Rule
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Energy & Focus Optimization */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Energy & Focus Optimization
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Energy Levels Throughout Day */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Energy Levels</h4>
              <div className="space-y-1">
                {userPreferences.energyPeaks.map((peak, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <span>{peak.time}:00</span>
                    <Badge
                      variant={
                        peak.level === "high"
                          ? "default"
                          : peak.level === "medium"
                            ? "secondary"
                            : "outline"
                      }
                    >
                      {peak.level}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            {/* Focus Block Recommendations */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Focus Blocks</h4>
              <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                <p>• 9:00-11:00 AM: Deep work (High energy)</p>
                <p>• 2:00-4:00 PM: Creative tasks (Medium energy)</p>
                <p>• 4:30-5:30 PM: Admin tasks (Low energy)</p>
              </div>
            </div>
          </div>

          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>AI Recommendation:</strong> Schedule your high-priority tasks during 9-11 AM
              when your energy is highest. Consider moving routine tasks to the afternoon energy
              dip.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
