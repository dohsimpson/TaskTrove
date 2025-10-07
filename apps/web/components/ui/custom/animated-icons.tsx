"use client"

import {
  Bell,
  Rocket,
  Sparkles,
  ChefHat,
  Timer,
  Gift,
  Hourglass,
  Calendar,
  Package,
  Lightbulb,
  Settings,
  Target,
  Check,
  Mail,
  Search,
  Plus,
} from "lucide-react"

interface AnimatedIconProps {
  size?: number
  className?: string
}

export function RocketIcon({ className = "text-primary" }: AnimatedIconProps) {
  return (
    <Rocket
      className={`h-6 w-6 ${className} animate-bounce`}
      style={{
        animation: "customBounce 2s ease-in-out infinite, pulse 3s ease-in-out infinite",
      }}
    />
  )
}

export function MultiSparklesIcon({ className = "text-primary" }: AnimatedIconProps) {
  return (
    <div className="relative h-12 w-12 flex items-center justify-center">
      <Sparkles
        className={`h-7 w-7 ${className} absolute animate-spin`}
        style={{ animationDuration: "3s" }}
      />
      <Sparkles
        className={`h-5 w-5 ${className}/70 absolute top-2 right-2 animate-pulse`}
        style={{ animationDelay: "0.5s" }}
      />
      <Sparkles
        className={`h-4 w-4 ${className}/50 absolute bottom-3 left-3 animate-pulse`}
        style={{ animationDelay: "1s" }}
      />
      <Sparkles
        className={`h-5 w-5 ${className}/80 absolute bottom-2 right-4 animate-pulse`}
        style={{ animationDelay: "1.5s" }}
      />
    </div>
  )
}

export function ChefHatIcon({ className = "text-primary" }: AnimatedIconProps) {
  return (
    <ChefHat
      className={`h-6 w-6 ${className} animate-bounce`}
      style={{
        animation: "customBounce 2s ease-in-out infinite",
        transformOrigin: "center bottom",
      }}
    />
  )
}

export function TimerIcon({ className = "text-primary" }: AnimatedIconProps) {
  return (
    <Timer className={`h-6 w-6 ${className} animate-spin`} style={{ animationDuration: "4s" }} />
  )
}

export function GiftIcon({ className = "text-primary" }: AnimatedIconProps) {
  return (
    <Gift
      className={`h-6 w-6 ${className}`}
      style={{ animation: "wiggle 1s ease-in-out infinite" }}
    />
  )
}

export function HourglassIcon({ className = "text-primary" }: AnimatedIconProps) {
  return (
    <Hourglass
      className={`h-6 w-6 ${className}`}
      style={{ animation: "flip 3s ease-in-out infinite" }}
    />
  )
}

export function CalendarIcon({ className = "text-primary" }: AnimatedIconProps) {
  return (
    <Calendar
      className={`h-6 w-6 ${className}`}
      style={{ animation: "pulse 2s ease-in-out infinite, scale 2s ease-in-out infinite" }}
    />
  )
}

export function PackageIcon({ className = "text-primary" }: AnimatedIconProps) {
  return (
    <Package
      className={`h-6 w-6 ${className}`}
      style={{ animation: "float 3s ease-in-out infinite" }}
    />
  )
}

export function LightbulbIcon({ className = "text-primary" }: AnimatedIconProps) {
  return (
    <Lightbulb
      className={`h-6 w-6 ${className}`}
      style={{ animation: "flicker 2s ease-in-out infinite" }}
    />
  )
}

export function GearIcon({ className = "text-primary" }: AnimatedIconProps) {
  return (
    <Settings
      className={`h-6 w-6 ${className} animate-spin`}
      style={{
        animationDuration: "3s",
        animationTimingFunction: "linear",
      }}
    />
  )
}

export function TargetIcon({ className = "text-primary" }: AnimatedIconProps) {
  return (
    <div className="relative h-12 w-12 flex items-center justify-center">
      <Target className={`h-6 w-6 ${className}`} />
      <div className="absolute inset-0 border-2 border-primary/30 animate-ping rounded-full"></div>
      <div
        className="absolute inset-1 border border-primary/20 animate-ping rounded-full"
        style={{ animationDelay: "0.5s" }}
      ></div>
    </div>
  )
}

export function CheckIcon({ className = "text-primary" }: AnimatedIconProps) {
  return (
    <Check
      className={`h-6 w-6 ${className}`}
      style={{ animation: "checkmark 2s ease-in-out infinite" }}
    />
  )
}

export function BellIcon({ className = "text-primary" }: AnimatedIconProps) {
  return (
    <Bell
      className={`h-6 w-6 ${className}`}
      style={{ animation: "ring 2s ease-in-out infinite" }}
    />
  )
}

