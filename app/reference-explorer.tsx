'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { formatReference, gmTableCategories, type GMTableDef } from '../lib/reference';
import { copyText } from '../lib/clipboard';
import { referenceLabel } from '../lib/i18n';
import { getReferenceNoteViewport, referenceNoteId, type NoteViewport, type ReferenceNotes } from '../lib/reference-notes';
import { filterFolders, stackCategoryColor } from '../lib/explorer';
import { CategoryBus, FileStack, StackFile } from './data-stack';
import { Empty, FileHeading, PanelHeading, ToolLink } from './ui';
import { useLocale } from './locale';
import FavoriteMark from './favorite-mark';

export function ReferenceDocument({ table, onClose, favorite, onFavorite }: { table: GMTableDef; onClose: () => void; favorite?: boolean; onFavorite?: () => void }) {
  const { t, language } = useLocale();
  const heading = useRef<HTMLHeadingElement>(null);
  const id = useId();
  const label = referenceLabel(table.titleKey, language);
  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, [table.key]);
  const closeLabel = t('Cerrar tabla');
  return <section className="reference-document" aria-labelledby={id} onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); onClose(); } }}>
    <FileHeading id={id} headingRef={heading} title={label} onClose={onClose} closeLabel={closeLabel}
      actions={onFavorite && <button className="icon-button" aria-label={t(favorite ? 'Quitar de favoritos: {name}' : 'Añadir a favoritos: {name}', { name: label })} aria-pressed={favorite} onClick={onFavorite}><FavoriteMark active={favorite}/></button>}/>
    <ReferenceContents table={table} onClose={onClose}/>
  </section>;
}

// The explorer and floating favorites share the same translated table and copy.
export function ReferenceContents({ table, onClose }: { table: GMTableDef; onClose?: () => void }) {
  const { t, language } = useLocale();
  const label = referenceLabel(table.titleKey, language);
  const [copyStatus, setCopyStatus] = useState('');
  async function copyTable() {
    try { await copyText(formatReference(table, language)); setCopyStatus('Tabla copiada.'); }
    catch { setCopyStatus('No se ha podido copiar. Comprueba los permisos del portapapeles.'); }
  }
  return <>
    {table.descriptionKey && <p>{referenceLabel(table.descriptionKey, language)}</p>}
    <div className="table-scroll" tabIndex={0} role="region" aria-label={label}><table><thead><tr>{table.columns.map((column, index) => <th key={index} style={{ textAlign: column.align, width: column.width }}>{referenceLabel(column.headerKey, language)}</th>)}</tr></thead><tbody>{table.rows.map((row, index) => <tr key={index} className={row.highlight ? 'highlight' : ''}>{row.cells.map((cell, cellIndex) => <td key={cellIndex} style={{ textAlign: table.columns[cellIndex]?.align }}>{typeof cell === 'string' && cell.startsWith('t:') ? referenceLabel(cell, language) : cell}</td>)}</tr>)}</tbody></table></div>
    {table.sourceKey && <p className="document-source">{referenceLabel(table.sourceKey, language)}</p>}
    <div className="document-foot"><span>{t('{count} filas', { count: table.rows.length })}</span><span role="status">{copyStatus ? t(copyStatus) : ''}</span><button className="cyber-action" onClick={copyTable}>{t('Copiar tabla')}</button>{onClose && <button className="cyber-action" onClick={onClose}>ESC / {t('Cerrar tabla')}</button>}</div>
  </>;
}

export function FavoriteReferences({ favorites, notes, onToggle, onFavorite, onBrowse }: { favorites: string[]; notes: ReferenceNotes; onToggle: (key: string, viewport?: NoteViewport) => boolean; onFavorite: (key: string) => void; onBrowse: () => void }) {
  const { t, language } = useLocale();
  const catalog = gmTableCategories.flatMap(folder => folder.tables);
  const tables = favorites.map(key => catalog.find(table => table.key === key)).filter((table): table is GMTableDef => !!table);
  return <section className="quick-references">
    <PanelHeading number="REF" title={t('Referencias favoritas')} aside={<ToolLink onClick={onBrowse}>{t('Ver todas')}</ToolLink>}/>
    {tables.length ? <FileStack label={t('Acceso rápido')} color="#B8FF3E" index={0} count={tables.length} kind="ref">
      {tables.map((table, index) => <StackFile key={table.key} label={referenceLabel(table.titleKey, language)} kind="ref" index={index} favorite onFavorite={() => onFavorite(table.key)} selected={notes[table.key]?.open} controls={referenceNoteId(table.key)} onActivate={() => {
        if (onToggle(table.key, getReferenceNoteViewport()) && !notes[table.key]?.open) requestAnimationFrame(() => document.getElementById(referenceNoteId(table.key))?.focus({ preventScroll: true }));
      }}/>) }
    </FileStack> : <Empty>{t('Activa el chip de favoritos de una tabla para consultarla aquí en cualquier sesión.')}</Empty>}
  </section>;
}

