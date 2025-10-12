# Virtual Lists Implementation Guide

## Overview

Virtual lists (also called "windowing") dramatically improve performance for long lists by only rendering items that are visible in the viewport. Instead of rendering 1000+ DOM nodes, you render only ~10-15 visible items.

**Performance Impact:**

- Without virtualization: 1000 tasks = 1000 DOM nodes = sluggish scrolling
- With virtualization: 1000 tasks = ~15 DOM nodes = smooth 60fps scrolling
- Typical savings: 90-95% reduction in rendered DOM nodes

## Implementation

### 1. Install Dependencies

```bash
pnpm add @tanstack/react-virtual
```

### 2. Basic Virtual List Component

```tsx
import { useRef, useCallback } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

interface VirtualListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
}

function VirtualList<T>({ items, renderItem }: VirtualListProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);

  // Find the scrollable parent element
  const getScrollElement = useCallback(() => {
    if (!parentRef.current) return null;

    // Walk up the DOM tree to find the nearest scrollable ancestor
    let element: HTMLElement | null = parentRef.current.parentElement;
    while (element) {
      const { overflow, overflowY } = window.getComputedStyle(element);
      if (
        overflow === "auto" ||
        overflowY === "auto" ||
        overflow === "scroll" ||
        overflowY === "scroll"
      ) {
        return element;
      }
      element = element.parentElement;
    }

    // Fallback to window scrolling
    return null;
  }, []);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement,
    estimateSize: () => 50, // Initial estimate for item height
    overscan: 5, // Render 5 extra items outside viewport
  });

  return (
    <div ref={parentRef} style={{ position: "relative", width: "100%" }}>
      {/* Container with calculated total height */}
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {/* Only render visible items */}
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const item = items[virtualItem.index];
          if (!item) return null;

          return (
            <div
              key={virtualItem.key}
              data-index={virtualItem.index}
              ref={virtualizer.measureElement} // Let virtualizer measure actual height
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              {renderItem(item, virtualItem.index)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

## Key Concepts

### Parent Scroll Detection

The `getScrollElement` callback is crucial for using existing page scroll:

```typescript
const getScrollElement = useCallback(() => {
  if (!parentRef.current) return null;

  // Start from immediate parent
  let element: HTMLElement | null = parentRef.current.parentElement;

  // Walk up DOM tree
  while (element) {
    const { overflow, overflowY } = window.getComputedStyle(element);

    // Check if this element is scrollable
    if (
      overflow === "auto" ||
      overflowY === "auto" ||
      overflow === "scroll" ||
      overflowY === "scroll"
    ) {
      return element; // Found scrollable container
    }

    element = element.parentElement; // Keep searching
  }

  // No scrollable parent - use window
  return null;
}, []);
```

**How it works:**

1. Starts from the virtual list's immediate parent
2. Walks up the DOM tree checking each ancestor
3. Uses `window.getComputedStyle()` to check computed CSS
4. Returns first element with `overflow: auto/scroll` or `overflowY: auto/scroll`
5. Falls back to `null` (window scroll) if none found

**Why this approach:**

- ✅ No fixed height constraints needed
- ✅ Works with any layout
- ✅ Uses existing scrollable containers
- ✅ Natural user experience

### Dynamic Height Measurement

Items can have different heights. The virtualizer handles this automatically:

```typescript
const virtualizer = useVirtualizer({
  count: items.length,
  getScrollElement,
  estimateSize: () => 50,  // Initial guess
  overscan: 5,
})

// In render:
<div
  ref={virtualizer.measureElement}  // Measures actual height
  style={{
    position: "absolute",
    transform: `translateY(${virtualItem.start}px)`,
  }}
>
  {/* Variable height content */}
