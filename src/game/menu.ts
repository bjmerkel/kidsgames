export const MENU_SLOP = 24;

export function menuDragged(startX: number, startY: number, x: number, y: number, slop = MENU_SLOP): boolean {
  return Math.hypot(x - startX, y - startY) > slop;
}

export function bindMenuCard(button: HTMLElement, open: () => void): void {
  let origin: { x: number; y: number; id: number } | null = null;
  let dragged = false;

  const move = (event: PointerEvent) => {
    if (!origin || event.pointerId !== origin.id) return;
    if (menuDragged(origin.x, origin.y, event.clientX, event.clientY)) dragged = true;
  };
  const finish = (event: PointerEvent) => {
    if (!origin || event.pointerId !== origin.id) return;
    if (event.type === "pointercancel") dragged = true;
    origin = null;
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", finish);
    window.removeEventListener("pointercancel", finish);
  };

  button.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    origin = { x: event.clientX, y: event.clientY, id: event.pointerId };
    dragged = false;
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", finish);
    window.addEventListener("pointercancel", finish);
  });
  button.addEventListener("click", (event) => {
    if (dragged) {
      event.preventDefault();
      dragged = false;
      return;
    }
    open();
  });
}
