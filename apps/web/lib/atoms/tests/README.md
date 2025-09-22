# TaskTrove Jotai Atoms Integration Tests

This directory contains integration tests for TaskTrove's Jotai atoms to verify they work correctly before production deployment.

## Overview

The tests verify core functionality of our atom-based state management system using simple console assertions without external test frameworks. This allows for easy manual verification and debugging.

## Files

- **`basic-integration.test.ts`** - Main integration test suite covering all core atom functionality
- **`README.md`** - This documentation file

## Test Coverage

### 🧪 Core Functionality Tests

#### Task Atoms (`/core/tasks.ts`)

- ✅ **CRUD Operations**: Create, read, update, delete tasks
- ✅ **Task Properties**: Title, description, priority, labels, completion status
- ✅ **Comments**: Adding comments to tasks
- ✅ **Bulk Operations**: Multiple task operations
- ✅ **Task Filtering**: Active, completed, today, upcoming, overdue tasks
- ✅ **Task Counts**: Counting tasks by various criteria

#### Project Atoms (`/core/projects.ts`)

- ✅ **Linked-List Operations**: Adding, reordering, deleting projects
- ✅ **Project Properties**: Name, color, favorite status
- ✅ **View State Management**: Per-project view configurations
- ✅ **Current Project**: Setting and retrieving current project
- ✅ **Sorting**: Maintaining project order via linked-list structure

#### Label Atoms (`/core/labels.ts`)

- ✅ **Linked-List Operations**: Adding, reordering, deleting labels
- ✅ **Label Properties**: Name and color management
- ✅ **Label Sorting**: Maintaining label order via linked-list structure
- ✅ **Label Updates**: Modifying existing label properties

#### View State Atoms (`/ui/views.ts`)

- ✅ **View Configuration**: View mode, sorting, filtering preferences
- ✅ **Persistence**: Maintaining view states per project/route
- ✅ **Current View**: Managing currently active view
- ✅ **Convenience Methods**: Easy view state updates

#### Dialog Atoms (`/ui/dialogs.ts`)

- ✅ **Dialog States**: Opening and closing various dialogs
- ✅ **Task Selection**: Single and multi-task selection
- ✅ **State Detection**: Checking if any dialogs are open
- ✅ **Bulk Operations**: Managing selected tasks

### 🛡️ Error Handling Tests

- ✅ **Invalid Operations**: Graceful handling of invalid IDs
- ✅ **Edge Cases**: Empty arrays, null values, missing data
- ✅ **Recovery**: Atoms continue functioning after errors

## How to Run Tests

### Option 1: Browser Console (Recommended)

1. **Start your development server**:

   ```bash
   npm run dev
   # or
   yarn dev
   ```

2. **Open browser and navigate to your app**

3. **Open browser developer console** (F12)

4. **Run tests**:

   ```javascript
   // Run all tests
   window.TaskTroveTests.runBasicTests()

   // Run individual test suites
   window.TaskTroveTests.testTaskCRUD()
   window.TaskTroveTests.testProjectLinkedList()
   window.TaskTroveTests.testDialogStates()

   // Reset test environment
   window.TaskTroveTests.resetTestEnvironment()

   // Check test results
   window.TaskTroveTests.logTestResults()
   ```

### Option 2: Node.js Environment

```bash
# Ensure TypeScript compilation works
npx tsc --noEmit

# Import and run in Node.js environment
node -e "
const { runBasicTests } = require('./lib/atoms/tests/basic-integration.test.ts');
runBasicTests();
"
```

### Option 3: Manual Step-by-Step Testing

```javascript
// 1. Reset environment
window.TaskTroveTests.resetTestEnvironment()

// 2. Create sample data
window.TaskTroveTests.createSampleData()

// 3. Run specific tests
window.TaskTroveTests.testTaskCRUD()
window.TaskTroveTests.testProjectLinkedList()

// 4. Check results
window.TaskTroveTests.logTestResults()
```

## Test Output

### Successful Test Run

```
🚀 Starting TaskTrove Jotai Atoms Integration Tests
=====================================================

🧹 Resetting test environment...
✅ Test environment reset complete
📦 Creating sample test data...
✅ Sample data created
📝 Testing task CRUD operations...
🔍 Testing task filtering...
🔗 Testing project linked-list operations...
👁️ Testing project view state...
🏷️ Testing label linked-list operations...
📊 Testing view state persistence...
🗨️ Testing dialog states...
🚨 Testing error handling...

=====================================================
📊 TEST RESULTS SUMMARY
=====================================================
✅ Passed: 67
❌ Failed: 0
📈 Success Rate: 100%

🎉 ALL TESTS PASSED! Atoms are ready for production.
```

