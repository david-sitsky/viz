export function makeDraggable(el, handle = el, options = {}) {
  let isDragging = false;
  let startX = 0, startY = 0;
  let startLeft = 0, startTop = 0;

  handle.style.cursor = 'grab';

  const onDown = (e) => {
    // Ignore clicks on buttons/links
    if (e.target.tagName === 'BUTTON' || e.target.tagName === 'A' || e.target.closest('button') || e.target.closest('a')) {
      return;
    }
    isDragging = true;
    handle.style.cursor = 'grabbing';
    
    startX = e.clientX || (e.touches && e.touches[0].clientX);
    startY = e.clientY || (e.touches && e.touches[0].clientY);
    
    const rect = el.getBoundingClientRect();
    startLeft = rect.left;
    startTop = rect.top;
    
    if (options.onDragStart) options.onDragStart();

    el.style.position = 'fixed';
    el.style.left = startLeft + 'px';
    el.style.top = startTop + 'px';
    el.style.right = 'auto';
    el.style.bottom = 'auto';
    el.style.transform = 'none';
    el.style.margin = '0';

    if (e.cancelable) e.preventDefault();
  };

  const onMove = (e) => {
    if (!isDragging) return;
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    
    const dx = clientX - startX;
    const dy = clientY - startY;
    
    el.style.left = (startLeft + dx) + 'px';
    el.style.top = (startTop + dy) + 'px';
  };

  const onUp = () => {
    if (isDragging) {
      isDragging = false;
      handle.style.cursor = 'grab';
    }
  };

  handle.addEventListener('mousedown', onDown);
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onUp);
  
  handle.addEventListener('touchstart', onDown, {passive: false});
  window.addEventListener('touchmove', onMove, {passive: false});
  window.addEventListener('touchend', onUp);
}
