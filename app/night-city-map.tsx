'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { validMapLocation, type Entry, type MapLocation } from '../lib/session';
import { useLocale } from './locale';
import ImageLoader from './image-loader';

export const ENTRY_DRAG_TYPE = 'application/x-magnus-session-entry';

type Props = {
  reader: boolean; hidden: boolean; enabled: boolean; sessionId: string;
  entries: Entry[]; pendingEntryId: string | null;
  onPlace: (id: string, location: MapLocation) => void;
  onEdit: (id: string) => void; onCancelPlacement: () => void;
};

export default function NightCityMap({ reader, hidden, enabled, sessionId, entries, pendingEntryId, onPlace, onEdit, onCancelPlacement }: Props) {
  const { language, t } = useLocale();
  const frame = useRef<HTMLIFrameElement>(null);
  const [frameReady, setFrameReady] = useState(false);
  // Keep one document alive so theme/language changes preserve zoom and position.
  const [source] = useState(() => `/maps/night-city-2077/preview.html?embed=1&theme=${reader ? 'flesh' : 'chrome'}&lang=${language}`);
  const syncPreferences = useCallback(() => {
    frame.current?.contentWindow?.postMessage({
      type: 'magnus:map-preferences', theme: reader ? 'flesh' : 'chrome', language,
      sessionId, enabled, pendingEntryId,
      entries: entries.map(({ id, title, map }) => ({ id, title, map })),
    }, window.location.origin);
  }, [reader, language, sessionId, enabled, entries, pendingEntryId]);

  useEffect(syncPreferences, [syncPreferences]);
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (!enabled || event.origin !== window.location.origin || event.source !== frame.current?.contentWindow) return;
      const data = event.data;
      if (!data || data.sessionId !== sessionId) return;
      if (data.type === 'magnus:map-cancel-placement') { onCancelPlacement(); return; }
      if (typeof data.entryId !== 'string' || !entries.some(entry => entry.id === data.entryId)) return;
      if (data.type === 'magnus:map-place-entry' && validMapLocation(data.location)) onPlace(data.entryId, data.location);
      if (data.type === 'magnus:map-edit-entry' && entries.some(entry => entry.id === data.entryId && entry.map)) onEdit(data.entryId);
    };
    window.addEventListener('message', receive);
    return () => window.removeEventListener('message', receive);
  }, [enabled, sessionId, entries, onPlace, onEdit, onCancelPlacement]);

  return <section className="night-city-workspace" hidden={hidden} aria-label={t('Mapa de Night City')}>
    <iframe ref={frame} src={source} title={t('Mapa interactivo de Night City')} onLoad={() => { setFrameReady(true); syncPreferences(); }} />
    {!frameReady && <div className="map-frame-loading"><ImageLoader label={t('Cargando mapa…')} /></div>}
  </section>;
}
