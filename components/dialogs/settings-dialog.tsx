"use client"

import React, { useState } from "react"
import { useAtomValue, useSetAtom } from "jotai"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { Link, X } from "lucide-react"
// Future icons (not used yet):
// import { Palette, Settings, Bell, Database, Target, Code } from "lucide-react"
import { showSettingsDialogAtom, closeSettingsDialogAtom } from "@/lib/atoms/ui/dialogs"
import { IntegrationsForm } from "./settings-forms/integrations-form"
// Future form imports (not used yet):
// import { AppearanceForm } from "./settings-forms/appearance-form"
// import { BehaviorForm } from "./settings-forms/behavior-form"
// import { NotificationsForm } from "./settings-forms/notifications-form"
// import { DataForm } from "./settings-forms/data-form"
// import { ProductivityForm } from "./settings-forms/productivity-form"
// import { ApiForm } from "./settings-forms/api-form"

// Settings category configuration
interface SettingsCategory {
  id: string
  title: string
  icon: React.ComponentType<{ className?: string }>
  description: string
}

// Only show integrations for now - other categories will be added later
const settingsCategories: SettingsCategory[] = [
  {
    id: "integrations",
    title: "Import & Export",
    icon: Link,
    description: "Import tasks from other providers and export your data",
  },
  // Future settings categories (not implemented yet):
  // {
  //   id: "appearance",
  //   title: "Appearance",
  //   icon: Palette,
  //   description: "Themes, colors, and visual preferences",
  // },
  // {
  //   id: "behavior",
  //   title: "Behavior",
  //   icon: Settings,
  //   description: "App behavior and default preferences",
  // },
  // {
  //   id: "notifications",
  //   title: "Notifications",
  //   icon: Bell,
  //   description: "Notification settings and sound preferences",
  // },
  // {
  //   id: "data",
  //   title: "Data & Sync",
  //   icon: Database,
  //   description: "Backup, export, and synchronization settings",
  // },
  // {
  //   id: "productivity",
  //   title: "Productivity",
  //   icon: Target,
  //   description: "Pomodoro, goals, and analytics settings",
  // },
  // {
  //   id: "api",
  //   title: "API & Developers",
  //   icon: Code,
  //   description: "API keys, webhooks, and developer tools",
  // },
]

export function SettingsDialog() {
  const open = useAtomValue(showSettingsDialogAtom)
  const closeDialog = useSetAtom(closeSettingsDialogAtom)
  const [activeCategory, setActiveCategory] = useState("integrations")

  // Get active category info
  const activeCategoryInfo = settingsCategories.find((cat) => cat.id === activeCategory)

  const renderCategoryContent = () => {
    switch (activeCategory) {
      case "integrations":
        return <IntegrationsForm />
      // Future forms (not implemented yet):
      // case "appearance":
      //   return <AppearanceForm />
      // case "behavior":
      //   return <BehaviorForm />
      // case "notifications":
      //   return <NotificationsForm />
      // case "data":
      //   return <DataForm />
      // case "productivity":
      //   return <ProductivityForm />
      // case "api":
      //   return <ApiForm />
      default:
        return null
    }
  }

  return (
    <Dialog open={open} onOpenChange={closeDialog}>
      <DialogTitle className="sr-only">Settings</DialogTitle>
      <DialogContent
        className="!max-w-[90vw] h-[85vh] w-[90vw] p-0 sm:!max-w-[90vw] overflow-hidden"
        showCloseButton={false}
      >
        <SidebarProvider className="w-full min-h-0 overflow-auto">
          <div className="flex h-full w-full">
            {/* Settings Sidebar */}
            <Sidebar className="w-64 border-r">
              <SidebarContent>
                <div className="p-4">
                  <h2 className="text-lg font-semibold">Settings</h2>
                  <p className="text-sm text-muted-foreground">
                    Configure your TaskTrove experience
                  </p>
                </div>
                <Separator />
                <SidebarGroup>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {settingsCategories.map((category) => (
                        <SidebarMenuItem key={category.id}>
                          <SidebarMenuButton
                            isActive={activeCategory === category.id}
                            onClick={() => setActiveCategory(category.id)}
                            className="w-full justify-start py-3 h-auto cursor-pointer"
                          >
                            <category.icon className="w-4 h-4" />
                            <div className="flex flex-col items-start">
                              <span className="font-medium">{category.title}</span>
                              <span className="text-xs text-muted-foreground truncate max-w-[180px]">
                                {category.description}
                              </span>
                            </div>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              </SidebarContent>
            </Sidebar>

            {/* Main Content */}
            <main className="flex-1 flex flex-col">
              {/* Header */}
              <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
                <div className="flex items-center gap-2 flex-1">
                  <h1 className="text-xl font-semibold">{activeCategoryInfo?.title}</h1>
                  <span className="text-sm text-muted-foreground">·</span>
                  <span className="text-sm text-muted-foreground">
                    {activeCategoryInfo?.description}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => closeDialog()}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                  <span className="sr-only">Close settings</span>
                </Button>
              </header>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6">{renderCategoryContent()}</div>
            </main>
          </div>
        </SidebarProvider>
      </DialogContent>
    </Dialog>
  )
}
