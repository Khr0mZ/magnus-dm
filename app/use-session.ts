'use client';
import { useEffect, useState } from 'react';
import { emptySession, parseSession, type Session } from '../lib/session';
const KEY = 'magnus-dm.session.v1';
export function useSession() {
  const [session, setSession] = useState<Session>(emptySession);
  const [ready, setReady] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      // Hydrate only after SSR; never replace saved data with the initial render.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw) setSession(parseSession(raw));
    } catch (e) {
      setBlocked(true);
      setError(e instanceof Error ? e.message : 'El navegador no permite guardar la sesión.');
    }
    setReady(true);
    const sync = (event: StorageEvent) => {
      if (event.key !== KEY || !event.newValue) return;
      try { setSession(parseSession(event.newValue)); } catch { setError('No se pudo sincronizar otra pestaña.'); }
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);
  useEffect(() => {
    if (!ready || blocked) return;
    try { localStorage.setItem(KEY, JSON.stringify(session)); }
    catch {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setError('El navegador no ha podido guardar los cambios. Comprueba el espacio disponible.');
    }
  }, [session, ready, blocked]);
  return { session, setSession, ready, error };
}
