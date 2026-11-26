// Particles Ocean — Multi-Directional Gerstner Wave Particle Field (vgpu WGSL)
struct Uniforms {
  timeRes: vec4f, // x: time, y: width, z: height, w: aspect
  pointer: vec4f, // x: px (-1..1), y: py (-1..1), z: vx, w: vy
  control: vec4f, // x: intensity, y: orbitX, z: orbitY, w: pressed
};

@group(0) @binding(0) var<uniform> u: Uniforms;

fn hash21(p: vec2f) -> f32 {
  var p2 = fract(p * vec2f(123.34, 456.21));
  p2 += dot(p2, p2 + 45.32);
  return fract(p2.x * p2.y);
}

fn waveHeight(xz: vec2f, t: f32) -> f32 {
  var h = 0.0;
  h += sin(dot(xz, vec2f(0.85, 0.52)) * 1.45 - t * 1.35) * 0.28;
  h += sin(dot(xz, vec2f(-0.62, 0.78)) * 2.15 - t * 1.75) * 0.18;
  h += sin(dot(xz, vec2f(0.32, -0.94)) * 3.4 - t * 2.3) * 0.09;
  h += cos(dot(xz, vec2f(-0.91, -0.41)) * 4.8 + t * 2.8) * 0.05;
  return h;
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

  // Camera yaw/pitch driven softly by pointer & drag
  let yaw = u.control.y * 0.55 + u.pointer.x * 0.25 + sin(t * 0.16) * 0.14;
  let pitch = clamp(-0.22 - u.control.z * 0.25 - u.pointer.y * 0.14, -0.58, 0.12);

  let cy = cos(yaw);
  let sy = sin(yaw);
  let cp = cos(pitch);
  let sp = sin(pitch);

  // Camera ray
  var rd = normalize(vec3f(p.x, p.y, 1.45));
  let ry = vec3f(rd.x, rd.y * cp - rd.z * sp, rd.y * sp + rd.z * cp);
  rd = vec3f(ry.x * cy + ry.z * sy, ry.y, -ry.x * sy + ry.z * cy);

  let ro = vec3f(0.0, 2.35, -t * 0.85);

  // Deep obsidian horizon sky with electric cobalt zenith glow
  let horizonGlow = exp(-abs(rd.y) * 7.5);
  let skyCol = mix(vec3f(0.018, 0.024, 0.042), vec3f(0.04, 0.18, 0.58), horizonGlow * 0.65);
  var col = skyCol;

  // Subtle starlight above horizon
  if (rd.y > 0.01) {
    let starCell = floor(rd.xz / max(0.08, rd.y) * 32.0);
    let st = hash21(starCell);
    if (st > 0.992) {
      col += vec3f(0.55, 0.78, 1.0) * smoothstep(0.01, 0.22, rd.y) * 0.75;
    }
  }

  // Ray-intersect layered wave particle ocean below horizon
  if (rd.y < -0.008) {
    var accum = vec3f(0.0);
    var dist = 1.6;
    for (var step = 0; step < 34; step++) {
      let pos = ro + rd * dist;
      let wh = waveHeight(pos.xz, t);
      let diff = pos.y - wh;

      if (abs(diff) < 0.22) {
        // Sample quantized ocean particle lattice on the wave crest
        let cellScale = 3.2;
        let g = pos.xz * cellScale;
        let id = floor(g);
        let f = fract(g) - 0.5;
        let rnd = hash21(id);
        let jitter = vec2f(rnd - 0.5, hash21(id + 17.1) - 0.5) * 0.36;
        let dDot = length(f - jitter);

        let fade = exp(-dist * 0.068);
        let crest = smoothstep(-0.22, 0.42, wh);
        let sparkle = smoothstep(0.16, 0.02, dDot) * exp(-abs(diff) * 14.0);

        let deepCobalt = vec3f(0.02, 0.26, 1.0);
        let crestIce = vec3f(0.56, 0.82, 1.0);
        let bone = vec3f(0.95, 0.98, 1.0);

        let pCol = mix(deepCobalt, mix(crestIce, bone, crest * 0.65), crest);
        accum += pCol * sparkle * fade * (1.25 + crest * 1.4);
      }

      if (diff < -0.24) { break; }
      dist += max(0.22, diff * 0.55 + dist * 0.032);
      if (dist > 44.0) { break; }
    }

    // Specular horizon sheen
    let seaDist = -ro.y / min(-0.01, rd.y);
    let seaPos = ro + rd * min(seaDist, 42.0);
    let h0 = waveHeight(seaPos.xz, t);
    let hx = waveHeight(seaPos.xz + vec2f(0.12, 0.0), t);
    let hz = waveHeight(seaPos.xz + vec2f(0.0, 0.12), t);
    let n = normalize(vec3f(h0 - hx, 0.12, h0 - hz));
    let fresnel = pow(1.0 - max(0.0, dot(n, -rd)), 4.0);
    let surfaceTint = vec3f(0.02, 0.12, 0.42) * fresnel * exp(-seaDist * 0.045);

    col = mix(col, surfaceTint + accum * 0.72, smoothstep(-0.008, -0.08, rd.y));
  }

  return vec4f(tonemapACES(col), 1.0);
}
