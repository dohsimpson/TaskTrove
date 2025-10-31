import { useEffect, useState } from "react"
import { DEFAULT_PROJECT_COLORS } from "@tasktrove/constants"

/**
 * Custom hook to get the computed color from CSS variables
 *
 * This hook resolves CSS color variables (including complex formats like oklch)
 * to RGB color strings that can be used with charting libraries like Recharts.
 *
 * @param cssVariable - The CSS variable to resolve (e.g., "hsl(var(--primary))", "var(--accent)")
 * @param fallback - Fallback color if the variable cannot be resolved (default: DEFAULT_PROJECT_COLORS[0])
 * @returns The computed RGB color string (e.g., "rgb(59, 130, 246)")
 *
 * @example
 * const primaryColor = useColor("hsl(var(--primary))");
 * const accentColor = useColor("var(--accent)", "#10b981");
 * <Line stroke={primaryColor} />
 */
export function useColor(cssVariable: string, fallback = DEFAULT_PROJECT_COLORS[0]): string {
  const [color, setColor] = useState<string>(fallback)

  useEffect(() => {
    // Create a temporary element to compute the actual color value
    const tempElement = document.createElement("div")
    tempElement.style.color = cssVariable
    document.body.appendChild(tempElement)

    const computedColor = window.getComputedStyle(tempElement).color

    document.body.removeChild(tempElement)

    // Check if the color was successfully computed
    if (computedColor && computedColor !== cssVariable) {
      setColor(computedColor)
    }
  }, [cssVariable])

  return color
}

/**
 * Convenience hook to get the primary color
 * @param fallback - Fallback color (default: DEFAULT_PROJECT_COLORS[0])
 * @returns The computed primary color
 */
export function usePrimaryColor(fallback = DEFAULT_PROJECT_COLORS[0]): string {
  return useColor("hsl(var(--primary))", fallback)
}
