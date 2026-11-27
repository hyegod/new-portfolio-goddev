import Link from "next/link";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { ContactFooter } from "@/components/ContactFooter";
import { Navbar } from "@/components/Navbar";
import { PortfolioExperience } from "@/components/PortfolioExperience";
import { LazyBlackHoleShowcase } from "@/components/VgpuShowcases";

export default function NotFound() {
  return (
    <PortfolioExperience>
      <Navbar />
      <main className="relative flex min-h-[85svh] items-center overflow-hidden border-b border-white/12 bg-[#08090D] px-3 pt-28 pb-20 text-white min-[380px]:px-4 sm:px-8 lg:px-12">
        {/* Live Multi-Pass Baked Optimized Black Hole Backdrop */}
        <div className="absolute inset-0 z-0">
          <LazyBlackHoleShowcase ambient />
        </div>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-r from-[#08090D]/92 via-[#08090D]/55 to-transparent"
        />

        <div className="relative z-10 mx-auto w-full max-w-[1440px]">
          <p className="font-mono text-[10px] tracking-[0.22em] text-[#6EA6FF] uppercase sm:text-[11px]">
            ERROR 404 // EVENT HORIZON · COORDINATE NOT FOUND
          </p>
          <h1 className="mt-3 font-display text-[clamp(2rem,7vw,5.2rem)] leading-[0.94] font-extrabold tracking-tight text-white uppercase">
            DATUM <span className="text-[#5B86FF]">MISSING</span>
          </h1>
          <p className="mt-4 max-w-lg text-sm leading-relaxed text-white/75 sm:text-base">
            The requested route crossed beyond the event horizon and does not
            exist in this archive. Return to the main showcase or browse the
            complete works catalog.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/"
              className="group inline-flex items-center gap-2 rounded-lg bg-[#0038FF] px-4 py-2.5 font-mono text-[11px] font-semibold tracking-[0.16em] text-white uppercase transition-colors hover:bg-white hover:text-[#0D0E12]"
            >
              <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
              <span className="text-trim">BACK TO HOME</span>
            </Link>
            <Link
              href="/works"
              className="glass-pill-dark group inline-flex items-center gap-2 rounded-lg px-4 py-2.5 font-mono text-[11px] font-semibold tracking-[0.16em] text-white uppercase transition-colors hover:border-[#5B86FF]"
            >
              <span className="text-trim">BROWSE ALL WORKS</span>
              <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
          </div>
        </div>
      </main>
      <ContactFooter />
    </PortfolioExperience>
  );
}
