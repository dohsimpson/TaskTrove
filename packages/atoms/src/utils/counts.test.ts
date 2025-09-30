import { describe, it, expect } from "vitest";
import {
  calculateProjectTaskCounts,
  calculateLabelTaskCounts,
  calculateViewCounts,
} from "./counts";
import type {
  Task,
  Project,
  Label,
  ProjectId,
  LabelId,
} from "@tasktrove/types";

// =============================================================================
// TEST HELPERS
// =============================================================================

const createTask = (overrides: Partial<Task> = {}): Task => ({
  id: `task-${Math.random()}` as Task["id"],
  title: "Test Task",
  description: "",
  completed: false,
  status: "active",
  priority: 3,
  projectId: undefined,
  labels: [],
  createdAt: new Date(),
  subtasks: [],
  comments: [],
  attachments: [],
  recurringMode: "dueDate",
  ...overrides,
});

const createProject = (overrides: Partial<Project> = {}): Project => ({
  id: `project-${Math.random()}` as ProjectId,
  name: "Test Project",
  slug: "test-project",
  color: "#3b82f6",
  shared: false,
  sections: [],
  ...overrides,
});

const createLabel = (overrides: Partial<Label> = {}): Label => ({
  id: `label-${Math.random()}` as LabelId,
  name: "Test Label",
  slug: "test-label",
  color: "#3b82f6",
  ...overrides,
});

// =============================================================================
// calculateProjectTaskCounts TESTS
// =============================================================================

describe("calculateProjectTaskCounts", () => {
  it("returns correct counts for each project", () => {
    const project1 = createProject({ id: "project-1" as ProjectId });
    const project2 = createProject({ id: "project-2" as ProjectId });
    const projects = [project1, project2];

    const tasks = [
      createTask({ projectId: "project-1" as ProjectId }),
      createTask({ projectId: "project-1" as ProjectId }),
      createTask({ projectId: "project-2" as ProjectId }),
    ];

    const counts = calculateProjectTaskCounts(projects, tasks);

    expect(counts["project-1" as ProjectId]).toBe(2);
    expect(counts["project-2" as ProjectId]).toBe(1);
  });

  it("respects showCompleted config", () => {
    const project = createProject({ id: "project-1" as ProjectId });
    const projects = [project];

    const tasks = [
      createTask({ projectId: "project-1" as ProjectId, completed: false }),
      createTask({ projectId: "project-1" as ProjectId, completed: false }),
      createTask({ projectId: "project-1" as ProjectId, completed: true }),
    ];

    // Default: showCompleted = false
    const countsWithoutCompleted = calculateProjectTaskCounts(projects, tasks);
    expect(countsWithoutCompleted["project-1" as ProjectId]).toBe(2);

    // With showCompleted = true
    const countsWithCompleted = calculateProjectTaskCounts(projects, tasks, {
      showCompleted: true,
    });
    expect(countsWithCompleted["project-1" as ProjectId]).toBe(3);
  });

  it("handles projects with no tasks", () => {
    const project = createProject({ id: "project-1" as ProjectId });
    const projects = [project];
    const tasks: Task[] = [];

    const counts = calculateProjectTaskCounts(projects, tasks);

    expect(counts["project-1" as ProjectId]).toBe(0);
  });

  it("handles empty projects array", () => {
    const projects: Project[] = [];
    const tasks = [createTask()];

    const counts = calculateProjectTaskCounts(projects, tasks);

    expect(counts).toEqual({});
  });

  it("does not count tasks from other projects", () => {
    const project1 = createProject({ id: "project-1" as ProjectId });
    const projects = [project1];

    const tasks = [
      createTask({ projectId: "project-1" as ProjectId }),
      createTask({ projectId: "project-2" as ProjectId }), // Different project
      createTask({ projectId: undefined }), // Inbox task
    ];

    const counts = calculateProjectTaskCounts(projects, tasks);

    expect(counts["project-1" as ProjectId]).toBe(1);
    expect(Object.keys(counts).length).toBe(1);
  });
});

// =============================================================================
// calculateLabelTaskCounts TESTS
// =============================================================================

