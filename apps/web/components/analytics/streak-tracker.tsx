"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Flame, Calendar, Trophy, Target } from "lucide-react"
import { format, subDays, isToday, startOfDay, endOfDay } from "date-fns"
import { useAtomValue } from "jotai"
import { tasksAtom } from "@tasktrove/atoms/data/base/atoms"
import type { Task } from "@/lib/types"

interface StreakTrackerProps {
  currentStreak: number
}

export function StreakTracker({ currentStreak }: StreakTrackerProps) {
  // Get tasks from atoms
  const tasks = useAtomValue(tasksAtom)
  // Calculate streak calendar (last 30 days)
  const getStreakCalendar = () => {
    const calendar = []
    for (let i = 29; i >= 0; i--) {
      const date = subDays(new Date(), i)
      const dayTasks = tasks.filter(
        (task: Task) =>
          task.completedAt &&
          task.completedAt >= startOfDay(date) &&
          task.completedAt <= endOfDay(date),
      )
      calendar.push({
        date,
        hasActivity: dayTasks.length > 0,
        taskCount: dayTasks.length,
        isToday: isToday(date),
      })
    }
    return calendar
  }

  const streakCalendar = getStreakCalendar()
  const longestStreak = calculateLongestStreak(tasks)
  const weekStreak = calculateWeekStreak(tasks)

  function calculateLongestStreak(tasks: Task[]): number {
    let maxStreak = 0
    let currentStreak = 0
    let currentDate = new Date()

    // Go back day by day and check for activity
    for (let i = 0; i < 365; i++) {
      const dayTasks = tasks.filter(
        (task) =>
          task.completedAt &&
          task.completedAt >= startOfDay(currentDate) &&
          task.completedAt <= endOfDay(currentDate),
      )

      if (dayTasks.length > 0) {
        currentStreak++
        maxStreak = Math.max(maxStreak, currentStreak)
      } else {
        currentStreak = 0
      }

      currentDate = subDays(currentDate, 1)
    }

    return maxStreak
  }

  function calculateWeekStreak(tasks: Task[]): number {
    // Calculate how many weeks in a row had at least one completed task
    let weekStreak = 0
    let currentDate = new Date()

    while (weekStreak < 52) {
      // Check last 52 weeks
      const weekStart = subDays(currentDate, 6)
      const weekTasks = tasks.filter(
        (task) =>
          task.completedAt &&
          task.completedAt >= startOfDay(weekStart) &&
          task.completedAt <= endOfDay(currentDate),
      )

      if (weekTasks.length === 0) break
      weekStreak++
      currentDate = subDays(currentDate, 7)
    }

    return weekStreak
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Flame className="h-5 w-5 text-orange-500" />
          Productivity Streaks
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Streak */}
        <div className="text-center">
          <div className="text-3xl font-bold text-orange-500 mb-1">{currentStreak}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Current Streak</div>
          <Badge variant="outline" className="mt-2">
            <Flame className="h-3 w-3 mr-1" />
            {currentStreak > 0 ? "On fire!" : "Start your streak today"}
          </Badge>
        </div>

        {/* Streak Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <Trophy className="h-5 w-5 text-yellow-500 mx-auto mb-1" />
            <div className="font-semibold">{longestStreak}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Longest Streak</div>
          </div>
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <Calendar className="h-5 w-5 text-blue-500 mx-auto mb-1" />
            <div className="font-semibold">{weekStreak}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Week Streak</div>
          </div>
        </div>

        {/* Activity Calendar */}
        <div>
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Target className="h-4 w-4" />
            Last 30 Days
          </h4>
          <div className="grid grid-cols-10 gap-1">
            {streakCalendar.map((day, index) => (
              <div
                key={index}
                className={`h-6 w-6 rounded-sm border-2 transition-all hover:scale-110 cursor-pointer ${
                  day.hasActivity
                    ? day.isToday
                      ? "bg-orange-500 border-orange-600"
                      : "bg-green-500 border-green-600"
                    : day.isToday
                      ? "bg-gray-200 border-orange-300 dark:bg-gray-700 dark:border-orange-600"
                      : "bg-gray-100 border-gray-200 dark:bg-gray-800 dark:border-gray-700"
                }`}
                title={`${format(day.date, "MMM d")}: ${day.taskCount} tasks completed`}
              />
            ))}
          </div>
          <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
            <span>{streakCalendar[0] ? format(streakCalendar[0].date, "MMM d") : ""}</span>
            <span>Today</span>
          </div>
        </div>

        {/* Motivational Message */}
        <div className="text-center p-3 bg-linear-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-lg">
          <p className="text-sm font-medium text-orange-800 dark:text-orange-200">
            {currentStreak === 0
              ? "Complete a task today to start your streak! 🚀"
              : currentStreak < 7
                ? `Great start! Keep going to reach a week streak! 💪`
                : currentStreak < 30
                  ? `Amazing! You're building a strong habit! 🔥`
                  : `Incredible! You're a productivity master! 🏆`}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
