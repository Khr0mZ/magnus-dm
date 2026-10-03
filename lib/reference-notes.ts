import { isFiniteNumber, isRecord } from './validation';

export type NoteRect = { x: number; y: number; width: number; height: number };
export type ReferenceNote = NoteRect & { open: boolean; collapsed: boolean; pinned: boolean; order: number };
export type ReferenceNotes = Record<string, ReferenceNote>;
export type NoteViewport = { bounds: NoteRect; scrollY: number };
export const NOTE_HEADER_HEIGHT = 74;
export const referenceNoteId = (key: string) => `reference-note-${encodeURIComponent(key)}`;

export function createReferenceNote(index: number): ReferenceNote {
  const offset = (index % 6) * 32;
  return { open: true, collapsed: false, pinned: false, x: 40 + offset, y: 120 + (index % 6) * 82, width: 640, height: 480, order: 0 };
}

export function isReferenceNote(value: unknown): value is ReferenceNote {
  return isRecord(value)
    && ['open', 'collapsed', 'pinned'].every(key => typeof value[key] === 'boolean')
    && ['x', 'y', 'width', 'height', 'order'].every(key => isFiniteNumber(value[key]) && value[key] >= 0 && value[key] <= 1_000_000)
    && (value.width as number) >= 320 && (value.height as number) >= 220;
}

// Fit the whole note into the available viewport, including its controls.
// Stored dimensions stay intact when a smaller screen temporarily constrains it.
export function fitReferenceNote(note: ReferenceNote, bounds: NoteRect): NoteRect {
  const width = Math.min(Math.max(320, note.width), bounds.width);
  const height = note.collapsed ? Math.min(NOTE_HEADER_HEIGHT, bounds.height) : Math.min(Math.max(220, note.height), bounds.height);
  return {
    width, height,
    x: Math.max(bounds.x, Math.min(note.x, bounds.x + bounds.width - width)),
    y: Math.max(bounds.y, Math.min(note.y, bounds.y + bounds.height - height)),
  };
}

// Unpinned positions belong to the document; pinned positions to the viewport.
export function referenceNoteBounds(viewport: NoteViewport, pinned: boolean): NoteRect {
  return { ...viewport.bounds, y: viewport.bounds.y + (pinned ? 0 : viewport.scrollY) };
}

// Only opening and dragging avoid the visible part of the header. Rendering
// uses the full viewport so scrolling cannot shift or stretch a pinned note.
export function getReferenceNoteViewport(avoidHeader = true): NoteViewport {
  const viewport = window.visualViewport;
  const width = viewport?.width ?? window.innerWidth;
  const height = viewport?.height ?? window.innerHeight;
  const headerBottom = avoidHeader ? document.querySelector('.site-header')?.getBoundingClientRect().bottom ?? 0 : 0;
  const top = Math.min(Math.max(12, headerBottom + 12), Math.max(12, height - NOTE_HEADER_HEIGHT - 12));
  return { bounds: { x: 12, y: top, width: Math.max(0, width - 24), height: Math.max(NOTE_HEADER_HEIGHT, height - top - 12) }, scrollY: Math.max(0, window.scrollY) };
}

export function changeReferenceNoteRect(note: ReferenceNote, bounds: NoteRect, kind: 'move' | 'resize', dx: number, dy: number): NoteRect {
  const current = fitReferenceNote(note, bounds);
  const changed = kind === 'move'
    ? { ...current, x: current.x + dx, y: current.y + dy }
    : { ...current, width: Math.max(320, current.width + dx), height: Math.max(220, current.height + dy) };
  const fitted = fitReferenceNote({ ...note, ...changed }, bounds);
  // Moving a collapsed note must not overwrite its unfolded height. Small
  // viewports also must not replace the preferred size merely by moving it.
  return { ...fitted, width: kind === 'move' ? note.width : Math.max(320, fitted.width), height: kind === 'move' ? note.height : Math.max(220, fitted.height) };
}
