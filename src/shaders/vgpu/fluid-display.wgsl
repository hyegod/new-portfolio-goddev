// Interactive Fluid Display Pass (Electric Cobalt × Survey Ice Filmic Shading)
struct DisplayUniforms {
  timeRes: vec4f,
};

@group(0) @binding(0) var<uniform> u: DisplayUniforms;
@group(0) @binding(1) var fluidTex: texture_2d<f32>;
@group(0) @binding(2) var linearSampler: sampler;

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
  let px = vec2f(1.5 / max(1.0, u.timeRes.y), 1.5 / max(1.0, u.timeRes.z));
  let c = textureSample(fluidTex, linearSampler, uv);
  let cx = textureSample(fluidTex, linearSampler, uv + vec2f(px.x, 0.0));
  let cy = textureSample(fluidTex, linearSampler, uv + vec2f(0.0, px.y));

  let density = c.b + c.a * 0.85;
  let gx = (cx.b + cx.a) - (c.b + c.a);
  let gy = (cy.b + cy.a) - (c.b + c.a);
  let normal = normalize(vec3f(-gx * 16.0, -gy * 16.0, 1.0));
  let spec = pow(max(0.0, dot(normal, normalize(vec3f(0.35, 0.55, 0.75)))), 14.0);

  let speed = length(c.rg);

  let obsidian = vec3f(0.028, 0.034, 0.052);
  let cobalt = vec3f(0.0, 0.25, 1.0);
  let ice = vec3f(0.36, 0.72, 1.0);
  let jade = vec3f(0.22, 0.90, 0.68);
  let bone = vec3f(0.95, 0.97, 1.0);

  var col = obsidian;
  col += cobalt * (c.b * 1.15);
  col += mix(ice, jade, smoothstep(0.2, 1.4, speed)) * (c.a * 0.88);
  col += bone * (spec * 0.55 * smoothstep(0.06, 0.5, density));

  // Subtle architectural pressure isolines
  let contour = abs(fract(density * 6.0) - 0.5);
  let line = smoothstep(0.04, 0.01, contour) * smoothstep(0.15, 0.7, density);
  col += ice * line * 0.16;

  return vec4f(tonemapACES(col), 1.0);
}
