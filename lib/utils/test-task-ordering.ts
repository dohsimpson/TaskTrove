/**
 * Test script to verify array-based task ordering functionality
 * This script demonstrates and validates the new array-based ordering operations
 */

import { Task, Project, INBOX_PROJECT_ID, createTaskId, createSectionId } from "../types"
import {
  TEST_TASK_ID_1,
  TEST_TASK_ID_2,
  TEST_PROJECT_ID_1,
  TEST_PROJECT_ID_2,
  TEST_SECTION_ID_1,
  TEST_SECTION_ID_2,
  TEST_LABEL_ID_1,
  TEST_LABEL_ID_2,
} from "./test-constants"
import { DEFAULT_SECTION_COLORS } from "../constants/defaults"
import {
  getOrderedTasksForProject,
  moveTaskWithinProject,
  addTaskToProjectOrder,
  removeTaskFromProjectOrder,
  moveTaskBetweenProjects,
} from "./task-ordering-operations"
import { log } from "@/lib/utils/logger"

// Sample tasks for testing
const sampleTasks: Task[] = [
  {
    id: TEST_TASK_ID_1,
    title: "Review quarterly reports",
    description: "Go through Q4 financial reports and prepare summary",
    completed: false,
    priority: 1,
    sectionId: TEST_SECTION_ID_1,
    dueDate: new Date("2025-07-13T00:00:00.000Z"),
    projectId: TEST_PROJECT_ID_2,
    labels: [TEST_LABEL_ID_1, TEST_LABEL_ID_2],
    subtasks: [],
    comments: [],
    attachments: [],
    createdAt: new Date("2025-07-13T00:00:00.000Z"),
    status: "active",
    order: 0,
    recurringMode: "dueDate",
  },
  {
    id: TEST_TASK_ID_2,
    title: "Buy groceries",
    completed: false,
    priority: 2,
    sectionId: TEST_SECTION_ID_1,
    dueDate: new Date("2025-07-14T00:00:00.000Z"),
    projectId: TEST_PROJECT_ID_1,
    labels: [TEST_LABEL_ID_1],
    subtasks: [],
    comments: [],
    attachments: [],
    createdAt: new Date("2025-07-13T00:00:00.000Z"),
    status: "active",
    order: 0,
    recurringMode: "dueDate",
  },
  {
    id: createTaskId("12345678-1234-4234-8234-123456789ab3"),
    title: "Morning workout",
    completed: true,
    priority: 3,
    sectionId: TEST_SECTION_ID_1,
    dueDate: new Date("2025-07-13T00:00:00.000Z"),
    projectId: TEST_PROJECT_ID_2,
    labels: [TEST_LABEL_ID_2],
    subtasks: [],
    comments: [],
    attachments: [],
    createdAt: new Date("2025-07-13T00:00:00.000Z"),
    recurringMode: "dueDate",
    completedAt: new Date("2025-07-13T00:00:00.000Z"),
    status: "completed",
    order: 0,
  },
  {
    id: createTaskId("12345678-1234-4234-8234-123456789ab4"),
    title: "Call dentist for appointment",
    completed: false,
    priority: 2,
    sectionId: TEST_SECTION_ID_1,
    dueDate: new Date("2025-07-27T22:03:31.687Z"),
    projectId: INBOX_PROJECT_ID,
    labels: [],
    subtasks: [],
    comments: [],
    attachments: [],
    createdAt: new Date("2025-07-13T00:00:00.000Z"),
    recurringMode: "dueDate",
    status: "active",
    order: 0,
  },
  {
    id: createTaskId("12345678-1234-4234-8234-123456789ab5"),
    title: "Complete project documentation",
    completed: false,
    priority: 1,
    sectionId: TEST_SECTION_ID_1,
    dueDate: new Date("2025-07-15T00:00:00.000Z"),
    projectId: TEST_PROJECT_ID_1,
    labels: [TEST_LABEL_ID_1, TEST_LABEL_ID_2],
    subtasks: [],
    comments: [],
    attachments: [],
    createdAt: new Date("2025-07-13T00:00:00.000Z"),
    recurringMode: "dueDate",
    status: "active",
    order: 0,
  },
]

// Sample projects with taskOrder arrays
const sampleProjects: Project[] = [
  {
    id: TEST_PROJECT_ID_1,
    name: "Work",
    slug: "work",
    color: "#ef4444",
    shared: true,
    sections: [
      { id: TEST_SECTION_ID_1, name: "Backlog", color: DEFAULT_SECTION_COLORS[0] },
      { id: TEST_SECTION_ID_2, name: "Active", color: DEFAULT_SECTION_COLORS[1] },
      {
        id: createSectionId("00000000-0000-0000-0000-000000000002"),
        name: "Done",
        color: DEFAULT_SECTION_COLORS[2],
      },
    ],
    taskOrder: [TEST_TASK_ID_1, createTaskId("12345678-1234-4234-8234-123456789ab5")], // Task 1 first, then Task 5
  },
  {
    id: TEST_PROJECT_ID_2,
    name: "Shopping",
    slug: "shopping",
    color: "#10b981",
    shared: false,
    sections: [
      { id: TEST_SECTION_ID_1, name: "To Buy", color: DEFAULT_SECTION_COLORS[0] },
      { id: TEST_SECTION_ID_2, name: "Purchased", color: DEFAULT_SECTION_COLORS[1] },
    ],
    taskOrder: [TEST_TASK_ID_2], // Only Task 2
  },
]

/**
 * Test array-based task ordering functionality
 */
