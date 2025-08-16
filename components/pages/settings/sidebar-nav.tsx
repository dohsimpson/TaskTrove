"use client"

import { cn } from "@/lib/utils"
import { Button, buttonVariants } from "@/components/ui/button"

interface SidebarNavProps extends React.HTMLAttributes<HTMLElement> {
  items: {
    id: string
    title: string
  }[]
  activeSection: string
  onSectionChange: (section: string) => void
}

export function SidebarNav({
  className,
  items,
  activeSection,
  onSectionChange,
  ...props
}: SidebarNavProps) {
  return (
    <nav
      className={cn("flex space-x-2 lg:flex-col lg:space-x-0 lg:space-y-1", className)}
      {...props}
    >
      {items.map((item) => (
        <Button
          key={item.id}
          variant="ghost"
          className={cn(
            buttonVariants({ variant: "ghost" }),
            activeSection === item.id
              ? "bg-muted hover:bg-muted"
              : "hover:bg-transparent hover:underline",
            "justify-start",
          )}
          onClick={() => onSectionChange(item.id)}
        >
          {item.title}
        </Button>
      ))}
    </nav>
  )
}
