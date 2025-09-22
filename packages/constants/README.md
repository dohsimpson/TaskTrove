# @tasktrove/constants

Shared constants and default values for TaskTrove. JIT package - no build step required.

## Usage

```typescript
import {
  DEFAULT_TASK_PRIORITY,
  DEFAULT_COLOR_PALETTE,
  PLACEHOLDER_TASK_INPUT,
} from "@tasktrove/constants";
```

## Constants

- **Task Defaults** - `DEFAULT_TASK_*` (priority, title, status, etc.)
- **Project Defaults** - `DEFAULT_INBOX_*`, `DEFAULT_SECTION_*`
- **View State** - `DEFAULT_VIEW_MODE`, `DEFAULT_SORT_*`
- **Colors** - `DEFAULT_COLOR_PALETTE`, `COLOR_OPTIONS`
- **UI Placeholders** - `PLACEHOLDER_*` (task input, project name, etc.)
- **Standard Views** - `STANDARD_VIEW_IDS`, `STANDARD_VIEW_METADATA`

## Development

```bash
pnpm test        # Run tests
pnpm test:watch  # Watch mode
```