### Failed Test Run

```
❌ Task Creation - Description: Task description should match
❌ Project Reorder - First: Project C should be first after reordering

=====================================================
📊 TEST RESULTS SUMMARY
=====================================================
✅ Passed: 65
❌ Failed: 2
📈 Success Rate: 97%

❌ FAILED TESTS:
  • Task Creation - Description: Task description should match
  • Project Reorder - First: Project C should be first after reordering

⚠️  Some tests failed. Please fix issues before deploying.
```

## Understanding Test Results

### Test Categories

Each test is labeled with a category for easy identification:

- **`Task Creation`** - Tests for adding new tasks
- **`Task Update`** - Tests for modifying existing tasks
- **`Task Filter`** - Tests for task filtering and derived atoms
- **`Project LinkedList`** - Tests for project ordering
- **`ViewState`** - Tests for view state persistence
- **`Dialog`** - Tests for dialog state management
- **`Error`** - Tests for error handling

### Common Issues

1. **"Array should not be empty"** - Check that sample data is being created properly
2. **"Task should be found"** - Verify task IDs are generated correctly
3. **"Order should be maintained"** - Check linked-list manipulation logic
4. **"View state should persist"** - Verify localStorage is working

## Adding New Tests

### 1. Create a New Test Function

```typescript
async function testNewFeature(): Promise<void> {
  console.log("🆕 Testing new feature...")

  const store = testState.store

  // Test setup
  // ...

  // Assertions
  assert(condition, "Error message", "Test Name")

  // Async assertions
  await assertAsync(
    async () => {
      const result = await store.get(someAtom)
      return result.length > 0
    },
    "Should have results",
    "New Feature - Results",
  )
}
```

### 2. Add to Test Runner

```typescript
async function runBasicTests(): Promise<void> {
  // ... existing tests
  await testNewFeature()
  // ...
}
```

### 3. Export for Manual Testing

```typescript
export {
  // ... existing exports
  testNewFeature,
}
```

## Test Utilities

### Assertion Helpers

- **`assert(condition, message, testName)`** - Basic assertion
- **`assertAsync(asyncFn, message, testName)`** - Async assertion
- **`deepEqual(obj1, obj2)`** - Deep object comparison

### Test State Management

- **`resetTestEnvironment()`** - Clear all atom state and localStorage
- **`createSampleData()`** - Create test projects, labels, etc.
- **`testState`** - Access to test counters and results

### Store Access

```typescript
const store = testState.store

// Read atom values
const tasks = await store.get(taskAtoms.tasks)
const currentView = store.get(viewAtoms.currentView)

// Write to atoms
store.set(taskAtoms.actions.addTask, taskData)
store.set(viewAtoms.setViewMode, "kanban")
```

## Debugging Failed Tests

### 1. Check Console Output

Look for specific error messages and the test name that failed.

### 2. Inspect Test State

```javascript
// Check current test results
console.log(window.TaskTroveTests.testState)

// Check atom values
const store = window.TaskTroveTests.testState.store
console.log(await store.get(taskAtoms.tasks))
```

### 3. Run Individual Tests

```javascript
// Reset and run specific failing test
window.TaskTroveTests.resetTestEnvironment()
window.TaskTroveTests.createSampleData()
window.TaskTroveTests.testTaskCRUD()
```

### 4. Step Through Manually

```javascript
// Run operations step by step
const store = window.TaskTroveTests.testState.store
store.set(taskAtoms.actions.addTask, { title: "Test Task" })
const tasks = await store.get(taskAtoms.tasks)
console.log("Tasks after adding:", tasks)
```

## Pre-Production Checklist

Before deploying to production, ensure:

- [ ] All tests pass (100% success rate)
- [ ] No console errors during test execution
- [ ] localStorage persistence works correctly
- [ ] Linked-list operations maintain data integrity
- [ ] Error handling works gracefully
- [ ] Performance is acceptable (tests complete in < 10 seconds)

## Troubleshooting

### "window.TaskTroveTests is undefined"

- Ensure the test file is imported in your app
- Check that you're running in browser environment
- Verify development server is running

### "Cannot read property of undefined"

- Run `resetTestEnvironment()` first
- Ensure sample data is created with `createSampleData()`
- Check that all required atoms are properly imported

### Tests hang or timeout

- Check for infinite loops in linked-list operations
- Verify async operations are properly awaited
- Look for circular dependencies in atom definitions

### localStorage errors

- Check browser permissions for localStorage
- Verify storage keys are properly prefixed
- Clear browser storage if needed

---

**Need help?** Check the main test file for detailed implementation examples and refer to individual atom files for API documentation.
