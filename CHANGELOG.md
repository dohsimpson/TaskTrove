# tasktrove

## 0.5.0

### Features

🎉 Feature - Add support for calendar view
🎉 Feature - Enhance animation for smooth UI
🎉 Feature - Redesign kanban view
🎉 Feature - Redesign task schedule popover

### Minor Changes

🎉 Feature - Enhance daily and weekly pattern selection.
🎉 Feature - Complete shadcn migration with modern patterns and optimizations.
🎉 Feature - Implement multi-select interval patterns for task scheduling.
🎉 Feature - Add comprehensive BYSETPOS pattern support and fix timezone handling.
🎉 Feature - Enhance settings UI with default page selection and consistent styling.
🎉 Feature - Add NLP input validation for task scheduling.
🎉 Feature - Add tooltip to disabled kanban button in view options. (#34)
🎉 Feature - Add count badge for completed tasks in sidebar.
🎉 Feature - Add dynamic regex support for project/label names with spaces.
🎉 Feature - Add project context and unscheduled tasks display.
🎉 Feature - Enhance skip button to work with non-recurring tasks.
🎉 Feature - Add missing "in a ..." patterns and improve date precision.

### Patch Changes

🐛 Bug - Resolve cursor jumping and space key issues in section name editing. (#19)
🐛 Bug - Improve dark mode color adaptation and inline helper function.
🐛 Bug - Resolve date/time clearing and recurring text display issues.
🐛 Bug - Fix timeout overflow causing infinite notification loops.
🐛 Bug - Replace console.log with Sonner toast notifications in manual backup.
🐛 Bug - Prevent editable section header from losing focus when context menu hides.
🐛 Bug - Align skip-to-next logic with task completion for recurringMode.
🐛 Bug - Correct open state for mobile viewport in page header.
🐛 Bug - Display time in 12-hour format in schedule component.
🐛 Bug - Improve drag and drop with timezone fix and enhanced UX.
🐛 Bug - Improve recurring pattern due date management.
🐛 Bug - Ensure side panel always takes full height.
🐛 Bug - Prevent project section header from losing focus when context menu hides.
🐛 Bug - Resolve side panel covering footer by using absolute positioning.
🐛 Bug - Remove empty sections from context menus.
🐛 Bug - Fix bugs and enhance task schedule component functionality.
🐛 Bug - Show orphaned task in unsectioned list for project view and kanban.

## 0.4.1

### Patch Changes

🐛 Bug - Resolve app crash on insecure context startup.
🐛 Bug - Resolve non-scrollable overflow in settings dialog.

## 0.4.0

### Features

🎉 Feature - Add experimental web notification system.
🎉 Feature - Add PWA support with web app manifest and icons.
🎉 Feature - Add time estimation for tasks and subtasks.
🎉 Feature - Implement focus timer system with comprehensive task integration.
🎉 Feature - Implement auto backup with configurable settings and centralized defaults.

### UI Changes

🎉 Feature - Replace chevron icons with semantic panel icons for sidebar toggle.
✨ UI - Update task selection indicator to use semantic ring color.
🎉 Feature - Add tooltip with absolute timestamp to comment timestamps.
🎉 Feature - Improve responsive behavior and add mobile drawer.

### Bug Fixes

🐛 Bug - Resolve focus timer display inconsistency between footer and popover.
🐛 Bug - Enable inline editing for project group names.
🐛 Bug - Show blinking cursor under highlighted text in quick add.

## 0.3.0

### Noteworthy Features

🎉 Feature - Nested Projects is now supported! (#6)
🎉 Feature - Adative Recurring Mode allows recurrence based on completion date (#3)

### Improvements

🎉 Feature - Add comment deletion and smooth scroll for comments and subtasks.
🎉 Feature - Add button-triggered natural language parsing with time selection in schedule dialog.
🎉 Feature - Add data migration system with automatic versioning and UI feedback.
🎉 Feature - Enhance quick-add dialog with advanced options and improved parsing.
🎉 Feature - Add skip to next occurrence for recurring tasks.
🎉 Feature - Add "no labels" filtering functionality.

### Fixes

🐛 Bug - Resolve drag and drop issues including propagation and group operations.
🐛 Bug - Improve UI responsiveness and alignment across different viewports.
🐛 Bug - Make priority parsing case-insensitive and properly handle time in quick-add.

## 0.2.0

### Minor Changes

🎉 Feature - Add 'tod' and 'tmr' shorthand for today/tomorrow in NLP.
🎉 Feature - Implement comprehensive settings dialog with UI improvements.
🎉 Feature - Enhance drag and drop with shadow effects and collapsed section support.

### Patch Changes

🐛 Bug - Resolve kanban board drag and drop between sections.
