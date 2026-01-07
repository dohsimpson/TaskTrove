"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  FileText,
  Calendar,
  BarChart3,
  TrendingUp,
  Users,
  Clock,
  Target,
  Award,
  Filter,
} from "lucide-react"
import { toast } from "@/lib/toast"

interface ReportData {
  productivity: {
    tasksCompleted: number
    tasksCreated: number
    completionRate: number
    averageCompletionTime: number
    productivityTrend: Array<{ date: string; value: number }>
  }
  projects: {
    total: number
    active: number
    completed: number
    overdue: number
    projectPerformance: Array<{
      name: string
      completion: number
      tasksCount: number
      daysActive: number
    }>
  }
  team: {
    members: number
    activeMembers: number
    topPerformers: Array<{
      name: string
      tasksCompleted: number
      productivity: number
    }>
    collaboration: {
      commentsCount: number
      sharesCount: number
      mentionsCount: number
    }
  }
  timeTracking: {
    totalHours: number
    averageSessionLength: number
    mostProductiveHours: Array<{ hour: number; productivity: number }>
    timeByProject: Array<{ project: string; hours: number }>
  }
}

interface ReportConfig {
  type: "productivity" | "projects" | "team" | "time" | "comprehensive"
  format: "pdf" | "excel" | "csv" | "html"
  dateRange: {
    start: Date
    end: Date
    preset: "week" | "month" | "quarter" | "year" | "custom"
  }
  sections: {
    summary: boolean
    charts: boolean
    tables: boolean
    insights: boolean
    recommendations: boolean
  }
  filters: {
    projects: string[]
    users: string[]
    priorities: string[]
    labels: string[]
  }
  scheduling: {
    enabled: boolean
    frequency: "daily" | "weekly" | "monthly"
    recipients: string[]
    time: string
  }
}

interface AdvancedReportsProps {
  reportData: ReportData
  availableProjects: Array<{ id: string; name: string }>
  availableUsers: Array<{ id: string; name: string }>
  availableLabels: Array<{ id: string; name: string }>
  onGenerateReport: (config: ReportConfig) => Promise<void>
  onScheduleReport: (config: ReportConfig) => Promise<void>
  onExportData: (format: string, data: Record<string, unknown>) => Promise<void>
  isGenerating: boolean
  generationProgress: number
}

