import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Utility function for combining and merging Tailwind CSS classes
 * @param inputs - Class values to combine and merge
 * @returns Merged class string with proper Tailwind CSS precedence
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
