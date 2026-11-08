import * as T from 'three';
import { WINGS } from '../personas/personas.js';
import { random, hash } from '../core/seed.js';
import { makeExhibit } from '../memories/exhibit.js';
import { bake, ball, box, cylinder, GOLD, light, mesh, pointIn, ring, sign, standard, torus } from './kit.js';

const palettes = [
  ['#303f53', '#222e3d', '#46576b', '#728ca6'],
  ['#52372d', '#2d2528', '#704c39', '#a97853'],
  ['#263f40', '#253136', '#536663', '#689088'],
  ['#3c4149', '#2b3139', '#5b5e66', '#85858b'],
  ['#302a36', '#201c29', '#463648', '#825260'],
  ['#3c342d', '#29262a', '#674d3d', '#ac8869'],
  ['#34313c', '#25262e', '#534650', '#886857'],
  ['#332b4b', '#25223d', '#59476e', '#8071a8'],
];
const black = standard('#111823');
const rail = standard('#615347', 0.55, 0.32);

function palette(index, wing) {
  const [wall, floor, panel, metal] = palettes[index];
  return { wall: standard(wall), floor: standard(floor, 0.73, 0.22), panel: standard(panel),
    metal: standard(metal, 0.51, 0.42), glow: light(wing.color, 0.8), dim: light(wing.color, 0.29) };
}

function longWall(world, group, x, from, to, p, height) {
  if (to - from < 0.1) return;
  const depth = to - from, d = (from + to) / 2;
  box(group, x, height / 2, -d, 0.31, height, depth + 0.025, p.wall);
  box(group, x, 0.19, -d, 0.48, 0.38, depth, p.panel);
  box(group, x, height - 0.49, -d, 0.4, 0.08, depth, p.metal);
  world.collision.wall(group, x, -d, 0.35, depth + 0.04, 0, height);
}

function crossWall(world, group, x1, x2, d, p, height) {
  if (x2 - x1 < 0.1) return;
  const x = (x1 + x2) / 2, width = x2 - x1;
  box(group, x, height / 2, -d, width, height, 0.31, p.wall);
  box(group, x, 0.2, -d, width, 0.4, 0.47, p.panel);
  box(group, x, height - 0.46, -d + 0.21, width, 0.04, 0.035, p.dim);
  world.collision.wall(group, x, -d, width + 0.04, 0.35, 0, height);
}

function portalWall(world, group, x, half, d, opening, p, height, doorHalf = 2.75) {
  if (opening === null) return crossWall(world, group, x - half, x + half, d, p, height);
  crossWall(world, group, x - half, opening - doorHalf, d, p, height);
  crossWall(world, group, opening + doorHalf, x + half, d, p, height);
  box(group, opening, height - 0.29, -d, doorHalf * 2, 0.62, 0.65, p.panel);
  box(group, opening, height - 0.61, -d + 0.28, doorHalf * 1.97, 0.04, 0.04, p.glow);
  for (const side of [-1, 1]) {
    box(group, opening + side * (doorHalf + 0.16), height / 2, -d, 0.37, height, 0.63, p.panel);
    box(group, opening + side * (doorHalf + 0.03), height * 0.54, -d + 0.31, 0.052, height * 0.63, 0.06, p.dim);
  }
}

