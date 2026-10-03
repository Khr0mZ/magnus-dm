'use client';
import { useEffect, useState, useSyncExternalStore, type Dispatch, type SetStateAction } from 'react';
import { activeSession, createSessionStore, SESSION_LIBRARY_KEY } from '../lib/session-library';
import type { Session } from '../lib/session';
import type { Preparation } from '../lib/preparation';

export type SessionToolProps = {
  session: Session;
  setSession: Dispatch<SetStateAction<Session>>;
  log: (title: string, text: string, kind?: string, generator?: string) => void;
  notify: (text: string) => void;
  copy: (text: string) => Promise<void>;
};

// Both preparation editors use the existing session store and the same record lifecycle.
export function usePreparedRecords<K extends keyof Preparation>({ session, setSession }: Pick<SessionToolProps, 'session' | 'setSession'>, key: K) {
  type Record = Preparation[K][number];
  const [selectedId, select] = useState('');
  const records: Record[] = session.preparation[key];
  const selected = records.find(record => record.id === selectedId) ?? records[0];

  function update(change: (records: Record[]) => Record[]) {
    setSession(current => ({ ...current, preparation: { ...current.preparation, [key]: change(current.preparation[key]) } }));
  }
  function add(record: Record) {
    update(records => [...records, record]);
    select(record.id);
  }
  function edit(change: (record: Record) => Record) {
    if (selected) update(records => records.map(record => record.id === selected.id ? change(record) : record));
  }
  function remove() {
    if (selected) update(records => records.filter(record => record.id !== selected.id));
  }
  return { records, selected, select, add, edit, remove };
}

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
    referenceNotes: snapshot.library.referenceNotes, toggleReferenceNote: store.toggleReferenceNote,
    updateReferenceNote: store.updateReferenceNote, raiseReferenceNote: store.raiseReferenceNote,
    createSession: store.createSession, selectSession: store.selectSession,
    renameSession: store.renameSession, deleteSession: store.deleteSession,
    retrySave: store.retrySave, ready: snapshot.ready && !snapshot.blocked,
    error: snapshot.error, dirty: snapshot.dirty,
  };
}
