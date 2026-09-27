const map = document.querySelector('#map');
const tileLayer = document.querySelector('#tiles');
const position = document.querySelector('#position');
const loadStatus = document.querySelector('#load-status');
const mapLoader = document.querySelector('#map-loader');
const mapLoadingLabel = document.querySelector('#map-loading-label');
const mapLoadProgress = document.querySelector('#map-load-progress');
const zoomIn = document.querySelector('#zoom-in');
const zoomOut = document.querySelector('#zoom-out');
const markerLayer = document.querySelector('#map-markers');
const placementBanner = document.querySelector('#placement-banner');
const placementInstruction = document.querySelector('#placement-instruction');
const cancelPlacement = document.querySelector('#cancel-placement');
const entryDragType = 'application/x-magnus-session-entry';
const parameters = new URLSearchParams(location.search);
const tileIndex = globalThis.MAGNUS_MAP_TILES;

function tileSource(z, x, y) {
  const level = tileIndex?.levels[z];
  const offset = level && x >= level.xMin && x < level.xMin + level.width && y >= level.yMin && y < level.yMin + level.height
    ? (x - level.xMin) * level.height + y - level.yMin : -1;
  const key = offset >= 0 ? tileIndex.paths[level.tiles[offset]] : undefined;
  return `./reading/${key ?? `${z}/${x}/${y}`}.png`;
}
document.documentElement.dataset.embedded = String(parameters.get('embed') === '1');
let language = parameters.get('lang') === 'en' ? 'en' : 'es';
const messages = {
  es: {
    region: 'Mapa de Night City. Arrastra para desplazarte. Usa las flechas para mover el mapa, más y menos para el zoom, e Inicio para ver todo el mapa.',
    theme: 'Aspecto del mapa', controls: 'Controles del mapa', zoomIn: 'Acercar', zoomOut: 'Alejar', fit: 'Ver todo el mapa',
    back: 'Volver a la mesa', credit: 'Night City Navigator y colaboradores',
    hint: 'Arrastra o usa las flechas · Rueda o pellizco para el zoom · Chrome: cyberpunk · Flesh: mapa original',
    missing: 'Faltan tiles locales en esta vista', loading: 'Cargando mapa local…', ready: 'Mapa local',
    imageLoading: 'Cargando mapa…',
    markers: 'Marcadores de la sesión', edit: 'Editar marcador:', cancel: 'Cancelar',
    place: 'Pulsa un punto del mapa. Flechas para mover; Enter para colocar en el centro.',
    drag: 'Arrastra una entrada del registro al mapa', outside: 'Coloca el marcador dentro de los límites del mapa.',
  },
  en: {
    region: 'Night City map. Drag to pan. Use arrow keys to move, plus and minus to zoom, and Home to fit the map.',
    theme: 'Map appearance', controls: 'Map controls', zoomIn: 'Zoom in', zoomOut: 'Zoom out', fit: 'Fit map',
    back: 'Back to workbench', credit: 'Night City Navigator and contributors',
    hint: 'Drag or use arrow keys · Scroll or pinch to zoom · Chrome: cyberpunk · Flesh: original map',
    missing: 'Local tiles are missing in this view', loading: 'Loading local map…', ready: 'Local map',
    imageLoading: 'Loading map…',
    markers: 'Session markers', edit: 'Edit marker:', cancel: 'Cancel',
    place: 'Choose a point on the map. Arrows to pan; Enter to place at the center.',
    drag: 'Drag a log entry onto the map', outside: 'Place the marker within the map bounds.',
  },
};
const tileSize = 256;
const minZoom = 11;
const maxZoom = 19;
const bounds = { south: -0.1, west: -0.1, north: 0.1, east: 0.1 };
let zoom = 14;
let center = { x: 2 ** zoom * tileSize / 2, y: 2 ** zoom * tileSize / 2 };
let scheduled = false;
let gesture;
let wheelDelta = 0;
const images = new Map();
const pointers = new Map();
const markers = new Map();
let sessionId = null;
let entries = new Map();
let enabled = false;
let pendingEntryId = null;
let suppressClick = false;

function project(latitude, longitude, level = zoom) {
  const scale = 2 ** level * tileSize;
  const radians = latitude * Math.PI / 180;
  return { x: (longitude + 180) / 360 * scale, y: (1 - Math.asinh(Math.tan(radians)) / Math.PI) / 2 * scale };
}

function unproject(point) {
  const scale = 2 ** zoom * tileSize;
  return { latitude: Math.atan(Math.sinh(Math.PI * (1 - 2 * point.y / scale))) * 180 / Math.PI, longitude: point.x / scale * 360 - 180 };
}

function clampCenter() {
  const nw = project(bounds.north, bounds.west);
  const se = project(bounds.south, bounds.east);
  center.x = Math.max(nw.x, Math.min(se.x, center.x));
  center.y = Math.max(nw.y, Math.min(se.y, center.y));
}

