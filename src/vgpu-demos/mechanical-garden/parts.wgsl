import { pcg3d, unitFloat } from "@vgpu/wgsl-std/hash";
import { saturate } from "@vgpu/wgsl-std/math";
import { instanceWorldMatrix, transformNormal, transformPosition } from "@vgpu/wgsl-std/scene";
import {
  Camera,
  Scene,
  Surface,
  finish,
  lightSurface,
  sunShadow,
} from "./common.wgsl";

@group(0) @binding(0) var<uniform> camera: Camera;
@group(0) @binding(1) var<uniform> scene: Scene;
@group(0) @binding(2) var shadowMap: texture_depth_2d;
@group(0) @binding(3) var shadowSampler: sampler_comparison;

// Robot parts and the plinth share this shader: every mesh vertex carries a material code, and the
// instance style is (variant, LED glow, part, unused).
struct PartInput {
  @location(0) position: vec3f,
  @location(1) normal: vec3f,
  @location(2) material: f32,
  @location(3) world0: vec4f,
  @location(4) world1: vec4f,
  @location(5) world2: vec4f,
  @location(6) world3: vec4f,
  @location(7) style: vec4f,
}

struct PartVarying {
  @builtin(position) clip: vec4f,
  @location(0) worldPosition: vec3f,
  @location(1) normal: vec3f,
  @location(2) localPosition: vec3f,
  @location(3) @interpolate(flat, either) material: u32,
  @location(4) @interpolate(flat, either) style: vec4f,
}

@vertex
fn vs_main(input: PartInput) -> PartVarying {
  let world = instanceWorldMatrix(input.world0, input.world1, input.world2, input.world3);
  var output: PartVarying;
  output.worldPosition = transformPosition(world, input.position);
  output.normal = transformNormal(world, input.normal);
  output.localPosition = input.position;
  output.material = u32(input.material + 0.5);
  output.style = input.style;
  output.clip = camera.viewProjection * vec4f(output.worldPosition, 1.0);
  return output;
}

fn speckle(position: vec3f, scale: f32) -> f32 {
  let cell = vec3u(vec3i(floor(position * scale) + vec3f(4096.0)));
  return unitFloat(pcg3d(cell).x);
}

fn surfaceFor(input: PartVarying) -> Surface {
  var surface = Surface(vec3f(0.5), vec3f(0.04), 32.0, 1.0, vec3f(0.0));
  // Case values are the MATERIAL codes in common.wgsl / meshes.ts (the linker keeps only consts
  // referenced from expressions, so the selectors are literals).
  switch input.material {
    case 0u: { // MATERIAL_COVER: crisp architectural porcelain-concrete shell
      surface.albedo = vec3f(0.82, 0.84, 0.87);
      surface.shininess = 72.0;
      surface.specular = vec3f(0.06);
    }
    case 1u: { // MATERIAL_ACCENT: GODDEV Electric Cobalt (#0038FF) structural trim
      surface.albedo = vec3f(0.012, 0.072, 0.96);
      surface.shininess = 52.0;
      surface.specular = vec3f(0.08);
    }
    case 2u: { // MATERIAL_GRAPHITE: architectural Matte Ink (#0D0E12) chassis
      let grain = speckle(input.localPosition, 260.0);
      surface.albedo = vec3f(0.018, 0.022, 0.032) * (0.86 + 0.28 * grain);
      surface.shininess = 40.0;
      surface.specular = vec3f(0.055);
    }
    case 3u: { // MATERIAL_LENS: obsidian optical glass
      surface.albedo = vec3f(0.006, 0.008, 0.014);
      surface.specular = vec3f(0.14);
      surface.shininess = 220.0;
    }
    case 4u: { // MATERIAL_LED: Electric Cobalt eyes and survey beacon tip
      let glow = input.style.y;
      surface.albedo = vec3f(0.01, 0.02, 0.05);
      surface.specular = vec3f(0.08);
      surface.shininess = 120.0;
      surface.emission = vec3f(0.14, 0.52, 2.8) * (0.35 + 0.75 * glow);
    }
    case 5u: { // MATERIAL_RUBBER
      surface.albedo = vec3f(0.026, 0.028, 0.034);
      surface.shininess = 12.0;
      surface.specular = vec3f(0.03);
    }
    case 6u: { // MATERIAL_METAL: brushed architectural steel actuators and linkages
      surface.albedo = vec3f(0.08, 0.086, 0.098);
      surface.specular = vec3f(0.62, 0.65, 0.7);
      surface.shininess = 62.0;
    }
    case 7u: { // MATERIAL_PLINTH
      // Exposed precast architectural concrete plinth matching #ECEEF0 studio tone.
      let rim = smoothstep(-0.04, -0.01, input.localPosition.y);
      let grain = speckle(input.localPosition, 40.0);
      surface.albedo = mix(vec3f(0.32, 0.34, 0.37) * (0.93 + 0.14 * grain), vec3f(0.68, 0.70, 0.74), rim);
      surface.specular = vec3f(0.03);
      surface.shininess = 14.0;
      surface.occlusion = mix(0.68, 1.0, saturate(input.localPosition.y / 0.9 + 1.0));
    }
    default: {}
  }
  return surface;
}

@fragment
fn fs_main(input: PartVarying, @builtin(front_facing) front: bool) -> @location(0) vec4f {
  let n = normalize(select(-input.normal, input.normal, front));
  let viewDirection = normalize(camera.eye - input.worldPosition);
  let shadow = sunShadow(shadowMap, shadowSampler, scene.lightViewProjection, input.worldPosition, n);
  let surface = surfaceFor(input);
  let radiance = lightSurface(surface, n, viewDirection, scene.sunDirection, scene.sunColor, scene.skyColor, shadow);
  return finish(radiance, scene.exposure);
}
