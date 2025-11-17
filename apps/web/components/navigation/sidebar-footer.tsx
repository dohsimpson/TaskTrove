"use client"

import React from "react"
import { Download } from "lucide-react"
import { SidebarFooter, SidebarMenu, SidebarMenuItem } from "@/components/ui/custom/sidebar"
import { useUpdateChecker } from "@/hooks/use-update-checker"
import { useTranslation } from "@tasktrove/i18n"
import { NavUser } from "./nav-user"

export function AppSidebarFooter() {
  // Translation setup
  const { t } = useTranslation("navigation")

  const { hasUpdate, latestVersion, releaseUrl } = useUpdateChecker()

  return (
    <SidebarFooter className="bg-background border-t gap-0">
      {/* Updates Available */}
      {hasUpdate && (
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center justify-center w-full px-2">
              <button
                onClick={() => releaseUrl && window.open(releaseUrl, "_blank")}
                className="flex items-center gap-1 animate-pulse hover:opacity-80 transition-opacity cursor-pointer"
                title={t("footer.updateTo", "Update to {{version}}", { version: latestVersion })}
              >
                <Download className="h-3 w-3 text-orange-500" />
                <span className="text-xs text-orange-500 font-medium hover:underline">
                  {t("footer.newVersion", "new version: {{version}}", { version: latestVersion })}
                </span>
              </button>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      )}
      {/* NavUser Component with integrated context menu */}
      <NavUser />
    </SidebarFooter>
  )
}
