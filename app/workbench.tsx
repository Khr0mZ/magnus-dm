'use client';
/* Local brand assets are served directly; no image optimization service is required. */
/* eslint-disable @next/next/no-img-element */

import { useEffect, useRef, useState } from 'react';
import { Check, Copy, FileText, SquareTerminal, CircuitBoard, Database, MapPinned, Pin, RotateCcw, Trash2 } from 'lucide-react';
import { formatResult, getGeneratorGroups, uid } from '../lib/engine';
import { generateRandomEncounter, type EncounterTime, type EncounterZone } from '../lib/soloPlayTablesExpanded';
import { appendEntry, placeEntryOnMap, removeEntryFromMap, replaceEntryResult, type Entry, type MapLocation } from '../lib/session';
import { gmTableCategories } from '../lib/reference';
import { useSession } from './use-session';
import { Empty, FileHeading, PanelHeading, ToolLink } from './ui';
import DMTools, { dmToolCount } from './dm-tools';
import CyberBackground from './cyber-background';
import { useLocale } from './locale';
import { categoryStyle, FileStack, StackFile } from './data-stack';
import { stackCategoryColor } from '../lib/explorer';
import GeneratorExplorer from './generator-explorer';
import ReferenceExplorer, { FavoriteReferences } from './reference-explorer';
import ReferenceNotesLayer from './reference-notes';
import { copyText } from '../lib/clipboard';
import { assetPath } from '../lib/asset-path';
import SessionBar from './session-bar';
import CyberSelect from './cyber-select';
import OraclePanel from './oracle-panel';
import NightCityMap, { ENTRY_DRAG_TYPE } from './night-city-map';
import MapEntryEditor from './map-entry-editor';

export default function Workbench() {
  const store = useSession();
  // Reset draft forms and transient results when changing sessions.
  return <SessionWorkbench key={store.activeId} store={store} />;
}

