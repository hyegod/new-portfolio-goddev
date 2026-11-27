"use client";

import { useEffect, useRef } from "react";

type CursorMode = "default" | "pointer" | "orbit" | "hidden";

export function EngineeringCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const isFinePointer = window.matchMedia(
      "(hover: hover) and (pointer: fine)"
    ).matches;
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (!isFinePointer || prefersReduced) return;

    const dot = dotRef.current;
    const ring = ringRef.current;
    const label = labelRef.current;
    if (!dot || !ring || !label) return;

    let mouseX = -100;
    let mouseY = -100;
    let ringX = -100;
    let ringY = -100;
    let visible = false;
    let pressed = false;
    let mode: CursorMode = "default";
    let onDark = false;
    let lastTarget: EventTarget | null = null;
    let prevMode: CursorMode | "" = "";
    let prevDark: boolean | null = null;
    let prevPressed: boolean | null = null;
    let prevVisible: boolean | null = null;
    let rafId = 0;

    const syncStateAttributes = () => {
      const shown = visible && mode !== "hidden";
      if (mode !== prevMode) {
        prevMode = mode;
        dot.dataset.mode = mode;
        ring.dataset.mode = mode;
        label.textContent =
          mode === "orbit"
            ? document.documentElement.dataset.botGrab === "true"
              ? "LIFT"
              : "DRAG"
            : "";
      }
      if (onDark !== prevDark) {
        prevDark = onDark;
        const val = onDark ? "true" : "false";
        dot.dataset.dark = val;
        ring.dataset.dark = val;
      }
      if (pressed !== prevPressed) {
        prevPressed = pressed;
        const val = pressed ? "true" : "false";
        dot.dataset.pressed = val;
        ring.dataset.pressed = val;
      }
      if (shown !== prevVisible) {
        prevVisible = shown;
        const val = shown ? "true" : "false";
        dot.dataset.visible = val;
        ring.dataset.visible = val;
      }
    };

    const tick = () => {
      rafId = 0;
      const dx = mouseX - ringX;
      const dy = mouseY - ringY;
      ringX += dx * 0.2;
      ringY += dy * 0.2;

      ring.style.transform = `translate3d(${ringX}px, ${ringY}px, 0)`;

      if (Math.abs(dx) > 0.15 || Math.abs(dy) > 0.15) {
        rafId = requestAnimationFrame(tick);
      } else {
        ringX = mouseX;
        ringY = mouseY;
        ring.style.transform = `translate3d(${ringX}px, ${ringY}px, 0)`;
      }
    };

    const ensureLoop = () => {
      if (!rafId) {
        rafId = requestAnimationFrame(tick);
      }
    };

    const detectContext = (target: EventTarget | null) => {
      if (target === lastTarget) return;
      lastTarget = target;
      const el = target instanceof Element ? target : null;
      if (!el) {
        mode = "default";
        onDark = false;
        return;
      }

      // Native <dialog> renders in the Top Layer above z-index; yield to native OS pointer cleanly
      if (
        el.closest("dialog[open]") ||
        el.closest("input, textarea, select, [contenteditable='true']")
      ) {
        mode = "hidden";
        return;
      }

      onDark = Boolean(
        el.closest(
          "#contact, .gather-surface-dark, .glass-obsidian, .bg-\\[\\#0D0E12\\], .bg-\\[\\#08090D\\]"
        )
      );

      if (
        document.documentElement.dataset.botGrab === "true" ||
        el.closest("canvas.touch-none")
      ) {
        mode = "orbit";
      } else if (
        document.documentElement.dataset.botHover === "true" ||
        el.closest("a, button, [role='button'], [role='tab'], label[for], .cursor-pointer")
      ) {
        mode = "pointer";
      } else {
        mode = "default";
      }
    };

    const onBotHoverChange = () => {
      lastTarget = null;
      if (visible) {
        if (document.documentElement.dataset.botGrab === "true") {
          mode = "orbit";
          label.textContent = "LIFT";
        } else if (document.documentElement.dataset.botHover === "true") {
          mode = "pointer";
          label.textContent = "";
        } else if (mode === "pointer" || mode === "orbit") {
          mode = "default";
          label.textContent = "";
        }
        syncStateAttributes();
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;

      mouseX = e.clientX;
      mouseY = e.clientY;

      if (!visible) {
        visible = true;
        ringX = mouseX;
        ringY = mouseY;
        ring.style.transform = `translate3d(${ringX}px, ${ringY}px, 0)`;
        document.documentElement.classList.add("has-custom-cursor");
      }

      dot.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0)`;
      detectContext(e.target);
      syncStateAttributes();
      ensureLoop();
    };

    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      pressed = true;
      detectContext(e.target);
      syncStateAttributes();
    };

    const onPointerUp = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      pressed = false;
      detectContext(e.target);
      syncStateAttributes();
    };

    const onWindowLeave = () => {
      visible = false;
      pressed = false;
      syncStateAttributes();
    };

    const onWindowBlur = () => {
      visible = false;
      pressed = false;
      syncStateAttributes();
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerdown", onPointerDown, { passive: true });
    window.addEventListener("pointerup", onPointerUp, { passive: true });
    window.addEventListener("goddev:bot-hover", onBotHoverChange);
    document.addEventListener("mouseleave", onWindowLeave);
    window.addEventListener("blur", onWindowBlur);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      document.documentElement.classList.remove("has-custom-cursor");
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("goddev:bot-hover", onBotHoverChange);
      document.removeEventListener("mouseleave", onWindowLeave);
      window.removeEventListener("blur", onWindowBlur);
    };
  }, []);

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[9999] hidden md:block">
      {/* Trailing Precision CAD Reticle Ring */}
      <div ref={ringRef} className="cad-cursor-ring" data-visible="false" data-mode="default" data-dark="false" data-pressed="false">
        <span className="cad-cursor-tick cad-cursor-tick-n" />
        <span className="cad-cursor-tick cad-cursor-tick-s" />
        <span className="cad-cursor-tick cad-cursor-tick-e" />
        <span className="cad-cursor-tick cad-cursor-tick-w" />
        <span ref={labelRef} className="cad-cursor-label" />
      </div>

      {/* Zero-Lag Inner Cobalt Core Dot */}
      <div ref={dotRef} className="cad-cursor-dot" data-visible="false" data-mode="default" data-dark="false" data-pressed="false" />
    </div>
  );
}
