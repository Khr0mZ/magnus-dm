import { emptyPreparation, migratePreparation, validPreparation, type Preparation } from './preparation';
import { isRecord as object, hasStrings as strings, isFiniteNumber as finite, isIntegerInRange as integer, isRecordList as list } from './validation';

export type MapLocation = { latitude: number; longitude: number };
export type Entry = { id: string; title: string; text: string; kind: string; time: number; pinned: boolean; generator?: string; map?: MapLocation };
export type Clock = { id: string; name: string; initial: number; remaining: number; escalate: boolean; rolls: number[]; luckUsed: boolean };
export type NPC = { id: string; name: string; role: string; status: string; relationship: string; notes: string; stats: string };
export type Scene = { id: string; name: string; location: string; participants: string; goal: string; outcome: string; done: boolean };
export type Beat = { id: string; kind: string; text: string; done: boolean };
export type Challenge = { id: string; kind: 'investigation' | 'social'; name: string; target: number; base: number; difficulty: number; checks: { total: number; detail: string; win: boolean }[] };
export type IP = { id: string; name: string; amount: number; note: string; date: string };
export type CustomTable = { id: string; name: string; items: { text: string; weight: number }[] };
export type Session = { version: 1; name: string; notes: string; history: Entry[]; clocks: Clock[]; npcs: NPC[]; scenes: Scene[]; beats: Beat[]; challenges: Challenge[]; ip: IP[]; customTables: CustomTable[]; mission: Record<string, string> | null; favorites: string[]; reader: boolean; preparation: Preparation };
export function emptySession(): Session {
  return { version: 1, name: 'Una noche en Night City', notes: '', history: [], clocks: [], npcs: [], scenes: [], beats: [], challenges: [], ip: [], customTables: [], mission: null, favorites: ['contactFull', 'gigFull', 'gangFull', 'buildingFull', 'bountyFull', 'itemFull'], reader: false, preparation: emptyPreparation() };
}
export const validMapLocation = (v: unknown): v is MapLocation => object(v) && finite(v.latitude) && finite(v.longitude) && Math.abs(v.latitude) <= 0.1 && Math.abs(v.longitude) <= 0.1;
export function parseSession(raw: string): Session {
  const v: unknown = JSON.parse(raw);
  if (!object(v) || v.version !== 1 || !strings(v, ['name', 'notes']) || typeof v.reader !== 'boolean'
    || !Array.isArray(v.favorites) || !v.favorites.every(x => typeof x === 'string')
    || !(v.mission === null || (object(v.mission) && Object.values(v.mission).every(x => typeof x === 'string')))
    || !list(v.history, x => strings(x, ['id', 'title', 'text', 'kind']) && finite(x.time) && typeof x.pinned === 'boolean' && (x.generator === undefined || typeof x.generator === 'string') && (x.map === undefined || validMapLocation(x.map)))
    || !list(v.clocks, x => strings(x, ['id', 'name']) && integer(x.initial, 3, 10) && integer(x.remaining, 0, x.initial as number) && typeof x.escalate === 'boolean' && typeof x.luckUsed === 'boolean' && Array.isArray(x.rolls) && x.rolls.every(r => integer(r, 1, 6)))
    || !list(v.npcs, x => strings(x, ['id', 'name', 'role', 'status', 'relationship', 'notes', 'stats']))
    || !list(v.scenes, x => strings(x, ['id', 'name', 'location', 'participants', 'goal', 'outcome']) && typeof x.done === 'boolean')
    || !list(v.beats, x => strings(x, ['id', 'kind', 'text']) && typeof x.done === 'boolean')
    || !list(v.challenges, x => strings(x, ['id', 'name']) && ['investigation', 'social'].includes(String(x.kind)) && [3, 5, 7].includes(Number(x.target)) && finite(x.base) && finite(x.difficulty) && Array.isArray(x.checks) && x.checks.length <= Number(x.target) && x.checks.every(c => object(c) && finite(c.total) && typeof c.detail === 'string' && typeof c.win === 'boolean'))
    || !list(v.ip, x => strings(x, ['id', 'name', 'note', 'date']) && finite(x.amount))
    || !list(v.customTables, x => strings(x, ['id', 'name']) && Array.isArray(x.items) && x.items.length >= 3 && x.items.length <= 20 && x.items.every(i => object(i) && typeof i.text === 'string' && finite(i.weight) && i.weight > 0))
    || (v.preparation !== undefined && !validPreparation(v.preparation))) {
    throw new Error('No se ha podido leer la sesión guardada. Tus datos originales siguen en este navegador.');
  }
  return { ...v, preparation: v.preparation === undefined ? emptyPreparation() : migratePreparation(v.preparation as Preparation) } as Session;
}
export function appendEntry(session: Session, entry: Entry): Session {
  const history = [entry, ...session.history];
  let recent = 0;
  return { ...session, history: history.filter(item => item.pinned || item.map || ++recent <= 200) };
}

// One location per entry: placing an existing marker moves it without copying
// its content, changing the log order or changing its pin/date/generator.
export function placeEntryOnMap(session: Session, id: string, location: unknown): Session {
  if (!validMapLocation(location) || !session.history.some(entry => entry.id === id)) return session;
  return { ...session, history: session.history.map(entry => entry.id === id ? { ...entry, map: { latitude: location.latitude, longitude: location.longitude } } : entry) };
}

export function removeEntryFromMap(session: Session, id: string): Session {
  return { ...session, history: session.history.map(entry => {
    if (entry.id !== id || !entry.map) return entry;
    const next = { ...entry };
    delete next.map;
    return next;
  }) };
}

// A reroll revises the existing result, retaining its place, date and pin.
// Missing entries may have been removed/pruned: never resurrect them here.
export function replaceEntryResult(session: Session, id: string, result: Pick<Entry, 'title' | 'text'>): Session {
  if (!session.history.some(entry => entry.id === id)) return session;
  return { ...session, history: session.history.map(entry => entry.id === id ? { ...entry, title: result.title, text: result.text } : entry) };
}
