import { pcg2d, unitFloat } from "@vgpu/wgsl-std/hash";
import { fbmSimplex2d } from "@vgpu/wgsl-std/noise/simplex";
import { saturate } from "@vgpu/wgsl-std/math";
import { Camera, Scene, Surface, finish, lightSurface, sunShadow } from "./common.wgsl";

@group(0) @binding(0) var<uniform> camera: Camera;
@group(0) @binding(1) var<uniform> scene: Scene;
@group(0) @binding(2) var shadowMap: texture_depth_2d;
@group(0) @binding(3) var shadowSampler: sampler_comparison;

const CONTOUR_SPACING: f32 = 0.08;
// Painted grid pitch on the deck (world units).
const GRID_SPACING: f32 = 1.0;

struct TerrainInput {
  @location(0) position: vec3f,
  @location(1) normal: vec3f,
  // How far the vertex sits below its neighbourhood (positive in hollows), in [-1, 1].
  @location(2) cavity: f32,
}

struct TerrainVarying {
  @builtin(position) clip: vec4f,
  @location(0) worldPosition: vec3f,
  @location(1) normal: vec3f,
  @location(2) cavity: f32,
}

@vertex
fn vs_main(input: TerrainInput) -> TerrainVarying {
  var output: TerrainVarying;
  output.worldPosition = input.position;
  output.normal = input.normal;
  output.cavity = input.cavity;
  output.clip = camera.viewProjection * vec4f(input.position, 1.0);
  return output;
}

/** Fine aggregate in the concrete: one value per small cell, faded out when cells shrink below a pixel. */
fn aggregate(position: vec2f, scale: f32, footprint: f32) -> f32 {
  let cell = vec2u(vec2i(floor(position * scale) + vec2f(8192.0)));
  let value = unitFloat(pcg2d(cell).x) - 0.5;
  return value * (1.0 - smoothstep(0.3, 1.0, footprint * scale));
}

/** Anti-aliased lines every `spacing` world units in x and z, `half` wide. */
fn gridLines(position: vec2f, spacing: f32, half: f32) -> f32 {
  let scaled = position / spacing;
  let distance = abs(fract(scaled + 0.5) - 0.5) * spacing;
  let footprint = max(fwidth(position), vec2f(1e-4));
  let lines = 1.0 - smoothstep(vec2f(half) - footprint, vec2f(half) + footprint, distance);
  // Fade lines whose width falls below a pixel instead of letting them alias.
  let visible = saturate(half * 2.0 / max(footprint.x, footprint.y));
  return max(lines.x, lines.y) * visible;
}

/** Anti-aliased ring of half-width `half` (world units) at `radius` around `centre`. */
fn ring(position: vec2f, centre: vec2f, radius: f32, half: f32, footprint: f32) -> f32 {
  let distance = abs(length(position - centre) - radius);
  return 1.0 - smoothstep(half - footprint, half + footprint, distance);
}

/** Soft darkening under the robot bodies: the shadow map is too coarse for the contact itself. */
fn contactShade(position: vec3f) -> f32 {
  var shade = 1.0;
  for (var i = 0u; i < min(scene.contactCount, 48u); i++) {
    let body = scene.contacts[i];
    let offset = position.xz - body.xz;
    let reach = body.w;
    let d2 = dot(offset, offset) / (reach * reach);
    if (d2 < 4.0) {
      let above = saturate(1.0 - (body.y - position.y) / 0.7);
      shade *= 1.0 - 0.42 * exp(-d2 * 1.6) * above;
    }
  }
  return shade;
}

