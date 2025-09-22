"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Activity,
  Zap,
  Database,
  Globe,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingDown,
  Wifi,
  WifiOff,
} from "lucide-react"

interface PerformanceMetrics {
  vitals: {
    fcp: number // First Contentful Paint
    lcp: number // Largest Contentful Paint
    fid: number // First Input Delay
    cls: number // Cumulative Layout Shift
    ttfb: number // Time to First Byte
  }
  resources: {
    jsSize: number
    cssSize: number
    imageSize: number
    totalSize: number
    loadTime: number
  }
  runtime: {
    memoryUsage: number
    cpuUsage: number
    renderTime: number
    taskCount: number
    errorCount: number
  }
  network: {
    online: boolean
    effectiveType: string
    downlink: number
    rtt: number
  }
  user: {
    sessionDuration: number
    pageViews: number
    interactions: number
    bounceRate: number
  }
}

interface PerformanceIssue {
  id: string
  type: "error" | "warning" | "info"
  category: "performance" | "network" | "memory" | "rendering"
  message: string
  details: string
  timestamp: Date
  resolved: boolean
  impact: "low" | "medium" | "high"
}

interface PerformanceMonitorProps {
  metrics: PerformanceMetrics
  issues: PerformanceIssue[]
  isMonitoring: boolean
  onStartMonitoring: () => void
  onStopMonitoring: () => void
  onResolveIssue: (issueId: string) => void
  onExportReport: () => void
}