export function AdvancedReports({
  reportData,
  availableProjects,
  availableUsers,
  onGenerateReport,
  onScheduleReport,
  isGenerating,
  generationProgress,
}: AdvancedReportsProps) {
  const [reportConfig, setReportConfig] = useState<ReportConfig>({
    type: "comprehensive",
    format: "pdf",
    dateRange: {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      end: new Date(),
      preset: "month",
    },
    sections: {
      summary: true,
      charts: true,
      tables: true,
      insights: true,
      recommendations: true,
    },
    filters: {
      projects: [],
      users: [],
      priorities: [],
      labels: [],
    },
    scheduling: {
      enabled: false,
      frequency: "weekly",
      recipients: [],
      time: "09:00",
    },
  })

  const [showFilters, setShowFilters] = useState(false)
  const [showScheduling, setShowScheduling] = useState(false)
  const [newRecipient, setNewRecipient] = useState("")

  const handleDatePresetChange = (preset: string) => {
    const now = new Date()
    let start = new Date()

    switch (preset) {
      case "week":
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case "month":
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      case "quarter":
        start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
        break
      case "year":
        start = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
        break
    }

    setReportConfig({
      ...reportConfig,
      dateRange: {
        ...reportConfig.dateRange,
        preset:
          preset === "week" ||
          preset === "month" ||
          preset === "quarter" ||
          preset === "year" ||
          preset === "custom"
            ? preset
            : "custom",
        start,
        end: now,
      },
    })
  }

  const handleGenerateReport = async () => {
    try {
      await onGenerateReport(reportConfig)
      toast.success("Your report has been generated successfully.")
    } catch {
      toast.error("Unable to generate report. Please try again.")
    }
  }

  const handleScheduleReport = async () => {
    try {
      await onScheduleReport(reportConfig)
      toast.success(
        `Report will be sent ${reportConfig.scheduling.frequency} to ${reportConfig.scheduling.recipients.length} recipients.`,
      )
    } catch {
      toast.error("Unable to schedule report. Please try again.")
    }
  }

  const addRecipient = () => {
    if (newRecipient && !reportConfig.scheduling.recipients.includes(newRecipient)) {
      setReportConfig({
        ...reportConfig,
        scheduling: {
          ...reportConfig.scheduling,
          recipients: [...reportConfig.scheduling.recipients, newRecipient],
        },
      })
      setNewRecipient("")
    }
  }

  const removeRecipient = (email: string) => {
    setReportConfig({
      ...reportConfig,
      scheduling: {
        ...reportConfig.scheduling,
        recipients: reportConfig.scheduling.recipients.filter((r) => r !== email),
      },
    })
  }

  const getFormatIcon = (format: string) => {
    switch (format) {
      case "pdf":
        return <FileText className="h-4 w-4" />
      case "excel":
        return <BarChart3 className="h-4 w-4" />
      case "csv":
        return <FileText className="h-4 w-4" />
      default:
        return <FileText className="h-4 w-4" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Report Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Advanced Reports
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Report Type & Format */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Report Type</label>
              <Select
                value={reportConfig.type}
                onValueChange={(
                  value: "productivity" | "projects" | "team" | "time" | "comprehensive",
                ) => setReportConfig({ ...reportConfig, type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="comprehensive">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" />
                      Comprehensive Report
                    </div>
                  </SelectItem>
                  <SelectItem value="productivity">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Productivity Analysis
                    </div>
                  </SelectItem>
                  <SelectItem value="projects">
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4" />
                      Project Performance
                    </div>
                  </SelectItem>
                  <SelectItem value="team">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Team Analytics
                    </div>
                  </SelectItem>
                  <SelectItem value="time">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Time Tracking
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Export Format</label>
              <Select
                value={reportConfig.format}
                onValueChange={(value: "pdf" | "excel" | "csv" | "html") =>
                  setReportConfig({ ...reportConfig, format: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">PDF - Professional Report</SelectItem>
                  <SelectItem value="excel">Excel - Data Analysis</SelectItem>
                  <SelectItem value="csv">CSV - Raw Data</SelectItem>
                  <SelectItem value="html">HTML - Web View</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Date Range */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Date Range</label>
            <div className="flex gap-2">
              {["week", "month", "quarter", "year", "custom"].map((preset) => (
                <Button
                  key={preset}
                  variant={reportConfig.dateRange.preset === preset ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleDatePresetChange(preset)}
                >
                  {preset.charAt(0).toUpperCase() + preset.slice(1)}
                </Button>
              ))}
            </div>
            {reportConfig.dateRange.preset === "custom" && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-600 dark:text-gray-400">Start Date</label>
                  <input
                    type="date"
                    value={reportConfig.dateRange.start.toISOString().split("T")[0]}
                    onChange={(e) =>
                      setReportConfig({
                        ...reportConfig,
                        dateRange: { ...reportConfig.dateRange, start: new Date(e.target.value) },
                      })
                    }
                    className="w-full mt-1 p-2 border border-gray-200 dark:border-gray-700 rounded-md bg-background"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-600 dark:text-gray-400">End Date</label>
                  <input
                    type="date"
                    value={reportConfig.dateRange.end.toISOString().split("T")[0]}
                    onChange={(e) =>
                      setReportConfig({
                        ...reportConfig,
                        dateRange: { ...reportConfig.dateRange, end: new Date(e.target.value) },
                      })
                    }
                    className="w-full mt-1 p-2 border border-gray-200 dark:border-gray-700 rounded-md bg-background"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Report Sections */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Include Sections</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {Object.entries(reportConfig.sections).map(([section, enabled]) => (
                <div key={section} className="flex items-center space-x-2">
                  <Checkbox
                    id={section}
                    checked={enabled}
                    onCheckedChange={(checked) =>
                      setReportConfig({
                        ...reportConfig,
                        sections: { ...reportConfig.sections, [section]: !!checked },
                      })
                    }
                  />
                  <label htmlFor={section} className="text-sm capitalize">
                    {section}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Filters Toggle */}
          <div className="flex items-center gap-2">
            <Button onClick={() => setShowFilters(!showFilters)} variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              {showFilters ? "Hide" : "Show"} Filters
            </Button>
            <Button onClick={() => setShowScheduling(!showScheduling)} variant="outline" size="sm">
              <Calendar className="h-4 w-4 mr-2" />
              {showScheduling ? "Hide" : "Show"} Scheduling
            </Button>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-4">
              <h4 className="text-sm font-medium">Report Filters</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium">Projects</label>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {availableProjects.map((project) => (
                      <div key={project.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`project-${project.id}`}
                          checked={reportConfig.filters.projects.includes(project.id)}
                          onCheckedChange={(checked) => {
                            const projects = checked
                              ? [...reportConfig.filters.projects, project.id]
                              : reportConfig.filters.projects.filter((p) => p !== project.id)
                            setReportConfig({
                              ...reportConfig,
                              filters: { ...reportConfig.filters, projects },
                            })
                          }}
                        />
                        <label htmlFor={`project-${project.id}`} className="text-xs">
                          {project.name}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium">Team Members</label>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {availableUsers.map((user) => (
                      <div key={user.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`user-${user.id}`}
                          checked={reportConfig.filters.users.includes(user.id)}
                          onCheckedChange={(checked) => {
                            const users = checked
                              ? [...reportConfig.filters.users, user.id]
                              : reportConfig.filters.users.filter((u) => u !== user.id)
                            setReportConfig({
                              ...reportConfig,
                              filters: { ...reportConfig.filters, users },
                            })
                          }}
                        />
                        <label htmlFor={`user-${user.id}`} className="text-xs">
                          {user.name}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Scheduling Panel */}
          {showScheduling && (
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Automated Reporting</h4>
                <Button
                  variant={reportConfig.scheduling.enabled ? "default" : "outline"}
                  size="sm"
                  onClick={() =>
                    setReportConfig({
                      ...reportConfig,
                      scheduling: {
                        ...reportConfig.scheduling,
                        enabled: !reportConfig.scheduling.enabled,
                      },
                    })
                  }
                >
                  {reportConfig.scheduling.enabled ? "Enabled" : "Disabled"}
                </Button>
              </div>

              {reportConfig.scheduling.enabled && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium">Frequency</label>
                      <Select
                        value={reportConfig.scheduling.frequency}
                        onValueChange={(value: "daily" | "weekly" | "monthly") =>
                          setReportConfig({
                            ...reportConfig,
                            scheduling: { ...reportConfig.scheduling, frequency: value },
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs font-medium">Time</label>
                      <input
                        type="time"
                        value={reportConfig.scheduling.time}
                        onChange={(e) =>
                          setReportConfig({
                            ...reportConfig,
                            scheduling: { ...reportConfig.scheduling, time: e.target.value },
                          })
                        }
                        className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-md bg-background"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-medium">Recipients</label>
                    <div className="flex gap-2">
                      <input
                        type="email"
                        value={newRecipient}
                        onChange={(e) => setNewRecipient(e.target.value)}
                        placeholder="email@example.com"
                        className="flex-1 p-2 border border-gray-200 dark:border-gray-700 rounded-md bg-background"
                      />
                      <Button onClick={addRecipient} size="sm">
                        Add
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {reportConfig.scheduling.recipients.map((email) => (
                        <Badge
                          key={email}
                          variant="secondary"
                          className="cursor-pointer"
                          onClick={() => removeRecipient(email)}
                        >
                          {email} ×
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Generation Progress */}
          {isGenerating && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Generating report...</span>
                <span>{Math.round(generationProgress)}%</span>
              </div>
              <Progress value={generationProgress} className="h-2" />
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button onClick={handleGenerateReport} disabled={isGenerating} className="flex-1">
              {getFormatIcon(reportConfig.format)}
              <span className="ml-2">Generate Report</span>
            </Button>
            {reportConfig.scheduling.enabled && (
              <Button onClick={handleScheduleReport} variant="outline">
                <Calendar className="h-4 w-4 mr-2" />
                Schedule
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Report Preview */}
      <Tabs defaultValue="summary" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="productivity">Productivity</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Executive Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {reportData.productivity.tasksCompleted}
                  </div>
                  <div className="text-sm text-blue-800 dark:text-blue-200">Tasks Completed</div>
                </div>
                <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {Math.round(reportData.productivity.completionRate)}%
                  </div>
                  <div className="text-sm text-green-800 dark:text-green-200">Completion Rate</div>
                </div>
                <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {reportData.projects.active}
                  </div>
                  <div className="text-sm text-purple-800 dark:text-purple-200">
                    Active Projects
                  </div>
                </div>
                <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">
                    {reportData.team.activeMembers}
                  </div>
                  <div className="text-sm text-orange-800 dark:text-orange-200">Team Members</div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-medium">Key Insights</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <TrendingUp className="h-4 w-4 text-green-500" />
                    <span>Productivity increased by 15% compared to last period</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Award className="h-4 w-4 text-purple-500" />
                    <span>
                      Top performer: {reportData.team.topPerformers[0]?.name} with{" "}
                      {reportData.team.topPerformers[0]?.tasksCompleted} tasks
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-blue-500" />
                    <span>
                      Average task completion time:{" "}
                      {Math.round(reportData.productivity.averageCompletionTime)} hours
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="productivity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Productivity Analysis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="text-xl font-bold">{reportData.productivity.tasksCreated}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Tasks Created</div>
                </div>
                <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="text-xl font-bold">{reportData.productivity.tasksCompleted}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Tasks Completed</div>
                </div>
                <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="text-xl font-bold">
                    {Math.round(reportData.productivity.completionRate)}%
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Completion Rate</div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-medium">Productivity Trend</h4>
                <div className="h-32 bg-gray-50 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                  <span className="text-sm text-gray-500">
                    Productivity chart would be rendered here
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="projects" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Project Performance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-4 gap-4">
                <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="text-xl font-bold">{reportData.projects.total}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Total Projects</div>
                </div>
                <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="text-xl font-bold">{reportData.projects.active}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Active</div>
                </div>
                <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="text-xl font-bold">{reportData.projects.completed}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Completed</div>
                </div>
                <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="text-xl font-bold">{reportData.projects.overdue}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Overdue</div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-medium">Top Performing Projects</h4>
                <div className="space-y-2">
                  {reportData.projects.projectPerformance.slice(0, 5).map((project, index) => (
                    <div
                      key={project.name}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-sm font-medium text-gray-500">#{index + 1}</div>
                        <div>
                          <div className="font-medium text-sm">{project.name}</div>
                          <div className="text-xs text-gray-600 dark:text-gray-400">
                            {project.tasksCount} tasks • {project.daysActive} days active
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-sm">{project.completion}%</div>
                        <Progress value={project.completion} className="h-1 w-16" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Team Analytics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="text-xl font-bold">{reportData.team.members}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Team Members</div>
                </div>
                <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="text-xl font-bold">{reportData.team.activeMembers}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Active Members</div>
                </div>
                <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="text-xl font-bold">
                    {reportData.team.collaboration.commentsCount}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Comments</div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-medium">Top Performers</h4>
                <div className="space-y-2">
                  {reportData.team.topPerformers.map((performer, index) => (
                    <div
                      key={performer.name}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-sm font-medium text-gray-500">#{index + 1}</div>
                        <div>
                          <div className="font-medium text-sm">{performer.name}</div>
                          <div className="text-xs text-gray-600 dark:text-gray-400">
                            {performer.tasksCompleted} tasks completed
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-sm">{performer.productivity}%</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">Productivity</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
