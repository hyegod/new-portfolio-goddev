// Optimized Black Hole — Relativistic Lensing, Photon Ring & Doppler Disk (vgpu WGSL)
struct Uniforms {
  timeRes: vec4f, // x: time, y: width, z: height, w: aspect
  pointer: vec4f, // x: px (-1..1), y: py (-1..1), z: vx, w: vy
  control: vec4f, // x: intensity, y: orbitX, z: orbitY, w: pressed
};

@group(0) @binding(0) var<uniform> u: Uniforms;

fn hash31(p_in: vec3f) -> f32 {
  var p = fract(p_in * 0.1031);
  p += dot(p, p.zyx + 31.32);
  return fract((p.x + p.y) * p.z);
}

fn diskNoise(p: vec2f) -> f32 {
  let i = floor(p);
  let f = fract(p);
  let u2 = f * f * (3.0 - 2.0 * f);
  let a = hash31(vec3f(i, 1.0));
  let b = hash31(vec3f(i + vec2f(1.0, 0.0), 1.0));
  let c = hash31(vec3f(i + vec2f(0.0, 1.0), 1.0));
  let d = hash31(vec3f(i + vec2f(1.0, 1.0), 1.0));
  return mix(mix(a, b, u2.x), mix(c, d, u2.x), u2.y);
}

fn fbmDisk(p_in: vec2f) -> f32 {
  var p = p_in;
  var v = 0.0;
  var amp = 0.5;
  for (var i = 0; i < 4; i++) {
    v += amp * diskNoise(p);
    p = mat2x2f(1.6, 1.2, -1.2, 1.6) * p;
    amp *= 0.5;
  }
  return v;
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

  var p = uv * 2.0 - 1.0;
  p.y = -p.y;
  p.x *= aspect;

  // Orbiting relativistic camera
  let yaw = u.control.y * 1.15 + u.pointer.x * 0.35 + t * 0.12;
  let pitch = clamp(0.26 + u.control.z * 0.55 - u.pointer.y * 0.22, -0.75, 0.85);
  let camDist = 6.2;

  let ro = vec3f(
    camDist * cos(pitch) * sin(yaw),
    camDist * sin(pitch),
    camDist * cos(pitch) * cos(yaw)
  );
  let fwd = normalize(-ro);
  let right = normalize(cross(vec3f(0.0, 1.0, 0.0), fwd));
  let up = cross(fwd, right);
  var rd = normalize(fwd * 1.55 + right * p.x + up * p.y);

  // Geodesic gravitational lensing integration
  var pos = ro;
  var accum = vec3f(0.0);
  var transmittance = 1.0;
  var hitHorizon = false;
  let rs = 1.05;

  for (var i = 0; i < 64; i++) {
    let r = length(pos);
    if (r < rs) {
      hitHorizon = true;
      break;
    }
    if (r > 18.0) { break; }

    // Gravitational deflection proportional to 1 / r^3
    let accel = -pos * (1.58 / max(0.35, r * r * r));
    let stepSize = clamp(r * 0.085, 0.055, 0.36);
    rd = normalize(rd + accel * stepSize);
    let nextPos = pos + rd * stepSize;

    // Equatorial accretion disk crossing (y = 0 plane)
    if (pos.y * nextPos.y <= 0.0 || abs(pos.y) < 0.09) {
      let radial = length(pos.xz);
      if (radial > 1.52 && radial < 5.6) {
        let angle = atan2(pos.z, pos.x);
        let omega = 2.6 / pow(radial, 1.15);
        let swirl = fbmDisk(vec2f(radial * 2.4, angle * 3.0 + t * omega));
        let rings = 0.55 + 0.45 * sin(radial * 8.5 - t * 2.2 + swirl * 4.0);
        let radialEnv = smoothstep(1.52, 2.05, radial) * smoothstep(5.6, 2.6, radial);
        let thinness = exp(-abs(pos.y) * 18.0);

        // Relativistic Doppler beaming (approaching side blue-shifted & brighter)
        let tangent = normalize(vec3f(-pos.z, 0.0, pos.x));
        let doppler = clamp(dot(tangent, rd) * 0.5 + 0.5, 0.0, 1.0);
        let beam = 0.48 + 1.35 * doppler * doppler;

        let hotCobalt = vec3f(0.24, 0.58, 1.0);
        let coreWhite = vec3f(0.96, 0.98, 1.0);
        let coolAmber = vec3f(0.95, 0.58, 0.24);
        let diskCol = mix(coolAmber, mix(hotCobalt, coreWhite, doppler * 0.72), smoothstep(0.15, 0.85, doppler));

        let density = radialEnv * thinness * (0.35 + swirl * 0.85) * rings * stepSize * 1.45;
        accum += diskCol * beam * density * transmittance;
        transmittance *= exp(-density * 0.65);
      }
    }

    // Photon ring halo grazing Schwarzschild photon sphere (r ~ 1.5 * rs)
    let photonGlow = exp(-abs(r - 1.56) * 14.0) * stepSize * 0.34;
    accum += vec3f(0.28, 0.58, 1.0) * photonGlow * transmittance;

    pos = nextPos;
  }

  // Lensed deep-space background stars
  if (!hitHorizon) {
    let starGrid = floor(rd * 165.0);
    let st = hash31(starGrid);
    if (st > 0.992) {
      let starBright = (st - 0.992) / 0.008;
      accum += vec3f(0.75, 0.88, 1.0) * starBright * 1.4 * transmittance;
    }
    accum += vec3f(0.014, 0.022, 0.044) * transmittance;
  }

  return vec4f(tonemapACES(accum), 1.0);
}
