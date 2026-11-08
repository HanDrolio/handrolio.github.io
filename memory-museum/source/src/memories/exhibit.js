import * as T from 'three';
import { PERSONAS, STATUS_LABELS, TYPE_LABELS } from '../personas/personas.js';
import { ball, box, cylinder, GOLD, light, mesh, pointIn, ring, sign, standard, torus } from '../museum/kit.js';

const bronze = standard('#8b684b', 0.51, 0.38);
const pedestal = standard('#26303b', 0.77, 0.2);
const black = standard('#0b1320', 0.49, 0.38);
const quiet = standard('#596577');

function statusColor(memory, wing) {
  return memory.integration_status === 'raw' ? '#f38989'
    : memory.integration_status === 'integrated' ? '#ffcf82'
      : memory.integration_status === 'myth' ? '#d3afff' : wing.color;
}

function label(group, memory, wing, x, d, side, color) {
  const front = side < 0 ? Math.PI / 2 : -Math.PI / 2;
  const panel = sign(group, { x: x - side * 0.58, y: 1.13, z: -d, angle: front,
    width: 1.52, height: 0.49, kicker: `${TYPE_LABELS[memory.type].toUpperCase()} / ${STATUS_LABELS[memory.integration_status].toUpperCase()}`,
    title: memory.title, color });
  panel.rotation.x = -0.12;
}

export function makeExhibit(world, group, memory, wing, x, d, side) {
  const z = -d;
  const color = statusColor(memory, wing);
  const accent = light(color, 1.04);
  const ghost = light(color, 0.48);
  const sculpture = new T.Group();
  sculpture.position.set(x, 1.89, z);
  group.add(sculpture);
  cylinder(group, x, 0.08, z, 0.65, 0.67, 0.16, 8, black);
  cylinder(group, x, 0.55, z, 0.36, 0.48, 0.84, 8, pedestal);
  cylinder(group, x, 1.01, z, 0.55, 0.51, 0.14, 8, bronze);
  ring(group, x, 0.012, z, 0.83, 0.025, ghost, 36);
  ring(group, x, 1.088, z, 0.44, 0.015, accent, 32);
  world.collision.wall(group, x, z, 0.95, 0.95, 0, 1.06);
  label(group, memory, wing, x, d, side, color);
  let core;
  if (memory.type === 'text') {
    core = mesh(sculpture, new T.OctahedronGeometry(0.28), accent, 0, 0.04, 0, false);
    core.scale.y = 1.25;
    for (let i = 0; i < 4; i++) {
      const line = torus(sculpture, 0, 0.09 - i * 0.135, 0, 0.35 + (i % 2) * 0.09, 0.008, ghost, 32, false);
      line.rotation.x = Math.PI / 2;
    }
  } else if (memory.type === 'audio') {
    core = ball(sculpture, 0, 0, 0, 0.26, accent, 1, false);
    const circle = torus(sculpture, 0, 0, 0, 0.44, 0.012, ghost, 38, false);
    circle.rotation.y = -side * Math.PI / 2;
    for (let i = 0; i < 11; i++) {
      box(sculpture, 0, 0, (i - 5) * 0.075, 0.035, 0.13 + Math.abs(Math.sin(i * 2.5)) * 0.47, 0.024, accent, 0, false);
    }
  } else if (memory.type === 'image' || memory.type === 'video') {
    const art = new T.Group();
    art.rotation.y = -side * Math.PI / 2;
    sculpture.add(art);
    box(art, 0, 0, 0, 1.12, 0.72, 0.075, bronze, 0, false);
    box(art, 0, 0, 0.047, 1.015, 0.62, 0.026, black, 0, false);
    if (memory.type === 'image' && memory.asset) {
      const map = new T.TextureLoader().load(new URL(`media/${memory.asset}`, document.baseURI).href);
      map.colorSpace = T.SRGBColorSpace;
      mesh(art, new T.PlaneGeometry(0.965, 0.565), new T.MeshBasicMaterial({ map }), 0, 0, 0.069, false);
    } else {
      for (let i = 0; i < 8; i++) box(art, 0, (i - 3.5) * 0.07, 0.068, 0.88, 0.012, 0.006, i % 3 ? ghost : accent, 0, false);
    }
    core = ball(art, 0.47, -0.27, 0.08, 0.022, accent, 0, false);
  } else if (memory.type === 'scene') {
    cylinder(sculpture, 0, -0.37, 0, 0.56, 0.48, 0.1, 8, black, false);
    for (let i = -2; i < 3; i++) {
      const pyramid = mesh(sculpture, new T.ConeGeometry(0.15 + 0.04 * Math.abs(i), 0.5 - 0.09 * Math.abs(i), 4), i % 2 ? quiet : bronze,
        i * 0.16, -0.16, Math.cos(i * 1.9) * 0.16, false);
      pyramid.rotation.y = i * 0.64;
    }
    core = ball(sculpture, 0.27, 0.23, 0.2, 0.105, accent, 1, false);
  } else {
    const disc = cylinder(sculpture, 0, 0, 0, 0.44, 0.44, 0.042, 44, black, false);
    disc.rotation.set(Math.PI / 2, 0, -side * Math.PI / 2);
    for (const r of [0.14, 0.23, 0.29, 0.38]) {
      const groove = torus(sculpture, 0, 0, 0, r, 0.007, ghost, 32, false);
      groove.rotation.y = -side * Math.PI / 2;
    }
    core = ball(sculpture, 0, 0, 0, 0.09, accent, 1, false);
  }
  const point = pointIn(group, x, 1.58, z);
  world.target('memory', memory.title, point.x, point.y, point.z, 3.25, 'Open exhibit', memory.id);
  world.exhibitCores.set(memory.id, { core, wing });
  world.animations.push((time, eye) => {
    if (eye.distanceToSquared(point) > 150) return;
    sculpture.position.y = 1.89 + Math.sin(time * 1.8 + d) * 0.065;
    if (memory.type === 'text' || memory.type === 'scene') sculpture.rotation.y = time * 0.38;
    const current = world.archive.entries.get(memory.id) || memory;
    const active = current.integration_status === 'raw' && eye.distanceToSquared(point) < 20;
    core.scale.setScalar(active ? 1 + Math.sin(time * 3.2) * 0.18 * (current.intensity / 10) : 1);
  });
}

export function updateExhibit(world, memory) {
  const object = world.exhibitCores.get(memory.id);
  if (object) object.core.material = light(statusColor(memory, object.wing || PERSONAS[memory.persona]), 1.04);
}
