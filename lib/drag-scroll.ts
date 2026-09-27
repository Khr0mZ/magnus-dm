// Mouse dragging supplements native touch/trackpad scrolling. A completed drag
// must never activate the file or favorite underneath the release point.
export function bindDragScroll(node: HTMLElement, onDragStart: () => void = () => {}) {
  let gesture: { id: number; x: number; y: number; left: number; dragging: boolean } | null = null;
  let suppressClick = false;
  function finish() {
    const previous = gesture;
    gesture = null;
    delete node.dataset.dragging;
    if (previous && node.hasPointerCapture(previous.id)) node.releasePointerCapture(previous.id);
  }
  function down(event: PointerEvent) {
    finish();
    suppressClick = false;
    if (event.pointerType !== 'mouse' || event.button !== 0 || node.scrollWidth <= node.clientWidth) return;
    gesture = { id: event.pointerId, x: event.clientX, y: event.clientY, left: node.scrollLeft, dragging: false };
  }
  function move(event: PointerEvent) {
    if (!gesture || event.pointerId !== gesture.id) return;
    if (!(event.buttons & 1)) { finish(); return; }
    const dx = event.clientX - gesture.x;
    if (!gesture.dragging) {
      if (Math.abs(dx) < 8 || Math.abs(dx) < Math.abs(event.clientY - gesture.y)) return;
      gesture.dragging = true;
      suppressClick = true;
      node.dataset.dragging = 'true';
      node.setPointerCapture(event.pointerId);
      onDragStart();
    }
    event.preventDefault();
    node.scrollLeft = gesture.left - dx;
  }
  function up(event: PointerEvent) { if (event.pointerId === gesture?.id) finish(); }
  function click(event: MouseEvent) {
    if (!suppressClick || event.detail === 0) return;
    suppressClick = false;
    event.preventDefault();
    event.stopImmediatePropagation();
  }
  function drag(event: DragEvent) { event.preventDefault(); }
  node.addEventListener('pointerdown', down);
  node.addEventListener('pointermove', move);
  node.addEventListener('pointerup', up);
  node.addEventListener('pointercancel', up);
  node.addEventListener('lostpointercapture', up);
  node.addEventListener('click', click, true);
  node.addEventListener('dragstart', drag);
  node.ownerDocument.defaultView?.addEventListener('blur', finish);
  return () => {
    finish();
    node.removeEventListener('pointerdown', down);
    node.removeEventListener('pointermove', move);
    node.removeEventListener('pointerup', up);
    node.removeEventListener('pointercancel', up);
    node.removeEventListener('lostpointercapture', up);
    node.removeEventListener('click', click, true);
    node.removeEventListener('dragstart', drag);
    node.ownerDocument.defaultView?.removeEventListener('blur', finish);
  };
}
