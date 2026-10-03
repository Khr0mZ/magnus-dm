'use client';

import { Children, isValidElement, useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { ChevronDown, Folder, FolderOpen } from 'lucide-react';
import { deckHoverIndex } from '../lib/explorer';
import { bindDragScroll } from '../lib/drag-scroll';
import { useLocale } from './locale';
import FavoriteMark from './favorite-mark';

export const categoryStyle = (color?: string) => ({ '--category-color': color ?? '#00FFFF' } as CSSProperties);

type Directory = { key: string; label: string; color?: string; count: number };
export function CategoryBus({ folders, active, onSelect, label }: { folders: Directory[]; active: string; onSelect: (key: string) => void; label: string }) {
  const { t } = useLocale();
  const id = useId();
  const drawer = useRef<HTMLDetailsElement>(null);
  const trigger = useRef<HTMLElement>(null);
  useEffect(() => {
    function dismiss(event: PointerEvent) {
      if (drawer.current?.open && !drawer.current.contains(event.target as Node)) drawer.current.open = false;
    }
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, []);
  const entries: Directory[] = [{ key: 'all', label: t('Todas las carpetas'), color: '#00FFFF', count: folders.reduce((sum, folder) => sum + folder.count, 0) }, ...folders];
  const selected = entries.find(folder => folder.key === active) ?? entries[0];
  function close() { if (drawer.current) drawer.current.open = false; trigger.current?.focus({ preventScroll: true }); }
  return <details className="category-routing" ref={drawer} style={categoryStyle(selected.color)} onKeyDown={event => { if (event.key === 'Escape' && drawer.current?.open) { event.preventDefault(); close(); } }}>
    <summary className="router-trigger" ref={trigger} aria-controls={id}>
      <span className="router-current"><span className="sr-only">{label}: </span><strong>{selected.label}</strong></span>
      <span className="router-command"><span className="sr-only">{t('Cambiar carpeta')}</span><ChevronDown size={17}/></span>
      <span className="router-readout">{selected.count}<span className="sr-only"> {t('archivos')}</span></span>
    </summary>
    <nav className="directory-matrix" id={id} aria-label={label} onKeyDown={event => {
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
      const ports = Array.from(event.currentTarget.querySelectorAll('button'));
      const index = ports.indexOf(event.target as HTMLButtonElement);
      if (index < 0) return;
      event.preventDefault();
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? ports.length - 1 : (index + (['ArrowRight', 'ArrowDown'].includes(event.key) ? 1 : -1) + ports.length) % ports.length;
      ports[next]?.focus();
    }}>{entries.map((folder, index) => <button className="directory-port" key={folder.key} style={categoryStyle(folder.color)} aria-pressed={active === folder.key} onClick={() => { onSelect(folder.key); close(); }}>
      <span className="port-address" aria-hidden="true">{String(index).padStart(2, '0')}</span>
      <span className="port-folder" aria-hidden="true">{active === folder.key ? <FolderOpen size={20}/> : <Folder size={20}/>}</span>
      <strong>{folder.label}</strong><span className="port-count">{folder.count}<span className="sr-only"> {t('archivos')}</span></span>
    </button>)}</nav>
  </details>;
}

type StackProps = { label: string; color?: string; index: number; count: number; kind: 'run' | 'ref' | 'app'; children: ReactNode; detail?: ReactNode; detailId?: string };
export function FileStack({ label, color, index, count, kind, children, detail, detailId }: StackProps) {
  const { t } = useLocale();
  const id = useId();
  const rail = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const files = Children.toArray(children);
  const signature = JSON.stringify(files.map(file => isValidElement(file) ? file.key : null));
  const [hover, setHover] = useState<{ deck: string; index: number } | null>(null);
  const hovered = hover?.deck === signature ? hover.index : null;
  useEffect(() => {
    const node = rail.current;
    if (!node) return;
    node.scrollLeft = 0;
    return bindDragScroll(node, () => setHover(null));
  }, [signature]);
  function scroll(direction: number) {
    const node = rail.current;
    if (!node) return;
    setHover(null);
    const slots = content.current?.children;
    const first = slots?.[0] as HTMLElement | undefined;
    const second = slots?.[1] as HTMLElement | undefined;
    const step = first && second ? second.offsetLeft - first.offsetLeft : node.clientWidth * .8;
    node.scrollBy({ left: direction * step, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  }
  return <section className={`data-stack ${detail ? 'has-open-file' : ''}`} style={categoryStyle(color)}>
    <div className="stack-heading">
      <span className="stack-address" aria-hidden="true">{kind.toUpperCase()}<b>{String(index + 1).padStart(2, '0')}</b><i /></span>
      <h3 id={`${id}-heading`}><FolderOpen size={20} aria-hidden="true"/><span>{label}<small>{t(count === 1 ? '1 archivo' : '{count} archivos', { count })}</small></span></h3>
    </div>
    <div id={`${id}-content`} className="stack-content">
      <div className="stack-rail" id={`${id}-deck`} ref={rail} role="region" aria-labelledby={`${id}-heading`} aria-describedby={`${id}-help`} tabIndex={0}
        onScroll={() => setHover(null)} onPointerDown={event => { if (event.pointerType === 'touch') setHover(null); }}
        onKeyDown={event => {
          if (event.altKey || event.ctrlKey || event.metaKey) return;
          setHover(null);
          if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
            event.preventDefault(); scroll(event.key === 'ArrowRight' ? 1 : -1); rail.current?.focus({ preventScroll: true });
          }
          if (event.key === 'Home' || event.key === 'End') {
            event.preventDefault(); event.currentTarget.scrollLeft = event.key === 'Home' ? 0 : event.currentTarget.scrollWidth;
            rail.current?.focus({ preventScroll: true });
          }
        }}><div className="stack-files" ref={content}
          onPointerMove={event => {
            if (event.pointerType === 'touch' || rail.current?.dataset.dragging) return;
            const slots = Array.from(event.currentTarget.children, slot => slot.getBoundingClientRect());
            const index = deckHoverIndex(slots, event.clientX, event.clientY, hovered);
            if (index !== hovered) setHover(index === null ? null : { deck: signature, index });
          }} onPointerLeave={() => setHover(null)} onPointerCancel={() => setHover(null)}
        >{files.map((file, index) => <div className={`stack-slot${hovered === index ? ' is-hovered' : ''}`} key={isValidElement(file) ? file.key : index}>{file}</div>)}</div></div>
      <span id={`${id}-help`} className="sr-only">{t('Arrastra o desliza para recorrer los archivos. También puedes usar las flechas del teclado.')}</span>
      <div id={detailId} hidden={!detail}>{detail}</div>
    </div>
  </section>;
}

type FileProps = {
  label: string; description?: string; index: number; kind: 'run' | 'ref' | 'cfg' | 'app'; selected?: boolean;
  favorite?: boolean; onFavorite?: () => void;
  controls?: string; onActivate: (button: HTMLButtonElement) => void;
};
export function StackFile({ label, description, index, kind, selected = false, favorite, onFavorite, controls, onActivate }: FileProps) {
  const { t } = useLocale();
  const action = t(kind === 'ref' ? 'Abrir tabla' : kind === 'cfg' ? 'Configurar' : kind === 'app' ? 'Abrir herramienta' : 'Generar');
  return <article className={`stack-file ${selected ? 'is-open' : ''}`}>
    <button className="stack-file-open" aria-label={`${action}: ${label}`} title={description || label} aria-expanded={controls ? selected : undefined} aria-controls={controls} onClick={event => onActivate(event.currentTarget)}>
      <span className="file-stamp" aria-hidden="true"><span>{kind.toUpperCase()}</span><span>{String(index + 1).padStart(2, '0')}</span></span>
      <strong>{label}</strong>
    </button>
    <span className="file-outline" aria-hidden="true"/>
    {onFavorite && <button className="shard-favorite" aria-label={t(favorite ? 'Quitar de favoritos: {name}' : 'Añadir a favoritos: {name}', { name: label })} aria-pressed={favorite} onClick={onFavorite}><FavoriteMark active={favorite}/></button>}
  </article>;
}
