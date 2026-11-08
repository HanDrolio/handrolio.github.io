import * as T from 'three';
import { WINGS } from '../personas/personas.js';
import { codeText } from '../core/seed.js';
import { bake, ball, box, cylinder, GOLD, light, mesh, ring, sign, standard, torus } from './kit.js';

const TAU = Math.PI * 2;
const stone = standard('#242e3c');
const dark = standard('#131d2a');
const panel = standard('#394454');
const rib = standard('#465362');
const floor = standard('#202a36', 0.69, 0.17);
const brass = standard('#a88051', 0.47, 0.49);
const trim = light('#b48754', 0.84);

function at(group, distance, angle, callback) {
  return callback(group, Math.sin(angle) * distance, -Math.cos(angle) * distance);
}

function orbitFloor(group) {
  cylinder(group, 0, -0.25, 0, 25.1, 25.1, 0.5, 96, floor);
  for (const [radius, width, mat] of [[23.3, 0.034, trim], [22.75, 0.075, brass], [19.8, 0.04, trim],
    [14.1, 0.042, brass], [10.85, 0.065, trim], [10.52, 0.025, brass], [6.25, 0.035, trim], [5.78, 0.075, brass]]) {
    ring(group, 0, 0.011, 0, radius, width, mat);
  }
  for (let i = 0; i < 96; i++) {
    const angle = i / 96 * TAU;
    at(group, 23.04, angle, (g, x, z) => box(g, x, 0.018, z, i % 4 ? 0.026 : 0.057, 0.024, i % 4 ? 0.21 : 0.38, brass, -angle));
  }
  for (let i = 0; i < 8; i++) {
    const angle = i / 8 * TAU;
    for (const offset of [-0.34, 0.34]) {
      const x = Math.sin(angle) * 16.3 + Math.cos(angle) * offset;
      const z = -Math.cos(angle) * 16.3 + Math.sin(angle) * offset;
      box(group, x, 0.022, z, 0.032, 0.024, 10.9, i % 2 === 0 ? trim : brass, -angle);
    }
    at(group, 9.8, angle, (g, x, z) => box(g, x, 0.023, z, 0.55, 0.025, 0.55, trim, -angle + Math.PI / 4));
  }
}

function arch(group, collision, wing, index) {
  const a = index / 8 * TAU;
  const node = new T.Group();
  node.rotation.y = -a;
  group.add(node);
  const accent = light(wing.color, 0.9);
  const muted = standard(new T.Color(wing.color).multiplyScalar(0.28).getHexString().replace(/^/, '#'));
  for (const side of [-1, 1]) {
    const x = side * 3.52;
    box(node, x, 2.54, -24.23, 1.08, 5.08, 1.77, panel);
    box(node, x, 0.35, -23.92, 1.38, 0.7, 1.6, stone);
    box(node, x - side * 0.34, 2.85, -23.34, 0.09, 4.05, 0.05, accent);
    box(node, x, 5.02, -24.13, 1.37, 0.2, 2.15, brass);
    box(node, x + side * 0.46, 6.15, -24.2, 0.3, 5.4, 1.07, dark);
  }
  box(node, 0, 5.49, -24.18, 7.12, 0.9, 1.76, muted);
  box(node, 0, 5.05, -23.31, 6.64, 0.08, 0.07, accent);
  box(node, 0, 6.02, -23.95, 7.53, 0.13, 1.83, brass);
  box(node, 0, 8.26, -24.41, 8.23, 4.15, 1.12, stone);
  sign(node, { x: 0, y: 5.58, z: -23.24, width: 5.55, height: 0.84,
    title: `${wing.name.toUpperCase()}  ${wing.glyph}`, kicker: `0${index + 1}   /   ${wing.wing.toUpperCase()} WING`, color: wing.color });
  collision.wall(node, -3.56, -24.2, 1.06, 1.72, 0, 5.1);
  collision.wall(node, 3.56, -24.2, 1.06, 1.72, 0, 5.1);
  bake(node);
}

