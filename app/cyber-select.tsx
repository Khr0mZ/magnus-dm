'use client';

import { Children, isValidElement, useEffect, useId, useRef, useState, type ReactNode, type KeyboardEvent } from 'react';
import { ChevronDown } from 'lucide-react';

type Props = {
  value: string | number; children: ReactNode; onChange: (event: { target: { value: string } }) => void;
  id?: string; disabled?: boolean; className?: string; name?: string; 'aria-label'?: string;
};
export default function CyberSelect({ value, children, onChange, id, disabled, className = '', name, 'aria-label': label }: Props) {
  const generatedId = useId();
  const controlId = id ?? generatedId;
  const menuId = `${controlId}-options`;
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(0);
  const typed = useRef({ text: '', time: 0 });
  const options = Children.toArray(children).filter(isValidElement<{ value: string | number; children: ReactNode; disabled?: boolean }>).map(option => ({ value: String(option.props.value), label: Children.toArray(option.props.children).join(''), disabled: !!option.props.disabled }));
  const selected = options.findIndex(option => option.value === String(value));
  const enabled = options.map((option, index) => option.disabled ? -1 : index).filter(index => index >= 0);

  useEffect(() => {
    if (!open) return;
    function dismiss(event: Event) {
      if (event.type === 'scroll' && event.target instanceof Node && menu.current?.contains(event.target)) return;
      menu.current?.hidePopover();
      setOpen(false);
    }
    window.addEventListener('resize', dismiss);
    window.addEventListener('scroll', dismiss, true);
    return () => { window.removeEventListener('resize', dismiss); window.removeEventListener('scroll', dismiss, true); };
  }, [open]);

  function close() { menu.current?.hidePopover(); setOpen(false); }
  function reveal(index = selected >= 0 ? selected : enabled[0]) {
    if (!trigger.current || !menu.current || trigger.current.matches(':disabled') || !enabled.length) return;
    const rect = trigger.current.getBoundingClientRect();
    const width = Math.min(window.innerWidth - 24, Math.max(rect.width, 220));
    const below = window.innerHeight - rect.bottom - 16;
    const above = rect.top - 16;
    const height = Math.min(320, options.length * 44 + 16);
    const upwards = below < height && above > below;
    Object.assign(menu.current.style, {
      width: `${width}px`, left: `${Math.max(12, Math.min(rect.left, window.innerWidth - width - 12))}px`,
      top: upwards ? 'auto' : `${rect.bottom + 6}px`, bottom: upwards ? `${window.innerHeight - rect.top + 6}px` : 'auto',
      maxHeight: `${Math.max(44, Math.min(320, upwards ? above : below))}px`,
    });
    setCursor(index);
    setOpen(true);
    menu.current.showPopover();
    requestAnimationFrame(() => document.getElementById(`${menuId}-${index}`)?.scrollIntoView({ block: 'nearest' }));
  }
  function choose(index: number) {
    const option = options[index];
    if (!option || option.disabled || trigger.current?.matches(':disabled')) return;
    close();
    trigger.current?.focus({ preventScroll: true });
    onChange({ target: { value: option.value } });
  }
  function keydown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.ctrlKey || event.metaKey) return;
    if (event.key === 'Tab') { if (open) close(); return; }
    if (event.key === 'Escape') { if (open) { event.preventDefault(); event.stopPropagation(); close(); } return; }
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); if (open) choose(cursor); else reveal(); return; }
    if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      event.preventDefault();
      const position = enabled.indexOf(open ? cursor : selected);
      const next = event.key === 'Home' ? enabled[0] : event.key === 'End' ? enabled.at(-1)! : enabled[(position + (event.key === 'ArrowDown' ? 1 : -1) + enabled.length) % enabled.length];
      if (next !== undefined) reveal(next);
      return;
    }
    if (event.key.length === 1 && !event.altKey) {
      event.preventDefault();
      const now = Date.now();
      typed.current = { text: (now - typed.current.time < 700 ? typed.current.text : '') + event.key.toLocaleLowerCase(), time: now };
      const next = options.findIndex(option => !option.disabled && option.label.toLocaleLowerCase().startsWith(typed.current.text));
      if (next >= 0) { if (open) reveal(next); else choose(next); }
    }
  }
  return <span className={`cyber-select ${className}`}>
    {name && <input type="hidden" name={name} value={value}/>}
    <button ref={trigger} id={controlId} type="button" className="cyber-select-trigger" role="combobox" aria-label={label} aria-haspopup="listbox" aria-expanded={open} aria-controls={menuId} aria-activedescendant={open ? `${menuId}-${cursor}` : undefined} disabled={disabled} onClick={() => open ? close() : reveal()} onKeyDown={keydown}>
      <span>{options[selected]?.label ?? '\u2014'}</span><ChevronDown size={16} aria-hidden="true"/>
    </button>
    <span ref={menu} id={menuId} className="cyber-select-menu" popover="auto" role="listbox" aria-label={label} aria-labelledby={label ? undefined : controlId} onToggle={event => setOpen(event.newState === 'open')}>
      {options.map((option, index) => <span id={`${menuId}-${index}`} key={option.value} role="option" aria-selected={index === selected} aria-disabled={option.disabled || undefined} className={`cyber-select-option ${index === cursor ? 'is-cursor' : ''}`} onPointerMove={() => { if (!option.disabled) setCursor(index); }} onPointerDown={event => event.preventDefault()} onClick={event => { event.preventDefault(); event.stopPropagation(); choose(index); }}>{option.label}</span>)}
    </span>
  </span>;
}
