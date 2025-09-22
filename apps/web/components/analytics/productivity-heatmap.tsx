"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface HeatmapData {
  hour: number
  completed: number
  created: number
}

interface ProductivityHeatmapProps {
  data: HeatmapData[]
  metric?: "completed" | "created"
}

export function ProductivityHeatmap({ data, metric = "completed" }: ProductivityHeatmapProps) {
  const maxValue = Math.max(...data.map((d) => d[metric]))
  const hours = [
    "12 AM",
    "1 AM",
    "2 AM",
    "3 AM",
    "4 AM",
    "5 AM",
    "6 AM",
    "7 AM",
    "8 AM",
    "9 AM",
    "10 AM",
    "11 AM",
    "12 PM",
    "1 PM",
    "2 PM",
    "3 PM",
    "4 PM",
    "5 PM",
    "6 PM",
    "7 PM",
    "8 PM",
    "9 PM",
    "10 PM",
    "11 PM",
  ]

  const getIntensity = (value: number) => {
    if (maxValue === 0) return 0
    return value / maxValue
  }

  const getColor = (intensity: number) => {
    if (intensity === 0) return "bg-gray-100 dark:bg-gray-800"
    if (intensity <= 0.25) return "bg-green-200 dark:bg-green-900"
    if (intensity <= 0.5) return "bg-green-300 dark:bg-green-800"
    if (intensity <= 0.75) return "bg-green-400 dark:bg-green-700"
    return "bg-green-500 dark:bg-green-600"
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Productivity by Time of Day</CardTitle>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {metric === "completed" ? "Tasks completed" : "Tasks created"} throughout the day
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-12 gap-1">
          {data.map((item, index) => {
            const intensity = getIntensity(item[metric])
            return (
              <TooltipProvider key={item.hour}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      className={`h-8 rounded cursor-pointer transition-all hover:scale-110 ${getColor(intensity)}`}
                      style={{ opacity: intensity === 0 ? 0.3 : 1 }}
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="font-medium">{hours[index]}</p>
                    <p className="text-sm">
                      {item[metric]} {metric === "completed" ? "completed" : "created"}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )
          })}
        </div>
        <div className="flex items-center justify-between mt-4 text-xs text-gray-500">
          <span>12 AM</span>
          <span>6 AM</span>
          <span>12 PM</span>
          <span>6 PM</span>
          <span>11 PM</span>
        </div>
        <div className="flex items-center justify-center gap-2 mt-4">
          <span className="text-xs text-gray-500">Less</span>
          <div className="flex gap-1">
            <div className="h-3 w-3 rounded bg-gray-100 dark:bg-gray-800" />
            <div className="h-3 w-3 rounded bg-green-200 dark:bg-green-900" />
            <div className="h-3 w-3 rounded bg-green-300 dark:bg-green-800" />
            <div className="h-3 w-3 rounded bg-green-400 dark:bg-green-700" />
            <div className="h-3 w-3 rounded bg-green-500 dark:bg-green-600" />
          </div>
          <span className="text-xs text-gray-500">More</span>
        </div>
      </CardContent>
    </Card>
  )
}
