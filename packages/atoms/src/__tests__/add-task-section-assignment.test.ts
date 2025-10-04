/**
 * Add Task Section Assignment Test Suite
 *
 * Tests the section assignment logic used by addTaskAtom:
 * 1. Tasks are added to the correct section's items array
 * 2. Tasks without sectionId use DEFAULT_SECTION_ID
 * 3. Tasks with sectionId=DEFAULT_UUID also use DEFAULT_SECTION_ID
 */

import { describe, it, expect } from "vitest";
import { addTaskToSection } from "../data/tasks/ordering";
import {
  createTaskId,
  createGroupId,
  type ProjectSection,
} from "@tasktrove/types";
import { DEFAULT_UUID } from "@tasktrove/constants";

describe("addTaskToSection - Section Assignment Logic", () => {
  const defaultSectionId = createGroupId(DEFAULT_UUID);
  const customSectionId = createGroupId("87654321-4321-4321-8321-210987654321");
  const taskId = createTaskId("12345678-1234-4234-8234-123456789abc");

  const initialSections: ProjectSection[] = [
    {
      id: defaultSectionId,
      name: "Default",
      slug: "",
      type: "section",
      color: "#6b7280",
      items: [],
    },
    {
      id: customSectionId,
      name: "Custom Section",
      slug: "",
      type: "section",
      color: "#ff0000",
      items: [],
    },
  ];

  it("should add task to specified section when sectionId is provided", () => {
    const updatedSections = addTaskToSection(
      taskId,
      customSectionId,
      undefined,
      initialSections,
    );

    const customSection = updatedSections.find((s) => s.id === customSectionId);
    expect(customSection?.items).toContain(taskId);
    expect(customSection?.items).toHaveLength(1);

    const defaultSection = updatedSections.find(
      (s) => s.id === defaultSectionId,
    );
    expect(defaultSection?.items).not.toContain(taskId);
  });

  it("should add task to default section when using DEFAULT_UUID", () => {
    const updatedSections = addTaskToSection(
      taskId,
      defaultSectionId,
      undefined,
      initialSections,
    );

    const defaultSection = updatedSections.find(
      (s) => s.id === defaultSectionId,
    );
    expect(defaultSection?.items).toContain(taskId);
    expect(defaultSection?.items).toHaveLength(1);

    const customSection = updatedSections.find((s) => s.id === customSectionId);
    expect(customSection?.items).not.toContain(taskId);
  });

  it("should append task to end of section when position is undefined", () => {
    const existingTaskId = createTaskId("11111111-1111-4111-8111-111111111111");
    const sectionsWithTask: ProjectSection[] = [
      {
        id: defaultSectionId,
        name: "Default",
        slug: "",
        type: "section",
        color: "#6b7280",
        items: [existingTaskId],
      },
      {
        id: customSectionId,
        name: "Custom Section",
        slug: "",
        type: "section",
        color: "#ff0000",
        items: [],
      },
    ];

    const updatedSections = addTaskToSection(
      taskId,
      defaultSectionId,
      undefined, // Append to end
      sectionsWithTask,
    );

    const defaultSection = updatedSections.find(
      (s) => s.id === defaultSectionId,
    );
    expect(defaultSection?.items).toEqual([existingTaskId, taskId]);
  });

  it("should insert task at specified position", () => {
    const existingTaskId1 = createTaskId(
      "11111111-1111-4111-8111-111111111111",
    );
    const existingTaskId2 = createTaskId(
      "22222222-2222-4222-8222-222222222222",
    );
    const sectionsWithTasks: ProjectSection[] = [
      {
        id: defaultSectionId,
        name: "Default",
        slug: "",
        type: "section",
        color: "#6b7280",
        items: [existingTaskId1, existingTaskId2],
      },
      {
        id: customSectionId,
        name: "Custom Section",
        slug: "",
        type: "section",
        color: "#ff0000",
        items: [],
      },
    ];

    const updatedSections = addTaskToSection(
      taskId,
      defaultSectionId,
      1, // Insert at position 1
      sectionsWithTasks,
    );

    const defaultSection = updatedSections.find(
      (s) => s.id === defaultSectionId,
    );
    expect(defaultSection?.items).toEqual([
      existingTaskId1,
      taskId,
      existingTaskId2,
    ]);
  });

  it("should not add duplicate task to section", () => {
    const sectionsWithTask: ProjectSection[] = [
      {
        id: defaultSectionId,
        name: "Default",
        slug: "",
        type: "section",
        color: "#6b7280",
        items: [taskId],
      },
      {
        id: customSectionId,
        name: "Custom Section",
        slug: "",
        type: "section",
        color: "#ff0000",
        items: [],
      },
    ];

    const updatedSections = addTaskToSection(
      taskId,
      defaultSectionId,
      undefined,
      sectionsWithTask,
    );

    const defaultSection = updatedSections.find(
      (s) => s.id === defaultSectionId,
    );
    expect(defaultSection?.items).toEqual([taskId]); // Still only one
  });
});
