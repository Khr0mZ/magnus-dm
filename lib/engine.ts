import { categories } from './catalog';
import { tableLabel, translate, withLanguage, type Language } from './i18n';
import * as t from './soloPlayTables';
import * as e from './soloPlayTablesExpanded';
import * as q from './quickGenerators';

export const pick = t.getRandomFromArray;
export const die = (sides = 10) => Math.floor(Math.random() * sides) + 1;
export const uid = () => globalThis.crypto.randomUUID();
export const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const fieldNames: Record<string, string> = {
  name: 'Nombre', type: 'Tipo', occupation: 'Ocupación', mood: 'Ánimo', motivation: 'Motivación', appearance: 'Apariencia', descriptor: 'Detalle', event: 'Suceso', role: 'Rol', notes: 'Notas', description: 'Descripción', flavor: 'Sabor', level: 'Nivel', product: 'Producto', ad: 'Anuncio', zone: 'Zona', item: 'Objeto', genre: 'Género', frequency: 'Frecuencia', host: 'Presentador', content: 'Contenido', station: 'Emisora', show: 'Programa', direction: 'Dirección', distance: 'Distancia', result: 'Resultado', effect: 'Efecto', title: 'Título', roll: 'Tirada', genreNotes: 'Detalles', broadcast: 'Emisión', reach: 'Alcance', airtime: 'Horario', theme: 'Tema', location: 'Lugar', music: 'Música', programming: 'Programación',
};
export function formatResult(value: unknown, language: Language = 'es'): string {
  if (Array.isArray(value)) return value.map(item => formatResult(item, language)).join(', ');
  if (value !== null && typeof value === 'object') return Object.entries(value).map(([key, val]) => `${translate(fieldNames[key] ?? key.replaceAll('_', ' '), language)}: ${formatResult(val, language)}`).join('\n');
  return String(value ?? '');
}

export function createNPC() {
  return { Nombre: e.generateRandomName().name, Alias: e.generateHandle(), Rol: pick(e.rolesTable()), Apariencia: pick(t.npcAppearanceTable()), Ánimo: pick(t.npcMoodTable()), Motivación: pick(t.npcMotivationTable()), Secreto: q.generateQuickRumor() };
}
// An editable GM starting point, rather than a character-creation method.
export function createNPCStats() {
  const stats = Object.fromEntries(['INT', 'REF', 'DEX', 'TECH', 'COOL', 'WILL', 'LUCK', 'MOVE', 'BODY', 'EMP'].map(key => [key, die(7) + 1]));
  const hp = 10 + 5 * Math.ceil((stats.BODY + stats.WILL) / 2);
  return { stats, hp, seriouslyWounded: Math.ceil(hp / 2) };
}
export function createMission() {
  return {
    Contratante: `${translate(pick(['Fixer', 'Corporativo', 'Nómada', 'Periodista', 'Netrunner']))} ${e.generateRandomName().name}`,
    Objetivo: pick(t.missionTypeTable()), Lugar: pick(t.locationTypeTable()),
    Objetivo_material: e.generateMissionItem().item,
    Pago: translate('{amount} eb por equipo', undefined, { amount: die(10) * 500 }), Complicación: q.generateQuickComplication(), Giro: q.generateQuickTwist(),
  };
}
const extraGenerators = [
  { key: 'contactFull', label: 'Contacto / PNJ', description: 'Un rostro, una motivación y algo que ocultar.', icon: 'user', generator: createNPC },
  { key: 'gigFull', label: 'Encargo', description: 'El próximo trabajo de tu equipo.', icon: 'briefcase', generator: createMission },
  { key: 'gangFull', label: 'Banda', description: 'Territorio, miembros y asuntos pendientes.', icon: 'users', generator: () => ({ Banda: pick(t.gangNameTable()).name, Territorio: pick(t.nightCityDistrictsTable()), Líder: e.generateHandle(), Miembros: `${die(10) * 5}`, Actividad: pick(t.missionTypeTable()), Armamento: e.generateFirearm(), Secreto: q.generateQuickRumor() }) },
  { key: 'buildingFull', label: 'Edificio', description: 'Localizaciones listas para entrar en escena.', icon: 'building', generator: () => ({ Lugar: pick(t.locationTypeTable()), Distrito: pick(t.nightCityDistrictsTable()), Propietario: pick(t.corpoNameTable()).name, Seguridad: translate(pick(['Dos guardias y cámaras antiguas', 'Drones y acceso biométrico', 'Vigilancia vecinal', 'Torreta y cerradura electrónica'])), Ambiente: e.generateSight(), Suceso: q.generateQuickEvent(), Secreto: q.generateQuickRumor() }) },
  { key: 'bountyFull', label: 'Recompensa', description: 'Un objetivo con precio sobre su cabeza.', icon: 'target', generator: () => ({ Objetivo: `${e.generateRandomName().name} «${e.generateHandle()}»`, Delito: translate(pick(['Robo de datos', 'Sabotaje corporativo', 'Contrabando', 'Asesinato', 'Fraude de identidad'])), Recompensa: `${die(10) * 1000} eb`, Paradero: pick(t.nightCityDistrictsTable()), Condición: translate(pick(['Con vida', 'Prueba de captura', 'Recuperar también los datos'])), Complicación: q.generateQuickComplication() }) },
  { key: 'itemFull', label: 'Objeto', description: 'Equipo, botín y tecnología de la calle.', icon: 'box', generator: () => ({ Objeto: e.generateMissionItem().item, Estado: translate(pick(['Nuevo, con número de serie borrado', 'Usado y modificado', 'Dañado pero reparable', 'Prototipo sin documentación'])), Procedencia: pick(t.corpoNameTable()).name, Detalle: q.generateQuickComplication() }) },
];
export function getGeneratorGroups(language: Language = 'es') {
  return [
    { key: 'featured', color: '#00FFFF', label: translate('Contenido', language), generators: extraGenerators.map(gen => ({ ...gen, label: translate(gen.label, language), description: translate(gen.description, language), generator: () => withLanguage<unknown>(language, gen.generator) })) },
    ...categories.map(category => ({ key: category.key, color: category.color, label: tableLabel(`categories.${category.key}`, language), generators: category.generators.map(gen => ({ ...gen, label: tableLabel(gen.key, language), description: translate('Tabla de {category}.', language, { category: tableLabel(`categories.${category.key}`, language).toLowerCase() }), icon: 'shuffle', generator: () => withLanguage(language, gen.generator) })) })),
  ];
}
export const generatorGroups = getGeneratorGroups();
export const allGenerators = generatorGroups.flatMap(group => group.generators.map(gen => ({ ...gen, category: group.label, categoryKey: group.key })));
export const generatorByKey = (key: string) => allGenerators.find(gen => gen.key === key);

