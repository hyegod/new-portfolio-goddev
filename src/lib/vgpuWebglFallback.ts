import type { VgpuShaderId } from "@/components/VgpuCanvas";

export interface VgpuPointerState {
  x: number;
  y: number;
  uvX: number;
  uvY: number;
  prevUvX: number;
  prevUvY: number;
  vx: number;
  vy: number;
  orbitX: number;
  orbitY: number;
  targetOrbitX: number;
  targetOrbitY: number;
  pressed: boolean;
}

export interface WebglFallbackOptions {
  canvas: HTMLCanvasElement;
  shaderId: VgpuShaderId;
  ambient: boolean;
  paperLight?: boolean;
  maxDpr: number;
  reducedMotion: boolean;
  ptr: VgpuPointerState;
  isVisible: () => boolean;
  isPaused: () => boolean;
  getVideoElement: () => HTMLVideoElement | null;
  drawProceduralFeed: (
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    t: number
  ) => void;
}

export interface WebglFallbackHandle {
  dispose: () => void;
}

const VERT_SRC = `
attribute vec2 aPos;
varying vec2 vUv;
varying vec2 vFboUv;
void main() {
  vUv = vec2(aPos.x * 0.5 + 0.5, 0.5 - aPos.y * 0.5);
  vFboUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`;

const PRECISION_HEADER = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
`;

const FRAG_COBALT_FLARE = `${PRECISION_HEADER}
varying vec2 vUv;
uniform vec4 uTimeRes;
uniform vec4 uPointer;
uniform vec4 uControl;

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float sdEquilateralTriangle(vec2 pIn, float r) {
  const float k = 1.7320508;
  vec2 p = pIn;
  p.x = abs(p.x) - r;
  p.y = p.y + r / k;
  if (p.x + k * p.y > 0.0) {
    p = vec2(p.x - k * p.y, -k * p.x - p.y) * 0.5;
  }
  p.x -= clamp(p.x, -2.0 * r, 0.0);
  return -length(p) * sign(p.y);
}

vec3 tonemapACES(vec3 x) {
  return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
}

void main() {
  float t = uTimeRes.x;
  float aspect = uTimeRes.w;
  float ambient = uControl.x;

  vec2 p = vUv * 2.0 - 1.0;
  p.y = -p.y;
  p.x *= aspect;

  vec2 autoLight = vec2(cos(t * 0.55) * 0.58 * aspect, sin(t * 0.42) * 0.36 + 0.12);
  vec2 ptrPos = vec2(uPointer.x * aspect * 0.9, -uPointer.y * 0.85);
  float ptrActivity = clamp(length(uPointer.xy) * 1.4, 0.0, 1.0);
  vec2 lightPos = mix(autoLight, ptrPos, mix(0.35, 0.92, ptrActivity));

  float gridScale = mix(36.0, 26.0, ambient);
  vec2 gCell = fract(p * gridScale) - 0.5;
  float ledDot = smoothstep(0.28, 0.04, length(gCell));

  vec3 col = vec3(0.025, 0.031, 0.048);

  if (ambient < 0.5) {
    vec2 triCenter = vec2(0.0, 0.06);
    float triScale = 0.54;
    float dTri = sdEquilateralTriangle(p - triCenter, triScale);
    float edgeDist = abs(dTri);

    float edgeCore = exp(-edgeDist * 55.0) * 1.85;
    float edgeHalo = exp(-edgeDist * 9.5) * 0.62;
    float directionalBoost = 0.45 + 0.85 * pow(max(0.0, 1.0 - length(p - lightPos) * 0.62), 2.0);

    float jitter = hash12(vUv * uTimeRes.yz + fract(t * 17.3));
    float scatter = 0.0;
    for (int i = 0; i < 20; i++) {
      float f = (float(i) + jitter) / 20.0;
      vec2 sp = mix(p, lightPos, f * 0.82);
      float sd = sdEquilateralTriangle(sp - triCenter, triScale);
      float rim = exp(-abs(sd) * 18.0);
      float occ = smoothstep(-0.02, 0.04, sd);
      scatter += (rim * 0.095 + occ * 0.018) * (1.0 - f * 0.6);
    }

    float floorMask = smoothstep(0.02, -0.58, p.y + 0.34);
    vec2 reflP = vec2(p.x, -(p.y + 0.72) * 1.65);
    float reflDist = abs(sdEquilateralTriangle(reflP - triCenter, triScale));
    float floorGlow = exp(-reflDist * 5.2) * floorMask * 0.55;

    vec3 cobalt = vec3(0.04, 0.28, 1.0);
    vec3 electric = vec3(0.36, 0.64, 1.0);
    vec3 bone = vec3(0.95, 0.97, 1.0);

    float flareDist = length(p - lightPos);
    float flare = exp(-flareDist * 3.8) * 0.85 + exp(-flareDist * 16.0) * 1.1;
    float anamorphic = exp(-abs(p.y - lightPos.y) * 28.0) * exp(-abs(p.x - lightPos.x) * 1.6) * 0.48;

    col += cobalt * (edgeHalo * directionalBoost + scatter * 1.35 + floorGlow);
    col += electric * (flare * 0.85 + anamorphic + ledDot * (edgeHalo * 0.8 + flare * 0.45));
    col += bone * (edgeCore * directionalBoost * 0.9 + exp(-flareDist * 26.0) * 0.75);

    float inside = smoothstep(0.01, -0.015, dTri);
    col = mix(col, vec3(0.02, 0.03, 0.055) + cobalt * (ledDot * 0.14 * directionalBoost), inside * 0.78);
  } else {
    float d1 = length(p - lightPos);
    float d2 = length(p - vec2(-0.48 * aspect, -0.35));

    float arcY = -0.32 + 0.18 * (p.x * p.x) / max(1.0, aspect * aspect);
    float arcGlow = exp(-abs(p.y - arcY) * 14.0) * (0.28 + 0.55 * exp(-d1 * 1.35));

    vec3 cobalt = vec3(0.02, 0.24, 1.0);
    vec3 sky = vec3(0.32, 0.56, 1.0);
    float flare = exp(-d1 * 1.95) * 0.48 + exp(-d2 * 1.75) * 0.22;
    float anamorphic = exp(-abs(p.y - lightPos.y) * 18.0) * exp(-abs(p.x - lightPos.x) * 1.2) * 0.22;

    col += cobalt * (flare * 0.95 + arcGlow * 0.85);
    col += sky * (anamorphic + ledDot * (flare * 0.55 + arcGlow * 0.5));
  }

  float vig = 1.0 - dot(vUv - 0.5, vUv - 0.5) * 0.72;
  gl_FragColor = vec4(tonemapACES(col * vig), 1.0);
}
`;

// RGBA8-safe encoded ping-pong fluid solver:
// Exact zero center at 128.0/255.0 eliminates 8-bit rounding drift; b & a store cobalt & highlight dye [0, 1]
const FRAG_FLUID_SIM = `${PRECISION_HEADER}
varying vec2 vFboUv;
uniform vec4 uTimeRes;
uniform vec4 uPointer;
uniform vec4 uControl;
uniform sampler2D uPrevTex;

