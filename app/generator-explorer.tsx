'use client';

import { useState, type ReactNode, type RefObject } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { filterFolders, stackCategoryColor, type CatalogFolder } from '../lib/explorer';
import { CategoryBus, FileStack, StackFile } from './data-stack';
import { Empty } from './ui';
import { useLocale } from './locale';
import FavoriteMark from './favorite-mark';

type Props = {
  folders: CatalogFolder[]; favorites: string[]; query: string; setQuery: (value: string) => void;
  searchRef: RefObject<HTMLInputElement | null>; onFavorite: (key: string) => void; onGenerate: (key: string) => void;
  encounter: ReactNode;
};
export default function GeneratorExplorer({ folders, favorites, query, setQuery, searchRef, onFavorite, onGenerate, encounter }: Props) {
  const { t } = useLocale();
  const [active, setActive] = useState('all');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [encounterOpen, setEncounterOpen] = useState(false);
  const catalog = folders.map(folder => ({ ...folder, color: stackCategoryColor(folder.key, folder.color), files: folder.key === 'spmEncounters' ? [...folder.files, { key: 'contextEncounter', label: t('Encuentro en Night City'), description: t('El lugar y la hora cambian lo que te espera en la calle.'), icon: 'target', color: '#ff5e00' }] : folder.files }));
  const filtered = filterFolders(catalog, query, favorites, favoritesOnly);
  const visible = filtered.filter(folder => active === 'all' || active === folder.key);
  const count = visible.reduce((sum, folder) => sum + folder.files.length, 0);
  const total = catalog.reduce((sum, folder) => sum + folder.files.length, 0);
  const filteredMode = !!query.trim() || favoritesOnly || active !== 'all';
  function reset() { setActive('all'); setFavoritesOnly(false); setQuery(''); }

  return <section className="generator-catalog file-explorer stack-explorer">
    <div className="explorer-toolbar">
      <CategoryBus label={t('Carpetas de generadores')} active={active} onSelect={setActive} folders={catalog.map(folder => ({ key: folder.key, label: folder.label, color: folder.color, count: filtered.find(item => item.key === folder.key)?.files.length ?? 0 }))} />
      <div className="search-field"><Search size={19} /><input ref={searchRef} aria-label={t('Buscar generadores')} placeholder={t('Buscar nombres, lugares, encuentros…')} value={query} onChange={event => setQuery(event.target.value)} />{query && <button className="icon-button" aria-label={t('Limpiar búsqueda')} onClick={() => setQuery('')}><X size={17} /></button>}</div>
      <button className={`outline-button cyber-action favorite-filter ${favoritesOnly ? 'selected' : ''}`} aria-pressed={favoritesOnly} onClick={() => setFavoritesOnly(!favoritesOnly)}><FavoriteMark active={favoritesOnly}/>{t('Favoritos')}</button>
    </div>
    <div className="stack-explorer-body">
      <div className="file-pane">
        <div className="filter-status"><span role="status">{t('{count} de {total} archivos', { count, total })}</span>{filteredMode && <button className="text-button" onClick={reset}><X size={15} />{t('Limpiar filtros')}</button>}</div>
        {!count && <Empty>{t('No hay generadores con esos filtros.')}<button className="text-button" onClick={reset}>{t('Limpiar filtros')}</button></Empty>}
        <div className="data-stacks">{visible.map(folder => <FileStack key={folder.key} label={folder.label} color={folder.color} index={catalog.findIndex(item => item.key === folder.key)} count={folder.files.length} kind="run"
          detail={encounterOpen && folder.files.some(file => file.key === 'contextEncounter') ? <div className="encounter-file"><div className="file-window-label"><SlidersHorizontal size={17} />{t('Configurar encuentro')}<button className="icon-button" aria-label={t('Cerrar configuración')} onClick={() => setEncounterOpen(false)}><X size={17} /></button></div>{encounter}</div> : undefined}>
          {folder.files.map((file, index) => <StackFile key={file.key} label={file.label} description={file.description} index={index} kind={file.key === 'contextEncounter' ? 'cfg' : 'run'} selected={file.key === 'contextEncounter' && encounterOpen} favorite={favorites.includes(file.key)} onFavorite={file.key === 'contextEncounter' ? undefined : () => onFavorite(file.key)} onActivate={() => { if (file.key === 'contextEncounter') setEncounterOpen(!encounterOpen); else onGenerate(file.key); }} />)}
        </FileStack>)}</div>
      </div>
    </div>
  </section>;
}
