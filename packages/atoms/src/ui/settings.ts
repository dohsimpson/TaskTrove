import { atom, Getter, Setter } from "jotai";

export type SettingsCategoryId =
  | "general"
  | "notifications"
  | "data"
  | "appearance"
  | "scheduler"
  | "productivity"
  | "users";

// Constants for base settings categories
export const SETTINGS_CATEGORIES = [
  "general",
  "notifications",
  "data",
  "appearance",
  "scheduler",
  "productivity",
  "users",
] as const;

// Type guard
export const isValidCategory = (
  categoryId: string,
): categoryId is SettingsCategoryId => {
  return !(categoryId === "productivity" || categoryId === "users");
};

// Atom to track the active settings category
export const activeSettingsCategoryAtom = atom<SettingsCategoryId>("general");

// Action atom to navigate to a specific settings category
export const navigateToSettingsCategoryAtom = atom(
  null,
  (get: Getter, set: Setter, categoryId: SettingsCategoryId) => {
    set(activeSettingsCategoryAtom, categoryId);
  },
);

// Derived atom to check mobile drawer state (for future use)
export const mobileSettingsDrawerOpenAtom = atom(false);

// Action atom to toggle mobile drawer
export const toggleMobileSettingsDrawerAtom = atom(
  null,
  (get: Getter, set: Setter) => {
    set(mobileSettingsDrawerOpenAtom, !get(mobileSettingsDrawerOpenAtom));
  },
);
