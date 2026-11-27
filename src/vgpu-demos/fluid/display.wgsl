import { index_of } from "./fluid-common.wgsl";

struct DisplayConfig {
  output_size: vec2f,
}
const DYE_SIZE = vec2u(512, 288);
@group(0) @binding(0) var<uniform> config: DisplayConfig;
@group(0) @binding(1) var<storage, read> dye: array<vec4f>;

fn sample_dye(p: vec2f) -> vec3f {
  let grid = clamp(p * vec2f(DYE_SIZE) - 0.5, vec2f(0), vec2f(DYE_SIZE) - 1.0);
  let cell = vec2i(floor(grid));
  let f = fract(grid);
  let bottom = mix(dye[index_of(cell, DYE_SIZE)].rgb, dye[index_of(cell + vec2i(1, 0), DYE_SIZE)].rgb, f.x);
  let top = mix(dye[index_of(cell + vec2i(0, 1), DYE_SIZE)].rgb, dye[index_of(cell + vec2i(1, 1), DYE_SIZE)].rgb, f.x);
  return mix(bottom, top, f.y);
}

@fragment
fn fragment_main(@builtin(position) position: vec4f) -> @location(0) vec4f {
  var uv = position.xy / config.output_size;
  uv.y = 1.0 - uv.y; // WebGPU fragment coordinates start at the top; the solver's +Y points up.
  let density = sample_dye(uv);

  // Exposed Concrete #ECEEF0 drafting paper + hairline engineering grid
  var paper = mix(
    vec3f(0.952, 0.958, 0.966),
    vec3f(0.916, 0.925, 0.937),
    smoothstep(0.05, 0.95, length(uv - 0.5) * 1.35),
  );
  let gridUv = fract(position.xy / 40.0);
  let gridLine = max(step(gridUv.x, 0.025), step(gridUv.y, 0.025));
  paper = mix(paper, vec3f(0.835, 0.855, 0.895), gridLine * 0.38);

  // Map Navier-Stokes dye channels onto Electric Cobalt (#0038FF), Survey Ice & Deep Ink
  let total = density.r * 0.55 + density.g * 0.55 + density.b * 0.92;
  let amount = 1.0 - exp(-total * 1.18);
  let inkWeight = clamp(density.r / max(density.r + density.b + 0.001, 0.001), 0.0, 1.0);
  let iceWeight = clamp(density.g / max(density.g + density.b + 0.001, 0.001), 0.0, 1.0);

  let surveyIce = vec3f(0.28, 0.52, 1.0);
  let electricCobalt = vec3f(0.0, 0.22, 1.0);
  let deepInk = vec3f(0.045, 0.068, 0.16);

  var pigment = mix(electricCobalt, surveyIce, smoothstep(0.26, 0.72, iceWeight) * 0.52);
  pigment = mix(pigment, deepInk, smoothstep(0.32, 0.72, inkWeight) * 0.74);

  // Subtle hydraulic flow sheen + fine white pressure isoline contours inside fluid ribbons
  let dx = sample_dye(uv + vec2f(1.5 / 512.0, 0.0)) - density;
  let dy = sample_dye(uv + vec2f(0.0, 1.5 / 288.0)) - density;
  let sheen = clamp((length(dx) + length(dy)) * 1.65, 0.0, 1.0);
  let iso = abs(fract(total * 2.4) - 0.5);
  let isoLine = (1.0 - smoothstep(0.012, 0.042, iso)) * smoothstep(0.24, 0.78, amount);

  var col = mix(paper, pigment, smoothstep(0.02, 0.84, amount) * 0.92);
  col = mix(col, vec3f(0.68, 0.82, 1.0), sheen * 0.26 * amount);
  col = mix(col, vec3f(0.96, 0.98, 1.0), isoLine * 0.24);

  return vec4f(clamp(col, vec3f(0.0), vec3f(1.0)), 1.0);
}
