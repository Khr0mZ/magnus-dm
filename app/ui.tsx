import type { ReactNode } from 'react';
import { Box, BriefcaseBusiness, Building2, Crosshair, Dices, Shuffle, UserRound, UsersRound } from 'lucide-react';
export function GenIcon({ name = 'shuffle', size = 22 }: { name?: string; size?: number }) {
  const icons: Record<string, typeof UserRound> = { user: UserRound, users: UsersRound, building: Building2, target: Crosshair, briefcase: BriefcaseBusiness, box: Box, dice: Dices, shuffle: Shuffle };
  const Icon = icons[name] ?? Shuffle;
  return <Icon size={size} strokeWidth={1.5} aria-hidden="true" />;
}
export function PanelHeading({ number, title, aside }: { number: string; title: string; aside?: ReactNode }) {
  return <div className="panel-heading"><h2><span>{number}</span>{title}</h2>{aside}</div>;
}
export function Empty({ children }: { children: ReactNode }) {
  return <div className="empty-state"><span className="empty-cross">+</span><p>{children}</p></div>;
}
export function ToolLink({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return <button className="text-button" onClick={onClick}>{children}</button>;
}
