/**
 * Returns the caret container node and offset for given viewport coordinates.
 * Firefox exposes `document.caretPositionFromPoint` while Chromium uses `document.caretRangeFromPoint`,
 * so we normalize their output for consumers that need cursor placement.
 */
export function getCaretFromPoint(
  x: number,
  y: number,
): { node: Node; offset: number } | null {
  if (typeof document === "undefined") {
    return null;
  }

  // Check for caretRangeFromPoint (Chrome/Edge) with type guard
  if (
    "caretRangeFromPoint" in document &&
    typeof document.caretRangeFromPoint === "function"
  ) {
    const range = document.caretRangeFromPoint(x, y);
    if (range?.startContainer) {
      return { node: range.startContainer, offset: range.startOffset };
    }
  }

  // Check for caretPositionFromPoint (Firefox) with type guard
  if (
    "caretPositionFromPoint" in document &&
    typeof document.caretPositionFromPoint === "function"
  ) {
    const position = document.caretPositionFromPoint(x, y);
    if (position?.offsetNode) {
      return { node: position.offsetNode, offset: position.offset };
    }
  }

  return null;
}
