import * as T from 'three';
import { random } from './seed.js';
import { SoftwareRenderer } from './software.js';
import { setSoftwareMode } from '../museum/kit.js';

function atmosphere(scene) {
  const sky = new T.Mesh(new T.SphereGeometry(115, 28, 16), new T.ShaderMaterial({
    side: T.BackSide, depthWrite: false,
    uniforms: { low: { value: new T.Color('#475773') }, high: { value: new T.Color('#0a132a') } },
    vertexShader: `varying vec3 direction;
      void main() { direction = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `varying vec3 direction; uniform vec3 low; uniform vec3 high;
      void main() {
        vec3 d = normalize(direction);
        float zenith = smoothstep(-0.18, 0.74, d.y);
        float horizon = pow(max(0.0, dot(d, normalize(vec3(-0.45, 0.13, -0.7)))), 7.0);
        gl_FragColor = vec4(mix(low, high, zenith) + vec3(0.20, 0.095, 0.048) * horizon * (1.0 - zenith), 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  }));
  sky.frustumCulled = false;
  sky.renderOrder = -10;
  scene.add(sky);

  const rng = random(444);
  const stars = new Float32Array(620 * 3);
  for (let i = 0; i < 620; i++) {
    const a = rng() * Math.PI * 2, y = 0.035 + rng() * 0.95, r = Math.sqrt(1 - y * y);
    stars.set([Math.cos(a) * r * 101, y * 101, Math.sin(a) * r * 101], i * 3);
  }
  const shape = new T.BufferGeometry().setAttribute('position', new T.BufferAttribute(stars, 3));
  const constellation = new T.Points(shape, new T.PointsMaterial({
    color: '#e0e8ff', transparent: true, opacity: 0.68, size: 1.4, sizeAttenuation: false, fog: false,
  }));
  sky.add(constellation);
  const moon = new T.Mesh(new T.SphereGeometry(1.75, 24, 16), new T.MeshBasicMaterial({ color: '#f5e2b9', fog: false }));
  moon.position.set(-43, 53, -60);
  sky.add(moon);
  return sky;
}

function particles(scene) {
  const rng = random(904);
  const points = new Float32Array(280 * 3);
  for (let i = 0; i < 280; i++) {
    const angle = rng() * Math.PI * 2, radius = Math.sqrt(rng()) * 24;
    points.set([Math.cos(angle) * radius, 0.5 + rng() * 9.8, Math.sin(angle) * radius], i * 3);
  }
  const geometry = new T.BufferGeometry().setAttribute('position', new T.BufferAttribute(points, 3));
  const field = new T.Points(geometry, new T.PointsMaterial({
    color: '#ffcf96', transparent: true, opacity: 0.43, size: 0.055, depthWrite: false, blending: T.AdditiveBlending,
  }));
  scene.add(field);
  return field;
}

function lightShaft(scene) {
  const material = new T.ShaderMaterial({
    transparent: true, side: T.DoubleSide, depthWrite: false, blending: T.AdditiveBlending,
    uniforms: { alpha: { value: 0.145 } },
    vertexShader: `varying vec2 vUV; void main() {
      vUV = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`,
    fragmentShader: `varying vec2 vUV; uniform float alpha;
      void main() {
        float fade = sin(vUV.y * 3.14159) * pow(sin(vUV.x * 3.14159), 2.0);
        gl_FragColor = vec4(0.30, 0.50, 0.70, alpha * fade);
      }`,
  });
  const group = new T.Group();
  for (const angle of [0, Math.PI / 3, Math.PI * 2 / 3]) {
    const plane = new T.Mesh(new T.PlaneGeometry(3.3, 10.4), material);
    plane.rotation.y = angle;
    plane.rotation.z = 0.1;
    group.add(plane);
  }
  group.position.set(0.27, 5.54, 0);
  scene.add(group);
  return group;
}

export class Engine {
  constructor(canvas, settings) {
    this.canvas = canvas;
    this.settings = settings;
    this.scene = new T.Scene();
    this.scene.fog = new T.FogExp2('#25364c', 0.015);
    this.camera = new T.PerspectiveCamera(75, 1, 0.075, 125);
    this.camera.rotation.order = 'YXZ';
    this.scene.add(this.camera);
    const context = canvas.getContext('webgl2', {
      antialias: !matchMedia('(pointer: coarse)').matches, alpha: false, powerPreference: 'high-performance',
    });
    if (context) {
      this.renderer = new T.WebGLRenderer({ canvas, context });
      this.renderer.outputColorSpace = T.SRGBColorSpace;
      this.renderer.toneMapping = T.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.28;
    } else {
      this.renderer = new SoftwareRenderer(canvas);
      this.software = true;
      setSoftwareMode(true);
    }
    this.hemi = new T.HemisphereLight('#bfcfec', '#786251', 1.83);
    const moon = new T.DirectionalLight('#c4dafb', 1.48);
    moon.position.set(-7, 16, 6);
    const fill = new T.DirectionalLight('#ffc592', 0.47);
    fill.position.set(9, 5, -13);
    this.scene.add(this.hemi, moon, fill);
    this.flashlight = new T.SpotLight('#fff4d7', 0, 29, 0.36, 0.63, 1.45);
    this.flashlight.position.set(0.15, -0.13, 0.09);
    this.flashlight.target.position.set(0, -0.09, -5);
    this.camera.add(this.flashlight, this.flashlight.target);
    this.sky = atmosphere(this.scene);
    this.dust = particles(this.scene);
    this.shaft = lightShaft(this.scene);
    this.baseColor = new T.Color('#bfcfec');
    this.personaColor = new T.Color('#bfcfec');
    this.targetColor = new T.Color('#bfcfec');
    this.resize = this.resize.bind(this);
    addEventListener('resize', this.resize);
    window.visualViewport?.addEventListener('resize', this.resize);
    this.resize();
    this.preview(0);
  }

  resize() {
    const width = this.canvas.clientWidth || innerWidth;
    const height = this.canvas.clientHeight || innerHeight;
    const coarse = matchMedia('(pointer: coarse)').matches || width < 720;
    const ratio = this.settings.reduced ? 1 : coarse ? 1.2 : 1.6;
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, ratio));
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  preview(time) {
    this.camera.position.set(1.65 + Math.sin(time * 0.13) * 0.32, 2.63 + Math.sin(time * 0.27) * 0.035, 11.55);
    const portrait = this.camera.aspect < 0.9;
    this.camera.lookAt(portrait ? 0.55 : -4.9, portrait ? 1.42 : 3.0, -3.5);
    this.camera.fov = portrait ? 73 : 67;
    this.camera.updateProjectionMatrix();
  }

  render(time, dt, museum, persona, zone, torch, dayLight) {
    this.sky.position.copy(this.camera.position);
    this.sky.visible = !this.software;
    if (this.software) {
      museum.gardenGroup.visible = this.camera.position.y > 10.95;
      this.renderer.torch = torch;
    }
    this.dust.visible = !this.software && !this.settings.reduced && zone === 'rotunda';
    this.dust.rotation.y = time * 0.01;
    this.shaft.visible = !this.software && !this.settings.reduced && zone === 'rotunda';
    this.baseColor.set(zone === 'basement' ? '#5d4251' : zone === 'garden' ? '#d0e0f0' : '#bac9e3');
    this.targetColor.copy(this.baseColor).lerp(this.personaColor.set(persona.color), zone === 'basement' ? 0.05 : 0.14);
    this.hemi.color.lerp(this.targetColor, 1 - Math.exp(-2.8 * dt));
    const intensity = (zone === 'basement' ? 0.46 : zone === 'garden' ? 1.98 : 1.48) * (0.91 + dayLight * 0.16);
    this.hemi.intensity += (intensity - this.hemi.intensity) * (1 - Math.exp(-2.8 * dt));
    this.flashlight.intensity = torch ? 54 : 0;
    if (!this.settings.reduced) for (const animate of museum.animations) animate(time, this.camera.position);
    this.renderer.render(this.scene, this.camera);
  }
}
