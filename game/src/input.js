// MERIDIAN — keyboard and mouse. Tracks held keys, edge-triggered presses,
// and the mouse position in canvas pixels. One job: input, nothing else.

export function createInput(canvas) {
  const keys = new Set();
  const pressed = new Set();
  const mouse = { x: 0, y: 0, clicked: false, clickX: 0, clickY: 0 };

  function onKeyDown(e) {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
      e.preventDefault();
    }
    if (!keys.has(e.code)) pressed.add(e.code);
    keys.add(e.code);
  }
  function onKeyUp(e) {
    keys.delete(e.code);
  }
  function onMouseMove(e) {
    const rect = canvas.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) * canvas.width) / rect.width;
    mouse.y = ((e.clientY - rect.top) * canvas.height) / rect.height;
  }
  function onClick(e) {
    onMouseMove(e);
    mouse.clicked = true;
    mouse.clickX = mouse.x;
    mouse.clickY = mouse.y;
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('click', onClick);

  return {
    isDown(code) {
      return keys.has(code);
    },
    // True once per physical press; consumed after the frame reads it.
    wasPressed(code) {
      return pressed.has(code);
    },
    endFrame() {
      pressed.clear();
      mouse.clicked = false;
    },
    mouse,
  };
}
