'use client';

import { useState } from 'react';

import { architectureText, createArchitecture, floorDV, floorLabels, floorTypes, netDifficulties, netPositions, preparationName, removeFloorBranch, reparentNetFloor, type FloorType, type NetFloor } from '../lib/preparation';
import { uid } from '../lib/engine';
import { useLocale } from './locale';
import CyberSelect from './cyber-select';
import { Empty, RecordPicker, ResultActions } from './ui';
import { usePreparedRecords, type SessionToolProps } from './use-session';

export default function NetArchitectures(props: SessionToolProps) {
  const { t, language } = useLocale();
  const { records, selected: architecture, select, add, edit, remove } = usePreparedRecords(props, 'architectures');
  const [name, setName] = useState('');
  const [count, setCount] = useState(6);
  const [branches, setBranches] = useState(1);
  const [difficulty, setDifficulty] = useState(8);
  const [floorId, selectFloor] = useState('');
  const floor = architecture?.floors.find(item => item.id === floorId) ?? architecture?.floors[0];
  function floorEdit(change: Partial<NetFloor>) { if (floor) edit(current => ({ ...current, floors: current.floors.map(item => item.id === floor.id ? { ...item, ...change } : item) })); }
  function addFloor() {
    if (!architecture || !floor || architecture.floors.length >= 64 || architecture.floors.filter(item => item.parentId === floor.id).length >= 2) return;
    const newFloor: NetFloor = { id: uid(), parentId: floor.id, type: 'empty', name: t('Nuevo piso'), nameKey: 'Nuevo piso', dv: 0, notes: '' };
    edit(current => ({ ...current, floors: [...current.floors, newFloor] })); selectFloor(newFloor.id);
  }
  const floors = architecture?.floors ?? [];
  const { positions, width, height } = netPositions(floors);
  return <div className="prep-tool net-tool">
    <div className="tool-title"><h3>{t('Cada puerta esconde otra capa.')}</h3></div>
    <p className="tool-description">{t('Genera y edita la estructura de la red: pisos, conexiones, DVs y notas. Selecciona un piso en el diagrama para preparar su contenido.')}</p>
    <p className="section-caption">{t('Borrador libre para el GM; la distribución no reproduce las tablas de generación del libro.')}</p>
    <form className="tool-form prep-form" onSubmit={event => { event.preventDefault(); const result = createArchitecture(name, count, branches, difficulty, language); add(result); selectFloor(result.floors[0].id); setName(''); }}>
      <label className="grow">{t('Nombre de la arquitectura')}<input value={name} maxLength={180} onChange={event => setName(event.target.value)} placeholder={t('Seguridad del almacén')}/></label>
      <label>{t('Pisos')}<input type="number" min={3} max={18} required value={count} onChange={event => setCount(Number(event.target.value))}/></label>
      <label>{t('Ramificaciones máximas')}<input type="number" min={0} max={4} required value={branches} onChange={event => setBranches(Number(event.target.value))}/></label>
      <label>{t('DV inicial')}<CyberSelect value={difficulty} onChange={event => setDifficulty(Number(event.target.value))}>{netDifficulties.map(value => <option value={value} key={value}>{value}</option>)}</CyberSelect></label>
      <button className="primary-button cyber-action" type="submit">{t('Generar arquitectura')}</button>
    </form>
    {!architecture ? <Empty>{t('Prepara una red para la próxima incursión.')}</Empty> : <>
      <RecordPicker label={t('Arquitecturas preparadas')} records={records.map(item => ({ id: item.id, name: preparationName(item, language) }))} value={architecture.id} onChange={id => { select(id); selectFloor(''); }} onDelete={remove}/>
      <div className="form-grid"><label>{t('Nombre')}<input value={preparationName(architecture, language)} onChange={event => edit(current => ({ ...current, name: event.target.value, nameKey: null }))}/></label><label>{t('Localización')}<input value={architecture.location} onChange={event => edit(current => ({ ...current, location: event.target.value }))}/></label></div><label>{t('Notas de la arquitectura')}<textarea value={architecture.notes} onChange={event => edit(current => ({ ...current, notes: event.target.value }))}/></label>
      <div className="net-graph-heading"><strong>{preparationName(architecture, language)}</strong><span>{t('{count} pisos', { count: floors.length })}</span></div>
      <div className="net-graph-scroll"><svg className="net-graph" width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="group" aria-label={t('Árbol de arquitectura NET')}>
        {floors.filter(floor => floor.parentId).map(floor => { const point = positions.get(floor.id), parent = positions.get(floor.parentId!); return point && parent ? <path className="net-connection" key={`path-${floor.id}`} d={`M${parent.x} ${parent.y + 36} V${(parent.y + point.y) / 2} H${point.x} V${point.y - 36}`}/> : null; })}
        {floors.map(item => { const point = positions.get(item.id); if (!point) return null; const name = preparationName(item, language); const label = `${t(floorLabels[item.type])}: ${name}${item.dv ? ` · DV ${item.dv}` : ''}`; return <g key={item.id} transform={`translate(${point.x},${point.y})`} className={`net-node ${item.id === floor?.id ? 'is-selected' : ''}`} role="button" tabIndex={0} aria-label={label} aria-pressed={item.id === floor?.id} onClick={() => selectFloor(item.id)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); selectFloor(item.id); } }}>
          <title>{label}</title><polygon points="-96,-36 82,-36 96,-22 96,36 -82,36 -96,22"/><text x={-82} y={-12} className="net-node-kind">{t(floorLabels[item.type])}{item.dv ? ` // DV ${item.dv}` : ''}</text><text x={-82} y={12}>{name.length > 21 ? `${name.slice(0, 20)}…` : name}</text>
        </g>; })}
      </svg></div>
      {floor && <div className="net-floor-editor prep-record">
        <div className="record-heading"><h4>{t('Editar piso')}{' // '}{String(architecture.floors.indexOf(floor) + 1).padStart(2, '0')}</h4></div>
        <div className="tool-form prep-form"><label className="grow">{t('Seleccionar piso')}<CyberSelect value={floor.id} onChange={event => selectFloor(event.target.value)}>{architecture.floors.map((item, index) => <option value={item.id} key={item.id}>{index + 1}. {preparationName(item, language) || t('Sin título')}</option>)}</CyberSelect></label></div>
        <div className="form-grid"><label>{t('Tipo de piso')}<CyberSelect value={floor.type} onChange={event => { const type = event.target.value as FloorType; floorEdit({ type, dv: floorDV(type, architecture.difficulty) }); }}>{floorTypes.map(type => <option key={type} value={type}>{t(floorLabels[type])}</option>)}</CyberSelect></label><label>{t('Nombre / contenido')}<input value={preparationName(floor, language)} onChange={event => floorEdit({ name: event.target.value, nameKey: null })}/></label>
          <label>DV<input type="number" min={0} max={40} value={floor.dv} onChange={event => floorEdit({ dv: Math.max(0, Math.min(40, Math.trunc(Number(event.target.value)))) })}/></label>
          {floor.parentId && <label>{t('Conectado desde')}<CyberSelect value={floor.parentId} onChange={event => edit(current => reparentNetFloor(current, floor.id, event.target.value))}>{architecture.floors.slice(0, architecture.floors.indexOf(floor)).filter(item => item.id === floor.parentId || architecture.floors.filter(child => child.parentId === item.id).length < 2).map(item => <option value={item.id} key={item.id}>{preparationName(item, language) || t('Sin título')}</option>)}</CyberSelect></label>}
        </div>
        <label>{t('Notas del piso')}<textarea value={floor.notes} onChange={event => floorEdit({ notes: event.target.value })} placeholder={t('Defensas, archivos, dispositivos y consecuencias…')}/></label>
        <div className="record-actions"><button className="outline-button cyber-action" disabled={architecture.floors.length >= 64 || architecture.floors.filter(item => item.parentId === floor.id).length >= 2} onClick={addFloor}>{t('Añadir piso conectado')}</button>{floor.parentId && <button className="outline-button cyber-action" onClick={() => { if (window.confirm(t('¿Eliminar este piso y toda su rama?'))) { edit(current => removeFloorBranch(current, floor.id)); selectFloor(''); } }}>{t('Eliminar rama')}</button>}</div>
      </div>}
      <ResultActions {...props} title={preparationName(architecture, language)} kind="net" text={architectureText(architecture, language)}/>
    </>}
  </div>;
}
