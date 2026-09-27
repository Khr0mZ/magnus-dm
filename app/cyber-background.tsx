'use client';
/* The native picture loads the same branded artwork with observable events. */
import { memo, useState, useSyncExternalStore } from 'react';
import { useLocale } from './locale';
import ImageLoader from './image-loader';

const mobileQuery = '(max-width: 600px)';
function subscribeMobile(listener: () => void) {
  const query = window.matchMedia(mobileQuery);
  query.addEventListener('change', listener);
  return () => query.removeEventListener('change', listener);
}
const getMobile = () => window.matchMedia(mobileQuery).matches;
const getServerMobile = () => false;

function BackgroundArtwork({ reader }: { reader: boolean }) {
  const { t } = useLocale();
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const desktop = reader ? '/magnus-city-reader-v2.webp' : '/magnus-city.webp';
  const mobile = reader ? '/magnus-city-reader-mobile-v2.webp' : '/magnus-city-mobile.webp';
  async function finishLoading(image: HTMLImageElement) {
    try { await image.decode(); setStatus('ready'); }
    catch { setStatus('error'); }
  }
  return <>
    <div className="cyber-background" aria-hidden="true">
      <picture><source media={mobileQuery} srcSet={mobile} /><img src={desktop} alt="" decoding="async" fetchPriority="high" onLoad={event => { void finishLoading(event.currentTarget); }} onError={() => setStatus('error')} /></picture>
    </div>
    {status !== 'ready' && <div className={`wallpaper-loading ${status === 'error' ? 'image-load-error' : ''}`}><ImageLoader label={t(status === 'error' ? 'No se ha podido cargar el fondo.' : 'Cargando fondo…')} /></div>}
  </>;
}

const CyberBackground = memo(function CyberBackground({ reader }: { reader: boolean }) {
  const mobile = useSyncExternalStore(subscribeMobile, getMobile, getServerMobile);
  return <><BackgroundArtwork key={`${reader}:${mobile}`} reader={reader} /><div className="crt-overlay" aria-hidden="true" /></>;
});
export default CyberBackground;
