# TaskTrove Internationalization Guide

This document provides a comprehensive guide for implementing internationalization (i18n) across the TaskTrove codebase. It covers the established translation architecture, implementation patterns, and best practices learned from implementing translation support for components like dialogs, navigation, and layout.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Tool Selection](#tool-selection)
- [Implementation Process](#implementation-process)
- [Common Errors and Prevention](#common-errors-and-prevention)
- [Testing and Validation](#testing-and-validation)
- [Scaling Guidelines](#scaling-guidelines)
- [Automation Workflow](#automation-workflow)

## Overview

### Approach: Colocated Translations with Inline Defaults

**Key Principles:**

- **Colocated**: Translation files live next to component code (`component/i18n/{lang}/namespace.json`)
- **Inline defaults**: English text visible in code via `t('key', 'default value')` pattern
- **Automated extraction**: Use i18next-parser to generate translation files from code
- **Fallback behavior**: Missing translations fall back to inline English defaults

**Benefits:**

- ✅ **Developer Experience**: English text visible in code for context
- ✅ **Maintainability**: Translations stay synchronized with components
- ✅ **Automation**: No manual key management required
- ✅ **Scalability**: Each feature area can have its own translation namespace

## Architecture

### Directory Structure

```
components/
├── dialogs/
│   ├── i18n/
│   │   └── zh/
│   │       └── dialogs.json  # Only non-English files needed!
│   └── delete-confirm-dialog.tsx
├── navigation/
│   ├── i18n/
│   │   └── zh/
│   │       └── navigation.json
│   └── main-nav.tsx
```

### Translation Loading Strategy

**English = Inline Defaults (No Files Needed):**
Since we use `t('key', 'default value')`, English translations live in the code. No English translation files are generated or needed - this eliminates duplication and makes English the single source of truth.

**Non-English = Translation Files:**

- Primary: Colocated translations (`@/components/{feature}/i18n/{lang}/{namespace}.json`)
- Fallback: Main translations (`@/lib/i18n/locales/{lang}/{namespace}.json`)
- Ultimate fallback: Inline defaults from code

## Tool Selection

### ✅ Recommended: i18next-parser

**Why i18next-parser over i18next-scanner:**

- ✅ **Native TypeScript support** (.ts/.tsx files)
- ✅ **3x more popular** (417k vs 137k weekly downloads)
- ✅ **Active maintenance** (updated 7 months ago vs 1 year)
- ✅ **Better React integration** with comprehensive JSX lexer

### ❌ Avoid: i18next-scanner

- ❌ No native TypeScript support
- ❌ Requires additional packages for .tsx files
- ❌ Less active maintenance

## Implementation Process

### Step 1: Install Dependencies

```bash
pnpm add -D i18next-parser
```

### Step 2: Create Parser Configuration

Create `i18next-parser-{scope}.config.js`:

```javascript
// Example: i18next-parser-components.config.js
export default {
  input: [
    "components/**/*.{ts,tsx}",
    "!components/**/*.test.{ts,tsx}",
    "!components/**/*.spec.{ts,tsx}",
  ],
  output: "components/$DIR/i18n/$LOCALE/$NAMESPACE.json",
  locales: ["zh"], // Only generate non-English files (English uses inline defaults)
  defaultNamespace: "component",
  lexers: {
    ts: ["JsxLexer"],
    tsx: ["JsxLexer"],
  },
  defaultValue: function (locale, namespace, key, value) {
    // English files not generated - inline defaults used instead
    // For non-English: return undefined to omit keys (allows fallback to inline defaults)
    return undefined
  },
  keepRemoved: false,
  sort: true,
  jsonIndent: 2,
  lineEnding: "\n",
  nsSeparator: ":",
  keySeparator: ".",
  options: {
    func: {
      list: ["t", "i18n.t"],
      extensions: [".ts", ".tsx"],
    },
    trans: {
      component: "Trans",
      i18nKey: "i18nKey",
      extensions: [".ts", ".tsx"],
    },
  },
}
```

### Step 3: Update i18n Infrastructure

**Extend Resource Backend (`lib/i18n/resources.ts`):**

```typescript
export function createCombinedResourceBackend() {
  return resourcesToBackend(async (language: string, namespace: string) => {
    // For English, skip colocated files and use inline defaults
    if (language === "en") {
      try {
        return await import(`@/lib/i18n/locales/${language}/${namespace}.json`)
      } catch (error) {
        // No English file found - let i18next use inline defaults
        throw error
      }
    }

    // For non-English, try colocated translations first
    if (["dialogs", "navigation", "tasks"].includes(namespace)) {
      try {
        return await import(`@/components/${namespace}/i18n/${language}/${namespace}.json`)
      } catch (error) {
        console.warn(`Failed to load colocated ${namespace} translation for ${language}:`, error)
      }
    }

    // Fallback to main translations
    try {
      return await import(`@/lib/i18n/locales/${language}/${namespace}.json`)
    } catch (error) {
      console.warn(`Failed to load main translation for ${language}/${namespace}:`, error)
      throw error
    }
  })
}
```

**Update Settings (`lib/i18n/settings.ts`):**

```typescript
export const namespaces = ["common", "dialogs", "navigation", "tasks"] as const
```

### Step 4: Convert Components

**Pattern:**

```typescript
// Before
const title = "Delete Task"
const description = `Are you sure you want to delete "${taskName}"?`

// After
const { language } = useLanguage()
const { t } = useTranslation(language, "dialogs")

const title = t("delete.task.title", "Delete Task")
const description = t("delete.task.description", 'Are you sure you want to delete "{{- name}}"?', {
  name: taskName,
})
```

### Step 5: Generate Translation Files

```bash
pnpm i18n:extract:components
```

### Step 6: Add Translations

Edit the generated non-English files to add translations. English uses inline defaults - no files needed!

### Step 7: Fix Unit Tests

After adding translations, simply update the import to use test-utils instead of testing-library:

```typescript
// Change only this import line
- import { render, screen, fireEvent } from "@testing-library/react"
+ import { render, screen, fireEvent } from "@/test-utils"

// All existing render calls work unchanged - zero boilerplate!
render(<YourComponent {...props} />)
```

### Test-Utils Integration

The `@/test-utils` render function automatically provides all necessary testing context:

```typescript
// Located in test-utils/render-with-providers.tsx
const AllTheProviders = ({ children, ... }) => (
  <MockRouter {...routerConfig}>
    <TestThemeProvider>
      <LanguageProvider initialLanguage="en">  {/* Auto-included! */}
        <TestJotaiProvider initialValues={initialAtomValues}>
          {children}
        </TestJotaiProvider>
      </LanguageProvider>
    </TestThemeProvider>
  </MockRouter>
)
```

**Benefits:**

- ✅ **Zero boilerplate** - no test wrapper code needed
- ✅ **Consistent testing** - all components get same providers
- ✅ **Maintainable** - provider changes apply globally
- ✅ **Backwards compatible** - existing tests work unchanged

## Common Errors and Prevention

### 1. English File Redundancy (Optimization)

**Problem:** Generating English translation files duplicates inline defaults.

**❌ Redundant:**

```typescript
// Code
t("delete.task.title", "Delete Task")

// English file (unnecessary duplication!)
{
  "delete": {
    "task": {
      "title": "Delete Task"
    }
  }
}
```

**✅ Optimized:**

```typescript
// Code (single source of truth)
t("delete.task.title", "Delete Task")

// No English file needed - inline defaults used
// Only generate non-English files
```

**Benefits:**

- ✅ **DRY Principle** - No duplication
- ✅ **Single source of truth** - English lives in code
- ✅ **Simpler workflow** - Fewer files to maintain

### 2. Empty String Fallback Issue

**Problem:** i18next treats empty strings (`""`) as valid translations, preventing fallback to defaults.

**❌ Wrong:**

```json
{
  "delete": {
    "title": "" // Prevents fallback!
  }
}
```

**✅ Correct:**

```json
{
  "delete": {} // Missing keys allow fallback
}
```

**Prevention:**

- Configure parser `defaultValue` to return `undefined` for non-English locales
- Manually clean up generated files if needed

### 2. HTML Escaping Issues

**Problem:** Special characters (emojis, URLs) get HTML-encoded by default.

**Symptoms:**

```
"🎨 http://google.com" → "🎨 http:&#x2F;&#x2F;google.com"
```

**✅ Solution:**
Use unescaped interpolation `{{- variable}}` for user content:

```typescript
// Component code
t("delete.task.description", 'Are you sure you want to delete "{{- name}}"?', { name: entityName })

// Translation file
{
  "delete": {
    "task": {
      "description": "Are you sure you want to delete \"{{- name}}\"?"
    }
  }
}
```

### 3. JSON Syntax Errors

**Problem:** Using smart quotes or unescaped quotes in JSON.

**❌ Wrong:**

```json
{
  "description": "Delete "{{- name}}"?"  // Smart quotes break JSON
}
```

**✅ Correct:**

```json
{
  "description": "Delete \"{{- name}}\"?" // Properly escaped
}
```

**Prevention:**

- Use JSON linter/formatter
- Run typecheck after editing translation files
- Use VSCode JSON validation

### 4. TypeScript Import Path Issues

**Problem:** Relative import paths don't resolve in browser.

**❌ Wrong:**

```typescript
import(`../../components/dialogs/i18n/${language}/dialogs.json`)
```

**✅ Correct:**

```typescript
import(`@/components/dialogs/i18n/${language}/dialogs.json`)
```

**Prevention:**

- Always use absolute paths with `@/` prefix
- Test in browser, not just TypeScript compilation

### 5. Resource Backend Type Errors

**Problem:** Custom backends don't match i18next Module interface.

**✅ Solution:**
Use standard `resourcesToBackend` wrapper instead of custom backend objects:

```typescript
// Wrong: Custom backend object
return {
  type: 'backend',
  read: function() { ... }
}

// Correct: Standard wrapper
return resourcesToBackend(async (language, namespace) => {
  return await import(`@/path/to/${language}/${namespace}.json`)
})
```

## Testing and Validation

### Translation Key Validation

After implementing translations, it's crucial to validate that all language files have complete and consistent key structures. Here are proven methods for ensuring translation completeness:

#### Key Count Validation

**Compare key counts between languages to ensure parity:**

```bash
# Count keys in all translation files for a specific language
echo "=== Dutch Translation Key Counts ==="
echo -n "Navigation: " && jq 'paths(scalars) as $p | $p | join(".")' components/navigation/i18n/nl/navigation.json | wc -l
echo -n "Task: " && jq 'paths(scalars) as $p | $p | join(".")' components/task/i18n/nl/task.json | wc -l
echo -n "Layout: " && jq 'paths(scalars) as $p | $p | join(".")' components/layout/i18n/nl/layout.json | wc -l
echo -n "Dialogs: " && jq 'paths(scalars) as $p | $p | join(".")' components/dialogs/i18n/nl/dialogs.json | wc -l
echo -n "Settings: " && jq 'paths(scalars) as $p | $p | join(".")' components/dialogs/settings-forms/i18n/nl/settings.json | wc -l

# Compare against reference language (e.g., Spanish)
echo "=== Reference Spanish Key Counts ==="
echo -n "Navigation: " && jq 'paths(scalars) as $p | $p | join(".")' components/navigation/i18n/es/navigation.json | wc -l
echo -n "Task: " && jq 'paths(scalars) as $p | $p | join(".")' components/task/i18n/es/task.json | wc -l
echo -n "Layout: " && jq 'paths(scalars) as $p | $p | join(".")' components/layout/i18n/es/layout.json | wc -l
echo -n "Dialogs: " && jq 'paths(scalars) as $p | $p | join(".")' components/dialogs/i18n/es/dialogs.json | wc -l
echo -n "Settings: " && jq 'paths(scalars) as $p | $p | join(".")' components/dialogs/settings-forms/i18n/es/settings.json | wc -l
```

#### Total Translation Coverage

**Get overall translation statistics:**

```bash
# Count total translation keys for a language
echo "=== Total Translation Coverage ==="
echo -n "Total Dutch keys: " && find components -name "*.json" -path "*/i18n/nl/*" -exec jq 'paths(scalars) as $p | $p | join(".")' {} \; | wc -l
echo -n "Total Spanish keys: " && find components -name "*.json" -path "*/i18n/es/*" -exec jq 'paths(scalars) as $p | $p | join(".")' {} \; | wc -l

# Count number of translation files
echo -n "Translation files (Dutch): " && find components -name "*.json" -path "*/i18n/nl/*" | wc -l
echo -n "Translation files (Spanish): " && find components -name "*.json" -path "*/i18n/es/*" | wc -l
```

#### Key Structure Validation

**Verify key structures match between languages:**

```bash
# Extract and compare key structures
jq -r 'paths(scalars) as $p | $p | join(".")' components/dialogs/i18n/nl/dialogs.json | sort > /tmp/nl-keys.txt
jq -r 'paths(scalars) as $p | $p | join(".")' components/dialogs/i18n/es/dialogs.json | sort > /tmp/es-keys.txt

# Find missing keys
echo "=== Keys in Spanish but missing in Dutch ==="
comm -23 /tmp/es-keys.txt /tmp/nl-keys.txt

echo "=== Keys in Dutch but missing in Spanish ==="
comm -13 /tmp/es-keys.txt /tmp/nl-keys.txt

# Clean up
rm /tmp/nl-keys.txt /tmp/es-keys.txt
```

#### Validation Script Example

**Create a reusable validation script (`scripts/validate-translations.sh`):**

```bash
#!/bin/bash
set -e

LANG1=${1:-"es"}  # Reference language
LANG2=${2:-"nl"}  # Language to validate

echo "=== Validating Translation Completeness: $LANG2 vs $LANG1 ==="

# Find all translation files for reference language
COMPONENTS=$(find components -name "*.json" -path "*/i18n/$LANG1/*" | sed 's|/i18n/.*||' | sort -u)

for component in $COMPONENTS; do
    NAMESPACE=$(basename $component)
    REF_FILE=$(find $component -name "*.json" -path "*/i18n/$LANG1/*")
    TARGET_FILE=$(find $component -name "*.json" -path "*/i18n/$LANG2/*" 2>/dev/null || echo "")

    if [[ -z "$TARGET_FILE" ]]; then
        echo "❌ Missing translation file for $NAMESPACE"
        continue
    fi

    REF_COUNT=$(jq 'paths(scalars) as $p | $p | join(".")' "$REF_FILE" | wc -l)
    TARGET_COUNT=$(jq 'paths(scalars) as $p | $p | join(".")' "$TARGET_FILE" | wc -l)

    if [[ $REF_COUNT -eq $TARGET_COUNT ]]; then
        echo "✅ $NAMESPACE: $TARGET_COUNT keys"
    else
        echo "❌ $NAMESPACE: $TARGET_COUNT keys (expected $REF_COUNT)"
    fi
done

# Total counts
TOTAL_REF=$(find components -name "*.json" -path "*/i18n/$LANG1/*" -exec jq 'paths(scalars) as $p | $p | join(".")' {} \; | wc -l)
TOTAL_TARGET=$(find components -name "*.json" -path "*/i18n/$LANG2/*" -exec jq 'paths(scalars) as $p | $p | join(".")' {} \; | wc -l)

echo "=== Summary ==="
echo "Reference ($LANG1): $TOTAL_REF keys"
echo "Target ($LANG2): $TOTAL_TARGET keys"

if [[ $TOTAL_REF -eq $TOTAL_TARGET ]]; then
    echo "✅ Translation completeness: PASSED"
    exit 0
else
    echo "❌ Translation completeness: FAILED"
    exit 1
fi
```

**Usage:**

```bash
# Make script executable
chmod +x scripts/validate-translations.sh

# Validate Dutch against Spanish
./scripts/validate-translations.sh es nl

# Validate French against Spanish
./scripts/validate-translations.sh es fr
```

#### NPM Script Integration

**Add validation scripts to `package.json`:**

```json
{
  "scripts": {
    "i18n:validate": "./scripts/validate-translations.sh es",
    "i18n:validate:nl": "./scripts/validate-translations.sh es nl",
    "i18n:validate:fr": "./scripts/validate-translations.sh es fr",
    "i18n:validate:de": "./scripts/validate-translations.sh es de",
    "i18n:validate:all": "npm-run-all i18n:validate:*",
    "i18n:check": "npm run i18n:extract:all && npm run i18n:validate:all"
  }
}
```

#### Expected Output

**Successful validation should show:**

```
=== Validating Translation Completeness: nl vs es ===
✅ navigation: 20 keys
✅ task: 107 keys
✅ layout: 103 keys
✅ dialogs: 135 keys
✅ settings: 79 keys
=== Summary ===
Reference (es): 444 keys
Target (nl): 444 keys
✅ Translation completeness: PASSED
```

#### Common Validation Issues

**Empty Objects vs Missing Keys:**

```bash
# Check for empty translation objects that prevent fallbacks
echo "=== Checking for Empty Translation Objects ==="
find components -name "*.json" -path "*/i18n/nl/*" -exec sh -c '
    if jq -e ".. | objects | select(. == {})" "$1" >/dev/null 2>&1; then
        echo "⚠️  Empty objects found in: $1"
        jq ".. | objects | select(. == {})" "$1"
    fi
' _ {} \;
```

**Enhanced Structure Validation:**

Sometimes reference languages get enhanced with additional keys (like `title` fields). Use this to detect structural differences:

```bash
# Compare enhanced vs basic structures
echo "=== Structure Enhancement Check ==="
echo "Layout keys - Dutch: $(jq 'paths(scalars) as $p | $p | join(".")' components/layout/i18n/nl/layout.json | wc -l)"
echo "Layout keys - Enhanced Spanish: $(jq 'paths(scalars) as $p | $p | join(".")' components/layout/i18n/es/layout.json | wc -l)"

# If counts differ, the structure needs updating
if [[ $(jq 'paths(scalars) as $p | $p | join(".")' components/layout/i18n/nl/layout.json | wc -l) -ne $(jq 'paths(scalars) as $p | $p | join(".")' components/layout/i18n/es/layout.json | wc -l) ]]; then
    echo "❌ Dutch layout structure needs updating to match enhanced Spanish version"
fi
```

### Automated Checks

```bash
# 1. TypeScript compilation
pnpm typecheck

# 2. JSON syntax validation (included in typecheck)

# 3. Translation key validation
pnpm i18n:validate:all

# 4. Extract and compare
pnpm i18n:extract:all
git diff components/*/i18n/
```

### Manual Testing Checklist

1. **Switch languages** in settings
2. **Test special characters** (emojis, URLs, symbols)
3. **Test empty translations** (should fallback to English)
4. **Test interpolation** with various entity names
5. **Test pluralization** for count-based messages
6. **Browser console** check for loading errors

### Unit Test Fixes After Adding Translations

**Problem:** After adding translations to a component, existing tests fail with:

```
Error: useLanguage must be used within a LanguageProvider
```

**Root Cause:** Translation hooks (`useTranslation`, `useLanguage`) require `LanguageProvider` context, but tests don't provide it.

**✅ Zero Boilerplate Solution (Recommended):**

**Simply change the import** - no other changes needed:

```typescript
// Before (fails)
import { render, screen, fireEvent } from "@testing-library/react"

// After (works) - just change the import!
import { render, screen, fireEvent } from "@/test-utils"

// All existing render calls work unchanged
render(<YourComponent {...props} />)
render(<AnotherComponent />)
```

**How It Works:**

- The `@/test-utils` render function automatically wraps components with all necessary providers
- Includes `LanguageProvider`, `MockRouter`, `TestJotaiProvider`, etc.
- Zero boilerplate - existing test code requires no changes

**Example Fix:**

```diff
// Change only the import line
- import { render, screen, fireEvent } from "@testing-library/react"
+ import { render, screen, fireEvent } from "@/test-utils"

// All existing render calls work unchanged
render(<AboutModal {...defaultProps} />)
render(<AboutModal open={false} />)
```

**Alternative: Manual Wrapper (Not Recommended)**

If you can't use `@/test-utils` for some reason, you can manually add the wrapper:

```typescript
import { LanguageProvider } from "@/components/providers/language-provider"

function TestWrapper({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider initialLanguage="en">
      {children}
    </LanguageProvider>
  )
}

render(<YourComponent {...props} />, { wrapper: TestWrapper })
```

**Verification:**

```bash
pnpm test:file components/path/to/component.test.tsx
```

### Advanced Test Mock Conflicts

**Problem:** Even after switching to `@/test-utils`, some tests still fail with Jotai-related errors:

```
Error: [vitest] No "Provider" export is defined on the "jotai" mock.
Did you forget to return it from "vi.mock"?
```

**Root Cause:** Some test files have custom Jotai mocks that don't include all exports needed by `@/test-utils`. The `TestJotaiProvider` in test-utils requires the `Provider` export from Jotai, but custom mocks may not include it.

**✅ Solution:** Update custom Jotai mocks to include the missing `Provider` export:

```typescript
// In your test file with custom Jotai mock
vi.mock("jotai", () => ({
  atom: vi.fn((initialValue) => ({
    /* existing mock */
  })),
  useAtom: vi.fn(() => [
    /* existing mock */
  ]),
  useAtomValue: vi.fn((atom) => {
    /* existing mock */
  }),
  useSetAtom: vi.fn(() => vi.fn()),
  Provider: vi.fn(({ children }) => children), // Add this line!
}))
```

**Example:**

```diff
// In components/layout/page-header.test.tsx
vi.mock("jotai", () => ({
  atom: vi.fn((initialValue) => ({
    init: initialValue,
    debugLabel: `atom_${Math.random()}`,
  })),
  useAtom: vi.fn(() => [/* ... */]),
  useAtomValue: vi.fn((atom) => { /* ... */ }),
  useSetAtom: vi.fn(() => vi.fn()),
+ Provider: vi.fn(({ children }) => children),
}))
```

**When This Happens:**

- Tests have extensive custom Jotai mocks for complex atom interactions
- Test-utils integration requires Provider but custom mock doesn't include it
- Usually happens in older test files that predate the test-utils infrastructure

**Prevention:**

- Prefer removing custom Jotai mocks and using test-utils atom initialization instead
- If custom mocks are necessary, ensure they include all exports that test-utils needs
- Document which exports are required when adding new provider infrastructure

### Missing Provider Export in Custom Jotai Mocks

**Problem:** Tests with custom Jotai mocks fail after switching to `@/test-utils` with:

```
Error: [vitest] No "Provider" export is defined on the "jotai" mock.
Did you forget to return it from "vi.mock"?
```

**Root Cause:**

- `@/test-utils` includes `TestJotaiProvider` which requires the `Provider` export from Jotai
- Custom Jotai mocks in test files may not include all exports that the test infrastructure needs
- This commonly occurs when tests have extensive custom atom mocking

**✅ Solution:**

Add the missing `Provider` export to custom Jotai mocks:

```typescript
// In test files with custom Jotai mocks
vi.mock("jotai", () => ({
  useAtomValue: vi.fn(/* ... */),
  useSetAtom: vi.fn(/* ... */),
  useAtom: vi.fn(/* ... */),
  atom: vi.fn(/* ... */),
  Provider: vi.fn(({ children }) => children), // Add this line!
}))
```

**Important:** Use `vi.fn(({ children }) => children)` rather than wrapping in a div to avoid interfering with components that return `null`:

```typescript
// ❌ Wrong - creates wrapper div that interferes with null renders
Provider: ({ children }) => <div>{children}</div>

// ✅ Correct - passes children through without wrapper
Provider: vi.fn(({ children }) => children)
```

**Example Fix:**

```diff
// In components/task/task-filter-badges.test.tsx
vi.mock("jotai", () => ({
  useAtomValue: vi.fn((atom) => { /* existing mock logic */ }),
  useSetAtom: vi.fn((atom) => { /* existing mock logic */ }),
+ Provider: vi.fn(({ children }) => children),
}))
```

**When This Happens:**

- Tests have custom Jotai mocks for complex atom interactions
- Test files predate the `@/test-utils` infrastructure
- Custom mocks don't include all exports required by test providers

**Prevention:**

- Include `Provider` export in all custom Jotai mocks from the start
- Document required exports when creating new test infrastructure
- Consider using test-utils atom initialization instead of extensive custom mocks

### Debug Tools

Add temporary debugging:

```typescript
console.log("Language:", language)
console.log("Test translation:", t("key", "default"))
console.log("Namespace loaded:", !!t("key", { defaultValue: null }))
```

## Scaling Guidelines

### Component Scope Organization

```
components/
├── task/          → namespace: "tasks"
├── navigation/    → namespace: "navigation"
├── dialogs/       → namespace: "dialogs"
├── analytics/     → namespace: "analytics"
├── settings/      → namespace: "settings"
```

### Feature-Based Namespaces

**Preferred:**

- Organize by user-facing features
- Each namespace = one npm script
- Separate configs for different scopes

**Example:**

```bash
pnpm i18n:extract:tasks
pnpm i18n:extract:navigation
pnpm i18n:extract:dialogs
```

### Performance Considerations

- **Lazy loading**: Only load needed namespaces
- **Preloading**: Configure essential namespaces
- **Bundle splitting**: Colocated translations aren't bundled unless used

## Automation Workflow

### NPM Scripts Pattern

```json
{
  "scripts": {
    "i18n:extract:{scope}": "i18next-parser --config i18next-parser-{scope}.config.js",
    "i18n:extract:{scope}:watch": "i18next-parser --config i18next-parser-{scope}.config.js --watch",
    "i18n:extract:all": "npm-run-all i18n:extract:*",
    "i18n:check": "npm run i18n:extract:all && git diff --exit-code components/*/i18n/"
  }
}
```

### CI/CD Integration

```yaml
# .github/workflows/i18n.yml
name: Check Translations
on: [pull_request]
jobs:
  translations:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Install dependencies
        run: pnpm install
      - name: Extract translations
        run: pnpm i18n:extract:all
      - name: Check for changes
        run: |
          if ! git diff --exit-code components/*/i18n/; then
            echo "Translation files are out of sync. Run 'pnpm i18n:extract:all' locally."
            exit 1
          fi
```

### Pre-commit Hook Integration

```bash
# .husky/pre-commit
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# Extract translations
pnpm i18n:extract:all

# Add any updated translation files
git add components/*/i18n/

# Continue with other checks
pnpm typecheck
pnpm lint
```

## Best Practices Summary

1. **Start small**: Implement one namespace at a time
2. **Test thoroughly**: Manual testing catches issues automation misses
3. **Fix unit tests**: Simply change import from `@testing-library/react` to `@/test-utils`
4. **Use absolute paths**: Avoid relative import path issues
5. **Escape interpolation**: Use `{{- variable}}` for user content
6. **Validate JSON**: Always run typecheck after editing translations
7. **Debug systematically**: Use console logs to trace loading issues
8. **Automate early**: Set up extraction scripts from the beginning
9. **Document patterns**: Maintain consistent key naming across namespaces

## Conclusion

This approach provides a scalable, maintainable solution for internationalizing the entire TaskTrove codebase. By following these guidelines and learning from the common errors identified during the dialogs implementation, teams can efficiently add translation support to any component with confidence.

The key is to start small, test thoroughly, and automate early to prevent the common pitfalls that can derail translation projects.
