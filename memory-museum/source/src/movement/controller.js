import * as T from 'three';

const GRAVITY = 19.6;
const JUMP = Math.sqrt(2 * GRAVITY * 1.2);
const EYE = 1.69;
export const SPAWN = new T.Vector3(0, 0, 9.55);

export class Controller {
  constructor(camera) {
    this.camera = camera;
    this.position = SPAWN.clone();
    this.velocity = new T.Vector3();
    this.forward = new T.Vector3();
    this.yaw = 0;
    this.pitch = 0;
    this.eye = EYE;
    this.onGround = true;
    this.bob = 0;
    this.stepDistance = 0;
    this.slide = 0;
    this.jumpQueue = 0;
    this.coyote = 0;
    this.crouch = false;
    this.wallRun = 0;
    this.wallUsed = false;
    this.place(SPAWN, 0);
  }

  place(position, yaw = this.yaw, pitch = 0) {
    this.position.copy(position);
    this.velocity.set(0, 0, 0);
    this.yaw = yaw;
    this.pitch = pitch;
    this.eye = EYE;
    this.onGround = true;
    this.coyote = 0;
    this.jumpQueue = 0;
    this.slide = 0;
    this.wallRun = 0;
    this.wallUsed = false;
    this.crouch = false;
    this.camera.position.copy(position).y += this.eye;
    this.camera.rotation.set(this.pitch, this.yaw, 0);
  }

  update(dt, input, collision, persona, settings, onStep) {
    const keyboardSensitivity = 0.00245 * settings.lookSpeed;
    const gamepadSensitivity = 2.24 * settings.lookSpeed;
    this.yaw -= input.frameLook[0] * keyboardSensitivity + input.right[0] * gamepadSensitivity * dt;
    this.pitch -= input.frameLook[1] * keyboardSensitivity + input.right[1] * gamepadSensitivity * 0.83 * dt;
    this.pitch = T.MathUtils.clamp(this.pitch, -1.45, 1.45);

    const [mx, my] = input.move;
    const speedInput = Math.hypot(mx, my);
    const ca = Math.cos(this.yaw), sa = Math.sin(this.yaw);
    const desiredX = mx * ca - my * sa, desiredZ = -mx * sa - my * ca;
    const sprint = input.down('sprint') && speedInput > 0.12;
    if (input.pressed('crouch')) this.crouch = !this.crouch;
    if (input.pressed('slide') && sprint && this.onGround && this.slide <= 0) {
      this.slide = 0.49;
      this.velocity.x = desiredX / speedInput * 8.35;
      this.velocity.z = desiredZ / speedInput * 8.35;
    }
    this.slide = Math.max(0, this.slide - dt);
    const low = this.crouch || input.down('slide') || this.slide > 0;
    const height = low ? 1.12 : 1.82;
    const multiplier = persona.id === 'orion' ? 1.025 : persona.id === 'ripple' ? 0.93 : persona.id === 'astro' ? 0.95 : 1;
    const speed = (low ? 2.72 : sprint ? 8 : 5) * multiplier;
    if (this.slide > 0) {
      const drag = Math.exp(-1.45 * dt);
      this.velocity.x *= drag;
      this.velocity.z *= drag;
    } else {
      const accel = this.onGround ? (persona.id === 'orion' ? 22 : 18) : 5.4;
      const smooth = 1 - Math.exp(-accel * dt);
      this.velocity.x += (desiredX * speed - this.velocity.x) * smooth;
      this.velocity.z += (desiredZ * speed - this.velocity.z) * smooth;
    }

    this.jumpQueue = input.pressed('jump') ? 0.13 : Math.max(0, this.jumpQueue - dt);
    this.coyote = this.onGround ? 0.1 : Math.max(0, this.coyote - dt);
    const ladder = my > 0.4 && this.slide <= 0 && !this.jumpQueue && collision.ladders.find(item =>
      Math.abs(this.position.x - item.x) < 0.48 && Math.abs(this.position.z - item.z) < 0.43 && this.position.y < item.top + 0.02);
    if (ladder) {
      this.position.x = ladder.x;
      this.position.z = ladder.z;
      this.position.y = Math.min(ladder.top, this.position.y + 3.05 * dt);
      this.velocity.set(0, 0, 0);
      this.onGround = false;
      if (this.position.y >= ladder.top) {
        this.position.z = ladder.exitZ;
        this.onGround = true;
      }
    } else {
      if (this.coyote > 0 && this.jumpQueue > 0) {
        this.velocity.y = JUMP;
        this.jumpQueue = 0;
        this.coyote = 0;
        this.onGround = false;
        this.slide = 0;
      }
      if (!this.onGround && !this.wallUsed && sprint && this.position.y > 0.36 && this.position.y < 2.6) {
        for (const runway of collision.runways) {
          const dx = this.position.x - runway.x, dz = this.position.z - runway.z;
          if (Math.abs(dx * runway.c - dz * runway.s) < runway.hx && Math.abs(dx * runway.s + dz * runway.c) < runway.hz) {
            this.wallRun = 0.43;
            this.wallUsed = true;
            this.velocity.y = Math.max(0.64, this.velocity.y);
            break;
          }
        }
      }
      this.wallRun = Math.max(0, this.wallRun - dt);
      collision.move(this.position, this.velocity.x * dt, this.velocity.z * dt, height);
      const oldY = this.position.y;
      this.velocity.y -= (this.wallRun > 0 ? 3.6 : GRAVITY) * dt;
      this.position.y += this.velocity.y * dt;
      const maxStep = this.onGround ? 0.27 : 0.035;
      const floor = collision.ground(this.position.x, this.position.z, oldY + maxStep, persona.id);
      if (this.velocity.y <= 0 && this.position.y <= floor) {
        this.onGround = true;
        this.wallUsed = false;
        this.velocity.y = 0;
        this.position.y = floor;
      } else {
        this.onGround = false;
      }
    }
    if (this.position.y < -4.5) this.place(SPAWN, 0);
    const horizontal = Math.hypot(this.velocity.x, this.velocity.z);
    if (this.onGround && horizontal > 0.46) {
      this.stepDistance += horizontal * dt;
      this.bob += horizontal * dt * 5.2;
      if (this.stepDistance > (sprint ? 1.52 : 1.29)) {
        this.stepDistance = 0;
        onStep(horizontal);
      }
    }
    const lerp = 1 - Math.exp(-12 * dt);
    this.eye += ((low ? 1.04 : EYE) - this.eye) * lerp;
    const bob = !settings.reduced && this.onGround && !this.slide ? Math.sin(this.bob) * Math.min(0.044, horizontal * 0.008) : 0;
    this.camera.position.set(this.position.x, this.position.y + this.eye + bob, this.position.z);
    this.camera.rotation.set(this.pitch, this.yaw, settings.reduced ? 0 : this.wallRun * 0.13);
    const fov = sprint && !low && !settings.reduced ? 85 : 75;
    if (Math.abs(this.camera.fov - fov) > 0.02) {
      this.camera.fov += (fov - this.camera.fov) * lerp * 0.71;
      this.camera.updateProjectionMatrix();
    }
  }
}
