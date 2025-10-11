"use client"

import { useEffect, useCallback } from "react"
import { usePathname } from "next/navigation"
import { useAtom, useSetAtom } from "jotai"
// Most icons are no longer needed thanks to our atoms!
// DragDropContext no longer needed with pragmatic-drag-and-drop
import { VoiceCommand } from "@/lib/types"
// import { GestureHandler } from "@/components/mobile/gesture-handler" // DISABLED - Mobile gestures temporarily removed
// Old keyboard handlers removed - now using unified global keyboard system
import { useGlobalKeyboardManager } from "@/hooks/use-global-keyboard-manager"
import {
  registerKeyboardHandlerAtom,
  unregisterKeyboardHandlerAtom,
  type KeyboardHandler,
} from "@tasktrove/atoms"
import { registerRefreshHandler, scheduleAtTime } from "@tasktrove/dom-utils"
import { addDays, startOfDay } from "date-fns"
import { SidebarNav } from "@/components/navigation/sidebar-nav"
import { AppSidebarFooter } from "@/components/navigation/sidebar-footer"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarProvider,
  SidebarInset,
  useSidebar,
} from "@/components/ui/sidebar"
import { TaskTroveLogo } from "@/components/ui/custom/tasktrove-logo"
import { PageHeader } from "@/components/layout/page-header"
import { PageFooter } from "@/components/layout/page-footer"
import { QuickAddDialog } from "@/components/dialogs/quick-add-dialog"
import { ProjectDialog } from "@/components/dialogs/project-dialog"
import { LabelDialog } from "@/components/dialogs/label-dialog"
import { SectionDialog } from "@/components/dialogs/section-dialog"
import { SearchDialog } from "@/components/search/search-dialog"
import { SettingsDialog } from "@/components/dialogs/settings-dialog"
import { UserProfileDialog } from "@/components/dialogs/user-profile-dialog"
import { RouteContent } from "@/components/layout/route-content"
import { useTheme } from "next-themes"
import { toast } from "sonner"
import {
  // Task atoms
  taskAtoms,
  // Label atoms
  // View atoms
  currentViewAtom,
  // Dialog atoms
  selectedTaskAtom,
  toggleTaskPanelAtom,
  closeTaskPanelAtom,
  // Project atoms
  // UI atoms
  appRefreshTriggerAtom,
} from "@tasktrove/atoms"
import { keyboardShortcutAtom } from "@tasktrove/atoms"
// Import our new atoms
import {
  setPathnameAtom,
  currentRouteContextAtom,
  openSearchAtom,
  openQuickAddAtom,
} from "@tasktrove/atoms"
import { useIsMobile } from "@/hooks/use-mobile"
import { useNotificationSystem } from "@/hooks/use-notification-system"
import "@khmyznikov/pwa-install"

interface MainLayoutWrapperProps {
  children: React.ReactNode
}

// Component that uses useSidebar hook inside SidebarProvider for keyboard shortcuts
function SidebarKeyboardHandler() {
  const { toggleSidebar } = useSidebar()

  // Register global shortcuts
  const registerHandler = useSetAtom(registerKeyboardHandlerAtom)
  const unregisterHandler = useSetAtom(unregisterKeyboardHandlerAtom)

  // Register global keyboard shortcuts
  useEffect(() => {
    // Sidebar toggle shortcut (Cmd/Ctrl+B)
    const sidebarHandler: KeyboardHandler = {
      id: "sidebar-shortcuts",
      shortcuts: ["Cmd+b", "Ctrl+b"],
      context: {
        excludeDialogs: false, // Should work even with dialogs open
        requiresNoTyping: true,
        priority: 10,
      },
      handler: (event) => {
        const { key, metaKey, ctrlKey } = event
        const modifier = metaKey || ctrlKey

        if (modifier && key === "b") {
          toggleSidebar()
          return true
        }
        return false
      },
    }

    registerHandler(sidebarHandler)

    return () => {
      unregisterHandler("sidebar-shortcuts")
    }
  }, [registerHandler, unregisterHandler, toggleSidebar])

  return null
}

