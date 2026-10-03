'use client';

import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { createMarket, marketCategories, marketText, preparationName, type MarketStall, type StockItem } from '../lib/preparation';
import { uid } from '../lib/engine';
import { useLocale } from './locale';
import CyberSelect from './cyber-select';
import { Empty, RecordPicker, ResultActions } from './ui';
import { usePreparedRecords, type SessionToolProps } from './use-session';

export default function NightMarkets(props: SessionToolProps) {
  const { t, language } = useLocale();
  const { records, selected: market, select, add, edit, remove } = usePreparedRecords(props, 'markets');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('mixed');
  const [count, setCount] = useState(3);
  const [limit, setLimit] = useState(1000);
  function stallEdit(id: string, change: (stall: MarketStall) => MarketStall) {
    edit(current => ({ ...current, stalls: current.stalls.map(stall => stall.id === id ? change(stall) : stall) }));
  }
  function itemEdit(stallId: string, itemId: string, change: Partial<StockItem>) {
    stallEdit(stallId, stall => ({ ...stall, items: stall.items.map(item => item.id === itemId ? { ...item, ...change } : item) }));
  }
  return <div className="prep-tool market-tool">
    <div className="tool-title"><h3>{t('Todo tiene un precio.')}</h3></div>
    <p className="tool-description">{t('Genera y edita puestos, vendedores, mercancía y precios para tus encargos. Consulta el mercado preparado desde tu pantalla del narrador.')}</p>
    <p className="section-caption">{t('Borrador libre para el GM; la distribución no reproduce las tablas de generación del libro.')}</p>
    <form className="tool-form prep-form" onSubmit={event => { event.preventDefault(); try { add(createMarket(name, category, count, limit, language)); setName(''); } catch (error) { props.notify(error instanceof Error ? error.message : t('No se ha podido generar.')); } }}>
      <label className="grow">{t('Nombre del mercado')}<input value={name} onChange={event => setName(event.target.value)} placeholder={t('Mercado nocturno de Kabuki')} maxLength={120}/></label>
      <label>{t('Mercancía')}<CyberSelect value={category} onChange={event => setCategory(event.target.value)}><option value="mixed">{t('Variada')}</option>{marketCategories.map(group => <option key={group.key} value={group.key}>{t(group.label)}</option>)}</CyberSelect></label>
      <label>{t('Puestos')}<input type="number" min={1} max={8} required value={count} onChange={event => setCount(Number(event.target.value))}/></label>
      <label>{t('Precio máximo / objeto')}<CyberSelect value={limit} onChange={event => setLimit(Number(event.target.value))}>{[100, 500, 1000, 5000, 10000, 1000000].map(price => <option key={price} value={price}>{price.toLocaleString(language)} eb</option>)}</CyberSelect></label>
      <button className="primary-button cyber-action" type="submit">{t('Generar mercado')}</button>
    </form>
    {!market ? <Empty>{t('Genera tu primer mercado o prepara uno para el próximo encargo.')}</Empty> : <>
      <RecordPicker label={t('Mercados preparados')} records={records.map(item => ({ id: item.id, name: preparationName(item, language) }))} value={market.id} onChange={select} onDelete={remove}/>
      <div className="form-grid"><label>{t('Nombre')}<input value={preparationName(market, language)} maxLength={120} onChange={event => edit(current => ({ ...current, name: event.target.value, nameKey: null }))}/></label><label>{t('Localización')}<input value={market.location} onChange={event => edit(current => ({ ...current, location: event.target.value }))} placeholder={t('Distrito / lugar')}/></label></div>
      <label>{t('Notas del mercado')}<textarea value={market.notes} onChange={event => edit(current => ({ ...current, notes: event.target.value }))}/></label>
      <div className="prep-records">{market.stalls.map(stall => <article className="prep-record" key={stall.id}>
        <div className="record-heading"><h4>{preparationName(stall, language) || t('Puesto sin nombre')}</h4><button className="icon-button" aria-label={t('Eliminar puesto')} onClick={() => { if (window.confirm(t('¿Eliminar este puesto y su mercancía?'))) edit(current => ({ ...current, stalls: current.stalls.filter(item => item.id !== stall.id) })); }}><Trash2 size={16}/></button></div>
        <div className="form-grid"><label>{t('Nombre del puesto')}<input value={preparationName(stall, language)} onChange={event => stallEdit(stall.id, current => ({ ...current, name: event.target.value, nameKey: null, nameNumber: undefined }))}/></label><label>{t('Vendedor')}<input value={stall.vendor} onChange={event => stallEdit(stall.id, current => ({ ...current, vendor: event.target.value }))}/></label></div>
        <div className="table-scroll market-stock"><table><caption className="sr-only">{t('Existencias de {name}', { name: preparationName(stall, language) })}</caption><thead><tr><th>{t('Objeto')}</th><th>{t('Precio (eb)')}</th><th>{t('Existencias')}</th><th>{t('Acciones')}</th></tr></thead><tbody>{stall.items.map(item => <tr key={item.id}>
          <td><input aria-label={t('Nombre del objeto')} value={preparationName(item, language)} onChange={event => itemEdit(stall.id, item.id, { name: event.target.value, nameKey: null })}/><input className="stock-note" aria-label={t('Notas del objeto')} placeholder={t('Detalles / procedencia')} value={item.notes} onChange={event => itemEdit(stall.id, item.id, { notes: event.target.value })}/></td>
          <td><input aria-label={t('Precio de {name}', { name: preparationName(item, language) })} type="number" min={0} max={100000000} value={item.price} onChange={event => itemEdit(stall.id, item.id, { price: Math.max(0, Math.min(100000000, Math.trunc(Number(event.target.value)))) })}/></td>
          <td><input aria-label={t('Existencias de {name}', { name: preparationName(item, language) })} type="number" min={0} max={9999} value={item.stock} onChange={event => itemEdit(stall.id, item.id, { stock: Math.max(0, Math.min(9999, Math.trunc(Number(event.target.value)))) })}/></td>
          <td><button className="icon-button" aria-label={t('Eliminar {name}', { name: preparationName(item, language) })} onClick={() => stallEdit(stall.id, current => ({ ...current, items: current.items.filter(entry => entry.id !== item.id) }))}><Trash2 size={16}/></button></td>
        </tr>)}</tbody></table></div>
        <button className="outline-button cyber-action" onClick={() => stallEdit(stall.id, current => ({ ...current, items: [...current.items, { id: uid(), name: t('Nuevo objeto'), nameKey: 'Nuevo objeto', price: 100, stock: 1, notes: '' }] }))}>{t('Añadir objeto')}</button>
      </article>)}</div>
      <button className="outline-button cyber-action" onClick={() => edit(current => ({ ...current, stalls: [...current.stalls, { id: uid(), name: t('Nuevo puesto'), nameKey: 'Nuevo puesto', vendor: '', category: 'custom', items: [] }] }))}>{t('Añadir puesto')}</button>
      <ResultActions {...props} title={preparationName(market, language)} kind="mercado" text={marketText(market, language)}/>
    </>}
  </div>;
}
