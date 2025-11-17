import {
  WORD_CLASS_REGEX,
  START_BOUNDARY,
  END_BOUNDARY,
  ensureUnicodeFlag,
} from "./patterns";

const DEFAULT_WORD_CLASS = WORD_CLASS_REGEX;

export interface TagPatternOptions {
  prefix: string;
  candidates?: string[];
  capturePattern?: string;
  flags?: string;
}

const escapeRegex = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const buildTagPattern = ({
  prefix,
  candidates,
  capturePattern = `[${DEFAULT_WORD_CLASS}-]+`,
  flags = "g",
}: TagPatternOptions): RegExp => {
  const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const finalFlags = ensureUnicodeFlag(flags);

  let bodyPattern: string;

  if (candidates && candidates.length > 0) {
    const escapedCandidates = candidates.map(escapeRegex);
    bodyPattern = `(${escapedCandidates.join("|")})`;
  } else {
    bodyPattern = `(${capturePattern})`;
  }

  return new RegExp(
    `${START_BOUNDARY}${escapedPrefix}${bodyPattern}${END_BOUNDARY}`,
    finalFlags,
  );
};
