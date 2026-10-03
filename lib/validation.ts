export const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

export const hasStrings = (value: Record<string, unknown>, keys: string[]) =>
  keys.every(key => typeof value[key] === 'string');

export const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

export const isIntegerInRange = (value: unknown, min: number, max: number): value is number =>
  isFiniteNumber(value) && Number.isInteger(value) && value >= min && value <= max;

export const isRecordList = (value: unknown, check: (item: Record<string, unknown>) => boolean): value is Record<string, unknown>[] =>
  Array.isArray(value) && value.every(item => isRecord(item) && check(item))
  && new Set(value.map(item => item.id)).size === value.length;
