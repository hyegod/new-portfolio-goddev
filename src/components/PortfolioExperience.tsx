"use client";

import { useEffect, useRef, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";

gsap.registerPlugin(ScrollTrigger);

export function PortfolioExperience({ children }: { children: ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
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

    // 2. Lenis smooth wheel scroll on desktop/pointer devices; pure touch devices keep native 120Hz OS momentum
    let lenis: Lenis | null = null;
    let rafCallback: ((time: number) => void) | null = null;
    const isTouchOnly = window.matchMedia(
      "(hover: none) and (pointer: coarse)"
    ).matches;

    if (!prefersReduced && !isTouchOnly) {
      lenis = new Lenis({
        lerp: 0.085,
        smoothWheel: true,
        wheelMultiplier: 1,
        touchMultiplier: 1.3,
        autoResize: true,
      });

      lenis.on("scroll", ScrollTrigger.update);
      rafCallback = (time: number) => {
        lenis?.raf(time * 1000);
      };
      gsap.ticker.add(rafCallback);
      gsap.ticker.lagSmoothing(0);
    }

    // Synchronize Lenis immediately when PageTransitionProvider lands on a new route
    const onInstantScroll = (e: Event) => {
      const top = (e as CustomEvent<{ top: number }>).detail?.top ?? 0;
      if (lenis) {
        lenis.resize();
        lenis.scrollTo(top, { immediate: true, force: true });
      } else {
        window.scrollTo({ top, behavior: "auto" });
      }
      ScrollTrigger.update();
    };

    // Smoothly glide to same-page #section anchors via Lenis (or native smooth on touch devices)
    const onSmoothScroll = (e: Event) => {
      const detail = (e as CustomEvent<{ hash?: string; top?: number }>).detail;
      const target =
        detail?.hash === "#top" || detail?.hash === "#home"
          ? 0
          : detail?.hash || detail?.top || 0;

      if (lenis) {
        lenis.resize();
        const activeLenis = lenis;
        activeLenis.scrollTo(target, {
          offset: typeof target === "string" ? -16 : 0,
          duration: 1.05,
          easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
          onComplete: () => {
            if (typeof target !== "string") return;
            const el = document.querySelector<HTMLElement>(target);
            if (!el) return;
            // Re-settle cleanly if content-visibility:auto sections expanded during flight
            const delta = Math.abs(el.getBoundingClientRect().top - 16);
            if (delta > 24) {
              activeLenis.resize();
              activeLenis.scrollTo(el, {
                offset: -16,
                duration: 0.42,
                easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
              });
            }
          },
        });
      } else {
        const top =
          typeof detail?.top === "number"
            ? detail.top
            : typeof target === "number"
              ? target
              : 0;
        window.scrollTo({
          top,
          behavior: prefersReduced ? "auto" : "smooth",
        });
      }
    };

    window.addEventListener("portfolio:instant-scroll", onInstantScroll);
    window.addEventListener("portfolio:smooth-scroll", onSmoothScroll);

    // 3. Slow Cinematic Blur-In Focus Pull + ScrollTrigger Parallax (strictly opt-in under no-preference)
    const mm = gsap.matchMedia();

    if (rootRef.current) {
      const rootEl = rootRef.current;
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        // --- A. HERO GPU-COMPOSITED ENTRANCE (zero filter:blur to keep LCP & first paint fast) ---
        if (rootEl.querySelector("#home")) {
          const heroTl = gsap.timeline({ defaults: { ease: "power3.out" } });

          heroTl
            .from(".hero-top-item", {
              y: -10,
              opacity: 0,
              duration: 0.5,
              stagger: 0.08,
              clearProps: "transform,opacity",
            })
            .from(
              ".hero-line",
              {
                y: 20,
                opacity: 0,
                duration: 0.65,
                stagger: 0.07,
                clearProps: "transform,opacity",
              },
              0.08
            )
            .from(
              ".hero-spray",
              {
                scale: 0.96,
                y: 14,
                opacity: 0,
                duration: 0.8,
                clearProps: "transform,opacity",
              },
              0.2
            )
            .from(
              ".hero-dock",
              {
                y: 18,
                opacity: 0,
                duration: 0.6,
                clearProps: "transform,opacity",
              },
              0.38
            );

          // --- B. HERO SCROLL-SCRUBBED KINETIC PARALLAX ---
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
            y: -68,
            scale: 1.05,
            ease: "none",
            scrollTrigger: {
              trigger: "#home",
              start: "top top",
              end: "bottom top",
              scrub: 0.95,
            },
          });
        }

        // --- C. GPU-COMPOSITED HEADING GROUPS (pure transform + opacity, zero blur repaint) ---
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

        // --- D. COBALT SPRAY SIGNATURE WIPE-DRAW ---
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

        // --- E. SLOGAN: COBALT INFINITY PARALLAX + COUNTER-DRIFTING "ENDLESS / NO LIMIT" ---
        if (rootEl.querySelector("#slogan")) {
          if (rootEl.querySelector(".manifesto-infinity")) {
            gsap.fromTo(
              ".manifesto-infinity",
              { y: 34, scale: 0.92, rotate: -3.5 },
              {
                y: -44,
                scale: 1.07,
                rotate: 2.5,
                ease: "none",
                scrollTrigger: {
                  trigger: "#slogan",
                  start: "top bottom",
                  end: "bottom top",
                  scrub: 1.1,
                },
              }
            );
          }

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

        // --- F. STAGGERED GPU-COMPOSITED GRIDS (Stats, Skill Cards, Works, Blueprint Plates) ---
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

        // --- G. EXPERIENCE LEDGER ROWS ---
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

        // --- H. COMPOSITED REVEAL FOR 3D WEBGL / WEBGPU STAGES ---
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

        // --- I. INDIVIDUAL REVEAL BLOCKS ---
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
          lenis?.resize();
          ScrollTrigger.refresh();
        }
      }, 220);
    });
    ro.observe(document.body);

    if ("fonts" in document && document.fonts?.ready) {
      document.fonts.ready
        .then(() => {
          lenis?.resize();
          ScrollTrigger.refresh();
        })
        .catch(() => {});
    }

    return () => {
      window.clearTimeout(resizeTimer);
      ro.disconnect();
      removeScrollFallback?.();
      window.removeEventListener("portfolio:instant-scroll", onInstantScroll);
      window.removeEventListener("portfolio:smooth-scroll", onSmoothScroll);
      mm.revert();
      if (rafCallback) {
        gsap.ticker.remove(rafCallback);
      }
      lenis?.destroy();
    };
  }, []);

  return (
    <div ref={rootRef} className="relative min-h-screen">
      {/* Native CSS Scroll-Driven Progress Indicator */}
      <div id="scroll-progress" aria-hidden="true" />
      {children}
    </div>
  );
}