const float VEL_ZERO = 128.0 / 255.0;
const float VEL_RANGE = 2.4;

vec2 hash22(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.xx + p3.yz) * p3.zy) - 0.5;
}

float noise2(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 w = f * f * (3.0 - 2.0 * f);
  float a = dot(hash22(i), f);
  float b = dot(hash22(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0));
  float c = dot(hash22(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0));
  float d = dot(hash22(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0));
  return mix(mix(a, b, w.x), mix(c, d, w.x), w.y);
}

vec2 curlVelocity(vec2 p, float t) {
  const float e = 0.04;
  float n1 = noise2(p * 3.1 + vec2(t * 0.24, -t * 0.18));
  float nx = noise2((p + vec2(e, 0.0)) * 3.1 + vec2(t * 0.24, -t * 0.18));
  float ny = noise2((p + vec2(0.0, e)) * 3.1 + vec2(t * 0.24, -t * 0.18));
  return vec2((ny - n1) / e, -(nx - n1) / e);
}

void main() {
  float t = uTimeRes.x;
  float dt = clamp(uTimeRes.w, 0.004, 0.033);
  float aspect = uTimeRes.y / max(1.0, uTimeRes.z);

  vec4 prev = texture2D(uPrevTex, vFboUv);
  vec2 prevVel = (prev.rg - VEL_ZERO) * VEL_RANGE;

  vec2 curl = curlVelocity(vec2(vFboUv.x * aspect, vFboUv.y), t) * 0.24;
  vec2 vel = prevVel + curl * dt;

  vec2 backUv = clamp(vFboUv - vel * dt * 0.55, vec2(0.003), vec2(0.997));
  vec4 advected = texture2D(uPrevTex, backUv);

  vec2 px = vec2(1.0 / max(1.0, uTimeRes.y), 1.0 / max(1.0, uTimeRes.z));
  vec4 blur = (
    texture2D(uPrevTex, backUv + vec2(px.x, 0.0)) +
    texture2D(uPrevTex, backUv - vec2(px.x, 0.0)) +
    texture2D(uPrevTex, backUv + vec2(0.0, px.y)) +
    texture2D(uPrevTex, backUv - vec2(0.0, px.y))
  ) * 0.25;

  vec4 state = mix(advected, blur, 0.12);
  vec2 sVel = (state.rg - VEL_ZERO) * VEL_RANGE * 0.965;
  float dyeB = state.b * 0.972;
  float dyeA = state.a * 0.962;

  // Autonomous twin orbital emitter jets constrained to visible cover slice (uControl.y = visX, uControl.z = visY)
  float visX = max(0.25, uControl.y);
  float visY = max(0.25, uControl.z);
  vec2 jet1 = vec2(0.5 + cos(t * 0.78) * 0.26 * visX, 0.5 + sin(t * 1.02) * 0.22 * visY);
  vec2 jet2 = vec2(0.5 + cos(t * 0.62 + 3.14) * 0.28 * visX, 0.5 + sin(t * 0.86 + 1.57) * 0.24 * visY);
  float j1d = length((vFboUv - jet1) * vec2(aspect, 1.0));
  float j2d = length((vFboUv - jet2) * vec2(aspect, 1.0));
  float j1Spl = exp(-j1d * j1d * 420.0);
  float j2Spl = exp(-j2d * j2d * 420.0);

  vec2 j1Dir = vec2(-sin(t * 0.78), cos(t * 1.02)) * 0.58;
  vec2 j2Dir = vec2(-sin(t * 0.62 + 3.14), cos(t * 0.86 + 1.57)) * 0.58;

  sVel += (j1Dir * j1Spl + j2Dir * j2Spl) * dt * 6.5;
  dyeB = clamp(dyeB + (j1Spl * 0.82 + j2Spl * 0.34) * dt * 6.0, 0.0, 1.0);
  dyeA = clamp(dyeA + (j2Spl * 0.65 + j1Spl * 0.22) * dt * 5.2, 0.0, 1.0);

  // Interactive pointer / touch fluid stir
  float pSpeed = length(uPointer.zw);
  float stirFactor = max(uControl.x * 0.85, smoothstep(0.0005, 0.008, pSpeed));
  if (stirFactor > 0.01) {
    vec2 pPos = uPointer.xy;
    vec2 dVec = (vFboUv - pPos) * vec2(aspect, 1.0);
    float splat = exp(-dot(dVec, dVec) * 260.0) * stirFactor;
    vec2 impulse = clamp(uPointer.zw * 22.0, vec2(-1.1), vec2(1.1));
    sVel += impulse * splat;
    dyeB = clamp(dyeB + splat * (0.95 + pSpeed * 12.0) * dt * 7.5, 0.0, 1.0);
    dyeA = clamp(dyeA + splat * (0.72 + uControl.x * 0.4) * dt * 6.5, 0.0, 1.0);
  }

  vec2 encVel = clamp(sVel / VEL_RANGE + VEL_ZERO, vec2(0.0), vec2(1.0));
  gl_FragColor = vec4(encVel, dyeB, dyeA);
}
`;

const FRAG_FLUID_DISPLAY = `${PRECISION_HEADER}
varying vec2 vFboUv;
uniform vec4 uTimeRes;
uniform float uPaperLight;
uniform sampler2D uFluidTex;

