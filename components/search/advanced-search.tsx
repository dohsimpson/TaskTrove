"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import {
  Search,
  Filter,
  X,
  CalendarIcon,
  Flag,
  Tag,
  User,
  CheckSquare,
  Paperclip,
  FolderOpen,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface SearchFilter {
  type: "text" | "priority" | "project" | "label" | "assignee" | "date" | "status" | "has"
  field: string
  operator: "equals" | "contains" | "before" | "after" | "between" | "not"
  value: string | number | Date | boolean | null
  label: string
}

interface AdvancedSearchProps {
  onSearch: (query: string, filters: SearchFilter[]) => void
  projects: Array<{ id: string; name: string; color: string }>
  labels: Array<{ name: string; color: string }>
  assignees: Array<{ id: string; name: string; avatar?: string }>
  // Optional controlled props for live search
  controlledQuery?: string
  onQueryChange?: (query: string) => void
  controlledFilters?: SearchFilter[]
  onFiltersChange?: (filters: SearchFilter[]) => void
}

export function AdvancedSearch({
  onSearch,
  projects,
  labels,
  assignees,
  controlledQuery,
  onQueryChange,
  controlledFilters,
  onFiltersChange,
}: AdvancedSearchProps) {
  const [internalQuery, setInternalQuery] = useState("")
  const [internalFilters, setInternalFilters] = useState<SearchFilter[]>([])
  const [showAdvanced, setShowAdvanced] = useState(false)

  // Use controlled props if provided, otherwise use internal state
  const query = controlledQuery !== undefined ? controlledQuery : internalQuery
  const filters = controlledFilters !== undefined ? controlledFilters : internalFilters

  const setQuery = (newQuery: string) => {
    if (onQueryChange) {
      onQueryChange(newQuery)
    } else {
      setInternalQuery(newQuery)
    }
  }

  const setFilters = (newFilters: SearchFilter[]) => {
    if (onFiltersChange) {
      onFiltersChange(newFilters)
    } else {
      setInternalFilters(newFilters)
    }
  }

  const addFilter = (filter: SearchFilter) => {
    setFilters([...filters, filter])
  }

  const removeFilter = (index: number) => {
    setFilters(filters.filter((_, i) => i !== index))
  }

  const handleSearch = () => {
    if (query.trim() || filters.length > 0) {
      onSearch(query, filters)
    }
  }

  const clearAll = () => {
    setQuery("")
    setFilters([])
    onSearch("", [])
  }

  const getFilterIcon = (type: string) => {
    switch (type) {
      case "priority":
        return <Flag className="h-3 w-3" />
      case "project":
        return <div className="h-3 w-3 rounded-full bg-gray-400" />
      case "label":
        return <Tag className="h-3 w-3" />
      case "assignee":
        return <User className="h-3 w-3" />
      case "date":
        return <CalendarIcon className="h-3 w-3" />
      case "status":
        return <CheckSquare className="h-3 w-3" />
      case "has":
        return <Paperclip className="h-3 w-3" />
      default:
        return <Filter className="h-3 w-3" />
    }
  }

  return (
    <div className="space-y-4">
      {/* Main Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search tasks..."
          className="pl-10 pr-20"
          onKeyDown={(e) => e.key === "Enter" && controlledQuery === undefined && handleSearch()}
        />
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={cn("h-7", showAdvanced && "bg-blue-100 text-blue-700")}
          >
            <Filter className="h-3 w-3" />
          </Button>
          {/* Hide search button in live search mode (when controlled props are provided) */}
          {controlledQuery === undefined && (
            <Button onClick={handleSearch} size="sm" className="h-7">
              Search
            </Button>
          )}
        </div>
      </div>

      {/* Active Filters */}
      {filters.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {filters.map((filter, index) => (
            <Badge key={index} variant="secondary" className="flex items-center gap-1">
              {getFilterIcon(filter.type)}
              {filter.label}
              <Button
                variant="ghost"
                size="icon"
                className="h-3 w-3 p-0 hover:bg-transparent"
                onClick={() => removeFilter(index)}
              >
                <X className="h-2 w-2" />
              </Button>
            </Badge>
          ))}
          <Button variant="ghost" size="sm" onClick={clearAll} className="h-6 text-xs">
            Clear all
          </Button>
        </div>
      )}

      {/* Advanced Search Panel */}
      {showAdvanced && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Advanced Search</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Quick Filters */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  addFilter({
                    type: "priority",
                    field: "priority",
                    operator: "equals",
                    value: 1,
                    label: "Priority 1",
                  })
                }
              >
                <Flag className="h-3 w-3 mr-1 text-red-500" />
                Priority 1
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  addFilter({
                    type: "date",
                    field: "dueDate",
                    operator: "equals",
                    value: new Date(),
                    label: "Due today",
                  })
                }
              >
                <CalendarIcon className="h-3 w-3 mr-1" />
                Due today
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  addFilter({
                    type: "status",
                    field: "completed",
                    operator: "equals",
                    value: false,
                    label: "Not completed",
                  })
                }
              >
                <CheckSquare className="h-3 w-3 mr-1" />
                Active
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  addFilter({
                    type: "has",
                    field: "attachments",
                    operator: "not",
                    value: null,
                    label: "Has attachments",
                  })
                }
              >
                <Paperclip className="h-3 w-3 mr-1" />
                Has files
              </Button>
            </div>

            <Separator />

            {/* Custom Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Project Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Project</label>
                <Select
                  onValueChange={(value) => {
                    const project = projects.find((p) => p.id === value)
                    if (project) {
                      addFilter({
                        type: "project",
                        field: "projectId",
                        operator: "equals",
                        value: project.id,
                        label: `Project: ${project.name}`,
                      })
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        <div className="flex items-center gap-2">
                          <FolderOpen className="h-3 w-3" style={{ color: project.color }} />
                          {project.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Label Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Label</label>
                <Select
                  onValueChange={(value) => {
                    const label = labels.find((l) => l.name === value)
                    if (label) {
                      addFilter({
                        type: "label",
                        field: "labels",
                        operator: "contains",
                        value: label.name,
                        label: `Label: #${label.name}`,
                      })
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select label" />
                  </SelectTrigger>
                  <SelectContent>
                    {labels.map((label) => (
                      <SelectItem key={label.name} value={label.name}>
                        <div className="flex items-center gap-2">
                          <Tag className="h-3 w-3" style={{ color: label.color }} />
                          {label.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Assignee Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Assignee</label>
                <Select
                  onValueChange={(value) => {
                    const assignee = assignees.find((a) => a.id === value)
                    if (assignee) {
                      addFilter({
                        type: "assignee",
                        field: "assigneeId",
                        operator: "equals",
                        value: assignee.id,
                        label: `Assigned to: ${assignee.name}`,
                      })
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select assignee" />
                  </SelectTrigger>
                  <SelectContent>
                    {assignees.map((assignee) => (
                      <SelectItem key={assignee.id} value={assignee.id}>
                        <div className="flex items-center gap-2">
                          <User className="h-3 w-3" />
                          {assignee.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