function updateStatus() {
  const visible = [...images.values()];
  const missing = visible.filter(image => image.classList.contains('missing')).length;
  const pending = visible.filter(image => image.dataset.loading === 'true').length;
  const text = messages[language];
  map.setAttribute('aria-busy', String(pending > 0));
  mapLoader.hidden = pending === 0;
  mapLoadingLabel.textContent = text.imageLoading;
  mapLoadProgress.max = Math.max(1, visible.length);
  mapLoadProgress.value = visible.length - pending;
  loadStatus.textContent = missing ? text.missing : pending ? text.loading : enabled ? text.drag : text.ready;
}

function sendAction(type, detail = {}) {
  if (enabled && sessionId) window.parent.postMessage({ type, sessionId, ...detail }, location.origin);
}

function cancelPendingPlacement() {
  pendingEntryId = null;
  updatePlacement();
  sendAction('magnus:map-cancel-placement');
}

function updatePlacement() {
  const active = enabled && entries.has(pendingEntryId);
  placementBanner.hidden = !active;
  map.classList.toggle('placing', active);
  placementInstruction.textContent = active ? `${entries.get(pendingEntryId).title} · ${messages[language].place}` : '';
  cancelPlacement.textContent = messages[language].cancel;
}

function validLocation(value) {
  return value && Number.isFinite(value.latitude) && Number.isFinite(value.longitude)
    && value.latitude >= bounds.south && value.latitude <= bounds.north
    && value.longitude >= bounds.west && value.longitude <= bounds.east;
}

function placeEntry(entryId, point) {
  if (!enabled || !entries.has(entryId)) return;
  const location = unproject({ x: center.x + point.x - map.clientWidth / 2, y: center.y + point.y - map.clientHeight / 2 });
  if (!validLocation(location)) { loadStatus.textContent = messages[language].outside; return; }
  sendAction('magnus:map-place-entry', { entryId, location });
}

function drawMarkers() {
  const visible = new Set();
  for (const entry of entries.values()) {
    if (!validLocation(entry.map)) continue;
    visible.add(entry.id);
    let marker = markers.get(entry.id);
    if (!marker) {
      marker = document.createElement('button');
      marker.type = 'button';
      marker.className = 'map-marker';
      marker.draggable = true;
      const label = document.createElement('span');
      marker.append(label);
      marker.addEventListener('click', event => {
        event.stopPropagation();
        if (pendingEntryId) return;
        sendAction('magnus:map-edit-entry', { entryId: entry.id });
      });
      marker.addEventListener('dragstart', event => {
        if (!enabled) { event.preventDefault(); return; }
        event.dataTransfer.setData(entryDragType, JSON.stringify({ sessionId, entryId: entry.id }));
        event.dataTransfer.effectAllowed = 'move';
      });
      markers.set(entry.id, marker);
      markerLayer.append(marker);
    }
    marker.disabled = !enabled;
    marker.firstElementChild.textContent = entry.title;
    marker.setAttribute('aria-label', `${messages[language].edit} ${entry.title}`);
    marker.title = entry.title;
    const point = project(entry.map.latitude, entry.map.longitude);
    marker.style.left = `${point.x - center.x + map.clientWidth / 2}px`;
    marker.style.top = `${point.y - center.y + map.clientHeight / 2}px`;
  }
  for (const [id, marker] of markers) {
    if (!visible.has(id)) { marker.remove(); markers.delete(id); }
  }
}

function setPreferences(preferences) {
  if (preferences.language === 'es' || preferences.language === 'en') language = preferences.language;
  if (preferences.theme === 'chrome' || preferences.theme === 'flesh') document.documentElement.dataset.theme = preferences.theme;
  const text = messages[language];
  document.documentElement.lang = language;
  map.setAttribute('aria-label', text.region);
  zoomIn.setAttribute('aria-label', text.zoomIn);
  zoomOut.setAttribute('aria-label', text.zoomOut);
  document.querySelector('#fit-map').setAttribute('aria-label', text.fit);
  document.querySelector('.theme-switch').setAttribute('aria-label', text.theme);
  document.querySelector('.map-controls').setAttribute('aria-label', text.controls);
  document.querySelector('.back-link').textContent = text.back;
  document.querySelector('.map-attribution a').textContent = text.credit;
  document.querySelector('#map-hint').textContent = text.hint;
  markerLayer.setAttribute('aria-label', text.markers);
  if (typeof preferences.sessionId === 'string' && Array.isArray(preferences.entries)) {
    sessionId = preferences.sessionId;
    enabled = preferences.enabled === true;
    entries = new Map(preferences.entries.filter(entry => entry && typeof entry.id === 'string' && typeof entry.title === 'string').map(entry => [entry.id, entry]));
    const nextPendingId = typeof preferences.pendingEntryId === 'string' && entries.has(preferences.pendingEntryId) ? preferences.pendingEntryId : null;
    const focusMap = nextPendingId && nextPendingId !== pendingEntryId;
    pendingEntryId = nextPendingId;
    if (focusMap) map.focus({ preventScroll: true });
  }
  updatePlacement();
  drawMarkers();
  for (const button of document.querySelectorAll('[data-theme-button]')) {
    button.setAttribute('aria-pressed', String(button.dataset.themeButton === document.documentElement.dataset.theme));
  }
  updateStatus();
}

