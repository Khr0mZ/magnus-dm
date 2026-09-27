import type { ReactNode } from 'react';
export function PanelHeading({ number, title, aside }: { number: string; title: string; aside?: ReactNode }) {
  return <div className="panel-heading"><h2><span>{number}</span>{title}</h2>{aside}</div>;
}
export function Empty({ children }: { children: ReactNode }) {
  return <div className="empty-state"><span className="empty-cross">+</span><p>{children}</p></div>;
}
export function ToolLink({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return <button className="text-button" onClick={onClick}>{children}</button>;
}
