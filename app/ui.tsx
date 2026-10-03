'use client';

import type { ReactNode, RefObject } from 'react';
import { Trash2, X } from 'lucide-react';
import type { SessionToolProps } from './use-session';
import { useLocale } from './locale';
import CyberSelect from './cyber-select';
export function PanelHeading({ number, title, aside }: { number: string; title: string; aside?: ReactNode }) {
  return <div className="panel-heading"><h2><span>{number}</span>{title}</h2>{aside}</div>;
}
export function Empty({ children }: { children: ReactNode }) {
  return <div className="empty-state"><p>{children}</p></div>;
}
export function ToolLink({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return <button className="text-button" onClick={onClick}>{children}</button>;
}

export function FileHeading({ id, title, onClose, closeLabel, actions, headingRef }: {
  id?: string; title: ReactNode; onClose: () => void; closeLabel: string;
  actions?: ReactNode; headingRef?: RefObject<HTMLHeadingElement | null>;
}) {
  return <div className="document-heading">
    <h4 id={id} ref={headingRef} tabIndex={-1}>{title}</h4>
    {actions}
    <button type="button" className="icon-button" aria-label={closeLabel} onClick={onClose}><X size={19}/></button>
  </div>;
}

export function RecordPicker({ label, records, value, onChange, onDelete }: {
  label: string; records: { id: string; name: string }[]; value: string;
  onChange: (id: string) => void; onDelete: () => void;
}) {
  const { t } = useLocale();
  const name = records.find(record => record.id === value)?.name || t('Sin título');
  return <div className="record-picker tool-form">
    <label className="grow">{label}<CyberSelect value={value} onChange={event => onChange(event.target.value)}>
      {records.map(record => <option value={record.id} key={record.id}>{record.name || t('Sin título')}</option>)}
    </CyberSelect></label>
    <button type="button" className="icon-button" aria-label={t('Eliminar {name}', { name })}
      onClick={() => { if (window.confirm(t('¿Eliminar este registro?'))) onDelete(); }}><Trash2 size={18}/></button>
  </div>;
}

export function ResultActions({ title, text, kind, log, copy }: Pick<SessionToolProps, 'log' | 'copy'> & {
  title: string; text: string; kind: string;
}) {
  const { t } = useLocale();
  return <div className="record-actions">
    <button type="button" className="outline-button cyber-action" onClick={() => copy(text)}>{t('Copiar resultado')}</button>
    <button type="button" className="outline-button cyber-action" onClick={() => log(title, text, kind)}>{t('Añadir al registro')}</button>
  </div>;
}