export function PerformanceMonitor({
  metrics,
  issues,
  isMonitoring,
  onStartMonitoring,
  onStopMonitoring,
  onResolveIssue,
  onExportReport,
}: PerformanceMonitorProps) {
  const [selectedTimeframe, setSelectedTimeframe] = useState<"1h" | "24h" | "7d" | "30d">("1h")
  const [autoRefresh, setAutoRefresh] = useState(true)

  // Auto refresh metrics
  useEffect(() => {
    if (!autoRefresh || !isMonitoring) return

    const interval = setInterval(() => {
      // Trigger metrics refresh
      window.dispatchEvent(new CustomEvent("refresh-metrics"))
    }, 5000)

    return () => clearInterval(interval)
  }, [autoRefresh, isMonitoring])

  const getVitalScore = (
    metric: string,
    value: number,
  ): { score: number; rating: "good" | "needs-improvement" | "poor" } => {
    switch (metric) {
      case "fcp":
        if (value <= 1800) return { score: 100, rating: "good" }
        if (value <= 3000) return { score: 75, rating: "needs-improvement" }
        return { score: 25, rating: "poor" }
      case "lcp":
        if (value <= 2500) return { score: 100, rating: "good" }
        if (value <= 4000) return { score: 75, rating: "needs-improvement" }
        return { score: 25, rating: "poor" }
      case "fid":
        if (value <= 100) return { score: 100, rating: "good" }
        if (value <= 300) return { score: 75, rating: "needs-improvement" }
        return { score: 25, rating: "poor" }
      case "cls":
        if (value <= 0.1) return { score: 100, rating: "good" }
        if (value <= 0.25) return { score: 75, rating: "needs-improvement" }
        return { score: 25, rating: "poor" }
      case "ttfb":
        if (value <= 800) return { score: 100, rating: "good" }
        if (value <= 1800) return { score: 75, rating: "needs-improvement" }
        return { score: 25, rating: "poor" }
      default:
        return { score: 0, rating: "poor" }
    }
  }

  const getRatingColor = (rating: string) => {
    switch (rating) {
      case "good":
        return "text-green-600 bg-green-100 dark:bg-green-900 dark:text-green-300"
      case "needs-improvement":
        return "text-orange-600 bg-orange-100 dark:bg-orange-900 dark:text-orange-300"
      case "poor":
        return "text-red-600 bg-red-100 dark:bg-red-900 dark:text-red-300"
      default:
        return "text-gray-600 bg-gray-100 dark:bg-gray-800 dark:text-gray-300"
    }
  }

  const getIssueIcon = (type: string) => {
    switch (type) {
      case "error":
        return <AlertTriangle className="h-4 w-4 text-red-500" />
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-orange-500" />
      case "info":
        return <CheckCircle className="h-4 w-4 text-blue-500" />
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-500" />
    }
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B"
    const k = 1024
    const sizes = ["B", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${Math.round(ms)}ms`
    return `${(ms / 1000).toFixed(1)}s`
  }

  const overallScore = Math.round(
    (getVitalScore("fcp", metrics.vitals.fcp).score +
      getVitalScore("lcp", metrics.vitals.lcp).score +
      getVitalScore("fid", metrics.vitals.fid).score +
      getVitalScore("cls", metrics.vitals.cls).score +
      getVitalScore("ttfb", metrics.vitals.ttfb).score) /
      5,
  )

  const criticalIssues = issues.filter((issue) => issue.impact === "high" && !issue.resolved)
  const warningIssues = issues.filter((issue) => issue.impact === "medium" && !issue.resolved)

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Performance Monitor
              {isMonitoring && (
                <Badge className="bg-green-100 text-green-700 animate-pulse">Live</Badge>
              )}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setAutoRefresh(!autoRefresh)}
                variant="outline"
                size="sm"
                disabled={!isMonitoring}
              >
                {autoRefresh ? "Auto" : "Manual"}
              </Button>
              <Button onClick={onExportReport} variant="outline" size="sm">
                Export
              </Button>
              <Button
                onClick={isMonitoring ? onStopMonitoring : onStartMonitoring}
                variant={isMonitoring ? "destructive" : "default"}
              >
                {isMonitoring ? "Stop" : "Start"} Monitoring
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Overall Score */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-3xl font-bold">{overallScore}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Performance Score</div>
            </div>
            <div className="text-right">
              <Badge
                className={getRatingColor(
                  overallScore >= 90 ? "good" : overallScore >= 50 ? "needs-improvement" : "poor",
                )}
              >
                {overallScore >= 90 ? "Good" : overallScore >= 50 ? "Needs Improvement" : "Poor"}
              </Badge>
            </div>
          </div>

          {/* Critical Issues Alert */}
          {criticalIssues.length > 0 && (
            <Alert className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20 mb-4">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription>
                {criticalIssues.length} critical performance issue
                {criticalIssues.length > 1 ? "s" : ""} detected. Immediate attention required.
              </AlertDescription>
            </Alert>
          )}

          {/* Network Status */}
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              {metrics.network.online ? (
                <Wifi className="h-4 w-4 text-green-500" />
              ) : (
                <WifiOff className="h-4 w-4 text-red-500" />
              )}
              <span>{metrics.network.online ? "Online" : "Offline"}</span>
            </div>
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-blue-500" />
              <span>{metrics.network.effectiveType.toUpperCase()}</span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-purple-500" />
              <span>{metrics.network.downlink} Mbps</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-500" />
              <span>{metrics.network.rtt}ms RTT</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Metrics */}
      <Tabs
        value={selectedTimeframe}
        onValueChange={(value: string) => {
          if (value === "1h" || value === "24h" || value === "7d" || value === "30d") {
            setSelectedTimeframe(value)
          }
        }}
      >
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="1h">Last Hour</TabsTrigger>
          <TabsTrigger value="24h">Last 24h</TabsTrigger>
          <TabsTrigger value="7d">Last 7 Days</TabsTrigger>
          <TabsTrigger value="30d">Last 30 Days</TabsTrigger>
        </TabsList>

        <TabsContent value={selectedTimeframe} className="space-y-4">
          {/* Core Web Vitals */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Core Web Vitals
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {Object.entries(metrics.vitals).map(([key, value]) => {
                  const { score, rating } = getVitalScore(key, value)
                  const labels: Record<string, string> = {
                    fcp: "First Contentful Paint",
                    lcp: "Largest Contentful Paint",
                    fid: "First Input Delay",
                    cls: "Cumulative Layout Shift",
                    ttfb: "Time to First Byte",
                  }

                  return (
                    <div
                      key={key}
                      className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
                    >
                      <div className="text-2xl font-bold mb-1">
                        {key === "cls" ? value.toFixed(3) : formatDuration(value)}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                        {labels[key] || key}
                      </div>
                      <Badge className={getRatingColor(rating)} variant="outline">
                        {rating.replace("-", " ")}
                      </Badge>
                      <Progress value={score} className="h-1 mt-2" />
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Resource Usage */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Resource Usage
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">JavaScript</span>
                    <span className="text-sm font-medium">
                      {formatBytes(metrics.resources.jsSize)}
                    </span>
                  </div>
                  <Progress
                    value={(metrics.resources.jsSize / metrics.resources.totalSize) * 100}
                    className="h-2"
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">CSS</span>
                    <span className="text-sm font-medium">
                      {formatBytes(metrics.resources.cssSize)}
                    </span>
                  </div>
                  <Progress
                    value={(metrics.resources.cssSize / metrics.resources.totalSize) * 100}
                    className="h-2"
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Images</span>
                    <span className="text-sm font-medium">
                      {formatBytes(metrics.resources.imageSize)}
                    </span>
                  </div>
                  <Progress
                    value={(metrics.resources.imageSize / metrics.resources.totalSize) * 100}
                    className="h-2"
                  />
                </div>

                <div className="pt-2 border-t">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Total Size</span>
                    <span className="text-sm font-bold">
                      {formatBytes(metrics.resources.totalSize)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-sm font-medium">Load Time</span>
                    <span className="text-sm font-bold">
                      {formatDuration(metrics.resources.loadTime)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Runtime Performance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="text-xl font-bold text-blue-600">
                      {formatBytes(metrics.runtime.memoryUsage)}
                    </div>
                    <div className="text-xs text-blue-800 dark:text-blue-200">Memory Usage</div>
                  </div>
                  <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div className="text-xl font-bold text-green-600">
                      {metrics.runtime.cpuUsage}%
                    </div>
                    <div className="text-xs text-green-800 dark:text-green-200">CPU Usage</div>
                  </div>
                  <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <div className="text-xl font-bold text-purple-600">
                      {formatDuration(metrics.runtime.renderTime)}
                    </div>
                    <div className="text-xs text-purple-800 dark:text-purple-200">Render Time</div>
                  </div>
                  <div className="text-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                    <div className="text-xl font-bold text-orange-600">
                      {metrics.runtime.taskCount}
                    </div>
                    <div className="text-xs text-orange-800 dark:text-orange-200">Active Tasks</div>
                  </div>
                </div>

                {metrics.runtime.errorCount > 0 && (
                  <Alert className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <AlertDescription>
                      {metrics.runtime.errorCount} runtime error
                      {metrics.runtime.errorCount > 1 ? "s" : ""} detected
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </div>

          {/* User Experience */}
          <Card>
            <CardHeader>
              <CardTitle>User Experience Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="text-xl font-bold">
                    {formatDuration(metrics.user.sessionDuration)}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Avg Session</div>
                </div>
                <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="text-xl font-bold">{metrics.user.pageViews}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Page Views</div>
                </div>
                <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="text-xl font-bold">{metrics.user.interactions}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Interactions</div>
                </div>
                <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="text-xl font-bold">{Math.round(metrics.user.bounceRate)}%</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Bounce Rate</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Issues */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Performance Issues</CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="destructive">{criticalIssues.length} Critical</Badge>
              <Badge variant="outline">{warningIssues.length} Warnings</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {issues.map((issue) => (
              <div
                key={issue.id}
                className={`p-3 rounded-lg border ${
                  issue.resolved
                    ? "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                    : issue.impact === "high"
                      ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
                      : issue.impact === "medium"
                        ? "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800"
                        : "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    {getIssueIcon(issue.type)}
                    <div>
                      <div className="font-medium text-sm">{issue.message}</div>
                      <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        {issue.details}
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-xs">
                          {issue.category}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={`text-xs ${
                            issue.impact === "high"
                              ? "text-red-600 border-red-200"
                              : issue.impact === "medium"
                                ? "text-orange-600 border-orange-200"
                                : "text-blue-600 border-blue-200"
                          }`}
                        >
                          {issue.impact} impact
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {issue.timestamp.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {issue.resolved ? (
                      <Badge className="bg-green-100 text-green-700">Resolved</Badge>
                    ) : (
                      <Button onClick={() => onResolveIssue(issue.id)} size="sm" variant="outline">
                        Resolve
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {issues.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <CheckCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No performance issues detected</p>
                <p className="text-xs text-gray-400 mt-1">Your application is running smoothly</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
