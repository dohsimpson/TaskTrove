"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useAtomValue } from "jotai"
import { Search, Loader2 } from "lucide-react"
import { AdvancedSearch } from "@/components/search/advanced-search"
import { taskAtoms } from "@tasktrove/atoms/core/tasks"
import { projectAtoms } from "@tasktrove/atoms/core/projects"
import { labelAtoms } from "@tasktrove/atoms/core/labels"
import { Task, Project, Label, LabelId } from "@/lib/types"

interface SearchFilter {
  type: "text" | "priority" | "project" | "label" | "assignee" | "date" | "status" | "has"
  field: string
  operator: "equals" | "contains" | "before" | "after" | "between" | "not"
  value: string | number | Date | boolean | null
  label: string
}

interface SearchPageProps {
  onTaskClick: (task: Task) => void
}

export function SearchPage({ onTaskClick }: SearchPageProps) {
  // Use atoms instead of custom hooks
  const tasks = useAtomValue(taskAtoms.tasks)
  const projects = useAtomValue(projectAtoms.projects)
  const labels = useAtomValue(labelAtoms.labels)
  const [searchResults, setSearchResults] = useState<Task[]>([])
  const [hasSearched, setHasSearched] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [currentQuery, setCurrentQuery] = useState("")
  const [currentFilters, setCurrentFilters] = useState<SearchFilter[]>([])
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Perform the actual search
  const performSearch = useCallback(
    (query: string, filters: SearchFilter[]) => {
      setIsSearching(true)

      // Simulate brief loading for better UX
      setTimeout(() => {
        const allTasks = tasks
        let filteredTasks = allTasks

        // Apply text search
        if (query.trim()) {
          const searchLower = query.toLowerCase()
          filteredTasks = filteredTasks.filter(
            (task: Task) =>
              task.title.toLowerCase().includes(searchLower) ||
              task.description?.toLowerCase().includes(searchLower) ||
              task.labels.some((label: string) => label.toLowerCase().includes(searchLower)),
          )
        }

        // Apply filters
        filters.forEach((filter) => {
          switch (filter.type) {
            case "priority":
              if (filter.operator === "equals") {
                filteredTasks = filteredTasks.filter((task: Task) => task.priority === filter.value)
              }
              break
            case "project":
              if (filter.operator === "equals") {
                filteredTasks = filteredTasks.filter(
                  (task: Task) => task.projectId === filter.value,
                )
              }
              break
            case "label":
              if (filter.operator === "equals" || filter.operator === "contains") {
                const labelName = String(filter.value)
                filteredTasks = filteredTasks.filter((task: Task) =>
                  task.labels.some((labelId: LabelId) => {
                    const label = labels.find((l: Label) => l.id === labelId)
                    return label?.name === labelName
                  }),
                )
              }
              break
            case "status":
              if (filter.operator === "equals") {
                filteredTasks = filteredTasks.filter(
                  (task: Task) => task.completed === filter.value,
                )
              }
              break
            case "date":
              // Add date filtering logic here if needed
              break
            case "text":
            case "assignee":
            case "has":
              // These types would need additional implementation
              break
          }
        })

        setSearchResults(filteredTasks)
        setHasSearched(true)
        setIsSearching(false)
      }, 150) // Brief loading indicator
    },
    [tasks, labels],
  )

  // Live search with debounce
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    // Only search if there's a query or filters
    if (currentQuery.trim() || currentFilters.length > 0) {
      searchTimeoutRef.current = setTimeout(() => {
        performSearch(currentQuery, currentFilters)
      }, 300) // 300ms debounce
    } else {
      // Clear results if no query
      setSearchResults([])
      setHasSearched(false)
      setIsSearching(false)
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [currentQuery, currentFilters, performSearch])

  // Handle search from AdvancedSearch component
  const handleSearch = (query: string, filters: SearchFilter[]) => {
    setCurrentQuery(query)
    setCurrentFilters(filters)
  }

  // Handle result click
  const handleResultClick = (task: Task) => {
    onTaskClick(task)
  }

  return (
    <div className="p-6 space-y-6">
      <AdvancedSearch
        onSearch={handleSearch}
        projects={projects}
        labels={labels}
        assignees={[]} // Team functionality not yet migrated to atoms
        // Controlled props for live search
        controlledQuery={currentQuery}
        onQueryChange={setCurrentQuery}
        controlledFilters={currentFilters}
        onFiltersChange={setCurrentFilters}
      />

      {/* Search Status */}
      {isSearching && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Searching...
        </div>
      )}

      {/* Search Results */}
      {hasSearched && !isSearching && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Search Results</h2>
            <span className="text-sm text-muted-foreground">
              {searchResults.length} task{searchResults.length !== 1 ? "s" : ""} found
            </span>
          </div>

          {searchResults.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No tasks found matching your search criteria.</p>
              <p className="text-sm mt-2">Try adjusting your search terms or filters.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {searchResults.map((task) => (
                <div
                  key={task.id}
                  className="p-4 bg-card rounded-lg border border-border hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => handleResultClick(task)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-foreground">{task.title}</h3>
                      {task.description && (
                        <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                        {/* Project */}
                        {task.projectId && (
                          <span className="bg-muted px-2 py-1 rounded">
                            {projects.find((p: Project) => p.id === task.projectId)?.name ||
                              "Unknown Project"}
                          </span>
                        )}
                        {/* Labels */}
                        {task.labels.map((label: string) => (
                          <span
                            key={label}
                            className="bg-primary/20 text-primary px-2 py-1 rounded"
                          >
                            #{label}
                          </span>
                        ))}
                        {/* Priority */}
                        {task.priority < 4 && (
                          <span
                            className={`px-2 py-1 rounded ${
                              task.priority === 1
                                ? "bg-destructive/20 text-destructive"
                                : task.priority === 2
                                  ? "bg-orange-500/20 text-orange-600"
                                  : "bg-primary/20 text-primary"
                            }`}
                          >
                            Priority {task.priority}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-sm text-gray-500">
                      {task.completed ? "✓ Complete" : "Active"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
