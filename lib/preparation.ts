import { die, pick, uid } from './engine';
import { gmTableCategories } from './reference';
import { referenceLabel, translate, withLanguage, type Language } from './i18n';
import { generateHandle } from './soloPlayTablesExpanded';
import { isRecord as object, hasStrings as strings, isIntegerInRange as int, isRecordList as list } from './validation';

// A null key marks an authored name, including text that happens to match a catalog entry.
type PreparedName = { name: string; nameKey?: string | null; nameNumber?: number };
export type StockItem = PreparedName & { id: string; price: number; stock: number; notes: string };
export type MarketStall = PreparedName & { id: string; vendor: string; category: string; items: StockItem[] };
export type NightMarket = PreparedName & { id: string; location: string; notes: string; stalls: MarketStall[] };
export const floorTypes = ['password', 'file', 'ice', 'control', 'demon', 'empty'] as const;
export type FloorType = typeof floorTypes[number];
export type NetFloor = PreparedName & { id: string; parentId: string | null; type: FloorType; dv: number; notes: string };
export type NetArchitecture = PreparedName & { id: string; location: string; notes: string; difficulty: number; floors: NetFloor[] };
export type Preparation = { markets: NightMarket[]; architectures: NetArchitecture[] };
export const emptyPreparation = (): Preparation => ({ markets: [], architectures: [] });

export const marketCategories = [
  { key: 'weapons', label: 'Armas', tables: ['rangedWeaponStats', 'meleeWeaponStats', 'weaponAttachments', 'ammoTypes'] },
  { key: 'armor', label: 'Protección', tables: ['armorTypes'] },
  { key: 'cyberware', label: 'Ciberware', tables: ['fashionware', 'neuralware', 'cyberoptics', 'cyberaudio', 'internalCyberware', 'externalCyberware', 'cyberlimbs'] },
  { key: 'gear', label: 'Equipo', tables: ['equipmentList'] },
  { key: 'net', label: 'Software NET', tables: ['programsList'] },
];
export const floorLabels: Record<FloorType, string> = { password: 'Contraseña', file: 'Archivo', ice: 'Black ICE', control: 'Nodo de control', demon: 'Demonio', empty: 'Piso vacío' };
export const netDifficulties = [6, 8, 10, 12];
export const floorDV = (type: FloorType, difficulty: number) => ['password', 'file', 'control'].includes(type) ? difficulty : 0;
const generatedFloorNames = { password: 'Acceso restringido', file: 'Datos de operaciones', control: 'Control de seguridad', demon: 'Imp', empty: 'Canal de tránsito' };
const generatedFloorTypes: FloorType[] = ['password', 'file', 'ice', 'control', 'empty'];
const referenceTables = gmTableCategories.flatMap(group => group.tables);
const iceKeys = referenceTables.find(table => table.key === 'blackIce')!.rows.map(row => String(row.cells[0]));

// Read prices and names from the existing reference tables once, independently of locale.
const stockCatalog = new Map(marketCategories.map(category => [category.key,
  referenceTables.filter(table => category.tables.includes(table.key)).flatMap(table => {
    const priceIndex = table.columns.findIndex(column => column.headerKey === 'headers.cost');
    if (priceIndex < 0) return [];
    return table.rows.flatMap(row => {
      const price = String(row.cells[priceIndex]);
      if (!/^\d+\s*eb$/.test(price)) return [];
      return [{ key: String(row.cells[0]), price: Number.parseInt(price) }];
    });
  }),
]));

// Keep a catalog key with generated names so the language switch works on saved
// preparation. An authored name always takes precedence over its catalog key.
export function preparationName(record: PreparedName, language: Language): string {
  const key = record.nameKey;
  if (!key) return record.name;
  const label = (locale: Language) => {
    const text = key.startsWith('t:') ? referenceLabel(key, locale) : translate(key, locale);
    return record.nameNumber === undefined ? text : `${text} ${record.nameNumber}`;
  };
  return [label('es'), label('en')].includes(record.name) ? label(language) : record.name;
}

