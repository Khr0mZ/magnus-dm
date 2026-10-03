import { referenceLabel, type Language } from './i18n';
import { missionKitCategories } from './mission-kit';
import { coreRuleCategories } from './core-rules';

export interface GMTableColumn {
  headerKey: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
}
export interface GMTableRow { cells: (string | number)[]; highlight?: boolean }
export interface GMTableDef {
  key: string;
  titleKey: string;
  descriptionKey?: string;
  sourceKey?: string;
  columns: GMTableColumn[];
  rows: GMTableRow[];
  color: string;
}
export interface GMTableCategory { key: string; titleKey: string; color: string; tables: GMTableDef[] }

export const gmTableCategories: GMTableCategory[] = [...missionKitCategories, ...coreRuleCategories];

export function formatReference(table: GMTableDef, language: Language): string {
  return [
    referenceLabel(table.titleKey, language),
    ...(table.descriptionKey ? [referenceLabel(table.descriptionKey, language)] : []),
    table.columns.map(column => referenceLabel(column.headerKey, language)).join('\t'),
    ...table.rows.map(row => row.cells.map(cell => typeof cell === 'string' && cell.startsWith('t:') ? referenceLabel(cell, language) : cell).join('\t')),
    ...(table.sourceKey ? [referenceLabel(table.sourceKey, language)] : []),
  ].join('\n');
}
