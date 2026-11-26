// Video to Texture — Live Video Stream Mapped onto 3D Architectural Glass Slab (vgpu WGSL)
struct VideoUniforms {
  timeRes: vec4f, // x: time, y: width, z: height, w: aspect
  pointer: vec4f, // x: px (-1..1), y: py (-1..1), z: vx, w: vy
  control: vec4f, // x: intensity, y: orbitX, z: orbitY, w: pressed
};

@group(0) @binding(0) var<uniform> u: VideoUniforms;
@group(0) @binding(1) var videoTex: texture_2d<f32>;
@group(0) @binding(2) var videoSampler: sampler;

fn rot2(a: f32) -> mat2x2f {
  let s = sin(a);
  let c = cos(a);
  return mat2x2f(c, -s, s, c);
}

fn sdRoundBox(p: vec3f, b: vec3f, r: f32) -> f32 {
  let q = abs(p) - b;
  return length(max(q, vec3f(0.0))) + min(max(q.x, max(q.y, q.z)), 0.0) - r;
}

fn toObj(p_in: vec3f, yaw: f32, pitch: f32) -> vec3f {
  var p = p_in;
  let rY = rot2(yaw) * p.xz;
  p = vec3f(rY.x, p.y, rY.y);
  let rX = rot2(pitch) * p.yz;
  p = vec3f(p.x, rX.x, rX.y);
  return p;
}

fn mapBox(p: vec3f, yaw: f32, pitch: f32) -> f32 {
  let q = toObj(p, yaw, pitch);
  return sdRoundBox(q, vec3f(0.98, 0.62, 0.16), 0.045);
}

fn calcNormal(p: vec3f, yaw: f32, pitch: f32) -> vec3f {
  let e = 0.0025;
  return normalize(vec3f(
    mapBox(p + vec3f(e, 0.0, 0.0), yaw, pitch) - mapBox(p - vec3f(e, 0.0, 0.0), yaw, pitch),
    mapBox(p + vec3f(0.0, e, 0.0), yaw, pitch) - mapBox(p - vec3f(0.0, e, 0.0), yaw, pitch),
    mapBox(p + vec3f(0.0, 0.0, e), yaw, pitch) - mapBox(p - vec3f(0.0, 0.0, e), yaw, pitch)
  ));
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

  let yaw = u.control.y * 1.2 + u.pointer.x * 0.45 + sin(t * 0.48) * 0.38;
  let pitch = clamp(u.control.z * 0.6 - u.pointer.y * 0.25 + cos(t * 0.36) * 0.12, -0.75, 0.75);

  let ro = vec3f(0.0, 0.0, 2.75);
  let rd = normalize(vec3f(p, -1.65));

  // Studio obsidian backdrop with subtle cobalt backlight
  let backGlow = exp(-length(p) * 1.65) * 0.35;
  var col = vec3f(0.024, 0.03, 0.048) + vec3f(0.02, 0.24, 1.0) * backGlow;

  // Raymarch 3D architectural glass video slab
  var dist = 0.0;
  var hit = false;
  for (var i = 0; i < 48; i++) {
    let pos = ro + rd * dist;
    let d = mapBox(pos, yaw, pitch);
    if (d < 0.002) {
      hit = true;
      break;
    }
    dist += d;
    if (dist > 8.0) { break; }
  }

  // Always evaluate texture sample in uniform control flow for WGSL compliance
  var sampleUv = uv;
  if (hit) {
    let pos = ro + rd * dist;
    let q = toObj(pos, yaw, pitch);
    sampleUv = clamp(vec2f(q.x / 1.96 + 0.5, 0.5 - q.y / 1.24), vec2f(0.01), vec2f(0.99));
  }
  let texCol = textureSample(videoTex, videoSampler, sampleUv).rgb;

  if (hit) {
    let pos = ro + rd * dist;
    let q = toObj(pos, yaw, pitch);
    let n = calcNormal(pos, yaw, pitch);
    let fresnel = pow(1.0 - max(0.0, dot(n, -rd)), 3.2);
    let lightDir = normalize(vec3f(0.55, 0.65, 0.85));
    let spec = pow(max(0.0, dot(reflect(-lightDir, n), -rd)), 28.0);

    let isFrontOrBack = smoothstep(0.12, 0.17, abs(q.z));
    let edgeCobalt = vec3f(0.12, 0.42, 1.0) * (0.45 + fresnel * 1.45);
    let faceCol = texCol * (0.95 + spec * 0.25) + vec3f(0.28, 0.56, 1.0) * fresnel * 0.65;

    col = mix(edgeCobalt * 0.7, faceCol, isFrontOrBack) + vec3f(0.85, 0.93, 1.0) * spec * 0.45;
  }

  return vec4f(tonemapACES(col), 1.0);
}
