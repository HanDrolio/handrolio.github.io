import * as T from 'three';
import { random, hash } from '../core/seed.js';
import { bake, ball, box, cylinder, GOLD, light, mesh, ring, sign, standard } from './kit.js';

const deck = standard('#3e4550');
const frame = standard('#586777');
const turf = standard('#344b43');
const moss = standard('#526859');
const bark = standard('#694d3f');
const brasses = standard('#a68155', 0.45, 0.47);
const lantern = light('#f5c389', 1.12);
export const GARDEN_LEVEL = 10.82;
export const SEAT = new T.Vector3(0, GARDEN_LEVEL, -17.12);

function branch(group, start, end, radius, mat) {
  const delta = end.clone().sub(start);
  const center = start.clone().lerp(end, 0.5);
  const shape = new T.CylinderGeometry(radius * 0.61, radius, delta.length(), 5);
  const limb = mesh(group, shape, mat, center.x, center.y, center.z);
  limb.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), delta.normalize());
}

function tree(group, rng) {
  const origin = new T.Vector3(0, GARDEN_LEVEL + 0.27, -12.45);
  const trunk = new T.Vector3(0.3, GARDEN_LEVEL + 4.73, -12.59);
  branch(group, origin, trunk, 0.47, bark);
  const leaves = [standard('#405b4d'), standard('#607665'), standard('#83917a'), standard('#394c49')];
  for (let i = 0; i < 11; i++) {
    const a = i * 2.4;
    const radius = 1.12 + rng() * 2.15;
    const end = new T.Vector3(Math.cos(a) * radius, GARDEN_LEVEL + 4.02 + rng() * 1.66, -12.57 + Math.sin(a) * radius * 0.86);
    branch(group, origin.clone().lerp(trunk, 0.45 + rng() * 0.43), end, 0.12 + rng() * 0.11, bark);
    const crown = ball(group, end.x, end.y, end.z, 1.1 + rng() * 0.56, leaves[i % leaves.length], 1);
    crown.scale.set(1.4, 0.75 + rng() * 0.39, 1.05);
    crown.rotation.y = a;
  }
  ball(group, 0.33, GARDEN_LEVEL + 5.43, -12.55, 1.52, leaves[1], 1).scale.set(1.31, 0.84, 1.21);
}

function cat(world, group) {
  const figure = new T.Group();
  figure.position.set(2.5, GARDEN_LEVEL + 0.11, -14.95);
  group.add(figure);
  const coat = standard('#9b7b58');
  const markings = standard('#665541');
  const white = standard('#ded3b7');
  ball(figure, 0, 0.29, 0, 0.29, coat, 1).scale.set(1.42, 0.81, 0.77);
  ball(figure, -0.27, 0.47, 0.025, 0.19, coat, 1);
  for (const side of [-1, 1]) {
    const ear = mesh(figure, new T.ConeGeometry(0.102, 0.19, 3), markings, -0.29, 0.655, side * 0.103);
    ear.rotation.x = side * 0.2;
    ball(figure, -0.408, 0.489, side * 0.112, 0.023, light('#ffe9a6', 1.05));
    for (const x of [-0.2, 0.21]) ball(figure, x, 0.13, side * 0.11, 0.104, x < 0 ? white : coat);
  }
  const tail = new T.Group();
  tail.position.set(0.28, 0.29, 0.02);
  figure.add(tail);
  for (let i = 0; i < 7; i++) ball(tail, Math.sin(i * 0.24) * 0.48, Math.sin(i * 0.31) * 0.29, 0, 0.079 - i * 0.005, i > 3 ? markings : coat);
  world.target('cat', 'The Garden Cat', figure.position.x, GARDEN_LEVEL + 0.52, figure.position.z, 3.2, 'Say hello');
  world.animations.push(time => { tail.rotation.y = Math.sin(time * 1.42) * 0.41; figure.rotation.y = Math.sin(time * 0.49) * 0.21 - 0.3; });
  bake(figure);
  bake(tail);
}