describe("calculateLabelTaskCounts", () => {
  it("returns correct counts for each label", () => {
    const label1 = createLabel({ id: "label-1" as LabelId });
    const label2 = createLabel({ id: "label-2" as LabelId });
    const labels = [label1, label2];

    const tasks = [
      createTask({ labels: ["label-1" as LabelId] }),
      createTask({ labels: ["label-1" as LabelId] }),
      createTask({ labels: ["label-2" as LabelId] }),
    ];

    const counts = calculateLabelTaskCounts(labels, tasks);

    expect(counts["label-1" as LabelId]).toBe(2);
    expect(counts["label-2" as LabelId]).toBe(1);
  });

  it("respects showCompleted config", () => {
    const label = createLabel({ id: "label-1" as LabelId });
    const labels = [label];

    const tasks = [
      createTask({ labels: ["label-1" as LabelId], completed: false }),
      createTask({ labels: ["label-1" as LabelId], completed: false }),
      createTask({ labels: ["label-1" as LabelId], completed: true }),
    ];

    // Default: showCompleted = false
    const countsWithoutCompleted = calculateLabelTaskCounts(labels, tasks);
    expect(countsWithoutCompleted["label-1" as LabelId]).toBe(2);

    // With showCompleted = true
    const countsWithCompleted = calculateLabelTaskCounts(labels, tasks, {
      showCompleted: true,
    });
    expect(countsWithCompleted["label-1" as LabelId]).toBe(3);
  });

  it("handles labels with no tasks", () => {
    const label = createLabel({ id: "label-1" as LabelId });
    const labels = [label];
    const tasks: Task[] = [];

    const counts = calculateLabelTaskCounts(labels, tasks);

    expect(counts["label-1" as LabelId]).toBe(0);
  });

  it("handles tasks with multiple labels", () => {
    const label1 = createLabel({ id: "label-1" as LabelId });
    const label2 = createLabel({ id: "label-2" as LabelId });
    const labels = [label1, label2];

    const tasks = [
      createTask({ labels: ["label-1" as LabelId, "label-2" as LabelId] }),
      createTask({ labels: ["label-1" as LabelId] }),
    ];

    const counts = calculateLabelTaskCounts(labels, tasks);

    // Task with both labels should be counted in both
    expect(counts["label-1" as LabelId]).toBe(2);
    expect(counts["label-2" as LabelId]).toBe(1);
  });

  it("handles empty labels array", () => {
    const labels: Label[] = [];
    const tasks = [createTask()];

    const counts = calculateLabelTaskCounts(labels, tasks);

    expect(counts).toEqual({});
  });

  it("does not count tasks without the label", () => {
    const label1 = createLabel({ id: "label-1" as LabelId });
    const labels = [label1];

    const tasks = [
      createTask({ labels: ["label-1" as LabelId] }),
      createTask({ labels: ["label-2" as LabelId] }), // Different label
      createTask({ labels: [] }), // No labels
    ];

    const counts = calculateLabelTaskCounts(labels, tasks);

    expect(counts["label-1" as LabelId]).toBe(1);
    expect(Object.keys(counts).length).toBe(1);
  });
});

// =============================================================================
// calculateViewCounts TESTS
// =============================================================================