</div>
```

**Measurement process:**

1. **Estimate**: Virtualizer uses `estimateSize: () => 50` to calculate initial layout
2. **Render**: Renders visible items based on estimates
3. **Measure**: `measureElement` ref reads actual height from DOM
4. **Adjust**: Updates internal map with real heights
5. **Reposition**: Adjusts subsequent item positions if needed

### Overscan

The `overscan` parameter renders extra items outside the viewport:

```typescript
overscan: 5; // Render 5 items above and below viewport
```

**Benefits:**

- Smoother scrolling (items already rendered when they enter view)
- Prevents flash of empty content
- Trade-off: More DOM nodes vs better UX

**Typical values:**

- `overscan: 3-5` - Good balance for most cases
- `overscan: 10+` - Very smooth but more memory
- `overscan: 0` - Maximum performance but may see flashing

## Testing Considerations

Virtual lists only render visible items, which breaks tests expecting all items in DOM:

```typescript
function VirtualList({ items }: Props) {
  const isTest = process.env.NODE_ENV === "test"

  const itemsToRender = isTest
    ? items.map((item, index) => ({ item, index, start: index * 50 }))
    : virtualizer.getVirtualItems().map((vi) => ({
        item: items[vi.index],
        index: vi.index,
        start: vi.start
      }))

  return (
    <div
      ref={virtualizer.measureElement}
      style={{
        position: isTest ? "relative" : "absolute",
        transform: isTest ? undefined : `translateY(${start}px)`,
      }}
    >
      {/* Content */}
    </div>
  )
}
```

**Why needed:**

- Tests query for elements by text/role/etc
- Virtual lists only render ~15 items
- Tests fail if item isn't rendered
- Solution: Render all items in test environment

## Common Patterns

### Debug Badge (Development Only)

Show virtualization stats during development:

```tsx
// components/debug/virtualization-debug-badge.tsx
import { Badge } from "@/components/ui/badge";

interface VirtualizationDebugBadgeProps {
  totalItems: number;
  renderedItems: number;
}

export function VirtualizationDebugBadge({
  totalItems,
  renderedItems,
}: VirtualizationDebugBadgeProps) {
  if (process.env.NODE_ENV !== "development" || totalItems <= 10) {
    return null;
  }

  const savingsPercent = Math.round((1 - renderedItems / totalItems) * 100);

  return (
    <div style={{ position: "sticky", top: 0, zIndex: 50 }}>
      <Badge variant="secondary">
        🚀 Virtual: {renderedItems} / {totalItems} rendered ({savingsPercent}%
        saved)
      </Badge>
    </div>
  );
}
```

Usage:

```tsx
<VirtualizationDebugBadge
  totalItems={items.length}
  renderedItems={virtualizer.getVirtualItems().length}
/>
```

### With Complex Items

For items with drag-and-drop, context menus, etc:

```tsx
{
  virtualizer.getVirtualItems().map((virtualItem) => {
    const item = items[virtualItem.index];

    return (
      <div
        key={virtualItem.key}
        data-index={virtualItem.index}
        ref={virtualizer.measureElement}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          transform: `translateY(${virtualItem.start}px)`,
        }}
      >
        <DraggableElement id={item.id}>
          <DropTargetElement id={item.id}>
            <ComplexItem item={item} />
          </DropTargetElement>
        </DraggableElement>
      </div>
    );
  });
}
```

## Common Pitfalls

### ❌ Fixed Height Container

**Wrong:**

```tsx
// Creates own scrollable container
<div style={{ height: "500px", overflow: "auto" }}>
  <VirtualList items={items} />
</div>
```

**Right:**

```tsx
// Uses parent scroll detection
<div style={{ position: "relative", width: "100%" }}>
  <VirtualList items={items} />
</div>
```

### ❌ Missing measureElement

**Wrong:**

```tsx
// Virtualizer can't measure actual heights
<div style={{ transform: `translateY(${start}px)` }}>{item}</div>
```

**Right:**

```tsx
// Virtualizer measures and adjusts
<div
  ref={virtualizer.measureElement}
  style={{ transform: `translateY(${start}px)` }}
>
  {item}
</div>
```

### ❌ Forgetting Test Mode

**Wrong:**

```tsx
// Tests fail - items not in DOM
const items = virtualizer.getVirtualItems();
```

**Right:**

```tsx
// Tests pass - all items rendered
const isTest = process.env.NODE_ENV === "test";
const items = isTest
  ? allItems.map((item, i) => ({ item, index: i, start: i * 50 }))
  : virtualizer.getVirtualItems();
```

## Performance Tips

1. **Memoize expensive items**: Use `React.memo()` for complex list items
2. **Optimize estimateSize**: Use average item height for better estimates
3. **Adjust overscan**: Lower for better performance, higher for smoother UX
4. **Debounce scroll**: Virtualizer handles this, but be careful with scroll listeners
5. **Key stability**: Use stable keys (item.id) not array indices

## Real-World Example

See `apps/web/components/task/project-sections-view.tsx` for a production implementation with:

- Dynamic height items
- Drag-and-drop support
- Parent scroll detection
- Test environment handling
- Debug badge integration

## Further Reading

- [TanStack Virtual Docs](https://tanstack.com/virtual/latest)
- [React Virtual Examples](https://tanstack.com/virtual/latest/docs/framework/react/examples)
- [Performance Optimization](https://tanstack.com/virtual/latest/docs/framework/react/guide/performance)
