"use client"

// 🎃 Halloween Theme Context - Share theme state across the app
import { createContext, useContext, ReactNode } from "react"

interface HalloweenContextType {
  isHalloweenEnabled: boolean
}

const HalloweenContext = createContext<HalloweenContextType | undefined>(undefined)

interface HalloweenProviderProps {
  children: ReactNode
  isEnabled: boolean
}

export function HalloweenProvider({ children, isEnabled }: HalloweenProviderProps) {
  return (
    <HalloweenContext.Provider value={{ isHalloweenEnabled: isEnabled }}>
      {children}
    </HalloweenContext.Provider>
  )
}

export function useHalloween() {
  const context = useContext(HalloweenContext)
  // Provide default values when not in context (for testing and safety)
  return context || { isHalloweenEnabled: false }
}
