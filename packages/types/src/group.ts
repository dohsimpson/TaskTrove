/**
 * Group Schemas
 *
 * Hierarchical grouping for projects and labels with recursive structure support.
 */

import { z } from "zod";
import type { TaskId, ProjectId, LabelId, GroupId } from "#id";
import {
  TaskIdSchema,
  ProjectIdSchema,
  LabelIdSchema,
  GroupIdSchema,
} from "#id";

// =============================================================================
// GROUP INTERFACES
// =============================================================================

/**
 * Base interface for all group types
 */
interface IBaseGroup {
  id: GroupId;
  name: string;
  slug: string;
  description?: string;
  color?: string;
}

/**
 * Project Section interface - extends IBaseGroup with items for task ordering
 */
export interface ProjectSection extends IBaseGroup {
  type: "section";
  items: TaskId[];
  /** Flag to indicate if this is the default section for tasks without explicit section assignment */
  isDefault?: boolean;
}

/**
 * Project Group interface - can contain ProjectIds or other ProjectGroups
 */
export interface ProjectGroup extends IBaseGroup {
  type: "project";
  items: (ProjectId | ProjectGroup)[];
}

/**
 * Label Group interface - can contain LabelIds or other LabelGroups
 */
export interface LabelGroup extends IBaseGroup {
  type: "label";
  items: (LabelId | LabelGroup)[];
}

// =============================================================================
// GROUP SCHEMAS
// =============================================================================

/**
 * Schema for a project section - extends IBaseGroup with items array
 */
export const ProjectSectionSchema: z.ZodType<ProjectSection> = z.object({
  /** Unique identifier for the section */
  id: GroupIdSchema,
  /** Display name of the section */
  name: z.string(),
  /** Unique SEO friendly slug (empty string for sections) */
  slug: z.string().default(""),
  /** Optional description */
  description: z.string().optional(),
  /** Section color (hex code) */
  color: z.string().optional(),
  /** Type discriminator for sections */
  type: z.literal("section"),
  /** Array of task IDs in display order for this section */
  items: z.array(TaskIdSchema),
  /** Flag to indicate if this is the default section for tasks without explicit section assignment */
  isDefault: z.boolean().optional(),
});

/**
 * Recursive Group schemas with proper TypeScript typing
 * Uses z.ZodType<Interface> pattern for type safety with recursive schemas
 */

// Project Group Schema with manual typing
// eslint-disable-next-line prefer-const
let ProjectGroupSchema: z.ZodType<ProjectGroup>;
export { ProjectGroupSchema };
ProjectGroupSchema = z
  .object({
    type: z.literal("project"),
    id: GroupIdSchema,
    name: z.string(),
    slug: z.string(),
    description: z.string().optional(),
    color: z.string().optional(),
    items: z.array(
      z.union([ProjectIdSchema, z.lazy(() => ProjectGroupSchema)]),
    ),
  })
  .refine(
    (group) => {
      // Prevent circular reference by checking if group contains itself as direct child
      const childGroups = group.items.filter(isGroup<ProjectGroup>);
      return !childGroups.some((childGroup) => childGroup.id === group.id);
    },
    {
      message:
        "Group cannot contain itself as a direct child (circular reference)",
      path: ["items"],
    },
  );

// Label Group Schema with manual typing
// eslint-disable-next-line prefer-const
let LabelGroupSchema: z.ZodType<LabelGroup>;
export { LabelGroupSchema };
LabelGroupSchema = z
  .object({
    type: z.literal("label"),
    id: GroupIdSchema,
    name: z.string(),
    slug: z.string(),
    description: z.string().optional(),
    color: z.string().optional(),
    items: z.array(z.union([LabelIdSchema, z.lazy(() => LabelGroupSchema)])),
  })
  .refine(
    (group) => {
      // Prevent circular reference by checking if group contains itself as direct child
      const childGroups = group.items.filter(isGroup<LabelGroup>);
      return !childGroups.some((childGroup) => childGroup.id === group.id);
    },
    {
      message:
        "Group cannot contain itself as a direct child (circular reference)",
      path: ["items"],
    },
  );

/**
 * Group schema - union of all group types
 */
export const GroupSchema = z.union([ProjectGroupSchema, LabelGroupSchema]);

/**
 * Group type - union of all group interfaces
 */
export type Group = ProjectGroup | LabelGroup;

/**
 * Base serialization schema for Group (colocated with GroupSchema for high correlation)
 */
export const GroupSerializationSchema = GroupSchema;

// =============================================================================
// TYPE GUARDS
// =============================================================================

/**
 * Generic type guard to check if an item is a specific Group type (vs a string ID)
 * In group items arrays, items can only be either string IDs or Group objects
 */
export function isGroup<T extends ProjectGroup | LabelGroup>(
  item: unknown,
): item is T {
  return typeof item === "object" && item !== null && "id" in item;
}
