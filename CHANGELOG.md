# tasktrove

## 0.11.1

### Patch Changes

🐛 Bug - Bump nextjs version to address security CVE-2025-55182

## 0.11.0

### Features

🎉 Feature - Add week start preference setting (0=Sunday, 1=Monday) with UI controls in appearance settings
🎉 Feature - Implement new week-month-picker component with customizable week start support
🎉 Feature - Update calendar views and task scheduling components to respect week start preference
🎉 Feature - Cancellable quick add parsed patterns

### Patch Changes

🐛 Bug - Fix #215

## 0.10.0

### Features

🎉 Feature - Noticable improvements over recurring schedules in smart parsing
🎉 Feature - Improved project group view to show projects as sections
🎉 Feature - Improved calendar view layout to increase usability
🎉 Feature - Left Sidebar is now resizable
🎉 Feature - Kanban view now supports opening task side panel
🎉 Feature - Markdown support in description

### Minor Changes

🎉 Feature - Improved PWA mobile experience for settings menu and popovers
🎉 Feature - Centralize background work with the new job scheduler system.

### Patch Changes

🐛 Bug - Fix orphaned tasks created from completed recurring tasks. (#184)
🐛 Bug - Fix kanban/layout overflows. (#190)
🐛 Bug - Fix unexpected re-render when toggling side panel. (#160)
🐛 Bug - Correct recurring task trackingId handling and placement when completing recurring items.

## 0.9.1

### Features

🎉 Feature - Add linkify functionality to task comments.
🎉 Feature - Enhance section deletion with task deletion option.

### Minor Changes

🎉 Feature - Move sort controls from view options to toolbar for better UX.

### Patch Changes

🐛 Bug - Ensure consistent task filtering in count atoms.
🐛 Bug - Remove UI filtering in task count atoms.

## 0.9.0

### Features

🎉 Feature - Add Habit view and auto rollover recurrence mode
🎉 Feature - Add week time grid mode inside calendar view
🎉 Feature - Use Inter for font family
🎉 Feature - Add Halloween theme with pumpkin logo and spooky avatars.

### Minor Changes

🎉 Feature - Add enhanced task parsing with support for complex recurring patterns
🎉 Feature - Add Escape key support to clear task selection.
🎉 Feature - Add focus task button in side panel with route context awareness.
🎉 Feature - Task side panel show settings is now global rather than per view.
🎉 Feature - Add grip vertical button to task side panel for dragging.
🎉 Feature - Migrate API routes to v1 versioning with improved authentication.
🎉 Feature - Simplify task filtering to fix projectgroup switching issues.
🎉 Feature - Make calendar header sticky when scrolling.
🎉 Feature - Remove global focus ring and outline styling.

### Patch Changes

🐛 Bug - Clear recurring pattern from completed tasks.
🐛 Bug - Prevent time picker overflow on small screens.
🐛 Bug - Fix GroupDropIndicator in kanban not expanding fully.
🐛 Bug - Prevent placeholder text from being editable in EditableDiv.
🐛 Bug - Auto-populate due date when creating task in today view.
🐛 Bug - Prevent scroll to top on subtasks.
🐛 Bug - Wire up close button handlers in comment and subtask popovers.
🐛 Bug - Focus Discard button in unsaved changes confirmation dialog.
🐛 Bug - Remove font-medium from highlighted tokens to fix Inter font misalignment.
🐛 Bug - Update i18n loading message to be more user-friendly.

## 0.8.0

### Features

🎉 Feature - Add task multi-select support and bulk operations.
🎉 Feature - Drag and drop improvements and bug fixes.
🎉 Feature - Add PWA install prompt.
🎉 Feature - Implement virtual scrolling for task lists performance optimization.

### Minor Changes

🎉 Feature - Add convert subtask to task functionality.
🎉 Feature - Add convert to subtasks functionality for selected tasks.
🎉 Feature - Add drag-and-drop reordering for subtasks with reusable utilities.
🎉 Feature - Add reliable midnight refresh with scheduled timeout utility.
🎉 Feature - Enforce minimum section requirement and fix related issues.
🎉 Feature - Add button to create sections in a project.
🎉 Feature - Add set-as-default functionality for sections with UI indicator.
🎉 Feature - Implement drag-drop reordering for labels.
🎉 Feature - Enhance popover headers, scrolling, and card consistency.

### Patch Changes

🐛 Bug - Fix playSoundAtom to respect soundEnabled setting.
🐛 Bug - Show selection toolbar in non-project views.
🐛 Bug - Remove rich text paste in editable div to prevent UI display issues.
🐛 Bug - Restrict section collapse trigger to chevron button only.
🐛 Bug - Balance task description layout with right-side placeholder.
🐛 Bug - Resolve context menu closing immediately in compact variant.
🐛 Bug - Improve subtask UX with proper spacing and context menu.
🐛 Bug - Add backups directory symlink mapping in Docker.

## 0.7.0

### Features

🎉 Feature - Add API Support with Bearer Token Authentication.
🎉 Feature - Add password authentication support.
🎉 Feature - Apply consistent cursor pointer style on all buttons.
🎉 Feature - Build distroless docker image to improve security and image size.

### Minor Changes

🎉 Feature - Add task duplication functionality. (#89)
🎉 Feature - Add unsaved changes confirmation for quick add dialog. (#93)
🎉 Feature - Add inline editing functionality with pencil icon for comments.
🎉 Feature - Add auto-scroll to latest comment when opening comment popover.
🎉 Feature - Add delete contained resources option for project deletion.
🎉 Feature - Add global view options with persistent side panel width.
🎉 Feature - Add resizable panels to calendar and project views. (#72)
🎉 Feature - Add comprehensive user profile management system.
🎉 Feature - Add Portuguese, Italian, Japanese, and Korean language support.
🎉 Feature - Add estimation support with ~syntax in quick add.
🎉 Feature - Add offline status indicator in header.

### Patch Changes

🐛 Bug - Normalize negative indices in addTaskToSection to fix cross-section drag-and-drop.
🐛 Bug - Ensure real server IDs used when adding labels to tasks. (#75)
🐛 Bug - Improve drop zone coverage to span entire column height. (#86)
🐛 Bug - Convert to dynamic manifest.ts to resolve installation issues. (#66)
🐛 Bug - Prevent infinite re-render loop caused by new Set() creation. (#80)
🐛 Bug - Display time for daily recurring tasks without specific due date.
🐛 Bug - Resolve overflow scroll issue in main content container.
🐛 Bug - Ensure orphaned project tasks show in inbox.
🐛 Bug - Show available labels immediately in popover without typing. (#58)

## 0.6.0

### Features

🎉 Feature - Add i18n support with 6 supported languages. 🌐
🎉 Feature - Add showOverdue toggle to view options.
🎉 Feature - Add project group navigation and viewing functionality. (#38)
🎉 Feature - Added linkify settings and allow links in task titles.
🎉 Feature - Added hover popover settings.
🎉 Feature - Add sound enable/disable setting. (#41)

### Minor Changes

🎉 Feature - Add max-width constraints to task view for wide screens. (#40)
🎉 Feature - Add context menu to task side panel.
🎉 Feature - Improve TimeEstimationPicker with ContentPopover and immediate preset application.

### Patch Changes

🐛 Bug - Prevent audio settings reset when toggling linkify.
🐛 Bug - Resolve hover popover instability with debounced state management.
🐛 Bug - Resolve TaskDueDate component preventing schedule popover from opening.
🐛 Bug - Resolve popover viewport overflow with collision detection.
🐛 Bug - Prevent auto-focus on popover content when opening.

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
