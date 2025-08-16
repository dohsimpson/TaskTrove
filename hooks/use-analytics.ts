"use client"

import { useState, useMemo } from "react"
import { startOfDay, endOfDay, subDays, format, startOfWeek, endOfWeek } from "date-fns"
import { log } from "../lib/utils/logger"

interface Task {
  id: string
  title: string
  completed: boolean
  priority: number
  dueDate?: Date
  projectId: string
  labels: string[]
  createdAt: Date
  completedAt?: Date
  timeSpent?: number // in minutes
  postponedCount?: number
  energyLevel?: 1 | 2 | 3 | 4 | 5 // 1=low, 5=high
}

interface ProductivityMetrics {
  tasksCompleted: number
  tasksCreated: number
  completionRate: number
  averageCompletionTime: number
  streak: number
  productivityScore: number
  focusTime: number
  overdueCount: number
}

interface TrendData {
  date: string
  completed: number
  created: number
  focusTime: number
  productivityScore: number
}

interface ProjectAnalytics {
  projectId: string
  projectName: string
  tasksCompleted: number
  tasksTotal: number
  completionRate: number
  averageTimeSpent: number
  color: string
}

interface LabelAnalytics {
  labelName: string
  tasksCompleted: number
  tasksTotal: number
  completionRate: number
  color: string
}

