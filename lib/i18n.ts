import tables from './data/tables.json';
import reference from './data/reference.json';
import labels from './data/labels.json';

export function lookup(source: unknown, key: string): unknown {
  return key.split('.').reduce<unknown>((value, part) =>
    value && typeof value === 'object' ? (value as Record<string, unknown>)[part] : undefined, source);
}
export const tableLabel = (key: string): string => String(lookup(labels, key) ?? key);
export const referenceLabel = (key: string): string => String(lookup(reference, key.replace(/^t:/, '')) ?? key);
const tableLookup = {
  t(key: string): unknown {
    const value = lookup(tables, key);
    if (value === undefined) throw new Error(`Tabla desconocida: ${key}`);
    return value;
  },
};
export default tableLookup;
