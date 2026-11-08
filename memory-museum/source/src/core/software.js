import { Color, Vector3 } from 'three';
import { Projector, RenderableFace, RenderableLine } from 'three/addons/renderers/Projector.js';

const FILL = new Vector3(-0.38, 0.82, 0.45).normalize();
const FLOOR_FOG = new Color('#23344a');

function textured(ctx, uv, points, image) {
  const width = image.naturalWidth || image.width, height = image.naturalHeight || image.height;
  if (!width || !height) return false;
  const u0 = uv[0].x * width, v0 = (1 - uv[0].y) * height;
  const u1 = uv[1].x * width - u0, v1 = (1 - uv[1].y) * height - v0;
  const u2 = uv[2].x * width - u0, v2 = (1 - uv[2].y) * height - v0;
  const [x0, y0, x1, y1, x2, y2] = points;
  const det = u1 * v2 - u2 * v1;
  if (!Number.isFinite(det) || Math.abs(det) < 0.001) return false;
  const a = ((x1 - x0) * v2 - (x2 - x0) * v1) / det;
  const b = ((y1 - y0) * v2 - (y2 - y0) * v1) / det;
  const c = (u1 * (x2 - x0) - u2 * (x1 - x0)) / det;
  const d = (u1 * (y2 - y0) - u2 * (y1 - y0)) / det;
  ctx.save();
  ctx.clip();
  ctx.setTransform(a, b, c, d, x0 - a * u0 - c * v0, y0 - b * u0 - d * v0);
  ctx.drawImage(image, 0, 0);
  ctx.restore();
  return true;
}

export class SoftwareRenderer {
  constructor(canvas) {
    const layer = document.createElement('canvas');
    layer.className = 'software-world';
    layer.setAttribute('aria-hidden', 'true');
    canvas.before(layer);
    this.canvas = layer;
    this.context = layer.getContext('2d', { alpha: false });
    if (!this.context) throw new Error('No 3D rendering context is available.');
    this.projector = new Projector();
    this.color = new Color();
    this.position = new Vector3();
    this.forward = new Vector3();
    this.last = -Infinity;
  }

  setPixelRatio() {}

  setSize(width, height) {
    const scale = Math.min(1, 1000 / width, 720 / height);
    this.canvas.width = Math.round(width * scale);
    this.canvas.height = Math.round(height * scale);
    const ctx = this.context;
    this.sky = ctx.createLinearGradient(0, 0, 0, this.canvas.height);
    this.sky.addColorStop(0, '#111d36');
    this.sky.addColorStop(0.54, '#3e4e66');
    this.sky.addColorStop(1, '#172432');
    this.last = -Infinity;
  }

  render(scene, camera) {
    const start = performance.now();
    if (start - this.last < (this.interval || 37)) return;
    this.last = start;
    const { context: ctx, canvas, color, position } = this;
    const width = canvas.width / 2, height = canvas.height / 2;
    ctx.fillStyle = this.sky;
    ctx.fillRect(0, 0, width * 2, height * 2);
    const { elements } = this.projector.projectScene(scene, camera, false, false);
    if (this.torch) camera.getWorldDirection(this.forward);
    elements.sort((a, b) => a.renderOrder - b.renderOrder || b.z - a.z);
    for (const item of elements) {
      const material = item.material;
      if (!material?.color || material.opacity <= 0) continue;
      if (item instanceof RenderableFace) {
        const a = item.v1.positionScreen, b = item.v2.positionScreen, c = item.v3.positionScreen;
        const x0 = (1 + a.x) * width, y0 = (1 - a.y) * height;
        const x1 = (1 + b.x) * width, y1 = (1 - b.y) * height;
        const x2 = (1 + c.x) * width, y2 = (1 - c.y) * height;
        if (Math.abs((x1 - x0) * (y2 - y0) - (x2 - x0) * (y1 - y0)) < 0.38) continue;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.closePath();
        ctx.globalAlpha = material.opacity;
        const image = material.map?.image;
        if (image && image.complete !== false && textured(ctx, item.uvs, [x0, y0, x1, y1, x2, y2], image)) continue;
        position.copy(item.v1.positionWorld).add(item.v2.positionWorld).add(item.v3.positionWorld).multiplyScalar(1 / 3);
        const distance = position.distanceTo(camera.position);
        const centerGlow = position.x * position.x + position.z * position.z < 56 ? 0.27 : 0;
        const beam = this.torch ? Math.max(0, position.sub(camera.position).dot(this.forward) / Math.max(1, distance) - 0.89) * Math.max(0, 1 - distance / 29) * 14 : 0;
        const shade = material.isMeshBasicMaterial ? 1.13 : 0.57 + Math.max(0, item.normalModel.dot(FILL)) * 0.71
          + centerGlow + beam;
        const fog = Math.min(0.81, distance * distance * 0.000118);
        ctx.fillStyle = color.copy(material.color).multiplyScalar(shade).lerp(FLOOR_FOG, fog).getStyle();
        ctx.fill();
        if (material.opacity >= 1) {
          ctx.strokeStyle = ctx.fillStyle;
          ctx.lineWidth = 0.43;
          ctx.stroke();
        }
      } else if (item instanceof RenderableLine) {
        const a = item.v1.positionScreen, b = item.v2.positionScreen;
        ctx.globalAlpha = material.opacity;
        ctx.strokeStyle = material.color.getStyle();
        ctx.lineWidth = 0.72;
        ctx.beginPath();
        ctx.moveTo((1 + a.x) * width, (1 - a.y) * height);
        ctx.lineTo((1 + b.x) * width, (1 - b.y) * height);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
    this.interval = Math.max(37, Math.min(85, (performance.now() - start) * 1.35));
  }
}