export function marketCatalog(category: string, language: Language): Omit<StockItem, 'id' | 'stock'>[] {
  return (stockCatalog.get(category) ?? []).map(({ key, price }) => ({
    name: referenceLabel(key, language), ...(key.startsWith('t:') ? { nameKey: key } : {}), price, notes: '',
  }));
}
export function createMarket(name: string, category: string, count: number, priceLimit: number, language: Language): NightMarket {
  if (!int(count, 1, 8) || !Number.isFinite(priceLimit) || priceLimit < 1) throw new Error('Invalid market options');
  const eligible = marketCategories.filter(group => category === 'mixed' || group.key === category)
    .map(group => ({ ...group, catalog: marketCatalog(group.key, language).filter(item => item.price <= priceLimit) }))
    .filter(group => group.catalog.length);
  if (!eligible.length) throw new Error(translate('No hay mercancía para ese límite de precio.', language));
  const stalls = Array.from({ length: count }, (_, index) => {
    const group = eligible[index % eligible.length];
    // Sample without replacement inside each stall.
    const selected = [...group.catalog];
    for (let i = selected.length - 1; i > 0; i--) { const j = die(i + 1) - 1; [selected[i], selected[j]] = [selected[j], selected[i]]; }
    return { id: uid(), category: group.key, name: `${translate(group.label, language)} ${index + 1}`, nameKey: group.label, nameNumber: index + 1, vendor: withLanguage(language, generateHandle), items: selected.slice(0, 5).map(item => ({ ...item, id: uid(), stock: die(5) })) };
  });
  return { id: uid(), name: name.trim() || translate('Mercado nocturno', language), nameKey: name.trim() ? null : 'Mercado nocturno', location: '', notes: '', stalls };
}

export function marketText(market: NightMarket, language: Language): string {
  const stalls = market.stalls.map(stall => `${preparationName(stall, language)} // ${stall.vendor}\n${stall.items.map(item =>
    `${preparationName(item, language)} · ${item.price} eb · ${translate('Existencias', language)}: ${item.stock}${item.notes ? ` · ${item.notes}` : ''}`
  ).join('\n')}`);
  return [preparationName(market, language), market.location, market.notes, ...stalls].filter(Boolean).join('\n\n');
}

export function createArchitecture(name: string, count: number, branches: number, difficulty: number, language: Language): NetArchitecture {
  if (!int(count, 3, 18) || !int(branches, 0, 4) || !netDifficulties.includes(difficulty)) throw new Error('Invalid architecture options');
  const floors: NetFloor[] = [];
  let usedBranches = 0;
  for (let index = 0; index < count; index++) {
    let parent = floors[index - 1] ?? null;
    if (index > 3 && usedBranches < branches && die(100) <= 45) {
      const choices = floors.slice(1, -1).filter(floor => floors.filter(child => child.parentId === floor.id).length === 1);
      if (choices.length) { parent = pick(choices); usedBranches++; }
    }
    const type: FloorType = index === 0 ? 'password' : index === 1 ? 'file' : index === count - 1 ? 'control' : pick(generatedFloorTypes);
    const nameKey = type === 'ice' ? pick(iceKeys) : generatedFloorNames[type];
    floors.push({ id: uid(), parentId: parent?.id ?? null, type, name: nameKey.startsWith('t:') ? referenceLabel(nameKey, language) : translate(nameKey, language), nameKey, dv: floorDV(type, difficulty), notes: '' });
  }
  return { id: uid(), name: name.trim() || translate('Arquitectura NET', language), nameKey: name.trim() ? null : 'Arquitectura NET', location: '', notes: '', difficulty, floors };
}
export function removeFloorBranch(architecture: NetArchitecture, id: string): NetArchitecture {
  const target = architecture.floors.find(floor => floor.id === id);
  if (!target || target.parentId === null) return architecture;
  const removed = new Set([id]);
  for (const floor of architecture.floors) if (floor.parentId && removed.has(floor.parentId)) removed.add(floor.id);
  return { ...architecture, floors: architecture.floors.filter(floor => !removed.has(floor.id)) };
}
export function reparentNetFloor(architecture: NetArchitecture, id: string, parentId: string): NetArchitecture {
  const index = architecture.floors.findIndex(floor => floor.id === id), parentIndex = architecture.floors.findIndex(floor => floor.id === parentId);
  if (index <= 0 || parentIndex < 0 || parentIndex >= index || architecture.floors.filter(floor => floor.id !== id && floor.parentId === parentId).length >= 2) return architecture;
  return { ...architecture, floors: architecture.floors.map(floor => floor.id === id ? { ...floor, parentId } : floor) };
}
export function architectureText(architecture: NetArchitecture, language: Language): string {
  return [preparationName(architecture, language), architecture.location, ...architecture.floors.map((floor, index) => {
    const parent = floor.parentId ? architecture.floors.findIndex(item => item.id === floor.parentId) + 1 : '—';
    return `${index + 1} ← ${parent} // ${translate(floorLabels[floor.type], language)}: ${preparationName(floor, language)}${floor.dv ? ` · DV ${floor.dv}` : ''}${floor.notes ? `\n${floor.notes}` : ''}`;
  }), architecture.notes].filter(Boolean).join('\n');
}
export function netPositions(floors: NetFloor[]) {
  const positions = new Map<string, { x: number; y: number }>();
  let leaf = 0;
  function visit(floor: NetFloor, depth: number): number {
    const children = floors.filter(child => child.parentId === floor.id);
    const xs = children.map(child => visit(child, depth + 1));
    const x = xs.length ? (xs[0] + xs[xs.length - 1]) / 2 : 110 + leaf++ * 220;
    positions.set(floor.id, { x, y: 50 + depth * 100 });
    return x;
  }
  const root = floors.find(floor => floor.parentId === null);
  if (root) visit(root, 0);
  const width = Math.max(420, leaf * 220);
  for (const point of positions.values()) point.x += (width - leaf * 220) / 2;
  return { positions, width, height: Math.max(150, ...[...positions.values()].map(point => point.y + 55)) };
}

