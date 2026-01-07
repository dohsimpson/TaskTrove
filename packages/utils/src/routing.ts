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
import {
  ProjectGroup,
  LabelGroup,
  ProjectSection,
} from "@tasktrove/types/group";

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

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const UUID_SUFFIX_REGEX =
  /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;
const BASE58_ALPHABET =
  "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const BASE58_LOOKUP = new Map(
  Array.from(BASE58_ALPHABET).map((char, index) => [char, index]),
);
const SHORT_ID_LENGTH = 22;
const SHORT_ID_SUFFIX_REGEX = /([1-9A-HJ-NP-Za-km-z]{22})$/;

function uuidToBytes(uuid: string): Uint8Array | null {
  if (!UUID_REGEX.test(uuid)) return null;
  const hex = uuid.replace(/-/g, "");
  if (hex.length !== 32) return null;
  const bytes = new Uint8Array(16);
  for (let i = 0; i < 16; i += 1) {
    const byte = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    if (Number.isNaN(byte)) return null;
    bytes[i] = byte;
  }
  return bytes;
}

function bytesToUuid(bytes: Uint8Array): string | null {
  if (bytes.length !== 16) return null;
  const hex = Array.from(bytes, (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join("-");
}

function base58Encode(bytes: Uint8Array): string {
  if (bytes.length === 0) return "";

  const digits = [0];
  for (const byte of bytes) {
    let carry = byte;
    for (let i = 0; i < digits.length; i += 1) {
      const digit = digits[i] ?? 0;
      const value = digit * 256 + carry;
      digits[i] = value % 58;
      carry = Math.floor(value / 58);
    }
    while (carry > 0) {
      digits.push(carry % 58);
      carry = Math.floor(carry / 58);
    }
  }

  let result = "";
  for (let i = 0; i < bytes.length && bytes[i] === 0; i += 1) {
    result += "1";
  }
  for (let i = digits.length - 1; i >= 0; i -= 1) {
    const digit = digits[i];
    result += digit === undefined ? "" : (BASE58_ALPHABET[digit] ?? "");
  }
  return result;
}

function base58Decode(value: string): Uint8Array | null {
  if (value.length === 0) return new Uint8Array();

  const bytes = [0];
  for (const char of value) {
    const digit = BASE58_LOOKUP.get(char);
    if (digit === undefined) return null;
    let carry = digit;
    for (let i = 0; i < bytes.length; i += 1) {
      const byteValue = bytes[i] ?? 0;
      const next = byteValue * 58 + carry;
      bytes[i] = next & 0xff;
      carry = next >> 8;
    }
    while (carry > 0) {
      bytes.push(carry & 0xff);
      carry >>= 8;
    }
  }

  let leadingZeros = 0;
  for (let i = 0; i < value.length && value[i] === "1"; i += 1) {
    leadingZeros += 1;
  }

  const result = new Uint8Array(leadingZeros + bytes.length);
  for (let i = 0; i < bytes.length; i += 1) {
    result[result.length - 1 - i] = bytes[i] ?? 0;
  }
  return result;
}

function encodeUuidToShortId(uuid: string): string | null {
  const bytes = uuidToBytes(uuid);
  if (!bytes) return null;
  const encoded = base58Encode(bytes);
  if (encoded.length >= SHORT_ID_LENGTH) return encoded;
  return encoded.padStart(SHORT_ID_LENGTH, "1");
}

function decodeShortIdToUuid(shortId: string): string | null {
  const bytes = base58Decode(shortId);
  if (!bytes) return null;
  if (bytes.length > 16) {
    let offset = 0;
    while (offset < bytes.length - 16 && bytes[offset] === 0) {
      offset += 1;
    }
    if (bytes.length - offset !== 16) return null;
    return bytesToUuid(bytes.slice(offset));
  }
  if (bytes.length < 16) {
    const padded = new Uint8Array(16);
    padded.set(bytes, 16 - bytes.length);
    return bytesToUuid(padded);
  }
  return bytesToUuid(bytes);
}

function createBaseSlug(text: string): string {
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

  return slug;
}

export function createEntitySlug(name: string, id: string): string {
  const base = createBaseSlug(name);
  const shortId = encodeUuidToShortId(id);
  const suffix = shortId ?? id;
  return `${base}-${suffix}`;
}

export function createProjectSlug(
  project: Pick<Project, "id" | "name">,
): string {
  return createEntitySlug(project.name, project.id);
}

export function createLabelSlug(label: Pick<Label, "id" | "name">): string {
  return createEntitySlug(label.name, label.id);
}

export function createProjectGroupSlug(
  group: Pick<ProjectGroup, "id" | "name">,
): string {
  return createEntitySlug(group.name, group.id);
}

export function createLabelGroupSlug(
  group: Pick<LabelGroup, "id" | "name">,
): string {
  return createEntitySlug(group.name, group.id);
}

export function createSectionSlug(
  section: Pick<ProjectSection, "id" | "name">,
): string {
  return createEntitySlug(section.name, section.id);
}

export function extractIdFromSlug(slug: string): string | null {
  const match = slug.match(UUID_SUFFIX_REGEX);
  if (match?.[1]) return match[1];

  const shortMatch = slug.match(SHORT_ID_SUFFIX_REGEX);
  const shortId = shortMatch?.[1];
  if (!shortId) return null;
  const prefixIndex = slug.length - shortId.length - 1;
  if (prefixIndex >= 0 && slug[prefixIndex] !== "-") {
    return null;
  }
  return decodeShortIdToUuid(shortId);
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
  const candidateId = extractIdFromSlug(idOrSlug) ?? idOrSlug;
  if (isValidProjectId(candidateId)) {
    return projects.find((p) => p.id === candidateId) ?? null;
  }

  return null;
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
  const candidateId = extractIdFromSlug(idOrSlug) ?? idOrSlug;
  if (isValidLabelId(candidateId)) {
    return labels.find((l) => l.id === candidateId) ?? null;
  }

  return null;
}

/**
 * Helper function to recursively search for a project group tree by ID or slug
 */
function searchProjectGroupInTree(
  group: ProjectGroup,
  idOrSlug: string,
): ProjectGroup | null {
  const candidateId = extractIdFromSlug(idOrSlug) ?? idOrSlug;
  if (isValidGroupId(candidateId) && group.id === candidateId) {
    return group;
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
  const candidateId = extractIdFromSlug(idOrSlug) ?? idOrSlug;
  if (isValidGroupId(candidateId) && group.id === candidateId) {
    return group;
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