function room(world, group, x, half, from, to, p, height, doors, secret = null) {
  const length = to - from;
  const d = (to + from) / 2;
  box(group, x, -0.21, -d, half * 2 + 0.12, 0.42, length + 0.13, p.floor);
  world.collision.floor(group, x, -d, half * 2, length + 0.1, 0);
  box(group, x, height + 0.11, -d, half * 2 + 0.28, 0.24, length + 0.15, p.wall);
  longWall(world, group, x - half, from, to, p, height);
  if (secret === null) {
    longWall(world, group, x + half, from, to, p, height);
  } else {
    longWall(world, group, x + half, from, secret - 1.34, p, height);
    longWall(world, group, x + half, secret + 1.34, to, p, height);
    box(group, x + half, height - 0.36, -secret, 0.57, 0.76, 2.7, p.panel);
  }
  if (doors[0] !== undefined) portalWall(world, group, x, half, from, doors[0], p, height);
  if (doors[1] !== undefined) portalWall(world, group, x, half, to, doors[1], p, height);
  for (const side of [-1, 1]) {
    box(group, x + side * (half - 0.28), 0.014, -d, 0.027, 0.023, length - 0.22, p.dim);
    box(group, x + side * (half - 0.74), height - 0.13, -d, 0.22, 0.17, length, p.panel);
    box(group, x + side * (half - 0.74), height - 0.225, -d, 0.035, 0.031, length - 0.5, p.glow);
  }
  for (let i = 1; i < Math.ceil(length / 4.5); i++) {
    const depth = from + i * 4.2;
    if (depth >= to - 0.64) break;
    box(group, x, height - 0.14, -depth, half * 2, 0.28, 0.22, p.panel);
    for (const side of [-1, 1]) {
      if (side === 1 && secret !== null && Math.abs(depth - secret) < 1.7) continue;
      box(group, x + side * (half - 0.17), height / 2, -depth, 0.24, height, 0.28, p.panel);
      box(group, x + side * (half - 0.317), 2.45, -depth, 0.024, 1.16, 0.065, p.dim);
    }
  }
}

