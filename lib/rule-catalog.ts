import type { GMTableCategory, GMTableDef } from './reference';

export type Bilingual = { es: string; en: string };
export type RuleCell = Bilingual | string | number;
export type RuleFile = {
  key: string; title: Bilingual; description: Bilingual; pages: string; sheet?: string;
  headers?: (Bilingual | string)[]; rows: RuleCell[][];
};
export const bilingual = (es: string, en: string): Bilingual => ({ es, en });

// Both books use the same translation keys, table shape and source attribution.
// Canonical header keys remain available to consumers such as the market catalog.
export function createRuleCatalog(prefix: string, book: string) {
  const labels: Record<'es' | 'en', Record<string, string>> = { es: {}, en: {} };
  function label(key: string, value: Bilingual) {
    const id = `${prefix}.${key}`;
    labels.es[id] = value.es; labels.en[id] = value.en;
    return id;
  }
  function category(key: string, title: Bilingual, color: string, files: RuleFile[]): GMTableCategory {
    return { key, titleKey: label(`category.${key}`, title), color, tables: files.map((file): GMTableDef => {
      const headers = file.headers ?? [bilingual('Regla', 'Rule'), bilingual('Resolución', 'Resolution')];
      if (file.rows.some(row => row.length !== headers.length)) throw new Error(`Invalid columns: ${file.key}`);
      return {
        key: file.key, color, titleKey: label(`${file.key}.title`, file.title),
        descriptionKey: label(`${file.key}.description`, file.description),
        sourceKey: label(`${file.key}.source`, bilingual(
          `Fuente: ${book} · pp. ${file.pages} (paginación impresa)${file.sheet ? ` · ${file.sheet}` : ''}. Resumen de consulta; traducción propia.`,
          `Source: ${book} · pp. ${file.pages} (printed pages)${file.sheet ? ` · ${file.sheet}` : ''}. Rules reference summary.`,
        )),
        columns: headers.map((header, i) => ({ headerKey: typeof header === 'string' && header.startsWith('headers.') ? header : label(`${file.key}.header.${i}`, typeof header === 'string' ? bilingual(header, header) : header) })),
        rows: file.rows.map((cells, r) => ({ cells: cells.map((cell, c) => typeof cell === 'object' ? `t:${label(`${file.key}.row.${r}.${c}`, cell)}` : cell) })),
      };
    }) };
  }
  return { labels, category };
}
