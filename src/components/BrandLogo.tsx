import { cn } from '../utils/cn';

/**
 * AE Cyberpunk Monogram logo.
 * Kept as a raw SVG string and rendered through an <img> data URI so the
 * embedded SMIL animations (glitch tears, HUD ring, blinking status square)
 * keep playing exactly as authored.
 */
const AE_LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 800 600" width="800" height="600">
  <title>AE Cyberpunk Monogram</title>
  <defs>
    <linearGradient id="neon" gradientUnits="userSpaceOnUse" x1="40" y1="60" x2="195" y2="155">
      <stop offset="0" stop-color="#00f6ff"/>
      <stop offset="0.45" stop-color="#6d7bff"/>
      <stop offset="1" stop-color="#ff2bd6"/>
    </linearGradient>

    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#090314"/>
      <stop offset="1" stop-color="#16041f"/>
    </linearGradient>

    <linearGradient id="hz" gradientUnits="userSpaceOnUse" x1="40" y1="0" x2="760" y2="0">
      <stop offset="0" stop-color="#00f6ff" stop-opacity="0"/>
      <stop offset="0.2" stop-color="#00f6ff"/>
      <stop offset="0.8" stop-color="#ff2bd6"/>
      <stop offset="1" stop-color="#ff2bd6" stop-opacity="0"/>
    </linearGradient>

    <radialGradient id="haloM" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="#ff2bd6" stop-opacity="0.32"/>
      <stop offset="1" stop-color="#ff2bd6" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="haloC" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="#00f6ff" stop-opacity="0.26"/>
      <stop offset="1" stop-color="#00f6ff" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="vig" cx="0.5" cy="0.5" r="0.75">
      <stop offset="0.55" stop-color="#000" stop-opacity="0"/>
      <stop offset="1" stop-color="#000" stop-opacity="0.75"/>
    </radialGradient>

    <linearGradient id="fadeUp" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fff" stop-opacity="0"/>
      <stop offset="1" stop-color="#fff" stop-opacity="1"/>
    </linearGradient>
    <linearGradient id="fadeDown" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fff" stop-opacity="0.7"/>
      <stop offset="1" stop-color="#fff" stop-opacity="0"/>
    </linearGradient>
    <mask id="gridMask" maskUnits="userSpaceOnUse" x="0" y="0" width="800" height="600">
      <rect x="0" y="450" width="800" height="110" fill="url(#fadeUp)"/>
    </mask>
    <mask id="reflMask" maskUnits="userSpaceOnUse" x="0" y="0" width="800" height="600">
      <rect x="0" y="450" width="800" height="110" fill="url(#fadeDown)"/>
    </mask>

    <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="9" result="b1"/>
      <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="b2"/>
      <feMerge>
        <feMergeNode in="b1"/>
        <feMergeNode in="b1"/>
        <feMergeNode in="b2"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <filter id="glowSm" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="b"/>
      <feMerge>
        <feMergeNode in="b"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>

    <pattern id="scan" patternUnits="userSpaceOnUse" width="800" height="4">
      <rect width="800" height="1.6" fill="#000" opacity="0.22"/>
    </pattern>
    <pattern id="cuts" patternUnits="userSpaceOnUse" width="10" height="2.6">
      <rect width="10" height="0.7" fill="#06020f" opacity="0.5"/>
    </pattern>
    <pattern id="bgGrid" patternUnits="userSpaceOnUse" width="40" height="40">
      <path d="M40 0 H0 V40" fill="none" stroke="#6d4bff" stroke-width="0.6" opacity="0.14"/>
    </pattern>

    <clipPath id="frameClip">
      <path d="M70 40 H730 L760 70 V530 L730 560 H70 L40 530 V70 Z"/>
    </clipPath>
    <clipPath id="floorClip">
      <rect x="40" y="450" width="720" height="110"/>
    </clipPath>

    <g id="AE">
      <path d="M52 128 L77 61 L84 61 L128 155 L108 155 L82 100 L70 133 Z"/>
      <path d="M104 74 L192 72 Q186 90 150 97 L116 97 Z"/>
      <path d="M119 103 L178 103 Q172 115 150 117 L125 117 Z"/>
      <path d="M128 123 L192 123 Q190 150 146 155 L143 155 Z"/>
      <circle cx="44" cy="146" r="11"/>
    </g>

    <clipPath id="logoClip">
      <path d="M52 128 L77 61 L84 61 L128 155 L108 155 L82 100 L70 133 Z"/>
      <path d="M104 74 L192 72 Q186 90 150 97 L116 97 Z"/>
      <path d="M119 103 L178 103 Q172 115 150 117 L125 117 Z"/>
      <path d="M128 123 L192 123 Q190 150 146 155 L143 155 Z"/>
      <circle cx="44" cy="146" r="11"/>
    </clipPath>

    <clipPath id="s1"><rect x="20" y="86" width="200" height="4"/></clipPath>
    <clipPath id="s2"><rect x="20" y="118" width="200" height="3"/></clipPath>
    <clipPath id="s3"><rect x="20" y="68" width="200" height="2.4"/></clipPath>
    <clipPath id="s4"><rect x="20" y="138" width="200" height="2.6"/></clipPath>
  </defs>

  <rect width="800" height="600" fill="url(#bg)"/>
  <rect width="800" height="600" fill="url(#bgGrid)"/>
  <circle cx="330" cy="300" r="330" fill="url(#haloC)"/>
  <circle cx="470" cy="280" r="330" fill="url(#haloM)"/>

  <g stroke-width="1" opacity="0.35">
    <line x1="215" y1="52" x2="215" y2="112" stroke="#00f6ff"/>
    <line x1="262" y1="70" x2="262" y2="98" stroke="#ff2bd6"/>
    <line x1="548" y1="52" x2="548" y2="124" stroke="#ff2bd6"/>
    <line x1="598" y1="60" x2="598" y2="96" stroke="#00f6ff"/>
    <line x1="690" y1="470" x2="690" y2="500" stroke="#00f6ff"/>
    <line x1="120" y1="462" x2="120" y2="505" stroke="#ff2bd6"/>
  </g>

  <g fill="none" transform="translate(0 0)">
    <circle cx="400" cy="288" r="214" stroke="#ff2bd6" stroke-width="1.2" stroke-dasharray="2 9" opacity="0.5"/>
    <circle cx="400" cy="288" r="232" stroke="#00f6ff" stroke-width="1" stroke-dasharray="70 22 6 22" opacity="0.4">
      <animateTransform attributeName="transform" type="rotate" from="0 400 288" to="360 400 288" dur="80s" repeatCount="indefinite"/>
    </circle>
  </g>

  <g clip-path="url(#floorClip)">
    <g mask="url(#gridMask)" stroke="#ff2bd6" stroke-width="1" fill="none">
      <path d="M11 450 L-600 560 M50 450 L-500 560 M89 450 L-400 560 M128 450 L-300 560 M167 450 L-200 560 M206 450 L-100 560 M244 450 L0 560 M283 450 L100 560 M322 450 L200 560 M361 450 L300 560 M400 450 L400 560 M439 450 L500 560 M478 450 L600 560 M517 450 L700 560 M556 450 L800 560 M594 450 L900 560 M633 450 L1000 560 M672 450 L1100 560 M711 450 L1200 560 M750 450 L1300 560 M789 450 L1400 560"/>
      <path d="M0 453 H800 M0 462 H800 M0 474 H800 M0 490 H800 M0 511 H800 M0 538 H800" stroke="#00f6ff" opacity="0.8"/>
    </g>
  </g>
  <line x1="40" y1="450" x2="760" y2="450" stroke="url(#hz)" stroke-width="2" filter="url(#glowSm)"/>

  <g clip-path="url(#floorClip)">
    <g mask="url(#reflMask)">
      <g transform="translate(0 900) scale(1 -1)">
        <g transform="translate(41.6 -55.6) scale(3.2)">
          <use xlink:href="#AE" href="#AE" fill="url(#neon)" opacity="0.8"/>
        </g>
      </g>
    </g>
  </g>

  <g fill="none" stroke-width="1.3" opacity="0.65" stroke-linejoin="round">
    <g stroke="#00f6ff">
      <path d="M40 190 H78 L98 210 H132"/>
      <path d="M40 250 H60 L80 270 H112 V302"/>
      <path d="M40 392 H70 L90 372 H126"/>
    </g>
    <g stroke="#ff2bd6">
      <path d="M760 200 H722 L702 220 H668"/>
      <path d="M760 330 H736 L716 350 H690 V382"/>
      <path d="M760 420 H716 L696 400 H672"/>
    </g>
  </g>
  <g filter="url(#glowSm)">
    <g fill="#00f6ff">
      <circle cx="132" cy="210" r="3.2"/>
      <circle cx="112" cy="302" r="3.2"/>
      <circle cx="126" cy="372" r="3.2"/>
    </g>
    <g fill="#ff2bd6">
      <circle cx="668" cy="220" r="3.2"/>
      <circle cx="690" cy="382" r="3.2"/>
      <circle cx="672" cy="400" r="3.2"/>
    </g>
  </g>

  <g filter="url(#glow)" opacity="0.85">
    <g transform="translate(41.6 -55.6) scale(3.2)">
      <use xlink:href="#AE" href="#AE" fill="url(#neon)"/>
    </g>
  </g>

  <g transform="translate(41.6 -55.6) scale(3.2)">
    <use xlink:href="#AE" href="#AE" fill="#ff2bd6" opacity="0.85" transform="translate(1.3 0.35)">
      <animateTransform attributeName="transform" type="translate" values="1.3 0.35; 1.9 0.2; 1.3 0.35; 0.8 0.5; 1.3 0.35" dur="3.4s" repeatCount="indefinite"/>
    </use>
    <use xlink:href="#AE" href="#AE" fill="#00f6ff" opacity="0.85" transform="translate(-1.3 -0.3)">
      <animateTransform attributeName="transform" type="translate" values="-1.3 -0.3; -1.9 -0.1; -1.3 -0.3; -0.8 -0.45; -1.3 -0.3" dur="3.4s" repeatCount="indefinite"/>
    </use>

    <use xlink:href="#AE" href="#AE" fill="url(#neon)" stroke="#ffffff" stroke-opacity="0.65" stroke-width="0.4" stroke-linejoin="miter"/>

    <rect x="20" y="55" width="190" height="110" fill="url(#cuts)" clip-path="url(#logoClip)"/>

    <g clip-path="url(#s1)">
      <use xlink:href="#AE" href="#AE" fill="#00f6ff" transform="translate(6 0)"/>
    </g>
    <g clip-path="url(#s2)">
      <use xlink:href="#AE" href="#AE" fill="#ff2bd6" transform="translate(-7 0)" opacity="0">
        <animate attributeName="opacity" values="0;0;1;0;0;1;0;0" dur="4s" repeatCount="indefinite"/>
      </use>
    </g>
    <g clip-path="url(#s3)">
      <use xlink:href="#AE" href="#AE" fill="#ffffff" transform="translate(5 0)" opacity="0">
        <animate attributeName="opacity" values="0;0;0;1;0;0;0;1;0" dur="5s" repeatCount="indefinite"/>
      </use>
    </g>
    <g clip-path="url(#s4)">
      <use xlink:href="#AE" href="#AE" fill="#00f6ff" transform="translate(-5 0)" opacity="0">
        <animate attributeName="opacity" values="0;1;0;0;0;0;1;0" dur="3.1s" repeatCount="indefinite"/>
      </use>
    </g>

    <g filter="url(#glowSm)">
      <circle cx="44" cy="146" r="11" fill="#f7ff3c"/>
      <circle cx="44" cy="146" r="17.5" fill="none" stroke="#f7ff3c" stroke-width="0.8" stroke-dasharray="5 4">
        <animateTransform attributeName="transform" type="rotate" from="0 44 146" to="360 44 146" dur="9s" repeatCount="indefinite"/>
      </circle>
      <path d="M44 122 V130 M44 162 V170 M20 146 H28 M60 146 H68" stroke="#f7ff3c" stroke-width="0.8" fill="none"/>
    </g>
  </g>

  <path d="M70 40 H730 L760 70 V530 L730 560 H70 L40 530 V70 Z" transform="translate(3 3)" fill="none" stroke="#ff2bd6" stroke-width="1" opacity="0.5"/>
  <path d="M70 40 H730 L760 70 V530 L730 560 H70 L40 530 V70 Z" fill="none" stroke="#00f6ff" stroke-width="1.6" filter="url(#glowSm)"/>
  <g fill="none" stroke-width="4" stroke-linecap="square" filter="url(#glowSm)">
    <path d="M40 120 V70 L70 40 H120" stroke="#00f6ff"/>
    <path d="M760 480 V530 L730 560 H680" stroke="#ff2bd6"/>
  </g>

  <g font-family="'Courier New', Courier, monospace" font-size="14" letter-spacing="3">
    <text x="74" y="70" fill="#00f6ff" filter="url(#glowSm)">0xAE
      <animate attributeName="opacity" values="1;1;0.35;1;1;0.6;1" dur="6s" repeatCount="indefinite"/>
    </text>
    <text x="712" y="70" fill="#ff2bd6" text-anchor="end" filter="url(#glowSm)">SYS.ONLINE</text>
    <rect x="722" y="60" width="8" height="8" fill="#f7ff3c" filter="url(#glowSm)">
      <animate attributeName="opacity" values="1;1;0;0;1" dur="1.4s" repeatCount="indefinite"/>
    </rect>
    <text x="712" y="542" fill="#00f6ff" text-anchor="end" font-size="12" opacity="0.9">NODE//AE-01</text>
  </g>
  <g filter="url(#glowSm)">
    <rect x="74" y="530" width="6" height="8" fill="#ff2bd6"/>
    <rect x="84" y="526" width="6" height="12" fill="#ff2bd6"/>
    <rect x="94" y="522" width="6" height="16" fill="#ff2bd6"/>
    <rect x="104" y="518" width="6" height="20" fill="#ff2bd6" opacity="0.3"/>
    <rect x="114" y="514" width="6" height="24" fill="#ff2bd6" opacity="0.3"/>
  </g>

  <rect width="800" height="600" fill="url(#scan)"/>
  <rect width="800" height="600" fill="url(#vig)"/>
</svg>`;

export const AE_LOGO_DATA_URI = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(AE_LOGO_SVG)}`;

interface BrandLogoProps {
  className?: string;
}

/** Header logo badge — the AE monogram scene cropped into a rounded square. */
export function BrandLogo({ className }: BrandLogoProps) {
  return (
    <div
      className={cn(
        'relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#0c0618] shadow-lg shadow-fuchsia-500/20 ring-1 ring-cyan-400/40',
        className
      )}
    >
      <img
        src={AE_LOGO_DATA_URI}
        alt="AE logo"
        draggable={false}
        className="h-full w-full scale-[1.55] object-cover select-none"
      />
    </div>
  );
}
