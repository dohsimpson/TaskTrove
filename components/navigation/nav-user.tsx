"use client"

import React, { useState } from "react"
import { Sparkles, User, Info, Bug, ChevronsUpDown } from "lucide-react"
import { SiGithub, SiDiscord } from "@icons-pack/react-simple-icons"

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

interface UserData {
  name: string
  email?: string
  avatar?: string
}

interface NavUserProps {
  user: UserData
}

export function NavUser({ user }: NavUserProps) {
  const { isMobile } = useSidebar()
  const [aboutModalOpen, setAboutModalOpen] = useState(false)

  const contextMenuItems = [
    {
      icon: SiGithub,
      label: "Github",
      onClick: () => window.open("https://github.com/dohsimpson/TaskTrove", "_blank"),
    },
    {
      icon: SiDiscord,
      label: "Community",
      onClick: () => window.open("https://discord.gg/d8TCEtv8", "_blank"),
    },
    {
      icon: Bug,
      label: "Report Bug",
      onClick: () => window.open("https://github.com/dohsimpson/TaskTrove/discussions", "_blank"),
    },
    {
      icon: Info,
      label: "About",
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
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback className="rounded-lg">
                    <User className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{user.name}</span>
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
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarImage src={user.avatar} alt={user.name} />
                    <AvatarFallback className="rounded-lg">
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{user.name}</span>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem
                  onClick={() => window.open("https://tasktrove.io/#pricing", "_blank")}
                >
                  <Sparkles />
                  Upgrade to Pro
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                {contextMenuItems.map((item, index) => (
                  <DropdownMenuItem key={index} onClick={item.onClick}>
                    <item.icon className="mr-2 h-4 w-4" />
                    {item.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>

      <AboutModal open={aboutModalOpen} onOpenChange={setAboutModalOpen} />
    </>
  )
}
