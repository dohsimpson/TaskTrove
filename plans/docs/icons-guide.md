# Icons Guide

This guide covers the icon systems used in TaskTrove, including static icons from Lucide React and animated icons from pqoqubbw/icons.

## Table of Contents

- [Overview](#overview)
- [Static Icons (Lucide React)](#static-icons-lucide-react)
- [Animated Icons (pqoqubbw/icons)](#animated-icons-pqoqubbwicons)
- [Implementation Patterns](#implementation-patterns)
- [Best Practices](#best-practices)
- [Testing Icons](#testing-icons)
- [Available Icons Reference](#available-icons-reference)

## Overview

TaskTrove uses a hybrid approach for icons:

1. **Static Icons**: Lucide React for most UI elements
2. **Animated Icons**: pqoqubbw/icons for enhanced user interactions in key areas

This combination provides excellent performance for static elements while adding delightful micro-interactions where they matter most.

## Static Icons (Lucide React)

### Installation

Lucide React is already installed in the project:

```json
{
  "lucide-react": "^0.454.0"
}
```

### Basic Usage

```tsx
import { Search, Plus, Calendar, Inbox } from "lucide-react"

// Basic usage
<Search className="h-4 w-4" />

// With custom styling
<Calendar className="h-5 w-5 text-blue-500" />

// In buttons
<Button>
  <Plus className="h-4 w-4 mr-2" />
  Add Task
</Button>
```

### Common Icon Patterns

#### Navigation Icons

```tsx
// Sidebar navigation
import { Inbox, Calendar, Clock, CheckSquare, List, Star } from "lucide-react"

const navItems = [
  { icon: <Inbox className="h-4 w-4" />, label: "Inbox" },
  { icon: <Calendar className="h-4 w-4" />, label: "Today" },
  { icon: <Clock className="h-4 w-4" />, label: "Upcoming" },
]
```

#### Action Icons

```tsx
import { Edit3, Trash2, MoreHorizontal, Copy } from "lucide-react"

// Context menu actions
<Edit3 className="h-4 w-4" />
<Trash2 className="h-4 w-4" />
<MoreHorizontal className="h-4 w-4" />
```

#### Status Icons

```tsx
import { CheckCircle, AlertTriangle, Clock } from "lucide-react"

// Task status indicators
const getStatusIcon = (status: string) => {
  switch (status) {
    case "completed":
      return <CheckCircle className="h-4 w-4 text-green-500" />
    case "overdue":
      return <AlertTriangle className="h-4 w-4 text-red-500" />
    case "pending":
      return <Clock className="h-4 w-4 text-yellow-500" />
  }
}
```

## Animated Icons (pqoqubbw/icons)

### Installation

Animated icons are installed via shadcn/ui CLI:

```bash
pnpm dlx shadcn@latest add "https://icons.pqoqubbw.dev/c/search.json"
pnpm dlx shadcn@latest add "https://icons.pqoqubbw.dev/c/plus.json"
```

This creates components in `components/ui/` with TypeScript interfaces and animation controls.

### Available Animated Icons

Currently installed:

- **SearchIcon**: Bouncy movement animation on hover
- **PlusIcon**: 180° rotation with spring animation on hover

### Basic Usage

```tsx
import { SearchIcon } from "@/components/ui/search"
import { PlusIcon } from "@/components/ui/plus"

// Basic usage (auto-animates on hover)
<SearchIcon size={16} />
<PlusIcon size={20} />
```

### Advanced Usage with Imperative Control

```tsx
import { SearchIcon, type SearchIconHandle } from "@/components/ui/search"
import { PlusIcon, type PlusIconHandle } from "@/components/ui/plus"
import { useRef } from "react"

function MyComponent() {
  const searchRef = useRef<SearchIconHandle>(null)
  const plusRef = useRef<PlusIconHandle>(null)

  return (
    <div>
      {/* Control animation from parent element */}
      <Button
        onMouseEnter={() => searchRef.current?.startAnimation()}
        onMouseLeave={() => searchRef.current?.stopAnimation()}
      >
        <SearchIcon ref={searchRef} size={16} />
        Search
      </Button>

      <Button
        onMouseEnter={() => plusRef.current?.startAnimation()}
        onMouseLeave={() => plusRef.current?.stopAnimation()}
      >
        <PlusIcon ref={plusRef} size={16} />
        Add
      </Button>
    </div>
  )
}
```

### Animation Properties

Each animated icon exposes these methods via ref:

```tsx
interface IconHandle {
  startAnimation: () => void
  stopAnimation: () => void
}
```

### Customization

Icons inherit color from their parent element via `currentColor`:

```tsx
// Color inheritance
<div className="text-blue-500">
  <SearchIcon size={16} /> {/* Will be blue */}
</div>

// Custom sizing
<PlusIcon size={24} /> {/* 24px square */}
```

## Implementation Patterns

### Sidebar Quick Actions (Current Implementation)

```tsx
export const SidebarNav = memo(function SidebarNav({ onSearchClick, onQuickAddClick }) {
  const searchIconRef = useRef<SearchIconHandle>(null)
  const plusIconRef = useRef<PlusIconHandle>(null)

  return (
    <div className="grid grid-cols-2 gap-3 mb-6">
      <Button
        className="h-14 flex flex-col items-center justify-center gap-1.5 bg-card border-2 border-border hover:border-primary/50 hover:bg-primary/5 rounded-lg transition-all duration-200"
        onClick={onSearchClick}
        onMouseEnter={() => searchIconRef.current?.startAnimation()}
        onMouseLeave={() => searchIconRef.current?.stopAnimation()}
      >
        <SearchIcon ref={searchIconRef} size={16} />
        <span className="text-xs font-medium">Search</span>
      </Button>

      <Button
        className="h-14 flex flex-col items-center justify-center gap-1.5 bg-card border-2 border-border hover:border-primary/50 hover:bg-primary/5 rounded-lg transition-all duration-200"
        onClick={onQuickAddClick}
        onMouseEnter={() => plusIconRef.current?.startAnimation()}
        onMouseLeave={() => plusIconRef.current?.stopAnimation()}
      >
        <PlusIcon ref={plusIconRef} size={16} />
        <span className="text-xs font-medium">Add</span>
      </Button>
    </div>
  )
})
```

### When to Use Animated vs Static Icons

#### Use Animated Icons For:

- **Primary action buttons** (Search, Add)
- **Call-to-action elements** that benefit from attention
- **Interactive elements** where animation provides feedback
- **High-value user interactions** (max 3-5 per page)

#### Use Static Icons For:

- **Navigation elements**
- **Status indicators**
- **Secondary actions**
- **Content within lists/tables**
- **Small UI elements** (16px and below typically)

## Best Practices

### Performance

1. **Limit animated icons**: Use sparingly (3-5 per page max)
2. **Static by default**: Prefer Lucide icons for most use cases
3. **Preload animations**: Animated icons load motion library

### Accessibility

```tsx
// Always provide accessible labels
<Button aria-label="Search tasks">
  <SearchIcon size={16} />
</Button>

// For icon-only buttons
<Button
  variant="ghost"
  size="icon"
  aria-label="Add new project"
>
  <PlusIcon size={16} />
</Button>
```

### Consistent Sizing

```tsx
// Standard sizes across the app
const iconSizes = {
  xs: 12,    // Small UI elements
  sm: 16,    // Default buttons, inline text
  md: 20,    // Medium buttons
  lg: 24,    // Large buttons, headers
  xl: 32,    // Hero elements
}

// Usage
<SearchIcon size={iconSizes.sm} />
<PlusIcon size={iconSizes.md} />
```

### Color Consistency

```tsx
// Use design system colors
<SearchIcon className="text-muted-foreground" size={16} />
<PlusIcon className="text-primary" size={16} />

// State-based colors
<CheckCircle className="text-green-500" size={16} />
<AlertTriangle className="text-red-500" size={16} />
```

## Testing Icons

### Static Icon Testing

```tsx
// Mock static icons in tests
vi.mock("lucide-react", () => ({
  Search: () => <div data-testid="search-icon" />,
  Plus: () => <div data-testid="plus-icon" />,
  Calendar: () => <div data-testid="calendar-icon" />,
}))

// Test usage
expect(screen.getByTestId("search-icon")).toBeInTheDocument()
```

### Animated Icon Testing

```tsx
// Mock animated icons with imperative handles
vi.mock("@/components/ui/search", () => {
  const React = require("react")
  return {
    SearchIcon: React.forwardRef(({ size, ...props }: any, ref: any) => {
      React.useImperativeHandle(ref, () => ({
        startAnimation: vi.fn(),
        stopAnimation: vi.fn(),
      }))
      return React.createElement("div", { "data-testid": "search-icon", ...props })
    }),
  }
})

// Test imperative control
const searchRef = useRef<SearchIconHandle>(null)
// ... render component
fireEvent.mouseEnter(button)
expect(searchRef.current?.startAnimation).toHaveBeenCalled()
```

## Available Icons Reference

### Lucide React Icons (Selection)

#### Navigation

- `Inbox` - Inbox view
- `Calendar` - Today/calendar view
- `Clock` - Upcoming tasks
- `CheckSquare` - Completed tasks
- `List` - All tasks view
- `Star` - Favorites
- `BarChart3` - Analytics
- `Settings` - Settings page

#### Actions

- `Plus` - Add new items
- `Search` - Search functionality
- `Edit3` - Edit actions
- `Trash2` - Delete actions
- `Copy` - Duplicate actions
- `MoreHorizontal` - Context menus

#### UI Elements

- `ChevronDown` / `ChevronRight` - Collapsible sections
- `GripVertical` - Drag handles
- `Tag` - Labels
- `Filter` - Filtering
- `User` - Profile
- `Keyboard` - Shortcuts

### Animated Icons (pqoqubbw/icons)

#### Currently Installed

- **SearchIcon** (`@/components/ui/search`)
  - Animation: Bouncy x/y movement
  - Use: Search buttons, search triggers
  - Size: 16px recommended

- **PlusIcon** (`@/components/ui/plus`)
  - Animation: 180° rotation with spring
  - Use: Add buttons, create actions
  - Size: 12px-16px recommended

#### Available for Installation

Visit [icons.pqoqubbw.dev](https://icons.pqoqubbw.dev) for the full catalog.

Popular options:

- `heart` - Favorites/likes
- `lock` / `unlock` - Security states
- `folders` - File management
- `smile` / `frown` - Emotion states

### Installing New Animated Icons

```bash
# Install a new animated icon
pnpm dlx shadcn@latest add "https://icons.pqoqubbw.dev/c/[icon-name].json"

# Example: Install heart icon
pnpm dlx shadcn@latest add "https://icons.pqoqubbw.dev/c/heart.json"
```

This creates:

- `components/ui/heart.tsx` - React component
- TypeScript interfaces for imperative control
- Built-in animation variants

## Integration Examples

### Adding a New Animated Icon

1. **Install the icon**:

```bash
pnpm dlx shadcn@latest add "https://icons.pqoqubbw.dev/c/heart.json"
```

2. **Import and use**:

```tsx
import { HeartIcon, type HeartIconHandle } from "@/components/ui/heart"

function FavoriteButton() {
  const heartRef = useRef<HeartIconHandle>(null)

  return (
    <Button
      onMouseEnter={() => heartRef.current?.startAnimation()}
      onMouseLeave={() => heartRef.current?.stopAnimation()}
    >
      <HeartIcon ref={heartRef} size={16} />
      Favorite
    </Button>
  )
}
```

3. **Add test mocks**:

```tsx
vi.mock("@/components/ui/heart", () => {
  const React = require("react")
  return {
    HeartIcon: React.forwardRef(({ size, ...props }: any, ref: any) => {
      React.useImperativeHandle(ref, () => ({
        startAnimation: vi.fn(),
        stopAnimation: vi.fn(),
      }))
      return React.createElement("div", { "data-testid": "heart-icon", ...props })
    }),
  }
})
```

## Troubleshooting

### Common Issues

1. **Animation not triggering**: Ensure proper ref setup and imperative handle usage
2. **Type errors**: Import the handle interface: `import { IconName, type IconNameHandle }`
3. **Test failures**: Update mocks to include imperative handle methods
4. **Performance issues**: Limit animated icons to 3-5 per page

### Debug Steps

1. Check ref is properly connected
2. Verify animation methods are called
3. Ensure motion library is loaded
4. Test in isolation without other animations

---

For questions or additions to this guide, please update the documentation when implementing new icon patterns or discovering new best practices.