const validName = (v: Record<string, unknown>) => strings(v, ['id', 'name']) && !!v.id
  && (v.nameKey === undefined || v.nameKey === null || typeof v.nameKey === 'string')
  && (v.nameNumber === undefined || int(v.nameNumber, 1, 9999));
export function validArchitecture(value: unknown): value is NetArchitecture {
  if (!object(value) || !strings(value, ['location', 'notes']) || !validName(value) || !netDifficulties.includes(value.difficulty as number)
    || !list(value.floors, f => strings(f, ['id', 'name', 'notes']) && validName(f) && floorTypes.includes(f.type as FloorType) && int(f.dv, 0, 40) && (f.parentId === null || typeof f.parentId === 'string')) || !value.floors.length || value.floors.length > 64) return false;
  const seen = new Set<string>();
  for (const [index, floor] of value.floors.entries()) {
    if (index === 0 ? floor.parentId !== null : !seen.has(floor.parentId as string)) return false;
    if (value.floors.filter(child => child.parentId === floor.id).length > 2) return false;
    seen.add(floor.id as string);
  }
  return true;
}
export function validPreparation(value: unknown): value is Preparation {
  return object(value)
    && list(value.markets, market => strings(market, ['id', 'name', 'location', 'notes']) && validName(market) && list(market.stalls, stall => strings(stall, ['id', 'name', 'vendor', 'category']) && validName(stall) && list(stall.items, item => strings(item, ['id', 'name', 'notes']) && validName(item) && int(item.price, 0, 100000000) && int(item.stock, 0, 9999))))
    && list(value.architectures, architecture => validArchitecture(architecture));
}

const languages: Language[] = ['es', 'en'];
const legacyCatalogNames = new Map(languages.flatMap(language => marketCategories.flatMap(category =>
  marketCatalog(category.key, language).filter(item => item.nameKey).map(item => [item.name, item.nameKey!] as const)
)));
const floorKeys = [...Object.values(generatedFloorNames), 'Nuevo piso', ...iceKeys];
const binding = (record: PreparedName, keys: string[]) => record.nameKey !== undefined ? record.nameKey : keys.find(key =>
  languages.some(language => (key.startsWith('t:') ? referenceLabel(key, language) : translate(key, language)) === record.name));

// Retain authored text and catalog bindings; drop retired tools and NET play state.
export function migratePreparation(preparation: Preparation): Preparation {
  const markets = preparation.markets.map(market => ({ ...market, nameKey: binding(market, ['Mercado nocturno']), stalls: market.stalls.map(stall => {
    const group = marketCategories.find(category => category.key === stall.category);
    const number = stall.nameKey === undefined && group ? Array.from({ length: 8 }, (_, i) => i + 1).find(n => languages.some(language => stall.name === `${translate(group.label, language)} ${n}`)) : undefined;
    return { ...stall, ...(number ? { nameKey: group!.label, nameNumber: number } : {}), items: stall.items.map(item => {
      if (item.nameKey !== undefined) return item;
      const nameKey = legacyCatalogNames.get(item.name);
      return nameKey ? { ...item, nameKey } : item;
    }) };
  }) }));
  return { markets, architectures: preparation.architectures.map(architecture => ({
    id: architecture.id, name: architecture.name, nameKey: binding(architecture, ['Arquitectura NET']), nameNumber: architecture.nameNumber, location: architecture.location, notes: architecture.notes, difficulty: architecture.difficulty,
    floors: architecture.floors.map(floor => ({ id: floor.id, parentId: floor.parentId, type: floor.type, name: floor.name, nameKey: binding(floor, floorKeys), nameNumber: floor.nameNumber, dv: floor.dv, notes: floor.notes })),
  })) };
}
