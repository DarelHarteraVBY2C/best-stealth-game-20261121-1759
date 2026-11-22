// Silent Shadow — the keyboard.
// WASD or arrows move, Shift sneaks, Space or Enter confirms, P pauses,
// R restarts the level, M mutes. Movement reads every frame; the one-shot
// actions (confirm, pause, restart, mute) are taken once and cleared.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_RESTART = 4;
export const ACTION_MUTE = 8;

const MOVE_KEYS = {
  KeyW: [0, -1], ArrowUp: [0, -1],
  KeyS: [0, 1], ArrowDown: [0, 1],
  KeyA: [-1, 0], ArrowLeft: [-1, 0],
  KeyD: [1, 0], ArrowRight: [1, 0],
};

export function createInput(target) {
  const held = new Set();
  let actions = 0;
  let sneaking = false;

  function onKeyDown(event) {
    if (MOVE_KEYS[event.code]) {
      held.add(event.code);
      event.preventDefault();
      return;
    }
    if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') {
      sneaking = true;
      return;
    }
    if (event.code === 'Space' || event.code === 'Enter') {
      actions |= ACTION_CONFIRM;
      event.preventDefault();
    } else if (event.code === 'KeyP' || event.code === 'Escape') {
      actions |= ACTION_PAUSE;
    } else if (event.code === 'KeyR') {
      actions |= ACTION_RESTART;
    } else if (event.code === 'KeyM') {
      actions |= ACTION_MUTE;
    }
  }

  function onKeyUp(event) {
    if (MOVE_KEYS[event.code]) held.delete(event.code);
    if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') sneaking = false;
  }

  function onBlur() {
    held.clear();
    sneaking = false;
  }

  target.addEventListener('keydown', onKeyDown);
  target.addEventListener('keyup', onKeyUp);
  target.addEventListener('blur', onBlur);

  return {
    /** Normalised movement direction for this frame. */
    direction() {
      let x = 0;
      let y = 0;
      for (const code of held) {
        const [dx, dy] = MOVE_KEYS[code];
        x += dx;
        y += dy;
      }
      const len = Math.hypot(x, y);
      if (len === 0) return { x: 0, y: 0 };
      return { x: x / len, y: y / len };
    },
    isSneaking() {
      return sneaking;
    },
    /** The one-shot actions since the last call, then cleared. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}
