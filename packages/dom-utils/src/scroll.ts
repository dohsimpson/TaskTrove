/**
 * Scroll utilities for TaskTrove
 */

import type React from "react";

/**
 * Creates a scroll-to-bottom function for a given container element.
 * Uses double requestAnimationFrame to ensure DOM is fully painted before scrolling.
 *
 * @param containerRef - A React ref object pointing to the scrollable container element
 * @returns A callback function that scrolls to the bottom of the container
 *
 * @example
 * ```tsx
 * const containerRef = useRef<HTMLDivElement>(null)
 * const scrollToBottom = createScrollToBottom(containerRef)
 *
 * useEffect(() => {
 *   if (itemAdded) {
 *     scrollToBottom()
 *   }
 * }, [items.length, scrollToBottom])
 * ```
 */
export function createScrollToBottom<T extends HTMLElement = HTMLElement>(
  containerRef: React.RefObject<T | null>,
): () => void {
  return () => {
    if (containerRef.current) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (containerRef.current) {
            containerRef.current.scrollTo({
              top: containerRef.current.scrollHeight,
              behavior: "smooth",
            });
          }
        });
      });
    }
  };
}
