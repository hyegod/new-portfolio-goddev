"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { PORTFOLIO_PROFILE } from "@/data/portfolio";

const NAV_LINKS = [
  { id: "about", label: "ABOUT", homeHref: "#about", subHref: "/#about" },
  { id: "skill", label: "SKILL", homeHref: "#skill", subHref: "/#skill" },
  { id: "works", label: "WORKS", homeHref: "#works", subHref: "/works" },
  { id: "gallery", label: "GALLERY", homeHref: "#gallery", subHref: "/gallery" },
];

export function Navbar() {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const [scrolled, setScrolled] = useState(false);
  const scrolledRef = useRef(false);
  const [activeSection, setActiveSection] = useState<string>("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [clockText, setClockText] = useState("LOCAL");

  useEffect(() => {
    const onScroll = () => {
      const next = window.scrollY > 36;
      if (next !== scrolledRef.current) {
        scrolledRef.current = next;
        setScrolled(next);
      }
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Deterministic ScrollSpy on the home page; on subpages highlight the matching route
  useEffect(() => {
    if (!isHome) {
      if (pathname.startsWith("/works")) {
        setActiveSection("works");
      } else if (pathname.startsWith("/gallery")) {
        setActiveSection("gallery");
      } else {
        setActiveSection("");
      }
      return;
    }

    const sectionIds = ["home", "about", "skill", "works", "gallery", "contact"];
    let rafId = 0;

    const computeActive = () => {
      rafId = 0;
      const nearBottom =
        window.scrollY + window.innerHeight >=
        document.documentElement.scrollHeight - 48;
      if (nearBottom && document.getElementById("contact")) {
        setActiveSection("contact");
        return;
      }

      const focalY = Math.min(260, Math.max(120, window.innerHeight * 0.32));
      let current = "";
      for (const id of sectionIds) {
        const el = document.getElementById(id);
        if (!el) continue;
        if (el.getBoundingClientRect().top <= focalY) {
          current = id === "home" ? "" : id;
        }
      }
      setActiveSection(current);
    };

    const scheduleCompute = () => {
      if (!rafId) {
        rafId = requestAnimationFrame(computeActive);
      }
    };

    const onInstantJump = (e: Event) => {
      const hash = (e as CustomEvent<{ hash?: string }>).detail?.hash;
      if (hash) {
        const id = hash.replace(/^#/, "");
        if (sectionIds.includes(id)) {
          setActiveSection(id === "home" || id === "top" ? "" : id);
        }
      }
      scheduleCompute();
    };

    computeActive();
    window.addEventListener("scroll", scheduleCompute, { passive: true });
    window.addEventListener("resize", scheduleCompute, { passive: true });
    window.addEventListener("portfolio:instant-scroll", onInstantJump);
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", scheduleCompute);
      window.removeEventListener("resize", scheduleCompute);
      window.removeEventListener("portfolio:instant-scroll", onInstantJump);
    };
  }, [isHome, pathname]);

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const time = now.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
      });
      setClockText(`${time} LOCAL`);
    };
    updateClock();
    const id = window.setInterval(updateClock, 30_000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <>
      <motion.header
        initial={{ y: -12, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="fixed inset-x-0 top-0 z-50 px-3 pt-2.5 min-[380px]:px-4 min-[380px]:pt-3 sm:px-8 lg:px-12"
      >
        <div
          className={`mx-auto flex w-full max-w-[1440px] items-center justify-between gap-2 rounded-xl px-3 transition-all duration-300 min-[380px]:gap-3 min-[380px]:px-4 sm:px-6 lg:grid lg:grid-cols-[1fr_auto_1fr] lg:gap-4 ${
            scrolled ? "glass-vellum-strong py-2 sm:py-2.5" : "glass-vellum py-2.5 sm:py-3"
          }`}
        >
          {/* Left: Minimalist Personal Mark */}
          <Link
            href={isHome ? "#home" : "/"}
            className="group inline-flex min-w-0 items-center gap-2 justify-self-start whitespace-nowrap min-[380px]:gap-2.5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0038FF]"
          >
            <span className="text-trim font-display text-xs font-extrabold tracking-[0.14em] text-[#0D0E12] uppercase transition-colors group-hover:text-[#0038FF] min-[380px]:text-sm min-[380px]:tracking-[0.22em]">
              {PORTFOLIO_PROFILE.brand}
            </span>
            <span className="hidden font-mono text-[10px] tracking-[0.14em] text-[#505562] md:inline lg:hidden xl:inline">
              // CIVIL × SWE
            </span>
          </Link>

          {/* Center: Clean 4-Item Editorial Navigation with Gliding ScrollSpy Underline */}
          <nav
            aria-label="Primary navigation"
            className="hidden items-center justify-self-center gap-5 lg:flex xl:gap-7"
          >
            {NAV_LINKS.map((item) => {
              const isActive = activeSection === item.id;
              const href = isHome ? item.homeHref : item.subHref;
              return (
                <Link
                  key={item.id}
                  href={href}
                  className={`text-trim group relative px-1 py-1.5 font-mono text-[11px] font-medium tracking-[0.2em] uppercase transition-colors ${
                    isActive
                      ? "font-semibold text-[#0038FF]"
                      : "text-[#0D0E12] hover:text-[#0038FF]"
                  }`}
                >
                  {item.label}
                  {isActive ? (
                    <motion.span
                      layoutId="nav-scrollspy-bar"
                      transition={{ type: "spring", stiffness: 380, damping: 32 }}
                      className="absolute inset-x-0 -bottom-0.5 h-[2px] rounded-full bg-[#0038FF]"
                      aria-hidden="true"
                    />
                  ) : (
                    <span className="absolute inset-x-0 -bottom-0.5 h-[1.5px] origin-left scale-x-0 bg-[#0038FF]/60 transition-transform duration-200 group-hover:scale-x-100" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Right: Local Clock + Spring Tactile Contact CTA + Mobile Toggle */}
          <div className="flex shrink-0 items-center justify-end justify-self-end gap-2 min-[380px]:gap-3 sm:gap-4">
            <span className="hidden items-center gap-1.5 whitespace-nowrap font-mono text-[10px] tracking-[0.14em] text-[#505562] tabular-nums md:inline-flex">
              <span
                className="status-dot h-1.5 w-1.5 rounded-full bg-[#0038FF]"
                aria-hidden="true"
              />
              <span className="text-trim">{clockText}</span>
            </span>

            <motion.a
              href="#contact"
              whileHover={{ scale: 1.03, y: -1 }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: "spring", stiffness: 420, damping: 24 }}
              className={`group inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 whitespace-nowrap font-mono text-[10px] font-semibold tracking-[0.1em] text-white uppercase transition-colors min-[380px]:gap-1.5 min-[380px]:px-3.5 min-[380px]:py-2 min-[380px]:text-[11px] min-[380px]:tracking-[0.16em] ${
                activeSection === "contact"
                  ? "bg-[#0038FF]"
                  : "bg-[#0D0E12] hover:bg-[#0038FF]"
              }`}
            >
              <span className="text-trim">CONTACT</span>
              <ArrowUpRight className="h-3 w-3 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 min-[380px]:h-3.5 min-[380px]:w-3.5" />
            </motion.a>

            <button
              type="button"
              onClick={() => setMobileOpen((v) => !v)}
              className="glass-pill-light grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[#0D0E12] min-[380px]:h-9 min-[380px]:w-9 lg:hidden"
              aria-label={mobileOpen ? "Close menu" : "Open navigation menu"}
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </motion.header>

      {/* Mobile Navigation Overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="glass-vellum-strong fixed inset-x-3 top-[66px] z-40 rounded-xl px-4 py-5 min-[380px]:inset-x-4 min-[380px]:top-[72px] min-[380px]:px-6 sm:inset-x-8 sm:py-6 lg:hidden"
          >
            <div className="mb-4 flex items-center justify-between border-b border-black/10 pb-3 font-mono text-[10px] tracking-[0.14em] text-[#505562] uppercase">
              <span>// CIVIL × SWE</span>
              <span className="inline-flex items-center gap-1.5 tabular-nums">
                <span className="status-dot h-1.5 w-1.5 rounded-full bg-[#0038FF]" aria-hidden="true" />
                {clockText}
              </span>
            </div>
            <nav aria-label="Mobile navigation" className="flex flex-col gap-3.5">
              {NAV_LINKS.map((item, idx) => (
                <Link
                  key={item.id}
                  href={isHome ? item.homeHref : item.subHref}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-baseline justify-between border-b border-black/10 pb-2.5 font-display text-xl font-extrabold tracking-tight uppercase min-[380px]:text-2xl ${
                    activeSection === item.id ? "text-[#0038FF]" : "text-[#0D0E12]"
                  }`}
                >
                  <span>{item.label}</span>
                  <span className="font-mono text-xs text-[#0038FF]">
                    0{idx + 1}
                  </span>
                </Link>
              ))}
              <a
                href="#contact"
                onClick={() => setMobileOpen(false)}
                className="flex items-baseline justify-between border-b border-black/10 pb-2.5 font-display text-xl font-extrabold tracking-tight text-[#0D0E12] uppercase min-[380px]:text-2xl"
              >
                <span>CONTACT</span>
                <span className="font-mono text-xs text-[#0038FF]">05</span>
              </a>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
