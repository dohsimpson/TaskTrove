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
        filter: brightness(0.7) drop-shadow(0px 0px 2px color-mix(in srgb, var(--primary) 30%, transparent));
      }
      10% {
        opacity: 0.8;
        filter: brightness(0.8) drop-shadow(0px 0px 4px color-mix(in srgb, var(--primary) 40%, transparent));
      }
      20% {
        opacity: 1;
        filter: brightness(1.2) drop-shadow(0px 0px 12px color-mix(in srgb, var(--primary) 100%, transparent));
      }
      30% {
        opacity: 0.7;
        filter: brightness(0.7) drop-shadow(0px 0px 2px color-mix(in srgb, var(--primary) 30%, transparent));
      }
      40% {
        opacity: 1;
        filter: brightness(1) drop-shadow(0px 0px 8px color-mix(in srgb, var(--primary) 80%, transparent));
      }
      50% {
        opacity: 0.9;
        filter: brightness(0.9) drop-shadow(0px 0px 6px color-mix(in srgb, var(--primary) 60%, transparent));
      }
      60% {
        opacity: 1;
        filter: brightness(1.1) drop-shadow(0px 0px 10px color-mix(in srgb, var(--primary) 90%, transparent));
      }
      70% {
        opacity: 0.85;
        filter: brightness(0.85) drop-shadow(0px 0px 5px color-mix(in srgb, var(--primary) 50%, transparent));
      }
      80% {
        opacity: 1;
        filter: brightness(1) drop-shadow(0px 0px 8px color-mix(in srgb, var(--primary) 80%, transparent));
      }
      90% {
        opacity: 1;
        filter: brightness(1.1) drop-shadow(0px 0px 10px color-mix(in srgb, var(--primary) 90%, transparent));
      }
      100% {
        opacity: 1;
        filter: brightness(1.1) drop-shadow(0px 0px 10px color-mix(in srgb, var(--primary) 90%, transparent));
      }
    }
  `

  const shouldShowGlow =
    isHovered && (theme === "dark" || (theme === "system" && systemTheme === "dark"))

  const baseStyles = cn(
    className,
    // Add transition for smooth hover effects
    "transition-all duration-200",
  )

  const handleMouseEnter = () => setIsHovered(true)
  const handleMouseLeave = () => setIsHovered(false)

  const inlineStyles = shouldShowGlow
    ? {
        animation: `tasktrove-flicker-unique ${flickerDuration} ease-in-out 1`,
        filter:
          "brightness(1.1) drop-shadow(0px 0px 10px color-mix(in srgb, var(--primary) 90%, transparent))",
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