function motif(world, group, wing, p, x, d, seed, second) {
  const z = -d;
  const rng = random(hash(`${seed}/${wing.id}/sculpture/${second}`));
  const common = (x, y, z, w, h, l, material, a) => box(group, x, y, z, w, h, l, material, a);
  if (wing.id === 'orion') {
    const node = new T.Group();
    node.position.set(x, 0, z);
    group.add(node);
    for (let i = 0; i < 6; i++) {
      const height = 1.55 + i * 0.34;
      const offset = (i - 2.5) * 0.54;
      box(node, offset, height / 2, Math.abs(offset) * 0.25, 0.13, height, 0.14, p.metal);
      box(node, offset, height, 0.1, 0.45, 0.055, 0.71, p.glow);
      if (i % 2 === 0) ball(node, offset, height + 0.34, 0.12, 0.15, p.glow);
    }
    cylinder(node, 0, 0.18, 0, 1.94, 2.05, 0.36, 6, p.panel);
    world.collision.wall(group, x, z, 2.95, 1.47, 0, 0.36);
    bake(node);
  } else if (wing.id === 'astro') {
    for (let i = 0; i < 7; i++) {
      const radius = 0.29 + rng() * 0.25;
      const orb = ball(group, x + (i - 3) * 0.63, 1.15 + Math.sin(i * 0.9) * 0.58 + (i % 2) * 0.38,
        z + Math.cos(i * 1.3) * 0.46, radius, i % 3 ? p.metal : p.glow, 1, false);
      const y = orb.position.y;
      world.animations.push(time => { orb.position.y = y + Math.sin(time * 0.9 + i) * 0.14; });
    }
    cylinder(group, x, 0.11, z, 2.27, 2.31, 0.22, 32, p.panel);
    ring(group, x, 0.224, z, 2.04, 0.03, p.glow, 64);
  } else if (wing.id === 'ripple') {
    const deep = standard('#13343c', 0.2, 0.52);
    const pool = new T.MeshStandardMaterial({ color: '#398e92', roughness: 0.26, metalness: 0.4, transparent: true, opacity: 0.76 });
    cylinder(group, x, 0.13, z, 2.7, 2.82, 0.26, 44, p.panel);
    cylinder(group, x, 0.26, z, 2.47, 2.47, 0.05, 44, deep);
    cylinder(group, x, 0.36, z, 2.45, 2.45, 0.035, 44, pool);
    for (const radius of [0.61, 1.18, 1.76, 2.14]) ring(group, x, 0.384, z, radius, 0.012, p.dim, 56);
    for (let i = 0; i < 4; i++) {
      const px = x - 1.45 + i * 0.97;
      cylinder(group, px, 0.18, z + 0.65, 0.35, 0.41, 0.35, 8, p.metal);
      world.collision.floor(group, px, z + 0.65, 0.67, 0.67, 0.355);
    }
    world.collision.floor(group, x, z, 3.98, 2.7, 0.38, 'ripple');
  } else if (wing.id === 'brix') {
    for (let i = -2; i < 3; i++) {
      const thickness = 0.15 + rng() * 0.14;
      const height = 0.64 + rng() * 0.36;
      const plate = cylinder(group, x + i * 0.55, height, z, height, height, thickness, 28, p.metal);
      plate.rotation.z = Math.PI / 2;
      const center = torus(group, x + i * 0.55 + thickness * 0.55, height, z, 0.13, 0.034, p.glow, 18);
      center.rotation.y = Math.PI / 2;
    }
    common(x, 0.13, z, 3.9, 0.26, 1.8, p.panel);
    world.collision.wall(group, x, z, 3.4, 1.7, 0, 1.55);
  } else if (wing.id === 'demon') {
    const mirror = standard('#344050', 0.12, 0.77);
    const frame = new T.Group();
    frame.position.set(x, 0, z);
    frame.rotation.y = second ? -0.15 : 0.15;
    group.add(frame);
    box(frame, 0, 1.51, 0, 2.18, 3.08, 0.22, p.metal);
    box(frame, 0, 1.52, 0.13, 1.91, 2.84, 0.05, mirror);
    box(frame, 0, 1.52, -0.13, 1.91, 2.84, 0.05, mirror);
    for (let i = -2; i <= 2; i++) {
      const slash = box(frame, i * 0.32, 1.5, 0.165, 0.012, 2.12, 0.009, p.dim);
      slash.rotation.z = -0.35;
    }
    const halo = torus(frame, 0, 1.57, 0.185, 0.77, 0.012, p.glow, 40);
    halo.scale.y = 1.24;
    const point = pointIn(group, x, 1.45, z + 0.85);
    world.target('mirror', 'Through the looking glass', point.x, point.y, point.z, 2.65, 'Cross the reflection', second ? 0 : 1);
    world.mirrors[second ? 1 : 0] = point;
    bake(frame);
  } else if (wing.id === 'hermes') {
    for (const side of [-1, 1]) {
      for (let row = 0; row < 4; row++) {
        common(x + side * 1.73, 0.24 + row * 0.76, z, 1.27, 0.1, 2.72, p.panel);
        for (let i = 0; i < 12; i++) {
          const h = 0.3 + rng() * 0.31;
          const book = [p.metal, p.wall, rail, p.dim][Math.floor(rng() * 4)];
          common(x + side * 1.73, 0.3 + row * 0.76 + h / 2, z + (i - 5.5) * 0.19, 0.48, h, 0.13 + rng() * 0.035, book, rng() * 0.06);
        }
      }
    }
    for (let i = 0; i < 6; i++) {
      const h = 0.2 + i * 0.23, stepZ = z + 2.05 - i * 0.69;
      common(x, h / 2, stepZ, 1.36, h, 0.67, i % 2 ? p.panel : p.metal);
      common(x, h + 0.01, stepZ + 0.08, 1.24, 0.032, 0.42, p.dim);
      world.collision.floor(group, x, stepZ, 1.38, 0.72, h);
    }
  } else {
    for (let i = 0; i < 8; i++) {
      const h = 0.42 + i * 0.45;
      const offset = Math.sin(i * 0.95) * 1.48;
      const stepZ = z + 2.2 - i * 0.83;
      const shape = common(x + offset, h - 0.09, stepZ, 1.57, 0.18, 0.77, i % 2 ? p.panel : p.metal);
      if (i > 4) shape.rotation.z = (i - 4) * 0.14;
      common(x + offset, h + 0.01, stepZ, 1.32, 0.025, 0.045, p.glow);
      if (i <= 5) world.collision.floor(group, x + offset, stepZ, 1.56, 0.79, h);
    }
    const halo = torus(group, x, 3.63, z - 2.0, 0.87, 0.027, p.glow, 40);
    halo.rotation.set(0.24, 0.25, 0.2);
  }
}

