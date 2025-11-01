"use client"

import React, { useState } from "react"
import { useAtomValue, useSetAtom } from "jotai"
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Database, X, Bell, Settings, Menu, Palette } from "lucide-react"
// Future icons (not used yet):
// import { Link, Target, Code } from "lucide-react"
import { showSettingsDialogAtom, closeSettingsDialogAtom } from "@tasktrove/atoms/ui/dialogs"
import { useTranslation } from "@tasktrove/i18n"
import { DataForm } from "./settings-forms/data-form"
import { NotificationsForm } from "./settings-forms/notifications-form"
import { GeneralForm } from "./settings-forms/general-form"
import { AppearanceForm } from "./settings-forms/appearance-form"
// Future form imports (not used yet):
// import { ProductivityForm } from "./settings-forms/productivity-form"
// import { ApiForm } from "./settings-forms/api-form"

// Settings category configuration
interface SettingsCategory {
  id: string
  title: string
  icon: React.ComponentType<{ className?: string }>
  description: string
}

function SettingsContent() {
  const { t } = useTranslation("dialogs")
  const closeDialog = useSetAtom(closeSettingsDialogAtom)
  const [activeCategory, setActiveCategory] = useState("general")
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)

  // Settings categories with translations
  const settingsCategories: SettingsCategory[] = [
    {
      id: "general",
      title: t("settings.categories.general.title", "General"),
      icon: Settings,
      description: t("settings.categories.general.description", "Default page, basic preferences"),
    },
    {
      id: "notifications",
      title: t("settings.categories.notifications.title", "Notifications"),
      icon: Bell,
      description: t("settings.categories.notifications.description", "Notification settings"),
    },
    {
      id: "data",
      title: t("settings.categories.data.title", "Data & Storage"),
      icon: Database,
      description: t("settings.categories.data.description", "Import/export, backups"),
    },
    {
      id: "appearance",
      title: t("settings.categories.appearance.title", "Appearance"),
      icon: Palette,
      description: t(
        "settings.categories.appearance.description",
        "Themes, colors, and visual preferences",
      ),
    },
    // Future settings categories (not implemented yet):
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
    // {
    //   id: "behavior",
    //   title: "Behavior",
    //   icon: Settings,
    //   description: "App behavior and default preferences",
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

  // Get active category info
  const activeCategoryInfo = settingsCategories.find((cat) => cat.id === activeCategory)

  const renderCategoryContent = () => {
    switch (activeCategory) {
      case "general":
        return <GeneralForm />
      case "data":
        return <DataForm />
      case "notifications":
        return <NotificationsForm />
      case "appearance":
        return <AppearanceForm />
      // Future forms (not implemented yet):
      // case "productivity":
      //   return <ProductivityForm />
      // case "api":
      //   return <ApiForm />
      default:
        return null
    }
  }

  return (
    <div className="flex h-full w-full relative overflow-y-auto">
      {/* Desktop Sidebar - hidden on mobile */}
      <aside className="hidden md:flex w-64 border-r flex-col">
        <div className="p-4">
          <h2 className="text-lg font-semibold">{t("settings.title", "Settings")}</h2>
        </div>
        <Separator />
        <div className="p-4">
          <div className="space-y-2">
            {settingsCategories.map((category) => (
              <Button
                key={category.id}
                variant={activeCategory === category.id ? "default" : "ghost"}
                onClick={() => setActiveCategory(category.id)}
                className="w-full justify-start py-3 h-auto"
              >
                <category.icon className="size-4 mr-3" />
                <span className="font-medium">{category.title}</span>
              </Button>
            ))}
          </div>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay - contained within dialog */}
      {mobileDrawerOpen && (
        <>
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/20 z-40 md:hidden"
            onClick={() => setMobileDrawerOpen(false)}
          />
          {/* Mobile Sidebar */}
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-background border-r z-50 flex flex-col md:hidden">
            {/* Mobile Close Button */}
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">{t("settings.title", "Settings")}</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMobileDrawerOpen(false)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
                <span className="sr-only">
                  {t("settings.accessibility.closeMenu", "Close menu")}
                </span>
              </Button>
            </div>
            {/* Settings Categories */}
            <div className="p-4">
              <div className="space-y-2">
                {settingsCategories.map((category) => (
                  <Button
                    key={category.id}
                    variant={activeCategory === category.id ? "default" : "ghost"}
                    onClick={() => {
                      setActiveCategory(category.id)
                      setMobileDrawerOpen(false) // Close mobile drawer after selection
                    }}
                    className="w-full justify-start py-3 h-auto"
                  >
                    <category.icon className="size-4 mr-3" />
                    <span className="font-medium">{category.title}</span>
                  </Button>
                ))}
              </div>
            </div>
          </aside>
        </>
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {/* Header */}
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          {/* Mobile menu button - only visible on mobile */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMobileDrawerOpen(!mobileDrawerOpen)}
            className="h-8 w-8 p-0 mr-2 md:hidden"
          >
            <Menu className="h-4 w-4" />
            <span className="sr-only">
              {t("settings.accessibility.openMenu", "Open settings menu")}
            </span>
          </Button>

          <div className="flex items-center gap-2 flex-1">
            <h1 className="text-xl font-semibold">{activeCategoryInfo?.title}</h1>
            <span className="text-sm text-muted-foreground">·</span>
            <span className="text-sm text-muted-foreground">{activeCategoryInfo?.description}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => closeDialog()} className="h-8 w-8 p-0">
            <X className="h-4 w-4" />
            <span className="sr-only">
              {t("settings.accessibility.closeSettings", "Close settings")}
            </span>
          </Button>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">{renderCategoryContent()}</div>
      </main>
    </div>
  )
}

export function SettingsDialog() {
  const { t } = useTranslation("dialogs")
  const open = useAtomValue(showSettingsDialogAtom)
  const closeDialog = useSetAtom(closeSettingsDialogAtom)

  return (
    <Dialog open={open} onOpenChange={closeDialog}>
      <DialogTitle className="sr-only">{t("settings.title", "Settings")}</DialogTitle>
      <DialogDescription className="sr-only">
        {t("settings.description", "Configure TaskTrove application settings and preferences")}
      </DialogDescription>
      <DialogContent
        className="!max-w-[95vw] h-[90vh] w-[95vw] p-0 sm:!max-w-[90vw] sm:h-[85vh] sm:w-[90vw] overflow-hidden"
        showCloseButton={false}
      >
        <SettingsContent />
      </DialogContent>
    </Dialog>
  )
}