const float VEL_ZERO = 128.0 / 255.0;

vec3 tonemapACES(vec3 x) {
  return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
}

void main() {
  float viewAspect = uTimeRes.w;
  vec2 coverScale = viewAspect < 1.0 ? vec2(viewAspect, 1.0) : vec2(1.0, 1.0 / max(viewAspect, 0.001));
  vec2 uv = vec2(0.5) + (vFboUv - vec2(0.5)) * coverScale;
  vec2 px = vec2(2.0 / 256.0, 2.0 / 256.0);
  vec4 c = texture2D(uFluidTex, uv);
  vec4 cx = texture2D(uFluidTex, uv + vec2(px.x, 0.0));
  vec4 cy = texture2D(uFluidTex, uv + vec2(0.0, px.y));

  float cB = pow(c.b, 1.15) * 1.45;
  float cA = pow(c.a, 1.25) * 1.15;
  float density = cB + cA * 0.8;
  float gx = ((cx.b + cx.a) - (c.b + c.a)) * 1.4;
  float gy = ((cy.b + cy.a) - (c.b + c.a)) * 1.4;
  vec3 normal = normalize(vec3(-gx * 14.0, -gy * 14.0, 1.0));
  float spec = pow(max(0.0, dot(normal, normalize(vec3(0.35, 0.55, 0.75)))), 18.0);

  float speed = length((c.rg - VEL_ZERO) * 2.4);

  if (uPaperLight > 0.5) {
    // Bright Exposed Concrete (#ECEEF0) drafting surface + Electric Cobalt & Ink streamlines
    vec3 paper = mix(
      vec3(0.952, 0.958, 0.966),
      vec3(0.916, 0.925, 0.937),
      smoothstep(0.05, 0.95, length(vFboUv - 0.5) * 1.35)
    );
    vec2 gridUv = fract(gl_FragCoord.xy / 40.0);
    float gridLine = max(step(gridUv.x, 0.025), step(gridUv.y, 0.025));
    paper = mix(paper, vec3(0.835, 0.855, 0.895), gridLine * 0.36);

    float amount = 1.0 - exp(-density * 1.35);
    vec3 electricCobalt = vec3(0.0, 0.22, 1.0);
    vec3 surveyIce = vec3(0.30, 0.54, 1.0);
    vec3 deepInk = vec3(0.045, 0.068, 0.16);

    vec3 pigment = mix(electricCobalt, surveyIce, smoothstep(0.15, 0.95, cA / max(density, 0.01)) * 0.52);
    pigment = mix(pigment, deepInk, smoothstep(0.28, 0.92, speed * 0.65 + cB * 0.45) * 0.68);

    float contour = abs(fract(density * 3.2) - 0.5);
    float line = smoothstep(0.036, 0.01, contour) * smoothstep(0.18, 0.72, amount);

    vec3 col = mix(paper, pigment, smoothstep(0.02, 0.86, amount) * 0.92);
    col = mix(col, vec3(0.68, 0.82, 1.0), spec * 0.32 * amount);
    col = mix(col, vec3(0.96, 0.98, 1.0), line * 0.24);
    gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
    return;
  }

  vec3 obsidian = vec3(0.022, 0.028, 0.045);
  vec3 cobalt = vec3(0.0, 0.24, 1.0);
  vec3 ice = vec3(0.32, 0.68, 1.0);
  vec3 jade = vec3(0.18, 0.88, 0.68);
  vec3 bone = vec3(0.95, 0.97, 1.0);

  vec3 col = obsidian;
  col += cobalt * (cB * 1.25);
  col += mix(ice, jade, smoothstep(0.15, 0.95, speed)) * (cA * 0.82);
  col += bone * (spec * 0.45 * smoothstep(0.08, 0.55, density));

  float contour = abs(fract(density * 5.0) - 0.5);
  float line = smoothstep(0.035, 0.008, contour) * smoothstep(0.14, 0.65, density);
  col += ice * line * 0.14;

  gl_FragColor = vec4(tonemapACES(col), 1.0);
}
`;

const FRAG_RADIANCE_CASCADES = `${PRECISION_HEADER}
varying vec2 vUv;
uniform vec4 uTimeRes;
uniform vec4 uPointer;
uniform vec4 uControl;

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float sdBox(vec2 p, vec2 b) {
  vec2 d = abs(p) - b;
  return length(max(d, vec2(0.0))) + min(max(d.x, d.y), 0.0);
}

float mapOccluders(vec2 p) {
  float d = 10.0;
  d = min(d, sdBox(p - vec2(-0.42, 0.08), vec2(0.045, 0.34)));
  d = min(d, sdBox(p - vec2(0.42, -0.06), vec2(0.045, 0.32)));
  d = min(d, sdBox(p - vec2(-0.08, 0.42), vec2(0.22, 0.038)));
  d = min(d, sdBox(p - vec2(0.12, -0.44), vec2(0.24, 0.038)));
  d = min(d, length(p - vec2(-0.88, -0.28)) - 0.095);
  d = min(d, length(p - vec2(0.86, 0.32)) - 0.095);
  d = min(d, length(p - vec2(0.0, 0.02)) - 0.085);
  return d;
}

vec4 evalEmitters(vec2 p, vec2 lightA, vec2 lightB, vec2 lightC) {
  float dA = length(p - lightA) - 0.048;
  float dB = length(p - lightB) - 0.036;
  float dC = length(p - lightC) - 0.036;

  vec3 cA = vec3(0.18, 0.48, 2.8);
  vec3 cB = vec3(0.65, 0.88, 1.85);
  vec3 cC = vec3(0.22, 1.55, 1.15);

  vec3 emit = vec3(0.0);
  if (dA < 0.008) emit += cA;
  if (dB < 0.008) emit += cB;
  if (dC < 0.008) emit += cC;
  return vec4(emit, min(dA, min(dB, dC)));
}

vec3 tonemapACES(vec3 x) {
  return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
}

