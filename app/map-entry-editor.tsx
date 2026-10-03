'use client';

import { useEffect, useRef, useState } from 'react';
import { Link2, MapPin, X } from 'lucide-react';
import { type Entry } from '../lib/session';
import { useLocale } from './locale';

export default function MapEntryEditor({ entry, enabled, onSave, onRemove, onClose }: {
  entry: Entry; enabled: boolean;
  onSave: (result: Pick<Entry, 'title' | 'text'>) => void;
  onRemove: () => void; onClose: () => void;
}) {
  const { t } = useLocale();
  const dialog = useRef<HTMLDialogElement>(null);
  const [title, setTitle] = useState(entry.title);
  const [text, setText] = useState(entry.text);
  useEffect(() => {
    const element = dialog.current!;
    element.showModal();
    return () => element.close();
  }, []);

  return <dialog ref={dialog} className="map-entry-editor" aria-labelledby="map-entry-heading" onCancel={onClose} onClose={onClose}>
    <form onSubmit={event => { event.preventDefault(); if (enabled && title.trim()) onSave({ title: title.trim(), text }); }}>
      <header className="map-editor-header">
        <div><span className="map-editor-channel"><MapPin size={18} aria-hidden="true" />NIGHT CITY / circa 2080</span><h2 id="map-entry-heading">{t('Editar marcador')}</h2></div>
        <button type="button" className="map-editor-close" aria-label={t('Cerrar editor')} onClick={onClose}><X size={24} aria-hidden="true" /></button>
      </header>
      <div className="map-editor-link"><Link2 size={18} aria-hidden="true" /><span>{t('Entrada vinculada al registro')}</span><span>{t(entry.kind)}</span></div>
      <div className="map-editor-body">
        <p>{t('Los cambios también se guardan en la entrada del registro.')}</p>
        {entry.map && <div className="map-editor-coordinates" aria-label={t('Coordenadas del marcador')}><span>LAT <strong>{entry.map.latitude.toFixed(5)}</strong></span><span>LON <strong>{entry.map.longitude.toFixed(5)}</strong></span></div>}
        <fieldset disabled={!enabled}>
          <label>{t('Título')}<input required value={title} onChange={event => setTitle(event.target.value)} /></label>
          <label>{t('Contenido')}<textarea value={text} onChange={event => setText(event.target.value)} /></label>
          <div className="map-editor-actions">
            <button type="submit" className="primary-button cyber-action map-editor-save">{t('Guardar cambios')}</button>
            <button type="button" className="outline-button cyber-action" onClick={onClose}>{t('Cancelar')}</button>
            <button type="button" className="danger-button cyber-action map-editor-unlink" onClick={onRemove}>{t('Quitar marcador')}</button>
          </div>
        </fieldset>
      </div>
    </form>
  </dialog>;
}