export function makeGarden(world, day) {
  const group = new T.Group();
  const access = new T.Group();
  world.gardenGroup = group;
  world.root.add(group, access);
  const rng = random(hash(`${day.code}/garden`));
  const y = GARDEN_LEVEL;
  ring(group, 0, y, 0, 24.12, 17.81, deck, 100);
  world.collision.disc(0, 0, 24.1, y, 6.28);
  for (const radius of [6.43, 8.55, 21.65, 23.49]) ring(group, 0, y + 0.016, 0, radius, 0.046, brasses, 100);
  const platforms = [[7.85, 12.55, 0.63], [7.83, 10.3, 1.52], [6.99, 8.28, 2.41], [5.74, 6.55, 3.30],
    [4.27, 5.13, 4.19], [2.67, 3.72, 5.08], [0.96, 2.64, 5.97], [-0.81, 1.68, 6.86],
    [-2.41, 0.64, 7.75], [-3.07, -1.23, 8.64], [-2.55, -2.96, 9.53], [-1.40, -4.74, 10.42]];
  for (const [index, [x, z, height]] of platforms.entries()) {
    box(access, x, height - 0.13, z, 1.75, 0.26, 1.57, index % 2 ? frame : deck);
    box(access, x, height + 0.008, z + 0.66, 1.48, 0.024, 0.045, lantern);
    box(access, x, height - 0.25, z, 0.29, 0.25, 1.09, brasses);
    world.collision.floor(access, x, z, 1.76, 1.58, height);
  }
  for (const dx of [-0.35, 0.35]) box(access, 6.99 + dx, 1.15, 9.08, 0.063, 2.29, 0.091, brasses);
  for (let i = 1; i <= 7; i++) box(access, 6.99, i * 0.31, 9.08, 0.69, 0.066, 0.1, frame);
  world.collision.ladders.push({ x: 6.99, z: 9.13, top: 2.41, exitZ: 8.52 });
  sign(access, { x: 7.68, y: 1.33, z: 13.41, width: 1.88, height: 0.71,
    title: 'The Garden', kicker: 'ROOF ACCESS', subtitle: 'CLIMB / JUMP', color: '#ead2a6' });

  bake(access);
  for (let i = 0; i < 60; i++) {
    const a = i / 60 * Math.PI * 2;
    const x = Math.sin(a) * 23.83, z = Math.cos(a) * 23.83;
    box(group, x, y + 0.32, z, 2.55, 0.64, 0.35, frame, a);
    box(group, x, y + 0.68, z, 2.55, 0.08, 0.46, brasses, a);
    world.collision.wall(group, x, z, 2.62, 0.45, y, y + 0.72, a);
  }
  for (let i = 0; i < 17; i++) {
    const a = i / 17 * Math.PI * 2;
    const x = Math.sin(a) * 6.52, z = Math.cos(a) * 6.52;
    if (z < -4.65 && x < 1.6 && x > -3.5) continue;
    box(group, x, y + 0.15, z, 2.38, 0.3, 0.23, frame, a);
  }
  cylinder(group, 0, y + 0.055, -12.55, 5.17, 5.21, 0.11, 36, turf);
  ring(group, 0, y + 0.117, -12.55, 5.21, 0.061, brasses, 64);
  cylinder(group, 0, y + 0.14, -12.55, 1.89, 2.19, 0.17, 12, moss);
  for (let i = 0; i < 88; i++) {
    const angle = rng() * Math.PI * 2, radius = 1.3 + rng() * 3.65;
    const x = Math.cos(angle) * radius, z = -12.55 + Math.sin(angle) * radius;
    if (Math.abs(x) < 1.05 && z < -15.6) continue;
    const stem = mesh(group, new T.ConeGeometry(0.035 + rng() * 0.025, 0.11 + rng() * 0.22, 3),
      i % 3 ? moss : turf, x, y + 0.19, z);
    stem.rotation.z = (rng() - 0.5) * 0.71;
  }
  tree(group, rng);
  world.collision.wall(group, 0, -12.55, 0.77, 0.82, y, y + 3.7);
  for (const side of [-1, 1]) {
    box(group, side * 0.86, y + 0.24, -17.44, 0.14, 0.48, 0.58, frame);
    box(group, side * 0.86, y + 0.69, -17.74, 0.12, 0.73, 0.11, frame);
    const x = side * 3.65;
    cylinder(group, x, y + 0.3, -16.84, 0.09, 0.11, 0.6, 6, frame);
    box(group, x, y + 0.69, -16.84, 0.21, 0.23, 0.21, lantern);
  }
  for (let i = 0; i < 4; i++) {
    box(group, 0, y + 0.48, -17.15 - i * 0.158, 2.28, 0.1, 0.131, bark);
    box(group, 0, y + 0.59 + i * 0.145, -17.77, 2.28, 0.12, 0.08, bark);
  }
  world.collision.wall(group, 0, -17.46, 2.2, 0.74, y, y + 1.04);
  world.target('bench', 'The Present Moment', 0, y + 0.72, -17.22, 4.15, 'Sit for a while');
  sign(group, { x: 0, y: y + 1.51, z: -18.14, width: 3.1, height: 0.77,
    title: 'The Present Moment', kicker: 'THE GARDEN     /     OPEN SKY', color: '#d6ddc4' });
  if (day.cat) cat(world, group);
  bake(group);
}