void main() {
  float t = uTimeRes.x;
  float aspect = uTimeRes.w;

  vec2 p = vUv * 2.0 - 1.0;
  p.y = -p.y;
  p.x *= aspect;

  vec2 autoA = vec2(cos(t * 0.6) * 0.62, sin(t * 0.85) * 0.44);
  vec2 ptrPos = vec2(uPointer.x * aspect * 0.92, -uPointer.y * 0.88);
  float hasPtr = clamp(length(uPointer.xy) * 2.0, 0.0, 1.0);
  vec2 lightA = mix(autoA, ptrPos, hasPtr);
  vec2 lightB = vec2(-0.78 * cos(t * 0.35), 0.54 * sin(t * 0.47));
  vec2 lightC = vec2(0.75 * sin(t * 0.42), -0.52 * cos(t * 0.38));

  float occDist = mapOccluders(p);
  vec4 selfEmit = evalEmitters(p, lightA, lightB, lightC);

  float grid = max(
    smoothstep(0.012, 0.0, abs(fract(p.x * 4.0) - 0.5)),
    smoothstep(0.012, 0.0, abs(fract(p.y * 4.0) - 0.5))
  );

  float jitter = hash12(vUv * uTimeRes.yz + fract(t * 11.7));
  vec3 radiance = vec3(0.0);

  if (occDist > 0.0) {
    for (int i = 0; i < 20; i++) {
      float angle = (float(i) + jitter) * (6.2831853 / 20.0);
      vec2 dir = vec2(cos(angle), sin(angle));
      float dist = 0.01;
      for (int s = 0; s < 20; s++) {
        vec2 sp = p + dir * dist;
        float dO = mapOccluders(sp);
        vec4 em = evalEmitters(sp, lightA, lightB, lightC);

        if (em.w < 0.012) {
          float atten = 1.0 / (1.0 + dist * dist * 2.2);
          radiance += em.rgb * atten;
          break;
        }
        if (dO < 0.004) {
          float bounce = 0.06 / (1.0 + dist * 2.5);
          radiance += vec3(0.08, 0.16, 0.34) * bounce;
          break;
        }
        dist += min(dO, max(0.012, em.w));
        if (dist > 2.6) break;
      }
    }
    radiance = (radiance / 20.0) * 3.8;
  }

  vec3 col = vec3(0.024, 0.029, 0.044) + vec3(0.04, 0.06, 0.11) * grid;
  col += radiance;
  col += selfEmit.rgb * smoothstep(0.04, -0.01, selfEmit.w);

  float wallMask = smoothstep(0.008, -0.006, occDist);
  float wallRim = exp(-abs(occDist) * 110.0) * (0.35 + length(radiance) * 0.45);
  vec3 wallCol = vec3(0.06, 0.072, 0.105) + vec3(0.24, 0.52, 1.0) * wallRim;
  col = mix(col, wallCol, wallMask);

  gl_FragColor = vec4(tonemapACES(col), 1.0);
}
`;

const FRAG_PARTICLES_OCEAN = `${PRECISION_HEADER}
varying vec2 vUv;
uniform vec4 uTimeRes;
uniform vec4 uPointer;
uniform vec4 uControl;
uniform float uPaperLight;

float hash21(vec2 p) {
  vec2 p2 = fract(p * vec2(123.34, 456.21));
  p2 += dot(p2, p2 + 45.32);
  return fract(p2.x * p2.y);
}

float waveHeight(vec2 xz, float t) {
  float h = 0.0;
  h += sin(dot(xz, vec2(0.85, 0.52)) * 1.45 - t * 1.35) * 0.28;
  h += sin(dot(xz, vec2(-0.62, 0.78)) * 2.15 - t * 1.75) * 0.18;
  h += sin(dot(xz, vec2(0.32, -0.94)) * 3.4 - t * 2.3) * 0.09;
  h += cos(dot(xz, vec2(-0.91, -0.41)) * 4.8 + t * 2.8) * 0.05;
  return h;
}

vec3 tonemapACES(vec3 x) {
  return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
}