export function makeRotunda(world, day) {
  const { root, collision } = world;
  const group = new T.Group();
  root.add(group);
  orbitFloor(group);
  collision.disc(0, 0, 25.05, 0);
  for (let i = 0; i < 96; i++) {
    const angle = i / 96 * TAU;
    const delta = Math.min(i % 12, 12 - i % 12);
    if (delta <= 2) continue;
    const width = delta === 3 ? 1.57 : 1.72;
    at(group, 24.8, angle, (g, x, z) => {
      box(g, x, 5.2, z, width, 10.4, 0.67, delta % 2 ? stone : dark, -angle);
      box(g, x * 0.981, 0.36, z * 0.981, width + 0.04, 0.72, 0.27, dark, -angle);
      box(g, x * 0.984, 7.93, z * 0.984, width + 0.1, 0.13, 0.23, brass, -angle);
      box(g, x * 0.977, 8.13, z * 0.977, width + 0.09, 0.034, 0.16, trim, -angle);
      collision.wall(g, x, z, width + 0.03, 0.72, 0, 10.3, -angle);
      if (delta === 5) {
        box(g, x * 0.965, 4.21, z * 0.965, 0.52, 7.2, 0.34, rib, -angle);
        box(g, x * 0.951, 4.62, z * 0.951, 0.042, 4.66, 0.07, light('#ca9468', 0.75), -angle);
      }
    });
  }
  WINGS.forEach((wing, index) => arch(group, collision, wing, index));
  for (let i = 0; i < 16; i++) {
    const angle = (i + 0.5) / 16 * TAU;
    at(group, 20.92, angle, (g, x, z) => {
      box(g, x, 4.98, z, 0.69, 9.96, 0.84, stone, -angle);
      box(g, x, 0.27, z, 1.18, 0.54, 1.27, panel, -angle);
      box(g, x, 9.68, z, 1.01, 0.36, 1.16, panel, -angle);
      box(g, x * 0.976, 6.3, z * 0.976, 0.026, 1.12, 0.035, trim, -angle);
      collision.wall(g, x, z, 0.78, 0.87, 0, 10, -angle);
    });
    const px = Math.sin(angle) * 14.05, pz = -Math.cos(angle) * 14.05;
    const beam = box(group, px, 10.44, pz, 0.32, 0.45, 14.3, rib, -angle);
    beam.rotation.x = -0.104;
  }

  const underside = new T.MeshStandardMaterial({ color: '#253041', side: T.DoubleSide, roughness: 0.9 });
  ring(group, 0, 10.7, 0, 25.25, 18.95, underside);
  ring(group, 0, 10.62, 0, 6.37, 0.1, light('#cfc6a2', 0.85));
  ring(group, 0, 10.49, 0, 8.25, 0.08, trim);
  ring(group, 0, 10.47, 0, 15.9, 0.055, trim);
  ring(group, 0, 10.25, 0, 21.27, 0.18, brass);
  for (let i = 0; i < 40; i++) {
    const a = i / 40 * TAU;
    at(group, 6.48, a, (g, x, z) => box(g, x, 10.51, z, 0.08, 0.25, 0.36, trim, -a));
  }

  cylinder(group, 0, 0.16, 0, 4.62, 4.86, 0.32, 24, stone);
  ring(group, 0, 0.329, 0, 4.55, 0.047, trim, 72);
  cylinder(group, 0, 0.385, 0, 2.78, 2.85, 0.12, 24, dark);
  ring(group, 0, 0.454, 0, 2.64, 0.028, trim, 72);
  cylinder(group, 0, 0.53, 0, 0.91, 1.13, 0.22, 12, brass);
  cylinder(group, 0, 0.92, 0, 0.66, 0.88, 0.63, 12, panel);
  cylinder(group, 0, 1.27, 0, 0.92, 0.72, 0.19, 12, brass);
  collision.disc(0, 0, 4.57, 0.32);
  collision.disc(0, 0, 2.78, 0.445);
  collision.wall(group, 0, 0, 1.72, 1.72, 0.445, 1.37);

  const seed = new T.Group();
  seed.position.set(0, 2.86, 0);
  group.add(seed);
  const crystal = mesh(seed, new T.OctahedronGeometry(0.93), standard('#a2c9e8', 0.26, 0.38), 0, 0, 0, false);
  crystal.scale.set(0.8, 1.44, 0.8);
  const edges = new T.LineSegments(new T.EdgesGeometry(crystal.geometry), new T.LineBasicMaterial({ color: '#d1eaff', transparent: true, opacity: 0.88 }));
  edges.scale.copy(crystal.scale).multiplyScalar(1.006);
  seed.add(edges);
  const inside = mesh(seed, new T.OctahedronGeometry(0.41), light('#e6f6ff', 1.25), 0, 0, 0, false);
  inside.scale.y = 1.65;
  const orbitA = torus(seed, 0, 0, 0, 1.44, 0.016, light('#aaceea', 1.08), 64, false);
  const orbitB = torus(seed, 0, 0, 0, 1.73, 0.012, light('#c4a37d', 1.02), 64, false);
  orbitA.rotation.set(1.04, 0.42, 0);
  orbitB.rotation.set(1.84, 0.2, 0.24);
  const coreLight = new T.PointLight('#94c9ff', 46, 13, 1.65);
  coreLight.position.y = 2.64;
  group.add(coreLight);
  for (let i = 0; i < 9; i++) {
    const angle = i / 9 * TAU;
    const star = ball(seed, Math.cos(angle) * 1.7, Math.sin(angle * 2) * 0.25, Math.sin(angle) * 1.7, 0.03 + i * 0.003, light('#daf2ff', 1.2), 0, false);
    star.rotation.z = angle;
  }
  const info = sign(group, { x: 0, y: 0.95, z: 1.12, width: 2.04, height: 0.59,
    title: 'The Daily Seed', kicker: `ARCHIVE   /   ${codeText(day.code)}`, color: '#accdeb' });
  info.rotation.x = -0.16;
  const seedStrip = sign(group, { x: 0, y: 1.33, z: 1.10, width: 1.95, height: 0.37,
    title: day.glyphs.join('  '), color: '#accdeb' });
  seedStrip.rotation.x = -0.15;
  world.target('seed', 'The Daily Seed', 0, 1.71, 0, 6.1, 'Check the pedestal');
  sign(group, { x: 0, y: 3.63, z: 24.02, width: 5.4, height: 1.0,
    title: 'THE ROTUNDA', kicker: 'COSM.OS     /     CENTRAL ATRIUM', color: '#d9b38a' });
  world.animations.push(time => {
    seed.rotation.y = time * 0.25;
    seed.position.y = 2.88 + Math.sin(time * 1.15) * 0.11;
    orbitB.rotation.x = 1.84 + Math.sin(time * 0.51) * 0.23;
  });
  bake(group);
}
