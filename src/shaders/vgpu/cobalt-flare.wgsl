// Triangle LED + Next.js Volumetric Cobalt Flare (vgpu WGSL)
struct Uniforms {
  timeRes: vec4f,  // x: time, y: width, z: height, w: aspect
  pointer: vec4f,  // x: px (-1..1), y: py (-1..1), z: vx, w: vy
  control: vec4f,  // x: ambientMode (0=full lab, 1=subtle footer), y: orbitX, z: orbitY, w: pressed
};

@group(0) @binding(0) var<uniform> u: Uniforms;

fn hash12(p: vec2f) -> f32 {
  var p3 = fract(vec3f(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

// Signed distance to an equilateral triangle centered at origin
fn sdEquilateralTriangle(p_in: vec2f, r: f32) -> f32 {
  let k = 1.7320508;
  var p = p_in;
  p.x = abs(p.x) - r;
  p.y = p.y + r / k;
  if (p.x + k * p.y > 0.0) {
    p = vec2f(p.x - k * p.y, -k * p.x - p.y) * 0.5;
  }
  p.x -= clamp(p.x, -2.0 * r, 0.0);
  return -length(p) * sign(p.y);
}

fn tonemapACES(x: vec3f) -> vec3f {
  let a = 2.51;
  let b = 0.03;
  let c = 2.43;
  let d = 0.59;
  let e = 0.14;
  return clamp((x * (a * x + b)) / (x * (c * x + d) + e), vec3f(0.0), vec3f(1.0));
}

@fragment
fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  let t = u.timeRes.x;
  let aspect = u.timeRes.w;
  let ambient = u.control.x;

  // Aspect-corrected centered coordinates (-aspect..aspect, -1..1)
  var p = (uv * 2.0 - 1.0);
  p.y = -p.y;
  p.x *= aspect;

  // Light source follows pointer smoothly or orbits autonomously
  let autoLight = vec2f(cos(t * 0.55) * 0.58 * aspect, sin(t * 0.42) * 0.36 + 0.12);
  let ptrPos = vec2f(u.pointer.x * aspect * 0.9, -u.pointer.y * 0.85);
  let ptrActivity = clamp(length(u.pointer.xy) * 1.4, 0.0, 1.0);
  let lightPos = mix(autoLight, ptrPos, mix(0.35, 0.92, ptrActivity));

  // Subtle architectural LED micro-grid (Triangle LED Hero DNA)
  let gridScale = mix(36.0, 26.0, ambient);
  let gCell = fract(p * gridScale) - 0.5;
  let ledDot = smoothstep(0.28, 0.04, length(gCell));

  // Base obsidian concrete backdrop
  var col = vec3f(0.025, 0.031, 0.048);

  if (ambient < 0.5) {
    // FULL STUDIO MODE: Analytic LED Triangle Prism + Volumetric Ray Flare + Floor Radiance
    let triCenter = vec2f(0.0, 0.06);
    let triScale = 0.54;
    let dTri = sdEquilateralTriangle(p - triCenter, triScale);
    let edgeDist = abs(dTri);

    // Analytic edge LED illumination modulated by light direction
    let toLight = normalize(lightPos - p);
    let edgeCore = exp(-edgeDist * 55.0) * 1.85;
    let edgeHalo = exp(-edgeDist * 9.5) * 0.62;
    let directionalBoost = 0.45 + 0.85 * pow(max(0.0, 1.0 - length(p - lightPos) * 0.62), 2.0);

    // Volumetric 28-step ray scattering toward light source (Next.js Flare DNA)
    let jitter = hash12(uv * u.timeRes.yz + fract(t * 17.3));
    var scatter = 0.0;
    let steps = 24;
    for (var i = 0; i < steps; i++) {
      let f = (f32(i) + jitter) / f32(steps);
      let sp = mix(p, lightPos, f * 0.82);
      let sd = sdEquilateralTriangle(sp - triCenter, triScale);
      let rim = exp(-abs(sd) * 18.0);
      let occ = smoothstep(-0.02, 0.04, sd);
      scatter += (rim * 0.08 + occ * 0.016) * (1.0 - f * 0.6);
    }

    // Horizon floor reflection
    let floorMask = smoothstep(0.02, -0.58, p.y + 0.34);
    let reflP = vec2f(p.x, -(p.y + 0.72) * 1.65);
    let reflDist = abs(sdEquilateralTriangle(reflP - triCenter, triScale));
    let floorGlow = exp(-reflDist * 5.2) * floorMask * 0.55;

    let cobalt = vec3f(0.04, 0.28, 1.0);
    let electric = vec3f(0.36, 0.64, 1.0);
    let bone = vec3f(0.95, 0.97, 1.0);

    // Light flare core
    let flareDist = length(p - lightPos);
    let flare = exp(-flareDist * 3.8) * 0.85 + exp(-flareDist * 16.0) * 1.1;
    let anamorphic = exp(-abs(p.y - lightPos.y) * 28.0) * exp(-abs(p.x - lightPos.x) * 1.6) * 0.48;

    col += cobalt * (edgeHalo * directionalBoost + scatter * 1.35 + floorGlow);
    col += electric * (flare * 0.85 + anamorphic + ledDot * (edgeHalo * 0.8 + flare * 0.45));
    col += bone * (edgeCore * directionalBoost * 0.9 + exp(-flareDist * 26.0) * 0.75);

    // Subtle matte interior shadow of the prism
    let inside = smoothstep(0.01, -0.015, dTri);
    col = mix(col, vec3f(0.02, 0.03, 0.055) + cobalt * (ledDot * 0.14 * directionalBoost), inside * 0.78);
  } else {
    // SUBTLE AMBIENT FOOTER MODE: Minimalist Obsidian LED Grid + Soft Cobalt Flare Arc
    let d1 = length(p - lightPos);
    let d2 = length(p - vec2f(-0.48 * aspect, -0.35));

    // Crisp parabolic horizon arc
    let arcY = -0.32 + 0.18 * (p.x * p.x) / max(1.0, aspect * aspect);
    let arcGlow = exp(-abs(p.y - arcY) * 14.0) * (0.28 + 0.55 * exp(-d1 * 1.35));

    // Soft volumetric cobalt rays
    let cobalt = vec3f(0.02, 0.24, 1.0);
    let sky = vec3f(0.32, 0.56, 1.0);
    let flare = exp(-d1 * 1.95) * 0.48 + exp(-d2 * 1.75) * 0.22;
    let anamorphic = exp(-abs(p.y - lightPos.y) * 18.0) * exp(-abs(p.x - lightPos.x) * 1.2) * 0.22;

    col += cobalt * (flare * 0.95 + arcGlow * 0.85);
    col += sky * (anamorphic + ledDot * (flare * 0.55 + arcGlow * 0.5));
  }

  // Subtle vignette
  let vig = 1.0 - dot(uv - 0.5, uv - 0.5) * 0.72;
  col = tonemapACES(col * vig);
  return vec4f(col, 1.0);
}
