'use client';

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { Pin, PinOff, PanelBottomClose, PanelBottomOpen, Scaling } from 'lucide-react';
import { gmTableCategories, type GMTableDef } from '../lib/reference';
import { referenceLabel } from '../lib/i18n';
import { changeReferenceNoteRect, fitReferenceNote, getReferenceNoteViewport, referenceNoteBounds, referenceNoteId, type NoteRect, type NoteViewport, type ReferenceNote, type ReferenceNotes } from '../lib/reference-notes';
import { categoryStyle } from './data-stack';
import { useLocale } from './locale';
import { FileHeading } from './ui';
import { ReferenceContents } from './reference-explorer';

type NoteChange = Partial<Omit<ReferenceNote, 'order'>>;
type Gesture = { id: number; kind: 'move' | 'resize'; x: number; y: number; original: ReferenceNote; bounds: NoteRect; current: NoteRect };
type NoteProps = {
  table: GMTableDef; note: ReferenceNote; bounds: NoteRect; order: number;
  onChange: (change: NoteChange) => boolean; onRaise: () => void; onClose: () => void;
};

export function FloatingReference({ table, note, bounds, order, onChange, onRaise, onClose }: NoteProps) {
  const { t, language } = useLocale();
  const root = useRef<HTMLElement>(null);
  const gesture = useRef<Gesture | null>(null);
  const [draft, setDraft] = useState<NoteRect | null>(null);
  const id = referenceNoteId(table.key);
  const title = referenceLabel(table.titleKey, language);
  const rect = fitReferenceNote({ ...note, ...draft }, bounds);
  if (!note.pinned) rect.y = draft?.y ?? note.y;
  const resizeLabel = t('Cambiar tamaño de referencia');
  const collapseLabel = t(note.collapsed ? 'Desplegar referencia' : 'Plegar referencia');
  const pinLabel = t(note.pinned ? 'Desfijar referencia' : 'Fijar referencia en pantalla');
  const keyboardHint = t('Arrastra o usa las flechas. Mayús mueve más rápido.');

  function displayedNote(viewport: NoteViewport): ReferenceNote {
    const displayed = root.current?.getBoundingClientRect();
    return displayed ? { ...note, x: displayed.x, y: displayed.y + (note.pinned ? 0 : viewport.scrollY) } : note;
  }

  function togglePin() {
    const viewport = getReferenceNoteViewport(false);
    const displayed = root.current?.getBoundingClientRect();
    if (!displayed) return;
    const pinned = !note.pinned;
    const position = fitReferenceNote({ ...note, pinned, x: displayed.x, y: displayed.y + (pinned ? 0 : viewport.scrollY) }, referenceNoteBounds(viewport, pinned));
    onChange({ pinned, x: position.x, y: position.y });
  }

  function begin(event: PointerEvent<HTMLElement>, kind: Gesture['kind']) {
    if (event.button !== 0 || (kind === 'resize' && note.collapsed)) return;
    event.preventDefault();
    (event.target as HTMLElement).closest<HTMLElement>('button')?.focus({ preventScroll: true });
    if (!(event.target as HTMLElement).closest('button')) root.current?.focus({ preventScroll: true });
    const viewport = getReferenceNoteViewport();
    const original = displayedNote(viewport);
    gesture.current = { id: event.pointerId, kind, x: event.clientX, y: event.clientY, original, bounds: referenceNoteBounds(viewport, note.pinned), current: { x: original.x, y: original.y, width: original.width, height: original.height } };
    root.current?.setPointerCapture(event.pointerId);
  }

  function move(event: PointerEvent<HTMLElement>) {
    const active = gesture.current;
    if (!active || active.id !== event.pointerId) return;
    const next = changeReferenceNoteRect(active.original, active.bounds, active.kind, event.clientX - active.x, event.clientY - active.y);
    active.current = next;
    setDraft(next);
  }

  function finish(event: PointerEvent<HTMLElement>, save: boolean) {
    const active = gesture.current;
    if (!active || active.id !== event.pointerId) return;
    gesture.current = null;
    if (root.current?.hasPointerCapture(event.pointerId)) root.current.releasePointerCapture(event.pointerId);
    if (save) onChange(active.current);
    setDraft(null);
  }

  function keyboard(event: KeyboardEvent<HTMLElement>, kind: Gesture['kind']) {
    const direction = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[event.key];
    if (!direction) return;
    event.preventDefault();
    const step = event.shiftKey ? 40 : 10;
    const viewport = getReferenceNoteViewport();
    onChange(changeReferenceNoteRect(displayedNote(viewport), referenceNoteBounds(viewport, note.pinned), kind, direction[0] * step, direction[1] * step));
  }

  useEffect(() => {
    const cancel = () => { gesture.current = null; setDraft(null); };
    window.addEventListener('blur', cancel);
    return () => window.removeEventListener('blur', cancel);
  }, []);

  return <section ref={root} id={id} className={`reference-note reference-document${note.collapsed ? ' is-collapsed' : ''}${note.pinned ? ' is-pinned' : ''}${draft ? ' is-moving' : ''}`}
    tabIndex={0} aria-labelledby={`${id}-heading`} aria-describedby={`${id}-keys`} aria-roledescription={t('Nota flotante')}
    style={{ ...categoryStyle('#B8FF3E'), left: rect.x, top: rect.y, width: rect.width, height: rect.height, zIndex: order + 1 }}
    onFocusCapture={onRaise} onPointerDown={event => {
      onRaise();
      if ((event.target as HTMLElement).closest('.document-heading') && !(event.target as HTMLElement).closest('button')) begin(event, 'move');
    }} onPointerMove={move} onPointerUp={event => finish(event, true)} onPointerCancel={event => finish(event, false)} onLostPointerCapture={event => finish(event, false)}
    onKeyDown={event => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); onClose(); }
      else if (event.target === event.currentTarget) keyboard(event, 'move');
    }}>
    <FileHeading id={`${id}-heading`} title={<span title={`${title}. ${keyboardHint}`}>{title}</span>} onClose={onClose} closeLabel={t('Cerrar referencia')}
      actions={<>
        <button type="button" className="icon-button" aria-label={collapseLabel} title={collapseLabel} aria-expanded={!note.collapsed} aria-controls={`${id}-body`} onClick={() => onChange({ collapsed: !note.collapsed })}>{note.collapsed ? <PanelBottomOpen size={19}/> : <PanelBottomClose size={19}/>}</button>
        <button type="button" className="icon-button" aria-label={pinLabel} title={pinLabel} aria-pressed={note.pinned} onClick={togglePin}>{note.pinned ? <PinOff size={19}/> : <Pin size={19}/>}</button>
      </>}/>
    <span id={`${id}-keys`} className="sr-only">{keyboardHint}</span>
    <div id={`${id}-body`} className="reference-note-body" hidden={note.collapsed}><ReferenceContents table={table}/></div>
    {!note.collapsed && <button type="button" className="icon-button reference-note-resize" aria-label={resizeLabel} title={`${resizeLabel}. ${keyboardHint}`} aria-describedby={`${id}-keys`} onPointerDown={event => begin(event, 'resize')} onKeyDown={event => keyboard(event, 'resize')}><Scaling size={20}/></button>}
  </section>;
}