export default function ReferenceExplorer({ query, setQuery, favorites, onFavorite }: { query: string; setQuery: (value: string) => void; favorites: string[]; onFavorite: (key: string) => void }) {
  const { t, language } = useLocale();
  const [active, setActive] = useState('all');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const opener = useRef<HTMLButtonElement | null>(null);
  const documentId = useId();
  const catalog = useMemo(() => gmTableCategories.map(folder => ({ key: folder.key, color: stackCategoryColor(folder.key, folder.color), label: referenceLabel(folder.titleKey, language), files: folder.tables.map(table => ({ key: table.key, label: referenceLabel(table.titleKey, language), table, description: [table.descriptionKey ? referenceLabel(table.descriptionKey, language) : '', ...table.columns.map(column => referenceLabel(column.headerKey, language)), ...table.rows.flatMap(row => row.cells.map(cell => typeof cell === 'string' && cell.startsWith('t:') ? referenceLabel(cell, language) : String(cell)))].join(' ') })) })), [language]);
  const filtered = filterFolders(catalog, query, favorites, favoritesOnly);
  const visible = filtered.filter(folder => active === 'all' || folder.key === active);
  const files = visible.flatMap(folder => folder.files);
  const total = catalog.reduce((sum, folder) => sum + folder.files.length, 0);
  function reset() { setActive('all'); setQuery(''); setFavoritesOnly(false); }
  function close() {
    setSelected(null);
    const folder = catalog.find(folder => folder.files.some(file => file.key === selected));
    const target = opener.current?.isConnected ? opener.current : document.getElementById(`${documentId}-${folder?.key}`)?.closest('.stack-content')?.querySelector<HTMLElement>('.stack-rail');
    target?.focus({ preventScroll: true });
  }
  return <section className="reference-section file-explorer stack-explorer">
    <div className="explorer-toolbar">
      <CategoryBus label={t('Carpetas de referencia')} active={active} onSelect={key => { setActive(key); setSelected(null); }} folders={catalog.map(folder => ({ key: folder.key, label: folder.label, color: folder.color, count: filtered.find(item => item.key === folder.key)?.files.length ?? 0 }))} />
      <div className="search-field"><Search size={19} /><input aria-label={t('Buscar tablas de referencia')} placeholder={t('Buscar armas, heridas, dificultad…')} value={query} onChange={event => setQuery(event.target.value)} />{query && <button className="icon-button" aria-label={t('Limpiar búsqueda')} onClick={() => setQuery('')}><X size={17} /></button>}</div>
      <button className="cyber-action favorite-filter" aria-pressed={favoritesOnly} onClick={() => setFavoritesOnly(!favoritesOnly)}><FavoriteMark active={favoritesOnly}/>{t('Favoritos')}</button>
    </div>
    <div className="stack-explorer-body">
      <div className="filter-status"><span role="status">{t('{count} de {total} archivos', { count: files.length, total })}</span>{(query || active !== 'all' || favoritesOnly) && <button className="text-button" onClick={reset}>{t('Limpiar filtros')}</button>}</div>
      {!files.length && <Empty>{t('No se han encontrado tablas. Prueba con otro término.')}<button className="text-button" onClick={reset}>{t('Limpiar filtros')}</button></Empty>}
      <div className="data-stacks">{visible.map(folder => {
        const opened = folder.files.find(file => file.key === selected);
        return <FileStack key={folder.key} label={folder.label} color={folder.color} index={catalog.findIndex(item => item.key === folder.key)} count={folder.files.length} kind="ref" detailId={`${documentId}-${folder.key}`} detail={opened ? <ReferenceDocument key={opened.key} table={opened.table} favorite={favorites.includes(opened.key)} onFavorite={() => onFavorite(opened.key)} onClose={close}/> : undefined}>
          {folder.files.map((file, index) => <StackFile key={file.key} label={file.label} index={index} kind="ref" selected={selected === file.key} favorite={favorites.includes(file.key)} onFavorite={() => onFavorite(file.key)} controls={`${documentId}-${folder.key}`} onActivate={button => { opener.current = button; setSelected(current => current === file.key ? null : file.key); }}/>) }
        </FileStack>;
      })}</div>
    </div>
  </section>;
}
