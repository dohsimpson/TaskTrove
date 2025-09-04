"use client"

import { useState, useEffect } from "react"
import { useAtomValue, useSetAtom } from "jotai"
import { dynamicPageInfoAtom, currentRouteContextAtom } from "@/lib/atoms/ui/navigation"
import { tasksAtom } from "@/lib/atoms"
import { openQuickAddAtom, openProjectDialogAtom } from "@/lib/atoms/ui/navigation"
import { openSettingsDialogAtom } from "@/lib/atoms/ui/dialogs"

import { Button } from "@/components/ui/button"
import { useSidebar } from "@/components/ui/sidebar"
import {} from "@/components/ui/dropdown-menu"
import {
  Search,
  ListCheck,
  Calendar,
  Filter,
  CheckSquare,
  Clock,
  TrendingUp,
  Sun,
  Moon,
  Monitor,
  PanelRightClose,
  PanelRightOpen,
  Inbox,
  Folder,
  Tag,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { ViewOptionsPopover } from "./view-options-popover"
import { CommandPalette } from "@/components/search/command-palette"
import { HelpPopover } from "@/components/ui/help-popover"
import { getHelpContent } from "@/lib/help-content"
import { useTheme } from "next-themes"
// import { ToolbarUndoRedo } from "@/components/history/undo-redo-buttons"

interface PageHeaderProps {
  // Legacy props - to be removed in final cleanup
  onAdvancedSearch?: () => void
  actions?: Array<{
    label: string
    icon?: React.ReactNode
    onClick: () => void
    variant?: "default" | "outline" | "ghost"
  }>
  className?: string
}

export function PageHeader({
  // Legacy props - to be removed in final cleanup
  onAdvancedSearch,
  actions = [],
  className,
}: PageHeaderProps) {
  const { theme, setTheme } = useTheme()
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Atom state and actions
  const routeContext = useAtomValue(currentRouteContextAtom)
  const { open: sidebarOpen, toggleSidebar } = useSidebar()
  const tasks = useAtomValue(tasksAtom)
  const openQuickAdd = useSetAtom(openQuickAddAtom)
  const openProjectDialog = useSetAtom(openProjectDialogAtom)
  const openSettingsDialog = useSetAtom(openSettingsDialogAtom)

  // Theme toggle function
  const toggleTheme = () => {
    if (theme === "light") {
      setTheme("dark")
    } else if (theme === "dark") {
      setTheme("system")
    } else {
      setTheme("light")
    }
  }

  // Get current theme icon
  const getThemeIcon = () => {
    switch (theme) {
      case "light":
        return <Sun className="h-4 w-4" />
      case "dark":
        return <Moon className="h-4 w-4" />
      default:
        return <Monitor className="h-4 w-4" />
    }
  }

  // Get dynamic page info from atom
  const pageInfo = useAtomValue(dynamicPageInfoAtom)

  // Set mounted to true after hydration to prevent theme mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  // Dynamic icon rendering based on page info
  const getPageIcon = (iconType: string, color?: string) => {
    const iconProps = { className: "h-5 w-5", style: color ? { color } : {} }

    switch (iconType) {
      case "today":
        return <Calendar {...iconProps} />
      case "inbox":
        return <Inbox {...iconProps} />
      case "upcoming":
        return <Clock {...iconProps} />
      case "analytics":
        return <TrendingUp {...iconProps} />
      case "project":
        return <Folder {...iconProps} />
      case "label":
        return <Tag {...iconProps} />
      case "filter":
        return <Filter {...iconProps} />
      case "all":
        return <ListCheck {...iconProps} />
      case "completed":
        return <CheckSquare {...iconProps} />
      case "search":
        return <Search {...iconProps} />
      default:
        return <ListCheck {...iconProps} />
    }
  }

  return (
    <header
      className={cn(
        "sticky top-0 z-40 bg-card/95 backdrop-blur-sm px-0 sm:px-4 py-3 border-0 border-b-1",
        className,
      )}
      data-testid="page-header"
    >
      <div className="flex items-center justify-between">
        {/* Left Section */}
        <div className="flex items-center gap-0 sm:gap-4" data-testid="page-header-left-section">
          {/* Sidebar Toggle Buttons */}
          <div className="flex items-center gap-1">
            {sidebarOpen && (
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleSidebar}
                title="Collapse sidebar"
                className="cursor-pointer"
              >
                <PanelRightOpen className="h-4 w-4" />
              </Button>
            )}
            {!sidebarOpen && (
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleSidebar}
                title="Open sidebar"
                className="cursor-pointer"
              >
                <PanelRightClose className="h-4 w-4" />
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center">
                {getPageIcon(pageInfo.iconType, pageInfo.color)}
              </div>
              <div>
                <h1 className="text-2xl text-foreground">{pageInfo.title}</h1>
              </div>
            </div>

            {/* Help Button */}
            {(() => {
              const helpContent = getHelpContent(routeContext.pathname, pageInfo.title)
              return helpContent ? (
                <HelpPopover
                  title={helpContent.title}
                  content={helpContent.content}
                  className="ml-1"
                  align="start"
                />
              ) : null
            })()}
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-2">
          {/* Custom Actions */}
          {actions.map((action, index) => (
            <Button
              key={index}
              variant={action.variant || "outline"}
              size="sm"
              onClick={action.onClick}
            >
              {action.icon}
              {action.label}
            </Button>
          ))}

          {/* View Options Popover - Uses atoms directly */}
          <ViewOptionsPopover onAdvancedSearch={onAdvancedSearch} />

          {/* Undo/Redo Buttons - Hidden until properly implemented */}
          {/* <ToolbarUndoRedo /> */}

          {/* Gamification/Rewards - Temporarily disabled */}
          {/* <ComingSoonWrapper disabled={true} featureName="rewards system" tooltipContent="Rewards - Coming Soon!" tooltipSide="bottom">
            <Button variant="ghost" size="icon" className="cursor-pointer">
              <CircleDollarSign className="h-4 w-4" />
            </Button>
          </ComingSoonWrapper> */}

          {/* Notifications - Temporarily disabled */}
          {/* <ComingSoonWrapper disabled={true} featureName="notifications" tooltipContent="Notifications - Coming Soon!" tooltipSide="bottom">
            <Button variant="ghost" size="icon" className="cursor-pointer">
              <Bell className="h-4 w-4" />
            </Button>
          </ComingSoonWrapper> */}

          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="cursor-pointer"
            title={
              mounted ? `Current theme: ${theme}. Click to cycle themes.` : "Click to cycle themes."
            }
          >
            {mounted ? getThemeIcon() : <Monitor className="h-4 w-4" />}
          </Button>

          {/* More Actions Menu - Commented for future use */}
          {/* <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="cursor-pointer">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <div className="p-2">
                <div className="flex gap-1">
                  <Button
                    variant={theme === "light" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setTheme("light")}
                    className="flex-1 cursor-pointer"
                  >
                    <Sun className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={theme === "dark" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setTheme("dark")}
                    className="flex-1 cursor-pointer"
                  >
                    <Moon className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={theme === "system" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setTheme("system")}
                    className="flex-1 cursor-pointer"
                  >
                    <Monitor className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Target className="h-4 w-4 mr-2" />
                Set Goal
              </DropdownMenuItem>
              <DropdownMenuItem>
                <TrendingUp className="h-4 w-4 mr-2" />
                View Statistics
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Archive className="h-4 w-4 mr-2" />
                Archive Completed
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu> */}
        </div>
      </div>

      {/* Command Palette */}
      <CommandPalette
        open={isCommandPaletteOpen}
        onOpenChange={setIsCommandPaletteOpen}
        tasks={tasks}
        onQuickAdd={openQuickAdd}
        onAdvancedSearch={onAdvancedSearch}
        onCreateProject={openProjectDialog}
        onSettings={openSettingsDialog}
      />
    </header>
  )
}