export function MailIcon({ className = "text-primary" }: AnimatedIconProps) {
  return (
    <div className="flex items-center justify-center">
      <Mail
        className={`h-6 w-6 ${className}`}
        style={{ animation: "mailBounce 2s ease-in-out infinite" }}
      />
    </div>
  )
}

export function SearchIcon({ className = "text-primary" }: AnimatedIconProps) {
  return (
    <div className="relative h-12 w-12 flex items-center justify-center">
      <Search
        className={`h-6 w-6 ${className}`}
        style={{ animation: "searchScan 3s ease-in-out infinite" }}
      />
      <div
        className="absolute inset-0 border-2 border-primary/20 rounded-full animate-ping"
        style={{ animationDuration: "3s" }}
      ></div>
    </div>
  )
}

export function GenesisAddIcon({ className = "text-primary" }: AnimatedIconProps) {
  return (
    <div className="relative h-12 w-12 flex items-center justify-center overflow-visible">
      {/* Main Plus with morphing animation */}
      <Plus
        className={`h-6 w-6 ${className} z-20`}
        style={{ animation: "plusMorph 3s ease-in-out infinite" }}
      />

      {/* Magic sparkle burst particles */}
      <div
        className="absolute top-0 left-1/2 w-1 h-1 bg-gradient-to-r from-primary to-primary/60 rounded-full"
        style={{ animation: "sparkBurst1 3s ease-in-out infinite" }}
      ></div>
      <div
        className="absolute top-1 right-0 w-1.5 h-1.5 bg-gradient-to-r from-primary/80 to-primary/40 rounded-full"
        style={{ animation: "sparkBurst2 3s ease-in-out infinite" }}
      ></div>
      <div
        className="absolute bottom-0 left-1/2 w-0.5 h-0.5 bg-gradient-to-r from-primary to-primary/70 rounded-full"
        style={{ animation: "sparkBurst3 3s ease-in-out infinite" }}
      ></div>
      <div
        className="absolute top-1 left-0 w-1 h-1 bg-gradient-to-r from-primary/60 to-primary/30 rounded-full"
        style={{ animation: "sparkBurst4 3s ease-in-out infinite" }}
      ></div>
      <div
        className="absolute right-0 top-1/2 w-1.5 h-1.5 bg-gradient-to-r from-primary/90 to-primary/50 rounded-full"
        style={{ animation: "sparkBurst5 3s ease-in-out infinite" }}
      ></div>
      <div
        className="absolute left-0 top-1/2 w-1 h-1 bg-gradient-to-r from-primary/70 to-primary/40 rounded-full"
        style={{ animation: "sparkBurst6 3s ease-in-out infinite" }}
      ></div>

      {/* Pulsing core energy */}
      <div
        className="absolute inset-3 bg-primary/10 rounded-full z-0"
        style={{ animation: "coreEnergy 3s ease-in-out infinite" }}
      ></div>

      {/* Expanding shockwave */}
      <div
        className="absolute inset-0 border-2 border-primary/15 rounded-full"
        style={{ animation: "shockwave 3s ease-out infinite" }}
      ></div>
    </div>
  )
}

export function ComplexSparklesIcon({ className = "text-primary" }: AnimatedIconProps) {
  return (
    <div className="relative h-12 w-12 flex items-center justify-center overflow-hidden">
      <Sparkles className={`h-5 w-5 ${className} z-10`} />
      <div
        className="absolute top-0 left-0 w-1.5 h-1.5 bg-primary/60 rounded-full animate-ping"
        style={{ animationDelay: "0s" }}
      ></div>
      <div
        className="absolute top-1 right-1 w-1 h-1 bg-primary/40 rounded-full animate-ping"
        style={{ animationDelay: "0.7s" }}
      ></div>
      <div
        className="absolute bottom-1 left-1 w-0.5 h-0.5 bg-primary/50 rounded-full animate-ping"
        style={{ animationDelay: "1.4s" }}
      ></div>
      <div
        className="absolute bottom-0 right-0 w-1 h-1 bg-primary/30 rounded-full animate-ping"
        style={{ animationDelay: "2.1s" }}
      ></div>
    </div>
  )
}

// Export all icons as a collection
export const AnimatedIcons = {
  Rocket: RocketIcon,
  MultiSparkles: MultiSparklesIcon,
  ChefHat: ChefHatIcon,
  Timer: TimerIcon,
  Gift: GiftIcon,
  Hourglass: HourglassIcon,
  Calendar: CalendarIcon,
  Package: PackageIcon,
  Lightbulb: LightbulbIcon,
  Gear: GearIcon,
  Target: TargetIcon,
  Check: CheckIcon,
  Bell: BellIcon,
  Mail: MailIcon,
  Search: SearchIcon,
  GenesisAdd: GenesisAddIcon,
  ComplexSparkles: ComplexSparklesIcon,
}
