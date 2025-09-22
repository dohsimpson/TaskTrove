import React, { useState } from "react"
import { cn } from "@/lib/utils"
import { useTheme } from "next-themes"

interface FlickerTextProps {
  children: React.ReactNode
  className?: string
  flickerDuration?: string
  disableFlickerInLightMode?: boolean
}

export function FlickerText({ children, className, flickerDuration = "0.8s" }: FlickerTextProps) {
  const [isHovered, setIsHovered] = useState(false)
  const { systemTheme, theme } = useTheme()

  const flickerKeyframes = `
    @keyframes tasktrove-flicker-unique {
      0% { 
        opacity: 0.7; 
        filter: brightness(0.7) drop-shadow(0 0 2px hsl(var(--primary) / 0.3)); 
      }
      10% { 
        opacity: 0.8; 
        filter: brightness(0.8) drop-shadow(0 0 4px hsl(var(--primary) / 0.4)); 
      }
      20% { 
        opacity: 1; 
        filter: brightness(1.2) drop-shadow(0 0 12px hsl(var(--primary) / 1)); 
      }
      30% { 
        opacity: 0.7; 
        filter: brightness(0.7) drop-shadow(0 0 2px hsl(var(--primary) / 0.3)); 
      }
      40% { 
        opacity: 1; 
        filter: brightness(1) drop-shadow(0 0 8px hsl(var(--primary) / 0.8)); 
      }
      50% { 
        opacity: 0.9; 
        filter: brightness(0.9) drop-shadow(0 0 6px hsl(var(--primary) / 0.6)); 
      }
      60% { 
        opacity: 1; 
        filter: brightness(1.1) drop-shadow(0 0 10px hsl(var(--primary) / 0.9)); 
      }
      70% { 
        opacity: 0.85; 
        filter: brightness(0.85) drop-shadow(0 0 5px hsl(var(--primary) / 0.5)); 
      }
      80% { 
        opacity: 1; 
        filter: brightness(1) drop-shadow(0 0 8px hsl(var(--primary) / 0.8)); 
      }
      90% { 
        opacity: 1; 
        filter: brightness(1.1) drop-shadow(0 0 10px hsl(var(--primary) / 0.9)); 
      }
      100% { 
        opacity: 1; 
        filter: brightness(1.1) drop-shadow(0 0 10px hsl(var(--primary) / 0.9)); 
      }
    }
  `

  const shouldShowGlow =
    isHovered && (theme === "dark" || (theme === "system" && systemTheme === "dark"))

  const baseStyles = cn(
    className,
    // Persistent glow when hovered (in dark mode or when light mode flicker is enabled)
    shouldShowGlow && "opacity-100 brightness-110 drop-shadow-[0_0_10px_hsl(var(--primary)/0.9)]",
  )

  const handleMouseEnter = () => setIsHovered(true)
  const handleMouseLeave = () => setIsHovered(false)

  const inlineStyles = shouldShowGlow
    ? {
        animation: `tasktrove-flicker-unique ${flickerDuration} ease-in-out 1`,
      }
    : {}

  return (
    <>
      <style>{flickerKeyframes}</style>
      <span
        className={baseStyles}
        style={inlineStyles}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {children}
      </span>
    </>
  )
}
