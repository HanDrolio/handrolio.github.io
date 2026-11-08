import * as T from 'three';
import { Collision } from '../movement/physics.js';
import { dispose } from './kit.js';
import { makeRotunda } from './rotunda.js';
import { makeWings } from './wings.js';
import { GARDEN_LEVEL, makeGarden } from './garden.js';
import { makeBasement } from './basement.js';

export class Museum {
  constructor(scene, archive) {
    this.scene = scene;
    this.archive = archive;
    this.aim = new T.Vector3();
    this.delta = new T.Vector3();
  }

  build(day) {
    if (this.root) {
      this.scene.remove(this.root);
      dispose(this.root);
    }
    this.root = new T.Group();
    this.collision = new Collision();
    this.targets = [];
    this.animations = [];
    this.mirrors = [];
    this.exhibitCores = new Map();
    this.wingZones = [];
    this.wingEntries = {};
    this.basementReturn = null;
    this.scene.add(this.root);
    makeRotunda(this, day);
    makeWings(this, day);
    makeGarden(this, day);
    if (day.basement) makeBasement(this);
  }

  target(kind, title, x, y, z, reach, action, value) {
    this.targets.push({ kind, title, point: new T.Vector3(x, y, z), reach, action, value });
  }

  nearby(camera) {
    camera.getWorldDirection(this.aim);
    let best = null, bestScore = -1;
    for (const target of this.targets) {
      this.delta.copy(target.point).sub(camera.position);
      const distance = this.delta.length();
      if (distance > target.reach) continue;
      const dot = this.delta.dot(this.aim) / Math.max(0.01, distance);
      const threshold = distance < 1.06 ? 0.12 : 0.53;
      if (dot <= threshold) continue;
      const score = dot - distance * 0.08;
      if (score > bestScore) {
        best = target;
        bestScore = score;
      }
    }
    return best;
  }

  zone(position) {
    if (position.x > 130) return 'basement';
    if (position.y >= GARDEN_LEVEL - 0.05) return 'garden';
    for (const wing of this.wingZones) {
      const dx = position.x - wing.x, dz = position.z - wing.z;
      const outward = dx * Math.sin(wing.angle) - dz * Math.cos(wing.angle);
      const across = dx * Math.cos(wing.angle) + dz * Math.sin(wing.angle);
      if (outward > 3.5 && outward < wing.length + 1 && Math.abs(across) < 17) return wing.id;
    }
    return 'rotunda';
  }
}
