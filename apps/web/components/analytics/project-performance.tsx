"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Clock, Target, TrendingUp, Folder } from "lucide-react"

interface ProjectAnalytics {
  projectId: string
  projectName: string
  tasksCompleted: number
  tasksTotal: number
  completionRate: number
  averageTimeSpent: number
  color: string
}

interface ProjectPerformanceProps {
  projects: ProjectAnalytics[]
  loading?: boolean
}

export function ProjectPerformance({ projects, loading = false }: ProjectPerformanceProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Project Performance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                <div className="h-4 w-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              </div>
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            </div>
          ))}
        </CardContent>
      </Card>
    )
  }

  const sortedProjects = [...projects].sort((a, b) => b.completionRate - a.completionRate)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          Project Performance
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {sortedProjects.map((project) => (
          <div key={project.projectId} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Folder className="h-3 w-3" style={{ color: project.color }} />
                <span className="font-medium text-sm">{project.projectName}</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {project.tasksCompleted}/{project.tasksTotal}
                </Badge>
                <span className="text-sm font-medium">{Math.round(project.completionRate)}%</span>
              </div>
            </div>
            <Progress value={project.completionRate} className="h-2" />
            <div className="flex items-center justify-between text-xs text-gray-500">
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>Avg: {Math.round(project.averageTimeSpent)}min</span>
              </div>
              <div className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                <span>
                  {project.completionRate >= 80
                    ? "Excellent"
                    : project.completionRate >= 60
                      ? "Good"
                      : project.completionRate >= 40
                        ? "Fair"
                        : "Needs Attention"}
                </span>
              </div>
            </div>
          </div>
        ))}
        {projects.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No project data available</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