@fragment
fn fs_main(input: TerrainVarying) -> @location(0) vec4f {
  let p = input.worldPosition;
  let n = normalize(input.normal);
  let footprint = max(fwidth(p.x), fwidth(p.z));

  // Bright exposed architectural concrete (#ECEEF0 tone): subtle aggregate, crisp 1 m blueprint grid.
  let tone = fbmSimplex2d(p.xz * 0.45, 3, 2.1, 0.5) * 0.5 + 0.5;
  var albedo = vec3f(0.54, 0.56, 0.59) * (0.92 + 0.14 * tone);
  albedo *= 1.0 + aggregate(p.xz, 90.0, footprint) * 0.09;
  let grid = gridLines(p.xz, GRID_SPACING, 0.008);
  albedo = mix(albedo, vec3f(0.28, 0.34, 0.48), grid * 0.34);

  // Faint cobalt-slate topographic contour lines incised every CONTOUR_SPACING of height.
  let level = p.y / CONTOUR_SPACING;
  let lineFootprint = max(fwidth(level), 1e-4);
  let contour = 1.0 - smoothstep(0.0, lineFootprint * 1.2, abs(fract(level + 0.5) - 0.5));
  albedo = mix(albedo, vec3f(0.16, 0.28, 0.62), contour * 0.22 * (1.0 - smoothstep(0.02, 0.2, footprint)));

  // Hillshade: exaggerate tilt toward or away from the sun so sculpted terrain relief reads crisply.
  let tilt = n.xz;
  let sunPlanar = normalize(scene.sunDirection.xz);
  albedo *= clamp(1.0 + dot(tilt, sunPlanar) * 0.78 - length(tilt) * 0.34, 0.58, 1.24);
  albedo *= 1.0 + min(p.y, 0.0) * 0.55;

  var surface = Surface(albedo, vec3f(0.035), 18.0, 1.0, vec3f(0.0));
  surface.occlusion = contactShade(p) * mix(1.0, 0.76, saturate(input.cavity * 2.0));

  // Brush: Electric Cobalt for elevate, Survey Slate for lower, bright Cobalt Beacon for destination.
  let brush = scene.brush;
  if (brush.w != 0.0) {
    let width = max(footprint * 1.2, 0.012);
    let edge = ring(p.xz, brush.xy, brush.z, width, footprint);
    let inner = ring(p.xz, brush.xy, brush.z * 0.35, width * 0.6, footprint) * 0.6;
    var tint = vec3f(0.08, 0.36, 2.2);
    if (brush.w < 0.0) {
      tint = vec3f(0.14, 0.20, 0.34);
    } else if (brush.w > 1.5) {
      tint = vec3f(0.06, 0.42, 2.6);
    }
    surface.emission += tint * (edge + inner) * 0.72;
    let inside = 1.0 - smoothstep(brush.z - footprint, brush.z + footprint, length(p.xz - brush.xy));
    surface.albedo = mix(surface.albedo, surface.albedo * 0.90 + vec3f(0.02, 0.10, 0.38) * 0.14, inside * 0.55);
  }

  // Destination: pulsing Electric Cobalt survey ring & CAD crosshair.
  let destination = scene.destination;
  if (destination.z > 0.5) {
    let age = destination.w;
    let settle = 1.0 - exp(-age * 3.0);
    let pulse = 0.5 + 0.5 * sin(age * 3.2);
    let width = max(footprint * 1.2, 0.014);
    let radius = mix(0.9, 0.34, settle) + pulse * 0.03;
    let mark = ring(p.xz, destination.xy, radius, width, footprint);
    let offset = abs(p.xz - destination.xy);
    let crossBar = (1.0 - smoothstep(width - footprint, width + footprint, min(offset.x, offset.y))) * step(max(offset.x, offset.y), 0.12);
    surface.emission += vec3f(0.08, 0.40, 2.65) * (mark * (0.62 + 0.45 * pulse) + crossBar * 0.9);
  }

  let viewDirection = normalize(camera.eye - p);
  let shadow = sunShadow(shadowMap, shadowSampler, scene.lightViewProjection, p, n);
  let radiance = lightSurface(surface, n, viewDirection, scene.sunDirection, scene.sunColor, scene.skyColor, shadow);
  return finish(radiance, scene.exposure);
}
