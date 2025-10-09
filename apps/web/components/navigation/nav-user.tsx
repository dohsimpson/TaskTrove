"use client"

import React, { useState, useEffect } from "react"
import {
  User,
  Info,
  Bug,
  ChevronsUpDown,
  LogOut,
  Settings,
  Keyboard,
  Download,
  CheckCircle2,
} from "lucide-react"
import { SiGithub, SiDiscord } from "@icons-pack/react-simple-icons"
import { signOut } from "next-auth/react"
import { toast } from "sonner"
import { useAtomValue, useSetAtom } from "jotai"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { AboutModal } from "@/components/dialogs/about-modal"
import { useTranslation } from "@tasktrove/i18n"
import { openSettingsDialogAtom, openUserProfileDialogAtom } from "@/lib/atoms/ui/dialogs"
import { userAtom } from "@/lib/atoms"
import { ComingSoonWrapper } from "@/components/ui/coming-soon-wrapper"
import { LogoutConfirmDialog } from "@/components/dialogs/logout-confirm-dialog"
import { getAvatarApiUrl } from "@tasktrove/utils"
import { showPWAInstallPrompt, isPWA } from "@tasktrove/dom-utils"

interface ContextMenuItem {
  icon: React.ComponentType<{ className?: string }>
  label: string
  onClick?: () => void
  comingSoon?: boolean
}

// No longer need NavUserProps - getting user from userAtom

export function NavUser() {
  // Translation setup
  const { t } = useTranslation("navigation")

  const { isMobile } = useSidebar()
  const [aboutModalOpen, setAboutModalOpen] = useState(false)
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false)
  const [isRunningAsPWA, setIsRunningAsPWA] = useState(false)
  const openSettingsDialog = useSetAtom(openSettingsDialogAtom)
  const openUserProfileDialog = useSetAtom(openUserProfileDialogAtom)

  // Get user data from atom
  const user = useAtomValue(userAtom)

  // Check if running as PWA
  useEffect(() => {
    setIsRunningAsPWA(isPWA())
  }, [])

  const handleSignOut = () => {
    setLogoutDialogOpen(true)
  }

  const handleConfirmLogout = async () => {
    await signOut({ redirect: false }) // disable redirect to avoid redirecting to wrong URL behind reverse proxy: https://github.com/nextauthjs/next-auth/issues/10928
    toast.success("Signed out")
    window.location.reload()
  }

  const contextMenuItems: ContextMenuItem[] = [
    {
      icon: Bug,
      label: t("userMenu.reportBug", "Report Bug"),
      onClick: () => window.open("https://github.com/dohsimpson/TaskTrove/discussions", "_blank"),
    },
    {
      icon: SiGithub,
      label: t("userMenu.github", "Github"),
      onClick: () => window.open("https://github.com/dohsimpson/TaskTrove", "_blank"),
    },
    {
      icon: SiDiscord,
      label: t("userMenu.community", "Community"),
      onClick: () => window.open("https://discord.gg/d8TCEtv8", "_blank"),
    },
    {
      icon: Keyboard,
      label: t("userMenu.shortcuts", "Shortcuts"),
      comingSoon: true,
    },
    {
      icon: Download,
      label: t("userMenu.installApp", "Install App"),
      onClick: showPWAInstallPrompt,
    },
    {
      icon: Info,
      label: t("userMenu.about", "About"),
      onClick: () => setAboutModalOpen(true),
    },
  ]

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              >
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={getAvatarApiUrl(user.avatar)} alt={user.username} />
                  <AvatarFallback className="rounded-lg">
                    <User className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{user.username}</span>
                </div>
                <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
              side={isMobile ? "bottom" : "right"}
              align="end"
              sideOffset={4}
            >
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                  <div
                    className="flex items-center gap-2 flex-1 cursor-pointer hover:bg-accent rounded p-1 transition-colors"
                    onClick={openUserProfileDialog}
                    title="Edit Profile"
                  >
                    <Avatar className="h-8 w-8 rounded-lg">
                      <AvatarImage src={getAvatarApiUrl(user.avatar)} alt={user.username} />
                      <AvatarFallback className="rounded-lg">
                        <User className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid text-left text-sm leading-tight">
                      <span className="truncate font-semibold">{user.username}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={openSettingsDialog}
                      className="opacity-60 hover:opacity-100 transition-opacity rounded hover:bg-accent p-2"
                      title={t("userMenu.settings", "Settings")}
                    >
                      <Settings className="h-4 w-4" />
                    </button>
                    <button
                      onClick={handleSignOut}
                      className="opacity-60 hover:opacity-100 transition-opacity rounded hover:bg-accent p-2"
                      title={t("userMenu.signOut", "Sign out")}
                    >
                      <LogOut className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem
                  onClick={() => window.open("https://tasktrove.io/#pricing", "_blank")}
                  className="px-1 cursor-pointer"
                >
                  {/* material design icon "Stars": https://github.com/google/material-design-icons */}
                  <svg
                    className="mr-1 h-6 w-6 text-yellow-500 font-bold fill-current shrink-0 min-h-[24px] min-w-[24px]"
                    xmlns="http://www.w3.org/2000/svg"
                    height="24px"
                    viewBox="0 -960 960 960"
                    width="24px"
                    fill="#1f1f1f"
                  >
                    <path d="m320-240 160-122 160 122-60-198 160-114H544l-64-208-64 208H220l160 114-60 198ZM480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320Z" />
                  </svg>
                  <span className="font-bold">{t("userMenu.upgradeToPro", "Upgrade to Pro")}</span>
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                {contextMenuItems.map((item, index) => {
                  const isInstallAppItem = item.icon === Download
                  return (
                    <DropdownMenuItem
                      key={index}
                      onClick={item.comingSoon ? undefined : item.onClick}
                      className="cursor-pointer"
                    >
                      {item.comingSoon ? (
                        <ComingSoonWrapper
                          disabled={true}
                          featureName={item.label}
                          className="flex items-center w-full"
                        >
                          <item.icon className="mr-4 h-4 w-4" />
                          {item.label}
                        </ComingSoonWrapper>
                      ) : (
                        <>
                          <item.icon className="mr-2 h-4 w-4" />
                          {item.label}
                          {isInstallAppItem && isRunningAsPWA && (
                            <CheckCircle2 className="ml-auto h-4 w-4 text-green-500" />
                          )}
                        </>
                      )}
                    </DropdownMenuItem>
                  )
                })}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>

      <AboutModal open={aboutModalOpen} onOpenChange={setAboutModalOpen} />
      <LogoutConfirmDialog
        open={logoutDialogOpen}
        onOpenChange={setLogoutDialogOpen}
        onConfirm={handleConfirmLogout}
      />
    </>
  )
}
