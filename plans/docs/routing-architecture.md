# TaskTrove Routing Architecture

This document provides a comprehensive overview of TaskTrove's custom routing system, which uses a hybrid approach combining Next.js App Router with client-side route handling.

## Table of Contents

1. [System Overview](#system-overview)
2. [Route Types](#route-types)
3. [Component Architecture](#component-architecture)
4. [State Management Integration](#state-management-integration)
5. [Navigation Flow](#navigation-flow)
6. [Adding New Routes](#adding-new-routes)
7. [Technical Deep Dive](#technical-deep-dive)

## System Overview

TaskTrove uses a **hybrid routing system** that combines:

- **Next.js App Router** for URL management and SSR support
- **Client-side route detection** for dynamic content rendering
- **Jotai state management** for view state persistence
- **Custom view identifier system** for complex routing logic

### Key Characteristics

- **Page files are placeholders** - All `page.tsx` files return `null`
- **Client-side route handling** - `MainLayoutWrapper` detects routes and manages content
- **Per-route state persistence** - Each route maintains independent view state
- **Dynamic route generation** - Projects and labels create routes dynamically

## Route Types

### 1. Standard Routes

Fixed routes that map directly to specific views:

```typescript
type StandardViewId =
  | "inbox" // /inbox
  | "today" // /today
  | "upcoming" // /upcoming
  | "completed" // /completed
  | "analytics" // /analytics
  | "search" // /search
```

### 2. Dynamic Routes

Routes generated dynamically based on data:

```typescript
type ViewId = StandardViewId | ProjectId | LabelId // Uses typed UUIDs directly
// /projects/{projectId} → ViewId is the ProjectId (UUID)
// /labels/{labelId} → ViewId is the LabelId (UUID)
// /filters/{filterId} → ViewId is the FilterId (UUID)
```

### 3. Special Routes

Routes with custom handling logic:

```typescript
// Static pages with custom components
"/settings" // SettingsPage component
"/search" // SearchPage component
"/debug" // SoundTester component (dev only)
```

## Component Architecture

### Routing Flow

```
URL Change → Next.js Router → MainLayoutWrapper → RouteContent → Specific Component
```

### 1. MainLayoutWrapper (`components/layout/main-layout-wrapper.tsx`)

**Primary routing coordinator** - Detects pathname changes and manages view state.

```typescript
// Route detection logic
useEffect(() => {
  const getCurrentView = () => {
    if (pathname.startsWith("/projects/")) {
      const projectId = pathname.split("/")[2]
      return projectId as ProjectId // Direct UUID, no prefix
    }
    if (pathname.startsWith("/labels/")) {
      const labelId = pathname.split("/")[2]
      return labelId as LabelId // Direct UUID, no prefix
    }
    if (pathname.startsWith("/filters/")) {
      const filterId = pathname.split("/")[2]
      return filterId as FilterId // Direct UUID, no prefix
    }
    return pathname.slice(1) || "today"
  }

  setCurrentView(getCurrentView())
}, [pathname, setCurrentView])
```

**Key Responsibilities:**

- Convert URL paths to ViewId format
- Update `currentViewAtom` when routes change
- Manage global layout and sidebar state
- Handle drag-and-drop operations across views

### 2. RouteContent (`components/layout/route-content.tsx`)

**Content router** - Determines which component to render based on pathname.

```typescript
export function RouteContent({ /* props */ }) {
  const pathname = useAtomValue(pathnameAtom)

  // Special route handling
  if (pathname === "/search") {
    return <SearchPage onTaskClick={onTaskClick} />
  }

  if (pathname === "/settings") {
    return <SettingsPage />
  }

  if (pathname === "/debug") {
    // Environment-specific rendering
    if (process.env.NODE_ENV !== 'development') {
      return <DebugNotAvailableMessage />
    }
    return <DebugPageContent />
  }

  // Default: render MainContent with current view
  return <MainContent currentView={currentView} {/* ...props */} />
}
```

### 3. MainContent (`components/layout/main-content.tsx`)

**View renderer** - Handles task-related views with different modes (list/kanban/calendar).

```typescript
// View-based task filtering
useEffect(() => {
  let filtered: any[] = []

  switch (currentView) {
    case "inbox":
      filtered = inboxTasks
      break
    case "today":
      filtered = todayTasks
      break
    case "upcoming":
      filtered = upcomingTasks
      break
    case "completed":
      filtered = completedTasks
      break
    default:
      // Handle project/label views using route context
      if (routeContext.routeType === "project") {
        filtered = allTasks.filter((task) => task.projectId === currentView)
      }
      if (routeContext.routeType === "label") {
        filtered = allTasks.filter((task) => task.labelIds?.includes(currentView))
      }
      break
  }

  setFilteredTasks(filtered)
}, [currentView, currentProjectId /* ...deps */])
```

### 4. Navigation Components

**Sidebar Navigation** (`components/navigation/sidebar-nav.tsx`) - Generates navigation links.

```typescript
// Standard navigation items
const sections: NavSection[] = [
  {
    title: "Main",
    items: [
      { id: "inbox", label: "Inbox", href: "/inbox" },
      { id: "today", label: "Today", href: "/today" },
      { id: "upcoming", label: "Upcoming", href: "/upcoming" },
      { id: "completed", label: "Completed", href: "/completed" },
    ],
  },
  // Dynamic sections for projects and labels
]

// Project links generated dynamically
projects.map((project) => ({
  href: `/projects/${project.id}`,
  // ...
}))
```

## State Management Integration

### View State Persistence

Each route maintains independent view state using Jotai atoms:

```typescript
// View state stored per route/project
export const viewStatesAtom = createAtomWithStorage<Record<string, ViewState>>(
  "view-states",
  {},
  {
    /* serialization config */
  },
)

// Current active view
export const currentViewAtom = atom<string>("today")

// Current view's state (derived)
export const currentViewStateAtom = atom<ViewState>((get) => {
  const currentView = get(currentViewAtom)
  const viewStates = get(viewStatesAtom)
  return viewStates[currentView] || defaultViewState
})
```

### ViewState Structure

```typescript
interface ViewState {
  viewMode: "list" | "kanban" | "calendar"
  sortBy: string
  sortDirection: "asc" | "desc"
  showCompleted: boolean
  searchQuery: string
  showSidePanel: boolean
}
```

### State Actions

```typescript
// Update view mode for current route
const setViewMode = useSetAtom(setViewModeAtom)
setViewMode("kanban") // Updates only current view's state

// Update sorting for current route
const setSorting = useSetAtom(setSortingAtom)
setSorting({ sortBy: "priority", sortDirection: "desc" })
```

## Navigation Flow

### 1. User Clicks Navigation Link

```
User clicks "/today" → Next.js router updates URL
```

### 2. Route Detection

```
MainLayoutWrapper.useEffect triggers →
getCurrentView() returns "today" →
setCurrentView("today") updates currentViewAtom
```

### 3. Content Rendering

```
RouteContent receives new pathname →
Determines no special handling needed →
Renders MainContent with currentView="today"
```

### 4. View State Loading

```
currentViewStateAtom derives state for "today" →
MainContent filters tasks for today view →
Component renders with today's tasks
```

### 5. State Persistence

```
User changes view mode to kanban →
setViewModeAtom updates viewStatesAtom["today"] →
State persists to localStorage →
Next visit to /today restores kanban mode
```

## Adding New Routes

### 1. Standard Routes

Add to `StandardViewId` type and handle in `MainContent`:

```typescript
// lib/types/index.ts
export type StandardViewId =
  | "inbox"
  | "today"
  | "upcoming"
  | "completed"
  | "analytics"
  | "search"
  | "my-new-route"  // Add here

// components/layout/main-content.tsx
switch (currentView) {
  case "my-new-route":
    return <MyNewRouteComponent />
  // ...
}
```

### 2. Special Routes

Add handling in `RouteContent`:

```typescript
// components/layout/route-content.tsx
if (pathname === "/my-special-route") {
  return <MySpecialComponent />
}
```

### 3. Page File

Create placeholder page file:

```typescript
// app/my-new-route/page.tsx
export const metadata = {
  title: "My New Route - TaskTrove",
  description: "Description of the new route",
}

export default function MyNewRoutePage() {
  return null // Content handled by RouteContent
}
```

### 4. Navigation

Add to sidebar navigation:

```typescript
// components/navigation/sidebar-nav.tsx
{
  id: "my-new-route",
  label: "My New Route",
  icon: <MyIcon className="h-4 w-4" />,
  href: "/my-new-route",
}
```

## Technical Deep Dive

### Why This Architecture?

**Advantages:**

1. **Unified Layout** - All routes share the same layout structure
2. **State Persistence** - Each route maintains independent view state
3. **Performance** - Client-side navigation without full page reloads
4. **Flexibility** - Easy to add complex routing logic
5. **SSR Support** - Next.js handles initial page loads and SEO

**Trade-offs:**

1. **Complexity** - More complex than standard Next.js routing
2. **Bundle Size** - All route components loaded upfront
3. **Learning Curve** - Custom patterns vs. standard Next.js

### ViewId System

The ViewId system enables sophisticated task organization using typed identifiers for projects and labels.

### Project ID Mapping

Special logic maps views to project contexts:

```typescript
const getCurrentProjectId = () => {
  if (pathname.startsWith("/projects/")) {
    return pathname.split("/")[2] // Actual project ID
  }
  if (pathname === "/inbox") {
    return INBOX_PROJECT_ID // Special inbox project
  }
  // Other views get synthetic project IDs
  const view = pathname.slice(1) || "today"
  return `view-${view}` // e.g., "view-today"
}
```

### Environment-Specific Routes

Debug routes demonstrate conditional rendering:

```typescript
if (pathname === "/debug") {
  if (process.env.NODE_ENV !== 'development') {
    return <DebugNotAvailable />  // Production
  }
  return <SoundTester />          // Development only
}
```

### Drag & Drop Integration

The routing system integrates with drag-and-drop operations:

```typescript
// MainLayoutWrapper.handleGlobalDragEnd
const getCurrentViewId = (): ViewId => {
  if (pathname.startsWith("/projects/")) {
    const projectId = pathname.split("/")[2]
    return projectId as ProjectId // Direct UUID
  }
  if (pathname.startsWith("/labels/")) {
    const labelId = pathname.split("/")[2]
    return labelId as LabelId // Direct UUID
  }
  // ... more route mapping
  return (pathname.slice(1) || "today") as ViewId
}
```

## Best Practices

### 1. Route Naming

- Use consistent kebab-case URLs: `/my-route`
- Project routes: `/projects/{id}`
- Label routes: `/labels/{name}`
- Keep URLs descriptive and SEO-friendly

### 2. State Management

- Always use typed ViewId types (StandardViewId | ProjectId | LabelId)
- Persist view state for better UX
- Use derived atoms for computed values
- Handle loading states gracefully

### 3. Component Structure

- Keep RouteContent focused on routing logic
- Put view-specific logic in dedicated components
- Use consistent props interfaces
- Handle error states appropriately

### 4. Performance

- Lazy load heavy components when possible
- Use React.memo for expensive renders
- Optimize re-renders with proper dependencies
- Monitor bundle size impact

This architecture provides a solid foundation for TaskTrove's complex routing needs while maintaining performance and developer experience.
