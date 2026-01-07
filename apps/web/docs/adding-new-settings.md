# Adding New Settings to TaskTrove

This guide explains how to add new settings to TaskTrove's settings system, covering the complete end-to-end flow from UI to storage.

## Table of Contents

- [Overview](#overview)
- [Current Settings Architecture](#current-settings-architecture)
- [Step-by-Step Guide](#step-by-step-guide)
- [Examples](#examples)
- [Testing](#testing)
- [Best Practices](#best-practices)

## Overview

TaskTrove uses a layered settings architecture with:

- **Frontend**: React components with Jotai state management
- **API**: Next.js API routes with Zod validation
- **Storage**: JSON file persistence with optimistic updates
- **Types**: Zod-first type definitions with full type safety

## Current Settings Architecture

### Settings Categories

Currently implemented:

- **General**: General settings
- **Notifications**: notification preferences
- **Data**: Data related settings

Planned for future:

- **Appearance**: Themes, colors, density
- **Behavior**: Confirmations, defaults, shortcuts
- **Productivity**: Pomodoro, goals, analytics
- **API**: Webhooks, developer tools

### File Structure

```
components/dialogs/
├── settings-dialog.tsx          # Main dialog container
└── settings-forms/
    ├── general-form.tsx         # General settings
    ├── notifications-form.tsx   # Notification settings
    ├── data-form.tsx           # Data & storage settings
    ├── appearance-form.tsx     # (Future)
    ├── behavior-form.tsx       # (Future)
    ├── productivity-form.tsx   # (Future)
    └── api-form.tsx           # (Future)

lib/atoms/
├── core/
│   ├── base.ts                # Base atoms with TanStack Query
│   └── settings.ts            # Settings-specific atoms
└── ui/
    └── user-settings-atom.ts  # UI-focused settings atoms

lib/types/                     # Modular type definitions (core, settings, etc.)
app/api/settings/route.ts      # Settings API endpoint
```

## Step-by-Step Guide

### 1. Add Types (lib/types/)

First, define your settings schema and types:

```typescript
// 1. Define the Zod schema - NO .default() or .optional()
export const YourSettingsSchema = z.object({
  yourField: z.boolean(), // Required
  anotherField: z.string(), // Required
  numericField: z.number().min(0).max(100), // Required with validation
})

// 2. Generate TypeScript type
export type YourSettings = z.infer<typeof YourSettingsSchema>

// 3. Add to UserSettingsSchema
export const UserSettingsSchema = z.object({
  data: DataSettingsSchema,
  notifications: NotificationSettingsSchema,
  general: GeneralSettingsSchema,
  yourCategory: YourSettingsSchema, // Add your category here
})

// 4. Update PartialUserSettingsSchema for updates
export const PartialUserSettingsSchema = z.object({
  data: DataSettingsSchema.partial().optional(),
  notifications: NotificationSettingsSchema.partial().optional(),
  general: GeneralSettingsSchema.partial().optional(),
  yourCategory: YourSettingsSchema.partial().optional(), // Partial updates only
})
```

### 2. Update Default Values

Add defaults in the appropriate files:

**lib/types/defaults.ts** (create if needed):

```typescript
export const DEFAULT_YOUR_SETTINGS: YourSettings = {
  yourField: false,
  anotherField: "default-value",
  numericField: 50,
}
```

**lib/atoms/core/base.ts** (update EMPTY_CACHE_DATA):

```typescript
const EMPTY_CACHE_DATA: DataFile = {
  // ... existing fields
  settings: {
    data: {
      /* ... */
    },
    notifications: DEFAULT_NOTIFICATION_SETTINGS,
    general: DEFAULT_GENERAL_SETTINGS,
    yourCategory: DEFAULT_YOUR_SETTINGS, // Add here
  },
}
```

### 3. Update API Route (app/api/settings/route.ts)

Add your settings to the merge logic in the `updateSettings` function:

```typescript
// Merge partial settings with current settings
const updatedSettings: UserSettings = {
  // ... existing categories
  yourCategory: {
    yourField:
      partialSettings.yourCategory?.yourField ??
      fileData.settings.yourCategory?.yourField ??
      DEFAULT_YOUR_SETTINGS.yourField,
    anotherField:
      partialSettings.yourCategory?.anotherField ??
      fileData.settings.yourCategory?.anotherField ??
      DEFAULT_YOUR_SETTINGS.anotherField,
    numericField:
      partialSettings.yourCategory?.numericField ??
      fileData.settings.yourCategory?.numericField ??
      DEFAULT_YOUR_SETTINGS.numericField,
  },
}
```

Also update the test response factory in the `updateSettingsMutationAtom`:

```typescript
testResponseFactory: (variables: UpdateSettingsRequest) => {
  const testUserSettings: UserSettings = {
    // ... existing categories
    yourCategory: {
      yourField: variables.settings.yourCategory?.yourField ?? DEFAULT_YOUR_SETTINGS.yourField,
      anotherField:
        variables.settings.yourCategory?.anotherField ?? DEFAULT_YOUR_SETTINGS.anotherField,
      numericField:
        variables.settings.yourCategory?.numericField ?? DEFAULT_YOUR_SETTINGS.numericField,
    },
  }
  return {
    success: true,
    settings: testUserSettings,
    message: "Settings updated successfully (test mode)",
  }
}
```

### 4. Create Settings Form Component

Create `components/dialogs/settings-forms/your-category-form.tsx`:

```tsx
"use client"

import React from "react"
import { useAtomValue, useSetAtom } from "jotai"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { SettingsCard } from "@/components/ui/custom/settings-card"
import { settingsAtom, updateSettingsAtom } from "@/lib/atoms"
import type { YourSettings } from "@tasktrove/types/settings"

export function YourCategoryForm() {
  const settings = useAtomValue(settingsAtom)
  const updateSettings = useSetAtom(updateSettingsAtom)

  // Get current settings with fallbacks
  const yourSettings = settings.yourCategory

  const handleUpdate = (updates: Partial<YourSettings>) => {
    updateSettings({
      yourCategory: updates,
    })
  }

  return (
    <div className="space-y-6">
      <SettingsCard title="Your Category Settings">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="your-field">Your Boolean Field</Label>
            <p className="text-sm text-muted-foreground">Description of what this setting does</p>
          </div>
          <Switch
            id="your-field"
            checked={yourSettings.yourField}
            onCheckedChange={(yourField) => handleUpdate({ yourField })}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="another-field">String Field</Label>
            <p className="text-sm text-muted-foreground">Enter a value for this setting</p>
          </div>
          <Input
            id="another-field"
            value={yourSettings.anotherField}
            onChange={(e) => handleUpdate({ anotherField: e.target.value })}
            className="w-48"
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="numeric-field">Numeric Field: {yourSettings.numericField}</Label>
            <p className="text-sm text-muted-foreground">Adjust the numeric value (0-100)</p>
          </div>
          <Input
            id="numeric-field"
            type="number"
            min="0"
            max="100"
            value={yourSettings.numericField}
            onChange={(e) => handleUpdate({ numericField: parseInt(e.target.value) })}
            className="w-20"
          />
        </div>
      </SettingsCard>
    </div>
  )
}
```

### 5. Add to Settings Dialog

Update `components/dialogs/settings-dialog.tsx`:

```tsx
// 1. Import your form
import { YourCategoryForm } from "./settings-forms/your-category-form"

// 2. Add to settings categories array
const settingsCategories: SettingsCategory[] = [
  // ... existing categories
  {
    id: "your-category",
    title: "Your Category",
    icon: YourIcon, // Import appropriate icon
    description: "Your category description",
  },
]

// 3. Add to renderCategoryContent function
const renderCategoryContent = () => {
  switch (activeCategory) {
    // ... existing cases
    case "your-category":
      return <YourCategoryForm />
    default:
      return null
  }
}
```

### 6. Create Atoms (Optional)

For complex settings, create dedicated atoms in `lib/atoms/ui/user-settings-atom.ts`:

```typescript
/**
 * Your category settings atom
 */
export const yourCategorySettingsAtom = atom(
  (get) => get(settingsAtom).yourCategory,
  async (get, set, updates: Partial<YourSettings>) => {
    await set(updateSettingsAtom, { yourCategory: updates })
  },
)

/**
 * Specific field atom for granular updates
 */
export const updateYourFieldAtom = atom(null, async (get, set, yourField: boolean) => {
  await set(updateSettingsAtom, { yourCategory: { yourField } })
})
```

## Examples

### Boolean Setting with Switch

```tsx
<Switch
  checked={settings.yourCategory.enabled}
  onCheckedChange={(enabled) => updateSettings({ yourCategory: { enabled } })}
/>
```

### Select Dropdown

```tsx
<Select
  value={settings.yourCategory.mode}
  onValueChange={(mode) => updateSettings({ yourCategory: { mode } })}
>
  <SelectContent>
    <SelectItem value="option1">Option 1</SelectItem>
    <SelectItem value="option2">Option 2</SelectItem>
  </SelectContent>
</Select>
```

### Numeric Input with Validation

```tsx
<Input
  type="number"
  min="1"
  max="100"
  value={settings.yourCategory.count}
  onChange={(e) => {
    const count = parseInt(e.target.value)
    if (!isNaN(count) && count >= 1 && count <= 100) {
      updateSettings({ yourCategory: { count } })
    }
  }}
/>
```

## Testing

### 1. Component Tests

Create `components/dialogs/settings-forms/your-category-form.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { Provider } from "jotai"
import { YourCategoryForm } from "./your-category-form"

describe("YourCategoryForm", () => {
  it("renders settings correctly", () => {
    render(
      <Provider>
        <YourCategoryForm />
      </Provider>,
    )

    expect(screen.getByLabelText("Your Boolean Field")).toBeInTheDocument()
    expect(screen.getByLabelText("String Field")).toBeInTheDocument()
  })

  it("updates settings when changed", async () => {
    const user = userEvent.setup()

    render(
      <Provider>
        <YourCategoryForm />
      </Provider>,
    )

    const toggle = screen.getByLabelText("Your Boolean Field")
    await user.click(toggle)

    // Add assertions for state changes
  })
})
```

### 2. API Tests

Test the settings endpoint handles your new category:

```typescript
// In your API tests
it("should update your category settings", async () => {
  const response = await request(app)
    .patch("/api/settings")
    .send({
      settings: {
        yourCategory: {
          yourField: true,
          anotherField: "updated-value",
        },
      },
    })

  expect(response.status).toBe(200)
  expect(response.body.settings.yourCategory.yourField).toBe(true)
})
```

### 3. Type Tests

Verify your types are correctly integrated:

```typescript
// Check that your settings are included in UserSettings
const settings: UserSettings = {
  data: {
    /* ... */
  },
  notifications: {
    /* ... */
  },
  general: {
    /* ... */
  },
  yourCategory: {
    yourField: true,
    anotherField: "test",
    numericField: 42,
  },
}
```

## Best Practices

### 1. Type Safety

- **Always use Zod schemas first**, then generate TypeScript types with `z.infer<>`
- **NEVER use `.default()` in Zod schemas** - defaults are handled at runtime via constants
- **NEVER use `.optional()` unless absolutely necessary** - it creates undefined states to manage
- **Prefer required types** - handle missing fields through migrations and API updates
- **Use branded types** for IDs and specific value types

**Correct approach:**

```typescript
// ❌ WRONG - creates optional undefined states
export const SettingsSchema = z.object({
  field1: z.boolean().default(true), // Don't use .default()
  field2: z.string().optional(), // Avoid .optional()
})

// ✅ CORRECT - required types with runtime defaults
export const SettingsSchema = z.object({
  field1: z.boolean(), // Required
  field2: z.string(), // Required
})

// Defaults handled separately in constants
export const DEFAULT_SETTINGS = {
  field1: true,
  field2: "default-value",
} as const
```

### 2. User Experience

- Use descriptive labels and help text
- Group related settings in SettingsCard components
- Provide immediate visual feedback for changes
- Use appropriate input components (Switch for booleans, Select for enums)

### 3. Performance

- Use optimistic updates for instant UI feedback
- Debounce frequent changes (like text inputs)
- Only update changed fields, not entire objects

### 4. Validation

- Validate on both client and server
- Provide clear error messages
- Use proper input constraints (min/max, patterns)

### 5. Future-Proofing

- Design schemas to be extensible
- Use optional fields for new features
- Provide migration logic for schema changes

### 6. Testing

- Test both happy and error paths
- Mock API calls in component tests
- Test settings persistence and retrieval
- Verify optimistic updates and rollbacks

### 7. Documentation

- Document what each setting does
- Explain any constraints or side effects
- Provide examples of valid values
- Update this guide when adding new patterns

### 8. Migration Considerations

**CRITICAL:** Since we use required types (no `.optional()` or `.default()`), every new field needs data migration:

- **Add migration function** to `lib/utils/data-migration.ts` for the next version
- **Migration must populate required field** with value from constants (not schema default)
- **Update tutorial data** in `lib/constants/tutorial-data.json` to include the new field
- **Test migration** with `pnpm test:file lib/utils/data-migration.test.ts`
- **Do NOT bump package.json version** until ready to release

**Example migration function:**

```typescript
function v060Migration(dataFile: Json): Json {
  console.log("Migrating data file from v0.5.0 to v0.6.0...")
  console.log("Adding soundEnabled field to general settings")

  // Handle settings migration
  if (typeof result.settings === "object" && result.settings !== null) {
    const settings = result.settings as Record<string, unknown>

    if (typeof settings.general === "object" && settings.general !== null) {
      const general = settings.general as Record<string, unknown>

      // Add required field with default from constants
      if (!("soundEnabled" in general)) {
        console.log("✓ Adding soundEnabled field to general settings")
        general.soundEnabled = DEFAULT_GENERAL_SETTINGS.soundEnabled
      }
    }
  }

  console.log("✓ soundEnabled migration completed")
  return JSON.parse(JSON.stringify(result))
}
```

**Required updates for new migrations:**

1. Add migration function to `migrationFunctions` array
2. Use constants for default values, not schema defaults
3. Update tutorial data version and add required fields
4. Only bump package.json version when releasing

**Why this approach:**

- **Type safety**: No undefined states from optional fields
- **Predictability**: All fields are always present after migration
- **Maintainability**: Single source of truth for defaults in constants

## Common Patterns

### Nested Settings Object

```typescript
export const AdvancedSettingsSchema = z.object({
  section1: z.object({
    field1: z.boolean(),
    field2: z.string(),
  }),
  section2: z.object({
    field3: z.number(),
  }),
})
```

### Enum/Select Settings

```typescript
export const ThemeSettingsSchema = z.object({
  mode: z.enum(["light", "dark", "system"]),
  density: z.enum(["compact", "comfortable", "spacious"]),
})
```

### Array Settings

```typescript
export const ListSettingsSchema = z.object({
  allowedValues: z.array(z.string()),
  selectedItems: z.array(z.string()),
})
```

### Conditional Settings

```typescript
// ❌ AVOID - creates undefined states
export const ConditionalSettingsSchema = z.object({
  enabled: z.boolean(),
  config: z
    .object({
      value: z.string(),
    })
    .optional(), // Avoid .optional()
})

// ✅ BETTER - use discriminated unions or separate required fields
export const ConditionalSettingsSchema = z.object({
  enabled: z.boolean(),
  configValue: z.string(), // Always required, handle logic in UI
})

// ✅ OR use discriminated union for complex cases
export const ConditionalSettingsSchema = z.discriminatedUnion("enabled", [
  z.object({ enabled: z.literal(false) }),
  z.object({ enabled: z.literal(true), configValue: z.string() }),
])
```

This guide should cover everything needed to add new settings to TaskTrove while maintaining consistency with the existing architecture and patterns.
