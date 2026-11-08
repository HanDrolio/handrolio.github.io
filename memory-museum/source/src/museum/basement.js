import * as T from 'three';
import { PERSONAS } from '../personas/personas.js';
import { makeExhibit } from '../memories/exhibit.js';
import { bake, ball, box, light, pointIn, sign, standard } from './kit.js';

const walls = standard('#1c1921');
const floor = standard('#272126');
const lightWall = standard('#382c31');
const bare = light('#f6be82', 1.23);
export const BASEMENT_SPAWN = new T.Vector3(180, 0, 4.7);

export function makeBasement(world) {
  const group = new T.Group();
  group.position.x = 180;
  world.root.add(group);
  box(group, 0, -0.21, 0, 15.5, 0.42, 15.0, floor);
  box(group, 0, 4.35, 0, 15.5, 0.22, 15, walls);
  world.collision.floor(group, 0, 0, 15.2, 14.8, 0);
  for (const side of [-1, 1]) {
    box(group, 0, 2.1, side * 7.4, 15.45, 4.2, 0.39, walls);
    box(group, side * 7.6, 2.1, 0, 0.36, 4.2, 15.0, walls);
    world.collision.wall(group, 0, side * 7.4, 15.45, 0.39, 0, 4.2);
    world.collision.wall(group, side * 7.6, 0, 0.36, 15.0, 0, 4.2);
  }
  for (let i = -3; i <= 3; i++) box(group, i * 2.08, 2.06, -7.14, 0.17, 4.12, 0.15, lightWall);
  const bulb = new T.Group();
  bulb.position.set(0, 4.2, -0.9);
  group.add(bulb);
  box(bulb, 0, -0.56, 0, 0.018, 1.12, 0.018, floor);
  ball(bulb, 0, -1.19, 0, 0.12, bare, 1);
  const glow = new T.PointLight('#ffb574', 35, 11, 1.52);
  glow.position.y = -1.22;
  bulb.add(glow);
  world.animations.push(time => { bulb.rotation.z = Math.sin(time * 0.88) * 0.21; });
  sign(group, { x: 0, y: 2.3, z: -7.14, width: 4.7, height: 1.15,
    title: 'A room for what was kept', kicker: 'THE BASEMENT     /     SEALED ARCHIVE', color: '#e3a780' });
  sign(group, { x: 0, y: 1.95, z: 7.16, width: 2.26, height: 0.78, angle: Math.PI,
    title: 'Back upstairs', kicker: 'EXIT', color: '#e3a780' });
  const exit = pointIn(group, 0, 1.52, 6.65);
  world.target('basementExit', 'Back upstairs', exit.x, exit.y, exit.z, 3.25, 'Return to the Shadow Wing');
  const sealed = world.archive.memories.filter(memory => memory.sealed);
  sealed.slice(0, 8).forEach((memory, index) => {
    const side = index % 2 ? 1 : -1;
    makeExhibit(world, group, memory, PERSONAS.demon, side * 5.6, -3.46 + Math.floor(index / 2) * 2.62, side);
  });
  if (sealed.length > 8) {
    const at = pointIn(group, 0, 1.45, -5.55);
    world.target('catalogue', 'Sealed catalogue', at.x, at.y, at.z, 3.25, 'Browse the sealed archive', 'sealed');
  }
  bake(group);
}
