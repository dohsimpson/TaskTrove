import slugify from "slugify";
import { Project, Label } from "@tasktrove/types/core";
import {
  ProjectId,
  ProjectIdSchema,
  LabelId,
  LabelIdSchema,
  GroupId,
  GroupIdSchema,
} from "@tasktrove/types/id";
import { ProjectGroup, LabelGroup } from "@tasktrove/types/group";

// Simple MurmurHash3 implementation for generating fixed-length hashes
function murmurHash3(text: string): string {
  let hash = 0;
  if (text.length === 0) return hash.toString(36).padStart(8, "0");

  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  return Math.abs(hash).toString(36).padStart(8, "0");
}

function createSafeSlug(text: string, existingSlugs: Set<string>): string {
  // First remove characters that would get converted to confusing word names
  // Keep & (becomes "and") and < > (become "less"/"greater") as they're meaningful
  const preprocessed = text.replace(/[#$%¢£¤¥©®℠™♥∞€…₠₢₣₤₦₧₨₩₫₱]/g, "");

  let slug = slugify(preprocessed, {
    lower: true,
    strict: true,
    trim: true,
    remove: /[*+~.()'"!:@]/g,
  });

  // If slug is empty after processing, use hash of original text
  if (!slug) {
    slug = murmurHash3(text);
  }

  // If no collision, return the slug
  if (!existingSlugs.has(slug)) {
    return slug;
  }

  // Find next available slug with increment
  let counter = 1;
  let candidateSlug = `${slug}-${counter}`;

  while (existingSlugs.has(candidateSlug) && counter <= 100) {
    counter++;
    candidateSlug = `${slug}-${counter}`;
  }

  // If we couldn't find a unique slug after 100 tries, fall back to hash
  if (counter > 100) {
    return murmurHash3(text);
  }

  return candidateSlug;
}

export function createSafeProjectNameSlug(
  text: string,
  projects: Project[],
): string {
  const existingSlugs = new Set(projects.map((p) => p.slug));
  return createSafeSlug(text, existingSlugs);
}

export function createSafeLabelNameSlug(text: string, labels: Label[]): string {
  const existingSlugs = new Set(labels.map((l) => l.slug));
  return createSafeSlug(text, existingSlugs);
}

/**
 * Helper function to collect all slugs from a project group tree recursively
 */
function collectProjectGroupSlugs(group: ProjectGroup): string[] {
  const slugs = [group.slug];

  // Recursively collect slugs from nested groups
  for (const item of group.items) {
    if (typeof item === "object" && "slug" in item) {
      const nestedGroup = item;
      if ("type" in nestedGroup) {
        slugs.push(...collectProjectGroupSlugs(nestedGroup));
      }
    }
  }

  return slugs;
}

/**
 * Helper function to collect all slugs from a label group tree recursively
 */
function collectLabelGroupSlugs(group: LabelGroup): string[] {
  const slugs = [group.slug];

  // Recursively collect slugs from nested groups
  for (const item of group.items) {
    if (typeof item === "object" && "slug" in item) {
      const nestedGroup = item;
      if ("type" in nestedGroup) {
        slugs.push(...collectLabelGroupSlugs(nestedGroup));
      }
    }
  }

  return slugs;
}

export function createSafeProjectGroupNameSlug(
  text: string,
  projectGroups?: ProjectGroup,
): string {
  const existingSlugs = new Set<string>();

  if (projectGroups) {
    const allSlugs = collectProjectGroupSlugs(projectGroups);
    allSlugs.forEach((slug) => existingSlugs.add(slug));
  }

  return createSafeSlug(text, existingSlugs);
}

export function createSafeLabelGroupNameSlug(
  text: string,
  labelGroups?: LabelGroup,
): string {
  const existingSlugs = new Set<string>();

  if (labelGroups) {
    const allSlugs = collectLabelGroupSlugs(labelGroups);
    allSlugs.forEach((slug) => existingSlugs.add(slug));
  }

  return createSafeSlug(text, existingSlugs);
}

// =============================================================================
// ROUTE RESOLUTION UTILITIES
// =============================================================================

/**
 * Route parsing utilities for handling both ID and slug-based routing
 *
 * These utilities enable flexible routing where both UUID and slug formats
 * are supported for projects and labels, with ID taking precedence over slug.
 */

/**
 * Validates if a string is a valid ProjectId (UUID format)
 */
export function isValidProjectId(id: string): id is ProjectId {
  try {
    ProjectIdSchema.parse(id);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validates if a string is a valid LabelId (UUID format)
 */
function isValidLabelId(id: string): id is LabelId {
  try {
    LabelIdSchema.parse(id);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validates if a string is a valid GroupId (UUID format)
 */
function isValidGroupId(id: string): id is GroupId {
  try {
    GroupIdSchema.parse(id);
    return true;
  } catch {
    return false;
  }
}

/**
 * Resolves a project by ID or slug
 *
 * @param idOrSlug - The identifier to resolve (UUID or slug)
 * @param projects - Array of projects to search
 * @returns The matching project or null if not found
 *
 * Priority: ID first, then slug
 */
export function resolveProject(
  idOrSlug: string,
  projects: Project[],
): Project | null {
  // First try to find by ID (UUID format check)
  if (isValidProjectId(idOrSlug)) {
    const project = projects.find((p) => p.id === idOrSlug);
    if (project) return project;
  }

  // Then try to find by slug
  return projects.find((p) => p.slug === idOrSlug) || null;
}

/**
 * Resolves a label by ID or slug
 *
 * @param idOrSlug - The identifier to resolve (UUID or slug)
 * @param labels - Array of labels to search
 * @returns The matching label or null if not found
 *
 * Priority: ID first, then slug
 */
export function resolveLabel(idOrSlug: string, labels: Label[]): Label | null {
  // First try to find by ID (UUID format check)
  if (isValidLabelId(idOrSlug)) {
    const label = labels.find((l) => l.id === idOrSlug);
    if (label) return label;
  }

  // Then try to find by slug
  return labels.find((l) => l.slug === idOrSlug) || null;
}

/**
 * Helper function to recursively search for a project group tree by ID or slug
 */
function searchProjectGroupInTree(
  group: ProjectGroup,
  idOrSlug: string,
): ProjectGroup | null {
  // Check if this group matches
  if (isValidGroupId(idOrSlug)) {
    if (group.id === idOrSlug) return group;
  } else {
    if (group.slug === idOrSlug) return group;
  }

  // Search in nested groups
  for (const item of group.items) {
    if (typeof item === "object" && "id" in item && "type" in item) {
      const found = searchProjectGroupInTree(item, idOrSlug);
      if (found) return found;
    }
  }

  return null;
}

/**
 * Helper function to recursively search for a label group tree by ID or slug
 */
function searchLabelGroupInTree(
  group: LabelGroup,
  idOrSlug: string,
): LabelGroup | null {
  // Check if this group matches
  if (isValidGroupId(idOrSlug)) {
    if (group.id === idOrSlug) return group;
  } else {
    if (group.slug === idOrSlug) return group;
  }

  // Search in nested groups
  for (const item of group.items) {
    if (typeof item === "object" && "id" in item && "type" in item) {
      const found = searchLabelGroupInTree(item, idOrSlug);
      if (found) return found;
    }
  }

  return null;
}

/**
 * Resolves a project group by ID or slug
 *
 * @param idOrSlug - The identifier to resolve (UUID or slug)
 * @param projectGroups - Root project groups tree to search
 * @returns The matching project group or null if not found
 *
 * Priority: ID first, then slug
 */
export function resolveProjectGroup(
  idOrSlug: string,
  projectGroups?: ProjectGroup,
): ProjectGroup | null {
  if (!projectGroups) return null;
  return searchProjectGroupInTree(projectGroups, idOrSlug);
}

/**
 * Resolves a label group by ID or slug
 *
 * @param idOrSlug - The identifier to resolve (UUID or slug)
 * @param labelGroups - Root label groups tree to search
 * @returns The matching label group or null if not found
 *
 * Priority: ID first, then slug
 */
export function resolveLabelGroup(
  idOrSlug: string,
  labelGroups?: LabelGroup,
): LabelGroup | null {
  if (!labelGroups) return null;
  return searchLabelGroupInTree(labelGroups, idOrSlug);
}

/**
 * Extracts the base path from a Next.js API route by removing dynamic segments.
 *
 * Handles all Next.js dynamic route patterns:
 * - `[param]` - Single dynamic segment
 * - `[...param]` - Catch-all segment
 * - `[[...param]]` - Optional catch-all segment
 *
 * @param apiRoute - The full API route path (e.g., "/api/v1/assets/[...path]")
 * @returns The base path without dynamic segments (e.g., "/api/v1/assets")
 *
 * @example
 * ```typescript
 * getApiBasePath("/api/v1/assets/[...path]")
 * // Returns: "/api/v1/assets"
 *
 * getApiBasePath("/api/users/[id]")
 * // Returns: "/api/users"
 *
 * getApiBasePath("/api/posts/[slug]/comments")
 * // Returns: "/api/posts/comments"
 *
 * getApiBasePath("/api/v1/tasks")
 * // Returns: "/api/v1/tasks" (no dynamic segments)
 * ```
 */
export function getApiBasePath(apiRoute: string): string {
  // Remove all Next.js dynamic segment patterns:
  // - [param] - Single dynamic segment
  // - [...param] - Catch-all segment
  // - [[...param]] - Optional catch-all segment
  return apiRoute
    .replace(/\/\[\[\.\.\..*?\]\]/g, "") // Remove [[...param]]
    .replace(/\/\[\.\.\..*?\]/g, "") // Remove [...param]
    .replace(/\/\[.*?\]/g, "") // Remove [param]
    .replace(/\/$/, ""); // Remove trailing slash if present
}