void main() {
  float t = uTimeRes.x;
  float aspect = uTimeRes.w;

  vec2 p = vUv * 2.0 - 1.0;
  p.y = -p.y;
  p.x *= aspect;

  float yaw = uControl.y * 0.55 + uPointer.x * 0.25 + sin(t * 0.16) * 0.14;
  float pitch = clamp(-0.22 - uControl.z * 0.25 - uPointer.y * 0.14, -0.58, 0.12);

  float cy = cos(yaw);
  float sy = sin(yaw);
  float cp = cos(pitch);
  float sp = sin(pitch);

  vec3 rd = normalize(vec3(p.x, p.y, 1.45));
  vec3 ry = vec3(rd.x, rd.y * cp - rd.z * sp, rd.y * sp + rd.z * cp);
  rd = vec3(ry.x * cy + ry.z * sy, ry.y, -ry.x * sy + ry.z * cy);

  vec3 ro = vec3(0.0, 2.35, -t * 0.85);

  float horizonGlow = exp(-abs(rd.y) * 7.5);
  vec3 skyCol = uPaperLight > 0.5
    ? mix(vec3(0.925, 0.933, 0.941), vec3(0.86, 0.89, 0.96), horizonGlow * 0.55)
    : mix(vec3(0.018, 0.024, 0.042), vec3(0.04, 0.18, 0.58), horizonGlow * 0.65);
  vec3 col = skyCol;

  if (rd.y > 0.01 && uPaperLight < 0.5) {
    vec2 starCell = floor(rd.xz / max(0.08, rd.y) * 32.0);
    float st = hash21(starCell);
    if (st > 0.992) {
      col += vec3(0.55, 0.78, 1.0) * smoothstep(0.01, 0.22, rd.y) * 0.75;
    }
  }

  if (rd.y < -0.008) {
    vec3 accum = vec3(0.0);
    float inkAccum = 0.0;
    float crestAccum = 0.0;
    float dist = 1.6;
    for (int s = 0; s < 30; s++) {
      vec3 pos = ro + rd * dist;
      float wh = waveHeight(pos.xz, t);
      float diff = pos.y - wh;

      if (abs(diff) < 0.22) {
        vec2 g = pos.xz * 3.2;
        vec2 id = floor(g);
        vec2 f = fract(g) - 0.5;
        float rnd = hash21(id);
        vec2 jitter = vec2(rnd - 0.5, hash21(id + 17.1) - 0.5) * 0.36;
        float dDot = length(f - jitter);

        float fade = exp(-dist * 0.068);
        float crest = smoothstep(-0.22, 0.42, wh);
        float sparkle = smoothstep(0.16, 0.02, dDot) * exp(-abs(diff) * 14.0);

        if (uPaperLight > 0.5) {
          inkAccum += sparkle * fade * (1.35 + crest * 1.1);
          crestAccum += sparkle * fade * crest;
        } else {
          vec3 deepCobalt = vec3(0.02, 0.26, 1.0);
          vec3 crestIce = vec3(0.56, 0.82, 1.0);
          vec3 bone = vec3(0.95, 0.98, 1.0);
          vec3 pCol = mix(deepCobalt, mix(crestIce, bone, crest * 0.65), crest);
          accum += pCol * sparkle * fade * (1.25 + crest * 1.4);
        }
      }

      if (diff < -0.24) break;
      dist += max(0.24, diff * 0.55 + dist * 0.034);
      if (dist > 44.0) break;
    }

    float seaDist = -ro.y / min(-0.01, rd.y);
    vec3 seaPos = ro + rd * min(seaDist, 42.0);
    float h0 = waveHeight(seaPos.xz, t);
    float hx = waveHeight(seaPos.xz + vec2(0.12, 0.0), t);
    float hz = waveHeight(seaPos.xz + vec2(0.0, 0.12), t);
    vec3 n = normalize(vec3(h0 - hx, 0.12, h0 - hz));
    float fresnel = pow(1.0 - max(0.0, dot(n, -rd)), 4.0);

    if (uPaperLight > 0.5) {
      vec3 concreteFloor = mix(vec3(0.895, 0.905, 0.92), vec3(0.82, 0.86, 0.94), fresnel * 0.45);
      float inkAlpha = clamp(inkAccum * 0.72, 0.0, 0.94);
      vec3 dotColor = mix(vec3(0.05, 0.08, 0.18), vec3(0.0, 0.22, 1.0), clamp(crestAccum * 1.4, 0.0, 1.0));
      vec3 lightSurface = mix(concreteFloor, dotColor, inkAlpha);
      col = mix(col, lightSurface, smoothstep(-0.008, -0.08, rd.y));
      gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
      return;
    }

    vec3 surfaceTint = vec3(0.02, 0.12, 0.42) * fresnel * exp(-seaDist * 0.045);
    col = mix(col, surfaceTint + accum * 0.72, smoothstep(-0.008, -0.08, rd.y));
  }

  gl_FragColor = vec4(uPaperLight > 0.5 ? clamp(col, 0.0, 1.0) : tonemapACES(col), 1.0);
}
`;

const FRAG_BLACK_HOLE = `${PRECISION_HEADER}
varying vec2 vUv;
uniform vec4 uTimeRes;
uniform vec4 uPointer;
uniform vec4 uControl;

float hash31(vec3 pIn) {
  vec3 p = fract(pIn * 0.1031);
  p += dot(p, p.zyx + 31.32);
  return fract((p.x + p.y) * p.z);
}

float diskNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u2 = f * f * (3.0 - 2.0 * f);
  float a = hash31(vec3(i, 1.0));
  float b = hash31(vec3(i + vec2(1.0, 0.0), 1.0));
  float c = hash31(vec3(i + vec2(0.0, 1.0), 1.0));
  float d = hash31(vec3(i + vec2(1.0, 1.0), 1.0));
  return mix(mix(a, b, u2.x), mix(c, d, u2.x), u2.y);
}

float fbmDisk(vec2 pIn) {
  vec2 p = pIn;
  float v = 0.0;
  float amp = 0.5;
  mat2 rot = mat2(1.6, 1.2, -1.2, 1.6);
  for (int i = 0; i < 4; i++) {
    v += amp * diskNoise(p);
    p = rot * p;
    amp *= 0.5;
  }
  return v;
}

vec3 tonemapACES(vec3 x) {
  return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
}

void main() {
  float t = uTimeRes.x;
  float aspect = uTimeRes.w;

  vec2 p = vUv * 2.0 - 1.0;
  p.y = -p.y;
  p.x *= aspect;

  float yaw = uControl.y * 1.15 + uPointer.x * 0.35 + t * 0.12;
  float pitch = clamp(0.26 + uControl.z * 0.55 - uPointer.y * 0.22, -0.75, 0.85);
  float camDist = 6.2;

  vec3 ro = vec3(
    camDist * cos(pitch) * sin(yaw),
    camDist * sin(pitch),
    camDist * cos(pitch) * cos(yaw)
  );
  vec3 fwd = normalize(-ro);
  vec3 right = normalize(cross(vec3(0.0, 1.0, 0.0), fwd));
  vec3 up = cross(fwd, right);
  vec3 rd = normalize(fwd * 1.55 + right * p.x + up * p.y);

  vec3 pos = ro;
  vec3 accum = vec3(0.0);
  float transmittance = 1.0;
  bool hitHorizon = false;
  const float rs = 1.05;

  for (int i = 0; i < 56; i++) {
    float r = length(pos);
    if (r < rs) {
      hitHorizon = true;
      break;
    }
    if (r > 18.0) break;

    vec3 accel = -pos * (1.58 / max(0.35, r * r * r));
    float stepSize = clamp(r * 0.095, 0.06, 0.38);
    rd = normalize(rd + accel * stepSize);
    vec3 nextPos = pos + rd * stepSize;

    if (pos.y * nextPos.y <= 0.0 || abs(pos.y) < 0.09) {
      float radial = length(pos.xz);
      if (radial > 1.52 && radial < 5.6) {
        float angle = atan(pos.z, pos.x);
        float omega = 2.6 / pow(radial, 1.15);
        float swirl = fbmDisk(vec2(radial * 2.4, angle * 3.0 + t * omega));
        float rings = 0.55 + 0.45 * sin(radial * 8.5 - t * 2.2 + swirl * 4.0);
        float radialEnv = smoothstep(1.52, 2.05, radial) * smoothstep(5.6, 2.6, radial);
        float thinness = exp(-abs(pos.y) * 18.0);

        vec3 tangent = normalize(vec3(-pos.z, 0.0, pos.x));
        float doppler = clamp(dot(tangent, rd) * 0.5 + 0.5, 0.0, 1.0);
        float beam = 0.48 + 1.35 * doppler * doppler;

        vec3 hotSilver = vec3(0.84, 0.87, 0.92);
        vec3 coreWhite = vec3(0.98, 0.99, 1.0);
        vec3 dimSilver = vec3(0.36, 0.39, 0.45);
        vec3 diskCol = mix(dimSilver, mix(hotSilver, coreWhite, doppler * 0.76), smoothstep(0.12, 0.88, doppler));

        float density = radialEnv * thinness * (0.35 + swirl * 0.85) * rings * stepSize * 1.45;
        accum += diskCol * beam * density * transmittance;
        transmittance *= exp(-density * 0.65);
      }
    }

    float photonGlow = exp(-abs(r - 1.56) * 14.0) * stepSize * 0.34;
    accum += vec3(0.85, 0.88, 0.94) * photonGlow * transmittance;

    pos = nextPos;
  }

  if (!hitHorizon) {
    vec3 starGrid = floor(rd * 165.0);
    float st = hash31(starGrid);
    if (st > 0.992) {
      float starBright = (st - 0.992) / 0.008;
      accum += vec3(0.75, 0.88, 1.0) * starBright * 1.4 * transmittance;
    }
    accum += vec3(0.014, 0.022, 0.044) * transmittance;
  }

  gl_FragColor = vec4(tonemapACES(accum), 1.0);
}
`;

const FRAG_VIDEO_TEXTURE = `${PRECISION_HEADER}
varying vec2 vUv;
uniform vec4 uTimeRes;
uniform vec4 uPointer;
uniform vec4 uControl;
uniform sampler2D uVideoTex;

