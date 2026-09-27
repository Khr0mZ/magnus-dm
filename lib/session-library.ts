import { emptySession, parseSession, type Session } from './session';

export const SESSION_LIBRARY_KEY = 'magnus-dm.sessions.v2';
export const LEGACY_SESSION_KEY = 'magnus-dm.session.v1';
export type SavedSession = { id: string; data: Session };
export type Favorites = { generators: string[]; references: string[] };
export type SessionLibrary = { version: 2; activeId: string; reader: boolean; favorites: Favorites; sessions: SavedSession[] };
type Storage = Pick<globalThis.Storage, 'getItem' | 'setItem'>;
type Snapshot = { library: SessionLibrary; ready: boolean; error: string; dirty: boolean; blocked: boolean };
const readError = 'No se han podido leer las sesiones guardadas. Tus datos originales siguen en este navegador.';
const writeError = 'El navegador no ha podido guardar los cambios. Comprueba el espacio disponible.';

export function createSessionLibrary(session = emptySession()): SessionLibrary {
  return { version: 2, activeId: 'initial', reader: session.reader, favorites: { generators: [...new Set(session.favorites)], references: [] }, sessions: [{ id: 'initial', data: session }] };
}
export function parseSessionLibrary(raw: string): SessionLibrary {
  try {
    const value = JSON.parse(raw) as SessionLibrary;
    if (!value || value.version !== 2 || typeof value.activeId !== 'string' || typeof value.reader !== 'boolean'
      || !Array.isArray(value.sessions) || !value.sessions.length) throw new Error();
    const ids = new Set<string>();
    for (const record of value.sessions) {
      if (!record || typeof record.id !== 'string' || !record.id || ids.has(record.id)) throw new Error();
      ids.add(record.id);
      parseSession(JSON.stringify(record.data));
    }
    if (!ids.has(value.activeId)) throw new Error();
    if (value.favorites === undefined) {
      // Older libraries stored generator favorites inside each session. Merge
      // them once, without losing selections made in any existing session.
      value.favorites = { generators: [...new Set(value.sessions.flatMap(record => record.data.favorites))], references: [] };
    } else {
      if (!value.favorites || typeof value.favorites !== 'object' || Array.isArray(value.favorites)) throw new Error();
      for (const kind of ['generators', 'references'] as const) {
        const entries = value.favorites[kind];
        if (!Array.isArray(entries) || !entries.every(key => typeof key === 'string')) throw new Error();
        value.favorites[kind] = [...new Set(entries)];
      }
    }
    return value;
  } catch { throw new Error(readError); }
}
export function activeSession(library: SessionLibrary): Session {
  // Session.favorites remains a compatibility view for the v1 session schema.
  return { ...library.sessions.find(record => record.id === library.activeId)!.data, reader: library.reader, favorites: library.favorites.generators };
}

