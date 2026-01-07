const CRON_PART_SEPARATOR = /\s+/;
const MONTH_ALIASES: Record<string, number> = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dec: 12,
};
const DOW_ALIASES: Record<string, number> = {
  sun: 0,
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
};

const parseCronValue = (
  raw: string,
  aliases?: Record<string, number>,
): number | null => {
  if (/^\d+$/.test(raw)) {
    return Number(raw);
  }

  if (aliases) {
    const normalized = raw.toLowerCase();
    if (normalized in aliases) {
      const value = aliases[normalized];
      if (value !== undefined) {
        return value;
      }
    }
  }

  return null;
};

const isNumberInRange = (value: number, min: number, max: number) =>
  Number.isInteger(value) && value >= min && value <= max;

const isValidCronRange = (
  token: string,
  min: number,
  max: number,
  aliases?: Record<string, number>,
) => {
  const parts = token.split("-");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return false;
  const start = parseCronValue(parts[0], aliases);
  const end = parseCronValue(parts[1], aliases);
  if (start === null || end === null) return false;
  if (!isNumberInRange(start, min, max) || !isNumberInRange(end, min, max)) {
    return false;
  }
  return start <= end;
};

const isValidCronStep = (
  token: string,
  min: number,
  max: number,
  aliases?: Record<string, number>,
) => {
  const parts = token.split("/");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return false;
  const [base, rawStep] = parts;
  const step = parseCronValue(rawStep, aliases);
  if (step === null || !isNumberInRange(step, 1, max)) return false;

  if (base === "*") return true;
  if (base.includes("-")) {
    return isValidCronRange(base, min, max, aliases);
  }

  const value = parseCronValue(base, aliases);
  return value !== null && isNumberInRange(value, min, max);
};

const isValidCronToken = (
  token: string,
  min: number,
  max: number,
  aliases?: Record<string, number>,
) => {
  if (!token) return false;
  if (token === "*") return true;

  if (token.includes("/")) {
    return isValidCronStep(token, min, max, aliases);
  }

  if (token.includes("-")) {
    return isValidCronRange(token, min, max, aliases);
  }

  const value = parseCronValue(token, aliases);
  return value !== null && isNumberInRange(value, min, max);
};

const isValidCronField = (
  field: string,
  min: number,
  max: number,
  aliases?: Record<string, number>,
) => {
  const parts = field.split(",");
  return parts.every((part) =>
    isValidCronToken(part.trim(), min, max, aliases),
  );
};

export const isValidCronExpression = (expression: string) => {
  const parts = expression.trim().split(CRON_PART_SEPARATOR);
  if (parts.length !== 5) return false;
  const [minute, hour, day, month, dow] = parts;
  if (!minute || !hour || !day || !month || !dow) return false;

  return (
    isValidCronField(minute, 0, 59) &&
    isValidCronField(hour, 0, 23) &&
    isValidCronField(day, 1, 31) &&
    isValidCronField(month, 1, 12, MONTH_ALIASES) &&
    isValidCronField(dow, 0, 7, DOW_ALIASES)
  );
};
