'use client';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { activeSession, createSessionStore, SESSION_LIBRARY_KEY } from '../lib/session-library';
export function useSession() {
  const [store] = useState(() => createSessionStore(() => localStorage));
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
  useEffect(() => {
    store.hydrate();
    const sync = (event: StorageEvent) => {
      if (event.key === SESSION_LIBRARY_KEY || event.key === null) store.sync();
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, [store]);
  return {
    session: activeSession(snapshot.library), activeId: snapshot.library.activeId,
    sessions: snapshot.library.sessions, setSession: store.setSession,
    favorites: snapshot.library.favorites, toggleFavorite: store.toggleFavorite,
    createSession: store.createSession, selectSession: store.selectSession,
    renameSession: store.renameSession, deleteSession: store.deleteSession,
    retrySave: store.retrySave, ready: snapshot.ready && !snapshot.blocked,
    error: snapshot.error, dirty: snapshot.dirty,
  };
}