// Atomic writes keep sessions together. Retain the legacy key as a migration
// backup; never replace corrupt data with an empty session.
export function createSessionStore(getStorage: () => Storage) {
  const initial: Snapshot = { library: createSessionLibrary(), ready: false, error: '', dirty: false, blocked: false };
  let snapshot = initial;
  const listeners = new Set<() => void>();
  const emit = (next: Snapshot) => { snapshot = next; listeners.forEach(listener => listener()); };
  const fail = (message: string, blocked = false) => emit({ ...snapshot, error: message, blocked });
  function readLatest(): SessionLibrary {
    const raw = getStorage().getItem(SESSION_LIBRARY_KEY);
    if (!raw) throw new Error(readError);
    return parseSessionLibrary(raw);
  }
  function save(library: SessionLibrary) {
    getStorage().setItem(SESSION_LIBRARY_KEY, JSON.stringify(library));
    emit({ library, ready: true, error: '', dirty: false, blocked: false });
  }
  function latestForThisTab(): SessionLibrary {
    const latest = readLatest();
    if (!latest.sessions.some(record => record.id === snapshot.library.activeId)) {
      throw new Error('La sesión abierta se ha eliminado en otra pestaña. Recarga para continuar.');
    }
    return { ...latest, activeId: snapshot.library.activeId };
  }
  function retrySave(): boolean {
    if (!snapshot.dirty || snapshot.blocked) return !snapshot.blocked;
    try {
      // Keep other sessions edited in another tab during a failed local save.
      const raw = getStorage().getItem(SESSION_LIBRARY_KEY);
      let merged = snapshot.library;
      if (raw) {
        const latest = latestForThisTab();
        merged = { ...latest, reader: snapshot.library.reader, sessions: latest.sessions.map(record => record.id === snapshot.library.activeId ? snapshot.library.sessions.find(local => local.id === record.id)! : record) };
      }
      save(merged);
      return true;
    } catch { fail(writeError); return false; }
  }
  function transact(change: (library: SessionLibrary) => SessionLibrary): boolean {
    if (!snapshot.ready || snapshot.blocked || !retrySave()) return false;
    let next: SessionLibrary;
    try { next = change(latestForThisTab()); }
    catch (error) { fail(error instanceof Error ? error.message : readError, true); return false; }
    try { save(next); return true; }
    catch { fail(writeError); return false; }
  }
  return {
    getSnapshot: () => snapshot,
    getServerSnapshot: () => initial,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    hydrate() {
      if (snapshot.ready) return;
      let library: SessionLibrary;
      try {
        const storage = getStorage();
        const raw = storage.getItem(SESSION_LIBRARY_KEY);
        if (raw) { emit({ ...initial, library: parseSessionLibrary(raw), ready: true }); return; }
        const legacy = storage.getItem(LEGACY_SESSION_KEY);
        library = createSessionLibrary(legacy ? parseSession(legacy) : emptySession());
      } catch { emit({ ...initial, ready: true, error: readError, blocked: true }); return; }
      try { save(library); }
      catch { emit({ ...initial, library, ready: true, dirty: true, error: writeError }); }
    },
    sync() {
      if (!snapshot.ready || snapshot.dirty || snapshot.blocked) return;
      try {
        const library = readLatest();
        if (library.sessions.some(record => record.id === snapshot.library.activeId)) library.activeId = snapshot.library.activeId;
        emit({ library, ready: true, dirty: false, blocked: false, error: '' });
      } catch { fail(readError, true); }
    },
    setSession(update: Session | ((current: Session) => Session)) {
      if (!snapshot.ready || snapshot.blocked) return;
      let library: SessionLibrary;
      try { library = snapshot.dirty ? snapshot.library : latestForThisTab(); }
      catch (error) { fail(error instanceof Error ? error.message : readError, true); return; }
      const next = typeof update === 'function' ? update(activeSession(library)) : update;
      const changed = { ...library, reader: next.reader, sessions: library.sessions.map(record => record.id === library.activeId ? { ...record, data: next } : record) };
      emit({ ...snapshot, library: changed, dirty: true });
      retrySave();
    },
    retrySave,
    toggleFavorite(kind: keyof Favorites, key: string) {
      if (!key) return false;
      return transact(library => {
        const entries = library.favorites[kind];
        return { ...library, favorites: { ...library.favorites, [kind]: entries.includes(key) ? entries.filter(item => item !== key) : [...entries, key] } };
      });
    },
    selectSession(id: string) {
      return transact(library => library.sessions.some(record => record.id === id) ? { ...library, activeId: id } : library);
    },
    createSession(id: string, name: string) {
      if (!name.trim() || name.trim().length > 90) return false;
      return transact(library => {
        if (library.sessions.some(record => record.id === id)) throw new Error('No se ha podido crear la sesión. Inténtalo de nuevo.');
        return { ...library, activeId: id, sessions: [...library.sessions, { id, data: { ...emptySession(), name: name.trim(), reader: library.reader } }] };
      });
    },
    renameSession(name: string) {
      if (!name.trim() || name.trim().length > 90) return false;
      return transact(library => ({ ...library, sessions: library.sessions.map(record => record.id === library.activeId ? { ...record, data: { ...record.data, name: name.trim() } } : record) }));
    },
    deleteSession() {
      if (snapshot.library.sessions.length < 2) return false;
      return transact(library => {
        if (library.sessions.length < 2) return library;
        const sessions = library.sessions.filter(record => record.id !== library.activeId);
        return { ...library, activeId: sessions[0].id, sessions };
      });
    },
  };
}
