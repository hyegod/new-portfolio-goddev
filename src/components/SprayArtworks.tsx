"use client";

export function ConcreteCracks({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 360 420"
      fill="none"
      aria-hidden="true"
      className={`pointer-events-none select-none ${className}`}
    >
      <path
        d="M-8 124 L42 152 L66 184 L112 204 L145 236 L174 248"
        stroke="#14161B"
        strokeWidth="1.6"
        strokeOpacity="0.45"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M66 184 L54 226 L26 268 L-4 294"
        stroke="#14161B"
        strokeWidth="1.2"
        strokeOpacity="0.32"
        strokeLinecap="round"
      />
      <path
        d="M112 204 L132 178 L158 172"
        stroke="#14161B"
        strokeWidth="0.9"
        strokeOpacity="0.25"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Hero expressive cobalt-blue + matte-black spray-paint graffiti centerpiece
 * Inspired by Japanese urban editorial streetwear & raw studio calligraphy.
 */
export function HeroSprayArtwork({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 960 440"
      fill="none"
      aria-hidden="true"
      className={`pointer-events-none select-none overflow-visible ${className}`}
    >
      <defs>
        <filter id="spray-mist-hero" x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.065"
            numOctaves="3"
            seed="7"
            result="noise"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="noise"
            scale="13"
            xChannelSelector="R"
            yChannelSelector="G"
            result="roughened"
          />
          <feGaussianBlur in="roughened" stdDeviation="2.4" result="blurred" />
          <feMerge>
            <feMergeNode in="blurred" />
            <feMergeNode in="roughened" />
          </feMerge>
        </filter>

        <filter id="spray-soft-halo" x="-25%" y="-25%" width="150%" height="150%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.11"
            numOctaves="3"
            seed="19"
            result="grain"
          />
          <feDisplacementMap in="SourceGraphic" in2="grain" scale="18" result="disp" />
          <feGaussianBlur in="disp" stdDeviation="11" />
        </filter>
      </defs>

      {/* Overspray cobalt mist halo */}
      <g filter="url(#spray-soft-halo)" opacity="0.45">
        <path
          d="M150 225 C120 110, 290 42, 415 110 C515 162, 430 295, 295 270 C210 255, 235 165, 360 175"
          stroke="#0038FF"
          strokeWidth="44"
          strokeLinecap="round"
        />
        <path
          d="M270 355 C385 268, 560 155, 795 142 C875 138, 882 212, 745 245 C625 274, 495 315, 395 368"
          stroke="#0038FF"
          strokeWidth="42"
          strokeLinecap="round"
        />
      </g>

      {/* Main bold Cobalt Blue sweeping brush/spray strokes */}
      <g filter="url(#spray-mist-hero)">
        {/* Dynamic "BUILD / GO" swooping stroke */}
        <path
          d="M368 84 C272 48, 128 118, 118 228 C110 302, 188 320, 265 268 C326 226, 344 176, 265 182 L346 172"
          stroke="#0033FF"
          strokeWidth="26"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Upper loop accent */}
        <path
          d="M352 192 C355 128, 432 82, 488 104 C536 122, 514 218, 432 232 C376 241, 350 218, 352 192 Z"
          stroke="#0033FF"
          strokeWidth="22"
          strokeLinecap="round"
        />
        {/* Sweeping kinetic slash across right */}
        <path
          d="M286 382 C360 300, 442 208, 520 132 M365 288 C472 246, 610 198, 725 148 M565 132 C660 116, 808 118, 862 152 C906 180, 810 250, 682 276 C604 292, 540 318, 484 368"
          stroke="#0038FF"
          strokeWidth="24"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Accent underline strike */}
        <path
          d="M312 365 C468 318, 636 276, 822 254"
          stroke="#0038FF"
          strokeWidth="14"
          strokeLinecap="round"
        />
      </g>

      {/* High-contrast Matte Black spray shadow strokes & drips */}
      <g filter="url(#spray-mist-hero)" opacity="0.92">
        <path
          d="M174 268 C218 258, 286 218, 324 178"
          stroke="#0A0B0F"
          strokeWidth="16"
          strokeLinecap="round"
        />
        <path
          d="M412 228 C464 218, 504 166, 496 126"
          stroke="#0A0B0F"
          strokeWidth="14"
          strokeLinecap="round"
        />
        <path
          d="M524 274 C606 232, 694 190, 772 182 C812 178, 818 214, 756 244 C702 270, 622 292, 558 326"
          stroke="#0A0B0F"
          strokeWidth="17"
          strokeLinecap="round"
        />
      </g>

      {/* Organic vertical paint drips */}
      <g strokeLinecap="round">
        <path d="M352 364 L352 432" stroke="#0038FF" strokeWidth="6" />
        <circle cx="352" cy="436" r="4.5" fill="#0038FF" />
        <path d="M558 296 L558 364" stroke="#0A0B0F" strokeWidth="4.5" />
        <circle cx="558" cy="368" r="3.5" fill="#0A0B0F" />
        <path d="M684 262 L684 328" stroke="#0038FF" strokeWidth="5" />
        <circle cx="684" cy="332" r="3.8" fill="#0038FF" />
        <path d="M742 130 L742 174" stroke="#0A0B0F" strokeWidth="3.5" opacity="0.85" />
        <path d="M226 286 L226 322" stroke="#0038FF" strokeWidth="3.2" opacity="0.7" />
      </g>

      {/* Fine aerosol splatter speckles */}
      <g fill="#0038FF" opacity="0.65">
        <circle cx="132" cy="144" r="2.2" />
        <circle cx="164" cy="112" r="1.5" />
        <circle cx="436" cy="76" r="2.5" />
        <circle cx="592" cy="108" r="2" />
        <circle cx="818" cy="112" r="2.4" />
        <circle cx="888" cy="176" r="1.8" />
        <circle cx="764" cy="294" r="2.1" />
        <circle cx="412" cy="384" r="2.4" />
      </g>
      <g fill="#0A0B0F" opacity="0.55">
        <circle cx="386" cy="156" r="2" />
        <circle cx="642" cy="164" r="2.2" />
        <circle cx="668" cy="154" r="1.4" />
        <circle cx="526" cy="342" r="1.8" />
      </g>
    </svg>
  );
}

