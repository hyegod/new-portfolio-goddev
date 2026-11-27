export interface StirInput {
  active: boolean;
  from: [number, number];
  to: [number, number];
  velocity: [number, number];
  consumeStep(): void;
  dispose(): void;
}

export function installStirInput(
  canvas: HTMLCanvasElement,
  ambient = false
): StirInput {
  let activePointer: number | undefined;
  let from: [number, number] = [0.5, 0.5];
  let to: [number, number] = [0.5, 0.5];
  let velocity: [number, number] = [0, 0];
  let lastTime = 0;
  let decay = 0;
  const previousTouchAction = canvas.style.touchAction;
  if (!ambient) {
    canvas.style.touchAction = "none";
  }

  const point = (event: PointerEvent): [number, number] => {
    const r = canvas.getBoundingClientRect();
    const w = Math.max(1, r.width);
    const h = Math.max(1, r.height);
    const sx = Math.max(0, Math.min(1, (event.clientX - r.left) / w));
    const sy = Math.max(0, Math.min(1, 1 - (event.clientY - r.top) / h));
    // Match display.wgsl cover projection onto the 1:1 square fluid grid
    const viewAspect = w / h;
    const scaleX = viewAspect < 1 ? viewAspect : 1;
    const scaleY = viewAspect > 1 ? 1 / viewAspect : 1;
    return [
      0.5 + (sx - 0.5) * scaleX,
      0.5 + (sy - 0.5) * scaleY,
    ];
  };

  const isInside = (event: PointerEvent) => {
    const r = canvas.getBoundingClientRect();
    return (
      r.width > 0 &&
      r.height > 0 &&
      event.clientX >= r.left &&
      event.clientX <= r.right &&
      event.clientY >= r.top &&
      event.clientY <= r.bottom
    );
  };

  const down = (event: PointerEvent) => {
    if (!event.isPrimary) return;
    if (ambient) {
      if (!isInside(event)) return;
      from = to = point(event);
      lastTime = event.timeStamp;
      velocity = [0.55, 0.35];
      decay = 4;
      return;
    }
    if (activePointer !== undefined) return;
    canvas.setPointerCapture(event.pointerId);
    activePointer = event.pointerId;
    from = to = point(event);
    lastTime = event.timeStamp;
    velocity = [0, 0];
    decay = 2;
  };

  const move = (event: PointerEvent) => {
    if (!event.isPrimary) return;
    if (ambient && !isInside(event)) {
      lastTime = 0;
      return;
    }
    const next = point(event);
    if (lastTime === 0) {
      from = to = next;
      lastTime = event.timeStamp;
      return;
    }
    const dt = Math.max(
      0.004,
      Math.min(0.05, (event.timeStamp - lastTime) / 1000)
    );
    from = to;
    to = next;
    velocity = [
      Math.max(-2.5, Math.min(2.5, (to[0] - from[0]) / dt)),
      Math.max(-2.5, Math.min(2.5, (to[1] - from[1]) / dt)),
    ];
    lastTime = event.timeStamp;
    decay = 2;
  };

  const up = (event: PointerEvent) => {
    if (!event.isPrimary || event.pointerId !== activePointer) return;
    if (canvas.hasPointerCapture?.(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }
    activePointer = undefined;
    decay = 2;
  };

  const leave = () => {
    if (activePointer === undefined) {
      lastTime = 0;
      decay = 0;
    }
  };

  if (ambient) {
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerdown", down, { passive: true });
  } else {
    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", up);
    canvas.addEventListener("pointerleave", leave);
  }

  return {
    get active() {
      return activePointer !== undefined || decay > 0;
    },
    get from() {
      return from;
    },
    get to() {
      return to;
    },
    get velocity() {
      return velocity;
    },
    consumeStep() {
      from = to;
      if (activePointer === undefined && decay > 0) {
        velocity = [velocity[0] * 0.45, velocity[1] * 0.45];
        decay--;
      }
    },
    dispose() {
      if (ambient) {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerdown", down);
      } else {
        canvas.removeEventListener("pointerdown", down);
        canvas.removeEventListener("pointermove", move);
        canvas.removeEventListener("pointerup", up);
        canvas.removeEventListener("pointercancel", up);
        canvas.removeEventListener("pointerleave", leave);
        if (
          activePointer !== undefined &&
          canvas.hasPointerCapture?.(activePointer)
        ) {
          canvas.releasePointerCapture(activePointer);
        }
        canvas.style.touchAction = previousTouchAction;
      }
      activePointer = undefined;
    },
  };
}