export default function ReferenceNotesLayer({ favorites, notes, onChange, onRaise }: {
  favorites: string[]; notes: ReferenceNotes; onChange: (key: string, change: NoteChange) => boolean; onRaise: (key: string) => void;
}) {
  const [bounds, setBounds] = useState<NoteRect | null>(null);
  useEffect(() => {
    function measure() {
      setBounds(getReferenceNoteViewport(false).bounds);
    }
    measure();
    window.addEventListener('resize', measure);
    window.visualViewport?.addEventListener('resize', measure);
    return () => { window.removeEventListener('resize', measure); window.visualViewport?.removeEventListener('resize', measure); };
  }, []);

  function close(key: string) {
    if (!onChange(key, { open: false })) return;
    requestAnimationFrame(() => {
      const opener = Array.from(document.querySelectorAll<HTMLButtonElement>('.quick-references .stack-file-open')).find(button => button.getAttribute('aria-controls') === referenceNoteId(key));
      const front = [...favorites].filter(id => id !== key && notes[id]?.open).sort((a, b) => notes[b].order - notes[a].order)[0];
      const fallback = front ? document.getElementById(referenceNoteId(front)) : document.querySelector<HTMLElement>('.main-tabs [aria-current="page"]');
      (opener ?? fallback)?.focus({ preventScroll: true });
    });
  }

  const catalog = gmTableCategories.flatMap(folder => folder.tables);
  const tables = favorites.map(key => catalog.find(table => table.key === key)).filter((table): table is GMTableDef => !!table);
  const ordered = tables.filter(table => notes[table.key]?.open).sort((a, b) => notes[a.key].order - notes[b.key].order);
  return <div className="reference-notes-layer">
    {tables.filter(table => !notes[table.key]?.open).map(table => <div key={table.key} id={referenceNoteId(table.key)} hidden/>)}
    {bounds && tables.filter(table => notes[table.key]?.open).map(table => <FloatingReference key={table.key} table={table} note={notes[table.key]} bounds={bounds} order={ordered.findIndex(item => item.key === table.key)}
      onChange={change => onChange(table.key, change)} onRaise={() => { if (ordered.at(-1)?.key !== table.key) onRaise(table.key); }} onClose={() => close(table.key)}/>)}
  </div>;
}
