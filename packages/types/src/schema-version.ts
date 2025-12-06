import { createVersionString } from "./id";
import type { VersionString } from "./id";

// this is the latest version of the data schema, it should be the same as the last data migration function version in data-migration.ts file.
export const LATEST_DATA_VERSION: VersionString =
  createVersionString("v0.11.0");
