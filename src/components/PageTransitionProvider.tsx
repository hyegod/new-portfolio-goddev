"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { EngineeringCursor } from "./EngineeringCursor";
import { InitialPreloader } from "./InitialPreloader";

type TransitionPhase = "idle" | "exiting" | "entering";

const EXIT_DURATION_MS = 160;
const SETTLE_HOLD_MS = 16;
const ENTER_DURATION_MS = 320;
const SAFETY_TIMEOUT_MS = 1600;

function snapScrollInstant(top: number, hash?: string) {
  window.dispatchEvent(
    new CustomEvent("portfolio:instant-scroll", { detail: { top, hash } })
  );
  window.scrollTo({ top, behavior: "auto" });
}

function getHashTargetTop(hash: string): number | null {
  if (!hash || hash === "#") return null;
  if (hash === "#top" || hash === "#home") return 0;
  const target = document.querySelector<HTMLElement>(hash);
  if (!target) return null;
  return Math.max(0, Math.round(window.scrollY + target.getBoundingClientRect().top - 16));
}

export function PageTransitionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const [phase, setPhase] = useState<TransitionPhase>("idle");

  const phaseRef = useRef<TransitionPhase>("idle");
  const prevPathnameRef = useRef<string>(pathname);
  const pendingHashRef = useRef<string>("");
  const initiatedByClickRef = useRef<boolean>(false);

  const pushTimerRef = useRef<number>(0);
  const enterTimerRef = useRef<number>(0);
  const idleTimerRef = useRef<number>(0);
  const safetyTimerRef = useRef<number>(0);

  const clearTimers = useCallback(() => {
    window.clearTimeout(pushTimerRef.current);
    window.clearTimeout(enterTimerRef.current);
    window.clearTimeout(idleTimerRef.current);
    window.clearTimeout(safetyTimerRef.current);
  }, []);

  const updatePhase = useCallback((next: TransitionPhase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  const finishEnter = useCallback(
    (explicitHash?: string) => {
      window.clearTimeout(safetyTimerRef.current);
      window.clearTimeout(enterTimerRef.current);
      window.clearTimeout(idleTimerRef.current);

      const jumpAndSettle = (hash: string) => {
        const firstTop = getHashTargetTop(hash);
        if (firstTop === null) return;
        snapScrollInstant(firstTop, hash);

        // Re-check 1 frame later while still faded out in case content-visibility:auto sections expanded
        requestAnimationFrame(() => {
          const settledTop = getHashTargetTop(hash);
          if (settledTop !== null && Math.abs(settledTop - window.scrollY) > 6) {
            snapScrollInstant(settledTop, hash);
          }
        });
      };

      requestAnimationFrame(() => {
        if (explicitHash) {
          jumpAndSettle(explicitHash);
        } else {
          const hash = pendingHashRef.current;
          if (hash) {
            jumpAndSettle(hash);
            pendingHashRef.current = "";
          } else if (initiatedByClickRef.current) {
            snapScrollInstant(0, "#home");
          }
        }

        enterTimerRef.current = window.setTimeout(() => {
          requestAnimationFrame(() => {
            updatePhase("entering");

            idleTimerRef.current = window.setTimeout(() => {
              initiatedByClickRef.current = false;
              updatePhase("idle");
            }, ENTER_DURATION_MS + 25);
          });
        }, SETTLE_HOLD_MS + 18);
      });
    },
    [updatePhase]
  );

  // Trigger clean focus-pull enter whenever pathname changes (click OR browser Back/Forward)
  useEffect(() => {
    if (prevPathnameRef.current === pathname) return;
    prevPathnameRef.current = pathname;

    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (prefersReduced) {
      initiatedByClickRef.current = false;
      updatePhase("idle");
      return;
    }

    finishEnter();
  }, [pathname, finishEnter, updatePhase]);

  // Capture both cross-page links AND same-page #section anchor jumps for optical lens transition
  useEffect(() => {
    const onDocumentClick = (e: MouseEvent) => {
      if (e.defaultPrevented) return;
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
        return;
      }

      const prefersReduced = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;
      if (prefersReduced) return;

      const target = e.target instanceof Element ? e.target : null;
      const anchor = target?.closest<HTMLAnchorElement>("a[href]");
      if (!anchor) return;

      const rawHref = anchor.getAttribute("href");
      if (!rawHref || rawHref === "#") return;
      if (
        rawHref.startsWith("mailto:") ||
        rawHref.startsWith("tel:") ||
        anchor.hasAttribute("download") ||
        anchor.dataset.noTransition === "true"
      ) {
        return;
      }

      const anchorTarget = anchor.getAttribute("target");
      if (anchorTarget && anchorTarget !== "_self") return;

      let destUrl: URL;
      try {
        destUrl = new URL(anchor.href, window.location.href);
      } catch {
        return;
      }

      if (destUrl.origin !== window.location.origin) return;

      const currentClean = window.location.pathname.replace(/\/+$/, "") || "/";
      const destClean = destUrl.pathname.replace(/\/+$/, "") || "/";

      // Case 1: Same-page section anchor (#about, #skill, #works, #gallery, #contact, #home, #top)
      // Use crisp optical fade-out -> instant jump -> fade-in so heavy GPU sections between origin & target
      // never wake up mid-flight and drop frames, while keeping Lenis smooth scroll active for manual scrolling.
      if (destClean === currentClean) {
        if (!destUrl.hash) return;

        const targetTop = getHashTargetTop(destUrl.hash);
        if (targetTop === null) return;

        e.preventDefault();
        if (Math.abs(window.scrollY - targetTop) < 12) {
          return;
        }
        if (phaseRef.current === "exiting") {
          return;
        }

        const nextUrl =
          destUrl.hash === "#top" || destUrl.hash === "#home"
            ? `${window.location.pathname}${window.location.search}`
            : `${window.location.pathname}${window.location.search}${destUrl.hash}`;

        window.history.replaceState(null, "", nextUrl);
        clearTimers();
        initiatedByClickRef.current = true;
        updatePhase("exiting");

        const targetHash = destUrl.hash;
        pushTimerRef.current = window.setTimeout(() => {
          finishEnter(targetHash);
        }, EXIT_DURATION_MS);

        safetyTimerRef.current = window.setTimeout(() => {
          if (phaseRef.current === "exiting") {
            initiatedByClickRef.current = false;
            updatePhase("idle");
          }
        }, SAFETY_TIMEOUT_MS);
        return;
      }

      // Case 2: Cross-page navigation (e.g. / -> /works, /works -> /works/[slug], /gallery -> /#about)
      if (phaseRef.current === "exiting") {
        e.preventDefault();
        return;
      }

      e.preventDefault();
      clearTimers();

      const destHref = `${destUrl.pathname}${destUrl.search}${destUrl.hash}`;
      pendingHashRef.current = destUrl.hash;
      initiatedByClickRef.current = true;
      updatePhase("exiting");

      pushTimerRef.current = window.setTimeout(() => {
        router.push(destHref, { scroll: !destUrl.hash });
      }, EXIT_DURATION_MS);

      safetyTimerRef.current = window.setTimeout(() => {
        if (phaseRef.current === "exiting") {
          initiatedByClickRef.current = false;
          updatePhase("idle");
        }
      }, SAFETY_TIMEOUT_MS);
    };

    document.addEventListener("click", onDocumentClick, true);
    return () => {
      document.removeEventListener("click", onDocumentClick, true);
    };
  }, [clearTimers, finishEnter, router, updatePhase]);

  useEffect(() => {
    return () => clearTimers();
  }, [clearTimers]);

  return (
    <>
      {/* Minimalist Architectural Initial Loading Curtain */}
      <InitialPreloader />

      {/* Persistent Precision CAD Custom Cursor */}
      <EngineeringCursor />

      {/* Whisper-thin 2px Electric Cobalt Top Route Hairline */}
      <div
        aria-hidden="true"
        data-phase={phase}
        className="page-transition-line"
      />

      {/* Clean Optical Dissolve / Focus-Pull Stage (no transform/filter left on idle so position:sticky stays intact) */}
      <div
        data-transition-phase={phase}
        className={
          phase === "exiting"
            ? "page-stage-exit"
            : phase === "entering"
              ? "page-stage-enter"
              : undefined
        }
      >
        {children}
      </div>
    </>
  );
}
