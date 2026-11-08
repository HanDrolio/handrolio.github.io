import * as T from 'three';
import { WINGS } from '../personas/personas.js';
import { bake, ball, box, cylinder, light, mesh, ring, standard, torus } from './kit.js';

// Procedural geometry only: no fetched textures, models, or external image requests.
// Deliberately chunky silhouettes, emissive edges, and sparse geometry evoke PS2-era sci-fi.
const NIGHT = standard('#070d27', 0.94, 0.1);
const MIDNIGHT = standard('#111a43', 0.82, 0.26);
const COBALT = standard('#204b95', 0.57, 0.48);
const CYAN = light('#58e0ff', 1.2);
const YELLOW = light('#ffe76b', 1.14);
const VIOLET = light('#aa79ff', 1.02);
const TEAL = light('#4ce1c2', 0.95);
const GHOST = light('#385dce', 0.57);
const TAU = Math.PI * 2;

function orbital(group, x, y, z, radius, hue, tilt, animate, speed = 0.3) {
  const node = new T.Group();
  node.position.set(x, y, z);
  group.add(node);
  const outer = torus(node, 0, 0, 0, radius, 0.026, hue, 36, false);
  const inner = torus(node, 0, 0, 0, radius * 0.68, 0.016, GHOST, 32, false);
  outer.rotation.set(tilt, 0.25, 0.25);
  inner.rotation.set(0.26, tilt + 0.9, 0.7);
  mesh(node, new T.OctahedronGeometry(radius * 0.33), MIDNIGHT, 0, 0, 0, false);
  const core = mesh(node, new T.OctahedronGeometry(radius * 0.19), hue, 0, 0, 0, false);
  const spike = new T.LineSegments(
    new T.EdgesGeometry(new T.OctahedronGeometry(radius * 0.45)),
    new T.LineBasicMaterial({ color: '#87b6ff', transparent: true, opacity: 0.65 })
  );
  node.add(spike);
  if (animate) animate.push(time => {
    node.rotation.y = time * speed;
    node.rotation.z = Math.sin(time * 0.23 + x) * 0.08;
    core.rotation.y = -time * 0.45;
  });
  return node;
}

function retroMonument(group, x, z, angle, hue) {
  const obelisk = new T.Group();
  obelisk.position.set(x, 0, z);
  obelisk.rotation.y = angle;
  group.add(obelisk);
  cylinder(obelisk, 0, 0.22, 0, 0.82, 1.08, 0.44, 6, NIGHT);
  box(obelisk, 0, 1.66, 0, 0.91, 3.18, 0.85, COBALT);
  box(obelisk, 0, 1.65, 0.448, 0.12, 2.74, 0.027, hue);
  box(obelisk, 0, 3.21, 0, 1.23, 0.21, 1.11, NIGHT);
  mesh(obelisk, new T.ConeGeometry(0.6, 1.2, 4), NIGHT, 0, 3.87, 0);
  box(obelisk, 0, 3.34, 0.01, 0.77, 0.037, 0.75, YELLOW);
  return obelisk;
}