describe("calculateViewCounts", () => {
  it("calculates correct total count (active tasks)", () => {
    const tasks = [
      createTask({ completed: false }),
      createTask({ completed: false }),
      createTask({ completed: true }), // Should not be counted in total
    ];
    const completedTasks = tasks.filter((t) => t.completed);
    const projectIds = new Set<ProjectId>();

    const counts = calculateViewCounts(tasks, completedTasks, projectIds);

    expect(counts.total).toBe(2);
    expect(counts.active).toBe(2);
  });

  it("calculates correct inbox count", () => {
    const projectIds = new Set<ProjectId>(["project-1" as ProjectId]);

    const tasks = [
      createTask({ projectId: undefined }), // Inbox task (undefined project)
      createTask({ projectId: "project-1" as ProjectId }), // Valid project
      createTask({ projectId: "project-2" as ProjectId }), // Orphaned task (project doesn't exist)
    ];
    const completedTasks: Task[] = [];

    const counts = calculateViewCounts(tasks, completedTasks, projectIds);

    // Inbox should include: undefined project (1) + orphaned task (1) = 2
    expect(counts.inbox).toBe(2);
  });

  it("calculates correct today count (uses isToday)", () => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const tasks = [
      createTask({ dueDate: today }), // Due today
      createTask({ dueDate: yesterday }), // Overdue (included in today)
      createTask({ dueDate: tomorrow }), // Upcoming (not in today)
      createTask({ dueDate: undefined }), // No due date (not in today)
    ];
    const completedTasks: Task[] = [];
    const projectIds = new Set<ProjectId>();

    const counts = calculateViewCounts(tasks, completedTasks, projectIds);

    // Today should include: today (1) + overdue (1) = 2
    expect(counts.today).toBe(2);
  });

  it("calculates correct upcoming count (future dates)", () => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    const tasks = [
      createTask({ dueDate: tomorrow }), // Upcoming
      createTask({ dueDate: nextWeek }), // Upcoming
      createTask({ dueDate: today }), // Today (not upcoming)
      createTask({ dueDate: yesterday }), // Overdue (not upcoming)
    ];
    const completedTasks: Task[] = [];
    const projectIds = new Set<ProjectId>();

    const counts = calculateViewCounts(tasks, completedTasks, projectIds);

    expect(counts.upcoming).toBe(2);
  });

  it("calculates correct overdue count (past dates, not completed)", () => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);

    const tasks = [
      createTask({ dueDate: yesterday, completed: false }), // Overdue
      createTask({ dueDate: lastWeek, completed: false }), // Overdue
      createTask({ dueDate: yesterday, completed: true }), // Completed (not overdue)
      createTask({ dueDate: today }), // Today (not overdue)
    ];
    const completedTasks = tasks.filter((t) => t.completed);
    const projectIds = new Set<ProjectId>();

    const counts = calculateViewCounts(tasks, completedTasks, projectIds);

    // Note: overdue count already filters out completed tasks in the helper function
    expect(counts.overdue).toBe(2);
  });

  it("calculates correct calendar count (tasks with due dates)", () => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const tasks = [
      createTask({ dueDate: today }),
      createTask({ dueDate: yesterday }),
      createTask({ dueDate: tomorrow }),
      createTask({ dueDate: undefined }), // No due date
    ];
    const completedTasks: Task[] = [];
    const projectIds = new Set<ProjectId>();

    const counts = calculateViewCounts(tasks, completedTasks, projectIds);

    expect(counts.calendar).toBe(3);
  });

  it("calculates correct completed count", () => {
    const tasks = [
      createTask({ completed: false }),
      createTask({ completed: true }),
      createTask({ completed: true }),
    ];
    const completedTasks = tasks.filter((t) => t.completed);
    const projectIds = new Set<ProjectId>();

    const counts = calculateViewCounts(tasks, completedTasks, projectIds);

    expect(counts.completed).toBe(2);
  });

  it("calculates correct all count", () => {
    const tasks = [
      createTask({ completed: false }),
      createTask({ completed: false }),
      createTask({ completed: true }),
    ];
    const completedTasks = tasks.filter((t) => t.completed);
    const projectIds = new Set<ProjectId>();

    const counts = calculateViewCounts(tasks, completedTasks, projectIds);

    // Default: showCompletedAll = false, so only active tasks
    expect(counts.all).toBe(2);

    // With showCompletedAll = true
    const countsWithCompleted = calculateViewCounts(
      tasks,
      completedTasks,
      projectIds,
      { showCompletedAll: true },
    );
    expect(countsWithCompleted.all).toBe(3);
  });

  it("respects per-view showCompleted config", () => {
    const today = new Date();
    const projectId = "project-1" as ProjectId;
    const tasks = [
      createTask({ projectId: undefined, completed: false }), // Inbox
      createTask({ projectId: undefined, completed: true }), // Inbox completed
      createTask({ projectId, dueDate: today, completed: false }), // Today (not inbox)
      createTask({ projectId, dueDate: today, completed: true }), // Today completed (not inbox)
    ];
    const completedTasks = tasks.filter((t) => t.completed);
    const projectIds = new Set<ProjectId>([projectId]);

    // Default: all showCompleted = false
    const countsDefault = calculateViewCounts(
      tasks,
      completedTasks,
      projectIds,
    );
    expect(countsDefault.inbox).toBe(1);
    expect(countsDefault.today).toBe(1);

    // With per-view showCompleted = true
    const countsWithCompleted = calculateViewCounts(
      tasks,
      completedTasks,
      projectIds,
      {
        showCompletedInbox: true,
        showCompletedToday: true,
      },
    );
    expect(countsWithCompleted.inbox).toBe(2);
    expect(countsWithCompleted.today).toBe(2);
  });

  it("handles tasks with no due date", () => {
    const projectId = "project-1" as ProjectId;
    const tasks = [
      createTask({ dueDate: undefined, projectId: undefined }), // Inbox only
      createTask({ dueDate: undefined, projectId, completed: false }), // Not inbox (has valid project)
    ];
    const completedTasks: Task[] = [];
    const projectIds = new Set<ProjectId>([projectId]);

    const counts = calculateViewCounts(tasks, completedTasks, projectIds);

    expect(counts.today).toBe(0);
    expect(counts.upcoming).toBe(0);
    expect(counts.calendar).toBe(0);
    expect(counts.overdue).toBe(0);
    expect(counts.inbox).toBe(1);
    expect(counts.all).toBe(2);
  });

  it("handles completed overdue tasks correctly", () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const tasks = [
      createTask({ dueDate: yesterday, completed: false }), // Overdue
      createTask({ dueDate: yesterday, completed: true }), // Completed overdue
    ];
    const completedTasks = tasks.filter((t) => t.completed);
    const projectIds = new Set<ProjectId>();

    const counts = calculateViewCounts(tasks, completedTasks, projectIds);

    // Overdue should only count non-completed tasks
    expect(counts.overdue).toBe(1);
    // Today should include overdue task
    expect(counts.today).toBe(1);
    // Completed count should include completed overdue task
    expect(counts.completed).toBe(1);
  });

  it("handles empty task array", () => {
    const tasks: Task[] = [];
    const completedTasks: Task[] = [];
    const projectIds = new Set<ProjectId>();

    const counts = calculateViewCounts(tasks, completedTasks, projectIds);

    expect(counts.total).toBe(0);
    expect(counts.inbox).toBe(0);
    expect(counts.today).toBe(0);
    expect(counts.upcoming).toBe(0);
    expect(counts.calendar).toBe(0);
    expect(counts.overdue).toBe(0);
    expect(counts.completed).toBe(0);
    expect(counts.all).toBe(0);
    expect(counts.active).toBe(0);
  });
});
