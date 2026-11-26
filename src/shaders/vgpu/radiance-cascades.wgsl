// Radiance Cascades — 2D Architectural Global Illumination & Soft Shadows (vgpu WGSL)
struct Uniforms {
  timeRes: vec4f, // x: time, y: width, z: height, w: aspect
  pointer: vec4f, // x: px (-1..1), y: py (-1..1), z: vx, w: vy
  control: vec4f, // x: intensity, y: orbitX, z: orbitY, w: pressed
};

@group(0) @binding(0) var<uniform> u: Uniforms;

fn hash12(p: vec2f) -> f32 {
  var p3 = fract(vec3f(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

fn sdBox(p: vec2f, b: vec2f) -> f32 {
  let d = abs(p) - b;
  return length(max(d, vec2f(0.0))) + min(max(d.x, d.y), 0.0);
}

// Architectural column & shear-wall plan occluders
fn mapOccluders(p: vec2f) -> f32 {
  var d = 10.0;
  // Twin structural shear walls
  d = min(d, sdBox(p - vec2f(-0.42, 0.08), vec2f(0.045, 0.34)));
  d = min(d, sdBox(p - vec2f(0.42, -0.06), vec2f(0.045, 0.32)));
  // Central baffle beam with portal aperture
  d = min(d, sdBox(p - vec2f(-0.08, 0.42), vec2f(0.22, 0.038)));
  d = min(d, sdBox(p - vec2f(0.12, -0.44), vec2f(0.24, 0.038)));
  // Circular structural columns
  d = min(d, length(p - vec2f(-0.88, -0.28)) - 0.095);
  d = min(d, length(p - vec2f(0.86, 0.32)) - 0.095);
  d = min(d, length(p - vec2f(0.0, 0.02)) - 0.085);
  return d;
}

fn evalEmitters(p: vec2f, lightA: vec2f, lightB: vec2f, lightC: vec2f) -> vec4f {
  // Returns rgb emission + w distance
  let dA = length(p - lightA) - 0.048;
  let dB = length(p - lightB) - 0.036;
  let dC = length(p - lightC) - 0.036;

  let cA = vec3f(0.18, 0.48, 2.8);  // HDR Electric Cobalt pointer beacon
  let cB = vec3f(0.65, 0.88, 1.85); // HDR Survey Ice beacon
  let cC = vec3f(0.22, 1.55, 1.15); // HDR Terrain Jade accent

  var emit = vec3f(0.0);
  if (dA < 0.008) { emit += cA; }
  if (dB < 0.008) { emit += cB; }
  if (dC < 0.008) { emit += cC; }
  return vec4f(emit, min(dA, min(dB, dC)));
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

  // Primary HDR cobalt emitter follows pointer or patrols architectural plan
  let autoA = vec2f(cos(t * 0.6) * 0.62, sin(t * 0.85) * 0.44);
  let ptrPos = vec2f(u.pointer.x * aspect * 0.92, -u.pointer.y * 0.88);
  let hasPtr = clamp(length(u.pointer.xy) * 2.0, 0.0, 1.0);
  let lightA = mix(autoA, ptrPos, hasPtr);
  let lightB = vec2f(-0.78 * cos(t * 0.35), 0.54 * sin(t * 0.47));
  let lightC = vec2f(0.75 * sin(t * 0.42), -0.52 * cos(t * 0.38));

  let occDist = mapOccluders(p);
  let selfEmit = evalEmitters(p, lightA, lightB, lightC);

  // Subtle architectural drafting floor grid
  let grid = max(
    smoothstep(0.012, 0.0, abs(fract(p.x * 4.0) - 0.5)),
    smoothstep(0.012, 0.0, abs(fract(p.y * 4.0) - 0.5))
  );

  // Radiance Cascade angular gather (24 jittered rays with SDF sphere-tracing)
  let rayCount = 24;
  let jitter = hash12(uv * u.timeRes.yz + fract(t * 11.7));
  var radiance = vec3f(0.0);

  if (occDist > 0.0) {
    for (var i = 0; i < rayCount; i++) {
      let angle = (f32(i) + jitter) * (6.2831853 / f32(rayCount));
      let dir = vec2f(cos(angle), sin(angle));
      var dist = 0.01;
      for (var step = 0; step < 22; step++) {
        let sp = p + dir * dist;
        let dO = mapOccluders(sp);
        let em = evalEmitters(sp, lightA, lightB, lightC);

        if (em.w < 0.012) {
          let atten = 1.0 / (1.0 + dist * dist * 2.2);
          radiance += em.rgb * atten;
          break;
        }
        if (dO < 0.004) {
          // Soft ambient wall bounce from structural concrete faces
          let bounce = 0.06 / (1.0 + dist * 2.5);
          radiance += vec3f(0.08, 0.16, 0.34) * bounce;
          break;
        }
        let stride = min(dO, max(0.012, em.w));
        dist += stride;
        if (dist > 2.6) { break; }
      }
    }
    radiance = (radiance / f32(rayCount)) * 3.8;
  }

  // Direct soft-glow contribution for smooth emitters
  var col = vec3f(0.024, 0.029, 0.044) + vec3f(0.04, 0.06, 0.11) * grid;
  col += radiance;
  col += selfEmit.rgb * smoothstep(0.04, -0.01, selfEmit.w);

  // Crisp concrete structural occluder walls with lit cobalt bevel rim
  let wallMask = smoothstep(0.008, -0.006, occDist);
  let wallRim = exp(-abs(occDist) * 110.0) * (0.35 + length(radiance) * 0.45);
  let wallCol = vec3f(0.06, 0.072, 0.105) + vec3f(0.24, 0.52, 1.0) * wallRim;
  col = mix(col, wallCol, wallMask);

  return vec4f(tonemapACES(col), 1.0);
}
