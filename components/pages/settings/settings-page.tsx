"use client"

import { useState } from "react"
import { Separator } from "@/components/ui/separator"
import { SidebarNav } from "@/components/pages/settings/sidebar-nav"
import { ProfileForm } from "@/components/pages/settings/profile-form"
import { NotificationsForm } from "@/components/pages/settings/notifications-form"
import { AppearanceForm } from "@/components/pages/settings/appearance-form"

export function SettingsPage() {
  const [activeSection, setActiveSection] = useState("profile")

  const sidebarNavItems = [
    {
      title: "Profile",
      id: "profile",
    },
    {
      title: "Notifications",
      id: "notifications",
    },
    {
      title: "Appearance",
      id: "appearance",
    },
  ]

  const renderSection = () => {
    switch (activeSection) {
      case "profile":
        return <ProfileForm />
      case "notifications":
        return <NotificationsForm />
      case "appearance":
        return <AppearanceForm />
      default:
        return <ProfileForm />
    }
  }

  const getSectionTitle = () => {
    switch (activeSection) {
      case "profile":
        return "Profile"
      case "notifications":
        return "Notifications"
      case "appearance":
        return "Appearance"
      default:
        return "Profile"
    }
  }

  const getSectionDescription = () => {
    switch (activeSection) {
      case "profile":
        return "This is how others will see you on the site."
      case "notifications":
        return "Configure how you receive notifications."
      case "appearance":
        return "Customize the appearance of the app. Automatically switch between day and night themes."
      default:
        return "This is how others will see you on the site."
    }
  }

  return (
    <div className="hidden space-y-6 p-10 pb-16 md:block">
      <div className="space-y-0.5">
        <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground">
          Manage your account settings and set e-mail preferences.
        </p>
      </div>
      <Separator className="my-6" />
      <div className="flex flex-col space-y-8 lg:flex-row lg:space-x-12 lg:space-y-0">
        <aside className="-mx-4 lg:w-1/5">
          <SidebarNav
            items={sidebarNavItems}
            activeSection={activeSection}
            onSectionChange={setActiveSection}
          />
        </aside>
        <div className="flex-1 lg:max-w-2xl">
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium">{getSectionTitle()}</h3>
              <p className="text-sm text-muted-foreground">{getSectionDescription()}</p>
            </div>
            {renderSection()}
          </div>
        </div>
      </div>
    </div>
  )
}
