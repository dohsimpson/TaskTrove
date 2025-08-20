"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command"
import {
  Plus,
  Calendar,
  List,
  LayoutDashboard,
  Settings,
  Sun,
  Moon,
  Monitor,
  TrendingUp,
  Home,
  Filter,
  Clock,
  CheckSquare,
  Flag,
  FolderPlus,
} from "lucide-react"
import { toast } from "@/hooks/use-toast"

interface Task {
  id: string
  title: string
  description?: string
  completed: boolean
  priority: 1 | 2 | 3 | 4
  dueDate?: Date
  labels: string[]
  project?: string
}

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tasks?: Task[]
  onQuickAdd?: () => void
  onAdvancedSearch?: () => void
  onCreateProject?: () => void
  onSettings?: () => void
}

export function CommandPalette({
  open,
  onOpenChange,
  tasks = [],
  onQuickAdd,
  onAdvancedSearch,
  onCreateProject,
  onSettings,
}: CommandPaletteProps) {
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const [searchValue, setSearchValue] = useState("")

  // Command palette triggers are now handled by the global keyboard manager
  // in main-layout-wrapper.tsx to avoid conflicts and ensure consistent behavior

  const runCommand = (command: () => void) => {
    onOpenChange(false)
    command()
  }

  // Filter tasks based on search
  const filteredTasks = tasks
    .filter(
      (task) =>
        task.title.toLowerCase().includes(searchValue.toLowerCase()) ||
        task.description?.toLowerCase().includes(searchValue.toLowerCase()),
    )
    .slice(0, 5) // Limit to 5 results

  const quickActions = [
    {
      icon: Plus,
      label: "Add New Task",
      shortcut: "⌘N",
      action: () => onQuickAdd?.(),
    },
    {
      icon: FolderPlus,
      label: "Create Project",
      action: () => onCreateProject?.(),
    },
    {
      icon: Filter,
      label: "Search Tasks",
      shortcut: "⌘⇧F",
      action: () => onAdvancedSearch?.(),
    },
    {
      icon: Settings,
      label: "Settings",
      shortcut: "⌘,",
      action: () => onSettings?.(),
    },
  ]

  const navigation = [
    {
      icon: Home,
      label: "Dashboard",
      action: () => router.push("/"),
    },
    {
      icon: Clock,
      label: "Today",
      action: () => router.push("/today"),
    },
    {
      icon: Calendar,
      label: "Upcoming",
      action: () => router.push("/upcoming"),
    },
    {
      icon: List,
      label: "Inbox",
      action: () => router.push("/inbox"),
    },
    {
      icon: CheckSquare,
      label: "Completed",
      action: () => router.push("/completed"),
    },
    {
      icon: LayoutDashboard,
      label: "Projects",
      action: () => router.push("/projects"),
    },
    {
      icon: TrendingUp,
      label: "Analytics",
      action: () => router.push("/analytics"),
    },
  ]

  const themeActions = [
    {
      icon: Sun,
      label: "Light Theme",
      action: () => {
        setTheme("light")
        toast({ title: "Theme changed", description: "Switched to light theme." })
      },
    },
    {
      icon: Moon,
      label: "Dark Theme",
      action: () => {
        setTheme("dark")
        toast({ title: "Theme changed", description: "Switched to dark theme." })
      },
    },
    {
      icon: Monitor,
      label: "System Theme",
      action: () => {
        setTheme("system")
        toast({ title: "Theme changed", description: "Switched to system theme." })
      },
    },
  ]

  const getPriorityIcon = (priority: number) => {
    switch (priority) {
      case 1:
        return <Flag className="h-4 w-4 text-red-500" />
      case 2:
        return <Flag className="h-4 w-4 text-orange-500" />
      case 3:
        return <Flag className="h-4 w-4 text-blue-500" />
      default:
        return <Flag className="h-4 w-4 text-gray-400" />
    }
  }

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Search tasks, navigate, or run commands..."
        value={searchValue}
        onValueChange={setSearchValue}
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        {/* Tasks */}
        {filteredTasks.length > 0 && (
          <CommandGroup heading="Tasks">
            {filteredTasks.map((task) => (
              <CommandItem
                key={task.id}
                onSelect={() =>
                  runCommand(() => {
                    // You can implement task navigation here
                    toast({ title: "Task selected", description: task.title })
                  })
                }
              >
                <div className="flex items-center gap-2 flex-1">
                  <CheckSquare className="h-4 w-4" />
                  <div className="flex-1">
                    <div className="font-medium">{task.title}</div>
                    {task.description && (
                      <div className="text-sm text-muted-foreground line-clamp-1">
                        {task.description}
                      </div>
                    )}
                  </div>
                  {task.priority < 4 && getPriorityIcon(task.priority)}
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {/* Quick Actions */}
        <CommandGroup heading="Quick Actions">
          {quickActions.map((action, index) => (
            <CommandItem key={index} onSelect={() => runCommand(action.action)}>
              {React.createElement(action.icon, { className: "mr-2 h-4 w-4" })}
              <span>{action.label}</span>
              {action.shortcut && <CommandShortcut>{action.shortcut}</CommandShortcut>}
            </CommandItem>
          ))}
        </CommandGroup>

        {/* Navigation */}
        <CommandGroup heading="Navigate">
          {navigation.map((item, index) => (
            <CommandItem key={index} onSelect={() => runCommand(item.action)}>
              {React.createElement(item.icon, { className: "mr-2 h-4 w-4" })}
              <span>{item.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        {/* Theme */}
        <CommandGroup heading="Theme">
          {themeActions.map((action, index) => (
            <CommandItem key={index} onSelect={() => runCommand(action.action)}>
              {React.createElement(action.icon, { className: "mr-2 h-4 w-4" })}
              <span>{action.label}</span>
              {theme === action.label.toLowerCase().split(" ")[0] && (
                <CommandShortcut>✓</CommandShortcut>
              )}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
