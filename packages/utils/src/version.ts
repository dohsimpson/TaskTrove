import type { VersionString } from "@tasktrove/types/id";

export type VersionInput = VersionString | string;

function parseVersion(value: VersionInput): number[] {
  if (typeof value !== "string") {
    return [];
  }

  return value
    .replace(/^v/, "")
    .split(".")
    .map((segment) => Number(segment));
}

export function compareVersions(a: VersionInput, b: VersionInput): number {
  const versionA = parseVersion(a);
  const versionB = parseVersion(b);

  for (let i = 0; i < Math.max(versionA.length, versionB.length); i++) {
    const partA = versionA[i] ?? 0;
    const partB = versionB[i] ?? 0;

    if (partA < partB) return -1;
    if (partA > partB) return 1;
  }

  return 0;
}

export function isVersionLessThan(a: VersionInput, b: VersionInput): boolean {
  return compareVersions(a, b) < 0;
}

export function isVersionEqual(a: VersionInput, b: VersionInput): boolean {
  return compareVersions(a, b) === 0;
}

export function isVersionGreaterThan(
  a: VersionInput,
  b: VersionInput,
): boolean {
  return compareVersions(a, b) > 0;
}