mat2 rot2(float a) {
  float s = sin(a);
  float c = cos(a);
  return mat2(c, -s, s, c);
}

float sdRoundBox(vec3 p, vec3 b, float r) {
  vec3 q = abs(p) - b;
  return length(max(q, vec3(0.0))) + min(max(q.x, max(q.y, q.z)), 0.0) - r;
}

vec3 toObj(vec3 pIn, float yaw, float pitch) {
  vec3 p = pIn;
  vec2 rY = rot2(yaw) * p.xz;
  p = vec3(rY.x, p.y, rY.y);
  vec2 rX = rot2(pitch) * p.yz;
  p = vec3(p.x, rX.x, rX.y);
  return p;
}

float mapBox(vec3 p, float yaw, float pitch) {
  vec3 q = toObj(p, yaw, pitch);
  return sdRoundBox(q, vec3(0.98, 0.62, 0.16), 0.045);
}

vec3 calcNormal(vec3 p, float yaw, float pitch) {
  const float e = 0.0025;
  return normalize(vec3(
    mapBox(p + vec3(e, 0.0, 0.0), yaw, pitch) - mapBox(p - vec3(e, 0.0, 0.0), yaw, pitch),
    mapBox(p + vec3(0.0, e, 0.0), yaw, pitch) - mapBox(p - vec3(0.0, e, 0.0), yaw, pitch),
    mapBox(p + vec3(0.0, 0.0, e), yaw, pitch) - mapBox(p - vec3(0.0, 0.0, e), yaw, pitch)
  ));
}

vec3 tonemapACES(vec3 x) {
  return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
}

