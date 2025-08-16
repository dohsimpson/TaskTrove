# TaskTrove Styling Guide

## Overview

TaskTrove uses a modern, comprehensive styling system built on **Tailwind CSS v4**, **shadcn/ui components**, and **Next.js 15**. The design system emphasizes consistency, accessibility, and maintainability through a structured approach to theming, components, and responsive design.

## 1. Color System and Theming

### CSS Custom Properties Architecture

TaskTrove uses a dual-layer color system:

- **CSS Custom Properties** define semantic color tokens
- **HSL values** provide the actual color values with light/dark theme support

```css
/* Core color tokens */
--color-background: hsl(var(--background));
--color-foreground: hsl(var(--foreground));
--color-primary: hsl(var(--primary));
--color-secondary: hsl(var(--secondary));
--color-muted: hsl(var(--muted));
--color-accent: hsl(var(--accent));
--color-destructive: hsl(var(--destructive));
--color-border: hsl(var(--border));
```

### Theme Structure

The application supports **light**, **dark**, and **system** themes:

```css
/* Light theme values */
:root {
  --background: 0 0% 100%;
  --foreground: 0 0% 3.9%;
  --primary: 0 0% 9%;
  --secondary: 0 0% 96.1%;
  --muted: 0 0% 96.1%;
  --accent: 0 0% 96.1%;
  --destructive: 0 84.2% 60.2%;
  --border: 0 0% 89.8%;
}

/* Dark theme values */
.dark {
  --background: 0 0% 3.9%;
  --foreground: 0 0% 98%;
  --primary: 0 0% 98%;
  --secondary: 0 0% 14.9%;
  --muted: 0 0% 14.9%;
  --accent: 0 0% 14.9%;
  --destructive: 0 62.8% 30.6%;
  --border: 0 0% 14.9%;
}
```

### Specialized Color Systems

**Sidebar Colors**: Dedicated color tokens for sidebar components:

```css
--color-sidebar: hsl(var(--sidebar-background));
--color-sidebar-foreground: hsl(var(--sidebar-foreground));
--color-sidebar-accent: hsl(var(--sidebar-accent));
```

**Chart Colors**: Predefined color palette for data visualization:

```css
--color-chart-1: hsl(var(--chart-1));
--color-chart-2: hsl(var(--chart-2));
/* ... up to chart-5 */
```

### Priority Color System

TaskTrove implements a consistent priority color system:

```typescript
const getPriorityColor = (priority: number) => {
  switch (priority) {
    case 1:
      return "text-red-500" // Urgent
    case 2:
      return "text-orange-500" // High
    case 3:
      return "text-blue-500" // Medium
    default:
      return "text-gray-400" // Low/None
  }
}
```

### Label Color System

Dynamic label colors are generated from a predefined palette:

```typescript
const labelColors = [
  "#ef4444",
  "#f59e0b",
  "#3b82f6",
  "#8b5cf6",
  "#10b981",
  "#f97316",
  "#06b6d4",
  "#84cc16",
  "#ec4899",
  "#6366f1",
]
```

## 2. Typography and Spacing

### Font System

- **Primary Font**: Arial, Helvetica, sans-serif
- **Text Balancing**: Custom utility for improved readability

```css
@utility text-balance {
  text-wrap: balance;
}
```

### Typography Patterns

**Task Items**:

```typescript
// Title typography
className = "font-medium text-[15px] leading-5"

// Description typography
className = "text-sm line-clamp-2 text-gray-600 dark:text-gray-400"

// Metadata typography
className = "text-xs text-gray-500 dark:text-gray-400"
```

**UI Component Typography**:

```typescript
// Card titles
className = "leading-none font-semibold"

// Dialog titles
className = "text-lg leading-none font-semibold"

// Descriptions
className = "text-muted-foreground text-sm"
```

### Text Size Change Guidelines

When changing task title text size, follow this alignment formula:

```
Checkbox padding = (Text size - 12px) / 4 + 3px
```

**Examples:**

- 14px text: `pt-[3px]`
- 15px text: `pt-1` (4px) - Current
- 16px text: `pt-1` (4px)
- 18px text: `pt-[4.5px]`

### Spacing System

**Border Radius**: Consistent radius system with calculated variants:

```css
--radius-lg: var(--radius); /* 0.5rem */
--radius-md: calc(var(--radius) - 2px);
--radius-sm: calc(var(--radius) - 4px);
```

**Component Spacing**:

- **Task items**: `p-4` (16px padding)
- **Cards**: `p-6` (24px padding)
- **Dialogs**: `p-6` with `gap-4` (24px padding, 16px gap)
- **Buttons**: `px-4 py-2` (default), `px-3 py-1` (small)

