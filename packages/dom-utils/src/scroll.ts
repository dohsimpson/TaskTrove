/**
 * Scroll utilities for TaskTrove
 */

import type React from "react";

/**
 * Creates a scroll-to-bottom function for a given container element.
 * Uses double requestAnimationFrame to wait for layout/paint so the container has final height.
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

type SmoothScrollIntoViewOptions = {
  behavior?: ScrollBehavior;
  block?: ScrollLogicalPosition;
  inline?: ScrollLogicalPosition;
  container?: HTMLElement | null;
  offsetTop?: number;
};

const findScrollParent = (element: HTMLElement | null): HTMLElement | null => {
  let node = element?.parentElement ?? null;
  while (node) {
    const { overflowY } = getComputedStyle(node);
    const isScrollable = /(auto|scroll|overlay)/.test(overflowY);
    if (isScrollable && node.scrollHeight > node.clientHeight) return node;
    node = node.parentElement;
  }
  return null;
};

/**
 * Smoothly scrolls an element into view within its nearest scrollable parent.
 * Use this when you need header offsets or a specific container (e.g. sticky headers).
 */
export function smoothScrollIntoView(
  element: HTMLElement | null,
  options: SmoothScrollIntoViewOptions = {},
): void {
  if (!element) return;

  const behavior = options.behavior ?? "smooth";
  const container = options.container ?? findScrollParent(element);

  if (!container) {
    element.scrollIntoView({
      behavior,
      block: options.block ?? "nearest",
      inline: options.inline ?? "nearest",
    });
    return;
  }

  const parentRect = container.getBoundingClientRect();
  const targetRect = element.getBoundingClientRect();
  const offsetTop = options.offsetTop ?? 0;
  const nextTop = Math.max(
    0,
    container.scrollTop + (targetRect.top - parentRect.top) - offsetTop,
  );

  container.scrollTo({ top: nextTop, behavior });
}