function SessionWorkbench({ store }: { store: ReturnType<typeof useSession> }) {
  const { t, language, setLanguage, run } = useLocale();
  const generatorGroups = getGeneratorGroups(language);
  const allGenerators = generatorGroups.flatMap(group => group.generators.map(gen => ({ ...gen, category: group.label, categoryKey: group.key })));
  const generatorByKey = (key: string) => allGenerators.find(gen => gen.key === key);
  const { session, setSession, ready, error } = store;
  const [tab, setTab] = useState('desk');
  const [mapOpened, setMapOpened] = useState(false);
  const [pendingMapEntryId, setPendingMapEntryId] = useState<string | null>(null);
  const [editingMapEntryId, setEditingMapEntryId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [pinnedOnly, setPinnedOnly] = useState(false);
  const [notice, setNotice] = useState('');
  const [latestId, setLatestId] = useState<string | null>(null);
  const [zone, setZone] = useState<EncounterZone>('moderate');
  const [time, setTime] = useState<EncounterTime>('night');
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(''), 3200);
    return () => clearTimeout(timer);
  }, [notice]);

  function log(title: string, text: string, kind = 'generador', generator?: string) {
    // Called exclusively by user event handlers, never during rendering.
    // eslint-disable-next-line react-hooks/purity
    const entry: Entry = { id: uid(), title, text, kind, generator, time: Date.now(), pinned: false };
    setSession(current => appendEntry(current, entry));
    setLatestId(entry.id);
  }
  function generate(key: string) {
    const gen = generatorByKey(key);
    if (!gen) return;
    try { log(gen.label, formatResult(gen.generator(), language), 'generador', key); }
    catch { setNotice(t("No se ha podido generar este resultado. Vuelve a intentarlo.")); }
  }
  function reroll(entry: Entry) {
    const gen = entry.generator && generatorByKey(entry.generator);
    if (!gen) return;
    try {
      const result = { title: gen.label, text: formatResult(gen.generator(), language) };
      setSession(current => replaceEntryResult(current, entry.id, result));
      setLatestId(entry.id);
    } catch { setNotice(t('No se ha podido generar este resultado. Vuelve a intentarlo.')); }
  }
  function toggleFavorite(key: string) {
    store.toggleFavorite('generators', key);
  }
  function openMap() {
    setMapOpened(true);
    setTab('map');
    setQuery('');
  }
  function startMapPlacement(id: string) {
    setPendingMapEntryId(id);
    openMap();
  }
  function placeMapEntry(id: string, location: MapLocation) {
    setSession(current => placeEntryOnMap(current, id, location));
    setPendingMapEntryId(null);
    setNotice(t('Marcador guardado en el mapa.'));
  }
  async function copy(text: string) {
    try { await copyText(text); setNotice(t("Copiado al portapapeles.")); }
    catch { setNotice(t("No se ha podido copiar. Comprueba los permisos del portapapeles.")); }
  }
  function toNotes(entry: Entry) {
    setSession(current => ({ ...current, notes: `${current.notes}${current.notes ? '\n\n' : ''}${entry.title}\n${entry.text}` }));
    setNotice(t("Añadido a las notas de sesión."));
  }
  function goGenerators() { setQuery(''); setTab('generators'); setTimeout(() => searchRef.current?.focus(), 0); }
  const history = session.history.filter(entry => !pinnedOnly || entry.pinned);
  const latest = session.history.find(entry => entry.id === latestId) ?? null;
  const resultGroup = generatorGroups.find(group => group.generators.some(gen => gen.key === latest?.generator));
  const editingMapEntry = session.history.find(entry => entry.id === editingMapEntryId && entry.map);
  const featured = store.favorites.generators.map(generatorByKey).filter((v): v is NonNullable<typeof v> => !!v);
  const referenceCount = gmTableCategories.reduce((n, c) => n + c.tables.length, 0);

  const resultPanel = latest ? <section className="generated-result" aria-live="polite" aria-labelledby="generated-result-heading"
    style={categoryStyle(resultGroup ? stackCategoryColor(resultGroup.key, resultGroup.color) : 'var(--cyan)')}>
    <FileHeading id="generated-result-heading" title={latest.title} closeLabel={t('Ocultar')} onClose={() => setLatestId(null)}/>
    <div className="file-body">
      <p className="result-text">{latest.text}</p>
      <div className="result-actions">
        <button type="button" className="primary-button cyber-action" onClick={() => toNotes(latest)}>{t('A notas')}</button>
        <button type="button" className="primary-button cyber-action" onClick={() => copy(latest.text)}>{t('Copiar')}</button>
        {latest.generator && <button type="button" className="primary-button cyber-action" onClick={() => reroll(latest)}>{t('Regenerar')}</button>}
        {latest.generator === 'contactFull' && <button type="button" className="primary-button cyber-action" onClick={() => {
          setSession(current => ({ ...current, npcs: [...current.npcs, { id: uid(), name: latest.text.split('\n')[0].replace(/^(Nombre|Name): /, ''), role: t('Contacto'), status: 'Vivo', relationship: 'Neutral', notes: latest.text, stats: '' }] }));
          setNotice(t('Contacto añadido al registro de PNJ.'));
        }}>{t('Registrar PNJ')}</button>}
      </div>
    </div>
  </section> : null;

  return <div className={`application edgerunners ${session.reader ? 'reader-mode' : ''}`}>
    <CyberBackground reader={session.reader} />
    <a className="skip-link" href="#workspace">{t("Saltar a las herramientas")}</a>
    <header className="site-header">
      <div className="header-branding">
        <div className="brand"><img src={assetPath('/magnus-laser.png')} alt="Magnus Laser" width="64" height="64" /></div>
        <div className="header-channel"><span className="signal-bars" aria-hidden="true"><i/><i/><i/><i/></span><span>{t("CANAL DEL DM")}<small>NIGHT CITY / 2080</small></span></div>
      </div>
      <SessionBar {...store} />
      <div className="header-right">
        <div className="language-switch" role="group" aria-label={t("Idioma")}>
          <button lang="es" aria-label="Español" aria-pressed={language === 'es'} onClick={() => setLanguage('es')}><strong>ES</strong><small>Español</small></button>
          <i className="language-link" key={language} aria-hidden="true"><span/></i>
          <button lang="en" aria-label="English" aria-pressed={language === 'en'} onClick={() => setLanguage('en')}><strong>EN</strong><small>English</small></button>
        </div>
        <button className="mode-switch" role="switch" aria-checked={session.reader} disabled={!ready} aria-label={t('Modo lectura')} title={session.reader ? t('Activar modo cyberpunk') : t('Activar modo lectura')} onClick={() => setSession(current => ({ ...current, reader: !current.reader }))}>
          <span><strong>{session.reader ? 'FLESH' : 'CHROME'}</strong><small>{t(session.reader ? 'Lectura' : 'Cyberpunk')}</small></span><i aria-hidden="true"/>
        </button>
      </div>
    </header>

    <main className="page-shell">
      <h1 className="sr-only">Magnus Laser · {t('Mesa del DM')}</h1>
      {error && <div role="alert" className="error-banner">{t(error)}{store.dirty && <button className="text-button" onClick={store.retrySave}>{t('Reintentar guardado')}</button>}</div>}

      <div id="workspace" className="workspace">
        <div className="workspace-main">
          <nav className="main-tabs drive-nav" aria-label={t('Secciones de la mesa')}>
            {[
              { key: 'desk', name: t('Mesa del DM'), detail: t('Dirigir la sesión'), count: dmToolCount, icon: SquareTerminal },
              { key: 'generators', name: t('Generadores'), detail: t('Ejecutar generadores'), count: allGenerators.length + 1, icon: CircuitBoard },
              { key: 'reference', name: t('Tablas de referencia'), detail: t('Consultar archivos'), count: referenceCount, icon: Database },
              { key: 'map', name: t('Mapa de Night City'), detail: t('Explorar la ciudad'), count: 'circa 2080', icon: MapPinned },
            ].map((item, index) => <button key={item.key} className={tab === item.key ? 'active' : ''} aria-current={tab === item.key ? 'page' : undefined} onDragEnter={event => { if (ready && item.key === 'map' && Array.from(event.dataTransfer.types).includes(ENTRY_DRAG_TYPE)) openMap(); }} onClick={() => { setTab(item.key); setQuery(''); if (item.key === 'map') setMapOpened(true); }}>
              <span className="drive-icon" aria-hidden="true"><item.icon size={28}/></span>
              <span className="drive-copy"><strong>{item.name}</strong><small>{item.detail}</small></span>
              <span className="drive-number">{String(index + 1).padStart(2, '0')}<small>{item.count}</small></span>
            </button>)}
          </nav>

          <fieldset className="workspace-fieldset" disabled={!ready}>
            {tab === 'desk' && <>
              <div className="section-intro"><div><span className="eyebrow muted">{t("PANEL DE CONTROL")}</span><h2>{t("Listo para lo imprevisible.")}</h2></div></div>
              <OraclePanel history={session.history} log={log}/>
              <section className="quick-generators"><PanelHeading number="02" title={t("Generadores rápidos")} aside={<ToolLink onClick={goGenerators}>{t("Ver todos")}</ToolLink>} /><p className="favorites-scope">{t('Tus favoritos del DM · compartidos entre sesiones')}</p>{featured.length ? <FileStack label={t('Acceso rápido')} color="#00FFFF" index={0} count={featured.length} kind="run">{featured.map((gen, index) => <StackFile key={gen.key} label={gen.label} description={gen.description} index={index} kind="run" favorite onFavorite={() => toggleFavorite(gen.key)} onActivate={() => generate(gen.key)} />)}</FileStack> : <Empty>{t("Activa el chip de favoritos de un generador para tenerlo aquí.")}</Empty>}</section>
              <FavoriteReferences favorites={store.favorites.references} notes={store.referenceNotes} onToggle={store.toggleReferenceNote} onFavorite={key => store.toggleFavorite('references', key)} onBrowse={() => { setTab('reference'); setQuery(''); }}/>
            </>}

            {tab === 'generators' && <>
              {latest && <div className="result-dock">{resultPanel}</div>}
              <GeneratorExplorer folders={generatorGroups.map(group => ({ key: group.key, label: group.label, color: group.color, files: group.generators }))} favorites={store.favorites.generators} query={query} setQuery={setQuery} searchRef={searchRef} onFavorite={toggleFavorite} onGenerate={generate} encounter={<div className="file-body encounter-panel">
                <p className="tool-description">{t('El lugar y la hora cambian lo que te espera en la calle.')}</p>
                <div className="tool-form">
                  <label className="grow">{t('Zona del encuentro')}<CyberSelect value={zone} aria-label={t('Zona del encuentro')} onChange={event => setZone(event.target.value as EncounterZone)}>
                    <option value="corporate">{t('Zona corporativa')}</option><option value="moderate">{t('Zona moderada')}</option><option value="combatZone">{t('Zona de combate')}</option><option value="outskirts">{t('Afueras')}</option>
                  </CyberSelect></label>
                  <label className="grow">{t('Hora del encuentro')}<CyberSelect value={time} aria-label={t('Hora del encuentro')} onChange={event => setTime(event.target.value as EncounterTime)}>
                    <option value="day">{t('Día')}</option><option value="night">{t('Noche')}</option><option value="midnight">{t('Madrugada')}</option>
                  </CyberSelect></label>
                  <button type="button" className="primary-button cyber-action" onClick={() => log(t('Encuentro'), run(() => generateRandomEncounter(zone, time)), 'encuentro')}>{t('Generar')}</button>
                </div>
              </div>} />
            </>}

            {tab === 'desk' && resultPanel}

            {tab === 'desk' && <DMTools session={session} setSession={setSession} log={log} notify={setNotice} copy={copy} />}
            {tab === 'reference' && <ReferenceExplorer query={query} setQuery={setQuery} favorites={store.favorites.references} onFavorite={key => store.toggleFavorite('references', key)} />}
            {mapOpened && <NightCityMap reader={session.reader} hidden={tab !== 'map'} enabled={ready} sessionId={store.activeId} entries={session.history} pendingEntryId={pendingMapEntryId} onPlace={placeMapEntry} onEdit={setEditingMapEntryId} onCancelPlacement={() => setPendingMapEntryId(null)} />}
          </fieldset>
        </div>

        <aside className="session-sidebar" aria-label={t("Registro y notas de la sesión")}><section className="history-panel" tabIndex={0} aria-labelledby="session-log-heading"><div className="history-toolbar"><div className="sidebar-heading"><h2 id="session-log-heading">{t("Registro de sesión")}</h2><span className="count-badge">{session.history.length}</span></div><div className="history-filters"><button className={!pinnedOnly ? 'selected' : ''} onClick={() => setPinnedOnly(false)}>{t("Todo")}</button><button className={pinnedOnly ? 'selected' : ''} onClick={() => setPinnedOnly(true)}>{t("Fijados")}</button></div></div><div className="history-feed">{history.length === 0 ? <div className="history-empty"><span>{t("ESPERANDO SEÑAL")}</span><p>{pinnedOnly ? t("Fija resultados para encontrarlos aquí.") : t("Tus tiradas, encuentros y descubrimientos aparecerán aquí.")}</p><div className="terminal-prompt">{t("> inicia la historia")}<span>_</span></div></div> : history.map(entry => <article className={`history-entry ${entry.pinned ? 'pinned' : ''}`} key={entry.id} draggable={ready} onDragStart={event => {
          if (!ready || (event.target as HTMLElement).closest('button')) { event.preventDefault(); return; }
          event.dataTransfer.setData(ENTRY_DRAG_TYPE, JSON.stringify({ sessionId: store.activeId, entryId: entry.id }));
          event.dataTransfer.setData('text/plain', entry.title);
          event.dataTransfer.effectAllowed = 'copyMove';
        }}><div className="entry-meta"><span>{t(entry.kind).toUpperCase()}</span><time>{new Date(entry.time).toLocaleTimeString(language, { hour: '2-digit', minute: '2-digit' })}</time></div><h3>{entry.title}</h3><p>{entry.text}</p><div className="entry-actions"><button disabled={!ready} title={t(entry.map ? 'Mover marcador en el mapa' : 'Colocar en el mapa')} aria-label={t('Colocar {v0} en el mapa', {v0: entry.title})} className={entry.map ? 'selected map-entry-action' : 'map-entry-action'} onClick={() => startMapPlacement(entry.id)}><MapPinned size={15} /></button><button title={t("Fijar resultado")} aria-label={t("Fijar {v0}", {v0: entry.title})} aria-pressed={entry.pinned} className={entry.pinned ? 'selected' : ''} onClick={() => setSession(current => ({ ...current, history: current.history.map(item => item.id === entry.id ? { ...item, pinned: !item.pinned } : item) }))}><Pin size={13} /></button><button title={t("Copiar")} aria-label={t("Copiar {v0}", {v0: entry.title})} onClick={() => copy(entry.text)}><Copy size={13} /></button><button title={t("Añadir a notas")} aria-label={t("Añadir {v0} a notas", {v0: entry.title})} onClick={() => toNotes(entry)}><FileText size={13} /></button>{entry.generator && <button title={t("Regenerar")} aria-label={t("Regenerar {v0}", {v0: entry.title})} onClick={() => reroll(entry)}><RotateCcw size={13} /></button>}<button className="delete-entry" title={t("Eliminar resultado")} aria-label={t("Eliminar {v0}", {v0: entry.title})} onClick={() => { setSession(current => ({ ...current, history: current.history.filter(item => item.id !== entry.id) })); if (latest?.id === entry.id) setLatestId(null); }}><Trash2 size={13} /></button></div></article>)}</div><div className="history-foot"><i />{t("200 resultados recientes + fijados y marcadores")}</div></section><section className="notes-panel"><div className="sidebar-heading"><h2>{t("Notas de sesión")}</h2><span className="note-dot" /></div><textarea aria-label={t("Notas de sesión")} disabled={!ready} value={session.notes} onChange={event => setSession(current => ({ ...current, notes: event.target.value }))} placeholder={t("Contactos, pistas, deudas pendientes…\n\nLo que pasa en Night City, se queda aquí.")} /><div className="notes-foot"><span>{session.notes.length} {t("caracteres")}</span><span><Check size={12} />{t("Autoguardado")}</span></div></section></aside>
      </div>
    </main>
    {ready && <ReferenceNotesLayer favorites={store.favorites.references} notes={store.referenceNotes} onChange={store.updateReferenceNote} onRaise={store.raiseReferenceNote}/>}
    {editingMapEntry && <MapEntryEditor key={editingMapEntry.id} entry={editingMapEntry} enabled={ready}
      onClose={() => setEditingMapEntryId(null)}
      onSave={result => { setSession(current => replaceEntryResult(current, editingMapEntry.id, result)); setEditingMapEntryId(null); setNotice(t('Entrada y marcador actualizados.')); }}
      onRemove={() => { setSession(current => removeEntryFromMap(current, editingMapEntry.id)); setEditingMapEntryId(null); setNotice(t('Marcador quitado. La entrada sigue en el registro.')); }} />}
    {notice && <div className="toast" role="status"><Check size={16} />{notice}</div>}
  </div>;
}
