import { translate, withLanguage, type Language } from './i18n';
import * as tables from './soloPlayTables';

const sources = [
  { key: 'event', label: 'Suceso', table: tables.eventTable },
  { key: 'complication', label: 'Complicación', table: tables.complicationTable },
  { key: 'person', label: 'Ocupación', table: tables.npcOccupationTable },
  { key: 'motivation', label: 'Motivación', table: tables.npcMotivationTable },
  { key: 'mood', label: 'Ánimo', table: tables.npcMoodTable },
  { key: 'place', label: 'Lugar', table: tables.locationTypeTable },
  { key: 'clue', label: 'Pista', table: tables.clueTypeTable },
  { key: 'rumor', label: 'Rumor', table: tables.rumorTable },
] as const;
export type OracleSource = typeof sources[number]['key'];
export const oracleApproaches: { key: string; label: string; sources: OracleSource[] }[] = [
  { key: 'situation', label: 'Qué ocurre', sources: ['event', 'complication'] },
  { key: 'person', label: 'Quién interviene', sources: ['person', 'motivation', 'mood'] },
  { key: 'place', label: 'Dónde ocurre', sources: ['place', 'event'] },
  { key: 'motive', label: 'Qué busca', sources: ['motivation', 'complication'] },
  { key: 'discovery', label: 'Qué descubren', sources: ['clue', 'rumor'] },
];
export const oracleSources = sources.map(({ key, label }) => ({ key, label }));

// Like the original OracleTool: the GM chooses relevant tables, not a word salad.
export function openOracle(question: string, selected: readonly OracleSource[], language: Language, random: () => number = Math.random) {
  if (!question.trim()) throw new Error('Escribe primero tu pregunta.');
  const keys = [...new Set(selected)];
  if (!keys.length || keys.some(key => !sources.some(source => source.key === key))) throw new Error('Selecciona al menos una tabla.');
  return withLanguage(language, () => keys.map(key => {
    const source = sources.find(source => source.key === key)!;
    const values = source.table();
    const result = values[Math.min(values.length - 1, Math.max(0, Math.floor(random() * values.length)))];
    return { key, label: translate(source.label, language), text: result };
  }));
}
