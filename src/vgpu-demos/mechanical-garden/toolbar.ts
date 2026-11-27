// The tool bar: four exclusive tools, a hint for the active one and its brush controls. Plain DOM
// that the renderer creates inside the example root and removes on dispose; lil-gui keeps only the
// advanced and debug settings.

import { TOOLS, type Tool } from "./input";
import { BRUSH_RADIUS, BRUSH_STRENGTH } from "./terrain";

export const TOOL_LABELS: Readonly<Record<Tool, string>> = {
  orbit: "Orbit",
  elevate: "Elevate",
  lower: "Lower",
  destination: "Destination",
};

/** One short line per tool: [mouse and keyboard, touch]. */
export const TOOL_HINTS: Readonly<Record<Tool, readonly [string, string]>> = {
  orbit: ["Drag to orbit · right-drag or Shift-drag to pan · scroll to zoom", "Drag to orbit · pinch to zoom"],
  elevate: ["Drag over the ground to raise it · scroll to zoom", "Drag over the ground to raise it · pinch to zoom"],
  lower: ["Drag over the ground to lower it · scroll to zoom", "Drag over the ground to lower it · pinch to zoom"],
  destination: ["Click the ground to send the dogs there · drag to aim first", "Tap the ground to send the dogs there"],
};

/**
 * Below this width the bar docks to the bottom edge with stacked, thumb-sized buttons and the
 * Settings panel starts closed; above it the bar and the open panel share the top edge without
 * overlapping (the wide bar is capped at the width the panel leaves free).
 */
export const COMPACT_WIDTH = 720;

/** Shown under the hint while paused in a sculpt tool, where the ground only changes on simulation steps: [keyboard, touch]. */
export const PAUSED_HINT: readonly [string, string] = [
  "Paused · press . on the canvas to step, or resume in Settings",
  "Paused · step once or resume in Settings",
];

const ICONS: Readonly<Record<Tool, string>> = {
  orbit: '<ellipse cx="9" cy="10" rx="7" ry="3.2"/><path d="M13.6 5.2 16 6.8l-2.6 1"/><circle cx="9" cy="10" r="1.3" fill="currentColor" stroke="none"/>',
  elevate: '<path d="M1.5 15c3 0 4.2-4.6 7.5-4.6s4.5 4.6 7.5 4.6"/><path d="M9 7.6V1.8M6.5 4.2 9 1.8l2.5 2.4"/>',
  lower: '<path d="M1.5 10.4c3 0 4.2 4.6 7.5 4.6s4.5-4.6 7.5-4.6"/><path d="M9 1.8v5.8M6.5 5.2 9 7.6l2.5-2.4"/>',
  destination: '<path d="M9 16.4s5.2-5 5.2-9a5.2 5.2 0 0 0-10.4 0c0 4 5.2 9 5.2 9Z"/><circle cx="9" cy="7.3" r="1.9"/>',
};

