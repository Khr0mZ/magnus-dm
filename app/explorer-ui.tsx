'use client';

import type { CSSProperties } from 'react';
import { ChevronRight, Terminal } from 'lucide-react';
import type { CatalogFile } from '../lib/explorer';
import { GenIcon } from './ui';
import { useLocale } from './locale';
import FavoriteMark from './favorite-mark';

export function GeneratorCard({ gen, favorite = false, selected = false, onFavorite, onGenerate, configurable = false }: { gen: CatalogFile; favorite?: boolean; selected?: boolean; onFavorite?: () => void; onGenerate: () => void; configurable?: boolean }) {
  const { t } = useLocale();
  const accent = gen.color ?? ({ user: '#00ffff', briefcase: '#ffff00', users: '#ff00ff', building: '#0099ff', target: '#ff6533', box: '#00ff8b' } as Record<string, string>)[gen.icon ?? 'shuffle'] ?? '#00ffff';
  return <article className={`generator-card system-file ${selected ? 'is-selected' : ''}`} style={{ '--generator-color': accent } as CSSProperties}>
    <button className="file-launch" onClick={onGenerate} title={gen.description} aria-label={`${t(configurable ? 'Configurar' : 'Generar')}: ${gen.label}`}>
      <span className="file-icon"><GenIcon name={gen.icon} size={23} /></span>
      <span className="file-copy"><strong>{gen.label}</strong><span className="file-description">{gen.description}</span><span className="file-command"><Terminal size={13} />{t(configurable ? 'Configurar' : 'Generar')}<ChevronRight size={14} /></span></span>
    </button>
    {onFavorite && <button className="favorite-button file-pin" aria-label={t(favorite ? 'Quitar de favoritos: {name}' : 'Añadir a favoritos: {name}', { name: gen.label })} aria-pressed={favorite} onClick={onFavorite}><FavoriteMark active={favorite}/></button>}
  </article>;
}
