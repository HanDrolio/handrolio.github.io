import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const GOLD = '#d1a56e';
export const IVORY = '#fff0d2';
export const materials = new Map();
const boxGeometry = new T.BoxGeometry(1, 1, 1);
const sharedGeometry = new WeakSet([boxGeometry]);
const geomCache = new Map();
let softwareMode = false;
export function setSoftwareMode(value) { softwareMode = value; }

export function standard(color, roughness = 0.83, metalness = 0.1) {
  const key = `standard/${color}/${roughness}/${metalness}`;
  if (!materials.has(key)) materials.set(key, new T.MeshStandardMaterial({ color, roughness, metalness }));
  return materials.get(key);
}

export function light(color, intensity = 1) {
  const key = `light/${color}/${intensity}`;
  if (!materials.has(key)) {
    materials.set(key, new T.MeshBasicMaterial({ color: new T.Color(color).multiplyScalar(intensity), side: T.DoubleSide }));
  }
  return materials.get(key);
}

export function mesh(group, geometry, material, x = 0, y = 0, z = 0, fixed = true) {
  const object = new T.Mesh(geometry, material);
  object.position.set(x, y, z);
  object.userData.fixed = fixed;
  group.add(object);
  return object;
}

export function box(group, x, y, z, sx, sy, sz, material, rotation = 0, fixed = true) {
  const object = mesh(group, boxGeometry, material, x, y, z, fixed);
  object.scale.set(sx, sy, sz);
  object.rotation.y = rotation;
  return object;
}

function geometry(key, create) {
  if (!geomCache.has(key)) {
    const value = create();
    geomCache.set(key, value);
    sharedGeometry.add(value);
  }
  return geomCache.get(key);
}

export function cylinder(group, x, y, z, top, bottom, height, sides, material, fixed = true) {
  const shape = geometry(`cylinder/${top}/${bottom}/${height}/${sides}`, () => new T.CylinderGeometry(top, bottom, height, sides));
  return mesh(group, shape, material, x, y, z, fixed);
}

export function ring(group, x, y, z, radius, width, material, segments = 96) {
  const shape = geometry(`ring/${radius}/${width}/${segments}`, () => new T.RingGeometry(Math.max(0, radius - width), radius, segments));
  const object = mesh(group, shape, material, x, y, z);
  object.rotation.x = -Math.PI / 2;
  return object;
}

export function ball(group, x, y, z, radius, material, detail = 0, fixed = true) {
  const shape = geometry(`ball/${radius}/${detail}`, () => new T.IcosahedronGeometry(radius, detail));
  return mesh(group, shape, material, x, y, z, fixed);
}

export function torus(group, x, y, z, radius, width, material, sides = 48, fixed = true) {
  const shape = geometry(`torus/${radius}/${width}/${sides}`, () => new T.TorusGeometry(radius, width, 5, sides));
  return mesh(group, shape, material, x, y, z, fixed);
}

export function sign(group, { x, y, z, width, height, angle = 0, title, kicker, subtitle, color = IVORY, transparent = false, align = 'center' }) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.min(1200, Math.round(168 * width));
  canvas.height = Math.min(600, Math.round(168 * height));
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  const anchor = align === 'left' ? w * 0.075 : w / 2;
  if (!transparent) {
    ctx.fillStyle = '#111922';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = color + '66';
    ctx.lineWidth = Math.max(1, h * 0.012);
    ctx.strokeRect(w * 0.025, h * 0.075, w * 0.95, h * 0.85);
  }
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  if (kicker) {
    ctx.fillStyle = color;
    ctx.font = `600 ${h * 0.13}px monospace`;
    ctx.fillText(kicker, anchor, h * 0.265, w * 0.85);
  }
  if (title) {
    ctx.fillStyle = '#fff1d8';
    ctx.font = `${h * (subtitle ? 0.29 : 0.38)}px Georgia, serif`;
    ctx.fillText(title, anchor, h * (kicker ? 0.55 : 0.48), w * 0.86);
  }
  if (subtitle) {
    ctx.fillStyle = color;
    ctx.font = `${h * 0.12}px monospace`;
    ctx.fillText(subtitle, anchor, h * (kicker ? 0.77 : 0.73), w * 0.86);
  }
  const texture = new T.CanvasTexture(canvas);
  texture.colorSpace = T.SRGBColorSpace;
  const material = new T.MeshBasicMaterial({ map: texture, transparent, alphaTest: transparent ? 0.12 : 0, side: T.FrontSide });
  const object = mesh(group, new T.PlaneGeometry(width, height), material, x, y, z, false);
  object.rotation.y = angle;
  return object;
}

export function bake(group) {
  if (softwareMode) return;
  const batches = new Map();
  for (const object of group.children) {
    if (!object.userData.fixed || !object.isMesh) continue;
    if (!batches.has(object.material)) batches.set(object.material, []);
    batches.get(object.material).push(object);
  }
  for (const [material, objects] of batches) {
    if (objects.length < 2) continue;
    const pieces = objects.map(object => {
      object.updateMatrix();
      const clone = object.geometry.index ? object.geometry.toNonIndexed() : object.geometry.clone();
      return clone.applyMatrix4(object.matrix);
    });
    const batch = mergeGeometries(pieces);
    pieces.forEach(piece => piece.dispose());
    if (!batch) continue;
    for (const object of objects) {
      group.remove(object);
      if (!sharedGeometry.has(object.geometry)) object.geometry.dispose();
    }
    mesh(group, batch, material, 0, 0, 0, false);
  }
}

export function dispose(group) {
  group.traverse(object => {
    if (object.geometry && !sharedGeometry.has(object.geometry)) object.geometry.dispose();
    const material = object.material;
    if (material && ![...materials.values()].includes(material)) {
      material.map?.dispose();
      material.dispose();
    }
  });
}

export function pointIn(group, x, y, z) {
  group.updateWorldMatrix(true, false);
  return group.localToWorld(new T.Vector3(x, y, z));
}
