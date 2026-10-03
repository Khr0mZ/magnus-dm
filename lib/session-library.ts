import { emptySession, parseSession, type Session } from './session';
import { isRecord } from './validation';
import { createReferenceNote, fitReferenceNote, isReferenceNote, referenceNoteBounds, type NoteViewport, type ReferenceNotes, type ReferenceNote } from './reference-notes';

export const SESSION_LIBRARY_KEY = 'magnus-dm.sessions.v2';
export const LEGACY_SESSION_KEY = 'magnus-dm.session.v1';
export type SavedSession = { id: string; data: Session };
export type Favorites = { generators: string[]; references: string[] };
export type SessionLibrary = { version: 2; activeId: string; reader: boolean; favorites: Favorites; referenceNotes: ReferenceNotes; sessions: SavedSession[] };
type Storage = Pick<globalThis.Storage, 'getItem' | 'setItem'>;
type Snapshot = { library: SessionLibrary; ready: boolean; error: string; dirty: boolean; blocked: boolean };
const readError = 'No se han podido leer las sesiones guardadas. Tus datos originales siguen en este navegador.';
const writeError = 'El navegador no ha podido guardar los cambios. Comprueba el espacio disponible.';

export function createSessionLibrary(session = emptySession()): SessionLibrary {
  return { version: 2, activeId: 'initial', reader: session.reader, favorites: { generators: [...new Set(session.favorites)], references: [] }, referenceNotes: {}, sessions: [{ id: 'initial', data: session }] };
}
export function parseSessionLibrary(raw: string): SessionLibrary {
  try {
    const value = JSON.parse(raw) as SessionLibrary & { referenceScreens?: unknown };
    if (!value || value.version !== 2 || typeof value.activeId !== 'string' || typeof value.reader !== 'boolean'
      || !Array.isArray(value.sessions) || !value.sessions.length) throw new Error();
    const ids = new Set<string>();
    for (const record of value.sessions) {
      if (!record || typeof record.id !== 'string' || !record.id || ids.has(record.id)) throw new Error();
      ids.add(record.id);
      record.data = parseSession(JSON.stringify(record.data));
    }
    if (!ids.has(value.activeId)) throw new Error();
    if (value.favorites === undefined) {
      // Older libraries stored generator favorites inside each session. Merge
      // them once, without losing selections made in any existing session.
      value.favorites = { generators: [...new Set(value.sessions.flatMap(record => record.data.favorites))], references: [] };
    } else {
      if (!isRecord(value.favorites)) throw new Error();
      for (const kind of ['generators', 'references'] as const) {
        const entries = value.favorites[kind];
        if (!Array.isArray(entries) || !entries.every(key => typeof key === 'string')) throw new Error();
        value.favorites[kind] = [...new Set(entries)];
      }
    }
    if (value.referenceNotes === undefined) value.referenceNotes = {};
    if (!isRecord(value.referenceNotes)) throw new Error();
    const notes = Object.entries(value.referenceNotes as Record<string, unknown>).map(([key, saved]) => {
      if (!isRecord(saved) || (saved.expanded !== undefined && typeof saved.expanded !== 'boolean')) throw new Error();
      const note: Record<string, unknown> = { ...saved, pinned: saved.pinned === undefined ? false : saved.pinned };
      delete note.expanded;
      if (!isReferenceNote(note)) throw new Error();
      return [key, note] as const;
    });
    value.referenceNotes = Object.fromEntries(notes.filter(([key]) => value.favorites.references.includes(key)));
    // Discard the removed configurable screen without changing session data.
    delete value.referenceScreens;
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
        const removing = entries.includes(key);
        return { ...library, favorites: { ...library.favorites, [kind]: removing ? entries.filter(item => item !== key) : [...entries, key] },
          referenceNotes: kind === 'references' && removing ? Object.fromEntries(Object.entries(library.referenceNotes).filter(([id]) => id !== key)) : library.referenceNotes };
      });
    },
    toggleReferenceNote(key: string, viewport?: NoteViewport) {
      if (!key) return false;
      return transact(library => {
        if (!library.favorites.references.includes(key)) return library;
        const current = library.referenceNotes[key];
        let note = current ? { ...current, open: !current.open } : createReferenceNote(Object.values(library.referenceNotes).filter(note => note.open).length);
        if (note.open && viewport && !note.pinned) {
          if (!current) note = { ...note, y: note.y + viewport.scrollY };
          const position = fitReferenceNote(note, referenceNoteBounds(viewport, note.pinned));
          note = { ...note, x: position.x, y: position.y };
        }
        const order = Math.max(0, ...Object.values(library.referenceNotes).map(note => note.order)) + 1;
        return { ...library, referenceNotes: { ...library.referenceNotes, [key]: { ...note, order } } };
      });
    },
    updateReferenceNote(key: string, change: Partial<Omit<ReferenceNote, 'order'>>) {
      return transact(library => {
        const current = library.referenceNotes[key];
        if (!current || !library.favorites.references.includes(key)) return library;
        const note = { ...current, ...change };
        if (!isReferenceNote(note)) throw new Error('No se ha podido guardar la posición de la referencia.');
        return { ...library, referenceNotes: { ...library.referenceNotes, [key]: note } };
      });
    },
    raiseReferenceNote(key: string) {
      return transact(library => {
        const current = library.referenceNotes[key];
        if (!current?.open) return library;
        const order = Math.max(0, ...Object.values(library.referenceNotes).filter(note => note.open).map(note => note.order));
        if (current.order === order) return library;
        return { ...library, referenceNotes: { ...library.referenceNotes, [key]: { ...current, order: order + 1 } } };
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
