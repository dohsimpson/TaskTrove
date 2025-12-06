/**
 * Helper functions and configuration for enhanced-highlighted-input
 */

import type { AutocompleteType } from "@tasktrove/parser/types"

/**
 * Get autocomplete prefix for insertion
 */
export function getAutocompletePrefix(type: AutocompleteType | null): string {
  switch (type) {
    case "project":
      return "#"
    case "label":
      return "@"
    case "estimation":
      return "~"
    case "date":
      return ""
    default:
      return ""
  }
}

/**
 * Token styling based on TaskTrove's theme system
 * IMPORTANT: Do NOT add font-medium or any font-weight classes to these styles.
 * Inter font has different character widths for different font weights,
 * causing cumulative misalignment between the overlay and contentEditable text.
 */
export const TOKEN_STYLES = {
  project: "bg-purple-500/20 text-purple-300",
  label: "bg-blue-500/20 text-blue-300",
  priority: "bg-red-500/20 text-red-300",
  date: "bg-green-500/20 text-green-300",
  time: "bg-purple-500/20 text-purple-300",
  recurring: "bg-blue-500/20 text-blue-300",
  duration: "bg-orange-500/20 text-orange-300",
  estimation: "bg-cyan-500/20 text-cyan-300",
  text: "",
} as const

/**
 * Disabled token styles: fall back to normal text color (no highlight/muting)
 */
export const DISABLED_TOKEN_STYLES = {
  project: "",
  label: "",
  priority: "",
  date: "",
  time: "",
  recurring: "",
  duration: "",
  estimation: "",
  text: "",
} as const
