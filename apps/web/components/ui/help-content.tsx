import React from "react"
import { CheckCircle, ArrowRight, Star, Info } from "lucide-react"
import { cn } from "@/lib/utils"

interface HelpSectionProps {
  children: React.ReactNode
  className?: string
}

export function HelpSection({ children, className }: HelpSectionProps) {
  return <div className={cn("space-y-3", className)}>{children}</div>
}

interface HelpDescriptionProps {
  children: React.ReactNode
  className?: string
}

export function HelpDescription({ children, className }: HelpDescriptionProps) {
  return <p className={cn("text-foreground font-medium", className)}>{children}</p>
}

interface HelpListProps {
  items: string[]
  variant?: "default" | "steps" | "tips"
  className?: string
}

export function HelpList({ items, variant = "default", className }: HelpListProps) {
  const getIcon = () => {
    switch (variant) {
      case "steps":
        return <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0 mt-0.5" />
      case "tips":
        return <Star className="h-3 w-3 text-muted-foreground flex-shrink-0 mt-0.5" />
      default:
        return <CheckCircle className="h-3 w-3 text-muted-foreground flex-shrink-0 mt-0.5" />
    }
  }

  return (
    <ul className={cn("space-y-2", className)}>
      {items.map((item, index) => (
        <li key={index} className="flex gap-2">
          {getIcon()}
          <span className="text-muted-foreground text-sm leading-relaxed">{item}</span>
        </li>
      ))}
    </ul>
  )
}

interface HelpTipProps {
  children: React.ReactNode
  variant?: "info" | "tip" | "warning"
  className?: string
}

export function HelpTip({ children, variant = "info", className }: HelpTipProps) {
  const getStyles = () => {
    switch (variant) {
      case "tip":
        return {
          container: "bg-accent border",
          icon: "text-muted-foreground",
          text: "text-foreground",
        }
      case "warning":
        return {
          container: "bg-destructive/10 border-destructive/20",
          icon: "text-destructive",
          text: "text-destructive",
        }
      default:
        return {
          container: "bg-accent border",
          icon: "text-muted-foreground",
          text: "text-foreground",
        }
    }
  }

  const styles = getStyles()

  return (
    <div className={cn("flex gap-2 p-3 rounded-md", styles.container, className)}>
      <Info className={cn("h-4 w-4 flex-shrink-0 mt-0.5", styles.icon)} />
      <div className={cn("text-sm", styles.text)}>{children}</div>
    </div>
  )
}