function secretRoom(world, group, wing, p, x, d) {
  const length = 7.9;
  const z = -d;
  box(group, x + length / 2, -0.2, z, length + 0.15, 0.4, 4.75, p.floor);
  box(group, x + length / 2, 4.02, z, length, 0.27, 4.75, p.wall);
  world.collision.floor(group, x + length / 2, z, length + 0.16, 4.72, 0);
  for (const side of [-1, 1]) {
    box(group, x + length / 2, 2, z + side * 2.38, length, 4, 0.27, p.wall);
    box(group, x + length / 2, 3.67, z + side * 2.2, length - 0.42, 0.04, 0.06, p.dim);
    world.collision.wall(group, x + length / 2, z + side * 2.38, length, 0.27, 0, 4);
  }
  for (const side of [-1, 1]) {
    box(group, x + 0.03, 2, z + side * 1.87, 0.31, 4, 1.05, p.wall);
    world.collision.wall(group, x + 0.03, z + side * 1.87, 0.32, 1.05, 0, 4);
  }
  box(group, x + length, 2, z, 0.29, 4, 4.77, p.wall);
  world.collision.wall(group, x + length, z, 0.3, 4.8, 0, 4);
  const star = ball(group, x + 5.55, 1.72, z, 0.39, p.glow, 0, false);
  ring(group, x + 5.55, 0.012, z, 1.49, 0.033, p.dim, 48);
  ring(group, x + 5.55, 0.014, z, 1.15, 0.023, p.glow, 48);
  sign(group, { x: x + length - 0.19, y: 2.55, z, width: 3.17, height: 1.04, angle: -Math.PI / 2,
    title: 'The Unmarked Room', kicker: `${wing.wing.toUpperCase()} / SURPLUS SPACE`, color: wing.color });
  const at = pointIn(group, x + 5.55, 1.65, z);
  world.target('secret', 'The Unmarked Room', at.x, at.y, at.z, 3.7, 'Read the inscription', wing.id);
  world.animations.push(time => { star.rotation.set(time * 0.19, time * 0.26, 0.4); });
}

