export type ExtractionType =
  | "priority"
  | "project"
  | "label"
  | "date"
  | "time"
  | "recurring"
  | "estimation"
  | "duration";

/**
 * Autocomplete types - subset of extraction types that support autocomplete in UI
 */
export type AutocompleteType = "project" | "label" | "date" | "estimation";

export interface ExtractionResult {
  type: ExtractionType;
  value: unknown;
  match: string;
  startIndex: number;
  endIndex: number;
  confidence?: number;
}

export interface ParserContext {
  locale: string;
  referenceDate: Date;
  disabledSections?: Set<string>;
  projects?: Array<{ name: string }>;
  labels?: Array<{ name: string }>;
  /** Prefer day/month interpretation for ambiguous numeric dates (e.g., 1/2). */
  preferDayMonthFormat?: boolean;
}

export interface ParsedTask {
  title: string;
  project?: string;
  labels: string[];
  priority?: number;
  dueDate?: Date;
  time?: string;
  duration?: string;
  recurring?: string;
  estimation?: number;
  originalText: string;
}
