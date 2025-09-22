# Theme-Aware Coloring

For UI elements that need to work in both light and dark modes, use semi-transparent backgrounds with mid-range text colors:

```typescript
// ✅ Good - adapts to theme
"bg-purple-500/20 text-purple-300"

// ❌ Bad - fixed contrast
"bg-purple-200 text-purple-900"
```

**Why it works:**

- `/20` opacity creates subtle backgrounds that inherit the underlying theme
- `-300` text colors provide good contrast in both modes
- No explicit dark mode detection needed - colors naturally adapt

Used in: Enhanced highlighted input tokens, syntax highlighting.
