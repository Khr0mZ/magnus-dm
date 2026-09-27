export type CatalogFile = { key: string; label: string; description: string; icon?: string; color?: string };
export type CatalogFolder<T extends CatalogFile = CatalogFile> = { key: string; label: string; color?: string; files: T[] };

type DeckBounds = { left: number; right: number; top: number; bottom: number };
// Use stationary slots, never the transformed card faces, to choose one owner.
export function deckHoverIndex(slots: readonly DeckBounds[], x: number, y: number, previous: number | null): number | null {
  for (let index = slots.length - 1; index >= 0; index--) {
    const box = slots[index];
    if (x >= box.left && x < box.right && y >= box.top && y < box.bottom) return index;
  }
  // Keep the extracted card's controls reachable above its resting footprint.
  const active = previous === null ? undefined : slots[previous];
  if (active && x >= active.left - 8 && x < active.right + 8 && y >= active.top - 32 && y < active.top) return previous;
  return null;
}

// Separate related categories that share a base neon in the original catalog.
const categoryTints: Record<string, string> = {
  names: '#53D8FF', media: '#43DFCB', mission: '#B8FF3E', spmCharacter: '#929FFF',
  spmEncounters: '#FFAC42', spmAtmosphere: '#DC72FF', spmCombat: '#FF9C52', spmMedical: '#A3FFCA',
  combatRanged: '#FFC247', combatMelee: '#ED75FF', vehicleCombat: '#43DFCB',
};
export const stackCategoryColor = (key: string, fallback?: string) => categoryTints[key] ?? fallback ?? '#00FFFF';

const normalize = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
export function matchesQuery(text: string, query: string): boolean {
  const haystack = normalize(text);
  return normalize(query).trim().split(/\s+/).every(word => haystack.includes(word));
}
export function filterFolders<T extends CatalogFile>(folders: CatalogFolder<T>[], query: string, favorites: string[] = [], favoritesOnly = false): CatalogFolder<T>[] {
  return folders.map(folder => ({ ...folder, files: folder.files.filter(file =>
    (!favoritesOnly || favorites.includes(file.key)) && matchesQuery(`${folder.label} ${file.label} ${file.description}`, query)
  ) })).filter(folder => folder.files.length > 0);
}
