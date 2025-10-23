"use client"

import type React from "react"

import { useState } from "react"
import { useAtomValue, useSetAtom } from "jotai"
import { DEFAULT_TASK_PRIORITY } from "@tasktrove/constants"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { CalendarIcon, Flag, Tag, X, Plus, Folder } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { log } from "@/lib/utils/logger"
import { taskAtoms } from "@tasktrove/atoms/core/tasks"
import { projectAtoms } from "@tasktrove/atoms/core/projects"
import { labelAtoms } from "@tasktrove/atoms/core/labels"
import { toast } from "sonner"
import type { Task, CreateTaskRequest, Project } from "@/lib/types"
import { INBOX_PROJECT_ID, createGroupId, createProjectId, isValidPriority } from "@/lib/types"

interface TaskFormProps {
  task?: Partial<Task>
  onSuccess?: () => void
  onCancel: () => void
}

export function TaskForm({ task, onSuccess, onCancel }: TaskFormProps) {
  // Atom hooks
  const projects = useAtomValue(projectAtoms.projects)
  const labels = useAtomValue(labelAtoms.labels)
  const addTask = useSetAtom(taskAtoms.actions.addTask)
  const updateTask = useSetAtom(taskAtoms.actions.updateTask)
  // Find which section contains this task (if any)
  const taskSectionId = task?.id
    ? projects
        .find((p) => p.id === task.projectId)
        ?.sections.find((s) => task.id && s.items.includes(task.id))?.id
    : undefined

  const [formData, setFormData] = useState<CreateTaskRequest>({
    title: task?.title || "",
    description: task?.description || "",
    priority: task?.priority || DEFAULT_TASK_PRIORITY,
    dueDate: task?.dueDate,
    projectId: task?.projectId || projects[0]?.id || INBOX_PROJECT_ID,
    sectionId: taskSectionId || createGroupId("00000000-0000-4000-8000-000000000000"),
    labels: task?.labels || [],
    recurring: task?.recurring,
    ...(task?.recurringMode &&
      task.recurringMode !== "dueDate" && { recurringMode: task.recurringMode }),
  })

  const [newLabel, setNewLabel] = useState("")
  const [showCalendar, setShowCalendar] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Validation
  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.title.trim()) {
      newErrors.title = "Task title is required"
    }

    if (!formData.projectId) {
      newErrors.projectId = "Please select a project"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (validateForm()) {
      try {
        if (task?.id) {
          // Update existing task
          await updateTask({ updateRequest: { id: task.id, ...formData } })
          toast.success("Task updated successfully")
        } else {
          // Create new task
          await addTask(formData)
          toast.success("Task created successfully")
        }
        onSuccess?.()
      } catch (error) {
        toast.error(task?.id ? "Failed to update task" : "Failed to create task")
        log.error(
          {
            module: "tasks",
            taskId: task?.id,
            error: error instanceof Error ? error.message : String(error),
          },
          "Task form submission error",
        )
      }
    }
  }

  const addLabel = () => {
    const trimmedLabel = newLabel.trim()
    if (trimmedLabel && formData.labels) {
      // Find existing label by name
      const existingLabel = labels.find((l) => l.name.toLowerCase() === trimmedLabel.toLowerCase())
      if (existingLabel && !formData.labels.includes(existingLabel.id)) {
        setFormData((prev) => ({
          ...prev,
          labels: [...(prev.labels || []), existingLabel.id],
        }))
        setNewLabel("")
      }
    }
  }

  const removeLabel = (labelToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      labels: (prev.labels || []).filter((label) => label !== labelToRemove),
    }))
  }

  const getPriorityColor = (priority: number) => {
    switch (priority) {
      case 1:
        return "text-red-500"
      case 2:
        return "text-orange-500"
      case 3:
        return "text-blue-500"
      default:
        return "text-gray-400"
    }
  }

  const getPriorityLabel = (priority: number) => {
    switch (priority) {
      case 1:
        return "Urgent"
      case 2:
        return "High"
      case 3:
        return "Medium"
      default:
        return "Low"
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="title">Task Title *</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
          placeholder="What needs to be done?"
          className={cn(errors.title && "border-red-500")}
          autoFocus
        />
        {errors.title && <p className="text-sm text-red-600">{errors.title}</p>}
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
          placeholder="Add more details..."
          rows={3}
        />
      </div>

      {/* Project and Priority */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Project *</Label>
          <Select
            value={formData.projectId}
            onValueChange={(value) =>
              setFormData((prev) => ({ ...prev, projectId: createProjectId(value) }))
            }
          >
            <SelectTrigger className={cn(errors.projectId && "border-red-500")}>
              <SelectValue placeholder="Select project" />
            </SelectTrigger>
            <SelectContent>
              {projects.map((project: Project) => (
                <SelectItem key={project.id} value={project.id}>
                  <div className="flex items-center gap-2">
                    <Folder className="h-3 w-3" style={{ color: project.color }} />
                    {project.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.projectId && <p className="text-sm text-red-600">{errors.projectId}</p>}
        </div>

        <div className="space-y-2">
          <Label>Priority</Label>
          <Select
            value={formData.priority?.toString()}
            onValueChange={(value) => {
              const priorityNum = Number.parseInt(value, 10)
              if (isValidPriority(priorityNum)) {
                setFormData((prev) => ({ ...prev, priority: priorityNum }))
              }
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {([1, 2, 3, 4] as const).map((priority) => (
                <SelectItem key={priority} value={priority.toString()}>
                  <div className="flex items-center gap-2">
                    <Flag className={cn("h-4 w-4", getPriorityColor(priority))} />
                    {getPriorityLabel(priority)}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Due Date */}
      <div className="space-y-2">
        <Label>Due Date</Label>
        <Popover open={showCalendar} onOpenChange={setShowCalendar}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !formData.dueDate && "text-muted-foreground",
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {formData.dueDate ? format(formData.dueDate, "PPP") : "Pick a date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={formData.dueDate}
              onSelect={(date) => {
                setFormData((prev) => ({ ...prev, dueDate: date }))
                setShowCalendar(false)
              }}
              initialFocus
            />
          </PopoverContent>
        </Popover>
        {formData.dueDate && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setFormData((prev) => ({ ...prev, dueDate: undefined }))}
            className="text-red-600 hover:text-red-700"
          >
            Clear date
          </Button>
        )}
      </div>

      {/* Labels */}
      <div className="space-y-2">
        <Label>Labels</Label>
        <div className="flex flex-wrap gap-2 mb-2">
          {(formData.labels || []).map((labelId) => {
            const labelObj = labels.find((l) => l.id === labelId)
            return (
              <Badge key={labelId} variant="secondary" className="flex items-center gap-1">
                <Tag className="h-3 w-3" />
                {labelObj?.name || labelId}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-4 w-4 p-0 hover:bg-transparent"
                  onClick={() => removeLabel(labelId)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            )
          })}
        </div>
        <div className="flex gap-2">
          <Input
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="Add label..."
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                addLabel()
              }
            }}
          />
          <Button type="button" onClick={addLabel} size="icon" variant="outline">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        {labels.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {labels
              .filter((label) => !(formData.labels || []).includes(label.id))
              .slice(0, 5)
              .map((label) => (
                <Button
                  key={label.name}
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      labels: [...(prev.labels || []), label.id],
                    }))
                  }
                >
                  <Tag className="h-3 w-3 mr-1" style={{ color: label.color }} />
                  {label.name}
                </Button>
              ))}
          </div>
        )}
      </div>

      {/* Favorite feature removed */}

      {/* Form Actions */}
      <div className="flex gap-3 pt-4">
        <Button type="submit" className="flex-1">
          {task?.id ? "Update Task" : "Create Task"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
