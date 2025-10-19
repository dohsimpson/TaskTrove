// Main parser
export { TaskParser } from "./TaskParser";
export { ParserResult } from "./ParserResult";

// Types
export type {
  ExtractionResult,
  ExtractionType,
  ParserContext,
  ParsedTask,
} from "./types";

// Extractors
export { PriorityExtractor } from "./extractors/priority/PriorityExtractor";
export { ProjectExtractor } from "./extractors/tags/ProjectExtractor";
export { LabelExtractor } from "./extractors/tags/LabelExtractor";
export { DateExtractor } from "./extractors/date/DateExtractor";
export { WeekdayExtractor } from "./extractors/date/WeekdayExtractor";
export { DurationDateExtractor } from "./extractors/date/DurationDateExtractor";
export { TimeExtractor } from "./extractors/time/TimeExtractor";
export { RecurringExtractor } from "./extractors/recurring/RecurringExtractor";
export { EstimationExtractor } from "./extractors/estimation/EstimationExtractor";
export { DurationExtractor } from "./extractors/duration/DurationExtractor";
export type { Extractor } from "./extractors/base/Extractor";

// Processors
export { OverlapResolver } from "./processors/OverlapResolver";
export { LastOccurrenceSelector } from "./processors/LastOccurrenceSelector";
export { TimeToDateProcessor } from "./processors/TimeToDateProcessor";
export { DateTimeSplitter } from "./processors/DateTimeSplitter";
export type { Processor } from "./processors/base/Processor";

// Plugin system (for extensibility)
export { createParser, registerCustomExtractor } from "./PluginSystem";