window.addEventListener('message', event => {
  if (event.origin !== location.origin || event.source !== window.parent || event.data?.type !== 'magnus:map-preferences') return;
  setPreferences(event.data);
});

function draw() {
  scheduled = false;
  clampCenter();
  const width = map.clientWidth;
  const height = map.clientHeight;
  const left = center.x - width / 2;
  const top = center.y - height / 2;
  const nw = project(bounds.north, bounds.west);
  const se = project(bounds.south, bounds.east);
  const xMin = Math.max(Math.floor(nw.x / tileSize), Math.floor(left / tileSize));
  const xMax = Math.min(Math.floor(se.x / tileSize), Math.floor((left + width) / tileSize));
  const yMin = Math.max(Math.floor(nw.y / tileSize), Math.floor(top / tileSize));
  const yMax = Math.min(Math.floor(se.y / tileSize), Math.floor((top + height) / tileSize));
  const visible = new Set();
  for (let x = xMin; x <= xMax; x++) {
    for (let y = yMin; y <= yMax; y++) {
      const key = `${zoom}/${x}/${y}`;
      visible.add(key);
      let image = images.get(key);
      if (!image) {
        image = document.createElement('img');
        image.alt = '';
        image.draggable = false;
        image.width = tileSize;
        image.height = tileSize;
        image.dataset.loading = 'true';
        const failed = () => { image.dataset.loading = 'false'; image.classList.add('missing'); updateStatus(); };
        image.onload = async () => {
          try { if (image.decode) await image.decode(); image.dataset.loading = 'false'; updateStatus(); }
          catch { failed(); }
        };
        image.onerror = failed;
        images.set(key, image);
        image.src = tileSource(zoom, x, y);
        tileLayer.append(image);
      }
      image.style.left = `${Math.round(x * tileSize - left)}px`;
      image.style.top = `${Math.round(y * tileSize - top)}px`;
    }
  }
  for (const [key, image] of images) {
    if (!visible.has(key)) { image.remove(); images.delete(key); }
  }
  const coordinates = unproject(center);
  position.textContent = `ZOOM ${zoom} · ${coordinates.latitude.toFixed(4)}, ${coordinates.longitude.toFixed(4)}`;
  zoomIn.disabled = zoom === maxZoom;
  zoomOut.disabled = zoom === minZoom;
  drawMarkers();
  updateStatus();
}

function scheduleDraw() {
  if (!scheduled) { scheduled = true; requestAnimationFrame(draw); }
}

function changeZoom(next, anchor = { x: map.clientWidth / 2, y: map.clientHeight / 2 }) {
  next = Math.max(minZoom, Math.min(maxZoom, next));
  if (next === zoom) return;
  const scale = 2 ** (next - zoom);
  center = {
    x: (center.x + anchor.x - map.clientWidth / 2) * scale - anchor.x + map.clientWidth / 2,
    y: (center.y + anchor.y - map.clientHeight / 2) * scale - anchor.y + map.clientHeight / 2,
  };
  zoom = next;
  scheduleDraw();
}

function fitMap() {
  const nw = project(bounds.north, bounds.west, minZoom);
  const se = project(bounds.south, bounds.east, minZoom);
  const scale = Math.min((map.clientWidth - 32) / (se.x - nw.x), (map.clientHeight - 32) / (se.y - nw.y));
  zoom = Math.max(minZoom, Math.min(maxZoom, minZoom + Math.floor(Math.log2(scale))));
  center = project(0, 0);
  scheduleDraw();
}

function localPoint(event) {
  const rectangle = map.getBoundingClientRect();
  return { x: event.clientX - rectangle.left, y: event.clientY - rectangle.top };
}

function resetGesture() {
  const points = [...pointers.values()];
  if (!points.length) { gesture = undefined; map.classList.remove('dragging'); return; }
  const midpoint = points.length === 1 ? points[0] : { x: (points[0].x + points[1].x) / 2, y: (points[0].y + points[1].y) / 2 };
  gesture = {
    zoom,
    center: { ...center },
    midpoint,
    distance: points.length === 1 ? 0 : Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y),
  };
}

