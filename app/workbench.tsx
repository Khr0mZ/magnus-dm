'use client';
/* Local brand assets are served directly; no image optimization service is required. */
/* eslint-disable @next/next/no-img-element */

import { useEffect, useRef, useState } from 'react';
import { Activity, ArrowDown, ArrowUpRight, BookOpen, Check, ChevronRight, Copy, Crosshair, Dices, FileText, History, LayoutDashboard, Moon, Pin, Radio, RotateCcw, Search, ShieldCheck, Shuffle, Star, Sun, Terminal, Trash2, Zap } from 'lucide-react';
import { allGenerators, die, formatResult, generatorByKey, generatorGroups, normalize, oracleAnswer, probabilities, rollDice, uid } from '../lib/engine';
import { actionFocusTable, adjectivesTable, detailFocusTable, getRandomFromArray } from '../lib/soloPlayTables';
import { generateRandomEncounter, type EncounterTime, type EncounterZone } from '../lib/soloPlayTablesExpanded';
import { appendEntry, type Entry } from '../lib/session';
import { gmTableCategories } from '../lib/reference';
import { referenceLabel } from '../lib/i18n';
import { useSession } from './use-session';
import { Empty, GenIcon, PanelHeading, ToolLink } from './ui';
import DMTools from './dm-tools';

