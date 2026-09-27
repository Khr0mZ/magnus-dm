import { renderToStaticMarkup } from 'react-dom/server';
import { LocaleProvider } from '../app/locale';
import Workbench from '../app/workbench';
import MapEntryEditor from '../app/map-entry-editor';
import type { Language } from '../lib/i18n';
import { createRef } from 'react';
import { getGeneratorGroups } from '../lib/engine';
import GeneratorExplorer from '../app/generator-explorer';
import ReferenceExplorer, { FavoriteReferences, ReferenceDocument } from '../app/reference-explorer';
import { gmTableCategories } from '../lib/reference';
export function renderWorkbench(language: Language) {
  return renderToStaticMarkup(<LocaleProvider initialLanguage={language}><Workbench /></LocaleProvider>);
}

export function renderMapEditor(language: Language) {
  const entry = { id: 'marker', title: 'Zero / Afterlife', text: 'Nueva pista', kind: 'generador', time: 42, pinned: false, map: { latitude: 0.03, longitude: -0.04 } };
  return renderToStaticMarkup(<LocaleProvider initialLanguage={language}><MapEntryEditor entry={entry} enabled onSave={() => {}} onRemove={() => {}} onClose={() => {}} /></LocaleProvider>);
}

export function renderExplorer(language: Language, kind: 'generators' | 'reference', query = '', favorites: string[] = []) {
  const folders = getGeneratorGroups(language).map(group => ({ key: group.key, label: group.label, color: group.color, files: group.generators }));
  return renderToStaticMarkup(<LocaleProvider initialLanguage={language}>{kind === 'reference'
    ? <ReferenceExplorer query={query} setQuery={() => {}} favorites={favorites} onFavorite={() => {}} />
    : <GeneratorExplorer folders={folders} favorites={favorites} query={query} setQuery={() => {}} searchRef={createRef<HTMLInputElement>()} onFavorite={() => {}} onGenerate={() => {}} encounter={<div />} />
  }</LocaleProvider>);
}

export function renderFavoriteReferences(language: Language, favorites: string[]) {
  return renderToStaticMarkup(<LocaleProvider initialLanguage={language}><FavoriteReferences favorites={favorites} onFavorite={() => {}} onBrowse={() => {}}/></LocaleProvider>);
}

export function renderReferenceDocument(language: Language, key: string) {
  const table = gmTableCategories.flatMap(folder => folder.tables).find(table => table.key === key);
  if (!table) throw new Error(`Unknown table: ${key}`);
  return renderToStaticMarkup(<LocaleProvider initialLanguage={language}><ReferenceDocument table={table} onClose={() => {}}/></LocaleProvider>);
}

export const catalogSizes = {
  generators: getGeneratorGroups().reduce((sum, group) => sum + group.generators.length, 1),
  reference: gmTableCategories.reduce((sum, group) => sum + group.tables.length, 0),
};