map.addEventListener('pointerdown', event => {
  if (event.target.closest('button, a') || (event.pointerType === 'mouse' && event.button !== 0)) return;
  map.focus({ preventScroll: true });
  suppressClick = false;
  map.setPointerCapture(event.pointerId);
  pointers.set(event.pointerId, localPoint(event));
  map.classList.add('dragging');
  resetGesture();
});

map.addEventListener('pointermove', event => {
  if (!pointers.has(event.pointerId) || !gesture) return;
  pointers.set(event.pointerId, localPoint(event));
  const points = [...pointers.values()];
  const midpoint = points.length === 1 ? points[0] : { x: (points[0].x + points[1].x) / 2, y: (points[0].y + points[1].y) / 2 };
  if (points.length > 1 || Math.hypot(midpoint.x - gesture.midpoint.x, midpoint.y - gesture.midpoint.y) > 6) suppressClick = true;
  const distance = points.length === 1 ? 0 : Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
  const delta = gesture.distance > 0 && distance > 0 ? Math.round(Math.log2(distance / gesture.distance)) : 0;
  zoom = Math.max(minZoom, Math.min(maxZoom, gesture.zoom + delta));
  const scale = 2 ** (zoom - gesture.zoom);
  center = {
    x: (gesture.center.x + gesture.midpoint.x - map.clientWidth / 2) * scale - midpoint.x + map.clientWidth / 2,
    y: (gesture.center.y + gesture.midpoint.y - map.clientHeight / 2) * scale - midpoint.y + map.clientHeight / 2,
  };
  clampCenter();
  scheduleDraw();
});

for (const eventName of ['pointerup', 'pointercancel', 'lostpointercapture']) {
  map.addEventListener(eventName, event => { pointers.delete(event.pointerId); resetGesture(); });
}

map.addEventListener('wheel', event => {
  event.preventDefault();
  wheelDelta += event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? map.clientHeight : 1);
  if (Math.abs(wheelDelta) >= 60) { changeZoom(zoom + (wheelDelta < 0 ? 1 : -1), localPoint(event)); wheelDelta = 0; }
}, { passive: false });
map.addEventListener('dblclick', event => { if (!event.target.closest('button, a')) changeZoom(zoom + 1, localPoint(event)); });
map.addEventListener('keydown', event => {
  if (event.target !== map) return;
  const movements = { ArrowLeft: [-100, 0], ArrowRight: [100, 0], ArrowUp: [0, -100], ArrowDown: [0, 100] };
  if (pendingEntryId && event.key === 'Escape') { event.preventDefault(); cancelPendingPlacement(); }
  else if (pendingEntryId && event.key === 'Enter') { event.preventDefault(); placeEntry(pendingEntryId, { x: map.clientWidth / 2, y: map.clientHeight / 2 }); }
  else if (movements[event.key]) { event.preventDefault(); center.x += movements[event.key][0]; center.y += movements[event.key][1]; scheduleDraw(); }
  else if (['+', '=', '-', 'Home'].includes(event.key)) {
    event.preventDefault();
    if (event.key === 'Home') fitMap();
    else changeZoom(zoom + (event.key === '-' ? -1 : 1));
  }
});

map.addEventListener('click', event => {
  if (!pendingEntryId || suppressClick || event.target.closest('button, a')) return;
  placeEntry(pendingEntryId, localPoint(event));
});
map.addEventListener('dragover', event => {
  if (!enabled || !Array.from(event.dataTransfer.types).includes(entryDragType)) return;
  event.preventDefault();
  event.dataTransfer.dropEffect = 'move';
  map.classList.add('drop-target');
});
map.addEventListener('dragleave', event => {
  if (!map.contains(event.relatedTarget)) map.classList.remove('drop-target');
});
map.addEventListener('drop', event => {
  map.classList.remove('drop-target');
  if (!Array.from(event.dataTransfer.types).includes(entryDragType)) return;
  event.preventDefault();
  if (!enabled) return;
  try {
    const payload = JSON.parse(event.dataTransfer.getData(entryDragType));
    if (payload.sessionId !== sessionId || typeof payload.entryId !== 'string') return;
    placeEntry(payload.entryId, localPoint(event));
  } catch { /* Ignore foreign or malformed drag payloads. */ }
});
cancelPlacement.addEventListener('click', cancelPendingPlacement);

zoomIn.addEventListener('click', () => changeZoom(zoom + 1));
zoomOut.addEventListener('click', () => changeZoom(zoom - 1));
document.querySelector('#fit-map').addEventListener('click', fitMap);
for (const button of document.querySelectorAll('[data-theme-button]')) {
  button.addEventListener('click', () => {
    setPreferences({ theme: button.dataset.themeButton });
  });
}
setPreferences({ theme: parameters.get('theme'), language });
new ResizeObserver(scheduleDraw).observe(map);
draw();
