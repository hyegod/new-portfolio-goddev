// Interactive Fluid Simulation Pass (vgpu Ping-Pong Navier-Curl Advection)
struct FluidUniforms {
  timeRes: vec4f, // x: time, y: width, z: height, w: dt
  pointer: vec4f, // x: px (0..1), y: py (0..1), z: vx, w: vy
  control: vec4f, // x: pressed/active, y: swirlStrength, z: decay, w: seed
};

@group(0) @binding(0) var<uniform> u: FluidUniforms;
@group(0) @binding(1) var prevTex: texture_2d<f32>;
@group(0) @binding(2) var linearSampler: sampler;

fn hash22(p: vec2f) -> vec2f {
  var p3 = fract(vec3f(p.xyx) * vec3f(0.1031, 0.1030, 0.0973));
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.xx + p3.yz) * p3.zy) - 0.5;
}

fn noise2(p: vec2f) -> f32 {
  let i = floor(p);
  let f = fract(p);
  let w = f * f * (3.0 - 2.0 * f);
  let a = dot(hash22(i), f);
  let b = dot(hash22(i + vec2f(1.0, 0.0)), f - vec2f(1.0, 0.0));
  let c = dot(hash22(i + vec2f(0.0, 1.0)), f - vec2f(0.0, 1.0));
  let d = dot(hash22(i + vec2f(1.0, 1.0)), f - vec2f(1.0, 1.0));
  return mix(mix(a, b, w.x), mix(c, d, w.x), w.y);
}

fn curlVelocity(p: vec2f, t: f32) -> vec2f {
  let e = 0.04;
  let n1 = noise2(p * 2.8 + vec2f(t * 0.22, -t * 0.16));
  let nx = noise2((p + vec2f(e, 0.0)) * 2.8 + vec2f(t * 0.22, -t * 0.16));
  let ny = noise2((p + vec2f(0.0, e)) * 2.8 + vec2f(t * 0.22, -t * 0.16));
  return vec2f((ny - n1) / e, -(nx - n1) / e);
}

@fragment
fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  let t = u.timeRes.x;
  let dt = clamp(u.timeRes.w, 0.004, 0.033);
  let aspect = u.timeRes.y / max(1.0, u.timeRes.z);

  let prev = textureSample(prevTex, linearSampler, uv);

  // Combine stored velocity (rg) with smooth curl turbulence
  let curl = curlVelocity(vec2f(uv.x * aspect, uv.y), t) * 0.14;
  let vel = prev.rg + curl * dt;

  // Semi-Lagrangian backtrace advection
  let backUv = clamp(uv - vel * dt * 1.15, vec2f(0.002), vec2f(0.998));
  let advected = textureSample(prevTex, linearSampler, backUv);

  // Subtle Laplacian diffusion for silky dye filaments
  let px = vec2f(1.0 / max(1.0, u.timeRes.y), 1.0 / max(1.0, u.timeRes.z));
  let blur = (
    textureSample(prevTex, linearSampler, backUv + vec2f(px.x, 0.0)) +
    textureSample(prevTex, linearSampler, backUv - vec2f(px.x, 0.0)) +
    textureSample(prevTex, linearSampler, backUv + vec2f(0.0, px.y)) +
    textureSample(prevTex, linearSampler, backUv - vec2f(0.0, px.y))
  ) * 0.25;

  var state = mix(advected, blur, 0.08);

  // Viscous velocity damping & dye fade
  state.r *= 0.972;
  state.g *= 0.972;
  state.b *= 0.974; // Electric Cobalt dye channel
  state.a *= 0.964; // Cyan/Bone highlight dye channel

  // Autonomous twin emitter jets (dt-scaled so dye forms silky ribbons without saturating)
  let jet1 = vec2f(0.5 + cos(t * 0.78) * 0.26, 0.5 + sin(t * 1.02) * 0.22);
  let jet2 = vec2f(0.5 + cos(t * 0.62 + 3.14) * 0.28, 0.5 + sin(t * 0.86 + 1.57) * 0.24);
  let j1d = length((uv - jet1) * vec2f(aspect, 1.0));
  let j2d = length((uv - jet2) * vec2f(aspect, 1.0));
  let j1Spl = exp(-j1d * j1d * 340.0);
  let j2Spl = exp(-j2d * j2d * 340.0);

  let j1Dir = vec2f(-sin(t * 0.78), cos(t * 1.02)) * 0.55;
  let j2Dir = vec2f(-sin(t * 0.62 + 3.14), cos(t * 0.86 + 1.57)) * 0.55;

  state.r += (j1Dir.x * j1Spl + j2Dir.x * j2Spl) * dt * 6.5;
  state.g += (j1Dir.y * j1Spl + j2Dir.y * j2Spl) * dt * 6.5;
  state.b = clamp(state.b + (j1Spl * 0.92 + j2Spl * 0.36) * dt * 7.5, 0.0, 2.2);
  state.a = clamp(state.a + (j2Spl * 0.72 + j1Spl * 0.24) * dt * 6.5, 0.0, 2.0);

  // Interactive pointer / touch fluid splat & impulse
  let pSpeed = length(u.pointer.zw);
  let stirFactor = max(u.control.x * 0.85, smoothstep(0.0005, 0.008, pSpeed));
  if (stirFactor > 0.01) {
    let pPos = u.pointer.xy;
    let dVec = (uv - pPos) * vec2f(aspect, 1.0);
    let splat = exp(-dot(dVec, dVec) * 260.0) * stirFactor;
    let impulse = clamp(u.pointer.zw * 22.0, vec2f(-1.5), vec2f(1.5));
    state.r += impulse.x * splat;
    state.g += impulse.y * splat;
    state.b = clamp(state.b + splat * (1.1 + pSpeed * 12.0) * dt * 9.0, 0.0, 2.5);
    state.a = clamp(state.a + splat * (0.8 + u.control.x * 0.45) * dt * 7.5, 0.0, 2.2);
  }

  return vec4f(clamp(state.rg, vec2f(-2.5), vec2f(2.5)), state.ba);
}