export function MainLayoutWrapper({ children }: MainLayoutWrapperProps) {
  // Navigation and theme
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()

  // Global keyboard manager - handles all keyboard shortcuts
  useGlobalKeyboardManager()

  // Register global shortcuts
  const registerHandler = useSetAtom(registerKeyboardHandlerAtom)
  const unregisterHandler = useSetAtom(unregisterKeyboardHandlerAtom)
  const handleHistoryShortcut = useSetAtom(keyboardShortcutAtom)

  // Sync pathname with our route context atom
  const setPathname = useSetAtom(setPathnameAtom)

  // Use our new atoms for simplified state management
  const [routeContext] = useAtom(currentRouteContextAtom)
  const isMobile = useIsMobile()

  // Initialize notification system following Next.js best practices
  useNotificationSystem()

  // Navigation actions using our centralized atoms
  const openSearch = useSetAtom(openSearchAtom)
  const openQuickAddAction = useSetAtom(openQuickAddAtom)

  // Still need some existing atoms for functionality
  const updateTask = useSetAtom(taskAtoms.actions.updateTask)
  const toggleTask = useSetAtom(taskAtoms.actions.toggleTask)
  // const deleteTask = useSetAtom(taskActions.deleteTask) // DISABLED with gesture handler
  // Dialog state atoms
  const [selectedTask] = useAtom(selectedTaskAtom)
  const toggleTaskPanel = useSetAtom(toggleTaskPanelAtom)
  const closeTaskPanel = useSetAtom(closeTaskPanelAtom)

  // View state atoms
  const setCurrentView = useSetAtom(currentViewAtom)

  // Sync pathname with our route context atom
  useEffect(() => {
    setPathname(pathname)
  }, [pathname, setPathname])

  // Update currentViewAtom when route context changes (for compatibility)
  useEffect(() => {
    setCurrentView(routeContext.viewId)
  }, [routeContext.viewId, setCurrentView])

  // App refresh trigger - triggers re-render when conditions are met (DO WE NEED THIS? DOES MIDNIGHT CHECK WORK RELIABLY?)
  const setRefreshTrigger = useSetAtom(appRefreshTriggerAtom)
  useEffect(() => {
    const cleanup = registerRefreshHandler(
      {
        checkDayChange: true,
        // Add more conditions in the future:
        // customCheck: () => hasNewVersion() || hasSettingsChanged()
      },
      () => setRefreshTrigger(Date.now()),
    )

    return cleanup
  }, [setRefreshTrigger])

  // Midnight check - triggers refresh at midnight even if tab stays visible
  useEffect(() => {
    let cleanupSchedule: (() => void) | null = null

    const scheduleNextMidnight = () => {
      // Calculate next midnight
      const tomorrow = startOfDay(addDays(new Date(), 1))

      cleanupSchedule = scheduleAtTime({
        targetTime: tomorrow,
        handler: () => {
          // Trigger refresh
          setRefreshTrigger(Date.now())
          // Schedule next midnight (recurring)
          scheduleNextMidnight()
        },
      })
    }

    scheduleNextMidnight()

    return () => {
      if (cleanupSchedule) {
        cleanupSchedule()
      }
    }
  }, [setRefreshTrigger])

  // Keyboard shortcuts registration will be done after all functions are defined

  // Legacy drag handler - no longer used with pragmatic-drag-and-drop
  // Individual components now handle their own drag operations

  // DISABLED - Mobile gesture support temporarily removed
  // Will be restored later when needed
  /*
  // Gesture configuration interfaces to match gesture-handler
  interface SwipeGestureConfig {
    enabled: boolean
    action: string
    threshold: number
  }

  interface PinchGestureConfig {
    enabled: boolean
    action: string
    threshold: number
  }

  interface DoubleTapGestureConfig {
    enabled: boolean
    action: string
    delay: number
  }

  interface LongPressGestureConfig {
    enabled: boolean
    action: string
    duration: number
  }

  interface GestureConfig {
    enabled: boolean
    sensitivity: number
    gestures: {
      swipeLeft: SwipeGestureConfig
      swipeRight: SwipeGestureConfig
      swipeUp: SwipeGestureConfig
      swipeDown: SwipeGestureConfig
      pinch: PinchGestureConfig
      doubleTap: DoubleTapGestureConfig
      longPress: LongPressGestureConfig
    }
  }

  // Gesture configuration
  const [gestureConfig, setGestureConfig] = useState<GestureConfig>({
    enabled: true,
    sensitivity: 100,
    gestures: {
      swipeLeft: { enabled: true, action: "complete_task", threshold: 100 },
      swipeRight: { enabled: true, action: "edit_task", threshold: 100 },
      swipeUp: { enabled: true, action: "add_task", threshold: 80 },
      swipeDown: { enabled: true, action: "refresh", threshold: 80 },
      pinch: { enabled: true, action: "zoom_in", threshold: 50 },
      doubleTap: { enabled: true, action: "edit_task", delay: 300 },
      longPress: { enabled: true, action: "delete_task", duration: 800 },
    },
  })

  // Define gesture types
  interface GestureEvent {
    type: "swipe" | "pinch" | "tap" | "longpress"
    direction?: "left" | "right" | "up" | "down" | "in" | "out"
    distance?: number
    duration?: number
    position: { x: number; y: number }
    timestamp: Date
  }

  // Define all functions before conditional returns
  const handleGesture = (gesture: GestureEvent) => {
    switch (gesture.type) {
      case "swipe":
        if (gesture.direction === "left" && selectedTask) {
          toggleTask(selectedTask.id)
        } else if (gesture.direction === "right" && selectedTask) {
          toggleTaskPanel(selectedTask)
        } else if (gesture.direction === "up") {
          openQuickAddAction()
        } else if (gesture.direction === "down") {
          window.location.reload()
        }
        break
      case "longpress":
        if (selectedTask) {
          deleteTask(selectedTask.id)
        }
        break
      case "tap":
        if (selectedTask) {
          toggleTaskPanel(selectedTask)
        }
        break
    }
  }
  */

  const toggleTheme = useCallback(() => {
    const themes: readonly ["light", "dark", "system"] = ["light", "dark", "system"]

    const getCurrentThemeIndex = (): number => {
      if (theme === "light") return 0
      if (theme === "dark") return 1
      if (theme === "system") return 2
      return 0 // Default to light
    }

    const currentIndex = getCurrentThemeIndex()
    const nextTheme = themes[(currentIndex + 1) % themes.length] || "light"
    setTheme(nextTheme)
    toast.success(`Switched to ${nextTheme} theme`)
  }, [theme, setTheme])

  // Register global keyboard shortcuts through the unified system
  useEffect(() => {
    // Main app shortcuts
    const globalHandler: KeyboardHandler = {
      id: "global-shortcuts",
      shortcuts: [
        "Cmd+N",
        "Ctrl+N",
        "n",
        // "Cmd+F", // DISABLED
        // "Ctrl+F", // DISABLED
        "/",
        "?",
        "Cmd+Shift+T",
        "Ctrl+Shift+T",
        "Cmd+Shift+P",
        "Ctrl+Shift+P",
      ],
      context: {
        excludeDialogs: false, // Work even with dialogs open
        requiresNoTyping: true,
        priority: 10,
      },
      handler: (event) => {
        const { key, metaKey, ctrlKey, shiftKey } = event
        const modifier = metaKey || ctrlKey

        // Quick add task (Cmd/Ctrl + N or just N)
        if ((modifier && key === "n") || key === "n") {
          openQuickAddAction()
          return true
        }

        // Search (Cmd/Ctrl + F or /) - Cmd/Ctrl+F DISABLED, / still works
        if (key === "/") {
          openSearch()
          return true
        }
        // if (modifier && key === "f") {
        //   openSearch()
        //   return true
        // }

        // Toggle theme (Cmd/Ctrl + Shift + T)
        if (modifier && shiftKey && key === "T") {
          toggleTheme()
          return true
        }

        // Open pomodoro timer (Cmd/Ctrl + Shift + P) - DISABLED
        // if (modifier && shiftKey && key === 'P') {
        //   setPomodoroOpen(true)
        //   return true
        // }

        // Show help (?)
        if (key === "?" && !modifier) {
          // TODO: Implement help dialog
          console.log("Show help - TODO: implement help dialog")
          return true
        }

        return false
      },
    }

    // Task actions (when a task is focused)
    const taskFocusHandler: KeyboardHandler = {
      id: "task-focus-shortcuts",
      shortcuts: ["Enter", " ", "Delete", "Backspace"],
      context: {
        requiresNoTyping: true,
        requiresElement: '[data-task-focused="true"]',
        priority: 25,
      },
      handler: (event) => {
        const { key, metaKey, ctrlKey } = event
        const modifier = metaKey || ctrlKey
        const focusedTask = document.querySelector('[data-task-focused="true"]')

        if (!focusedTask) return false

        switch (key) {
          case "Enter": {
            // Edit task
            const editButton = focusedTask.querySelector('[data-action="edit"]')
            if (editButton instanceof HTMLElement) {
              editButton.click()
              return true
            }
            break
          }
          case " ": {
            // Toggle completion
            const toggleButton = focusedTask.querySelector('[data-action="toggle"]')
            if (toggleButton instanceof HTMLElement) {
              toggleButton.click()
              return true
            }
            break
          }
          case "Delete":
          case "Backspace":
            if (modifier) {
              // Delete task
              const deleteButton = focusedTask.querySelector('[data-action="delete"]')
              if (deleteButton instanceof HTMLElement) {
                deleteButton.click()
                return true
              }
            }
            break
        }
        return false
      },
    }

    // Navigation sequences (G+T, G+U, G+I) - more complex due to sequence handling
    const navigationHandler: KeyboardHandler = {
      id: "navigation-sequences",
      shortcuts: ["g"],
      context: {
        excludeDialogs: true, // Don't work when dialogs are open
        requiresNoTyping: true,
        priority: 15,
      },
      handler: (event) => {
        if (event.key === "g") {
          // Set up temporary listener for second key
          const handleSecondKey = (secondEvent: globalThis.KeyboardEvent) => {
            document.removeEventListener("keydown", handleSecondKey)

            switch (secondEvent.key) {
              case "t":
                // Navigate to Today
                window.location.href = "/today"
                break
              case "u":
                // Navigate to Upcoming
                window.location.href = "/upcoming"
                break
              case "i":
                // Navigate to Inbox
                window.location.href = "/inbox"
                break
            }
          }

          document.addEventListener("keydown", handleSecondKey)

          // Remove listener after 2 seconds if no second key pressed
          setTimeout(() => {
            document.removeEventListener("keydown", handleSecondKey)
          }, 2000)

          return true
        }
        return false
      },
    }

    // History shortcuts (Cmd/Ctrl+Z, Cmd/Ctrl+Y) - DISABLED
    // const historyHandler: KeyboardHandler = {
    //   id: "history-shortcuts",
    //   shortcuts: ["Cmd+z", "Ctrl+z", "Cmd+y", "Ctrl+y", "Cmd+Shift+z", "Ctrl+Shift+z"],
    //   context: {
    //     excludeDialogs: false, // Should work even with dialogs open
    //     requiresNoTyping: true,
    //     priority: 30, // Higher priority than most other shortcuts
    //   },
    //   handler: (event) => {
    //     const { key, metaKey, ctrlKey } = event
    //     const modifier = metaKey || ctrlKey

    //     if (modifier && key === "z") {
    //       // Pass the event to the history atom to handle undo/redo logic
    //       if (event instanceof KeyboardEvent) {
    //         handleHistoryShortcut(event)
    //       }
    //       return true
    //     }

    //     if (modifier && key === "y") {
    //       // Pass the event to the history atom to handle redo logic
    //       if (event instanceof KeyboardEvent) {
    //         handleHistoryShortcut(event)
    //       }
    //       return true
    //     }

    //     return false
    //   },
    // }

    // Task panel shortcuts (when task panel is open)
    const taskPanelHandler: KeyboardHandler = {
      id: "task-panel-shortcuts",
      shortcuts: ["Escape", " ", "Cmd+c", "Ctrl+c"],
      context: {
        requiresDialog: "task-panel", // Only when task panel is open
        requiresTask: true,
        requiresNoTyping: true,
        priority: 30, // Higher than global shortcuts
      },
      handler: (event, context) => {
        if (!context.selectedTask || !context.showTaskPanel) return false

        switch (event.key) {
          case "Escape":
            closeTaskPanel()
            return true
          case " ":
            updateTask({
              updateRequest: {
                id: context.selectedTask.id,
                completed: !context.selectedTask.completed,
              },
            })
            return true
          case "c":
            if (event.ctrlKey || event.metaKey) {
              // Toggle comments - would need to implement this functionality
              console.log("Toggle comments - TODO: implement")
              return true
            }
            break
        }
        return false
      },
    }

    // Page header search escape shortcut - REMOVED

    registerHandler(globalHandler)
    registerHandler(taskFocusHandler)
    registerHandler(navigationHandler)
    // registerHandler(historyHandler) // DISABLED
    registerHandler(taskPanelHandler)
    // registerHandler(pageHeaderHandler) // REMOVED

    return () => {
      unregisterHandler("global-shortcuts")
      unregisterHandler("task-focus-shortcuts")
      unregisterHandler("navigation-sequences")
      // unregisterHandler("history-shortcuts") // DISABLED
      // unregisterHandler("page-header-shortcuts") // REMOVED
      unregisterHandler("task-panel-shortcuts")
    }
  }, [
    registerHandler,
    unregisterHandler,
    openQuickAddAction,
    openSearch,
    toggleTheme,
    handleHistoryShortcut,
    closeTaskPanel,
    updateTask,
  ])

  const handleVoiceCommand = async (command: VoiceCommand) => {
    switch (command.action) {
      case "create_task":
        openQuickAddAction()
        break
      case "complete_task":
        if (selectedTask) {
          toggleTask(selectedTask.id)
        }
        break
      case "search_tasks":
        openSearch()
        break
      case "show_stats":
        // Navigate to analytics would need router here
        break
    }
  }

  // Skip rendering layout for the home page redirect
  if (pathname === "/") {
    return <>{children}</>
  }

  return (
    // DISABLED - Mobile gesture support temporarily removed
    // <GestureHandler
    //   config={gestureConfig}
    //   onGesture={handleGesture}
    //   onUpdateConfig={setGestureConfig}
    // >
    <div data-testid="main-layout-wrapper" className="w-full h-full">
      <SidebarProvider
        style={
          // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- CSS custom properties require type assertion
          {
            "--sidebar-width": "20rem",
            "--sidebar-width-mobile": "16rem",
          } as React.CSSProperties
        }
        defaultOpen={!isMobile}
      >
        <SidebarKeyboardHandler />
        <Sidebar variant={isMobile ? "floating" : "sidebar"} collapsible="offcanvas">
          <SidebarHeader className="flex items-center justify-center p-4 py-8">
            <TaskTroveLogo />
          </SidebarHeader>
          <SidebarContent className="p-4">
            <SidebarNav />
          </SidebarContent>
          <AppSidebarFooter />
        </Sidebar>
        <SidebarInset className="overflow-auto">
          <div className="flex h-screen flex-col">
            <PageHeader onAdvancedSearch={openSearch} />

            <div className="flex-1 overflow-y-auto">
              <RouteContent onTaskClick={toggleTaskPanel} onVoiceCommand={handleVoiceCommand} />
            </div>

            <PageFooter />
          </div>
        </SidebarInset>

        {/* Dialogs - Zero Props Pattern */}
        <QuickAddDialog />
        {/* <PomodoroDialog /> */}
        <ProjectDialog />
        <LabelDialog />
        <SectionDialog />
        <SearchDialog />
        <SettingsDialog />
        <UserProfileDialog />
      </SidebarProvider>
      {/* @ts-expect-error - web component */}
      <pwa-install manifest-url="/manifest.webmanifest" use-local-storage="true">
        {/* @ts-expect-error - web component */}
      </pwa-install>
    </div>
    // </GestureHandler>
  )
}