## 3. Component Patterns and Conventions

### Class Variance Authority (CVA) Pattern

TaskTrove extensively uses CVA for component variants:

```typescript
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-xs hover:bg-primary/90",
        destructive: "bg-destructive text-white shadow-xs hover:bg-destructive/90",
        outline: "border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md gap-1.5 px-3",
        lg: "h-10 rounded-md px-6",
        icon: "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
)
```

### Data Slot Pattern

Components use `data-slot` attributes for consistent styling:

```typescript
// Button component
<button data-slot="button" className={cn(buttonVariants({ variant, size }))} />

// Card components
<div data-slot="card" className="bg-card text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm" />
<div data-slot="card-header" className="@container/card-header grid auto-rows-min..." />
<div data-slot="card-content" className="px-6" />
```

### State-Based Styling

Components implement sophisticated state management:

```typescript
// Hover and focus states
className={cn(
  "transition-all duration-200",
  "hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600",
  "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
  task.completed && "opacity-60",
  isSelected && "ring-2 ring-blue-500 border-blue-300"
)}
```

## 4. UI Component Library Usage

### Radix UI Integration

TaskTrove uses Radix UI primitives wrapped in custom components:

```typescript
// Dialog implementation
import * as DialogPrimitive from "@radix-ui/react-dialog"

function DialogContent({ className, children, showCloseButton = true, ...props }) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        className={cn(
          "bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border p-6 shadow-lg duration-200 sm:max-w-lg",
          className
        )}
        {...props}
      >
        {children}
      </DialogPrimitive.Content>
    </DialogPortal>
  )
}
```

### Shadcn/ui Configuration

The application uses shadcn/ui with the following configuration:

```json
{
  "style": "default",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "app/globals.css",
    "baseColor": "neutral",
    "cssVariables": true,
    "prefix": ""
  },
  "iconLibrary": "lucide"
}
```

### Component Composition Pattern

TaskTrove uses compound components for complex UI:

```typescript
// Card composition
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Description</CardDescription>
    <CardAction>Action</CardAction>
  </CardHeader>
  <CardContent>Content</CardContent>
  <CardFooter>Footer</CardFooter>
</Card>
```

## 5. Responsive Design Patterns

### Mobile Breakpoint System

```typescript
const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!isMobile
}
```

### Responsive Layout Patterns

**Grid Systems**:

```typescript
// Form layouts
className = "grid grid-cols-2 gap-4"

// Quick action buttons
className = "grid grid-cols-2 gap-2 mb-4"
```

**Sidebar Responsiveness**:

```typescript
// Desktop/mobile sidebar handling
if (isMobile) {
  return (
    <Sheet open={openMobile} onOpenChange={setOpenMobile}>
      <SheetContent
        className="w-(--sidebar-width) bg-sidebar p-0 text-sidebar-foreground"
        style={{ "--sidebar-width": SIDEBAR_WIDTH_MOBILE }}
      >
        {children}
      </SheetContent>
    </Sheet>
  )
}
```

## 6. Animation and Transitions

### CSS Animations

```css
/* Accordion animations */
--animate-accordion-down: accordion-down 0.2s ease-out;
--animate-accordion-up: accordion-up 0.2s ease-out;

@keyframes accordion-down {
  from {
    height: 0;
  }
  to {
    height: var(--radix-accordion-content-height);
  }
}

@keyframes accordion-up {
  from {
    height: var(--radix-accordion-content-height);
  }
  to {
    height: 0;
  }
}
```

### Transition Patterns

**Standard Transitions**:

```typescript
// Hover fade effects
className = "transition-opacity duration-200"

// Component state changes
className = "transition-all duration-200"

// Sidebar animations
className = "transition-all duration-300"
```

**Modal Animations**:

```typescript
className =
  "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
```

### Hover Effects

```typescript
// HoverFadeElement component
function HoverFadeElement({ isVisible, className, children }) {
  return (
    <span
      className={cn(
        "transition-opacity duration-200",
        isVisible ? "opacity-100" : "opacity-0",
        className
      )}
    >
      {children}
    </span>
  )
}
```

## 7. Layout Patterns

### Flexbox Patterns

**Task Item Layout**:

```typescript
// Main container
className = "flex gap-3"

// Left side (checkboxes)
className = "flex items-start gap-3 flex-shrink-0 pt-1"

// Right side (content)
className = "flex-1 min-w-0"

// Title row
className = "flex items-start justify-between gap-2 mb-1"
```

### Grid Patterns