export function makeWings(world, day) {
  WINGS.forEach((wing, index) => {
    const angle = index * Math.PI / 4;
    const group = new T.Group();
    group.position.set(Math.sin(angle) * 23.7, 0, -Math.cos(angle) * 23.7);
    group.rotation.y = -angle;
    world.root.add(group);
    const p = palette(index, wing);
    const layout = day.layouts[wing.id];
    const front = 7.6;
    const middle = front + layout.front;
    const back = middle + 6.4;
    const end = back + layout.back;
    const height = 5.28 + layout.detail * 0.34;
    const secret = day.secretWing === wing.id ? front + 2.8 : null;
    const split = Math.min(8, Math.ceil(day.wingEntries[wing.id].length / 2));
    room(world, group, 0, 3.24, 0, front, p, 4.5, []);
    room(world, group, 0, layout.half, front, middle, p, height, [0, layout.offset], secret);
    room(world, group, layout.offset, 2.75, middle, back, p, 4.52, []);
    room(world, group, layout.offset, layout.half - 0.35, back, end, p, height + 0.16, [layout.offset, null]);
    if (secret !== null) secretRoom(world, group, wing, p, layout.half, secret);
    sign(group, { x: 0, y: 3.96, z: -front + 0.27, width: 4.45, height: 0.72, color: wing.color,
      title: `${wing.wing} Gallery`, kicker: `GALLERY   0${index + 1}     /     THE SHIFTING HALLS` });
    sign(group, { x: layout.offset, y: 3.8, z: -end + 0.19, width: 4.66, height: 1.02,
      title: wing.line, kicker: `${wing.name.toUpperCase()}     /     ARCHIVE B`, color: wing.color });
    sign(group, { x: layout.offset, y: 3.89, z: -middle - 0.36, width: 3.5, height: 0.68, angle: Math.PI,
      title: 'Return to the Rotunda', kicker: 'COSM.OS     /     ATRIUM', color: wing.color });
    for (let i = 0; i < 3; i++) {
      const z = -1.45 - i * 1.57;
      for (const side of [-1, 1]) {
        box(group, side * 2.84, 1.89, z, 0.19, 2.77, 0.24, p.panel);
        box(group, side * 2.72, 2.12, z, 0.055, 1.61, 0.04, p.glow);
      }
    }
    motif(world, group, wing, p, 0, front + layout.front * 0.55, day.code, false);
    motif(world, group, wing, p, layout.offset, back + layout.back * 0.55, day.code, true);
    if (wing.id === 'brix') {
      const px = layout.offset - layout.half + 0.53;
      const depth = back + layout.back * 0.53;
      box(group, px, 1.81, -depth, 0.23, 2.77, 5.85, p.metal);
      for (let i = 0; i < 6; i++) box(group, px + 0.135, 1.76, -depth - 2.45 + i * 0.94, 0.038, 1.81, 0.083, p.glow);
      world.collision.runways.push(world.collision.rectangle(group, px + 0.75, -depth, 1.33, 5.85));
      box(group, px + 0.66, 1.13, -depth - 3.28, 1.37, 0.22, 0.88, p.panel);
      world.collision.floor(group, px + 0.66, -depth - 3.28, 1.37, 0.9, 1.24);
    }
    if (wing.id === 'demon' && day.basement) {
      const x = layout.offset + layout.half - 1.7;
      box(group, x, 1.56, -end + 0.47, 1.86, 3.14, 0.51, black);
      box(group, x, 2.99, -end + 0.752, 1.65, 0.045, 0.045, p.glow);
      sign(group, { x, y: 1.58, z: -end + 0.758, width: 1.39, height: 0.55, title: 'The Basement',
        kicker: 'SEALED ARCHIVE', color: wing.color });
      const at = pointIn(group, x, 1.58, -end + 0.8);
      world.target('basement', 'The Basement', at.x, at.y, at.z, 3.1, 'Approach the sealed archive');
      world.basementReturn = pointIn(group, x, 0, -end + 2.8);
    }
    const entries = day.wingEntries[wing.id];
    for (let i = 0; i < Math.min(16, entries.length); i++) {
      const second = i >= split;
      const seat = second ? i - split : i;
      const side = seat % 2 ? 1 : -1;
      const row = Math.floor(seat / 2);
      const nearSecret = !second && side > 0 && secret !== null;
      const d = (second ? back : front) + (nearSecret ? 4.5 + row * 1.58 : 2.55 + row * 2.06 + (side > 0 ? 0.24 : 0));
      const x = (second ? layout.offset : 0) + side * (layout.half - (second ? 1.59 : 1.38));
      makeExhibit(world, group, entries[i], wing, x, d, side);
    }
    if (entries.length > 16) {
      const at = pointIn(group, layout.offset - 1.95, 1.26, -end + 0.9);
      sign(group, { x: layout.offset - 1.95, y: 1.28, z: -end + 0.31, width: 2.51, height: 0.68,
        title: 'Exhibit Catalogue', kicker: `${entries.length} ENTRIES`, color: wing.color });
      world.target('catalogue', 'Exhibit Catalogue', at.x, at.y, at.z, 3.2, 'Browse this wing', wing.id);
    }
    world.wingZones.push({ id: wing.id, angle, length: end, x: group.position.x, z: group.position.z });
    const place = pointIn(group, 0, 0, -3.5);
    world.wingEntries[wing.id] = { place, yaw: -angle };
    bake(group);
  });
}
