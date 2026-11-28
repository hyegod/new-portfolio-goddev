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
 * Hero expressive cobalt-blue + matte-black spray-paint graffiti centerpiece.
 * Pure layered vector geometry (zero CPU feTurbulence / feDisplacementMap filters)
 * so mouse-spring parallax & scroll run locked at 60/120fps.
 */
export function HeroSprayArtwork({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 960 440"
      fill="none"
      aria-hidden="true"
      className={`pointer-events-none select-none overflow-visible ${className}`}
    >
      {/* Soft aerosol overspray mist halo (layered translucent strokes — zero blur filter cost) */}
      <g strokeLinecap="round" strokeLinejoin="round">
        <path
          d="M150 225 C120 110, 290 42, 415 110 C515 162, 430 295, 295 270 C210 255, 235 165, 360 175"
          stroke="#0038FF"
          strokeWidth="62"
          strokeOpacity="0.09"
        />
        <path
          d="M270 355 C385 268, 560 155, 795 142 C875 138, 882 212, 745 245 C625 274, 495 315, 395 368"
          stroke="#0038FF"
          strokeWidth="58"
          strokeOpacity="0.09"
        />
        <path
          d="M150 225 C120 110, 290 42, 415 110 C515 162, 430 295, 295 270 C210 255, 235 165, 360 175"
          stroke="#0038FF"
          strokeWidth="38"
          strokeOpacity="0.16"
        />
        <path
          d="M270 355 C385 268, 560 155, 795 142 C875 138, 882 212, 745 245 C625 274, 495 315, 395 368"
          stroke="#0038FF"
          strokeWidth="36"
          strokeOpacity="0.16"
        />
      </g>

      {/* Main bold Cobalt Blue sweeping brush/spray strokes */}
      <g strokeLinecap="round" strokeLinejoin="round">
        {/* Dynamic "BUILD / GO" swooping stroke */}
        <path
          d="M368 84 C272 48, 128 118, 118 228 C110 302, 188 320, 265 268 C326 226, 344 176, 265 182 L346 172"
          stroke="#0033FF"
          strokeWidth="26"
          strokeOpacity="0.9"
        />
        <path
          d="M366 88 C275 54, 134 122, 124 226 C116 296, 190 314, 263 265 C320 226, 338 180, 268 185"
          stroke="#2B5CFF"
          strokeWidth="10"
          strokeOpacity="0.45"
          strokeDasharray="24 9 14 7"
        />
        {/* Upper loop accent */}
        <path
          d="M352 192 C355 128, 432 82, 488 104 C536 122, 514 218, 432 232 C376 241, 350 218, 352 192 Z"
          stroke="#0033FF"
          strokeWidth="22"
          strokeOpacity="0.88"
        />
        {/* Sweeping kinetic slash across right */}
        <path
          d="M286 382 C360 300, 442 208, 520 132 M365 288 C472 246, 610 198, 725 148 M565 132 C660 116, 808 118, 862 152 C906 180, 810 250, 682 276 C604 292, 540 318, 484 368"
          stroke="#0038FF"
          strokeWidth="24"
          strokeOpacity="0.92"
        />
        {/* Dry-brush secondary edge */}
        <path
          d="M294 374 C368 294, 448 206, 524 134 M568 137 C662 122, 804 124, 856 156 C896 182, 802 248, 678 272"
          stroke="#4D7BFF"
          strokeWidth="9"
          strokeOpacity="0.42"
          strokeDasharray="34 12 18 8"
        />
        {/* Accent underline strike */}
        <path
          d="M312 365 C468 318, 636 276, 822 254"
          stroke="#0038FF"
          strokeWidth="14"
          strokeOpacity="0.9"
        />
      </g>

      {/* High-contrast Matte Black spray shadow strokes */}
      <g strokeLinecap="round" opacity="0.92">
        <path
          d="M174 268 C218 258, 286 218, 324 178"
          stroke="#0A0B0F"
          strokeWidth="16"
        />
        <path
          d="M412 228 C464 218, 504 166, 496 126"
          stroke="#0A0B0F"
          strokeWidth="14"
        />
        <path
          d="M524 274 C606 232, 694 190, 772 182 C812 178, 818 214, 756 244 C702 270, 622 292, 558 326"
          stroke="#0A0B0F"
          strokeWidth="17"
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
      <g fill="#0038FF" opacity="0.68">
        <circle cx="132" cy="144" r="2.4" />
        <circle cx="164" cy="112" r="1.7" />
        <circle cx="248" cy="92" r="2.1" />
        <circle cx="436" cy="76" r="2.6" />
        <circle cx="592" cy="108" r="2.2" />
        <circle cx="712" cy="126" r="1.9" />
        <circle cx="818" cy="112" r="2.5" />
        <circle cx="888" cy="176" r="2" />
        <circle cx="764" cy="294" r="2.2" />
        <circle cx="412" cy="384" r="2.5" />
        <circle cx="298" cy="346" r="1.8" />
        <circle cx="618" cy="264" r="2.1" />
      </g>
      <g fill="#0A0B0F" opacity="0.58">
        <circle cx="386" cy="156" r="2.1" />
        <circle cx="642" cy="164" r="2.2" />
        <circle cx="668" cy="154" r="1.5" />
        <circle cx="526" cy="342" r="1.9" />
        <circle cx="212" cy="252" r="1.8" />
        <circle cx="798" cy="212" r="1.7" />
      </g>
    </svg>
  );
}

