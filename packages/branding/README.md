# @tasktrove/branding

Shared source-of-truth for TaskTrove logo and icon assets.

## Syncing assets

Run `pnpm --filter @tasktrove/branding sync` whenever you update any files in `icons/`. The sync script copies the canonical assets into each app that needs them (web, web.pro, import.pro, etc.) so every surface stays current without relying on symlinks.
