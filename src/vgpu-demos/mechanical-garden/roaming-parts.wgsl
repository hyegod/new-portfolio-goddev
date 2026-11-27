import { linearToSrgb3, tonemapAces } from "@vgpu/wgsl-std/color";
import { pcg3d, unitFloat } from "@vgpu/wgsl-std/hash";
import { saturate } from "@vgpu/wgsl-std/math";
import { instanceWorldMatrix, transformNormal, transformPosition } from "@vgpu/wgsl-std/scene";
import { Surface, lightSurface } from "./common.wgsl";

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
  switch input.material {
    case 0u: { // MATERIAL_COVER: crisp porcelain-concrete shell
      surface.albedo = vec3f(0.84, 0.86, 0.89);
      surface.shininess = 74.0;
      surface.specular = vec3f(0.07);
    }
    case 1u: { // MATERIAL_ACCENT: GODDEV Electric Cobalt (#0038FF)
      surface.albedo = vec3f(0.014, 0.08, 0.98);
      surface.shininess = 56.0;
      surface.specular = vec3f(0.09);
    }
    case 2u: { // MATERIAL_GRAPHITE: architectural Matte Ink (#0D0E12)
      let grain = speckle(input.localPosition, 260.0);
      surface.albedo = vec3f(0.022, 0.026, 0.038) * (0.86 + 0.28 * grain);
      surface.shininess = 42.0;
      surface.specular = vec3f(0.06);
    }
    case 3u: { // MATERIAL_LENS: obsidian optical glass
      surface.albedo = vec3f(0.006, 0.008, 0.015);
      surface.specular = vec3f(0.16);
      surface.shininess = 220.0;
    }
    case 4u: { // MATERIAL_LED: glowing Electric Cobalt eyes & beacon
      let glow = input.style.y;
      let pulse = 0.82 + 0.18 * sin(camera.time * 3.4 + input.style.z);
      surface.albedo = vec3f(0.01, 0.02, 0.06);
      surface.specular = vec3f(0.08);
      surface.shininess = 120.0;
      surface.emission = vec3f(0.16, 0.56, 3.0) * (0.45 + 0.75 * glow) * pulse;
    }
    case 5u: { // MATERIAL_RUBBER
      surface.albedo = vec3f(0.028, 0.03, 0.036);
      surface.shininess = 12.0;
      surface.specular = vec3f(0.03);
    }
    case 6u: { // MATERIAL_METAL: brushed architectural steel actuators
      surface.albedo = vec3f(0.10, 0.11, 0.125);
      surface.specular = vec3f(0.66, 0.70, 0.76);
      surface.shininess = 66.0;
    }
    default: {}
  }
  return surface;
}

@fragment
fn fs_main(input: PartVarying, @builtin(front_facing) front: bool) -> @location(0) vec4f {
  let n = normalize(select(-input.normal, input.normal, front));
  let viewDirection = normalize(camera.eye - input.worldPosition);
  let surface = surfaceFor(input);

  // Soft height-based self-grounding occlusion (lighter near feet, brighter on top)
  let selfOcc = mix(0.76, 1.0, saturate(input.worldPosition.y / 0.55));
  var s = surface;
  s.occlusion *= selfOcc;

  var radiance = lightSurface(
    s,
    n,
    viewDirection,
    camera.sunDirection,
    camera.sunColor,
    camera.skyColor,
    1.0,
  );

  // Subtle cobalt-silver Fresnel rim so silhouette reads cleanly on BOTH light concrete & dark obsidian sections
  let ndv = saturate(dot(n, viewDirection));
  let rim = pow(1.0 - ndv, 3.4) * 0.22;
  radiance += vec3f(0.18, 0.34, 0.72) * rim;

  let srgb = linearToSrgb3(tonemapAces(radiance * camera.exposure));
  return vec4f(srgb, 1.0);
}