export default function Workbench() {
  const { session, setSession, ready, error } = useSession();
  const [tab, setTab] = useState('desk');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [pinnedOnly, setPinnedOnly] = useState(false);
  const [notice, setNotice] = useState('');
  const [latest, setLatest] = useState<Entry | null>(null);
  const [formula, setFormula] = useState('1d10');
  const [diceError, setDiceError] = useState('');
  const [redCritical, setRedCritical] = useState(false);
  const [question, setQuestion] = useState('');
  const [probability, setProbability] = useState(2);
  const [openQuestion, setOpenQuestion] = useState(false);
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
    setLatest(entry);
  }
  function generate(key: string) {
    const gen = generatorByKey(key);
    if (!gen) return;
    try { log(gen.label, formatResult(gen.generator()), 'generador', key); }
    catch { setNotice('No se ha podido generar este resultado. Vuelve a intentarlo.'); }
  }
  function toggleFavorite(key: string) {
    setSession(current => ({ ...current, favorites: current.favorites.includes(key) ? current.favorites.filter(k => k !== key) : [...current.favorites, key] }));
  }
  async function copy(text: string) {
    try { await navigator.clipboard.writeText(text); setNotice('Copiado al portapapeles.'); }
    catch { setNotice('El navegador ha bloqueado la copia. Puedes seleccionar el texto.'); }
  }
  function toNotes(entry: Entry) {
    setSession(current => ({ ...current, notes: `${current.notes}${current.notes ? '\n\n' : ''}${entry.title}\n${entry.text}` }));
    setNotice('Añadido a las notas de sesión.');
  }
  function roll(expression = formula) {
    try {
      const result = rollDice(expression);
      let extra = 0;
      if (redCritical && /^1?d10(?:\s*[+-]\s*\d+)?$/i.test(expression.trim()) && [1, 10].includes(result.rolls[0])) extra = die(10) * (result.rolls[0] === 1 ? -1 : 1);
      log(expression.toUpperCase(), `${result.total + extra}\nDados: ${result.rolls.join(' · ')}${result.modifier ? ` | Modificador: ${result.modifier > 0 ? '+' : ''}${result.modifier}` : ''}${extra ? ` | Crítico: ${extra > 0 ? '+' : ''}${extra}` : ''}`, 'dados');
      setDiceError('');
    } catch (e) { setDiceError((e as Error).message); }
  }
  function oracle() {
    if (openQuestion) {
      const result = [getRandomFromArray(actionFocusTable()), getRandomFromArray(detailFocusTable()), getRandomFromArray(adjectivesTable())];
      log(question.trim() || 'Inspiración del oráculo', result.join(' / '), 'oráculo');
    } else {
      const value = die(100);
      log(question.trim() || 'Pregunta al oráculo', `${oracleAnswer(probability, value)}\nd100: ${value} · ${probabilities[probability].label}`, 'oráculo');
    }
  }
  function goGenerators() { setTab('generators'); setTimeout(() => searchRef.current?.focus(), 0); }
  const lastDice = session.history.find(entry => entry.kind === 'dados');
  const lastOracle = session.history.find(entry => entry.kind === 'oráculo');
  const filteredGenerators = allGenerators.filter(gen => (category === 'all' || gen.categoryKey === category) && (!favoritesOnly || session.favorites.includes(gen.key)) && normalize(`${gen.label} ${gen.category}`).includes(normalize(query)));
  const history = session.history.filter(entry => !pinnedOnly || entry.pinned);
  const featured = session.favorites.map(generatorByKey).filter((v): v is NonNullable<typeof v> => !!v).slice(0, 6);
  const referenceCount = gmTableCategories.reduce((n, c) => n + c.tables.length, 0);

  return <div className={`application ${session.reader ? 'reader-mode' : ''}`}>
    <a className="skip-link" href="#workspace">Saltar a las herramientas</a>
    <header className="site-header">
      <a className="brand" href="#" aria-label="Magnus Laser, inicio"><img src="/favicon.png" alt="" width="42" height="42" /><span>MAGNUS<span className="brand-laser">LASER</span><small>GAME MASTER TERMINAL</small></span></a>
      <div className="header-divider" />
      <span className="header-edition">DM EDITION <span>01.0</span></span>
      <div className="header-right"><span className="online"><i /> SISTEMA OPERATIVO</span><button className="icon-button theme-button" disabled={!ready} title={session.reader ? 'Modo cyberpunk' : 'Modo lectura'} aria-label={session.reader ? 'Activar modo cyberpunk' : 'Activar modo lectura'} onClick={() => setSession(current => ({ ...current, reader: !current.reader }))}>{session.reader ? <Moon size={18} /> : <Sun size={18} />}</button><div className="avatar">DM</div></div>
    </header>

    <main className="page-shell">
      <section className="hero" aria-labelledby="page-title">
        <div className="hero-copy"><div className="eyebrow"><span className="red-line" /> NIGHT CITY // CANAL PRIVADO</div><h1 id="page-title">TU MESA.<br /><span>TUS REGLAS.</span><span className="cursor-block" /></h1><p>La ciudad pone el caos. Tú cuentas la historia.<br />Todas tus herramientas de DM, en una sola pantalla.</p><a className="hero-link" href="#workspace">CONECTAR CON LA SESIÓN <ArrowDown size={15} /></a></div>
        <div className="hero-art" aria-hidden="true"><div className="hero-coordinate">NC—255.08<br />SECTOR // 07</div><div className="logo-orbit"><img src="/magnus-laser.png" alt="" width="250" height="250" /></div><div className="hero-readout"><span><i /> ENLACE ESTABLE</span><span>MAGNUS OS / DM</span></div><span className="art-corner corner-a">+</span><span className="art-corner corner-b">+</span></div>
        <div className="hero-stats"><div><strong>{allGenerators.length + 1}<span>+</span></strong><small>GENERADORES</small></div><div><strong>{referenceCount}</strong><small>TABLAS DE CONSULTA</small></div><div><strong>01</strong><small>PANTALLA. TODO AQUÍ.</small></div></div>
      </section>

      <div className="session-bar"><div className="session-name"><Radio size={16} /><label htmlFor="session-name">SESIÓN</label><input id="session-name" maxLength={90} value={session.name} disabled={!ready} onChange={event => setSession(current => ({ ...current, name: event.target.value }))} /></div><span className={`save-indicator ${error ? 'save-error' : ''}`}><ShieldCheck size={14} />{error ? 'NO SE HA GUARDADO' : ready ? 'GUARDADO EN ESTE NAVEGADOR' : 'RECUPERANDO SESIÓN…'}</span></div>
      {error && <p role="alert" className="error-banner">{error}</p>}

      <div id="workspace" className="workspace">
        <div className="workspace-main">
          <nav className="main-tabs" aria-label="Secciones de la mesa">
            {[{ key: 'desk', name: 'Mesa del DM', icon: LayoutDashboard }, { key: 'generators', name: 'Generadores', icon: Shuffle }, { key: 'reference', name: 'Tablas de referencia', icon: BookOpen }].map(item => <button key={item.key} className={tab === item.key ? 'active' : ''} aria-current={tab === item.key ? 'page' : undefined} onClick={() => { setTab(item.key); setQuery(''); }}><item.icon size={16} /><span>{item.name}</span>{item.key === 'generators' && <small>{allGenerators.length + 1}</small>}</button>)}
          </nav>

          <fieldset className="workspace-fieldset" disabled={!ready}>
            {tab === 'desk' && <>
              <div className="section-intro"><div><span className="eyebrow muted">PANEL DE CONTROL</span><h2>Listo para lo imprevisible.</h2></div><span className="live-label"><i /> EN DIRECTO</span></div>
              <div className="quick-panels">
                <section className="panel dice-panel"><PanelHeading number="01" title="Lanzador de dados" aside={<Dices size={19} />} /><div className="dice-body"><div className="dice-presets">{[4, 6, 8, 10, 12, 20, 100].map(sides => <button key={sides} className={formula === `1d${sides}` ? 'selected' : ''} onClick={() => { setFormula(`1d${sides}`); roll(`1d${sides}`); }}>d{sides}</button>)}</div><form onSubmit={event => { event.preventDefault(); roll(); }} className="inline-form"><input aria-label="Fórmula de dados" value={formula} maxLength={30} onChange={event => setFormula(event.target.value)} placeholder="2d6+3" required /><button className="primary-button" type="submit"><Dices size={16} />Tirar</button></form><label className="check-label"><input type="checkbox" checked={redCritical} onChange={event => setRedCritical(event.target.checked)} />Críticos de RED en 1d10</label>{diceError && <p role="alert" className="field-error">{diceError}</p>}<div className="dice-output" aria-live="polite"><span className="dice-value">{lastDice ? lastDice.text.split('\n')[0] : '—'}</span><div><span className="mono-label">{lastDice ? lastDice.title : 'ESPERANDO TIRADA'}</span><p>{lastDice ? lastDice.text.split('\n')[1] : 'Deja que los dados decidan.'}</p></div></div></div></section>
                <section className="panel oracle-panel"><PanelHeading number="02" title="Oráculo" aside={<Crosshair size={19} />} /><div className="oracle-body"><div className="segmented"><button className={!openQuestion ? 'selected' : ''} aria-pressed={!openQuestion} onClick={() => setOpenQuestion(false)}>Sí / No</button><button className={openQuestion ? 'selected' : ''} aria-pressed={openQuestion} onClick={() => setOpenQuestion(true)}>Pregunta abierta</button></div><form onSubmit={event => { event.preventDefault(); oracle(); }}><input aria-label="Pregunta al oráculo" placeholder="¿Hay alguien al otro lado de la puerta?" value={question} maxLength={250} onChange={event => setQuestion(event.target.value)} /><div className="oracle-actions">{openQuestion ? <span className="helper">Verbo + sustantivo + adjetivo</span> : <select aria-label="Probabilidad del oráculo" value={probability} onChange={event => setProbability(Number(event.target.value))}>{probabilities.map((p, index) => <option key={p.label} value={index}>{p.label}</option>)}</select>}<button className="secondary-button" type="submit">Consultar <ArrowUpRight size={15} /></button></div></form><div className="oracle-output" aria-live="polite"><span className="mono-label">{lastOracle ? 'EL ORÁCULO RESPONDE' : 'UNA PREGUNTA. UN NUEVO CAMINO.'}</span><strong>{lastOracle ? lastOracle.text.split('\n')[0] : 'El futuro está por escribir.'}</strong>{lastOracle?.text.includes('\n') && <small>{lastOracle.text.split('\n')[1]}</small>}</div></div></section>
              </div>
              <section className="quick-generators"><PanelHeading number="03" title="Generadores rápidos" aside={<ToolLink onClick={goGenerators}>Ver todos</ToolLink>} /><div className="generator-grid">{featured.map(gen => <GeneratorCard key={gen.key} gen={gen} favorite={true} onFavorite={() => toggleFavorite(gen.key)} onGenerate={() => generate(gen.key)} />)}{featured.length === 0 && <Empty>Marca generadores con la estrella para tenerlos aquí.</Empty>}</div></section>
            </>}

            {tab === 'generators' && <section className="generator-catalog"><div className="section-intro"><div><span className="eyebrow muted">MOTOR DE IMPROVISACIÓN</span><h2>Una chispa para cada historia.</h2></div><Shuffle size={24} className="cyan" /></div><div className="filter-row"><div className="search-field"><Search size={17} /><input ref={searchRef} aria-label="Buscar generadores" placeholder="Buscar nombres, lugares, encuentros…" value={query} onChange={event => setQuery(event.target.value)} /></div><button className={`outline-button ${favoritesOnly ? 'selected' : ''}`} aria-pressed={favoritesOnly} onClick={() => setFavoritesOnly(!favoritesOnly)}><Star size={15} />Favoritos</button></div><div className="category-tabs"><button className={category === 'all' ? 'selected' : ''} onClick={() => setCategory('all')}>Todos</button>{generatorGroups.map(group => <button key={group.key} className={category === group.key ? 'selected' : ''} onClick={() => setCategory(group.key)}>{group.label}</button>)}</div><div className="generator-grid">{filteredGenerators.map(gen => <GeneratorCard key={gen.key} gen={gen} favorite={session.favorites.includes(gen.key)} onFavorite={() => toggleFavorite(gen.key)} onGenerate={() => generate(gen.key)} />)}</div>{filteredGenerators.length === 0 && <Empty>No hay generadores con esos filtros.</Empty>}<div className="panel encounter-panel"><PanelHeading number="+" title="Encuentro en Night City" /><p>El lugar y la hora cambian lo que te espera en la calle.</p><div className="inline-form"><select value={zone} aria-label="Zona del encuentro" onChange={event => setZone(event.target.value as EncounterZone)}><option value="corporate">Zona corporativa</option><option value="moderate">Zona moderada</option><option value="combatZone">Zona de combate</option><option value="outskirts">Afueras</option></select><select value={time} aria-label="Hora del encuentro" onChange={event => setTime(event.target.value as EncounterTime)}><option value="day">Día</option><option value="night">Noche</option><option value="midnight">Madrugada</option></select><button className="primary-button" onClick={() => log('Encuentro', generateRandomEncounter(zone, time), 'encuentro')}>Generar <Zap size={16} /></button></div></div></section>}

            {latest && tab !== 'reference' && <section className="generated-result" aria-live="polite"><div className="result-top"><span className="eyebrow"><Activity size={13} /> NUEVA TRANSMISIÓN</span><button className="text-button" onClick={() => setLatest(null)}>Ocultar</button></div><h3>{latest.title}</h3><p>{latest.text}</p><div className="result-actions"><button onClick={() => toNotes(latest)}><FileText size={14} />A notas</button><button onClick={() => copy(latest.text)}><Copy size={14} />Copiar</button>{latest.generator && <button onClick={() => generate(latest.generator!)}><RotateCcw size={14} />Regenerar</button>}{latest.generator === 'contactFull' && <button onClick={() => { setSession(current => ({ ...current, npcs: [...current.npcs, { id: uid(), name: latest.text.split('\n')[0].replace(/^Nombre: /, ''), role: 'Contacto', status: 'Vivo', relationship: 'Neutral', notes: latest.text, stats: '' }] })); setNotice('Contacto añadido al registro de PNJ.'); }}><Check size={14} />Registrar PNJ</button>}</div></section>}

            {tab === 'desk' && <DMTools session={session} setSession={setSession} log={log} notify={setNotice} />}
            {tab === 'reference' && <section className="reference-section"><div className="section-intro"><div><span className="eyebrow muted">ARCHIVO DE CONSULTA</span><h2>Las reglas, a mano.</h2></div><span className="count-label">{referenceCount} TABLAS</span></div><div className="search-field"><Search size={17} /><input aria-label="Buscar tablas de referencia" placeholder="Buscar armas, heridas, dificultad…" value={query} onChange={event => setQuery(event.target.value)} /></div><ReferenceTables query={query} /></section>}
          </fieldset>
        </div>

        <aside className="session-sidebar" aria-label="Registro y notas de la sesión"><section className="history-panel"><div className="sidebar-heading"><h2><History size={17} />Registro de sesión</h2><span className="count-badge">{session.history.length}</span></div><div className="history-filters"><button className={!pinnedOnly ? 'selected' : ''} onClick={() => setPinnedOnly(false)}>Todo</button><button className={pinnedOnly ? 'selected' : ''} onClick={() => setPinnedOnly(true)}><Pin size={12} />Fijados</button><span>EN ESTE NAVEGADOR</span></div><div className="history-feed">{history.length === 0 ? <div className="history-empty"><Terminal size={28} strokeWidth={1} /><span>ESPERANDO SEÑAL</span><p>{pinnedOnly ? 'Fija resultados para encontrarlos aquí.' : 'Tus tiradas, encuentros y descubrimientos aparecerán aquí.'}</p><div className="terminal-prompt">&gt; inicia la historia<span>_</span></div></div> : history.map(entry => <article className={`history-entry ${entry.pinned ? 'pinned' : ''}`} key={entry.id}><div className="entry-meta"><span>{entry.kind.toUpperCase()}</span><time>{new Date(entry.time).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}</time></div><h3>{entry.title}</h3><p>{entry.text}</p><div className="entry-actions"><button title="Fijar resultado" aria-label={`Fijar ${entry.title}`} aria-pressed={entry.pinned} className={entry.pinned ? 'selected' : ''} onClick={() => setSession(current => ({ ...current, history: current.history.map(item => item.id === entry.id ? { ...item, pinned: !item.pinned } : item) }))}><Pin size={13} /></button><button title="Copiar" aria-label={`Copiar ${entry.title}`} onClick={() => copy(entry.text)}><Copy size={13} /></button><button title="Añadir a notas" aria-label={`Añadir ${entry.title} a notas`} onClick={() => toNotes(entry)}><FileText size={13} /></button>{entry.generator && <button title="Regenerar" aria-label={`Regenerar ${entry.title}`} onClick={() => generate(entry.generator!)}><RotateCcw size={13} /></button>}<button className="delete-entry" title="Eliminar resultado" aria-label={`Eliminar ${entry.title}`} onClick={() => { setSession(current => ({ ...current, history: current.history.filter(item => item.id !== entry.id) })); if (latest?.id === entry.id) setLatest(null); }}><Trash2 size={13} /></button></div></article>)}</div><div className="history-foot"><i />200 resultados recientes + todos tus fijados</div></section><section className="notes-panel"><div className="sidebar-heading"><h2><FileText size={17} />Notas de sesión</h2><span className="note-dot" /></div><textarea aria-label="Notas de sesión" disabled={!ready} value={session.notes} onChange={event => setSession(current => ({ ...current, notes: event.target.value }))} placeholder={'Contactos, pistas, deudas pendientes…\n\nLo que pasa en Night City, se queda aquí.'} /><div className="notes-foot"><span>{session.notes.length} caracteres</span><span><Check size={12} />Autoguardado</span></div></section><div className="sidebar-quote"><span>{'// REGLA N.º 01'}</span><p>El estilo por encima<br />de la sustancia.</p><span className="quote-bars" /></div></aside>
      </div>
      <footer className="site-footer"><span><Zap size={13} />MAGNUS LASER <b>/</b> DM TERMINAL</span><span>TU HISTORIA. TU CAOS. TU CIUDAD.</span><span>LOCAL SAVE <i /> v1.0</span></footer>
    </main>
    {notice && <div className="toast" role="status"><Check size={16} />{notice}</div>}
  </div>;
}