/**
 * Iconic Electric Cobalt Blue Spray-Painted Infinity Loop (∞)
 * Directly inspired by the "ENDLESS / NO LIMIT" architectural editorial spread.
 */
export function SprayInfinity({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 1120 520"
      fill="none"
      aria-hidden="true"
      className={`pointer-events-none select-none overflow-visible ${className}`}
    >
      <defs>
        <filter id="infinity-spray-mist" x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.08"
            numOctaves="3"
            seed="11"
            result="noise"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="noise"
            scale="16"
            xChannelSelector="R"
            yChannelSelector="G"
            result="gritty"
          />
          <feGaussianBlur in="gritty" stdDeviation="3.5" result="soft" />
          <feMerge>
            <feMergeNode in="soft" />
            <feMergeNode in="gritty" />
          </feMerge>
        </filter>

        <filter id="infinity-outer-glow" x="-25%" y="-25%" width="150%" height="150%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.14"
            numOctaves="3"
            seed="3"
            result="n2"
          />
          <feDisplacementMap in="SourceGraphic" in2="n2" scale="24" result="d2" />
          <feGaussianBlur in="d2" stdDeviation="15" />
        </filter>
      </defs>

      {/* Soft cobalt aerosol mist cloud */}
      <path
        d="M525 270 C402 156, 175 148, 86 248 C14 330, 88 452, 248 430 C395 410, 472 318, 560 242 C676 142, 875 74, 1004 166 C1104 238, 1054 416, 868 440 C695 462, 594 344, 525 270 Z"
        stroke="#0038FF"
        strokeWidth="52"
        strokeLinecap="round"
        filter="url(#infinity-outer-glow)"
        opacity="0.52"
      />

      {/* Core high-saturation Cobalt Spray Infinity Loop */}
      <path
        d="M525 270 C402 156, 175 148, 86 248 C14 330, 88 452, 248 430 C395 410, 472 318, 560 242 C676 142, 875 74, 1004 166 C1104 238, 1054 416, 868 440 C695 462, 594 344, 525 270 Z"
        stroke="#0034FF"
        strokeWidth="30"
        strokeLinecap="round"
        filter="url(#infinity-spray-mist)"
      />

      {/* Inner concentrated pass */}
      <path
        d="M528 268 C406 162, 182 156, 94 252 C26 326, 96 444, 248 424 C390 404, 470 314, 562 238 C676 144, 872 82, 996 170 C1092 238, 1044 408, 866 434 C702 456, 600 340, 528 268 Z"
        stroke="#0A45FF"
        strokeWidth="12"
        strokeLinecap="round"
        opacity="0.88"
      />

      {/* Signature vertical paint drips hanging off bottom left loop */}
      <g stroke="#0038FF" strokeLinecap="round" fill="#0038FF">
        <path d="M128 418 L128 492" strokeWidth="6.5" />
        <circle cx="128" cy="496" r="4.5" />
        <path d="M148 426 L148 468" strokeWidth="3.5" opacity="0.8" />
        <circle cx="148" cy="472" r="2.8" opacity="0.8" />
        <path d="M402 384 L402 448" strokeWidth="5" />
        <circle cx="402" cy="452" r="3.6" />
        <path d="M418 378 L418 418" strokeWidth="3" opacity="0.72" />
      </g>
    </svg>
  );
}

/**
 * Sweeping Cobalt Blue Spray Signature for Statement / Philosophy Section
 */
export function SpraySignature({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 740 240"
      fill="none"
      aria-hidden="true"
      className={`pointer-events-none select-none overflow-visible ${className}`}
    >
      <defs>
        <filter id="sig-spray" x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.09"
            numOctaves="3"
            seed="21"
            result="sn"
          />
          <feDisplacementMap in="SourceGraphic" in2="sn" scale="9" result="sd" />
          <feGaussianBlur in="sd" stdDeviation="1.8" result="sb" />
          <feMerge>
            <feMergeNode in="sb" />
            <feMergeNode in="sd" />
          </feMerge>
        </filter>
      </defs>

      <g filter="url(#sig-spray)">
        {/* Expressive flowing signature loops */}
        <path
          d="M192 152 C214 78, 304 34, 370 52 C422 66, 378 148, 304 156 C252 162, 248 118, 312 104 C394 86, 472 56, 524 44 C560 36, 534 128, 464 148 C422 160, 434 126, 492 114 C568 98, 636 86, 684 96 C704 100, 672 134, 598 144"
          stroke="#0038FF"
          strokeWidth="15"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Sweeping dynamic underline slash */}
        <path
          d="M64 214 C236 184, 462 154, 718 134"
          stroke="#0038FF"
          strokeWidth="11"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}
