"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { useTranslation } from "@tasktrove/i18n"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Copy, Trash2, Star, Users, Folder } from "lucide-react"
import { toast } from "sonner"

const categoryIcons = {
  personal: "👤",
  work: "💼",
  health: "💚",
  education: "📚",
  custom: "⭐",
}

interface TaskTemplate {
  id: string
  name: string
  description: string
  category: "personal" | "work" | "health" | "education" | "custom"
  icon: string
  tasks: Array<{
    title: string
    description?: string
    priority: 1 | 2 | 3 | 4
    estimatedTime?: number
    labels: string[]
    subtasks?: string[]
  }>
  createdAt: Date
  usageCount: number
  favorite: boolean
}

interface TaskTemplatesProps {
  templates: TaskTemplate[]
  onCreateFromTemplate: (template: TaskTemplate, projectId: string) => void
  onSaveTemplate: (template: Omit<TaskTemplate, "id" | "createdAt" | "usageCount">) => void
  onDeleteTemplate: (templateId: string) => void
  onToggleFavorite: (templateId: string) => void
  projects: Array<{ id: string; name: string; color: string }>
}

export function TaskTemplates({
  templates,
  onCreateFromTemplate,
  onSaveTemplate,
  onDeleteTemplate,
  onToggleFavorite,
  projects,
}: TaskTemplatesProps) {
  const { t } = useTranslation("task")
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<TaskTemplate | null>(null)
  const [selectedProject, setSelectedProject] = useState("")
  const [newTemplate, setNewTemplate] = useState<
    Omit<TaskTemplate, "id" | "createdAt" | "usageCount">
  >({
    name: "",
    description: "",
    category: "custom",
    icon: "📋",
    tasks: [{ title: "", description: "", priority: 4, labels: [], subtasks: [] }],
    favorite: false,
  })

  const predefinedTemplates: TaskTemplate[] = [
    {
      id: "morning-routine",
      name: "Morning Routine",
      description: "Start your day with a productive morning routine",
      category: "personal",
      icon: "🌅",
      tasks: [
        { title: "Drink a glass of water", priority: 3, labels: ["health"], subtasks: [] },
        { title: "10-minute meditation", priority: 2, labels: ["mindfulness"], subtasks: [] },
        { title: "Review daily goals", priority: 2, labels: ["planning"], subtasks: [] },
        { title: "Exercise for 30 minutes", priority: 1, labels: ["fitness"], subtasks: [] },
        { title: "Healthy breakfast", priority: 3, labels: ["nutrition"], subtasks: [] },
      ],
      createdAt: new Date(),
      usageCount: 45,
      favorite: true,
    },
    {
      id: "project-kickoff",
      name: "Project Kickoff",
      description: "Essential tasks for starting a new project",
      category: "work",
      icon: "🚀",
      tasks: [
        {
          title: "Define project scope and objectives",
          priority: 1,
          labels: ["planning"],
          subtasks: [],
        },
        { title: "Identify stakeholders", priority: 2, labels: ["team"], subtasks: [] },
        { title: "Create project timeline", priority: 1, labels: ["planning"], subtasks: [] },
        { title: "Set up project workspace", priority: 3, labels: ["setup"], subtasks: [] },
        { title: "Schedule kickoff meeting", priority: 2, labels: ["meeting"], subtasks: [] },
      ],
      createdAt: new Date(),
      usageCount: 23,
      favorite: false,
    },
    {
      id: "weekly-review",
      name: "Weekly Review",
      description: "Reflect on the week and plan ahead",
      category: "personal",
      icon: "📊",
      tasks: [
        { title: "Review completed tasks", priority: 2, labels: ["review"], subtasks: [] },
        { title: "Analyze time spent", priority: 3, labels: ["analytics"], subtasks: [] },
        {
          title: "Identify wins and challenges",
          priority: 2,
          labels: ["reflection"],
          subtasks: [],
        },
        { title: "Plan next week's priorities", priority: 1, labels: ["planning"], subtasks: [] },
        { title: "Update goals progress", priority: 2, labels: ["goals"], subtasks: [] },
      ],
      createdAt: new Date(),
      usageCount: 67,
      favorite: true,
    },
  ]

  const allTemplates = [...predefinedTemplates, ...templates]

  const handleCreateFromTemplate = () => {
    if (selectedTemplate && selectedProject) {
      onCreateFromTemplate(selectedTemplate, selectedProject)
      setSelectedTemplate(null)
      setSelectedProject("")
      toast.success(
        `Created ${selectedTemplate.tasks.length} tasks from "${selectedTemplate.name}" template`,
      )
    }
  }

  const handleSaveTemplate = () => {
    if (newTemplate.name.trim() && newTemplate.tasks.some((t) => t.title.trim())) {
      onSaveTemplate(newTemplate)
      setNewTemplate({
        name: "",
        description: "",
        category: "custom",
        icon: "📋",
        tasks: [{ title: "", description: "", priority: 4, labels: [], subtasks: [] }],
        favorite: false,
      })
      setShowCreateDialog(false)
      toast.success(`"${newTemplate.name}" template has been saved`)
    }
  }

  const addTaskToTemplate = () => {
    setNewTemplate((prev) => ({
      ...prev,
      tasks: [...prev.tasks, { title: "", description: "", priority: 4, labels: [], subtasks: [] }],
    }))
  }

  const removeTaskFromTemplate = (index: number) => {
    setNewTemplate((prev) => ({
      ...prev,
      tasks: prev.tasks.filter((_, i) => i !== index),
    }))
  }

  const updateTemplateTask = (index: number, field: string, value: string | number | string[]) => {
    setNewTemplate((prev) => ({
      ...prev,
      tasks: prev.tasks.map((task, i) => (i === index ? { ...task, [field]: value } : task)),
    }))
  }

  const getCategoryTemplates = (category: string) => {
    return allTemplates.filter((t) => t.category === category)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Task Templates</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Create tasks quickly with pre-built templates
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Template</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Template Name</label>
                  <Input
                    value={newTemplate.name}
                    onChange={(e) => setNewTemplate((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Daily Standup"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Category</label>
                  <Select
                    value={newTemplate.category}
                    onValueChange={(value) => {
                      if (
                        value === "personal" ||
                        value === "work" ||
                        value === "health" ||
                        value === "education" ||
                        value === "custom"
                      ) {
                        setNewTemplate((prev) => ({ ...prev, category: value }))
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="personal">Personal</SelectItem>
                      <SelectItem value="work">Work</SelectItem>
                      <SelectItem value="health">Health</SelectItem>
                      <SelectItem value="education">Education</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  value={newTemplate.description}
                  onChange={(e) =>
                    setNewTemplate((prev) => ({ ...prev, description: e.target.value }))
                  }
                  placeholder="Describe what this template is for..."
                />
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Tasks</label>
                  <Button onClick={addTaskToTemplate} size="sm" variant="outline">
                    <Plus className="h-4 w-4 mr-1" />
                    {t("actions.addTask", "Add Task")}
                  </Button>
                </div>
                {newTemplate.tasks.map((task, index) => (
                  <div key={index} className="p-3 border rounded-lg space-y-2">
                    <div className="flex items-center gap-2">
                      <Input
                        value={task.title}
                        onChange={(e) => updateTemplateTask(index, "title", e.target.value)}
                        placeholder="Task title"
                        className="flex-1"
                      />
                      <Select
                        value={task.priority.toString()}
                        onValueChange={(value) =>
                          updateTemplateTask(index, "priority", Number.parseInt(value))
                        }
                      >
                        <SelectTrigger className="w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">P1</SelectItem>
                          <SelectItem value="2">P2</SelectItem>
                          <SelectItem value="3">P3</SelectItem>
                          <SelectItem value="4">P4</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        onClick={() => removeTaskFromTemplate(index)}
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <Textarea
                      value={task.description}
                      onChange={(e) => updateTemplateTask(index, "description", e.target.value)}
                      placeholder="Task description (optional)"
                      rows={2}
                    />
                  </div>
                ))}
              </div>
              <Button onClick={handleSaveTemplate} className="w-full">
                Save Template
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Templates by Category */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="personal">Personal</TabsTrigger>
          <TabsTrigger value="work">Work</TabsTrigger>
          <TabsTrigger value="health">Health</TabsTrigger>
          <TabsTrigger value="education">Education</TabsTrigger>
          <TabsTrigger value="custom">Custom</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {allTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onUse={() => setSelectedTemplate(template)}
                onToggleFavorite={() => onToggleFavorite(template.id)}
                onDelete={() => onDeleteTemplate(template.id)}
              />
            ))}
          </div>
        </TabsContent>

        {["personal", "work", "health", "education", "custom"].map((category) => (
          <TabsContent key={category} value={category} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {getCategoryTemplates(category).map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onUse={() => setSelectedTemplate(template)}
                  onToggleFavorite={() => onToggleFavorite(template.id)}
                  onDelete={() => onDeleteTemplate(template.id)}
                />
              ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* Use Template Dialog */}
      <Dialog open={!!selectedTemplate} onOpenChange={() => setSelectedTemplate(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Use Template: {selectedTemplate?.name}</DialogTitle>
          </DialogHeader>
          {selectedTemplate && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {selectedTemplate.description}
              </p>
              <div>
                <label className="text-sm font-medium">Select Project</label>
                <Select value={selectedProject} onValueChange={setSelectedProject}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        <div className="flex items-center gap-2">
                          <Folder className="h-3 w-3" style={{ color: project.color }} />
                          {project.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Tasks to create ({selectedTemplate.tasks.length})
                </label>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {selectedTemplate.tasks.map((task, index) => (
                    <div key={index} className="text-sm p-2 bg-gray-50 dark:bg-gray-800 rounded">
                      {task.title}
                    </div>
                  ))}
                </div>
              </div>
              <Button
                onClick={handleCreateFromTemplate}
                className="w-full"
                disabled={!selectedProject}
              >
                Create {selectedTemplate.tasks.length} Tasks
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function TemplateCard({
  template,
  onUse,
  onToggleFavorite,
  onDelete,
}: {
  template: TaskTemplate
  onUse: () => void
  onToggleFavorite: () => void
  onDelete: () => void
}) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{template.icon}</span>
            <div>
              <CardTitle className="text-lg">{template.name}</CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-xs">
                  {categoryIcons[template.category]}
                  <span className="ml-1">{template.category}</span>
                </Badge>
                <span className="text-xs text-gray-500">{template.tasks.length} tasks</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onToggleFavorite}>
              <Star
                className={`h-3 w-3 ${template.favorite ? "fill-current text-yellow-500" : ""}`}
              />
            </Button>
            {template.category === "custom" && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-red-600"
                onClick={onDelete}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
          {template.description}
        </p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Users className="h-3 w-3" />
            <span>Used {template.usageCount} times</span>
          </div>
          <Button onClick={onUse} size="sm">
            <Copy className="h-4 w-4 mr-1" />
            Use Template
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
