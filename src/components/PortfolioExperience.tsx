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
        duration: 1.25,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
        touchMultiplier: 1.4,
      });

      lenis.on("scroll", ScrollTrigger.update);
      rafCallback = (time: number) => {
        lenis?.raf(time * 1000);
      };
      gsap.ticker.add(rafCallback);
      gsap.ticker.lagSmoothing(0);
    }

    // Synchronize Lenis immediately when PageTransitionProvider teleports to a section or new page
    const onInstantScroll = (e: Event) => {
      const top = (e as CustomEvent<{ top: number }>).detail?.top ?? 0;
      if (lenis) {
        lenis.scrollTo(top, { immediate: true, force: true });
      } else {
        window.scrollTo({ top, behavior: "auto" });
      }
      ScrollTrigger.update();
    };
    window.addEventListener("portfolio:instant-scroll", onInstantScroll);

    // 3. Slow Cinematic Blur-In Focus Pull + ScrollTrigger Parallax (strictly opt-in under no-preference)
    const mm = gsap.matchMedia();

    if (rootRef.current) {
      const rootEl = rootRef.current;
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        // --- A. HERO SLOW BLUR-IN CHOREOGRAPHY (runs only on home route) ---
        if (rootEl.querySelector("#home")) {
          const heroTl = gsap.timeline({ defaults: { ease: "power2.out" } });

          heroTl
            .from(".hero-top-item", {
              y: -12,
              opacity: 0,
              filter: "blur(6px)",
              duration: 0.9,
              stagger: 0.16,
              clearProps: "transform,opacity,filter",
            })
            .from(
              ".hero-line",
              {
                y: 26,
                opacity: 0,
                filter: "blur(8px)",
                duration: 1.0,
                stagger: 0.14,
                clearProps: "transform,opacity,filter",
              },
              0.2
            )
            .from(
              ".hero-spray",
              {
                scale: 0.94,
                y: 18,
                opacity: 0,
                filter: "blur(10px)",
                duration: 1.35,
                ease: "power3.out",
                clearProps: "transform,opacity,filter",
              },
              0.48
            )
            .from(
              ".hero-dock",
              {
                y: 28,
                opacity: 0,
                filter: "blur(7px)",
                duration: 1.05,
                ease: "power2.out",
                clearProps: "transform,opacity,filter",
              },
              0.95
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

        // --- C. SLOW BLUR-IN HEADING GROUPS (Unhurried 0.24s stagger, 0.95s ease-out focus pull) ---
        gsap.utils.toArray<HTMLElement>("[data-anim='mask-group']").forEach((group) => {
          const lines = group.querySelectorAll<HTMLElement>(".mask-line");
          if (lines.length === 0) return;
          gsap.from(lines, {
            y: 28,
            opacity: 0,
            filter: "blur(7px)",
            duration: 0.95,
            stagger: 0.24,
            ease: "power2.out",
            clearProps: "transform,opacity,filter",
            scrollTrigger: {
              trigger: group,
              start: "top 86%",
              once: true,
            },
          });
        });

        // --- D. COBALT SPRAY SIGNATURE SLOW WIPE-DRAW + BLUR FOCUS ---
        gsap.utils.toArray<HTMLElement>(".anim-spray-draw").forEach((el) => {
          gsap.fromTo(
            el,
            { clipPath: "inset(0 100% 0 0)", opacity: 0.2, filter: "blur(6px)" },
            {
              clipPath: "inset(0 0% 0 0)",
              opacity: 1,
              filter: "blur(0px)",
              duration: 1.55,
              ease: "power3.out",
              clearProps: "clipPath,opacity,filter",
              scrollTrigger: {
                trigger: el,
                start: "top 85%",
                once: true,
              },
            }
          );
        });

        // --- E. SLOGAN: COBALT INFINITY PARALLAX + COUNTER-DRIFTING "ENDLESS / NO LIMIT" ---
        if (rootEl.querySelector("#slogan")) {
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

        // --- F. STAGGERED SLOW BLUR-IN GRIDS (Stats, Skill Cards, Works, Blueprint Plates) ---
        gsap.utils.toArray<HTMLElement>("[data-anim='stagger-group']").forEach((group) => {
          const items = group.querySelectorAll<HTMLElement>(".stagger-item");
          if (items.length === 0) return;
          gsap.from(items, {
            y: 28,
            opacity: 0,
            filter: "blur(6px)",
            duration: 0.9,
            stagger: 0.22,
            ease: "power2.out",
            clearProps: "transform,opacity,filter",
            scrollTrigger: {
              trigger: group,
              start: "top 86%",
              once: true,
            },
          });
        });

        // --- G. SLOW BLUR-IN EXPERIENCE LEDGER ROWS ---
        gsap.utils.toArray<HTMLElement>("[data-anim='slide-group']").forEach((group) => {
          const rows = group.querySelectorAll<HTMLElement>(".slide-row");
          if (rows.length === 0) return;
          gsap.from(rows, {
            y: 22,
            opacity: 0,
            filter: "blur(6px)",
            duration: 0.9,
            stagger: 0.24,
            ease: "power2.out",
            clearProps: "transform,opacity,filter",
            scrollTrigger: {
              trigger: group,
              start: "top 87%",
              once: true,
            },
          });
        });

        // --- H. CINEMATIC SLOW BLUR-IN REVEAL FOR 3D WEBGL STAGES ---
        gsap.utils.toArray<HTMLElement>(".anim-stage-reveal").forEach((stage) => {
          gsap.from(stage, {
            y: 34,
            scale: 0.975,
            opacity: 0,
            filter: "blur(6px)",
            duration: 1.15,
            ease: "power2.out",
            clearProps: "transform,opacity,filter",
            scrollTrigger: {
              trigger: stage,
              start: "top 85%",
              once: true,
            },
          });
        });

        // --- I. INDIVIDUAL SLOW BLUR-IN REVEAL BLOCKS ---
        gsap.utils.toArray<HTMLElement>(".reveal-up").forEach((el) => {
          gsap.from(el, {
            y: 26,
            opacity: 0,
            filter: "blur(6px)",
            duration: 0.92,
            ease: "power2.out",
            clearProps: "transform,opacity,filter",
            scrollTrigger: {
              trigger: el,
              start: "top 88%",
              once: true,
            },
          });
        });
      }, rootRef);
    }

    // Refresh ScrollTrigger accurately once Google Fonts finish loading or layout height shifts
    let resizeTimer = 0;
    const ro = new ResizeObserver(() => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        ScrollTrigger.refresh();
      }, 150);
    });
    ro.observe(document.body);

    if ("fonts" in document && document.fonts?.ready) {
      document.fonts.ready.then(() => ScrollTrigger.refresh()).catch(() => {});
    }

    return () => {
      window.clearTimeout(resizeTimer);
      ro.disconnect();
      removeScrollFallback?.();
      window.removeEventListener("portfolio:instant-scroll", onInstantScroll);
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