export function rollDice(expression: string, random: (sides: number) => number = die) {
  const match = expression.trim().match(/^(\d{0,3})d(\d{1,3})(?:\s*([+-])\s*(\d{1,4}))?$/i);
  if (!match) throw new Error('Usa una fórmula como 1d10, 2d6 o 1d10+8.');
  const count = Number(match[1] || 1), sides = Number(match[2]);
  if (count < 1 || count > 100 || sides < 2 || sides > 100) throw new Error('Usa de 1 a 100 dados, de 2 a 100 caras.');
  const modifier = Number(match[4] || 0) * (match[3] === '-' ? -1 : 1);
  const rolls = Array.from({ length: count }, () => random(sides));
  return { expression: expression.trim(), rolls, modifier, total: rolls.reduce((sum, r) => sum + r, modifier) };
}
export const probabilities = [
  { label: 'Casi imposible', ranges: [75, 85, 90, 95] }, { label: 'Poco probable', ranges: [40, 55, 65, 75] },
  { label: '50 / 50', ranges: [20, 30, 40, 60] }, { label: 'Probable', ranges: [15, 25, 35, 55] },
  { label: 'Casi seguro', ranges: [5, 10, 15, 40] },
];
export function oracleAnswer(probability: number, roll: number, language: Language = 'es') {
  const ranges = probabilities[probability]?.ranges;
  if (!ranges || !Number.isInteger(roll) || roll < 1 || roll > 100) throw new Error('Tirada de oráculo inválida.');
  return translate(['No.', 'No, pero…', 'Es complicado.', 'Sí, pero…', 'Sí.'][ranges.findIndex(limit => roll <= limit) === -1 ? 4 : ranges.findIndex(limit => roll <= limit)], language);
}
export function skillCheck(base: number) {
  const roll = die(10), extra = roll === 1 || roll === 10 ? die(10) : 0;
  return { roll, extra, total: base + roll + (roll === 1 ? -extra : extra) };
}
export function rollClock(pool: number, escalate: boolean, random: (sides: number) => number = die) {
  const rolls = Array.from({ length: Math.max(0, pool) }, () => random(6));
  const removed = rolls.filter(value => value === 1 || (escalate && value === 6)).length;
  return { rolls, remaining: pool - removed, removed };
}
export function weightedPick(items: { text: string; weight: number }[], random = Math.random): string {
  if (!items.length || items.some(item => !item.text.trim() || !Number.isFinite(item.weight) || item.weight <= 0)) throw new Error('Cada resultado necesita un texto y un peso mayor que 0.');
  let roll = random() * items.reduce((sum, item) => sum + item.weight, 0);
  for (const item of items) { roll -= item.weight; if (roll < 0) return item.text; }
  return items[items.length - 1].text;
}