**Card Grid Layout**:

```typescript
className =
  "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto]"
```

### CSS Variables for Dynamic Sizing

```css
/* Sidebar width management */
style={{
  "--sidebar-width": SIDEBAR_WIDTH,
  "--sidebar-width-icon": SIDEBAR_WIDTH_ICON,
}}

/* Container queries */
className="@container/card-header"
```

## 8. Component Composition Patterns

### Atomic Design Approach

- **Atoms**: Basic UI elements (Button, Input, Badge)
- **Molecules**: Form groups, navigation items
- **Organisms**: TaskItem, Sidebar, Header
- **Templates**: Page layouts, dialog structures

### Higher-Order Component Pattern

```typescript
// Customizable popover with sections
interface PopoverSection {
  options: Array<{
    id: string | number
    label: string
    icon?: React.ReactNode
    onClick: () => void
  }>
}

function CustomizablePopover({ sections, children }: {
  sections: PopoverSection[]
  children: React.ReactNode
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent>
        {sections.map((section, index) => (
          <div key={index}>
            {section.options.map((option) => (
              <div key={option.id} onClick={option.onClick}>
                {option.icon}
                {option.label}
              </div>
            ))}
          </div>
        ))}
      </PopoverContent>
    </Popover>
  )
}
```

### Render Props Pattern

```typescript
// Drag and drop with render props
<Droppable droppableId="projects">
  {(provided, snapshot) => (
    <div
      {...provided.droppableProps}
      ref={provided.innerRef}
      className={snapshot.isDraggingOver ? "bg-blue-50 dark:bg-blue-900/30 rounded-lg p-1" : ""}
    >
      {children}
      {provided.placeholder}
    </div>
  )}
</Droppable>
```

## 9. Interactive State Patterns

### Hover States

```typescript
// Task item hover states
onMouseEnter={() => setIsHovered(true)}
onMouseLeave={() => setIsHovered(false)}

// Conditional rendering based on hover
{isHovered && (
  <HoverFadeElement isVisible={isHovered}>
    <Button>Action</Button>
  </HoverFadeElement>
)}
```

### Focus States

```typescript
// Focus management for inline editing
useEffect(() => {
  if (editingTitle && titleInputRef.current) {
    titleInputRef.current.focus()
    titleInputRef.current.select()
  }
}, [editingTitle])
```

### Selection States

```typescript
// Selection visual feedback
className={cn(
  "group relative p-4 bg-white dark:bg-gray-800 rounded-lg border",
  isSelected && "ring-2 ring-blue-500 border-blue-300"
)}
```

## 10. Dark Mode Implementation

### Theme Provider Setup

```typescript
type Theme = "light" | "dark" | "system"

const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme, setTheme] = useState<Theme>("system")

  useEffect(() => {
    const updateActualTheme = () => {
      if (theme === "system") {
        const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light"
        document.documentElement.classList.toggle("dark", systemTheme === "dark")
      } else {
        document.documentElement.classList.toggle("dark", theme === "dark")
      }
    }
    updateActualTheme()
  }, [theme])
}
```

### Dark Mode Color Patterns

```typescript
// Standard dark mode classes
className = "bg-white dark:bg-gray-800"
className = "text-gray-900 dark:text-gray-100"
className = "border-gray-200 dark:border-gray-700"

// Hover states with dark mode
className = "hover:bg-gray-100 dark:hover:bg-gray-700"
```

## Key Implementation Guidelines

1. **Always use `cn()` utility** for class merging to prevent conflicts
2. **Prefer semantic color tokens** over hardcoded colors
3. **Use CVA for component variants** to maintain consistency
4. **Implement proper focus management** for accessibility
5. **Follow the data-slot pattern** for component identification
6. **Use CSS custom properties** for dynamic theming
7. **Implement responsive design** using the useIsMobile hook
8. **Apply consistent spacing** using the established system
9. **Use proper TypeScript types** for all styling props
10. **Follow the compound component pattern** for complex UIs

## Best Practices for Styling

### DO:

- Use semantic color tokens from the theme system
- Implement proper hover and focus states
- Use the `cn()` utility for class composition
- Follow the established spacing system
- Use CVA for component variants
- Implement dark mode for all components
- Use TypeScript for all component props

### DON'T:

- Hardcode colors or spacing values
- Modify shadcn/ui components directly
- Use inline styles for theming
- Ignore accessibility considerations
- Mix different spacing systems
- Use complex CSS without documenting patterns

This styling system provides a robust foundation for consistent, maintainable, and accessible UI development while leveraging modern CSS features and React patterns.
