"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { scheduleBackgroundTask } from "@/lib/devicePerf";
import { LazyRoamingBotsOverlay } from "./VgpuShowcases";

export function PortfolioExperience({ children }: { children: ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let disposed = false;
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    // 1. Modern Web Guidance: JS fallback ONLY when native CSS Scroll-Driven Animations are unsupported
    const progressEl = document.getElementById("scroll-progress");
    let removeScrollFallback: (() => void) | undefined;

    if (
      progressEl &&
      !prefersReduced &&
      !CSS.supports("animation-timeline", "scroll()")
    ) {
      const updateProgress = () => {
        const scrollable =
          document.documentElement.scrollHeight - window.innerHeight;
        const pct = scrollable > 0 ? window.scrollY / scrollable : 0;
        progressEl.style.transform = `scaleX(${Math.max(0, Math.min(1, pct))})`;
      };
      updateProgress();
      window.addEventListener("scroll", updateProgress, { passive: true });
      removeScrollFallback = () =>
        window.removeEventListener("scroll", updateProgress);
    }

    // Mutable handles filled once deferred GSAP + desktop Lenis finish loading
    let lenisInstance: {
      raf: (t: number) => void;
      resize: () => void;
      scrollTo: (top: number, opts?: { immediate?: boolean; force?: boolean }) => void;
      on: (ev: "scroll", cb: () => void) => void;
      destroy: () => void;
    } | null = null;
    let scrollTriggerRef: { update: () => void; refresh: () => void } | null = null;
    let cleanupMotionEngine: (() => void) | undefined;

    // Synchronize Lenis immediately when PageTransitionProvider lands on a new route or section fade-jump
    const onInstantScroll = (e: Event) => {
      const top = (e as CustomEvent<{ top: number }>).detail?.top ?? 0;
      if (lenisInstance) {
        lenisInstance.resize();
        lenisInstance.scrollTo(top, { immediate: true, force: true });
      } else {
        window.scrollTo({ top, behavior: "auto" });
      }
      scrollTriggerRef?.update();
    };

    window.addEventListener("portfolio:instant-scroll", onInstantScroll);

    // 2. Defer GSAP + ScrollTrigger (and desktop-only Lenis) behind initial paint so hydration & TBT stay lean
    const cancelDeferredBoot = scheduleBackgroundTask(() => {
      if (disposed) return;

      const isTouchOnly = window.matchMedia(
        "(hover: none) and (pointer: coarse)"
      ).matches;

      const loadGsap = Promise.all([
        import("gsap"),
        import("gsap/ScrollTrigger"),
      ]);
      const loadLenis =
        !prefersReduced && !isTouchOnly ? import("lenis") : Promise.resolve(null);

      Promise.all([loadGsap, loadLenis])
        .then(([[gsapMod, stMod], lenisMod]) => {
          if (disposed) return;
          const gsap = gsapMod.default;
          const ScrollTrigger = stMod.ScrollTrigger;
          gsap.registerPlugin(ScrollTrigger);
          scrollTriggerRef = ScrollTrigger;

          let rafCallback: ((time: number) => void) | null = null;

          if (lenisMod) {
            const Lenis = lenisMod.default;
            lenisInstance = new Lenis({
              lerp: 0.085,
              smoothWheel: true,
              wheelMultiplier: 1,
              touchMultiplier: 1.3,
              autoResize: true,
            });
            lenisInstance.on("scroll", ScrollTrigger.update);
            rafCallback = (time: number) => {
              lenisInstance?.raf(time * 1000);
            };
            gsap.ticker.add(rafCallback);
            gsap.ticker.lagSmoothing(0);
          }

          // 3. GPU-Composited ScrollTrigger Parallax & Section Reveals (strictly opt-in under no-preference)
          const mm = gsap.matchMedia();

          if (rootRef.current) {
            const rootEl = rootRef.current;
            mm.add("(prefers-reduced-motion: no-preference)", () => {
              if (rootEl.querySelector("#home")) {
                // Hero scroll-scrubbed kinetic parallax (pure GPU transform, zero scale re-rasterization)
                gsap.to(".hero-ghost-odd", {
                  xPercent: 5,
                  ease: "none",
                  scrollTrigger: {
                    trigger: "#home",
                    start: "top top",
                    end: "bottom top",
                    scrub: 1.0,
                  },
                });

                gsap.to(".hero-ghost-even", {
                  xPercent: -5,
                  ease: "none",
                  scrollTrigger: {
                    trigger: "#home",
                    start: "top top",
                    end: "bottom top",
                    scrub: 1.0,
                  },
                });

                gsap.to(".hero-spray-parallax", {
                  y: -52,
                  ease: "none",
                  scrollTrigger: {
                    trigger: "#home",
                    start: "top top",
                    end: "bottom top",
                    scrub: 0.95,
                  },
                });
              }

              // GPU-composited heading groups (pure transform + opacity)
              gsap.utils.toArray<HTMLElement>("[data-anim='mask-group']").forEach((group) => {
                const lines = group.querySelectorAll<HTMLElement>(".mask-line");
                if (lines.length === 0) return;
                gsap.from(lines, {
                  y: 22,
                  opacity: 0,
                  duration: 0.68,
                  stagger: 0.12,
                  ease: "power3.out",
                  clearProps: "transform,opacity",
                  scrollTrigger: {
                    trigger: group,
                    start: "top 88%",
                    once: true,
                  },
                });
              });

              // Cobalt spray signature wipe-draw
              gsap.utils.toArray<HTMLElement>(".anim-spray-draw").forEach((el) => {
                gsap.fromTo(
                  el,
                  { clipPath: "inset(0 100% 0 0)", opacity: 0.25 },
                  {
                    clipPath: "inset(0 0% 0 0)",
                    opacity: 1,
                    duration: 1.05,
                    ease: "power3.out",
                    clearProps: "clipPath,opacity",
                    scrollTrigger: {
                      trigger: el,
                      start: "top 86%",
                      once: true,
                    },
                  }
                );
              });

              // Slogan counter-drifting "ENDLESS / NO LIMIT"
              if (rootEl.querySelector("#slogan")) {
                gsap.fromTo(
                  ".slogan-word-left",
                  { x: -30 },
                  {
                    x: 24,
                    ease: "none",
                    scrollTrigger: {
                      trigger: "#slogan",
                      start: "top bottom",
                      end: "bottom top",
                      scrub: 1.15,
                    },
                  }
                );

                gsap.fromTo(
                  ".slogan-word-right",
                  { x: 30 },
                  {
                    x: -24,
                    ease: "none",
                    scrollTrigger: {
                      trigger: "#slogan",
                      start: "top bottom",
                      end: "bottom top",
                      scrub: 1.15,
                    },
                  }
                );

                gsap.fromTo(
                  ".slogan-glass-float",
                  { y: 34 },
                  {
                    y: -20,
                    ease: "none",
                    scrollTrigger: {
                      trigger: "#slogan",
                      start: "top bottom",
                      end: "bottom top",
                      scrub: 1.05,
                    },
                  }
                );
              }

              // Staggered GPU-composited grids
              gsap.utils.toArray<HTMLElement>("[data-anim='stagger-group']").forEach((group) => {
                const items = group.querySelectorAll<HTMLElement>(".stagger-item");
                if (items.length === 0) return;
                gsap.from(items, {
                  y: 22,
                  opacity: 0,
                  duration: 0.65,
                  stagger: 0.1,
                  ease: "power3.out",
                  clearProps: "transform,opacity",
                  scrollTrigger: {
                    trigger: group,
                    start: "top 88%",
                    once: true,
                  },
                });
              });

              // Experience ledger rows
              gsap.utils.toArray<HTMLElement>("[data-anim='slide-group']").forEach((group) => {
                const rows = group.querySelectorAll<HTMLElement>(".slide-row");
                if (rows.length === 0) return;
                gsap.from(rows, {
                  y: 18,
                  opacity: 0,
                  duration: 0.62,
                  stagger: 0.1,
                  ease: "power3.out",
                  clearProps: "transform,opacity",
                  scrollTrigger: {
                    trigger: group,
                    start: "top 88%",
                    once: true,
                  },
                });
              });

              // Composited reveal for 3D stages
              gsap.utils.toArray<HTMLElement>(".anim-stage-reveal").forEach((stage) => {
                gsap.from(stage, {
                  y: 24,
                  scale: 0.985,
                  opacity: 0,
                  duration: 0.78,
                  ease: "power3.out",
                  clearProps: "transform,opacity",
                  scrollTrigger: {
                    trigger: stage,
                    start: "top 88%",
                    once: true,
                  },
                });
              });

              // Individual reveal blocks
              gsap.utils.toArray<HTMLElement>(".reveal-up").forEach((el) => {
                gsap.from(el, {
                  y: 20,
                  opacity: 0,
                  duration: 0.64,
                  ease: "power3.out",
                  clearProps: "transform,opacity",
                  scrollTrigger: {
                    trigger: el,
                    start: "top 90%",
                    once: true,
                  },
                });
              });
            }, rootRef);
          }

          // Refresh Lenis & ScrollTrigger only when document height changes meaningfully
          let resizeTimer = 0;
          let lastBodyHeight = document.body.scrollHeight;
          const ro = new ResizeObserver(() => {
            window.clearTimeout(resizeTimer);
            resizeTimer = window.setTimeout(() => {
              const nextHeight = document.body.scrollHeight;
              if (Math.abs(nextHeight - lastBodyHeight) > 12) {
                lastBodyHeight = nextHeight;
                lenisInstance?.resize();
                ScrollTrigger.refresh();
              }
            }, 260);
          });
          ro.observe(document.body);

          if ("fonts" in document && document.fonts?.ready) {
            document.fonts.ready
              .then(() => {
                if (!disposed) {
                  lenisInstance?.resize();
                  ScrollTrigger.refresh();
                }
              })
              .catch(() => {});
          }

          cleanupMotionEngine = () => {
            window.clearTimeout(resizeTimer);
            ro.disconnect();
            mm.revert();
            if (rafCallback) {
              gsap.ticker.remove(rafCallback);
            }
            lenisInstance?.destroy();
            lenisInstance = null;
            scrollTriggerRef = null;
          };
        })
        .catch(() => {});
    }, 180);

    return () => {
      disposed = true;
      cancelDeferredBoot();
      removeScrollFallback?.();
      window.removeEventListener("portfolio:instant-scroll", onInstantScroll);
      cleanupMotionEngine?.();
    };
  }, []);

  return (
    <div ref={rootRef} className="relative min-h-screen">
      {/* Native CSS Scroll-Driven Progress Indicator */}
      <div id="scroll-progress" aria-hidden="true" />
      {/* Transparent Full-Viewport Free-Roaming Quadruped FABRIK IK Companions */}
      <LazyRoamingBotsOverlay />
      {children}
    </div>
  );
}
