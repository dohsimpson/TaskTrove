"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Target, Plus, Edit, Trash2, CheckCircle, Clock } from "lucide-react"

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

interface GoalTrackerProps {
  goals: Goal[]
  onGoalCreate: (goal: Omit<Goal, "id" | "createdAt">) => void
  onGoalUpdate: (id: string, updates: Partial<Goal>) => void
  onGoalDelete: (id: string) => void
}

export function GoalTracker({ goals, onGoalCreate, onGoalDelete }: GoalTrackerProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [, setEditingGoal] = useState<Goal | null>(null)
  const [newGoal, setNewGoal] = useState<{
    title: string
    target: number
    type: Goal["type"]
    period: Goal["period"]
  }>({
    title: "",
    target: 0,
    type: "tasks",
    period: "daily",
  })

  const handleCreateGoal = () => {
    if (newGoal.title && newGoal.target > 0) {
      onGoalCreate({
        ...newGoal,
        current: 0,
      })
      setNewGoal({ title: "", target: 0, type: "tasks", period: "daily" })
      setShowCreateDialog(false)
    }
  }

  const getGoalProgress = (goal: Goal) => {
    return Math.min((goal.current / goal.target) * 100, 100)
  }

  const getGoalStatus = (goal: Goal) => {
    const progress = getGoalProgress(goal)
    if (progress >= 100) return { status: "completed", color: "success" }
    if (progress >= 75) return { status: "on-track", color: "success" }
    if (progress >= 50) return { status: "good", color: "warning" }
    return { status: "behind", color: "danger" }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "tasks":
        return "Tasks"
      case "focus_time":
        return "Focus Time (min)"
      case "projects":
        return "Projects"
      default:
        return type
    }
  }

  const getPeriodLabel = (period: string) => {
    switch (period) {
      case "daily":
        return "Daily"
      case "weekly":
        return "Weekly"
      case "monthly":
        return "Monthly"
      default:
        return period
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Goals & Targets
          </CardTitle>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Add Goal
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Goal</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Goal Title</label>
                  <Input
                    value={newGoal.title}
                    onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })}
                    placeholder="e.g., Complete 5 tasks daily"
                    className="mt-1"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Type</label>
                    <Select
                      value={newGoal.type}
                      onValueChange={(value: Goal["type"]) =>
                        setNewGoal({ ...newGoal, type: value })
                      }
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="tasks">Tasks</SelectItem>
                        <SelectItem value="focus_time">Focus Time</SelectItem>
                        <SelectItem value="projects">Projects</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Period</label>
                    <Select
                      value={newGoal.period}
                      onValueChange={(value: Goal["period"]) =>
                        setNewGoal({ ...newGoal, period: value })
                      }
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Target</label>
                  <Input
                    type="number"
                    value={newGoal.target}
                    onChange={(e) =>
                      setNewGoal({ ...newGoal, target: Number.parseInt(e.target.value) || 0 })
                    }
                    placeholder="e.g., 5"
                    className="mt-1"
                  />
                </div>
                <Button onClick={handleCreateGoal} className="w-full">
                  Create Goal
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {goals.map((goal) => {
          const progress = getGoalProgress(goal)
          const { status, color } = getGoalStatus(goal)

          return (
            <div
              key={goal.id}
              className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-medium text-sm">{goal.title}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">
                      {getPeriodLabel(goal.period)}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {getTypeLabel(goal.type)}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={`text-xs ${
                        color === "success"
                          ? "text-green-700 border-green-300"
                          : color === "warning"
                            ? "text-orange-700 border-orange-300"
                            : "text-red-700 border-red-300"
                      }`}
                    >
                      {status === "completed" && <CheckCircle className="h-3 w-3 mr-1" />}
                      {status === "behind" && <Clock className="h-3 w-3 mr-1" />}
                      {status.charAt(0).toUpperCase() + status.slice(1).replace("-", " ")}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => setEditingGoal(goal)}
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-red-600"
                    onClick={() => onGoalDelete(goal.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Progress</span>
                  <span className="font-medium">
                    {goal.current} / {goal.target}
                    {goal.type === "focus_time" && " min"}
                  </span>
                </div>
                <Progress value={progress} className="h-2" />
                <div className="text-xs text-gray-500 text-right">
                  {Math.round(progress)}% complete
                </div>
              </div>
            </div>
          )
        })}

        {goals.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No goals set yet</p>
            <p className="text-xs">Create your first goal to start tracking progress</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
