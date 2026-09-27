import tables from './data/tables.json';
import reference from './data/reference.json';
import labels from './data/labels.json';
import tablesEn from './data/tables-en.json';
import referenceEn from './data/reference-en.json';
import labelsEn from './data/labels-en.json';
import english from './data/ui-en.json';
import { missionKitLabels } from './mission-kit';

export type Language = 'es' | 'en';
// This scope is only for synchronous generator calls and is always restored.
let generatorLanguage: Language = 'es';
export function withLanguage<T>(language: Language, action: () => T): T {
  const previous = generatorLanguage;
  generatorLanguage = language;
  try { return action(); } finally { generatorLanguage = previous; }
}
export function translate(text: string, language: Language = generatorLanguage, values?: Record<string, string | number>): string {
  const translated = language === 'en' ? (english as Record<string, string>)[text] ?? text : text;
  return values ? translated.replace(/\{(\w+)\}/g, (match, key) => String(values[key] ?? match)) : translated;
}

export function lookup(source: unknown, key: string): unknown {
  return key.split('.').reduce<unknown>((value, part) =>
    value && typeof value === 'object' ? (value as Record<string, unknown>)[part] : undefined, source);
}
export const tableLabel = (key: string, language: Language = generatorLanguage): string => String(lookup(language === 'en' ? labelsEn : labels, key) ?? key);
export const referenceLabel = (key: string, language: Language = generatorLanguage): string => {
  const cleanKey = key.replace(/^t:/, '');
  return missionKitLabels[language][cleanKey] ?? String(lookup(language === 'en' ? referenceEn : reference, cleanKey) ?? key);
};
const tableLookup = {
  t(key: string): unknown {
    const value = lookup(generatorLanguage === 'en' ? tablesEn : tables, key);
    if (value === undefined) throw new Error(`Tabla desconocida: ${key}`);
    return value;
  },
};
export default tableLookup;