void main() {
  float t = uTimeRes.x;
  float aspect = uTimeRes.w;

  vec2 p = vUv * 2.0 - 1.0;
  p.y = -p.y;
  p.x *= aspect;

  float yaw = uControl.y * 1.2 + uPointer.x * 0.45 + sin(t * 0.48) * 0.38;
  float pitch = clamp(uControl.z * 0.6 - uPointer.y * 0.25 + cos(t * 0.36) * 0.12, -0.75, 0.75);

  vec3 ro = vec3(0.0, 0.0, 2.75);
  vec3 rd = normalize(vec3(p, -1.65));

  float backGlow = exp(-length(p) * 1.65) * 0.35;
  vec3 col = vec3(0.024, 0.03, 0.048) + vec3(0.02, 0.24, 1.0) * backGlow;

  float dist = 0.0;
  bool hit = false;
  for (int i = 0; i < 42; i++) {
    vec3 pos = ro + rd * dist;
    float d = mapBox(pos, yaw, pitch);
    if (d < 0.0025) {
      hit = true;
      break;
    }
    dist += d;
    if (dist > 8.0) break;
  }

  if (hit) {
    vec3 pos = ro + rd * dist;
    vec3 q = toObj(pos, yaw, pitch);
    vec2 sampleUv = clamp(vec2(q.x / 1.96 + 0.5, 0.5 - q.y / 1.24), vec2(0.01), vec2(0.99));
    vec3 texCol = texture2D(uVideoTex, sampleUv).rgb;

    vec3 n = calcNormal(pos, yaw, pitch);
    float fresnel = pow(1.0 - max(0.0, dot(n, -rd)), 3.2);
    vec3 lightDir = normalize(vec3(0.55, 0.65, 0.85));
    float spec = pow(max(0.0, dot(reflect(-lightDir, n), -rd)), 28.0);

    float isFrontOrBack = smoothstep(0.12, 0.17, abs(q.z));
    vec3 edgeCobalt = vec3(0.12, 0.42, 1.0) * (0.45 + fresnel * 1.45);
    vec3 faceCol = texCol * (0.95 + spec * 0.25) + vec3(0.28, 0.56, 1.0) * fresnel * 0.65;

    col = mix(edgeCobalt * 0.7, faceCol, isFrontOrBack) + vec3(0.85, 0.93, 1.0) * spec * 0.45;
  }

  gl_FragColor = vec4(tonemapACES(col), 1.0);
}
`;

function compileShader(
  gl: WebGLRenderingContext,
  type: number,
  source: string
): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function createProgram(
  gl: WebGLRenderingContext,
  fragSrc: string
): WebGLProgram | null {
  const vs = compileShader(gl, gl.VERTEX_SHADER, VERT_SRC);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, fragSrc);
  if (!vs || !fs) {
    if (vs) gl.deleteShader(vs);
    if (fs) gl.deleteShader(fs);
    return null;
  }
  const prog = gl.createProgram();
  if (!prog) {
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    return null;
  }
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    gl.deleteProgram(prog);
    return null;
  }
  return prog;
}

function createRgbaTexture(
  gl: WebGLRenderingContext,
  width: number,
  height: number,
  initialData: Uint8Array | null
): WebGLTexture | null {
  const tex = gl.createTexture();
  if (!tex) return null;
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    width,
    height,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    initialData
  );
  gl.bindTexture(gl.TEXTURE_2D, null);
  return tex;
}

export function startWebglShaderFallback(
  options: WebglFallbackOptions
): WebglFallbackHandle | null {
  const {
    canvas,
    shaderId,
    ambient,
    paperLight = false,
    maxDpr,
    reducedMotion,
    ptr,
    isVisible,
    isPaused,
    getVideoElement,
    drawProceduralFeed,
  } = options;

  const ctxAttrs: WebGLContextAttributes = {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: ambient ? "low-power" : "default",
    preserveDrawingBuffer: false,
  };

  const gl =
    (canvas.getContext("webgl2", ctxAttrs) as WebGLRenderingContext | null) ??
    (canvas.getContext("webgl", ctxAttrs) as WebGLRenderingContext | null) ??
    (canvas.getContext("experimental-webgl", ctxAttrs) as
      | WebGLRenderingContext
      | null);

  if (!gl) return null;

  const isCoarsePointer =
    typeof window !== "undefined" &&
    window.matchMedia("(pointer: coarse)").matches;
  const effectiveMaxDpr = isCoarsePointer ? Math.min(maxDpr, 1.35) : Math.min(maxDpr, 1.75);

  // Fullscreen triangle covering clip space (-1..1)
  const quadBuf = gl.createBuffer();
  if (!quadBuf) return null;
  gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 3, -1, -1, 3]),
    gl.STATIC_DRAW
  );

  const programs: WebGLProgram[] = [];
  const textures: WebGLTexture[] = [];
  const framebuffers: WebGLFramebuffer[] = [];

  const bindQuad = (prog: WebGLProgram) => {
    const loc = gl.getAttribLocation(prog, "aPos");
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  };

  let simProg: WebGLProgram | null = null;
  let dispProg: WebGLProgram | null = null;
  let mainProg: WebGLProgram | null = null;

  // Fluid ping-pong state (RGBA8 works on 100% of phones/tablets without float FBO extensions)
  const simSize = isCoarsePointer ? 320 : 448;
  const ppTex: WebGLTexture[] = [];
  const ppFbo: WebGLFramebuffer[] = [];
  let readIdx = 0;

  // Video-to-texture state
  const videoW = 512;
  const videoH = 320;
  let videoTex: WebGLTexture | null = null;
  let feedCanvas: HTMLCanvasElement | null = null;
  let feedCtx: CanvasRenderingContext2D | null = null;

  const cleanupResources = () => {
    for (const p of programs) gl.deleteProgram(p);
    for (const t of textures) gl.deleteTexture(t);
    for (const f of framebuffers) gl.deleteFramebuffer(f);
    gl.deleteBuffer(quadBuf);
  };

  if (shaderId === "fluid") {
    simProg = createProgram(gl, FRAG_FLUID_SIM);
    dispProg = createProgram(gl, FRAG_FLUID_DISPLAY);
    if (!simProg || !dispProg) {
      cleanupResources();
      return null;
    }
    programs.push(simProg, dispProg);

    // Initialize neutral velocity (128, 128) and zero dye (0, 0)
    const initPixels = new Uint8Array(simSize * simSize * 4);
    for (let i = 0; i < initPixels.length; i += 4) {
      initPixels[i] = 128;
      initPixels[i + 1] = 128;
      initPixels[i + 2] = 0;
      initPixels[i + 3] = 0;
    }

    for (let k = 0; k < 2; k++) {
      const tex = createRgbaTexture(gl, simSize, simSize, initPixels);
      const fbo = gl.createFramebuffer();
      if (!tex || !fbo) {
        cleanupResources();
        return null;
      }
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.framebufferTexture2D(
        gl.FRAMEBUFFER,
        gl.COLOR_ATTACHMENT0,
        gl.TEXTURE_2D,
        tex,
        0
      );
      if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        cleanupResources();
        return null;
      }
      ppTex.push(tex);
      ppFbo.push(fbo);
      textures.push(tex);
      framebuffers.push(fbo);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  } else if (shaderId === "video-texture") {
    mainProg = createProgram(gl, FRAG_VIDEO_TEXTURE);
    if (!mainProg) {
      cleanupResources();
      return null;
    }
    programs.push(mainProg);

    feedCanvas = document.createElement("canvas");
    feedCanvas.width = videoW;
    feedCanvas.height = videoH;
    feedCtx = feedCanvas.getContext("2d");
    if (feedCtx) {
      drawProceduralFeed(feedCtx, videoW, videoH, 0);
    }

    videoTex = createRgbaTexture(gl, videoW, videoH, null);
    if (!videoTex) {
      cleanupResources();
      return null;
    }
    textures.push(videoTex);
    if (feedCanvas) {
      gl.bindTexture(gl.TEXTURE_2D, videoTex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        feedCanvas
      );
      gl.bindTexture(gl.TEXTURE_2D, null);
    }
  } else {
    const fragSrc =
      shaderId === "radiance-cascades"
        ? FRAG_RADIANCE_CASCADES
        : shaderId === "particles-ocean"
          ? FRAG_PARTICLES_OCEAN
          : shaderId === "black-hole"
            ? FRAG_BLACK_HOLE
            : FRAG_COBALT_FLARE;

    mainProg = createProgram(gl, fragSrc);
    if (!mainProg) {
      cleanupResources();
      return null;
    }
    programs.push(mainProg);
  }

  let width = 1;
  let height = 1;
  const syncSize = () => {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, effectiveMaxDpr);
    const nextW = Math.max(1, Math.round(rect.width * dpr));
    const nextH = Math.max(1, Math.round(rect.height * dpr));
    if (nextW !== width || nextH !== height) {
      width = nextW;
      height = nextH;
      canvas.width = width;
      canvas.height = height;
    }
  };
  syncSize();

  const ro = new ResizeObserver(() => syncSize());
  ro.observe(canvas);

  // Cache uniform locations once
  const simLocs = simProg
    ? {
        timeRes: gl.getUniformLocation(simProg, "uTimeRes"),
        pointer: gl.getUniformLocation(simProg, "uPointer"),
        control: gl.getUniformLocation(simProg, "uControl"),
        prevTex: gl.getUniformLocation(simProg, "uPrevTex"),
      }
    : null;
  const dispLocs = dispProg
    ? {
        timeRes: gl.getUniformLocation(dispProg, "uTimeRes"),
        paperLight: gl.getUniformLocation(dispProg, "uPaperLight"),
        fluidTex: gl.getUniformLocation(dispProg, "uFluidTex"),
      }
    : null;
  const mainLocs = mainProg
    ? {
        timeRes: gl.getUniformLocation(mainProg, "uTimeRes"),
        pointer: gl.getUniformLocation(mainProg, "uPointer"),
        control: gl.getUniformLocation(mainProg, "uControl"),
        paperLight: gl.getUniformLocation(mainProg, "uPaperLight"),
        videoTex: gl.getUniformLocation(mainProg, "uVideoTex"),
      }
    : null;

  let rafId = 0;
  let disposed = false;
  let lastTs = performance.now();
  let elapsed = 0;
  const targetInterval = ambient ? 1000 / 40 : 1000 / 60;
  let lastRenderTs = 0;

  const renderFrame = (now: number) => {
    if (disposed) return;
    rafId = requestAnimationFrame(renderFrame);

    if (!isVisible() || document.hidden || isPaused()) {
      lastTs = now;
      return;
    }

    if (now - lastRenderTs < targetInterval * 0.85) return;
    lastRenderTs = now;

    const rawDt = (now - lastTs) / 1000;
    lastTs = now;
    const dt = reducedMotion
      ? 0.004
      : Math.min(0.033, Math.max(0.004, rawDt || 0.016));
    elapsed += dt;

    syncSize();
    const aspect = width / Math.max(1, height);

    if (shaderId === "fluid" && simProg && dispProg && simLocs && dispLocs) {
      const dvx = ptr.uvX - ptr.prevUvX;
      const dvy = ptr.uvY - ptr.prevUvY;
      ptr.prevUvX = ptr.uvX;
      ptr.prevUvY = ptr.uvY;
      ptr.vx = ptr.vx * 0.72 + dvx * 0.28;
      ptr.vy = ptr.vy * 0.72 + dvy * 0.28;

      const writeIdx = 1 - readIdx;

      // Pass 1: advect fluid into write FBO
      gl.bindFramebuffer(gl.FRAMEBUFFER, ppFbo[writeIdx]);
      gl.viewport(0, 0, simSize, simSize);
      gl.useProgram(simProg);
      bindQuad(simProg);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, ppTex[readIdx]);
      gl.uniform1i(simLocs.prevTex, 0);
      gl.uniform4f(simLocs.timeRes, elapsed, simSize, simSize, dt);
      // Map screen pointer & velocity into the 1:1 square cover-cropped FBO space
      const covScaleX = aspect < 1 ? aspect : 1;
      const covScaleY = aspect > 1 ? 1 / aspect : 1;
      const fboPtrX = 0.5 + (ptr.uvX - 0.5) * covScaleX;
      const fboPtrY = 0.5 + (1.0 - ptr.uvY - 0.5) * covScaleY;
      gl.uniform4f(
        simLocs.pointer,
        fboPtrX,
        fboPtrY,
        ptr.vx * covScaleX,
        -ptr.vy * covScaleY
      );
      gl.uniform4f(
        simLocs.control,
        ptr.pressed ? 1.0 : 0.0,
        covScaleX,
        covScaleY,
        0.0
      );
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      readIdx = writeIdx;

      // Pass 2: display to canvas
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, width, height);
      gl.useProgram(dispProg);
      bindQuad(dispProg);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, ppTex[readIdx]);
      gl.uniform1i(dispLocs.fluidTex, 0);
      gl.uniform4f(dispLocs.timeRes, elapsed, width, height, aspect);
      if (dispLocs.paperLight) {
        gl.uniform1f(dispLocs.paperLight, paperLight ? 1.0 : 0.0);
      }
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      return;
    }

    if (mainProg && mainLocs) {
      ptr.orbitX += (ptr.targetOrbitX - ptr.orbitX) * 0.1;
      ptr.orbitY += (ptr.targetOrbitY - ptr.orbitY) * 0.1;

      if (shaderId === "video-texture" && videoTex && feedCanvas && feedCtx) {
        const activeVid = getVideoElement();
        if (activeVid && activeVid.readyState >= 2) {
          try {
            feedCtx.drawImage(activeVid, 0, 0, videoW, videoH);
          } catch {
            drawProceduralFeed(feedCtx, videoW, videoH, elapsed);
          }
        } else {
          drawProceduralFeed(feedCtx, videoW, videoH, elapsed);
        }
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, videoTex);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0);
        gl.texSubImage2D(
          gl.TEXTURE_2D,
          0,
          0,
          0,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          feedCanvas
        );
      }

      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, width, height);
      gl.useProgram(mainProg);
      bindQuad(mainProg);
      gl.uniform4f(mainLocs.timeRes, elapsed, width, height, aspect);
      gl.uniform4f(mainLocs.pointer, ptr.x, ptr.y, ptr.vx, ptr.vy);
      gl.uniform4f(
        mainLocs.control,
        ambient ? 1.0 : 0.0,
        ptr.orbitX,
        ptr.orbitY,
        ptr.pressed ? 1.0 : 0.0
      );
      if (mainLocs.paperLight) {
        gl.uniform1f(mainLocs.paperLight, paperLight ? 1.0 : 0.0);
      }
      if (shaderId === "video-texture" && mainLocs.videoTex && videoTex) {
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, videoTex);
        gl.uniform1i(mainLocs.videoTex, 0);
      }
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
  };

  rafId = requestAnimationFrame(renderFrame);

  return {
    dispose: () => {
      disposed = true;
      cancelAnimationFrame(rafId);
      ro.disconnect();
      cleanupResources();
    },
  };
}