export function testArrayBasedTaskOrdering() {
  log.info({ module: "test" }, "Testing Array-Based Task Ordering")
  log.info({ module: "test" }, "====================================")

  // Test 1: Get ordered tasks for projects
  log.info({ module: "test" }, "Test 1: Getting ordered tasks for projects")
  const orderedProject2 = getOrderedTasksForProject(TEST_PROJECT_ID_1, sampleTasks, sampleProjects)
  const orderedProject3 = getOrderedTasksForProject(TEST_PROJECT_ID_2, sampleTasks, sampleProjects)
  const orderedInbox = getOrderedTasksForProject(INBOX_PROJECT_ID, sampleTasks, sampleProjects)

  log.info(
    {
      module: "test",
      project: "project-1",
      order: orderedProject2.map((t) => `${t.id}(${t.title})`).join(" → "),
    },
    'Project "1" order',
  )
  log.info(
    {
      module: "test",
      project: "project-2",
      order: orderedProject3.map((t) => `${t.id}(${t.title})`).join(" → "),
    },
    'Project "2" order',
  )
  log.info(
    {
      module: "test",
      project: "inbox",
      order: orderedInbox.map((t) => `${t.id}(${t.title})`).join(" → "),
    },
    "Inbox order",
  )

  // Test 2: Move task within project
  log.info({ module: "test" }, "Test 2: Moving task within project")
  log.info(
    { module: "test", project: "project-1", order: orderedProject2.map((t) => t.id) },
    'Before move - Project "1"',
  )

  const task5Id = createTaskId("12345678-1234-4234-8234-123456789ab5")
  const updatedProjects = moveTaskWithinProject(task5Id, 1, 0, TEST_PROJECT_ID_1, sampleProjects) // Move task 5 to beginning
  const orderedAfterMove = getOrderedTasksForProject(
    TEST_PROJECT_ID_1,
    sampleTasks,
    updatedProjects,
  )
  log.info(
    { module: "test", project: "project-1", order: orderedAfterMove.map((t) => t.id) },
    'After move - Project "1"',
  )

  // Test 3: Add task to project order
  log.info({ module: "test" }, "Test 3: Adding task to project order")
  const task4Id = createTaskId("12345678-1234-4234-8234-123456789ab4")
  const projectsWithAdded = addTaskToProjectOrder(task4Id, TEST_PROJECT_ID_1, 1, updatedProjects)
  const orderedAfterAdd = getOrderedTasksForProject(
    TEST_PROJECT_ID_1,
    sampleTasks,
    projectsWithAdded,
  )
  log.info(
    { module: "test", order: orderedAfterAdd.map((t) => t.id) },
    "After adding task 4 at position 1",
  )

  // Test 4: Remove task from project order
  log.info({ module: "test" }, "Test 4: Removing task from project order")
  const projectsWithRemoved = removeTaskFromProjectOrder(
    task4Id,
    TEST_PROJECT_ID_1,
    projectsWithAdded,
  )
  const orderedAfterRemove = getOrderedTasksForProject(
    TEST_PROJECT_ID_1,
    sampleTasks,
    projectsWithRemoved,
  )
  log.info({ module: "test", order: orderedAfterRemove.map((t) => t.id) }, "After removing task 4")

  // Test 5: Move task between projects
  log.info({ module: "test" }, "Test 5: Moving task between projects")
  log.info(
    { module: "test", project: "project-1", order: orderedAfterRemove.map((t) => t.id) },
    'Before - Project "1"',
  )
  log.info(
    {
      module: "test",
      project: "project-2",
      order: getOrderedTasksForProject(TEST_PROJECT_ID_2, sampleTasks, projectsWithRemoved).map(
        (t) => t.id,
      ),
    },
    'Before - Project "2"',
  )

  const projectsAfterCrossMove = moveTaskBetweenProjects(
    task5Id,
    TEST_PROJECT_ID_1,
    TEST_PROJECT_ID_2,
    0,
    projectsWithRemoved,
  )
  log.info({ module: "test" }, "After moving task 5 from project 1 to project 2:")
  log.info(
    {
      module: "test",
      project: "project-1",
      order: getOrderedTasksForProject(TEST_PROJECT_ID_1, sampleTasks, projectsAfterCrossMove).map(
        (t) => t.id,
      ),
    },
    'Project "1"',
  )
  log.info(
    {
      module: "test",
      project: "project-2",
      order: getOrderedTasksForProject(TEST_PROJECT_ID_2, sampleTasks, projectsAfterCrossMove).map(
        (t) => t.id,
      ),
    },
    'Project "2"',
  )

  // Test 6: Fallback behavior (no taskOrder)
  log.info({ module: "test" }, "Test 6: Fallback behavior (no taskOrder)")
  const projectsWithoutOrder = sampleProjects.map((p) => ({ ...p, taskOrder: undefined }))
  const fallbackOrder = getOrderedTasksForProject(
    TEST_PROJECT_ID_1,
    sampleTasks,
    projectsWithoutOrder,
  )
  log.info(
    { module: "test", order: fallbackOrder.map((t) => t.id) },
    "Fallback order (by creation date)",
  )

  log.info({ module: "test" }, "Testing complete!")
}

/**
 * Run the tests
 */
if (typeof window === "undefined") {
  // Node.js environment
  testArrayBasedTaskOrdering()
} else {
  // Browser environment - attach to window for manual testing
  // Type-safe window property assignment using interface extension
  interface WindowWithTest extends Window {
    testArrayBasedTaskOrdering?: typeof testArrayBasedTaskOrdering
  }
  const windowWithTest: WindowWithTest = window
  windowWithTest.testArrayBasedTaskOrdering = testArrayBasedTaskOrdering
}
