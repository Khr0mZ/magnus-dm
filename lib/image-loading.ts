export type ImageLoadStatus = 'loading' | 'ready' | 'error';
type LoadableImage = Pick<HTMLImageElement, 'complete' | 'naturalWidth' | 'decode' | 'addEventListener' | 'removeEventListener'>;

// Hydration can happen after an image's load event has already fired.
export function observeImageLoading(image: LoadableImage, onStatus: (status: ImageLoadStatus) => void) {
  let active = true;
  let request = 0;
  const failed = () => { request++; if (active) onStatus('error'); };
  const loaded = async () => {
    const current = ++request;
    try {
      if (typeof image.decode === 'function') await image.decode();
      if (active && current === request) onStatus(image.naturalWidth > 0 ? 'ready' : 'error');
    } catch {
      if (active && current === request) onStatus('error');
    }
  };
  image.addEventListener('load', loaded);
  image.addEventListener('error', failed);
  if (image.complete) {
    if (image.naturalWidth > 0) void loaded();
    else failed();
  }
  return () => {
    active = false;
    request++;
    image.removeEventListener('load', loaded);
    image.removeEventListener('error', failed);
  };
}
