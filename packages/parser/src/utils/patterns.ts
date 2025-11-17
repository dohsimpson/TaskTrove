const WORD_CLASS = "\\p{L}\\p{N}_";

export const WORD_CLASS_REGEX = WORD_CLASS;

const buildStartBoundary = (wordClass: string = WORD_CLASS_REGEX): string =>
  `(?<![${wordClass}])`;

const buildEndBoundary = (wordClass: string = WORD_CLASS_REGEX): string =>
  `(?=$|[^${wordClass}])`;

export const START_BOUNDARY = buildStartBoundary();
export const END_BOUNDARY = buildEndBoundary();

export const ensureUnicodeFlag = (flags: string): string => {
  const deduped = Array.from(new Set(flags.split(""))).join("");
  return deduped.includes("u") ? deduped : `${deduped}u`;
};

export const buildBoundedPattern = (
  body: string,
  flags: string = "gi",
  wordClass: string = WORD_CLASS_REGEX,
): RegExp =>
  new RegExp(
    `${buildStartBoundary(wordClass)}${body}${buildEndBoundary(wordClass)}`,
    ensureUnicodeFlag(flags),
  );

export const createBoundaries = (wordClass: string = WORD_CLASS_REGEX) => ({
  start: buildStartBoundary(wordClass),
  end: buildEndBoundary(wordClass),
});