const ACCENT = "#0038FF";
const STYLE = `
.mg-toolbar{position:absolute;left:12px;top:12px;z-index:10;display:flex;flex-direction:column;align-items:flex-start;gap:6px;max-width:calc(100% - 24px);font:600 10px/1.35 var(--font-jetbrains-mono),ui-monospace,monospace;letter-spacing:0.12em;text-transform:uppercase;color:#0D0E12;pointer-events:none;user-select:none;-webkit-user-select:none}
.mg-panel{pointer-events:auto;background:linear-gradient(180deg,rgba(255,255,255,.86),rgba(236,239,244,.72));border:1px solid rgba(13,14,18,.13);border-radius:12px;box-shadow:inset 0 1px 0 rgba(255,255,255,.94),0 12px 28px -10px rgba(13,14,18,.16);backdrop-filter:blur(16px) saturate(160%);-webkit-backdrop-filter:blur(16px) saturate(160%)}
.mg-tools{display:flex;gap:3px;padding:3px}
.mg-tool{display:flex;align-items:center;gap:6px;height:30px;padding:0 10px;border:1px solid transparent;border-radius:8px;background:transparent;color:#363B47;font:inherit;letter-spacing:inherit;text-transform:inherit;cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent;transition:background .15s,color .15s,border-color .15s}
.mg-tool:hover{background:rgba(0,56,255,.08);color:${ACCENT}}
.mg-tool[aria-pressed="true"]{background:${ACCENT};border-color:${ACCENT};color:#ffffff;font-weight:700;box-shadow:0 4px 12px -4px rgba(0,56,255,.45)}
.mg-tool:focus-visible,.mg-clear:focus-visible{outline:2px solid ${ACCENT};outline-offset:2px}
.mg-tool svg{display:block;width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}
.mg-tool kbd{font:600 9px/1 var(--font-jetbrains-mono),ui-monospace,monospace;padding:2px 5px;border-radius:4px;background:rgba(13,14,18,.07);color:#505562}
.mg-tool[aria-pressed="true"] kbd{background:rgba(255,255,255,.22);color:#ffffff}
.mg-detail{display:flex;flex-direction:column;gap:6px;padding:7px 11px}
.mg-hint{margin:0;color:#505562;font-weight:500;font-size:9.5px;letter-spacing:0.1em}
.mg-paused{margin:0;color:${ACCENT}}
.mg-paused[hidden]{display:none}
.mg-brush{display:flex;flex-wrap:wrap;gap:6px 14px}
.mg-brush[hidden],.mg-clear[hidden]{display:none}
.mg-brush label{display:flex;align-items:center;gap:7px;color:#363B47;font-size:9.5px}
.mg-brush span{flex:none}
.mg-brush input{width:96px;margin:0;accent-color:${ACCENT};touch-action:pan-x}
.mg-brush output{min-width:2.4em;color:#0038FF;font-weight:700;font-variant-numeric:tabular-nums}
.mg-clear{align-self:flex-start;height:26px;padding:0 10px;border:1px solid rgba(13,14,18,.18);border-radius:7px;background:rgba(255,255,255,.72);color:#0D0E12;font:inherit;letter-spacing:inherit;text-transform:inherit;cursor:pointer;transition:background .15s,color .15s,border-color .15s}
.mg-clear:hover:not(:disabled){border-color:${ACCENT};background:${ACCENT};color:#ffffff}
.mg-clear:disabled{opacity:.42;cursor:default}
.mg-toolbar[data-layout="compact"]{left:8px;right:8px;top:auto;bottom:8px;max-width:none;align-items:stretch;flex-direction:column-reverse}
.mg-toolbar[data-layout="compact"] .mg-tool{flex:1 1 0;flex-direction:column;justify-content:center;gap:3px;height:48px;padding:4px 2px;font-size:9px;letter-spacing:0.08em}
.mg-toolbar[data-layout="compact"] .mg-tool kbd{display:none}
.mg-toolbar[data-layout="compact"] .mg-brush input{flex:1 1 auto;width:auto;min-width:56px}
.mg-toolbar[data-layout="compact"] .mg-brush label{flex:1 1 130px}
.mg-toolbar[data-pointer="coarse"] .mg-tool{min-height:44px;min-width:44px}
.mg-toolbar[data-pointer="coarse"] .mg-tool kbd{display:none}
.mg-toolbar[data-pointer="coarse"] .mg-brush input{height:32px}
.mg-toolbar[data-pointer="coarse"] .mg-clear{height:38px;padding:0 14px}
.mg-toolbar[data-pointer="coarse"][data-layout="wide"] .mg-tool{height:40px;padding:0 12px}
`;

export interface ToolbarOptions {
  readonly tool: Tool;
  readonly radius: number;
  readonly strength: number;
  /** A coarse pointer: touch hints (tap, pinch) and 44 px targets at every width. */
  readonly touch: boolean;
  /** Inserted before this child of the container (the Settings panel, so the tools come first in tab order). */
  readonly before?: Element | null;
  onTool(tool: Tool): void;
  onRadius(radius: number): void;
  onStrength(strength: number): void;
  onClearDestination(): void;
  /** The docked bar's height in px whenever it changes (null in the wide layout), so Settings can stop above it. */
  onDock?(height: number | null): void;
}

export interface Toolbar {
  readonly element: HTMLElement;
  /** The brush sliders are hovered or focused (the renderer shows the brush while they change). */
  readonly adjusting: boolean;
  setTool(tool: Tool): void;
  setDestination(active: boolean): void;
  setPaused(paused: boolean): void;
  layout(width: number): void;
  dispose(): void;
}

