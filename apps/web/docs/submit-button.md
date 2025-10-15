# SubmitButton Component

A reusable button component that handles loading states and async submissions automatically.

## Features

- Self-contained loading state management
- Built-in error handling and recovery
- Configurable loading text and icons
- Ref support for programmatic access
- TypeScript support

## Basic Usage

```tsx
<SubmitButton
  onSubmit={async () => {
    await createTask(data)
  }}
  disabled={!isValid}
  submittingText="Creating..."
>
  Create Task
</SubmitButton>
```

## Props

- `onSubmit` - Async function to execute when clicked
- `disabled` - Disable button (in addition to loading state)
- `submittingText` - Text to show while submitting
- `loadingIcon` - Custom loading icon
- `loadingIconSize` - Size of loading icon ("sm" | "md" | "lg")
- `hideLoadingIcon` - Hide loading icon when true
- `variant` - Button style variant
- `size` - Button size
- `ref` - Ref for programmatic access

## Using Refs

```tsx
const submitButtonRef = useRef<HTMLButtonElement>(null)

// Programmatic click
submitButtonRef.current?.click()

// Focus management
submitButtonRef.current?.focus()

// Check state
const isDisabled = submitButtonRef.current?.disabled

<SubmitButton ref={submitButtonRef} onSubmit={handleSubmit}>
  Submit
</SubmitButton>
```

## Validation

Use the `disabled` prop for validation:

```tsx
<SubmitButton disabled={!title.trim()} onSubmit={handleSubmit}>
  Add Task
</SubmitButton>
```
