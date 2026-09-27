'use client';

import { useId, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { matchesQuery } from '../lib/explorer';
import { useLocale } from './locale';

type Props = {
  sessions: { id: string; data: { name: string } }[]; activeId: string; name: string; disabled: boolean;
  onSelect: (id: string) => boolean; onRename: (name: string) => boolean;
};
export default function SessionPicker({ sessions, activeId, name, disabled, onSelect, onRename }: Props) {
  const { t } = useLocale();
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const edit = useRef<string | null>(null);
  const [draft, setDraft] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(-1);
  const query = draft === null || draft === name ? '' : draft;
  const options = sessions.filter(record => matchesQuery(record.data.name || t('Sesión sin nombre'), query));
  function reset() { edit.current = null; setDraft(null); setCursor(-1); setOpen(false); }
  function commit() {
    const value = edit.current?.trim();
    if (!value || value === name) { reset(); return; }
    // Keep a failed rename in the field so it can be retried; the shared error
    // banner explains storage failures, without losing the previous session.
    if (!disabled && onRename(value)) reset();
    else setOpen(false);
  }
  function choose(index: number) {
    const record = options[index];
    if (!record || disabled) return;
    const pending = edit.current;
    edit.current = null;
    if (onSelect(record.id)) reset();
    else edit.current = pending;
  }
  function highlight(index: number) {
    setCursor(index);
    requestAnimationFrame(() => document.getElementById(`${id}-option-${index}`)?.scrollIntoView({ block: 'nearest' }));
  }
  return <div className={`session-combo${open ? ' is-open' : ''}`} onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) commit();
  }}>
    <div className="session-combo-field">
      <input id="session-select" ref={input} role="combobox" aria-label={t('Nombre de la sesión')} aria-autocomplete="list" aria-haspopup="listbox" aria-expanded={open} aria-controls={`${id}-options`} aria-describedby={`${id}-help`} aria-activedescendant={open && cursor >= 0 ? `${id}-option-${cursor}` : undefined}
        value={draft ?? name} disabled={disabled} autoComplete="off" spellCheck={false} maxLength={90}
        onFocus={event => { setOpen(true); setCursor(-1); event.currentTarget.select(); }} onClick={() => setOpen(true)}
        onChange={event => { edit.current = event.target.value; setDraft(event.target.value); setCursor(-1); setOpen(true); }}
        onKeyDown={event => {
          if (event.nativeEvent.isComposing) return;
          if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); reset(); }
          if (event.key === 'Enter') { event.preventDefault(); if (open && cursor >= 0) choose(cursor); else commit(); }
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault(); setOpen(true);
            if (options.length) highlight(cursor < 0 ? (event.key === 'ArrowDown' ? 0 : options.length - 1) : (cursor + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length);
          }
          if (open && cursor >= 0 && (event.key === 'Home' || event.key === 'End')) { event.preventDefault(); highlight(event.key === 'Home' ? 0 : options.length - 1); }
        }}/>
      <button type="button" tabIndex={-1} disabled={disabled} aria-label={t('Cambiar de sesión')} aria-expanded={open} aria-controls={`${id}-options`} onPointerDown={event => event.preventDefault()} onClick={() => { input.current?.focus({ preventScroll: true }); setOpen(!open); setCursor(-1); }}><ChevronDown size={17} aria-hidden="true"/></button>
    </div>
    <span id={`${id}-help`} className="sr-only">{t('Escribe para renombrar; Enter o salir del campo guarda el nombre. Elige una sesión de la lista para abrirla. Escape cancela.')}</span>
    <div className="session-suggestions" hidden={!open}>
      <div id={`${id}-options`} role="listbox" aria-label={t('Cambiar de sesión')} className="session-options">
        {options.map((record, index) => <div id={`${id}-option-${index}`} key={record.id} role="option" aria-selected={record.id === activeId} className={`cyber-select-option${index === cursor ? ' is-cursor' : ''}`}
          onPointerMove={() => setCursor(index)} onPointerDown={event => event.preventDefault()} onClick={() => choose(index)}>{record.data.name || t('Sesión sin nombre')}</div>)}
      </div>
      {!options.length && <p>{t('No hay sesiones con ese nombre.')}</p>}
      <p className="session-edit-hint">{t('Enter: guardar nombre · Esc: cancelar')}</p>
    </div>
  </div>;
}
