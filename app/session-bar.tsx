'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, Plus, Trash2, X } from 'lucide-react';
import { uid } from '../lib/engine';
import { useLocale } from './locale';
import SessionPicker from './session-picker';
import type { useSession } from './use-session';

type Props = Pick<ReturnType<typeof useSession>, 'sessions' | 'session' | 'activeId' | 'ready' | 'dirty' | 'createSession' | 'selectSession' | 'renameSession' | 'deleteSession'>;
export default function SessionBar({ sessions, session, activeId, ready, dirty, createSession, selectSession, renameSession, deleteSession }: Props) {
  const { t } = useLocale();
  const [mode, setMode] = useState<'create' | 'delete' | null>(null);
  const [name, setName] = useState('');
  const nameInput = useRef<HTMLInputElement>(null);
  const cancelButton = useRef<HTMLButtonElement>(null);
  const opener = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    if (mode === 'delete') cancelButton.current?.focus();
    else if (mode) { nameInput.current?.focus(); nameInput.current?.select(); }
  }, [mode]);
  function close() { setMode(null); opener.current?.focus(); }
  const disabled = !ready || dirty;
  return <section className="session-bar" aria-label={t('Sesiones guardadas')} onKeyDown={event => { if (mode && event.key === 'Escape') { event.preventDefault(); close(); } }}>
    <div className="session-picker"><label htmlFor="session-select">{t('SESIÓN')}</label><SessionPicker sessions={sessions} activeId={activeId} name={session.name} disabled={disabled} onSelect={selectSession} onRename={renameSession}/><span className="session-count">{String(sessions.length).padStart(2, '0')}</span></div>
    <div className="session-actions">
      <button className="session-action cyber-action" disabled={disabled} aria-label={t('Nueva sesión')} title={t('Nueva sesión')} aria-expanded={mode === 'create'} onClick={event => { opener.current = event.currentTarget; setName(t('Sesión {count}', { count: sessions.length + 1 })); setMode('create'); }}><Plus size={17} aria-hidden="true"/><span className="session-action-label">{t('Nueva sesión')}</span></button>
      <button className="icon-button session-delete" disabled={disabled || sessions.length < 2} aria-label={t('Eliminar sesión')} title={sessions.length < 2 ? t('Conserva al menos una sesión') : t('Eliminar sesión')} aria-expanded={mode === 'delete'} onClick={event => { opener.current = event.currentTarget; setMode('delete'); }}><Trash2 size={17}/></button>
    </div>
    {mode === 'create' && <form className="session-editor" onSubmit={event => { event.preventDefault(); if (createSession(uid(), name)) close(); }}>
      <label htmlFor="session-name">{t('Nombre de la nueva sesión')}<input id="session-name" ref={nameInput} value={name} maxLength={90} required onChange={event => setName(event.target.value)} /></label>
      <button className="primary-button" disabled={disabled || !name.trim()}><Check size={16}/>{t('Crear sesión')}</button>
      <button className="text-button" type="button" onClick={close}><X size={16}/>{t('Cancelar')}</button>
    </form>}
    {mode === 'delete' && <div className="session-editor session-delete-confirm" role="group" aria-label={t('Confirmar eliminación')}>
      <p>{t('Se eliminará «{name}» con sus notas, historial y herramientas. Esta acción no se puede deshacer.', { name: session.name })}</p>
      <button className="danger-button" disabled={disabled} onClick={() => { if (deleteSession()) close(); }}><Trash2 size={16}/>{t('Eliminar sesión')}</button>
      <button className="text-button" type="button" ref={cancelButton} onClick={close}>{t('Cancelar')}</button>
    </div>}
  </section>;
}
