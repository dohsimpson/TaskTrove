import { describe, it, expect } from "vitest";
import type { ZodObject, ZodRawShape } from "zod";
import {
  TaskSchema,
  TaskSerializationSchema,
  TaskCommentSchema,
  TaskCommentSerializationSchema,
  UserSchema,
  UserSerializationSchema,
  ProjectSchema,
  ProjectSerializationSchema,
  LabelSchema,
  LabelSerializationSchema,
  DataFileSchema,
  DataFileSerializationSchema,
  CreateTaskRequestSchema,
  TaskCreateSerializationSchema,
  UpdateTaskRequestSchema,
  TaskUpdateSerializationSchema,
  CreateProjectRequestSchema,
  ProjectCreateSerializationSchema,
  UpdateProjectRequestSchema,
  ProjectUpdateSerializationSchema,
  CreateLabelRequestSchema,
  LabelCreateSerializationSchema,
  UpdateLabelRequestSchema,
  LabelUpdateSerializationSchema,
  UpdateUserRequestSchema,
  UserUpdateSerializationSchema,
  DeleteTaskRequestSchema,
  TaskDeleteSerializationSchema,
  DeleteProjectRequestSchema,
  ProjectDeleteSerializationSchema,
  DeleteLabelRequestSchema,
  LabelDeleteSerializationSchema,
} from "../index";

/**
 * Asserts that two schemas have identical field names
 */
export function assertSameFields(
  name: string,
  baseSchema: ZodObject<ZodRawShape>,
  serializationSchema: ZodObject<ZodRawShape>,
) {
  const baseFields = Object.keys(baseSchema.shape).sort();
  const serializationFields = Object.keys(serializationSchema.shape).sort();

  expect(baseFields).toEqual(serializationFields);
}

describe("Schema field consistency", () => {
  describe("Entity schemas", () => {
    it("TaskSchema and TaskSerializationSchema have same field names", () => {
      assertSameFields("Task", TaskSchema, TaskSerializationSchema);
    });

    it("TaskCommentSchema and TaskCommentSerializationSchema have same field names", () => {
      assertSameFields(
        "TaskComment",
        TaskCommentSchema,
        TaskCommentSerializationSchema,
      );
    });

    it("UserSchema and UserSerializationSchema have same field names", () => {
      assertSameFields("User", UserSchema, UserSerializationSchema);
    });

    it("ProjectSchema and ProjectSerializationSchema have same field names", () => {
      assertSameFields("Project", ProjectSchema, ProjectSerializationSchema);
    });

    it("LabelSchema and LabelSerializationSchema have same field names", () => {
      assertSameFields("Label", LabelSchema, LabelSerializationSchema);
    });

    it("DataFileSchema and DataFileSerializationSchema have same field names", () => {
      assertSameFields("DataFile", DataFileSchema, DataFileSerializationSchema);
    });
  });

  describe("Create Request/Serialization schemas", () => {
    it("CreateTaskRequestSchema and TaskCreateSerializationSchema have same field names", () => {
      assertSameFields(
        "TaskCreate",
        CreateTaskRequestSchema,
        TaskCreateSerializationSchema,
      );
    });

    it("CreateProjectRequestSchema and ProjectCreateSerializationSchema have same field names", () => {
      assertSameFields(
        "ProjectCreate",
        CreateProjectRequestSchema,
        ProjectCreateSerializationSchema,
      );
    });

    it("CreateLabelRequestSchema and LabelCreateSerializationSchema have same field names", () => {
      assertSameFields(
        "LabelCreate",
        CreateLabelRequestSchema,
        LabelCreateSerializationSchema,
      );
    });
  });

  describe("Update Request/Serialization schemas", () => {
    it("UpdateTaskRequestSchema and TaskUpdateSerializationSchema have same field names", () => {
      assertSameFields(
        "TaskUpdate",
        UpdateTaskRequestSchema,
        TaskUpdateSerializationSchema,
      );
    });

    it("UpdateProjectRequestSchema and ProjectUpdateSerializationSchema have same field names", () => {
      assertSameFields(
        "ProjectUpdate",
        UpdateProjectRequestSchema,
        ProjectUpdateSerializationSchema,
      );
    });

    it("UpdateLabelRequestSchema and LabelUpdateSerializationSchema have same field names", () => {
      assertSameFields(
        "LabelUpdate",
        UpdateLabelRequestSchema,
        LabelUpdateSerializationSchema,
      );
    });

    it("UpdateUserRequestSchema and UserUpdateSerializationSchema have same field names", () => {
      assertSameFields(
        "UserUpdate",
        UpdateUserRequestSchema,
        UserUpdateSerializationSchema,
      );
    });
  });

  describe("Delete Request/Serialization schemas", () => {
    it("DeleteTaskRequestSchema and TaskDeleteSerializationSchema have same field names", () => {
      assertSameFields(
        "TaskDelete",
        DeleteTaskRequestSchema,
        TaskDeleteSerializationSchema,
      );
    });

    it("DeleteProjectRequestSchema and ProjectDeleteSerializationSchema have same field names", () => {
      assertSameFields(
        "ProjectDelete",
        DeleteProjectRequestSchema,
        ProjectDeleteSerializationSchema,
      );
    });

    it("DeleteLabelRequestSchema and LabelDeleteSerializationSchema have same field names", () => {
      assertSameFields(
        "LabelDelete",
        DeleteLabelRequestSchema,
        LabelDeleteSerializationSchema,
      );
    });
  });
});