export function useAnalytics(tasks: Task[], projects: any[], labels: any[]) {
  log.warn(
    { module: "hooks" },
    "DEPRECATED: useAnalytics hook is deprecated and will be removed in a future version. Use analytics atoms from @/lib/atoms instead",
  )

  const [dateRange, setDateRange] = useState<"today" | "week" | "month" | "year">("week")
  const [focusSessions, setFocusSessions] = useState<
    Array<{ date: Date; duration: number; taskId?: string }>
  >([])

  // Calculate date range
  const getDateRange = () => {
    const now = new Date()
    switch (dateRange) {
      case "today":
        return { start: startOfDay(now), end: endOfDay(now) }
      case "week":
        return { start: startOfWeek(now), end: endOfWeek(now) }
      case "month":
        return { start: subDays(now, 30), end: now }
      case "year":
        return { start: subDays(now, 365), end: now }
    }
  }

  // Current period metrics
  const currentMetrics = useMemo((): ProductivityMetrics => {
    const { start, end } = getDateRange()
    const periodTasks = tasks.filter((task) => task.createdAt >= start && task.createdAt <= end)
    const completedTasks = periodTasks.filter((task) => task.completed && task.completedAt)
    const overdueTasks = tasks.filter(
      (task) => !task.completed && task.dueDate && task.dueDate < new Date(),
    )

    const completionRate =
      periodTasks.length > 0 ? (completedTasks.length / periodTasks.length) * 100 : 0
    const averageCompletionTime =
      completedTasks.length > 0
        ? completedTasks.reduce((acc, task) => acc + (task.timeSpent || 0), 0) /
          completedTasks.length
        : 0

    // Calculate streak
    let streak = 0
    let currentDate = new Date()
    while (true) {
      const dayTasks = tasks.filter(
        (task) =>
          task.completedAt &&
          task.completedAt >= startOfDay(currentDate) &&
          task.completedAt <= endOfDay(currentDate),
      )
      if (dayTasks.length === 0) break
      streak++
      currentDate = subDays(currentDate, 1)
    }

    // Calculate productivity score (0-100)
    const baseScore = Math.min(completionRate, 100)
    const streakBonus = Math.min(streak * 2, 20)
    const priorityBonus = completedTasks.filter((task) => task.priority <= 2).length * 5
    const productivityScore = Math.min(baseScore + streakBonus + priorityBonus, 100)

    const focusTime = focusSessions
      .filter((session) => session.date >= start && session.date <= end)
      .reduce((acc, session) => acc + session.duration, 0)

    return {
      tasksCompleted: completedTasks.length,
      tasksCreated: periodTasks.length,
      completionRate,
      averageCompletionTime,
      streak,
      productivityScore,
      focusTime,
      overdueCount: overdueTasks.length,
    }
  }, [tasks, dateRange, focusSessions])

  // Trend data for charts
  const trendData = useMemo((): TrendData[] => {
    const { start } = getDateRange()
    const days =
      dateRange === "today" ? 1 : dateRange === "week" ? 7 : dateRange === "month" ? 30 : 365
    const data: TrendData[] = []

    for (let i = days - 1; i >= 0; i--) {
      const date = subDays(new Date(), i)
      const dayStart = startOfDay(date)
      const dayEnd = endOfDay(date)

      const completed = tasks.filter(
        (task) => task.completedAt && task.completedAt >= dayStart && task.completedAt <= dayEnd,
      ).length

      const created = tasks.filter(
        (task) => task.createdAt >= dayStart && task.createdAt <= dayEnd,
      ).length

      const dayFocusTime = focusSessions
        .filter((session) => session.date >= dayStart && session.date <= dayEnd)
        .reduce((acc, session) => acc + session.duration, 0)

      // Simple productivity score for the day
      const dayProductivityScore =
        completed > 0 ? Math.min(completed * 10 + dayFocusTime / 10, 100) : 0

      data.push({
        date: format(date, dateRange === "year" ? "MMM" : "MMM d"),
        completed,
        created,
        focusTime: dayFocusTime,
        productivityScore: dayProductivityScore,
      })
    }

    return data
  }, [tasks, focusSessions, dateRange])

  // Project analytics
  const projectAnalytics = useMemo((): ProjectAnalytics[] => {
    return projects.map((project) => {
      const projectTasks = tasks.filter((task) => task.projectId === project.id)
      const completedTasks = projectTasks.filter((task) => task.completed)
      const completionRate =
        projectTasks.length > 0 ? (completedTasks.length / projectTasks.length) * 100 : 0
      const averageTimeSpent =
        completedTasks.length > 0
          ? completedTasks.reduce((acc, task) => acc + (task.timeSpent || 0), 0) /
            completedTasks.length
          : 0

      return {
        projectId: project.id,
        projectName: project.name,
        tasksCompleted: completedTasks.length,
        tasksTotal: projectTasks.length,
        completionRate,
        averageTimeSpent,
        color: project.color,
      }
    })
  }, [tasks, projects])

  // Label analytics
  const labelAnalytics = useMemo((): LabelAnalytics[] => {
    const labelMap = new Map<string, { completed: number; total: number; color: string }>()

    tasks.forEach((task) => {
      task.labels.forEach((labelName) => {
        const label = labels.find((l) => l.name === labelName)
        const current = labelMap.get(labelName) || {
          completed: 0,
          total: 0,
          color: label?.color || "#gray",
        }
        current.total++
        if (task.completed) current.completed++
        labelMap.set(labelName, current)
      })
    })

    return Array.from(labelMap.entries()).map(([labelName, data]) => ({
      labelName,
      tasksCompleted: data.completed,
      tasksTotal: data.total,
      completionRate: data.total > 0 ? (data.completed / data.total) * 100 : 0,
      color: data.color,
    }))
  }, [tasks, labels])

  // Time of day analytics
  const timeOfDayData = useMemo(() => {
    const hourlyData = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      completed: 0,
      created: 0,
    }))

    tasks.forEach((task) => {
      if (task.completedAt) {
        const hour = task.completedAt.getHours()
        hourlyData[hour].completed++
      }
      const createdHour = task.createdAt.getHours()
      hourlyData[createdHour].created++
    })

    return hourlyData
  }, [tasks])

  const addFocusSession = (duration: number, taskId?: string) => {
    setFocusSessions((prev) => [...prev, { date: new Date(), duration, taskId }])
  }

  return {
    currentMetrics,
    trendData,
    projectAnalytics,
    labelAnalytics,
    timeOfDayData,
    dateRange,
    setDateRange,
    addFocusSession,
  }
}