function GeneratorCard({ gen, favorite, onFavorite, onGenerate }: { gen: typeof allGenerators[number]; favorite: boolean; onFavorite: () => void; onGenerate: () => void }) {
  return <article className={`generator-card gen-${gen.icon}`}><div className="generator-card-top"><GenIcon name={gen.icon} /><button className="favorite-button" aria-label={`${favorite ? 'Quitar' : 'Añadir'} ${gen.label} ${favorite ? 'de' : 'a'} favoritos`} aria-pressed={favorite} onClick={onFavorite}><Star size={14} fill={favorite ? 'currentColor' : 'none'} /></button></div><button className="generator-trigger" onClick={onGenerate}><h3>{gen.label}</h3><p>{gen.description}</p><span>GENERAR <ArrowUpRight size={14} /></span></button></article>;
}

function ReferenceTables({ query }: { query: string }) {
  const groups = gmTableCategories.map(category => ({ ...category, tables: category.tables.filter(table => normalize([referenceLabel(category.titleKey), referenceLabel(table.titleKey), ...table.rows.flatMap(row => row.cells.map(cell => typeof cell === 'string' && cell.startsWith('t:') ? referenceLabel(cell) : String(cell)))].join(' ')).includes(normalize(query))) })).filter(category => category.tables.length);
  if (!groups.length) return <Empty>No se han encontrado tablas. Prueba con otro término.</Empty>;
  return <div className="reference-groups">{groups.map(category => <section key={category.key}><h3 className="reference-category"><BookOpen size={15} />{referenceLabel(category.titleKey)}<span>{category.tables.length}</span></h3>{category.tables.map(table => <details key={table.key} className="reference-table"><summary>{referenceLabel(table.titleKey)}<ChevronRight size={16} /></summary>{table.descriptionKey && <p>{referenceLabel(table.descriptionKey)}</p>}<div className="table-scroll"><table><thead><tr>{table.columns.map((column, index) => <th key={index} style={{ textAlign: column.align }}>{referenceLabel(column.headerKey)}</th>)}</tr></thead><tbody>{table.rows.map((row, index) => <tr key={index} className={row.highlight ? 'highlight' : ''}>{row.cells.map((cell, cellIndex) => <td key={cellIndex}>{typeof cell === 'string' && cell.startsWith('t:') ? referenceLabel(cell) : cell}</td>)}</tr>)}</tbody></table></div></details>)}</section>)}</div>;
}
