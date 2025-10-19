export type ExtractionType =
  | "priority"
  | "project"
  | "label"
  | "date"
  | "time"
  | "recurring"
  | "estimation"
  | "duration";

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
