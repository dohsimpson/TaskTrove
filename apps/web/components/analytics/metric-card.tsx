"use client"

import type React from "react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"

interface MetricCardProps {
  title: string
  value: string | number
  subtitle?: string
  trend?: "up" | "down" | "neutral"
  trendValue?: string
  icon?: React.ReactNode
  color?: "default" | "success" | "warning" | "danger"
  loading?: boolean
}

export function MetricCard({
  title,
  value,
  subtitle,
  trend,
  trendValue,
  icon,
  color = "default",
  loading = false,
}: MetricCardProps) {
  const colorClasses = {
    default: "border-gray-200 dark:border-gray-700",
    success: "border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20",
    warning: "border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/20",
    danger: "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20",
  }

  const getTrendIcon = () => {
    switch (trend) {
      case "up":
        return <TrendingUp className="h-4 w-4 text-green-500" />
      case "down":
        return <TrendingDown className="h-4 w-4 text-red-500" />
      case "neutral":
        return <Minus className="h-4 w-4 text-gray-500" />
      default:
        return null
    }
  }

  const getTrendColor = () => {
    switch (trend) {
      case "up":
        return "text-green-600 bg-green-100 dark:bg-green-900 dark:text-green-300"
      case "down":
        return "text-red-600 bg-red-100 dark:bg-red-900 dark:text-red-300"
      case "neutral":
        return "text-gray-600 bg-gray-100 dark:bg-gray-800 dark:text-gray-300"
      default:
        return ""
    }
  }

  if (loading) {
    return (
      <Card className={colorClasses[color]}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            {icon && <div className="h-5 w-5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />}
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2" />
          <div className="h-3 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={colorClasses[color]}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
            {title}
          </CardTitle>
          {icon && <div className="text-gray-400">{icon}</div>}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline justify-between">
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</div>
          {trend && trendValue && (
            <Badge variant="outline" className={getTrendColor()}>
              {getTrendIcon()}
              <span className="ml-1">{trendValue}</span>
            </Badge>
          )}
        </div>
        {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>}
      </CardContent>
    </Card>
  )
}
