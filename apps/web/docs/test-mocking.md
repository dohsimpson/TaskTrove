# Test Mocking Guide

This guide covers best practices for mocking in TaskTrove tests, focusing on avoiding over-mocking and understanding what's already provided by test-utils.

## What NOT to Mock

### ❌ Translation System (useTranslation, useLanguage)

**Don't mock these - they're handled automatically!**

```typescript
// ❌ AVOID - Unnecessary mocking
vi.mock("@/lib/i18n/client", () => ({
  useTranslation: () => ({
    t: (key: string, fallback: string) => fallback,
  }),
}))

vi.mock("@/components/providers/language-provider", () => ({
  useLanguage: () => ({ language: "en" }),
  LanguageProvider: ({ children }: { children: React.ReactNode }) => children,
}))
```

**Why it's unnecessary:**

- `test-utils/render-with-providers.tsx` automatically provides `LanguageProvider` with `initialLanguage="en"`
- The i18n system has built-in fallbacks that return English strings when no translations are loaded
- Components like `delete-confirm-dialog.tsx` use translations but work fine without mocks

**Example of working component without translation mocks:**

```typescript
// delete-confirm-dialog.test.tsx - No translation mocks needed!
import { render, screen } from "@/test-utils"
import { DeleteConfirmDialog } from "./delete-confirm-dialog"

// Component uses useTranslation internally, but test works without mocks
render(
  <DeleteConfirmDialog
    open={true}
    onOpenChange={mockOnOpenChange}
    onConfirm={mockOnConfirm}
    entityType="task"
    entityName="Test Task"
  />
)
```

## Essential Mocking: What TO Mock

### ✅ Dropdown Menu Components

**Always mock these - portal rendering breaks tests!**

```typescript
// ✅ REQUIRED - Portal components need mocking
vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children, open }: { children: React.ReactNode; open?: boolean }) => (
    <div data-testid="dropdown-menu" data-open={open}>
      {children}
    </div>
  ),
  DropdownMenuTrigger: ({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) => (
    <div data-testid="dropdown-trigger" onClick={() => {}}>{asChild ? children : <div>{children}</div>}</div>
  ),
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dropdown-content">{children}</div>
  ),
  // ... other dropdown components
}))
```

**Why it's necessary:**

- DropdownMenu components render content in React portals
- Portal content is not accessible to testing queries like `screen.getByText()`
- Multiple tests follow this pattern: `nav-user.test.tsx`, `project-group-context-menu.test.tsx`, etc.

### ✅ Other Components That Need Mocking

```typescript
// Modal/Dialog components (if they use portals)
vi.mock("@/components/dialogs/about-modal", () => ({
  AboutModal: ({ open }: { open: boolean }) =>
    open ? <div data-testid="about-modal">About Modal</div> : null,
}))

// External library components
vi.mock("@/components/ui/coming-soon-wrapper", () => ({
  ComingSoonWrapper: ({ children }: { children: React.ReactNode }) => children,
}))

// State management atoms (if needed for isolation)
vi.mock("@/lib/atoms/ui/dialogs", () => ({
  openSettingsDialogAtom: vi.fn(),
}))
```

## What test-utils Provides Automatically

The `test-utils/render-with-providers.tsx` automatically wraps your tests with:

```typescript
// Provided automatically - no need to mock!
<MockRouter {...routerConfig}>
  <TestThemeProvider>
    <LanguageProvider initialLanguage="en">
      <TestJotaiProvider initialValues={initialAtomValues}>
        {children}
      </TestJotaiProvider>
    </LanguageProvider>
  </TestThemeProvider>
</MockRouter>
```

This means you get for free:

- ✅ Language provider with English fallbacks
- ✅ Jotai state management
- ✅ Router mocking
- ✅ Theme provider
- ✅ All the context these provide to child components

## How to Check if Something Needs Mocking

1. **Look at existing tests** - Find similar components and see what they mock
2. **Try without mocking first** - Often test-utils provide what you need
3. **Portal components always need mocking** - Dropdown, Dialog, Popover, etc.
4. **External libraries usually need mocking** - Third-party components, API calls
5. **Translation systems don't need mocking** - test-utils handle this

## Testing Pattern Examples

### ✅ Good: Minimal necessary mocks

```typescript
import { render, screen } from "@/test-utils"

// Only mock what's actually needed
vi.mock("@/components/ui/dropdown-menu", () => ({ /* portal components */ }))

describe("MyComponent", () => {
  it("works with automatic providers", () => {
    render(<MyComponent />) // Gets language, state, router automatically
    expect(screen.getByText("Submit")).toBeInTheDocument()
  })
})
```

### ❌ Bad: Over-mocking

```typescript
import { render, screen } from "@/test-utils"

// Unnecessary mocks - test-utils provide these!
vi.mock("@/lib/i18n/client", () => ({ /* ... */ }))
vi.mock("@/components/providers/language-provider", () => ({ /* ... */ }))
vi.mock("jotai", () => ({ /* ... */ }))

describe("MyComponent", () => {
  it("has redundant mocks", () => {
    render(<MyComponent />)
    expect(screen.getByText("Submit")).toBeInTheDocument()
  })
})
```

## Debugging Mock Issues

If a test fails:

1. **Check the error message** - "Unable to find element" often means portal/dropdown issue
2. **Look at the rendered HTML** - Use `screen.debug()` to see what's actually rendered
3. **Compare with working tests** - Find a similar component's test for patterns
4. **Remove mocks one by one** - See what's actually needed vs redundant

## Real-World Example

The `nav-user.test.tsx` was initially over-mocked:

```typescript
// ❌ Before: Over-mocked
vi.mock("@/lib/i18n/client", () => ({
  /* unnecessary */
}))
vi.mock("@/components/providers/language-provider", () => ({
  /* unnecessary */
}))
vi.mock("@/components/ui/dropdown-menu", () => ({
  /* necessary */
}))

// ✅ After: Optimized
// Translation mocks removed - test-utils provide LanguageProvider globally
vi.mock("@/components/ui/dropdown-menu", () => ({
  /* necessary for portals */
}))
```

Result: Same functionality, less code, easier maintenance, and following established patterns.

## Summary

- **Default to minimal mocking** - test-utils provide comprehensive setup
- **Always mock portal components** - dropdown, dialog, popover
- **Never mock translation system** - automatic fallbacks work
- **Study existing tests** - follow established patterns
- **When in doubt, try without mocking first** - often it just works
