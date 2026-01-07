import type { Instruction } from "@atlaskit/pragmatic-drag-and-drop-hitbox/list-item";
import { reorderItems } from "./drag-and-drop";

export type SectionLike<SectionId extends string = string> = {
  id: SectionId;
  items: string[];
};
export type ProjectLike<
  ProjectId extends string = string,
  SectionId extends string = string,
> = {
  id: ProjectId;
  sections: SectionLike<SectionId>[];
};

/**
 * Pure helper that calculates the target section items after a drop.
 * Handles both same-section reorders and cross-section inserts.
 */
export function calculateTargetSectionItems(
  currentSectionItems: string[],
  draggedIds: string[],
  targetId: string,
  instruction: Instruction,
): string[] {
  const draggedTasksFromCurrentSection = draggedIds.every((id) =>
    currentSectionItems.includes(id),
  );

  if (draggedTasksFromCurrentSection) {
    const result = reorderItems(
      currentSectionItems,
      draggedIds,
      targetId,
      instruction,
      (id) => String(id),
    );
    return result ?? currentSectionItems;
  }

  if (
    instruction.operation !== "reorder-before" &&
    instruction.operation !== "reorder-after"
  ) {
    return currentSectionItems;
  }

  const targetIndex = currentSectionItems.findIndex((id) => id === targetId);
  if (targetIndex === -1) return currentSectionItems;

  const insertIndex =
    instruction.operation === "reorder-after" ? targetIndex + 1 : targetIndex;
  const next = [...currentSectionItems];
  next.splice(insertIndex, 0, ...draggedIds);
  return next;
}

export function removeIdsFromProjects<P extends ProjectLike>(
  projects: P[],
  ids: string[],
): P[] {
  return projects.map((project) => ({
    ...project,
    sections: project.sections.map((section) => ({
      ...section,
      items: section.items.filter((id) => !ids.includes(id)),
    })),
  }));
}

export function insertIdsAtSectionEnd<P extends ProjectLike>(
  project: P,
  sectionId: P["sections"][number]["id"],
  ids: string[],
): P {
  return {
    ...project,
    sections: project.sections.map((section) =>
      section.id === sectionId
        ? { ...section, items: [...section.items, ...ids] }
        : section,
    ),
  };
}

export function replaceSectionItems<P extends ProjectLike>(
  project: P,
  sectionId: P["sections"][number]["id"],
  items: string[],
): P {
  return {
    ...project,
    sections: project.sections.map((section) =>
      section.id === sectionId ? { ...section, items } : section,
    ),
  };
}