export function createToolbar(container: HTMLElement, options: ToolbarOptions): Toolbar {
  const document = container.ownerDocument;
  const removers: (() => void)[] = [];
  const listen = (target: EventTarget, type: string, listener: EventListener) => {
    target.addEventListener(type, listener);
    removers.push(() => target.removeEventListener(type, listener));
  };
  const element = <K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, parent?: HTMLElement) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    parent?.append(node);
    return node;
  };

  const root = element("div", "mg-toolbar");
  root.dataset.layout = "wide";
  root.dataset.pointer = options.touch ? "coarse" : "fine";
  element("style", undefined, root).textContent = STYLE;

  const tools = element("div", "mg-panel mg-tools", root);
  tools.setAttribute("role", "group");
  tools.setAttribute("aria-label", "Tools");
  const buttons = new Map<Tool, HTMLButtonElement>();
  TOOLS.forEach((tool, index) => {
    const button = element("button", "mg-tool", tools);
    button.type = "button";
    button.dataset.tool = tool;
    button.setAttribute("aria-label", TOOL_LABELS[tool]);
    button.setAttribute("aria-keyshortcuts", `${index + 1}`);
    button.title = `${TOOL_LABELS[tool]} (${index + 1})`;
    // Static markup: the icon paths are constants above.
    element("span", undefined, button).innerHTML = `<svg viewBox="0 0 18 18" aria-hidden="true">${ICONS[tool]}</svg>`;
    element("span", undefined, button).textContent = TOOL_LABELS[tool];
    const key = element("kbd", undefined, button);
    key.textContent = `${index + 1}`;
    key.setAttribute("aria-hidden", "true");
    listen(button, "click", () => options.onTool(tool));
    buttons.set(tool, button);
  });

  const detail = element("div", "mg-panel mg-detail", root);
  const hint = element("p", "mg-hint", detail);
  hint.setAttribute("aria-live", "polite");
  const pausedNote = element("p", "mg-paused", detail);
  pausedNote.textContent = PAUSED_HINT[options.touch ? 1 : 0];
  pausedNote.setAttribute("aria-live", "polite");
  const brush = element("div", "mg-brush", detail);
  const slider = (label: string, range: { min: number; max: number }, value: number, change: (value: number) => void) => {
    const wrapper = element("label", undefined, brush);
    element("span", undefined, wrapper).textContent = label;
    const input = element("input", undefined, wrapper);
    input.type = "range";
    input.min = `${range.min}`;
    input.max = `${range.max}`;
    input.step = "0.05";
    input.value = `${value}`;
    const readout = element("output", undefined, wrapper);
    readout.textContent = value.toFixed(2);
    listen(input, "input", () => {
      const next = Number(input.value);
      readout.textContent = next.toFixed(2);
      change(next);
    });
  };
  slider("Radius", BRUSH_RADIUS, options.radius, options.onRadius);
  slider("Strength", BRUSH_STRENGTH, options.strength, options.onStrength);
  const clear = element("button", "mg-clear", detail);
  clear.type = "button";
  clear.textContent = "Clear destination";
  clear.disabled = true;
  listen(clear, "click", () => options.onClearDestination());

  let hovered = false;
  let focused = false;
  listen(brush, "pointerenter", () => (hovered = true));
  listen(brush, "pointerleave", () => (hovered = false));
  listen(brush, "focusin", () => (focused = true));
  listen(brush, "focusout", () => (focused = false));
  // The number keys pick tools from the bar too, not only from the focused canvas.
  listen(root, "keydown", (event) => {
    const value = event as KeyboardEvent;
    if (value.altKey || value.ctrlKey || value.metaKey) return;
    const index = ["1", "2", "3", "4"].indexOf(value.key);
    if (index < 0) return;
    value.preventDefault();
    options.onTool(TOOLS[index]!);
  });

  let paused = false;
  let current = options.tool;
  // A control that hides or disables under focus would drop it to the page; hand it to the tool.
  const rescueFocus = () => {
    const active = document.activeElement;
    if (!active || !root.contains(active)) return;
    if (brush.contains(active) ? brush.hidden : active === clear && (clear.hidden || clear.disabled)) buttons.get(current)?.focus();
  };
  const setTool = (next: Tool) => {
    current = next;
    for (const [candidate, button] of buttons) button.setAttribute("aria-pressed", `${candidate === next}`);
    hint.textContent = TOOL_HINTS[next][options.touch ? 1 : 0];
    brush.hidden = next !== "elevate" && next !== "lower";
    clear.hidden = next !== "destination";
    pausedNote.hidden = !paused || brush.hidden;
    rescueFocus();
  };
  setTool(options.tool);
  const before = options.before?.parentNode === container ? options.before : null;
  container.insertBefore(root, before);

  // The docked bar changes height with the tool, hints and wrapping; report every change.
  let docked: number | null = null;
  const reportDock = () => {
    const height = root.dataset.layout === "compact" ? root.offsetHeight : null;
    if (height === docked) return;
    docked = height;
    options.onDock?.(height);
  };
  const Observer = document.defaultView?.ResizeObserver;
  if (Observer) {
    const observer = new Observer(reportDock);
    observer.observe(root);
    removers.push(() => observer.disconnect());
  }

  let disposed = false;
  return {
    element: root,
    get adjusting() {
      return !brush.hidden && (hovered || focused);
    },
    setTool,
    setDestination(active) {
      if (clear.disabled === !active) return;
      clear.disabled = !active;
      rescueFocus();
    },
    setPaused(next) {
      if (next === paused) return;
      paused = next;
      pausedNote.hidden = !paused || brush.hidden;
    },
    layout(width) {
      root.dataset.layout = width < COMPACT_WIDTH ? "compact" : "wide";
      reportDock();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const remove of removers.splice(0)) remove();
      root.remove();
    },
  };
}
