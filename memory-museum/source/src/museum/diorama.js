import * as T from 'three';
import { hash, random } from '../core/seed.js';
import { bake, ball, box, cylinder, dispose, light, mesh, ring, standard } from './kit.js';

export class Diorama {
  constructor(scene, memory) {
    this.scene = scene;
    this.root = new T.Group();
    this.root.position.x = 260;
    this.root.position.z = 0;
    scene.add(this.root);
    this.azimuth = 0.46;
    this.elevation = 0.28;
    this.motion = 0;
    const rng = random(hash(memory.id));
    const cosmic = memory.persona === 'flux';
    const earth = standard(cosmic ? '#393150' : '#3d5b55');
    const detail = standard(cosmic ? '#755c83' : '#668779');
    const shadow = standard('#253148');
    const base = standard('#252938');
    const warm = light('#ffc98f', 1.12);
    cylinder(this.root, 0, -0.4, 0, 7.1, 7.6, 0.8, 12, base);
    cylinder(this.root, 0, -0.06, 0, 6.85, 7.05, 0.16, 12, earth);
    ring(this.root, 0, 0.029, 0, 7.02, 0.037, warm, 12);
    cylinder(this.root, 0, 0.029, 0.95, 2.8, 2.8, 0.036, 48, standard(cosmic ? '#5e6c9d' : '#4b959a', 0.2, 0.51));
    for (let i = 0; i < 6; i++) ring(this.root, 0, 0.052, 0.95, 0.54 + i * 0.39, 0.014, light('#b9e2df', 0.64), 48);
    for (let i = 0; i < 10; i++) {
      const angle = rng() * Math.PI * 2, distance = 3.2 + rng() * 2.82;
      const x = Math.sin(angle) * distance, z = Math.cos(angle) * distance;
      const height = 0.76 + rng() * 2.1;
      const object = mesh(this.root, new T.ConeGeometry(0.6 + rng() * 0.63, height, cosmic ? 4 : 5),
        i % 3 ? detail : shadow, x, height * 0.49, z);
      object.rotation.y = angle * 2;
    }
    const house = standard(cosmic ? '#a5849a' : '#a17e66');
    box(this.root, 1.4, 0.53, -1.8, 1.53, 1.06, 1.28, house);
    const roof = mesh(this.root, new T.ConeGeometry(1.15, 0.73, 4), shadow, 1.4, 1.39, -1.8);
    roof.rotation.y = Math.PI / 4;
    box(this.root, 1.7, 0.59, -1.149, 0.24, 0.35, 0.03, warm);
    box(this.root, 1.08, 0.59, -1.149, 0.24, 0.35, 0.03, warm);
    this.orb = ball(this.root, -1.13, 3.44, -1.64, 0.68, warm, 1, false);
    const pin = new T.PointLight('#ffc98f', 32, 11, 1.85);
    pin.position.copy(this.orb.position);
    this.root.add(pin);
    for (let i = 0; i < 25; i++) {
      const a = i / 25 * Math.PI * 2;
      ball(this.root, Math.sin(a) * 5.8, 0.07 + rng() * 0.31, Math.cos(a) * 5.8, 0.032 + rng() * 0.024, warm);
    }
    bake(this.root);
  }

  view(camera, input, dt, reduced) {
    this.azimuth += (reduced ? 0 : 0.12) * dt - input.frameLook[0] * 0.004 - input.right[0] * dt * 1.65;
    this.elevation = T.MathUtils.clamp(this.elevation + input.frameLook[1] * 0.004 + input.right[1] * dt * 1.4, 0.1, 1.12);
    this.motion += dt;
    if (!reduced) this.orb.position.y = 3.44 + Math.sin(this.motion * 0.52) * 0.16;
    const radius = camera.aspect < 0.9 ? 12.3 : 9.85;
    camera.position.set(260 + Math.sin(this.azimuth) * Math.cos(this.elevation) * radius,
      1.46 + Math.sin(this.elevation) * radius, Math.cos(this.azimuth) * Math.cos(this.elevation) * radius);
    camera.lookAt(260, 1.1, 0);
  }

  close() { this.scene.remove(this.root); dispose(this.root); }
}
