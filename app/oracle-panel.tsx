'use client';

import { useState } from 'react';
import { die, oracleAnswer, probabilities } from '../lib/engine';
import { openOracle, oracleApproaches, oracleSources, type OracleSource } from '../lib/open-oracle';
import type { Entry } from '../lib/session';
import { useLocale } from './locale';
import { PanelHeading } from './ui';
import CyberSelect from './cyber-select';

export default function OraclePanel({ history, log }: { history: Entry[]; log: (title: string, text: string, kind?: string) => void }) {
  const { t, language } = useLocale();
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [probability, setProbability] = useState(2);
  const [approach, setApproach] = useState('situation');
  const [selected, setSelected] = useState<OracleSource[]>(['event', 'complication']);
  const last = history.find(entry => entry.kind === (open ? 'oráculo abierto' : 'oráculo'));
  function ask() {
    if (open) {
      if (!question.trim() || !selected.length) return;
      const answers = openOracle(question, selected, language);
      log(question.trim(), answers.map(answer => `${answer.label}: ${answer.text}`).join('\n\n'), 'oráculo abierto');
    } else {
      const value = die(100);
      log(question.trim() || t('Pregunta al oráculo'), `${oracleAnswer(probability, value, language)}\nd100: ${value} · ${t(probabilities[probability].label)}`, 'oráculo');
    }
  }
  return <section className="panel oracle-panel"><PanelHeading number="01" title={t('Oráculo')}/>
    <div className="oracle-body">
      <div className="segmented oracle-modes"><button type="button" className={!open ? 'selected' : ''} aria-pressed={!open} onClick={() => setOpen(false)}>{t('Sí / No')}</button><button type="button" className={open ? 'selected' : ''} aria-pressed={open} onClick={() => setOpen(true)}>{t('Pregunta abierta')}</button></div>
      <form onSubmit={event => { event.preventDefault(); ask(); }}>
        <label className="sr-only" htmlFor="oracle-question">{t('Pregunta al oráculo')}</label>
        <input id="oracle-question" placeholder={t(open ? '¿Qué está pasando aquí? ¿Quién está detrás?' : '¿Hay alguien al otro lado de la puerta?')} value={question} required={open} maxLength={250} onChange={event => setQuestion(event.target.value)}/>
        {open && <div className="oracle-sources">
          <label className="oracle-approach"><span>{t('Enfoque')}</span><CyberSelect value={approach} aria-label={t('Enfoque de la pregunta')} onChange={event => { setApproach(event.target.value); const preset = oracleApproaches.find(item => item.key === event.target.value); if (preset) setSelected([...preset.sources]); }}>
            {oracleApproaches.map(item => <option key={item.key} value={item.key}>{t(item.label)}</option>)}<option value="custom">{t('Tablas a medida')}</option>
          </CyberSelect></label>
          <fieldset className="oracle-source-picker"><legend>{t('Tablas para esta pregunta')}</legend>{oracleSources.map(source => <label key={source.key}><input type="checkbox" checked={selected.includes(source.key)} onChange={() => { setApproach('custom'); setSelected(current => current.includes(source.key) ? current.filter(key => key !== source.key) : [...current, source.key]); }}/><span>{t(source.label)}</span></label>)}</fieldset>
          <p className="helper">{t('Elige las tablas que encajan con tu pregunta e interpreta sus resultados según la escena.')}</p>
        </div>}
        <div className="oracle-actions">{!open && <CyberSelect value={probability} aria-label={t('Probabilidad del oráculo')} onChange={event => setProbability(Number(event.target.value))}>{probabilities.map((item, index) => <option key={item.label} value={index}>{t(item.label)}</option>)}</CyberSelect>}
          <button className="cyber-action oracle-submit" type="submit" disabled={open && (!question.trim() || !selected.length)}>{t(open ? 'Consultar tablas' : 'Consultar')}</button>
        </div>
      </form>
      <div className="oracle-output" aria-live="polite">{last ? <><span className="mono-label">{last.title}</span><p className={open ? 'oracle-reading' : 'oracle-answer'}>{last.text}</p></> : <p className="helper">{t(open ? 'Formula una pregunta y elige de dónde vendrán las pistas.' : 'El futuro está por escribir.')}</p>}</div>
    </div>
  </section>;
}
