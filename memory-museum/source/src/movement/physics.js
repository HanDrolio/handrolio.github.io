export const PLAYER_RADIUS = 0.31;

export class Collision {
  walls = [];
  floors = [];
  ladders = [];
  runways = [];

  rectangle(group, x, z, width, depth, extra = {}, rotation = 0) {
    const a = group.rotation.y;
    const centerX = group.position.x + x * Math.cos(a) + z * Math.sin(a);
    const centerZ = group.position.z - x * Math.sin(a) + z * Math.cos(a);
    return { x: centerX, z: centerZ, hx: width / 2, hz: depth / 2,
      c: Math.cos(a + rotation), s: Math.sin(a + rotation), ...extra };
  }

  wall(group, x, z, width, depth, bottom, top, rotation = 0) {
    this.walls.push(this.rectangle(group, x, z, width, depth, { bottom, top }, rotation));
  }

  floor(group, x, z, width, depth, y, requires) {
    this.floors.push(this.rectangle(group, x, z, width, depth, { y, requires }));
  }

  disc(x, z, radius, y, inner = 0) { this.floors.push({ x, z, radius, y, inner }); }

  ground(x, z, ceiling, persona) {
    let best = -12;
    for (const floor of this.floors) {
      if (floor.y > ceiling || floor.y < best || (floor.requires && floor.requires !== persona)) continue;
      const dx = x - floor.x, dz = z - floor.z;
      if (floor.radius) {
        const radius = dx * dx + dz * dz;
        if (radius <= floor.radius ** 2 && radius >= floor.inner ** 2) best = floor.y;
      } else {
        const lx = floor.c * dx - floor.s * dz;
        const lz = floor.s * dx + floor.c * dz;
        if (Math.abs(lx) <= floor.hx + 0.08 && Math.abs(lz) <= floor.hz + 0.08) best = floor.y;
      }
    }
    return best;
  }

  move(position, x, z, height) {
    position.x += x;
    position.z += z;
    for (let pass = 0; pass < 2; pass++) {
      for (const wall of this.walls) {
        if (position.y + height <= wall.bottom + 0.04 || position.y >= wall.top - 0.03) continue;
        const dx = position.x - wall.x, dz = position.z - wall.z;
        if (Math.abs(dx) > wall.hx + wall.hz + PLAYER_RADIUS || Math.abs(dz) > wall.hx + wall.hz + PLAYER_RADIUS) continue;
        const lx = wall.c * dx - wall.s * dz, lz = wall.s * dx + wall.c * dz;
        let px = lx - Math.max(-wall.hx, Math.min(wall.hx, lx));
        let pz = lz - Math.max(-wall.hz, Math.min(wall.hz, lz));
        const squared = px * px + pz * pz;
        if (squared >= PLAYER_RADIUS * PLAYER_RADIUS) continue;
        if (squared > 0.000001) {
          const correction = PLAYER_RADIUS / Math.sqrt(squared) - 1;
          px *= correction;
          pz *= correction;
        } else if (wall.hx - Math.abs(lx) < wall.hz - Math.abs(lz)) {
          px = (Math.sign(lx) || 1) * (wall.hx + PLAYER_RADIUS) - lx;
          pz = 0;
        } else {
          px = 0;
          pz = (Math.sign(lz) || 1) * (wall.hz + PLAYER_RADIUS) - lz;
        }
        position.x += wall.c * px + wall.s * pz;
        position.z += -wall.s * px + wall.c * pz;
      }
    }
  }
}
