struct RoamCamera {
  viewProjection: mat4x4f,
  eye: vec3f,
  exposure: f32,
  sunDirection: vec3f,
  time: f32,
  sunColor: vec3f,
  pad0: f32,
  skyColor: vec3f,
  pad1: f32,
}

@group(0) @binding(0) var<uniform> camera: RoamCamera;

// One instance per robot: body (x, z), heading rad, shadow scale
struct ShadowInstance {
  @builtin(vertex_index) vertex: u32,
  @location(0) body: vec4f,
}

struct ShadowVarying {
  @builtin(position) clip: vec4f,
  @location(0) local: vec2f,
}

@vertex
fn vs_main(input: ShadowInstance) -> ShadowVarying {
  let sx = select(-1.0, 1.0, (input.vertex & 1u) != 0u);
  let sz = select(-1.0, 1.0, (input.vertex >> 1u) != 0u);

  // Elliptical footprint matching the quadruped chassis + leg stance
  let halfW = 0.58 * input.body.w;
  let halfL = 0.76 * input.body.w;
  let lx = sx * halfW;
  let lz = sz * halfL;

  let h = input.body.z;
  let c = cos(h);
  let s = sin(h);

  // Rotate into world X/Z (heading frame: right = (c, -s), forward = (s, c))
  let wx = input.body.x + lx * c + lz * s;
  let wz = input.body.y - lx * s + lz * c;

  var output: ShadowVarying;
  output.local = vec2f(sx, sz);
  output.clip = camera.viewProjection * vec4f(wx, 0.004, wz, 1.0);
  return output;
}

@fragment
fn fs_main(input: ShadowVarying) -> @location(0) vec4f {
  let r2 = dot(input.local, input.local);
  if (r2 >= 1.0) {
    discard;
  }
  // Soft feathered ambient contact shadow under the quadruped (premultiplied alpha)
  let falloff = exp(-r2 * 3.8) * smoothstep(1.0, 0.15, r2);
  let alpha = falloff * 0.28;
  return vec4f(0.015 * alpha, 0.025 * alpha, 0.06 * alpha, alpha);
}
