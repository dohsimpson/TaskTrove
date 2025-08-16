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

export function RocketIcon({ size = 24, className = "text-primary" }: AnimatedIconProps) {
  return (
    <>
      <Rocket
        className={`h-${size / 4} w-${size / 4} ${className}`}
        style={{
          animation: "bounce 2s ease-in-out infinite, pulse 3s ease-in-out infinite",
        }}
      />
      <style jsx>{`
        @keyframes bounce {
          0%,
          20%,
          53%,
          80%,
          100% {
            animation-timing-function: cubic-bezier(0.215, 0.61, 0.355, 1);
            transform: translate3d(0, 0, 0);
          }
          40%,
          43% {
            animation-timing-function: cubic-bezier(0.755, 0.05, 0.855, 0.06);
            transform: translate3d(0, -8px, 0);
          }
          70% {
            animation-timing-function: cubic-bezier(0.755, 0.05, 0.855, 0.06);
            transform: translate3d(0, -4px, 0);
          }
          90% {
            transform: translate3d(0, -2px, 0);
          }
        }
      `}</style>
    </>
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

export function ChefHatIcon({ size = 24, className = "text-primary" }: AnimatedIconProps) {
  return (
    <>
      <ChefHat
        className={`h-${size / 4} w-${size / 4} ${className} animate-bounce`}
        style={{
          animation: "bounce 2s ease-in-out infinite",
          transformOrigin: "center bottom",
        }}
      />
    </>
  )
}

export function TimerIcon({ size = 24, className = "text-primary" }: AnimatedIconProps) {
  return (
    <Timer
      className={`h-${size / 4} w-${size / 4} ${className} animate-spin`}
      style={{ animationDuration: "4s" }}
    />
  )
}

export function GiftIcon({ size = 24, className = "text-primary" }: AnimatedIconProps) {
  return (
    <>
      <Gift
        className={`h-${size / 4} w-${size / 4} ${className}`}
        style={{ animation: "wiggle 1s ease-in-out infinite" }}
      />
      <style jsx>{`
        @keyframes wiggle {
          0%,
          100% {
            transform: rotate(-3deg);
          }
          50% {
            transform: rotate(3deg);
          }
        }
      `}</style>
    </>
  )
}

export function HourglassIcon({ size = 24, className = "text-primary" }: AnimatedIconProps) {
  return (
    <>
      <Hourglass
        className={`h-${size / 4} w-${size / 4} ${className}`}
        style={{ animation: "flip 3s ease-in-out infinite" }}
      />
      <style jsx>{`
        @keyframes flip {
          0%,
          50% {
            transform: rotateY(0deg);
          }
          100% {
            transform: rotateY(180deg);
          }
        }
      `}</style>
    </>
  )
}

export function CalendarIcon({ size = 24, className = "text-primary" }: AnimatedIconProps) {
  return (
    <>
      <Calendar
        className={`h-${size / 4} w-${size / 4} ${className} animate-pulse`}
        style={{ animation: "pulse 2s ease-in-out infinite, scale 2s ease-in-out infinite" }}
      />
      <style jsx>{`
        @keyframes scale {
          0%,
          100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.1);
          }
        }
      `}</style>
    </>
  )
}

export function PackageIcon({ size = 24, className = "text-primary" }: AnimatedIconProps) {
  return (
    <>
      <Package
        className={`h-${size / 4} w-${size / 4} ${className}`}
        style={{ animation: "float 3s ease-in-out infinite" }}
      />
      <style jsx>{`
        @keyframes float {
          0%,
          100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-4px);
          }
        }
      `}</style>
    </>
  )
}

export function LightbulbIcon({ size = 24, className = "text-primary" }: AnimatedIconProps) {
  return (
    <>
      <Lightbulb
        className={`h-${size / 4} w-${size / 4} ${className}`}
        style={{ animation: "flicker 2s ease-in-out infinite" }}
      />
      <style jsx>{`
        @keyframes flicker {
          0%,
          50%,
          100% {
            opacity: 1;
          }
          25%,
          75% {
            opacity: 0.5;
          }
        }
      `}</style>
    </>
  )
}

export function GearIcon({ size = 24, className = "text-primary" }: AnimatedIconProps) {
  return (
    <Settings
      className={`h-${size / 4} w-${size / 4} ${className} animate-spin`}
      style={{
        animationDuration: "3s",
        animationTimingFunction: "linear",
      }}
    />
  )
}

export function TargetIcon({ size = 24, className = "text-primary" }: AnimatedIconProps) {
  return (
    <div className="relative h-12 w-12 flex items-center justify-center">
      <Target className={`h-${size / 4} w-${size / 4} ${className}`} />
      <div className="absolute inset-0 border-2 border-primary/30 animate-ping rounded-full"></div>
      <div
        className="absolute inset-1 border border-primary/20 animate-ping rounded-full"
        style={{ animationDelay: "0.5s" }}
      ></div>
    </div>
  )
}

export function CheckIcon({ size = 24, className = "text-primary" }: AnimatedIconProps) {
  return (
    <>
      <Check
        className={`h-${size / 4} w-${size / 4} ${className}`}
        style={{ animation: "checkmark 2s ease-in-out infinite" }}
      />
      <style jsx>{`
        @keyframes checkmark {
          0% {
            transform: scale(0);
            opacity: 0;
          }
          50% {
            transform: scale(1.2);
            opacity: 1;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </>
  )
}

export function BellIcon({ size = 24, className = "text-primary" }: AnimatedIconProps) {
  return (
    <>
      <Bell
        className={`h-${size / 4} w-${size / 4} ${className}`}
        style={{ animation: "ring 2s ease-in-out infinite" }}
      />
      <style jsx>{`
        @keyframes ring {
          0%,
          50%,
          100% {
            transform: rotate(0deg);
          }
          10%,
          30% {
            transform: rotate(-10deg);
          }
          20%,
          40% {
            transform: rotate(10deg);
          }
        }
      `}</style>
    </>
  )
}

export function MailIcon({ size = 24, className = "text-primary" }: AnimatedIconProps) {
  return (
    <div className="flex items-center justify-center">
      <Mail
        className={`h-${size / 4} w-${size / 4} ${className}`}
        style={{ animation: "mailBounce 2s ease-in-out infinite" }}
      />
      <style>{`
        @keyframes mailBounce {
          0%,
          20%,
          50%,
          80%,
          100% {
            transform: translateY(0) rotate(0deg);
          }
          10% {
            transform: translateY(-4px) rotate(-2deg);
          }
          30% {
            transform: translateY(-2px) rotate(1deg);
          }
          60% {
            transform: translateY(-1px) rotate(-0.5deg);
          }
        }
      `}</style>
    </div>
  )
}

export function SearchIcon({ size = 24, className = "text-primary" }: AnimatedIconProps) {
  return (
    <div className="relative h-12 w-12 flex items-center justify-center">
      <Search
        className={`h-${size / 4} w-${size / 4} ${className}`}
        style={{ animation: "searchScan 3s ease-in-out infinite" }}
      />
      <div
        className="absolute inset-0 border-2 border-primary/20 rounded-full animate-ping"
        style={{ animationDuration: "3s" }}
      ></div>
      <style jsx>{`
        @keyframes searchScan {
          0%,
          100% {
            transform: rotate(0deg) scale(1);
          }
          25% {
            transform: rotate(-15deg) scale(1.05);
          }
          50% {
            transform: rotate(0deg) scale(1.1);
          }
          75% {
            transform: rotate(15deg) scale(1.05);
          }
        }
      `}</style>
    </div>
  )
}

export function GenesisAddIcon({ size = 24, className = "text-primary" }: AnimatedIconProps) {
  return (
    <div className="relative h-12 w-12 flex items-center justify-center overflow-visible">
      {/* Main Plus with morphing animation */}
      <Plus
        className={`h-${size / 4} w-${size / 4} ${className} z-20`}
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

      <style jsx>{`
        @keyframes plusMorph {
          0%,
          20%,
          80%,
          100% {
            transform: scale(1) rotate(0deg);
            filter: brightness(1);
          }
          10% {
            transform: scale(0.8) rotate(-15deg);
            filter: brightness(1.2);
          }
          40% {
            transform: scale(1.3) rotate(180deg);
            filter: brightness(1.4);
          }
          60% {
            transform: scale(1.1) rotate(270deg);
            filter: brightness(1.1);
          }
        }
        @keyframes sparkBurst1 {
          0%,
          70%,
          100% {
            transform: translate(0, 0) scale(0) rotate(0deg);
            opacity: 0;
          }
          30% {
            transform: translate(0, -16px) scale(1.5) rotate(45deg);
            opacity: 1;
          }
          50% {
            transform: translate(2px, -20px) scale(0.5) rotate(90deg);
            opacity: 0.3;
          }
        }
        @keyframes sparkBurst2 {
          0%,
          70%,
          100% {
            transform: translate(0, 0) scale(0) rotate(0deg);
            opacity: 0;
          }
          35% {
            transform: translate(16px, -4px) scale(1.2) rotate(-30deg);
            opacity: 1;
          }
          55% {
            transform: translate(20px, -8px) scale(0.3) rotate(-60deg);
            opacity: 0.2;
          }
        }
        @keyframes sparkBurst3 {
          0%,
          70%,
          100% {
            transform: translate(0, 0) scale(0) rotate(0deg);
            opacity: 0;
          }
          25% {
            transform: translate(0, 16px) scale(1) rotate(180deg);
            opacity: 1;
          }
          45% {
            transform: translate(-2px, 20px) scale(0.4) rotate(270deg);
            opacity: 0.3;
          }
        }
        @keyframes sparkBurst4 {
          0%,
          70%,
          100% {
            transform: translate(0, 0) scale(0) rotate(0deg);
            opacity: 0;
          }
          40% {
            transform: translate(-16px, -4px) scale(1.3) rotate(60deg);
            opacity: 1;
          }
          60% {
            transform: translate(-20px, -8px) scale(0.6) rotate(120deg);
            opacity: 0.2;
          }
        }
        @keyframes sparkBurst5 {
          0%,
          70%,
          100% {
            transform: translate(0, 0) scale(0) rotate(0deg);
            opacity: 0;
          }
          32% {
            transform: translate(18px, 0) scale(1.1) rotate(-45deg);
            opacity: 1;
          }
          52% {
            transform: translate(22px, 2px) scale(0.3) rotate(-90deg);
            opacity: 0.3;
          }
        }
        @keyframes sparkBurst6 {
          0%,
          70%,
          100% {
            transform: translate(0, 0) scale(0) rotate(0deg);
            opacity: 0;
          }
          37% {
            transform: translate(-18px, 0) scale(1.4) rotate(45deg);
            opacity: 1;
          }
          57% {
            transform: translate(-22px, -2px) scale(0.2) rotate(90deg);
            opacity: 0.2;
          }
        }
        @keyframes coreEnergy {
          0%,
          100% {
            transform: scale(1);
            opacity: 0.1;
            filter: blur(0px);
          }
          50% {
            transform: scale(1.8);
            opacity: 0.3;
            filter: blur(1px);
          }
        }
        @keyframes shockwave {
          0% {
            transform: scale(1);
            opacity: 0.15;
          }
          70% {
            transform: scale(2.5);
            opacity: 0;
          }
          100% {
            transform: scale(3);
            opacity: 0;
          }
        }
      `}</style>
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