/**
 * Electric Cobalt Blue Spray-Painted Infinity Loop (∞) — pure vector strokes, zero filter overhead.
 */
export function SprayInfinity({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 1120 520"
      fill="none"
      aria-hidden="true"
      className={`pointer-events-none select-none overflow-visible ${className}`}
    >
      {/* Soft cobalt aerosol mist cloud */}
      <path
        d="M525 270 C402 156, 175 148, 86 248 C14 330, 88 452, 248 430 C395 410, 472 318, 560 242 C676 142, 875 74, 1004 166 C1104 238, 1054 416, 868 440 C695 462, 594 344, 525 270 Z"
        stroke="#0038FF"
        strokeWidth="62"
        strokeLinecap="round"
        strokeOpacity="0.11"
      />
      <path
        d="M525 270 C402 156, 175 148, 86 248 C14 330, 88 452, 248 430 C395 410, 472 318, 560 242 C676 142, 875 74, 1004 166 C1104 238, 1054 416, 868 440 C695 462, 594 344, 525 270 Z"
        stroke="#0034FF"
        strokeWidth="30"
        strokeLinecap="round"
        strokeOpacity="0.92"
      />
      <path
        d="M528 268 C406 162, 182 156, 94 252 C26 326, 96 444, 248 424 C390 404, 470 314, 562 238 C676 144, 872 82, 996 170 C1092 238, 1044 408, 866 434 C702 456, 600 340, 528 268 Z"
        stroke="#0A45FF"
        strokeWidth="12"
        strokeLinecap="round"
        opacity="0.88"
      />

      {/* Signature vertical paint drips */}
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
 * Sweeping Cobalt Blue Spray Signature for Statement / Philosophy Section (zero SVG filter overhead).
 */
export function SpraySignature({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 740 240"
      fill="none"
      aria-hidden="true"
      className={`pointer-events-none select-none overflow-visible ${className}`}
    >
      <g strokeLinecap="round" strokeLinejoin="round">
        {/* Soft aerosol mist edge */}
        <path
          d="M192 152 C214 78, 304 34, 370 52 C422 66, 378 148, 304 156 C252 162, 248 118, 312 104 C394 86, 472 56, 524 44 C560 36, 534 128, 464 148 C422 160, 434 126, 492 114 C568 98, 636 86, 684 96 C704 100, 672 134, 598 144"
          stroke="#0038FF"
          strokeWidth="28"
          strokeOpacity="0.14"
        />
        <path
          d="M64 214 C236 184, 462 154, 718 134"
          stroke="#0038FF"
          strokeWidth="22"
          strokeOpacity="0.14"
        />
        {/* Crisp core signature loops */}
        <path
          d="M192 152 C214 78, 304 34, 370 52 C422 66, 378 148, 304 156 C252 162, 248 118, 312 104 C394 86, 472 56, 524 44 C560 36, 534 128, 464 148 C422 160, 434 126, 492 114 C568 98, 636 86, 684 96 C704 100, 672 134, 598 144"
          stroke="#0038FF"
          strokeWidth="15"
          strokeOpacity="0.94"
        />
        {/* Dry-brush highlight pass */}
        <path
          d="M198 148 C220 78, 304 38, 368 55 C418 68, 376 144, 306 152 C258 158, 254 120, 314 107 C394 90, 470 60, 522 48"
          stroke="#4E7CFF"
          strokeWidth="5"
          strokeOpacity="0.45"
          strokeDasharray="28 10 14 8"
        />
        {/* Sweeping dynamic underline slash */}
        <path
          d="M64 214 C236 184, 462 154, 718 134"
          stroke="#0038FF"
          strokeWidth="11"
          strokeOpacity="0.94"
        />
      </g>
      {/* Fine spray speckles */}
      <g fill="#0038FF" opacity="0.55">
        <circle cx="242" cy="64" r="2.2" />
        <circle cx="446" cy="58" r="1.8" />
        <circle cx="624" cy="86" r="2.1" />
        <circle cx="512" cy="162" r="1.9" />
        <circle cx="152" cy="196" r="2" />
      </g>
    </svg>
  );
}