export function makeRetroShell(world, day) {
  const group = new T.Group();
  group.name = 'COSM.OS / PS2 cosmic architecture';
  world.root.add(group);
  const colors = [CYAN, YELLOW, TEAL, VIOLET];
  // Concentric scanline-like flooring is thin, decorative, and never obstructs collision.
  for (const radius of [3.3, 7.6, 12.35, 17.4, 22.1]) {
    ring(group, 0, 0.047, 0, radius, radius === 22.1 ? 0.052 : 0.022,
      radius === 12.35 ? YELLOW : GHOST, 64);
  }
  for (let i = 0; i < 32; i++) {
    const a = i / 32 * TAU;
    const r = i % 4 === 0 ? 19.4 : 21.35;
    box(group, Math.sin(a) * r, 0.055, -Math.cos(a) * r,
      i % 4 === 0 ? 0.16 : 0.06, 0.021, i % 4 === 0 ? 1.45 : 0.62,
      i % 4 === 0 ? YELLOW : CYAN, -a);
  }
  // Eight portals, each aligned with a real existing persona gallery.
  WINGS.forEach((wing, i) => {
    const a = i / 8 * TAU;
    const portal = new T.Group();
    portal.rotation.y = -a;
    group.add(portal);
    const accent = light(wing.color, 1.12);
    for (const side of [-1, 1]) {
      box(portal, side * 4.88, 2.54, -23.3, 0.28, 5.08, 0.42, NIGHT);
      box(portal, side * 4.88, 3.32, -23.07, 0.08, 3.54, 0.045, accent);
      box(portal, side * 5.14, 0.13, -23.14, 0.57, 0.18, 1.3, COBALT);
    }
    box(portal, 0, 6.83, -24.0, 8.5, 0.44, 0.82, MIDNIGHT);
    box(portal, 0, 6.57, -23.49, 7.85, 0.066, 0.053, accent);
    for (let k = 0; k < 5; k++) {
      const x = (k - 2) * 0.53;
      box(portal, x, 6.87, -23.48, 0.24, 0.14, 0.045, k % 2 ? CYAN : YELLOW);
    }
    // Monuments flank the entrance, well outside the walking aperture.
    retroMonument(portal, -6.5, -22.15, -0.2, accent);
    retroMonument(portal, 6.5, -22.15, 0.2, accent);
    // Floating tetrahedral beacons act as silhouettes against the night sky.
    const beacon = mesh(portal, new T.TetrahedronGeometry(0.74, 0), accent,
      0, 8.33, -23.4, false);
    world.animations.push(t => { beacon.rotation.y = t * 0.31 + i; beacon.rotation.z = Math.sin(t * 0.7 + i) * 0.14; });
  });
  // A suspended machine above the existing seed, never touching the player's path.
  orbital(group, 0, 8.1, 0, 2.15, CYAN, 0.63, world.animations, 0.16);
  orbital(group, 0, 8.08, 0, 3.1, VIOLET, 1.21, world.animations, -0.09);
  for (let i = 0; i < 8; i++) {
    const a = (i + 0.5) * TAU / 8;
    const x = Math.sin(a) * 13.5;
    const z = -Math.cos(a) * 13.5;
    const shard = mesh(group, new T.OctahedronGeometry(0.75, 0),
      colors[i % colors.length], x, 8.88, z, false);
    shard.scale.set(0.61, 1.77, 0.61);
    world.animations.push(t => {
      shard.rotation.y = t * (i % 2 ? -0.14 : 0.18) + a;
      shard.position.y = 8.88 + Math.sin(t * 0.57 + i) * 0.19;
    });
  }
  // The rooftop becomes a little slice of alien night.
  for (let i = 0; i < 12; i++) {
    const a = i * TAU / 12;
    const x = Math.sin(a) * 21.2;
    const z = Math.cos(a) * 21.2;
    const node = mesh(group, new T.TetrahedronGeometry(0.36, 0),
      i % 3 === 0 ? YELLOW : CYAN, x, 12.65, z, false);
    world.animations.push(t => {
      node.position.y = 12.65 + Math.sin(t * 0.7 + i) * 0.11;
      node.rotation.y = t * 0.18;
    });
  }
  bake(group);
}

export function makeRetroGallery(world, group, wing, index, layout) {
  const deco = new T.Group();
  group.add(deco);
  const accent = light(wing.color, 1.12);
  const glow = light(wing.color, 0.48);
  const limit = layout.half - 0.35;
  // Repeating colored hard-edged panels give each gallery a different personality.
  for (const segment of [layout.front + 1.4, layout.front + 3.8, layout.back + 1.8, layout.back + 4.2]) {
    const x0 = segment > layout.back ? layout.offset : 0;
    const half = segment > layout.back ? layout.half - 0.35 : layout.half;
    for (const side of [-1, 1]) {
      const x = x0 + side * (half - 0.19);
      box(deco, x, 2.64, -segment, 0.044, 1.88, 0.91, MIDNIGHT);
      box(deco, x - side * 0.036, 2.64, -segment, 0.019, 1.59, 0.65, GHOST);
      box(deco, x - side * 0.06, 2.65, -segment, 0.012, 0.09, 0.77, accent);
      box(deco, x - side * 0.064, 3.14, -segment, 0.012, 0.025, 0.57, YELLOW);
    }
  }
  // Centerline signage above head height in the first entrance hallway.
  box(deco, 0, 3.77, -2.45, 3.54, 0.12, 0.6, MIDNIGHT);
  box(deco, 0, 3.68, -2.13, 3.13, 0.048, 0.031, accent);
  for (let i = -2; i <= 2; i++) {
    const block = box(deco, i * 0.47, 3.82, -2.11, 0.2, 0.21, 0.035, i === 0 ? YELLOW : glow);
    block.rotation.z = i * 0.09;
  }
  for (const [offset, z] of [[0, -layout.front - 1.8], [layout.offset, -layout.back - 1.35]]) {
    ring(deco, offset, 0.031, z, 1.03, 0.025, glow, 36);
    ring(deco, offset, 0.034, z, 0.73, 0.018, accent, 36);
  }
  // A single floating gallery crest keeps polygon count in check on iPhone.
  const crest = mesh(deco, new T.OctahedronGeometry(0.35),
    accent, 0, 3.45, -4.5, false);
  crest.scale.y = 1.27;
  world.animations.push(t => { crest.rotation.y = t * 0.25; });
  bake(deco);
}
